import mongoose from 'mongoose'
import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import User from '../models/User.js'
import AppError from '../utils/AppError.js'

import WhatsAppContact from '../models/WhatsAppContact.js'

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

/**
 * Verifica se o usuário possui privilégios administrativos.
 *
 * O projeto possui contextos onde o admin pode ser identificado
 * tanto por isAdmin quanto pelo role.
 */
const isAdminUser = (user) => {
  return user?.isAdmin === true || user?.role === 'admin'
}

/**
 * Converte ObjectId/string para string com segurança.
 */
const sameId = (valueA, valueB) => {
  if (!valueA || !valueB) {
    return false
  }

  const idA = valueA?._id ?? valueA
  const idB = valueB?._id ?? valueB

  return idA.toString() === idB.toString()
}

/**
 * Verifica se um usuário está entre os participantes
 * de uma conversa interna.
 */
const isParticipant = (conversation, userId) => {
  if (!conversation?.participants || !userId) {
    return false
  }

  return conversation.participants.some((participant) =>
    sameId(participant, userId),
  )
}

/**
 * Verifica se o usuário pode acessar determinada conversa.
 *
 * REGRAS:
 *
 * ADMIN
 *   → pode acessar qualquer conversa ativa.
 *
 * WHATSAPP
 *   → broker somente se assignedTo === user._id
 *
 * INTERNAL
 *   → usuário precisa estar em participants
 *
 * Isso mantém o WhatsApp separado do conceito de
 * participants usado pelo chat interno.
 */
const canAccessConversation = (conversation, user) => {
  if (!conversation || !user?._id) {
    return false
  }

  if (isAdminUser(user)) {
    return true
  }

  if (conversation.channel === 'whatsapp') {
    if (!conversation.assignedTo) {
      return false
    }

    return sameId(conversation.assignedTo, user._id)
  }

  if (conversation.channel === 'internal') {
    return isParticipant(conversation, user._id)
  }

  return isParticipant(conversation, user._id)
}

/**
 * ============================================================
 * CONVERSATIONS
 * ============================================================
 */

/**
 * Cria uma conversa interna.
 *
 * IMPORTANTE:
 * Conversas WhatsApp não são criadas por esta função.
 * Elas são criadas pelo fluxo do WhatsApp/webhook.
 */
export const createConversation = async ({
  participants,
  type = 'direct',
  name = '',
  createdBy,
}) => {
  if (!participants || !Array.isArray(participants)) {
    throw new AppError('Participantes são obrigatórios.', 400)
  }

  const uniqueParticipants = [
    ...new Set(
      participants.filter(Boolean).map((participant) => participant.toString()),
    ),
  ]

  if (uniqueParticipants.length === 0) {
    throw new AppError('A conversa precisa ter participantes.', 400)
  }

  /**
   * Conversa direta:
   *
   * Se já existir uma conversa direta entre os mesmos
   * usuários, reutilizamos a conversa existente.
   */
  if (type === 'direct' && uniqueParticipants.length === 2) {
    const existingConversation = await Conversation.findOne({
      channel: 'internal',
      type: 'direct',
      participants: {
        $all: uniqueParticipants,
      },
      isActive: true,
    })

    if (existingConversation) {
      return existingConversation.populate([
        {
          path: 'participants',
          select: 'name email role isAdmin avatar',
        },
        {
          path: 'createdBy',
          select: 'name email role isAdmin avatar',
        },
      ])
    }
  }

  const unreadCounts = {}

  uniqueParticipants.forEach((participantId) => {
    unreadCounts[participantId] = 0
  })

  const conversation = await Conversation.create({
    participants: uniqueParticipants,
    type,
    name: name?.trim() || '',
    createdBy,
    channel: 'internal',
    unreadCounts,
    isActive: true,
  })

  return conversation.populate([
    {
      path: 'participants',
      select: 'name email role isAdmin avatar',
    },
    {
      path: 'createdBy',
      select: 'name email role isAdmin avatar',
    },
  ])
}

