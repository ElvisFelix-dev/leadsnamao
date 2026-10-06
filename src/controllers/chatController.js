import asyncHandler from '../middleware/asyncHandler.js'
import * as chatService from '../service/chatService.js'
import Conversation from '../models/Conversation.js'
import AppError from '../utils/AppError.js'

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

/**
 * Verifica se o usuário possui privilégios administrativos.
 *
 * Mantemos compatibilidade com os dois formatos utilizados
 * no projeto:
 *
 * - isAdmin === true
 * - role === 'admin'
 */
const isAdminUser = (user) => {
  return user?.isAdmin === true || user?.role === 'admin'
}

/**
 * Retorna o ID do usuário como string.
 */
const getUserId = (user) => {
  if (!user?._id) {
    throw new AppError('Usuário não autenticado.', 401)
  }

  return user._id.toString()
}

/**
 * Valida ObjectId do MongoDB.
 *
 * Evita que IDs inválidos cheguem ao service e gerem
 * CastError desnecessário.
 */
const validateObjectId = (value, fieldName = 'ID') => {
  if (!value) {
    throw new AppError(`${fieldName} é obrigatório.`, 400)
  }

  if (!/^[a-f\d]{24}$/i.test(value.toString())) {
    throw new AppError(`${fieldName} inválido.`, 400)
  }

  return value
}

/**
 * ============================================================
 * CONVERSATIONS
 * ============================================================
 */

/**
 * GET /api/chat/conversations
 *
 * Lista as conversas que o usuário pode acessar.
 *
 * ADMIN:
 *   - todas as conversas internas
 *   - todas as conversas WhatsApp
 *
 * BROKER:
 *   - conversas internas onde participa
 *   - conversas WhatsApp atribuídas a ele
 */
export const getConversations = asyncHandler(async (req, res) => {
  getUserId(req.user)

  const conversations = await chatService.getUserConversations(req.user)

  res.json({
    success: true,
    data: conversations,
  })
})

/**
 * POST /api/chat/conversations
 *
 * Cria uma nova conversa interna.
 *
 * O usuário autenticado é automaticamente adicionado
 * aos participantes.
 *
 * Esta rota continua sendo exclusiva para o chat interno.
 */
export const createConversation = asyncHandler(async (req, res) => {
  const { participants = [], type = 'direct', name = '' } = req.body

  const userId = getUserId(req.user)

  if (!Array.isArray(participants)) {
    throw new AppError('Participantes inválidos.', 400)
  }

  /**
   * Validar tipo da conversa.
   */
  const allowedTypes = ['direct', 'group', 'broker_channel']

  if (!allowedTypes.includes(type)) {
    throw new AppError('Tipo de conversa inválido.', 400)
  }

  /**
   * A criação manual de conversa é interna.
   */
  const allParticipants = [...participants, userId]

  /**
   * Remove:
   * - valores vazios
   * - IDs duplicados
   */
  const uniqueParticipantMap = new Map()

  allParticipants.forEach((participant) => {
    if (!participant) {
      return
    }

    const participantId = participant.toString()

    if (!/^[a-f\d]{24}$/i.test(participantId)) {
      throw new AppError(`Participante inválido: ${participantId}`, 400)
    }

    uniqueParticipantMap.set(participantId, participantId)
  })

  const uniqueParticipants = [...uniqueParticipantMap.values()]

  /**
   * Uma conversa direta precisa ter exatamente
   * duas pessoas.
   */
  if (type === 'direct' && uniqueParticipants.length !== 2) {
    throw new AppError(
      'Uma conversa direta precisa ter dois participantes.',
      400,
    )
  }

  const conversation = await chatService.createConversation({
    participants: uniqueParticipants,
    type,
    name,
    createdBy: req.user._id,
  })

  res.status(201).json({
    success: true,
    data: conversation,
  })
})

/**
 * ============================================================
 * MESSAGES
 * ============================================================
 */

/**
 * GET /api/chat/conversations/:id/messages
 *
 * Busca mensagens de uma conversa.
 *
 * A autorização é feita pelo chatService:
 *
 * - admin → acesso global
 * - WhatsApp → assignedTo
 * - interno → participants
 */
