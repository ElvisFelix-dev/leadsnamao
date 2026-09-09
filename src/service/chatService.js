import mongoose from 'mongoose'
import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import User from '../models/User.js'
import AppError from '../utils/AppError.js'

/**
 * Cria uma nova conversa
 */
export const createConversation = async ({
  participants,
  type = 'direct',
  name = '',
  createdBy,
}) => {
  if (!Array.isArray(participants) || participants.length === 0) {
    throw new AppError('É necessário informar pelo menos um participante.', 400)
  }

  // Remover IDs duplicados
  const uniqueParticipants = [
    ...new Map(
      participants.map((participant) => [participant.toString(), participant]),
    ).values(),
  ]

  // Verificar se já existe conversa direta
  if (type === 'direct' && uniqueParticipants.length === 2) {
    const existing = await Conversation.findOne({
      type: 'direct',
      participants: {
        $all: uniqueParticipants,
        $size: 2,
      },
      isActive: true,
    })

    if (existing) {
      return existing
    }
  }

  const conversation = new Conversation({
    participants: uniqueParticipants,
    type,
    name,
    createdBy,
    unreadCounts: new Map(),
  })

  await conversation.save()
  return conversation
}

/**
 * Busca conversas de um usuário
 */
export const getUserConversations = async (userId) => {
  const conversations = await Conversation.find({
    participants: userId,
    isActive: true,
  })
    .populate('participants', 'name email avatar role')
    .populate('lastMessageFrom', 'name email avatar')
    .populate('createdBy', 'name email')
    .sort({ lastMessageAt: -1 })

  return conversations.map((conv) => {
    const convObj = conv.toObject()
    convObj.unreadCount = conv.unreadCounts?.get(userId.toString()) || 0
    return convObj
  })
}

/**
 * Busca mensagens de uma conversa
 */
export const getConversationMessages = async ({
  conversationId,
  userId,
  limit = 50,
  before = null,
}) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
    isActive: true,
  })

  if (!conversation) {
    throw new AppError('Conversa não encontrada.', 404)
  }

  const query = {
    conversation: conversationId,
    isDeleted: false,
  }

  if (before) {
    query.createdAt = { $lt: new Date(before) }
  }

  const messages = await Message.find(query)
    .populate('sender', 'name email avatar role')
    .populate({
      path: 'replyTo',
      select: 'content sender',
      populate: {
        path: 'sender',
        select: 'name email avatar role',
      },
    })
    .sort({ createdAt: -1 })
    .limit(limit)

  // Marcar mensagens como lidas
  await Message.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: userId },
      readBy: { $ne: userId },
    },
    {
      $addToSet: { readBy: userId },
      $set: {
        status: 'read',
        readAt: new Date(),
      },
    },
  )

  // Limpar contagem de não lidas
  const userKey = userId.toString()
  if (conversation.unreadCounts?.has(userKey)) {
    conversation.unreadCounts.set(userKey, 0)
    await conversation.save()
  }

  return messages.reverse()
}

/**
 * Envia uma mensagem
 */
export const sendMessage = async ({
  conversationId,
  senderId,
  content,
  type = 'text',
  attachment = null,
  replyTo = null,
  mentions = [],
}) => {
  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    // 1. Buscar conversa
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: senderId,
      isActive: true,
    }).session(session)

    if (!conversation) {
      throw new AppError('Conversa não encontrada.', 404)
    }

    // 2. Validar participantes
    if (
      !conversation.participants ||
      !Array.isArray(conversation.participants) ||
      conversation.participants.length === 0
    ) {
      throw new AppError('Conversa inválida: sem participantes.', 400)
    }

    // 3. Validar conteúdo
    if (!content || !content.trim()) {
      throw new AppError('Conteúdo da mensagem é obrigatório.', 400)
    }

    // 4. Criar mensagem
    const message = new Message({
      conversation: conversationId,
      sender: senderId,
      content: content.trim(),
      type,
      attachment,
      replyTo: replyTo || null,
      mentions: Array.isArray(mentions) ? mentions : [],
      status: 'sent',
    })

    await message.save({ session })

    // 5. Populate usando a mesma transaction
    await message.populate([
      {
        path: 'sender',
        select: 'name email avatar role',
      },
      {
        path: 'replyTo',
        select: 'content sender',
        populate: {
          path: 'sender',
          select: 'name email avatar role',
        },
      },
    ])

    // 6. Atualizar conversa
    conversation.lastMessage = message.content
    conversation.lastMessageAt = new Date()
    conversation.lastMessageFrom = senderId

    // 7. Atualizar não lidas
    const senderIdString = senderId.toString()
    const otherParticipants = conversation.participants.filter(
      (participantId) =>
        participantId && participantId.toString() !== senderIdString,
    )

    for (const participantId of otherParticipants) {
      if (!participantId) continue

      const participantKey = participantId.toString()
      const currentCount = conversation.unreadCounts?.get(participantKey) || 0
      conversation.unreadCounts.set(participantKey, currentCount + 1)
    }

    await conversation.save({ session })

    // 8. Garantir que sender existe
    if (!message.sender) {
      throw new AppError(
        'Não foi possível identificar o remetente da mensagem.',
        500,
      )
    }

    // 9. Commit
    await session.commitTransaction()

    // 10. Retornar mensagem populada
    return message
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    throw error
  } finally {
    await session.endSession()
  }
}

