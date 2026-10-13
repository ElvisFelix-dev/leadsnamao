// src/controllers/chatController.js

import mongoose from 'mongoose'

import asyncHandler from '../middleware/asyncHandler.js'
import * as chatService from '../service/chatService.js'
import Conversation from '../models/Conversation.js'
import AppError from '../utils/AppError.js'
import { getSocketIO } from '../sockets/index.js'

// ==========================================================
// HELPERS
// ==========================================================

const isAdminUser = (user) => {
  return user?.isAdmin === true || user?.role === 'admin'
}

const getUserId = (user) => {
  if (!user) return null

  return String(typeof user === 'object' && user._id ? user._id : user)
}

const validateObjectId = (id, fieldName = 'ID') => {
  if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
    throw new AppError(`${fieldName} inválido.`, 400)
  }

  return String(id)
}

const getSocket = () => {
  try {
    return getSocketIO()
  } catch (error) {
    console.error('[ChatController] Socket.IO indisponível:', error.message)

    return null
  }
}

const emitToConversation = (conversationId, event, payload) => {
  const io = getSocket()

  if (!io) return

  io.to(String(conversationId)).emit(event, payload)
}

const emitToUser = (userId, event, payload) => {
  const io = getSocket()

  if (!io || !userId) return

  io.to(String(userId)).emit(event, payload)
}

const normalizeAttachment = (attachment) => {
  if (!attachment) return null

  if (typeof attachment !== 'object' || Array.isArray(attachment)) {
    throw new AppError('O anexo informado é inválido.', 400)
  }

  return {
    url: String(attachment.url || '').trim(),
    name: String(attachment.name || '').trim(),
    size: Math.max(0, Number(attachment.size) || 0),
    mimeType: String(attachment.mimeType || '').trim(),
  }
}

const validateMentions = (mentions) => {
  if (mentions == null) return []

  if (!Array.isArray(mentions)) {
    throw new AppError('A lista de menções precisa ser um array.', 400)
  }

  return [
    ...new Set(
      mentions.map((mention) => {
        const id =
          typeof mention === 'object' && mention?._id
            ? String(mention._id)
            : String(mention)

        return validateObjectId(id, 'ID da menção')
      }),
    ),
  ]
}

const getConversationForSending = async (conversationId) => {
  return Conversation.findOne({
    _id: conversationId,
    isActive: true,
  })
    .select(
      [
        'channel',
        'type',
        'participants',
        'assignedTo',
        'whatsappContact',
        'whatsappIntegration',
        'lead',
        'name',
      ].join(' '),
    )
    .populate('assignedTo', '_id name role')
    .populate('lead', 'name assignedTo')
}

// ==========================================================
// GET /api/chat/conversations
// ==========================================================

export const getConversations = asyncHandler(async (req, res) => {
  const userId = validateObjectId(getUserId(req.user), 'ID do usuário')

  const conversations = await chatService.getUserConversations(userId)

  return res.status(200).json({
    success: true,
    count: conversations.length,
    data: conversations,
  })
})

// ==========================================================
// POST /api/chat/conversations
// Cria conversas internas.
// ==========================================================

