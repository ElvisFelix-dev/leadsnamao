import asyncHandler from '../middleware/asyncHandler.js'
import * as chatService from '../service/chatService.js'
import Conversation from '../models/Conversation.js'
import AppError from '../utils/AppError.js'

/**
 * GET /api/chat/conversations
 * Lista conversas do usuário
 */
export const getConversations = asyncHandler(async (req, res) => {
  const conversations = await chatService.getUserConversations(req.user._id)

  res.json({
    success: true,
    data: conversations,
  })
})

/**
 * POST /api/chat/conversations
 * Cria uma nova conversa
 */
export const createConversation = asyncHandler(async (req, res) => {
  const { participants = [], type = 'direct', name = '' } = req.body

  if (!Array.isArray(participants)) {
    throw new AppError('Participantes inválidos.', 400)
  }

  // Adicionar usuário logado
  const allParticipants = [...participants, req.user._id]

  // Remover duplicados
  const uniqueParticipants = [
    ...new Map(
      allParticipants.map((participant) => [
        participant.toString(),
        participant,
      ]),
    ).values(),
  ]

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
 * GET /api/chat/conversations/:id/messages
 * Busca mensagens de uma conversa
 */
export const getMessages = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { limit, before } = req.query

  const messages = await chatService.getConversationMessages({
    conversationId: id,
    userId: req.user._id,
    limit: limit ? parseInt(limit, 10) : 50,
    before,
  })

  res.json({
    success: true,
    data: messages,
  })
})

/**
 * POST /api/chat/conversations/:id/messages
 * Envia uma mensagem
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const { id } = req.params

  const {
    content,
    type = 'text',
    attachment = null,
    replyTo = null,
    mentions = [],
  } = req.body

  console.log('🔍 Enviando mensagem para conversa:', id)

  console.log('🔍 Usuário:', req.user._id.toString())

  if (!content || !content.trim()) {
    throw new AppError('Conteúdo da mensagem é obrigatório.', 400)
  }

  // ---------------------------------------------------------
  // Criar mensagem
  // ---------------------------------------------------------
  const message = await chatService.sendMessage({
    conversationId: id,
    senderId: req.user._id,
    content: content.trim(),
    type,
    attachment,
    replyTo,
    mentions,
  })

  // ---------------------------------------------------------
  // Garantia de segurança
  // ---------------------------------------------------------
  if (!message) {
    console.error('❌ chatService.sendMessage() retornou null/undefined')

    throw new AppError('Não foi possível criar a mensagem.', 500)
  }

  if (!message._id) {
    console.error('❌ Mensagem criada sem _id:', message)

    throw new AppError('Mensagem inválida.', 500)
  }

  // ---------------------------------------------------------
  // Socket.IO
  // ---------------------------------------------------------
  const io = req.app.get('io')

  if (io) {
    try {
      const conversation = await Conversation.findOne({
        _id: id,
        isActive: true,
      })
        .select('participants')
        .lean()

      if (!conversation) {
        console.warn('⚠️ Conversa não encontrada para Socket.IO:', id)
      } else {
        const participants = Array.isArray(conversation.participants)
          ? conversation.participants.filter(Boolean)
          : []

        console.log(
          `📨 Emitindo mensagem para ${participants.length} participantes`,
        )

        // -----------------------------------------------------
        // Evento principal da conversa
        // -----------------------------------------------------
        io.to(id).emit('new_message', message)

        // -----------------------------------------------------
        // Notificação individual
        // -----------------------------------------------------
        const senderId = req.user._id.toString()

        participants.forEach((participant) => {
          if (!participant) {
            return
          }

          try {
            const participantId = participant.toString()

            // Não notificar o próprio remetente
            if (participantId === senderId) {
              return
            }

            io.to(`user_${participantId}`).emit('new_message_notification', {
              conversationId: id,
              message: {
                _id: message._id,
                content: message.content,
                sender: message.sender,
                createdAt: message.createdAt,
                type: message.type,
              },
            })

            console.log(`📨 Notificação enviada para usuário ${participantId}`)
          } catch (innerError) {
            console.warn(
              '⚠️ Erro ao notificar participante:',
              innerError.message,
            )
          }
        })
      }
    } catch (socketError) {
      console.error('❌ Erro ao emitir eventos do Socket.IO:', socketError)

      // Não interromper o envio da mensagem
    }
  } else {
    console.warn('⚠️ Socket.IO não está disponível em req.app')
  }

  // ---------------------------------------------------------
  // Resposta HTTP
  // ---------------------------------------------------------
  res.status(201).json({
    success: true,
    data: message,
  })
})

/**
 * POST /api/chat/conversations/:id/read
 * Marca todas as mensagens como lidas
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params

  const result = await chatService.markConversationAsRead({
    conversationId: id,
    userId: req.user._id,
  })

  res.json({
    success: true,
    data: result,
  })
})

/**
 * POST /api/chat/broker-channel
 * Cria canal de corretores
 */
export const createBrokerChannel = asyncHandler(async (req, res) => {
  const { name } = req.body

  const channel = await chatService.createBrokerChannel({
    name,
    createdBy: req.user._id,
  })

  res.status(201).json({
    success: true,
    data: channel,
  })
})

/**
 * GET /api/chat/users/search
 * Busca usuários para mencionar
 */
export const searchUsers = asyncHandler(async (req, res) => {
  const { q, limit } = req.query

  const users = await chatService.searchUsers({
    query: q,
    userId: req.user._id,
    limit: limit ? parseInt(limit, 10) : 10,
  })

  res.json({
    success: true,
    data: users,
  })
})

/**
 * DELETE /api/chat/messages/:id
 * Deleta uma mensagem
 */
export const deleteMessage = asyncHandler(async (req, res) => {
  const { id } = req.params

  const result = await chatService.deleteMessage({
    messageId: id,
    userId: req.user._id,
  })

  res.json({
    success: true,
    data: result,
  })
})