export const getMessages = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { limit, before } = req.query

  validateObjectId(id, 'ID da conversa')

  const parsedLimit = limit ? Number.parseInt(limit, 10) : 50

  if (Number.isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    throw new AppError('O limite deve estar entre 1 e 100.', 400)
  }

  const result = await chatService.getConversationMessages({
    conversationId: id,
    user: req.user,
    limit: parsedLimit,
    before,
  })

  res.json({
    success: true,
    data: result,
  })
})

/**
 * POST /api/chat/conversations/:id/messages
 *
 * Envia mensagem pelo CHAT INTERNO.
 *
 * IMPORTANTE:
 * Conversas WhatsApp não podem utilizar este endpoint
 * para envio.
 *
 * O envio WhatsApp terá um endpoint próprio, que chamará
 * whatsappAkgService.sendTextMessage().
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const { id } = req.params

  validateObjectId(id, 'ID da conversa')

  const {
    content,
    type = 'text',
    attachment = null,
    replyTo = null,
    mentions = [],
  } = req.body

  const userId = getUserId(req.user)

  /**
   * Validar conteúdo.
   *
   * Attachment sozinho continua sendo permitido pelo
   * service, mas mantemos a validação de content quando
   * não houver attachment.
   */
  const normalizedContent = typeof content === 'string' ? content.trim() : ''

  if (!normalizedContent && !attachment) {
    throw new AppError('Conteúdo da mensagem é obrigatório.', 400)
  }

  /**
   * Validar mentions.
   */
  if (mentions !== undefined && mentions !== null && !Array.isArray(mentions)) {
    throw new AppError('Mentions deve ser um array.', 400)
  }

  const message = await chatService.sendMessage({
    conversationId: id,
    senderId: req.user._id,
    content: normalizedContent,
    type,
    attachment,
    replyTo,
    mentions: mentions || [],
    isAdmin: isAdminUser(req.user),
  })

  if (!message?._id) {
    throw new AppError('Não foi possível criar a mensagem.', 500)
  }

  /**
   * ========================================================
   * SOCKET.IO
   * ========================================================
   *
   * A persistência já foi concluída.
   *
   * Se o Socket.IO falhar, não desfazemos a mensagem.
   */
  const io = req.app.get('io')

  if (io) {
    try {
      const conversation = await Conversation.findOne({
        _id: id,
        isActive: true,
      })
        .select('channel participants assignedTo')
        .lean()

      if (!conversation) {
        console.warn('Conversa não encontrada para Socket.IO:', id)
      } else {
        /**
         * Evento principal.
         *
         * Todos os clientes conectados à sala da conversa
         * recebem a mensagem.
         */
        io.to(id).emit('new_message', message)

        /**
         * ----------------------------------------------------
         * CHAT INTERNO
         * ----------------------------------------------------
         *
         * Notificamos os participantes.
         */
        if (conversation.channel === 'internal') {
          const participants = Array.isArray(conversation.participants)
            ? conversation.participants.filter(Boolean)
            : []

          for (const participant of participants) {
            const participantId = participant.toString()

            /**
             * Não notificar o próprio remetente.
             */
            if (participantId === userId) {
              continue
            }

            io.to(`user_${participantId}`).emit('new_message_notification', {
              conversationId: id,
              channel: 'internal',
              message: {
                _id: message._id,
                content: message.content,
                sender: message.sender,
                senderType: message.senderType,
                createdAt: message.createdAt,
                type: message.type,
              },
            })
          }
        }

        /**
         * ----------------------------------------------------
         * WHATSAPP
         * ----------------------------------------------------
         *
         * Normalmente o endpoint acima não deveria receber
         * uma conversa WhatsApp, pois o chatService bloqueia.
         *
         * Mantemos este bloco defensivo para evitar que uma
         * futura alteração do service quebre as notificações.
         */
        if (conversation.channel === 'whatsapp') {
          const assignedTo = conversation.assignedTo?.toString()

          if (assignedTo && assignedTo !== userId) {
            io.to(`user_${assignedTo}`).emit('new_message_notification', {
              conversationId: id,
              channel: 'whatsapp',
              message: {
                _id: message._id,
                content: message.content,
                sender: message.sender,
                senderType: message.senderType,
                createdAt: message.createdAt,
                type: message.type,
              },
            })
          }
        }
      }
    } catch (socketError) {
      /**
       * Socket.IO não deve impedir o sucesso da API.
       */
      console.error('Erro ao emitir evento Socket.IO:', socketError.message)
    }
  }

  res.status(201).json({
    success: true,
    data: message,
  })
})