export const createConversation = asyncHandler(async (req, res) => {
  const userId = validateObjectId(getUserId(req.user), 'ID do usuário')

  const {
    participants = [],
    type = 'direct',
    name = '',
    avatar = '',
  } = req.body || {}

  if (!Array.isArray(participants)) {
    throw new AppError(
      'Os participantes precisam ser enviados em um array.',
      400,
    )
  }

  if (!['direct', 'group', 'broker_channel'].includes(type)) {
    throw new AppError('Tipo de conversa inválido.', 400)
  }

  if (type === 'broker_channel') {
    throw new AppError(
      'Utilize a rota específica para criar um canal de corretores.',
      400,
    )
  }

  const participantIds = [
    ...new Set(
      [...participants, userId].map((participant) => {
        const id =
          typeof participant === 'object' && participant?._id
            ? String(participant._id)
            : String(participant)

        return validateObjectId(id, 'ID do participante')
      }),
    ),
  ]

  if (type === 'direct' && participantIds.length !== 2) {
    throw new AppError(
      'Uma conversa direta precisa ter exatamente dois participantes.',
      400,
    )
  }

  if (type === 'group' && participantIds.length < 2) {
    throw new AppError(
      'Um grupo precisa ter pelo menos dois participantes.',
      400,
    )
  }

  const conversation = await chatService.createConversation({
    participants: participantIds,
    createdBy: userId,
    type,
    name,
    avatar,
    isAdmin: isAdminUser(req.user),
  })

  const conversationId = String(conversation._id)

  emitToConversation(conversationId, 'new_conversation', {
    conversation,
  })

  // Notifica todos os participantes, inclusive o criador,
  // para permitir que as listas de conversas sejam atualizadas.
  for (const participant of conversation.participants || []) {
    const participantId =
      typeof participant === 'object' && participant?._id
        ? String(participant._id)
        : String(participant)

    emitToUser(participantId, 'new_conversation', {
      conversation,
    })
  }

  return res.status(201).json({
    success: true,
    message: 'Conversa criada com sucesso.',
    data: conversation,
  })
})

// ==========================================================
// GET /api/chat/conversations/:conversationId/messages
// ==========================================================

export const getMessages = asyncHandler(async (req, res) => {
  const conversationId = validateObjectId(
    req.params.conversationId,
    'ID da conversa',
  )

  const userId = validateObjectId(getUserId(req.user), 'ID do usuário')

  const parsedLimit = Number(req.query.limit ?? 50)

  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    throw new AppError('O limite precisa ser um número entre 1 e 100.', 400)
  }

  const before = req.query.before || null

  const messages = await chatService.getConversationMessages({
    conversationId,
    userId,
    limit: parsedLimit,
    before,
  })

  return res.status(200).json({
    success: true,
    count: messages.length,
    data: messages,
  })
})

// ==========================================================
// POST /api/chat/conversations/:conversationId/messages
// Envio de mensagens internas e WhatsApp.
// ==========================================================