/**
 * Busca as conversas que o usuário pode visualizar.
 *
 * ADMIN:
 *   → todas as conversas ativas.
 *
 * BROKER:
 *   → conversas internas onde participa
 *   → conversas WhatsApp atribuídas a ele
 */
export const getUserConversations = async (user) => {
  if (!user?._id) {
    throw new AppError('Usuário não identificado.', 401)
  }

  const baseFilter = {
    isActive: true,
  }

  if (!isAdminUser(user)) {
    baseFilter.$or = [
      {
        channel: 'internal',
        participants: user._id,
      },
      {
        channel: 'whatsapp',
        assignedTo: user._id,
      },
    ]
  } else {
    baseFilter.channel = {
      $in: ['internal', 'whatsapp'],
    }
  }

  const conversations = await Conversation.find(baseFilter)
    .populate({
      path: 'participants',
      select: 'name email role isAdmin avatar',
    })
    .populate({
      path: 'lastMessageFrom',
      select: 'name email role isAdmin avatar',
    })
    .populate({
      path: 'createdBy',
      select: 'name email role isAdmin avatar',
    })
    .populate({
      path: 'assignedTo',
      select: 'name email role isAdmin avatar',
    })
    .populate({
      path: 'lead',
      select:
        'name phone phoneNormalized email stage status priority source assignedTo',
    })
    .populate({
      path: 'whatsappContact',
      select:
        'name phone phoneNormalized remoteJid isGroup isActive lastMessageAt metadata lead integration',
    })
    .populate({
      path: 'whatsappIntegration',
      select: 'name provider status sessionId enabled',
    })
    .sort({
      lastMessageAt: -1,
      updatedAt: -1,
    })

  return conversations.map((conversation) => {
    const conversationObject = conversation.toObject()

    /**
     * Mantém o comportamento existente de retornar
     * o contador individual de mensagens não lidas.
     */
    const unreadCounts = conversationObject.unreadCounts || {}

    conversationObject.unreadCount = unreadCounts[user._id.toString()] || 0

    return conversationObject
  })
}

/**
 * Busca as mensagens de uma conversa.
 *
 * A autorização é feita através de canAccessConversation():
 *
 * - admin → acesso global
 * - WhatsApp → assignedTo
 * - interno → participants
 */
export const getConversationMessages = async ({
  conversationId,
  user,
  limit = 50,
  before = null,
}) => {
  if (!conversationId) {
    throw new AppError('ID da conversa é obrigatório.', 400)
  }

  if (!user?._id) {
    throw new AppError('Usuário não identificado.', 401)
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    isActive: true,
  })
    .populate({
      path: 'participants',
      select: 'name email role isAdmin avatar',
    })
    .populate({
      path: 'assignedTo',
      select: 'name email role isAdmin avatar',
    })
    .populate({
      path: 'lead',
      select:
        'name phone phoneNormalized email stage status priority source assignedTo',
    })
    .populate({
      path: 'whatsappContact',
      select:
        'name phone phoneNormalized remoteJid isGroup isActive lastMessageAt metadata lead integration',
    })
    .populate({
      path: 'whatsappIntegration',
      select: 'name provider status sessionId enabled',
    })

  if (!conversation) {
    throw new AppError('Conversa não encontrada.', 404)
  }

  if (!canAccessConversation(conversation, user)) {
    throw new AppError(
      'Você não tem permissão para acessar esta conversa.',
      403,
    )
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100)

  const messageFilter = {
    conversation: conversationId,
  }

  if (before) {
    const beforeDate = new Date(before)

    if (!Number.isNaN(beforeDate.getTime())) {
      messageFilter.createdAt = {
        $lt: beforeDate,
      }
    }
  }

  const messages = await Message.find(messageFilter)
    .populate({
      path: 'sender',
      select: 'name email role isAdmin avatar',
    })
    .populate({
      path: 'whatsappContact',
      select:
        'name phone phoneNormalized remoteJid isGroup isActive lastMessageAt',
    })
    .populate({
      path: 'replyTo',
      populate: {
        path: 'sender',
        select: 'name email role isAdmin avatar',
      },
    })
    .sort({
      createdAt: -1,
    })
    .limit(safeLimit)

  /**
   * Retorna em ordem cronológica.
   */
  messages.reverse()

  /**
   * Marca como lidas as mensagens destinadas ao usuário.
   *
   * Mensagens recebidas pelo WhatsApp possuem sender null,
   * então elas entram como mensagens não lidas para o
   * responsável/admin através do mecanismo da conversa.
   */
  await Message.updateMany(
    {
      conversation: conversationId,
      sender: {
        $ne: user._id,
      },
      readBy: {
        $ne: user._id,
      },
    },
    {
      $addToSet: {
        readBy: user._id,
      },
    },
  )

  await Conversation.updateOne(
    {
      _id: conversationId,
    },
    {
      $set: {
        [`unreadCounts.${user._id.toString()}`]: 0,
      },
    },
  )

  return {
    conversation,
    messages,
  }
}