/**
 * ============================================================
 * READ
 * ============================================================
 */

/**
 * POST /api/chat/conversations/:id/read
 *
 * Marca todas as mensagens como lidas.
 *
 * A autorização agora considera:
 * - admin
 * - participant
 * - assignedTo para WhatsApp
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params

  validateObjectId(id, 'ID da conversa')

  const result = await chatService.markConversationAsRead({
    conversationId: id,
    user: req.user,
  })

  /**
   * Notifica os clientes da conversa que o usuário
   * atualizou o estado de leitura.
   */
  const io = req.app.get('io')

  if (io) {
    try {
      io.to(id).emit('conversation_read', {
        conversationId: id,
        userId: req.user._id,
      })
    } catch (socketError) {
      console.warn('Erro ao emitir conversation_read:', socketError.message)
    }
  }

  res.json({
    success: true,
    data: result,
  })
})

/**
 * ============================================================
 * BROKER CHANNEL
 * ============================================================
 */

/**
 * POST /api/chat/broker-channel
 *
 * Cria canal interno dos corretores.
 */
export const createBrokerChannel = asyncHandler(async (req, res) => {
  const { name } = req.body

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new AppError('Nome do canal é obrigatório.', 400)
  }

  const channel = await chatService.createBrokerChannel({
    name: name.trim(),
    createdBy: req.user._id,
  })

  /**
   * Atualiza Socket.IO para os participantes.
   */
  const io = req.app.get('io')

  if (io) {
    try {
      const participants = Array.isArray(channel.participants)
        ? channel.participants
        : []

      participants.forEach((participant) => {
        const participantId =
          participant?._id?.toString() || participant?.toString()

        if (!participantId) {
          return
        }

        io.to(`user_${participantId}`).emit('new_conversation', channel)
      })
    } catch (socketError) {
      console.warn('Erro ao notificar criação do canal:', socketError.message)
    }
  }

  res.status(201).json({
    success: true,
    data: channel,
  })
})

/**
 * ============================================================
 * USERS
 * ============================================================
 */

/**
 * GET /api/chat/users/search
 *
 * Busca usuários para criação de conversas internas.
 */
export const searchUsers = asyncHandler(async (req, res) => {
  const { q, limit } = req.query

  if (!q || typeof q !== 'string' || !q.trim()) {
    return res.json({
      success: true,
      data: [],
    })
  }

  const parsedLimit = limit ? Number.parseInt(limit, 10) : 10

  if (Number.isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
    throw new AppError('O limite deve estar entre 1 e 50.', 400)
  }

  const users = await chatService.searchUsers({
    query: q.trim(),
    userId: req.user._id,
    limit: parsedLimit,
  })

  res.json({
    success: true,
    data: users,
  })
})

/**
 * ============================================================
 * DELETE MESSAGE
 * ============================================================
 */

/**
 * DELETE /api/chat/messages/:id
 *
 * Deleta uma mensagem do chat interno.
 */
export const deleteMessage = asyncHandler(async (req, res) => {
  const { id } = req.params

  validateObjectId(id, 'ID da mensagem')

  const result = await chatService.deleteMessage({
    messageId: id,
    userId: req.user._id,
  })

  /**
   * Atualiza os clientes da conversa.
   *
   * Primeiro tentamos localizar a conversa antes
   * da resposta HTTP.
   */
  const io = req.app.get('io')

  if (io) {
    try {
      /**
       * O service já executou a exclusão.
       *
       * Procuramos mensagens/conversa através do Message
       * não está disponível aqui, então usamos o resultado
       * quando o service fornecer conversationId.
       *
       * Mantemos compatibilidade caso o resultado ainda
       * contenha apenas messageId.
       */
      if (result?.conversationId) {
        io.to(result.conversationId.toString()).emit('message_deleted', {
          messageId: id,
          conversationId: result.conversationId,
        })
      }
    } catch (socketError) {
      console.warn('Erro ao emitir message_deleted:', socketError.message)
    }
  }

  res.json({
    success: true,
    data: result,
  })
})