/**
 * Marca mensagem como lida
 */
export const markMessageAsRead = async ({ messageId, userId }) => {
  const message = await Message.findById(messageId).populate(
    'conversation',
    'participants',
  )

  if (!message) {
    throw new AppError('Mensagem não encontrada.', 404)
  }

  const alreadyRead = message.readBy.some(
    (id) => id.toString() === userId.toString(),
  )

  if (!alreadyRead) {
    message.readBy.push(userId)
    const participantsCount = message.conversation?.participants?.length || 0

    if (
      participantsCount > 0 &&
      message.readBy.length >= participantsCount - 1
    ) {
      message.status = 'read'
      message.readAt = new Date()
    }

    await message.save()
  }

  return message
}

/**
 * Marca todas as mensagens de uma conversa como lidas
 */
export const markConversationAsRead = async ({ conversationId, userId }) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
    isActive: true,
  })

  if (!conversation) {
    throw new AppError('Conversa não encontrada.', 404)
  }

  await Message.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: userId },
      readBy: { $ne: userId },
    },
    {
      $addToSet: { readBy: userId },
      $set: {
        status: 'read',
        readAt: new Date(),
      },
    },
  )

  const userKey = userId.toString()
  if (conversation.unreadCounts?.has(userKey)) {
    conversation.unreadCounts.set(userKey, 0)
    await conversation.save()
  }

  return { success: true }
}

/**
 * Cria um canal de corretores
 */
export const createBrokerChannel = async ({ name, createdBy }) => {
  // Buscar corretores
  const brokers = await User.find({
    role: 'broker',
    isActive: true,
  }).select('_id')

  // Buscar admins
  const admins = await User.find({
    isAdmin: true,
    isActive: true,
  }).select('_id')

  const participantMap = new Map()

  brokers.forEach((broker) => {
    participantMap.set(broker._id.toString(), broker._id)
  })

  admins.forEach((admin) => {
    participantMap.set(admin._id.toString(), admin._id)
  })

  const participantIds = [...participantMap.values()]

  if (participantIds.length === 0) {
    throw new AppError(
      'Nenhum corretor ou administrador disponível para o canal.',
      400,
    )
  }

  const conversation = new Conversation({
    participants: participantIds,
    type: 'broker_channel',
    name: name || 'Canal dos Corretores',
    isBrokerChannel: true,
    createdBy,
    unreadCounts: new Map(),
  })

  await conversation.save()
  return conversation
}

/**
 * Busca usuários para mencionar
 */
export const searchUsers = async ({ query, userId, limit = 10 }) => {
  if (!query || !query.trim()) {
    return []
  }

  const users = await User.find({
    _id: { $ne: userId },
    isActive: true,
    $or: [
      { name: { $regex: query.trim(), $options: 'i' } },
      { email: { $regex: query.trim(), $options: 'i' } },
    ],
  })
    .select('name email avatar role')
    .limit(limit)

  return users
}

/**
 * Deleta uma mensagem (soft delete)
 */
export const deleteMessage = async ({ messageId, userId }) => {
  const message = await Message.findById(messageId)

  if (!message) {
    throw new AppError('Mensagem não encontrada.', 404)
  }

  if (message.sender.toString() !== userId.toString()) {
    throw new AppError('Você não pode deletar esta mensagem.', 403)
  }

  message.isDeleted = true
  message.deletedAt = new Date()
  message.deletedBy = userId

  await message.save()

  return { success: true }
}

export default {
  createConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markMessageAsRead,
  markConversationAsRead,
  createBrokerChannel,
  searchUsers,
  deleteMessage,
}