/**
 * ============================================================
 * ENVIO DE MENSAGENS
 * ============================================================
 */

/**
 * Envia mensagem pelo CHAT INTERNO.
 *
 * IMPORTANTE:
 * O WhatsApp não deve usar este método para envio.
 *
 * O envio WhatsApp será feito futuramente por um endpoint
 * específico que chama whatsappAkgService.sendTextMessage().
 */
export const sendMessage = async ({
  conversationId,
  senderId,
  content,
  type = 'text',
  attachment = null,
  replyTo = null,
  mentions = [],
  isAdmin = false,
}) => {
  if (!conversationId) {
    throw new AppError('ID da conversa é obrigatório.', 400)
  }

  if (!senderId) {
    throw new AppError('Remetente é obrigatório.', 400)
  }

  if (!content?.trim() && !attachment) {
    throw new AppError('A mensagem precisa ter conteúdo ou anexo.', 400)
  }

  const session = await mongoose.startSession()

  try {
    let createdMessage = null

    await session.withTransaction(async () => {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        isActive: true,
      }).session(session)

      if (!conversation) {
        throw new AppError('Conversa não encontrada.', 404)
      }

      /**
       * WhatsApp possui fluxo próprio de envio.
       */
      if (conversation.channel === 'whatsapp') {
        throw new AppError(
          'Mensagens WhatsApp devem ser enviadas pelo serviço de WhatsApp.',
          400,
        )
      }

      /**
       * Para chat interno:
       *
       * - participante pode enviar
       * - admin também pode enviar
       */
      const authorized = isAdmin || isParticipant(conversation, senderId)

      if (!authorized) {
        throw new AppError(
          'Você não tem permissão para enviar mensagens nesta conversa.',
          403,
        )
      }

      if (
        !conversation.participants ||
        !Array.isArray(conversation.participants) ||
        conversation.participants.length === 0
      ) {
        throw new AppError('A conversa não possui participantes.', 400)
      }

      createdMessage = await Message.create(
        [
          {
            conversation: conversation._id,
            sender: senderId,
            senderType: 'user',
            content: content?.trim() || '',
            type,
            attachment,
            replyTo,
            mentions,
            direction: 'outbound',
            status: 'sent',
            readBy: [senderId],
          },
        ],
        {
          session,
        },
      )

      createdMessage = createdMessage[0]

      const now = new Date()

      conversation.lastMessage = createdMessage._id
      conversation.lastMessageAt = now
      conversation.lastMessageFrom = senderId

      /**
       * Atualiza contador individual de não lidas.
       *
       * O próprio remetente não recebe unread.
       */
      const unreadCounts = conversation.unreadCounts || {}

      conversation.participants.forEach((participant) => {
        const participantId = participant.toString()

        if (participantId === senderId.toString()) {
          return
        }

        unreadCounts[participantId] = (unreadCounts[participantId] || 0) + 1
      })

      conversation.unreadCounts = unreadCounts

      await conversation.save({
        session,
      })
    })

    /**
     * Populate fora da transação.
     */
    await createdMessage.populate([
      {
        path: 'sender',
        select: 'name email role isAdmin avatar',
      },
      {
        path: 'replyTo',
        populate: {
          path: 'sender',
          select: 'name email role isAdmin avatar',
        },
      },
    ])

    return createdMessage
  } finally {
    await session.endSession()
  }
}