export const sendMessage = asyncHandler(async (req, res) => {
  console.log('[ChatController] Envio de mensagem:', {
    params: req.params,
    url: req.originalUrl,
    userId: req.user?._id,
  })

  const conversationId = validateObjectId(
    req.params.conversationId,
    'ID da conversa',
  )

  const senderId = validateObjectId(getUserId(req.user), 'ID do remetente')

  const {
    content = '',
    type = 'text',
    attachment = null,
    replyTo = null,
    mentions = [],
  } = req.body || {}

  const normalizedContent = String(content || '').trim()
  const normalizedType = String(type || 'text').toLowerCase()
  const normalizedAttachment = normalizeAttachment(attachment)
  const normalizedMentions = validateMentions(mentions)

  if (replyTo) {
    validateObjectId(replyTo, 'ID da mensagem respondida')
  }

  const conversation = await getConversationForSending(conversationId)

  if (!conversation) {
    throw new AppError('Conversa não encontrada.', 404)
  }

  // --------------------------------------------------------
  // VALIDAÇÃO DO TIPO E DO CONTEÚDO
  // --------------------------------------------------------

  if (!['text', 'image', 'file'].includes(normalizedType)) {
    throw new AppError(
      'Tipo de mensagem inválido. Utilize text, image ou file.',
      400,
    )
  }

  if (
    normalizedType === 'text' &&
    !normalizedContent &&
    !normalizedAttachment?.url
  ) {
    throw new AppError('Informe o conteúdo da mensagem.', 400)
  }

  if (normalizedType !== 'text' && !normalizedAttachment?.url) {
    throw new AppError('Informe a URL do anexo para enviar a mídia.', 400)
  }

  if (normalizedAttachment && !normalizedAttachment.url) {
    throw new AppError('A URL do anexo é obrigatória.', 400)
  }

  // --------------------------------------------------------
  // ENVIO PELO WHATSAPP
  // --------------------------------------------------------

  if (conversation.channel === 'whatsapp') {
    if (normalizedMentions.length > 0) {
      throw new AppError(
        'Menções do chat interno não estão disponíveis no WhatsApp.',
        400,
      )
    }

    if (replyTo) {
      throw new AppError(
        'Respostas a mensagens específicas do WhatsApp ainda não estão habilitadas.',
        400,
      )
    }

    const message = await chatService.sendWhatsAppMessage({
      conversationId,
      senderId,
      content: normalizedContent,
      type: normalizedType,
      attachment: normalizedAttachment,
      replyTo: null,
      mentions: [],
    })

    // Só emitimos a mensagem depois que o serviço conclui
    // o envio ao provedor e retorna a mensagem persistida.
    emitToConversation(conversationId, 'new_message', {
      conversationId,
      message,
    })

    const assignedTo =
      conversation.assignedTo?._id ||
      conversation.assignedTo ||
      conversation.lead?.assignedTo

    if (assignedTo && String(assignedTo) !== senderId) {
      emitToUser(assignedTo, 'new_message_notification', {
        conversationId,
        message,
        leadId: conversation.lead?._id
          ? String(conversation.lead._id)
          : conversation.lead
            ? String(conversation.lead)
            : null,
      })
    }

    return res.status(201).json({
      success: true,
      message: 'Mensagem enviada pelo WhatsApp com sucesso.',
      data: message,
    })
  }

  // --------------------------------------------------------
  // ENVIO PELO CHAT INTERNO
  // --------------------------------------------------------

  if (conversation.channel !== 'internal') {
    throw new AppError('Canal de conversa inválido.', 400)
  }

  const message = await chatService.sendMessage({
    conversationId,
    senderId,
    content: normalizedContent,
    type: normalizedType,
    attachment: normalizedAttachment,
    replyTo: replyTo || null,
    mentions: normalizedMentions,
    isAdmin: isAdminUser(req.user),
  })

  emitToConversation(conversationId, 'new_message', {
    conversationId,
    message,
  })

  const participantIds = (conversation.participants || []).map((participant) =>
    typeof participant === 'object' && participant?._id
      ? String(participant._id)
      : String(participant),
  )

  for (const participantId of participantIds) {
    if (participantId === senderId) continue

    emitToUser(participantId, 'new_message_notification', {
      conversationId,
      message,
    })
  }

  return res.status(201).json({
    success: true,
    message: 'Mensagem enviada com sucesso.',
    data: message,
  })
})

// ==========================================================
// PATCH /api/chat/conversations/:conversationId/read
// Marca a conversa como lida.
// ==========================================================

export const markAsRead = asyncHandler(async (req, res) => {
  const conversationId = validateObjectId(
    req.params.conversationId,
    'ID da conversa',
  )

  const userId = validateObjectId(getUserId(req.user), 'ID do usuário')

  const result = await chatService.markConversationAsRead({
    conversationId,
    userId,
  })

  emitToConversation(conversationId, 'conversation_read', {
    conversationId,
    userId,
  })

  return res.status(200).json({
    success: true,
    message: 'Conversa marcada como lida.',
    data: result,
  })
})

// ==========================================================
// PATCH /api/chat/messages/:messageId/read
// Marca uma mensagem como lida.
// ==========================================================

export const markMessageAsRead = asyncHandler(async (req, res) => {
  const messageId = validateObjectId(req.params.messageId, 'ID da mensagem')

  const userId = validateObjectId(getUserId(req.user), 'ID do usuário')

  const result = await chatService.markMessageAsRead({
    messageId,
    userId,
  })

  emitToConversation(result.conversationId, 'message_read', {
    conversationId: result.conversationId,
    messageId: result.messageId,
    userId,
  })

  return res.status(200).json({
    success: true,
    message: 'Mensagem marcada como lida.',
    data: result,
  })
})