/**
 * ============================================================
 * ENVIO DE MENSAGEM WHATSAPP
 * ============================================================
 */

/**
 * Envia uma mensagem de texto para uma conversa WhatsApp.
 *
 * IMPORTANTE:
 *
 * Este método é separado de sendMessage().
 *
 * sendMessage()
 *   → chat interno
 *
 * sendWhatsAppMessage()
 *   → WhatsApp / WA-AKG
 *
 * Fluxo:
 *
 * Frontend
 *   ↓
 * chatController
 *   ↓
 * sendWhatsAppMessage()
 *   ↓
 * whatsappAkgService.sendTextMessage()
 *   ↓
 * WA-AKG
 *   ↓
 * Message outbound
 *   ↓
 * Conversation
 */
export const sendWhatsAppMessage = async ({
  conversationId,
  senderId,
  content,
  replyTo = null,
  mentions = [],
}) => {
  if (!conversationId) {
    throw new AppError('ID da conversa é obrigatório.', 400)
  }

  if (!senderId) {
    throw new AppError('Remetente é obrigatório.', 400)
  }

  if (!content?.trim()) {
    throw new AppError('A mensagem é obrigatória.', 400)
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    channel: 'whatsapp',
    isActive: true,
  })
    .populate({
      path: 'whatsappContact',
      select:
        'name phone phoneNormalized remoteJid isGroup isActive lastMessageAt',
    })
    .populate({
      path: 'whatsappIntegration',
      select: 'name provider status sessionId enabled',
    })
    .populate({
      path: 'lead',
      select:
        'name phone phoneNormalized email stage status priority source assignedTo',
    })

  if (!conversation) {
    throw new AppError('Conversa WhatsApp não encontrada.', 404)
  }

  /**
   * ==========================================================
   * AUTORIZAÇÃO
   * ==========================================================
   *
   * Admin pode enviar em qualquer conversa.
   *
   * Broker somente se for o responsável pela conversa.
   */
  const user = await User.findById(senderId).select(
    '_id name email role isAdmin avatar',
  )

  if (!user) {
    throw new AppError('Usuário não encontrado.', 404)
  }

  const authorized =
    isAdminUser(user) ||
    sameId(conversation.assignedTo, user._id) ||
    sameId(conversation.lead?.assignedTo, user._id)

  if (!authorized) {
    throw new AppError(
      'Você não tem permissão para enviar mensagens nesta conversa WhatsApp.',
      403,
    )
  }

  /**
   * ==========================================================
   * WHATSAPP CONTACT
   * ==========================================================
   */

  const whatsappContact = conversation.whatsappContact

  if (!whatsappContact) {
    throw new AppError(
      'O contato WhatsApp desta conversa não foi encontrado.',
      400,
    )
  }

  if (!whatsappContact.isActive) {
    throw new AppError('O contato WhatsApp está inativo.', 400)
  }

  const phone =
    whatsappContact.phoneNormalized ||
    whatsappContact.phone ||
    whatsappContact.remoteJid?.split('@')[0]

  if (!phone) {
    throw new AppError(
      'Não foi possível identificar o número do WhatsApp.',
      400,
    )
  }

  /**
   * ==========================================================
   * INTEGRAÇÃO
   * ==========================================================
   */

  const whatsappIntegration = conversation.whatsappIntegration

  if (!whatsappIntegration) {
    throw new AppError(
      'A integração WhatsApp desta conversa não foi encontrada.',
      400,
    )
  }

  /**
   * ==========================================================
   * ENVIO PELO WA-AKG
   * ==========================================================
   *
   * IMPORTANTE:
   *
   * Usamos import dinâmico porque whatsappAkgService.js
   * já importa chatService.js.
   *
   * Dessa forma evitamos dependência circular estática.
   */
  const { sendTextMessage } = await import('./whatsapp/whatsappAkgService.js')

  const providerResponse = await sendTextMessage({
    integrationId: whatsappIntegration._id,
    phone,
    message: content.trim(),
  })

  console.log(
    '[CHAT][WHATSAPP] Provider response:',
    JSON.stringify(providerResponse, null, 2),
  )

  /**
   * ==========================================================
   * PERSISTÊNCIA DA MENSAGEM
   * ==========================================================
   */

  const externalMessageId =
    providerResponse?.providerResponse?.data?.messageId ||
    providerResponse?.providerResponse?.messageId ||
    providerResponse?.providerResponse?.id ||
    null

  const message = await Message.create({
    conversation: conversation._id,

    sender: senderId,

    senderType: 'user',

    whatsappContact: whatsappContact._id,

    externalMessageId,

    content: content.trim(),

    type: 'text',

    attachment: null,

    replyTo,

    mentions,

    direction: 'outbound',

    status: 'sent',

    readBy: [senderId],
  })

  /**
   * ==========================================================
   * ATUALIZA CONVERSATION
   * ==========================================================
   */

  const now = new Date()

  conversation.lastMessage = message._id

  conversation.lastMessageAt = now

  conversation.lastMessageFrom = senderId

  /**
   * Atualiza o horário do contato.
   */
  await WhatsAppContact.updateOne(
    {
      _id: whatsappContact._id,
    },
    {
      $set: {
        lastMessageAt: now,
      },
    },
  )

  await conversation.save()

  /**
   * ==========================================================
   * POPULATE
   * ==========================================================
   */

  await message.populate([
    {
      path: 'sender',
      select: 'name email role isAdmin avatar',
    },
    {
      path: 'whatsappContact',
      select:
        'name phone phoneNormalized remoteJid isGroup isActive lastMessageAt',
    },
    {
      path: 'replyTo',
      populate: {
        path: 'sender',
        select: 'name email role isAdmin avatar',
      },
    },
    {
      path: 'conversation',
      populate: [
        {
          path: 'lead',
          select:
            'name phone phoneNormalized email stage status priority source assignedTo',
        },
        {
          path: 'assignedTo',
          select: 'name email role isAdmin avatar',
        },
        {
          path: 'whatsappIntegration',
          select: 'name provider status sessionId enabled',
        },
      ],
    },
  ])

  return message
}

/**
 * ============================================================
 * READ STATUS
 * ============================================================
 */

/**
 * Marca uma mensagem específica como lida.
 */
export const markMessageAsRead = async ({ messageId, userId }) => {
  if (!messageId || !userId) {
    throw new AppError('Mensagem e usuário são obrigatórios.', 400)
  }

  const message = await Message.findById(messageId).populate({
    path: 'conversation',
    select: 'participants channel assignedTo isActive',
  })

  if (!message) {
    throw new AppError('Mensagem não encontrada.', 404)
  }

  if (!message.conversation?.isActive) {
    throw new AppError('Conversa inativa.', 400)
  }

  /**
   * Para esta função ainda recebemos apenas userId.
   *
   * O método é mantido compatível com o comportamento
   * anterior. A rota atual também não expõe este método
   * diretamente.
   */
  const conversation = message.conversation

  const allowed =
    conversation.channel === 'whatsapp'
      ? sameId(conversation.assignedTo, userId)
      : isParticipant(conversation, userId)

  if (!allowed) {
    throw new AppError(
      'Você não tem permissão para acessar esta mensagem.',
      403,
    )
  }

  const alreadyRead = message.readBy?.some((reader) => sameId(reader, userId))

  if (alreadyRead) {
    return message
  }

  message.readBy.push(userId)

  /**
   * Quando todos os participantes tiverem lido,
   * marcamos a mensagem como read.
   *
   * Para WhatsApp não existe participants.
   * Nesse caso o status da mensagem recebida é controlado
   * pelo fluxo específico do WhatsApp.
   */
  if (
    conversation.channel === 'internal' &&
    conversation.participants?.length
  ) {
    const participantCount = conversation.participants.length

    if (message.readBy.length >= participantCount) {
      message.status = 'read'
    }
  }

  await message.save()

  return message
}