// ==========================================================
// POST /api/chat/broker-channels
// ==========================================================

export const createBrokerChannel = asyncHandler(async (req, res) => {
  const createdBy = validateObjectId(getUserId(req.user), 'ID do criador')

  const { name = '', participants = [] } = req.body || {}

  if (!Array.isArray(participants)) {
    throw new AppError(
      'Os participantes precisam ser enviados em um array.',
      400,
    )
  }

  const participantIds = [
    ...new Set(
      participants.map((participant) => {
        const id =
          typeof participant === 'object' && participant?._id
            ? String(participant._id)
            : String(participant)

        return validateObjectId(id, 'ID do participante')
      }),
    ),
  ]

  const conversation = await chatService.createBrokerChannel({
    name,
    participants: participantIds,
    createdBy,
  })

  const conversationId = String(conversation._id)

  emitToConversation(conversationId, 'new_conversation', {
    conversation,
  })

  for (const participant of conversation.participants || []) {
    const participantId =
      typeof participant === 'object' && participant?._id
        ? String(participant._id)
        : String(participant)

    emitToUser(participantId, 'new_conversation', {
      conversation,
    })
  }

  return res.status(201).json({
    success: true,
    message: 'Canal de corretores criado com sucesso.',
    data: conversation,
  })
})

// ==========================================================
// GET /api/chat/users/search
// ==========================================================

export const searchUsers = asyncHandler(async (req, res) => {
  const userId = validateObjectId(getUserId(req.user), 'ID do usuário')

  const query = String(req.query.q || req.query.query || '').trim()

  if (query.length < 2) {
    return res.status(200).json({
      success: true,
      count: 0,
      data: [],
    })
  }

  const limit = Number(req.query.limit ?? 20)

  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new AppError('O limite precisa ser um número entre 1 e 50.', 400)
  }

  const users = await chatService.searchUsers({
    query,
    userId,
    limit,
  })

  return res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  })
})

// ==========================================================
// DELETE /api/chat/messages/:messageId
// ==========================================================

export const deleteMessage = asyncHandler(async (req, res) => {
  const messageId = validateObjectId(req.params.messageId, 'ID da mensagem')

  const userId = validateObjectId(getUserId(req.user), 'ID do usuário')

  const result = await chatService.deleteMessage({
    messageId,
    userId,
  })

  emitToConversation(result.conversationId, 'message_deleted', {
    conversationId: result.conversationId,
    messageId: result.messageId,
    deletedBy: userId,
  })

  return res.status(200).json({
    success: true,
    message: 'Mensagem excluída com sucesso.',
    data: result,
  })
})

// ==========================================================
// POST /api/chat/conversations/:conversationId/participants
// Adiciona corretor a um canal.
// ==========================================================

export const addBrokerToChannel = asyncHandler(async (req, res) => {
  const conversationId = validateObjectId(
    req.params.conversationId,
    'ID da conversa',
  )

  const brokerId = validateObjectId(req.body?.brokerId, 'ID do corretor')

  const requesterId = validateObjectId(getUserId(req.user), 'ID do solicitante')

  const conversation = await chatService.addBrokerToChannel({
    conversationId,
    brokerId,
    requesterId,
  })

  emitToConversation(conversationId, 'conversation_updated', {
    conversationId,
    conversation,
  })

  emitToUser(brokerId, 'new_conversation', {
    conversation,
  })

  return res.status(200).json({
    success: true,
    message: 'Corretor adicionado ao canal com sucesso.',
    data: conversation,
  })
})

// ==========================================================
// EXPORT DEFAULT
// ==========================================================

export default {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  markAsRead,
  markMessageAsRead,
  createBrokerChannel,
  searchUsers,
  deleteMessage,
  addBrokerToChannel,
}