/**
 * Marca todas as mensagens da conversa como lidas.
 *
 * Recebe o objeto user completo para conseguir aplicar
 * a mesma regra de autorização das demais operações.
 */
export const markConversationAsRead = async ({ conversationId, user }) => {
  if (!conversationId) {
    throw new AppError('ID da conversa é obrigatório.', 400)
  }

  if (!user?._id) {
    throw new AppError('Usuário não identificado.', 401)
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    isActive: true,
  })

  if (!conversation) {
    throw new AppError('Conversa não encontrada.', 404)
  }

  if (!canAccessConversation(conversation, user)) {
    throw new AppError(
      'Você não tem permissão para acessar esta conversa.',
      403,
    )
  }

  await Message.updateMany(
    {
      conversation: conversationId,
      readBy: {
        $ne: user._id,
      },
    },
    {
      $addToSet: {
        readBy: user._id,
      },
    },
  )

  /**
   * Para conversa interna podemos atualizar os status
   * das mensagens quando todos os participantes leram.
   *
   * Para WhatsApp mantemos o status do provider.
   */
  if (conversation.channel === 'internal') {
    const participantIds = conversation.participants || []

    if (participantIds.length > 0) {
      const unreadMessages = await Message.find({
        conversation: conversationId,
        status: {
          $ne: 'read',
        },
      }).select('_id readBy')

      const updates = []

      for (const message of unreadMessages) {
        const readers = message.readBy || []

        const allParticipantsRead = participantIds.every((participantId) =>
          readers.some((readerId) => sameId(readerId, participantId)),
        )

        if (allParticipantsRead) {
          updates.push(message._id)
        }
      }

      if (updates.length > 0) {
        await Message.updateMany(
          {
            _id: {
              $in: updates,
            },
          },
          {
            $set: {
              status: 'read',
            },
          },
        )
      }
    }
  }

  await Conversation.updateOne(
    {
      _id: conversationId,
    },
    {
      $set: {
        [`unreadCounts.${user._id.toString()}`]: 0,
      },
    },
  )

  return {
    success: true,
    conversationId,
    userId: user._id,
  }
}

/**
 * ============================================================
 * BROKER CHANNEL
 * ============================================================
 */

/**
 * Cria o canal interno dos brokers.
 */
export const createBrokerChannel = async ({ name, createdBy }) => {
  if (!name?.trim()) {
    throw new AppError('Nome do canal é obrigatório.', 400)
  }

  if (!createdBy) {
    throw new AppError('Usuário criador é obrigatório.', 400)
  }

  const brokers = await User.find({
    role: 'broker',
    isActive: {
      $ne: false,
    },
  }).select('_id')

  const admins = await User.find({
    isAdmin: true,
    isActive: {
      $ne: false,
    },
  }).select('_id')

  const participantIds = [
    ...new Set([
      ...brokers.map((user) => user._id.toString()),
      ...admins.map((user) => user._id.toString()),
    ]),
  ]

  if (participantIds.length === 0) {
    throw new AppError(
      'Nenhum usuário disponível para participar do canal.',
      400,
    )
  }

  const unreadCounts = {}

  participantIds.forEach((participantId) => {
    unreadCounts[participantId] = 0
  })

  const conversation = await Conversation.create({
    participants: participantIds,
    type: 'broker_channel',
    channel: 'internal',
    name: name.trim(),
    createdBy,
    unreadCounts,
    isActive: true,
  })

  return conversation.populate([
    {
      path: 'participants',
      select: 'name email role isAdmin avatar',
    },
    {
      path: 'createdBy',
      select: 'name email role isAdmin avatar',
    },
  ])
}

/**
 * ============================================================
 * USERS
 * ============================================================
 */

/**
 * Pesquisa usuários para criação de conversas internas.
 */
export const searchUsers = async ({ query, userId, limit = 20 }) => {
  if (!query?.trim()) {
    return []
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50)

  const regex = new RegExp(
    query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'i',
  )

  const filter = {
    _id: {
      $ne: userId,
    },
    isActive: {
      $ne: false,
    },
    $or: [
      {
        name: regex,
      },
      {
        email: regex,
      },
    ],
  }

  return User.find(filter)
    .select('name email role isAdmin avatar')
    .sort({
      name: 1,
    })
    .limit(safeLimit)
}

/**
 * ============================================================
 * MESSAGES
 * ============================================================
 */

/**
 * Exclui uma mensagem enviada pelo próprio usuário.
 *
 * Mantemos a regra atual:
 * somente o remetente da mensagem pode excluí-la.
 *
 * Mensagens recebidas pelo WhatsApp possuem sender null,
 * portanto não entram nessa regra.
 */
export const deleteMessage = async ({ messageId, userId }) => {
  if (!messageId || !userId) {
    throw new AppError('Mensagem e usuário são obrigatórios.', 400)
  }

  const message = await Message.findOne({
    _id: messageId,
    sender: userId,
  }).populate({
    path: 'conversation',
    select: 'channel isActive participants assignedTo',
  })

  if (!message) {
    throw new AppError(
      'Mensagem não encontrada ou você não pode excluí-la.',
      404,
    )
  }

  if (!message.conversation?.isActive) {
    throw new AppError('A conversa está inativa.', 400)
  }

  /**
   * Não permitir exclusão através desta função
   * de mensagens WhatsApp.
   */
  if (message.conversation.channel === 'whatsapp') {
    throw new AppError(
      'Mensagens WhatsApp não podem ser excluídas por este serviço.',
      400,
    )
  }

  await Message.deleteOne({
    _id: messageId,
  })

  /**
   * Se a mensagem excluída era a última da conversa,
   * recalculamos a última mensagem.
   */
  const conversation = message.conversation

  const lastMessage = await Message.findOne({
    conversation: conversation._id,
  })
    .sort({
      createdAt: -1,
    })
    .select('_id createdAt sender')

  if (lastMessage) {
    await Conversation.updateOne(
      {
        _id: conversation._id,
      },
      {
        $set: {
          lastMessage: lastMessage._id,
          lastMessageAt: lastMessage.createdAt,
          lastMessageFrom: lastMessage.sender || null,
        },
      },
    )
  } else {
    await Conversation.updateOne(
      {
        _id: conversation._id,
      },
      {
        $set: {
          lastMessage: null,
          lastMessageAt: null,
          lastMessageFrom: null,
        },
      },
    )
  }

  return {
    success: true,
    messageId,
  }
}

/**
 * Adiciona um broker a um canal interno.
 */
export const addBrokerToChannel = async ({ conversationId, brokerId }) => {
  if (!conversationId || !brokerId) {
    throw new AppError('Conversa e broker são obrigatórios.', 400)
  }

  const broker = await User.findOne({
    _id: brokerId,
    role: 'broker',
    isActive: {
      $ne: false,
    },
  })

  if (!broker) {
    throw new AppError('Broker não encontrado.', 404)
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    channel: 'internal',
    type: 'broker_channel',
    isActive: true,
  })

  if (!conversation) {
    throw new AppError('Canal de brokers não encontrado.', 404)
  }

  const alreadyParticipant = conversation.participants.some((participant) =>
    sameId(participant, broker._id),
  )

  if (!alreadyParticipant) {
    conversation.participants.push(broker._id)

    const unreadCounts = conversation.unreadCounts || {}

    if (unreadCounts[broker._id.toString()] === undefined) {
      unreadCounts[broker._id.toString()] = 0
    }

    conversation.unreadCounts = unreadCounts

    await conversation.save()
  }

  return conversation.populate({
    path: 'participants',
    select: 'name email role isAdmin avatar',
  })
}

/**
 * ============================================================
 * WHATSAPP
 * ============================================================
 */

/**
 * Persiste uma mensagem recebida pelo WhatsApp.
 *
 * Esta função NÃO decide se o Lead pode acessar a conversa.
 * Essa decisão já deve ter sido feita no webhook antes
 * da criação da conversa.
 *
 * Fluxo:
 *
 * WhatsApp
 *   ↓
 * webhook
 *   ↓
 * Lead encontrado
 *   ↓
 * Conversation WhatsApp
 *   ↓
 * receiveWhatsAppMessage()
 */
export const receiveWhatsAppMessage = async ({
  conversationId,
  whatsappContactId,
  externalMessageId,
  content,
  type = 'text',
  attachment = null,
}) => {
  if (!conversationId) {
    throw new AppError('ID da conversa é obrigatório.', 400)
  }

  if (!whatsappContactId) {
    throw new AppError('WhatsAppContact é obrigatório.', 400)
  }

  if (!content?.trim() && !attachment) {
    throw new AppError('A mensagem precisa ter conteúdo ou anexo.', 400)
  }

  /**
   * Idempotência:
   *
   * O WA-AKG pode reenviar um webhook.
   *
   * Se o externalMessageId já estiver salvo,
   * não criamos uma mensagem duplicada.
   */
  if (externalMessageId) {
    const existingMessage = await Message.findOne({
      externalMessageId,
    })
      .populate({
        path: 'whatsappContact',
        select:
          'name phone phoneNormalized remoteJid isGroup isActive lastMessageAt',
      })
      .populate({
        path: 'conversation',
        populate: [
          {
            path: 'lead',
            select:
              'name phone phoneNormalized email stage status priority assignedTo',
          },
          {
            path: 'assignedTo',
            select: 'name email role isAdmin avatar',
          },
          {
            path: 'whatsappIntegration',
            select: 'name provider status sessionId enabled',
          },
        ],
      })

    if (existingMessage) {
      return existingMessage
    }
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    channel: 'whatsapp',
    whatsappContact: whatsappContactId,
    isActive: true,
  })

  if (!conversation) {
    throw new AppError('Conversa WhatsApp não encontrada.', 404)
  }

  /**
   * WhatsApp não usa participants.
   *
   * O responsável pela conversa é determinado por
   * conversation.assignedTo.
   */
  const message = await Message.create({
    conversation: conversation._id,
    sender: null,
    senderType: 'whatsapp_contact',
    whatsappContact: whatsappContactId,
    externalMessageId: externalMessageId || null,
    content: content?.trim() || '',
    type,
    attachment,
    direction: 'inbound',
    status: 'delivered',
    readBy: [],
  })

  const now = new Date()

  conversation.lastMessage = message._id
  conversation.lastMessageAt = now
  conversation.lastMessageFrom = null

  /**
   * Incrementa o contador de unread do responsável.
   *
   * Admin não precisa ser adicionado em unreadCounts.
   * O frontend/admin pode calcular a existência de mensagens
   * não lidas globalmente.
   */
  if (conversation.assignedTo) {
    const assignedToId = conversation.assignedTo.toString()

    const unreadCounts = conversation.unreadCounts || {}

    unreadCounts[assignedToId] = (unreadCounts[assignedToId] || 0) + 1

    conversation.unreadCounts = unreadCounts
  }

  await conversation.save()

  await message.populate([
    {
      path: 'whatsappContact',
      select:
        'name phone phoneNormalized remoteJid isGroup isActive lastMessageAt',
    },
    {
      path: 'conversation',
      populate: [
        {
          path: 'lead',
          select:
            'name phone phoneNormalized email stage status priority source assignedTo',
        },
        {
          path: 'assignedTo',
          select: 'name email role isAdmin avatar',
        },
        {
          path: 'whatsappIntegration',
          select: 'name provider status sessionId enabled',
        },
      ],
    },
  ])

  return message
}

/**
 * ============================================================
 * EXPORTS
 * ============================================================
 */

export default {
  createConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  sendWhatsAppMessage,
  markMessageAsRead,
  markConversationAsRead,
  createBrokerChannel,
  searchUsers,
  deleteMessage,
  addBrokerToChannel,
  receiveWhatsAppMessage,
}
