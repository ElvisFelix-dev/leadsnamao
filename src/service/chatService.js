// src/service/chatService.js

import mongoose from 'mongoose'

import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import User from '../models/User.js'
import WhatsAppContact from '../models/WhatsAppContact.js'
import AppError from '../utils/AppError.js'

// ==========================================================
// HELPERS
// ==========================================================

const isAdminUser = (user) => {
  return user?.isAdmin === true || user?.role === 'admin'
}

const sameId = (valueA, valueB) => {
  if (!valueA || !valueB) return false

  const idA =
    typeof valueA === 'object' && valueA._id
      ? String(valueA._id)
      : String(valueA)

  const idB =
    typeof valueB === 'object' && valueB._id
      ? String(valueB._id)
      : String(valueB)

  return idA === idB
}

const getUserId = (user) => {
  if (!user) return null

  return String(typeof user === 'object' && user._id ? user._id : user)
}

const isParticipant = (conversation, userId) => {
  if (!conversation || !userId) return false

  return (conversation.participants || []).some((participant) =>
    sameId(participant, userId),
  )
}

const canAccessConversation = (conversation, user) => {
  if (!conversation || !user) return false

  if (!conversation.isActive) return false

  if (isAdminUser(user)) return true

  if (conversation.channel === 'whatsapp') {
    return (
      sameId(conversation.assignedTo, user._id) ||
      sameId(conversation.lead?.assignedTo, user._id)
    )
  }

  return isParticipant(conversation, user._id)
}

const assertConversationAccess = (conversation, user) => {
  if (!conversation) {
    throw new AppError('Conversa não encontrada.', 404)
  }

  if (!canAccessConversation(conversation, user)) {
    throw new AppError(
      'Você não tem permissão para acessar esta conversa.',
      403,
    )
  }
}

const normalizeAttachment = (attachment) => {
  if (!attachment) return null

  if (typeof attachment !== 'object') {
    throw new AppError('O anexo informado é inválido.', 400)
  }

  return {
    url: String(attachment.url || '').trim(),
    name: String(attachment.name || '').trim(),
    size: Math.max(0, Number(attachment.size) || 0),
    mimeType: String(attachment.mimeType || '').trim(),
  }
}

const getMessagePreview = (message) => {
  const content = String(message?.content || '').trim()

  if (content) return content

  switch (message?.type) {
    case 'image':
      return 'Imagem'
    case 'file':
      return message?.attachment?.name || 'Arquivo'
    case 'system':
      return 'Mensagem do sistema'
    default:
      return ''
  }
}

const populateMessage = (query) => {
  return query
    .populate('sender', 'name email avatar profileImage role')
    .populate('whatsappContact', 'name phone phoneNormalized')
    .populate({
      path: 'replyTo',
      select: 'content type attachment sender createdAt',
      populate: {
        path: 'sender',
        select: 'name avatar profileImage',
      },
    })
    .populate('mentions', 'name email avatar profileImage')
}

const populateConversation = (query) => {
  return query
    .populate('participants', 'name email avatar profileImage role')
    .populate('lastMessageFrom', 'name avatar profileImage')
    .populate('createdBy', 'name email avatar profileImage')
    .populate('assignedTo', 'name email avatar profileImage role')
    .populate('lead', 'name phone phoneNormalized assignedTo')
    .populate(
      'whatsappContact',
      'name phone phoneNormalized remoteJid isActive',
    )
    .populate('whatsappIntegration', 'name provider status enabled sessionId')
}

const incrementUnreadCount = (conversation, userId) => {
  if (!userId) return

  const currentValue =
    Number(conversation.unreadCounts?.get?.(String(userId))) || 0

  conversation.unreadCounts.set(String(userId), currentValue + 1)
}

const resetUnreadCount = (conversation, userId) => {
  if (!userId) return

  conversation.unreadCounts.set(String(userId), 0)
}

const getConversationById = async (conversationId) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError('ID da conversa inválido.', 400)
  }

  return Conversation.findOne({
    _id: conversationId,
    isActive: true,
  })
    .populate('lead', 'name phone phoneNormalized assignedTo')
    .populate('whatsappContact')
    .populate('whatsappIntegration')
}

// ==========================================================
// CRIAR CONVERSA INTERNA
// ==========================================================

export const createConversation = async ({
  participants = [],
  createdBy,
  type = 'direct',
  name = '',
  avatar = '',
  isAdmin = false,
}) => {
  if (!createdBy) {
    throw new AppError('O usuário criador é obrigatório.', 400)
  }

  if (!['direct', 'group', 'broker_channel'].includes(type)) {
    throw new AppError('Tipo de conversa inválido.', 400)
  }

  const uniqueParticipants = [
    ...new Set(
      [...participants, createdBy]
        .filter(Boolean)
        .map((participant) => getUserId(participant)),
    ),
  ]

  if (uniqueParticipants.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    throw new AppError('Um ou mais participantes são inválidos.', 400)
  }

  if (type === 'direct' && uniqueParticipants.length !== 2) {
    throw new AppError(
      'Uma conversa direta precisa ter exatamente dois participantes.',
      400,
    )
  }

  if (type === 'group' && uniqueParticipants.length < 2) {
    throw new AppError(
      'Um grupo precisa ter pelo menos dois participantes.',
      400,
    )
  }

  const users = await User.find({
    _id: { $in: uniqueParticipants },
  }).select('_id')

  if (users.length !== uniqueParticipants.length) {
    throw new AppError('Um ou mais participantes não foram encontrados.', 404)
  }

  if (type === 'direct') {
    const existingConversations = await Conversation.find({
      channel: 'internal',
      type: 'direct',
      isActive: true,
      participants: { $all: uniqueParticipants },
    })

    const existingDirect = existingConversations.find(
      (conversation) =>
        conversation.participants.length === 2 &&
        uniqueParticipants.every((id) => isParticipant(conversation, id)),
    )

    if (existingDirect) {
      return populateConversation(Conversation.findById(existingDirect._id))
    }
  }

  const conversation = await Conversation.create({
    participants: uniqueParticipants,
    channel: 'internal',
    type,
    name: String(name || '').trim(),
    avatar: String(avatar || '').trim(),
    lastMessage: '',
    lastMessageAt: null,
    lastMessageFrom: null,
    unreadCounts: new Map(),
    isActive: true,
    isBrokerChannel: type === 'broker_channel',
    createdBy,
  })

  return populateConversation(Conversation.findById(conversation._id))
}

// ==========================================================
// LISTAR CONVERSAS DO USUÁRIO
// ==========================================================

export const getUserConversations = async (userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
    throw new AppError('ID do usuário inválido.', 400)
  }

  const user = await User.findById(userId).select('_id role isAdmin')

  if (!user) {
    throw new AppError('Usuário não encontrado.', 404)
  }

  const query = {
    isActive: true,
  }

  if (isAdminUser(user)) {
    query.channel = { $in: ['internal', 'whatsapp'] }
  } else {
    query.$or = [
      {
        channel: 'internal',
        participants: user._id,
      },
      {
        channel: 'whatsapp',
        $or: [{ assignedTo: user._id }, { lead: { $exists: true } }],
      },
    ]
  }

  let conversations = await populateConversation(Conversation.find(query))
    .sort({
      lastMessageAt: -1,
      updatedAt: -1,
    })
    .lean()

  // Para usuários comuns, só retornamos conversas WhatsApp
  // atribuídas a eles ou a leads sob sua responsabilidade.
  if (!isAdminUser(user)) {
    conversations = conversations.filter((conversation) => {
      if (conversation.channel !== 'whatsapp') return true

      return (
        sameId(conversation.assignedTo, user._id) ||
        sameId(conversation.lead?.assignedTo, user._id)
      )
    })
  }

  return conversations.map((conversation) => ({
    ...conversation,
    unreadCount:
      Number(
        conversation.unreadCounts?.[String(user._id)] ??
          conversation.unreadCounts?.get?.(String(user._id)),
      ) || 0,
  }))
}

// ==========================================================
// LISTAR MENSAGENS DE UMA CONVERSA
// ==========================================================

export const getConversationMessages = async ({
  conversationId,
  userId,
  limit = 50,
  before = null,
}) => {
  if (!mongoose.Types.ObjectId.isValid(String(conversationId))) {
    throw new AppError('ID da conversa inválido.', 400)
  }

  const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 50))

  const user = await User.findById(userId).select('_id role isAdmin')

  if (!user) {
    throw new AppError('Usuário não encontrado.', 404)
  }

  const conversation = await getConversationById(conversationId)

  assertConversationAccess(conversation, user)

  const messageQuery = {
    conversation: conversation._id,
    isDeleted: { $ne: true },
  }

  if (before) {
    const beforeDate = new Date(before)

    if (Number.isNaN(beforeDate.getTime())) {
      throw new AppError('Data de paginação inválida.', 400)
    }

    messageQuery.createdAt = { $lt: beforeDate }
  }

  const messages = await populateMessage(Message.find(messageQuery))
    .sort({ createdAt: -1, _id: -1 })
    .limit(normalizedLimit)
    .lean()

  // Marca como lidas apenas mensagens enviadas por outras pessoas.
  const unreadMessageIds = messages
    .filter(
      (message) =>
        !sameId(message.sender, user._id) &&
        !(message.readBy || []).some((reader) => sameId(reader, user._id)),
    )
    .map((message) => message._id)

  if (unreadMessageIds.length > 0) {
    await Message.updateMany(
      {
        _id: { $in: unreadMessageIds },
      },
      {
        $addToSet: { readBy: user._id },
        $set: { readAt: new Date() },
      },
    )
  }

  resetUnreadCount(conversation, user._id)
  await conversation.save()

  return messages.reverse()
}

// ==========================================================
// ENVIAR MENSAGEM INTERNA
// ==========================================================

export const sendMessage = async ({
  conversationId,
  senderId,
  content = '',
  type = 'text',
  attachment = null,
  replyTo = null,
  mentions = [],
  isAdmin = false,
}) => {
  if (!mongoose.Types.ObjectId.isValid(String(conversationId))) {
    throw new AppError('ID da conversa inválido.', 400)
  }

  const sender = await User.findById(senderId).select('_id name role isAdmin')

  if (!sender) {
    throw new AppError('Remetente não encontrado.', 404)
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    isActive: true,
    channel: 'internal',
  })

  if (!conversation) {
    throw new AppError('Conversa interna não encontrada.', 404)
  }

  if (
    !isAdmin &&
    !isAdminUser(sender) &&
    !isParticipant(conversation, sender._id)
  ) {
    throw new AppError('Você não participa desta conversa.', 403)
  }

  const normalizedType = String(type || 'text').toLowerCase()

  if (!['text', 'image', 'file', 'system'].includes(normalizedType)) {
    throw new AppError('Tipo de mensagem inválido.', 400)
  }

  const normalizedContent = String(content || '').trim()
  const normalizedAttachment = normalizeAttachment(attachment)

  if (!normalizedContent && !normalizedAttachment?.url) {
    throw new AppError('Informe um texto ou um anexo para enviar.', 400)
  }

  if (normalizedAttachment && !normalizedAttachment.url) {
    throw new AppError('A URL do anexo é obrigatória.', 400)
  }

  if (replyTo) {
    if (!mongoose.Types.ObjectId.isValid(String(replyTo))) {
      throw new AppError('Mensagem respondida inválida.', 400)
    }

    const originalMessage = await Message.findOne({
      _id: replyTo,
      conversation: conversation._id,
      isDeleted: { $ne: true },
    }).select('_id')

    if (!originalMessage) {
      throw new AppError(
        'A mensagem respondida não foi encontrada nesta conversa.',
        404,
      )
    }
  }

  const validMentions = []

  if (!Array.isArray(mentions)) {
    throw new AppError('A lista de menções é inválida.', 400)
  }

  for (const mention of mentions) {
    const id = getUserId(mention)

    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      throw new AppError('Uma menção contém um ID inválido.', 400)
    }

    if (!validMentions.some((item) => sameId(item, id))) {
      validMentions.push(id)
    }
  }

  if (validMentions.length > 0) {
    const mentionUsers = await User.find({
      _id: { $in: validMentions },
    }).select('_id')

    if (mentionUsers.length !== validMentions.length) {
      throw new AppError(
        'Um ou mais usuários mencionados não foram encontrados.',
        404,
      )
    }
  }

  const session = await mongoose.startSession()
  let createdMessage

  try {
    await session.withTransaction(async () => {
      const [message] = await Message.create(
        [
          {
            conversation: conversation._id,
            sender: sender._id,
            senderType: 'user',
            direction: 'outbound',
            content:
              normalizedContent ||
              normalizedAttachment?.name ||
              (normalizedType === 'image' ? 'Imagem' : 'Arquivo'),
            type: normalizedType,
            attachment: normalizedAttachment || undefined,
            replyTo: replyTo || null,
            mentions: validMentions,
            status: 'sent',
            readBy: [sender._id],
          },
        ],
        { session },
      )

      createdMessage = message

      conversation.lastMessage = getMessagePreview(message)
      conversation.lastMessageAt = message.createdAt || new Date()
      conversation.lastMessageFrom = sender._id

      for (const participant of conversation.participants) {
        if (!sameId(participant, sender._id)) {
          incrementUnreadCount(conversation, participant)
        }
      }

      await conversation.save({ session })
    })
  } finally {
    await session.endSession()
  }

  return populateMessage(Message.findById(createdMessage._id))
}

// ==========================================================
// ENVIAR MENSAGEM PELO WHATSAPP
// ==========================================================

export const sendWhatsAppMessage = async ({
  conversationId,
  senderId,
  content = '',
  type = 'text',
  attachment = null,
  replyTo = null,
  mentions = [],
}) => {
  if (!mongoose.Types.ObjectId.isValid(String(conversationId))) {
    throw new AppError('ID da conversa inválido.', 400)
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    channel: 'whatsapp',
    isActive: true,
  })
    .populate('whatsappContact')
    .populate('whatsappIntegration')
    .populate('lead')

  if (!conversation) {
    throw new AppError('Conversa WhatsApp não encontrada.', 404)
  }

  const sender = await User.findById(senderId).select('_id name role isAdmin')

  if (!sender) {
    throw new AppError('Usuário remetente não encontrado.', 404)
  }

  const isAssignedUser =
    sameId(conversation.assignedTo, sender._id) ||
    sameId(conversation.lead?.assignedTo, sender._id)

  if (!isAdminUser(sender) && !isAssignedUser) {
    throw new AppError(
      'Você não tem permissão para enviar mensagens nesta conversa WhatsApp.',
      403,
    )
  }

  const contact = conversation.whatsappContact

  if (!contact || contact.isActive === false) {
    throw new AppError(
      'O contato WhatsApp não está disponível ou está inativo.',
      400,
    )
  }

  const integration = conversation.whatsappIntegration

  if (!integration) {
    throw new AppError(
      'A conversa não possui uma integração WhatsApp associada.',
      400,
    )
  }

  const phone =
    contact.phoneNormalized || contact.phone || contact.remoteJid?.split('@')[0]

  if (!phone) {
    throw new AppError('Não foi possível obter o telefone do contato.', 400)
  }

  const normalizedType = String(type || 'text').toLowerCase()
  const normalizedContent = String(content || '').trim()
  const normalizedAttachment = normalizeAttachment(attachment)

  if (!['text', 'image', 'file'].includes(normalizedType)) {
    throw new AppError('Tipo de mensagem WhatsApp inválido.', 400)
  }

  if (normalizedType === 'text' && !normalizedContent) {
    throw new AppError('O texto da mensagem é obrigatório.', 400)
  }

  if (normalizedType !== 'text' && !normalizedAttachment?.url) {
    throw new AppError('Informe uma URL para a mídia que deseja enviar.', 400)
  }

  if (replyTo) {
    throw new AppError(
      'Respostas a mensagens específicas do WhatsApp ainda não estão habilitadas neste serviço.',
      400,
    )
  }

  if (Array.isArray(mentions) && mentions.length > 0) {
    throw new AppError(
      'Menções do chat interno não são suportadas em mensagens WhatsApp.',
      400,
    )
  }

  // Importação dinâmica para evitar dependência circular.
  const { sendTextMessage, sendMediaMessage } = await import(
    './whatsapp/whatsappAkgService.js'
  )

  let providerResult

  if (normalizedType === 'text') {
    providerResult = await sendTextMessage({
      integrationId: integration._id,
      phone,
      message: normalizedContent,
    })
  } else {
    providerResult = await sendMediaMessage({
      integrationId: integration._id,
      phone,
      mediaUrl: normalizedAttachment.url,
      mediaType: normalizedType,
      caption: normalizedContent,
      fileName: normalizedAttachment.name,
      mimeType: normalizedAttachment.mimeType,
    })
  }

  // Só persiste depois que a API do provedor confirmar
  // que a requisição foi aceita.
  const providerData =
    providerResult?.providerResponse?.data ||
    providerResult?.providerResponse ||
    {}

  const externalMessageId =
    providerData?.key?.id ||
    providerData?.message?.key?.id ||
    providerData?.messageId ||
    providerData?.id ||
    null

  const message = await Message.create({
    conversation: conversation._id,
    sender: sender._id,
    senderType: 'user',
    whatsappContact: contact._id,
    ...(externalMessageId
      ? { externalMessageId: String(externalMessageId) }
      : {}),
    direction: 'outbound',
    content:
      normalizedContent ||
      normalizedAttachment?.name ||
      (normalizedType === 'image' ? 'Imagem' : 'Arquivo'),
    type: normalizedType,
    attachment: normalizedType === 'text' ? undefined : normalizedAttachment,
    status: 'sent',
    readBy: [sender._id],
  })

  conversation.lastMessage = getMessagePreview(message)
  conversation.lastMessageAt = message.createdAt || new Date()
  conversation.lastMessageFrom = sender._id

  await conversation.save()

  await WhatsAppContact.findByIdAndUpdate(contact._id, {
    lastMessageAt: new Date(),
  })

  return populateMessage(Message.findById(message._id))
}

// ==========================================================
// MARCAR MENSAGEM COMO LIDA
// ==========================================================

export const markMessageAsRead = async ({ messageId, userId }) => {
  if (!mongoose.Types.ObjectId.isValid(String(messageId))) {
    throw new AppError('ID da mensagem inválido.', 400)
  }

  const user = await User.findById(userId).select('_id role isAdmin')

  if (!user) {
    throw new AppError('Usuário não encontrado.', 404)
  }

  const message = await Message.findById(messageId)

  if (!message || message.isDeleted) {
    throw new AppError('Mensagem não encontrada.', 404)
  }

  const conversation = await Conversation.findOne({
    _id: message.conversation,
    isActive: true,
  }).populate('lead', 'assignedTo')

  assertConversationAccess(conversation, user)

  await Message.updateOne(
    { _id: message._id },
    {
      $addToSet: { readBy: user._id },
      $set: { readAt: new Date() },
    },
  )

  if (conversation.channel === 'internal') {
    const participants = conversation.participants || []

    if (
      participants.length > 0 &&
      participants.every(
        (participant) =>
          sameId(participant, user._id) ||
          (message.readBy || []).some((reader) => sameId(reader, participant)),
      )
    ) {
      await Message.updateOne(
        { _id: message._id },
        { $set: { status: 'read' } },
      )
    }
  }

  resetUnreadCount(conversation, user._id)
  await conversation.save()

  return {
    success: true,
    messageId: String(message._id),
    conversationId: String(conversation._id),
  }
}

// ==========================================================
// MARCAR TODA A CONVERSA COMO LIDA
// ==========================================================

export const markConversationAsRead = async ({ conversationId, userId }) => {
  if (!mongoose.Types.ObjectId.isValid(String(conversationId))) {
    throw new AppError('ID da conversa inválido.', 400)
  }

  const user = await User.findById(userId).select('_id role isAdmin')

  if (!user) {
    throw new AppError('Usuário não encontrado.', 404)
  }

  const conversation = await getConversationById(conversationId)

  assertConversationAccess(conversation, user)

  const unreadFilter = {
    conversation: conversation._id,
    isDeleted: { $ne: true },
    sender: { $ne: user._id },
    readBy: { $nin: [user._id] },
  }

  await Message.updateMany(unreadFilter, {
    $addToSet: { readBy: user._id },
    $set: { readAt: new Date() },
  })

  if (conversation.channel === 'internal') {
    const participants = conversation.participants || []

    if (participants.length > 0) {
      const messages = await Message.find({
        conversation: conversation._id,
        isDeleted: { $ne: true },
      }).select('_id sender readBy')

      const fullyReadIds = messages
        .filter((message) =>
          participants.every(
            (participant) =>
              sameId(message.sender, participant) ||
              sameId(participant, user._id) ||
              (message.readBy || []).some((reader) =>
                sameId(reader, participant),
              ),
          ),
        )
        .map((message) => message._id)

      if (fullyReadIds.length > 0) {
        await Message.updateMany(
          { _id: { $in: fullyReadIds } },
          { $set: { status: 'read' } },
        )
      }
    }
  }

  resetUnreadCount(conversation, user._id)
  await conversation.save()

  return {
    success: true,
    conversationId: String(conversation._id),
  }
}

// ==========================================================
// CRIAR CANAL DE CORRETORES
// ==========================================================

export const createBrokerChannel = async ({
  name,
  participants = [],
  createdBy,
}) => {
  if (!createdBy) {
    throw new AppError('O criador do canal é obrigatório.', 400)
  }

  const creator = await User.findById(createdBy).select(
    '_id role isAdmin isActive',
  )

  if (!creator) {
    throw new AppError('Usuário criador não encontrado.', 404)
  }

  if (creator.role !== 'broker' && !isAdminUser(creator)) {
    throw new AppError(
      'Somente corretores e administradores podem criar canais.',
      403,
    )
  }

  // Busca os participantes informados, além do criador.
  const requestedIds = [
    ...new Set(
      [...participants, createdBy]
        .filter(Boolean)
        .map((participant) => getUserId(participant)),
    ),
  ]

  if (requestedIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    throw new AppError('Um ou mais participantes são inválidos.', 400)
  }

  // Por padrão, canais de corretores incluem todos os corretores
  // e administradores ativos, não apenas quem criou o canal.
  const eligibleUsers = await User.find({
    isActive: { $ne: false },
    $or: [{ role: 'broker' }, { role: 'admin' }, { isAdmin: true }],
  }).select('_id role isAdmin isActive')

  const eligibleIds = new Set(eligibleUsers.map((user) => String(user._id)))

  // Mantém o criador e os participantes elegíveis explicitamente
  // selecionados, sem duplicações.
  const uniqueParticipants = [
    ...new Set([
      ...eligibleUsers.map((user) => String(user._id)),
      ...requestedIds.filter((id) => eligibleIds.has(id)),
    ]),
  ]

  if (!uniqueParticipants.includes(String(creator._id))) {
    uniqueParticipants.push(String(creator._id))
  }

  const users = await User.find({
    _id: { $in: uniqueParticipants },
  }).select('_id role isAdmin')

  const invalidParticipants = users.filter(
    (user) => user.role !== 'broker' && !isAdminUser(user),
  )

  if (invalidParticipants.length > 0) {
    throw new AppError(
      'Os canais de corretores aceitam somente corretores e administradores.',
      400,
    )
  }

  if (uniqueParticipants.length < 2) {
    throw new AppError(
      'Não existem participantes suficientes para criar o canal. Cadastre ou ative pelo menos mais um corretor.',
      400,
    )
  }

  const unreadCounts = new Map(uniqueParticipants.map((id) => [id, 0]))

  const conversation = await Conversation.create({
    participants: uniqueParticipants,
    channel: 'internal',
    type: 'broker_channel',
    name: String(name || '').trim(),
    lastMessage: '',
    lastMessageAt: null,
    lastMessageFrom: null,
    unreadCounts,
    isActive: true,
    isBrokerChannel: true,
    createdBy: creator._id,
  })

  return populateConversation(Conversation.findById(conversation._id))
}

// ==========================================================
// BUSCAR USUÁRIOS
// ==========================================================

export const searchUsers = async ({ query = '', userId, limit = 20 }) => {
  const searchTerm = String(query || '').trim()

  if (searchTerm.length < 2) {
    return []
  }

  const normalizedLimit = Math.min(50, Math.max(1, Number(limit) || 20))

  const filter = {
    _id: { $ne: userId },
    isActive: { $ne: false },
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
    ],
  }

  return User.find(filter)
    .select('_id name email avatar profileImage role')
    .limit(normalizedLimit)
    .sort({ name: 1 })
    .lean()
}

// ==========================================================
// EXCLUIR MENSAGEM
// ==========================================================

export const deleteMessage = async ({ messageId, userId }) => {
  if (!mongoose.Types.ObjectId.isValid(String(messageId))) {
    throw new AppError('ID da mensagem inválido.', 400)
  }

  const message = await Message.findById(messageId)

  if (!message || message.isDeleted) {
    throw new AppError('Mensagem não encontrada.', 404)
  }

  const conversation = await Conversation.findOne({
    _id: message.conversation,
    isActive: true,
  })

  if (!conversation) {
    throw new AppError('Conversa não encontrada.', 404)
  }

  // Mantém a regra de que o usuário só pode excluir
  // as próprias mensagens internas.
  if (conversation.channel !== 'internal') {
    throw new AppError(
      'A exclusão de mensagens WhatsApp não está disponível.',
      400,
    )
  }

  if (!sameId(message.sender, userId)) {
    throw new AppError('Você só pode excluir suas próprias mensagens.', 403)
  }

  message.isDeleted = true
  message.deletedAt = new Date()
  message.deletedBy = userId
  await message.save()

  const lastMessage = await Message.findOne({
    conversation: conversation._id,
    isDeleted: { $ne: true },
  })
    .sort({ createdAt: -1, _id: -1 })
    .select('content type attachment sender createdAt')

  if (lastMessage) {
    conversation.lastMessage = getMessagePreview(lastMessage)
    conversation.lastMessageAt = lastMessage.createdAt
    conversation.lastMessageFrom = lastMessage.sender || null
  } else {
    conversation.lastMessage = ''
    conversation.lastMessageAt = null
    conversation.lastMessageFrom = null
  }

  await conversation.save()

  return {
    success: true,
    messageId: String(message._id),
    conversationId: String(conversation._id),
  }
}

// ==========================================================
// ADICIONAR CORRETOR A UM CANAL
// ==========================================================

export const addBrokerToChannel = async ({
  conversationId,
  brokerId,
  requesterId,
}) => {
  if (
    !mongoose.Types.ObjectId.isValid(String(conversationId)) ||
    !mongoose.Types.ObjectId.isValid(String(brokerId))
  ) {
    throw new AppError('ID da conversa ou do corretor inválido.', 400)
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    channel: 'internal',
    type: 'broker_channel',
    isBrokerChannel: true,
    isActive: true,
  })

  if (!conversation) {
    throw new AppError('Canal de corretores não encontrado.', 404)
  }

  const requester = await User.findById(requesterId).select('_id role isAdmin')

  if (!requester) {
    throw new AppError('Usuário solicitante não encontrado.', 404)
  }

  if (!isAdminUser(requester) && !isParticipant(conversation, requester._id)) {
    throw new AppError('Você não tem permissão para alterar este canal.', 403)
  }

  const broker = await User.findById(brokerId).select(
    '_id name email role isAdmin',
  )

  if (!broker) {
    throw new AppError('Corretor não encontrado.', 404)
  }

  if (broker.role !== 'broker' && !isAdminUser(broker)) {
    throw new AppError(
      'Somente corretores ou administradores podem ser adicionados a este canal.',
      400,
    )
  }

  if (isParticipant(conversation, broker._id)) {
    return populateConversation(Conversation.findById(conversation._id))
  }

  conversation.participants.push(broker._id)
  conversation.unreadCounts.set(String(broker._id), 0)

  await conversation.save()

  return populateConversation(Conversation.findById(conversation._id))
}

// ==========================================================
// RECEBER MENSAGEM DO WHATSAPP
// ==========================================================

export const receiveWhatsAppMessage = async ({
  conversationId,
  whatsappContactId,
  externalMessageId = null,
  content = '',
  type = 'text',
  attachment = null,
}) => {
  if (
    !mongoose.Types.ObjectId.isValid(String(conversationId)) ||
    !mongoose.Types.ObjectId.isValid(String(whatsappContactId))
  ) {
    throw new AppError('Conversa ou contato WhatsApp inválido.', 400)
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    channel: 'whatsapp',
    isActive: true,
  })

  if (!conversation) {
    throw new AppError('Conversa WhatsApp não encontrada.', 404)
  }

  const contact = await WhatsAppContact.findById(whatsappContactId)

  if (!contact) {
    throw new AppError('Contato WhatsApp não encontrado.', 404)
  }

  // O identificador externo é único no modelo Message.
  // Só consultamos/inserimos o campo quando existe um ID real.
  if (externalMessageId) {
    const existingMessage = await Message.findOne({
      externalMessageId: String(externalMessageId),
    })

    if (existingMessage) {
      return {
        duplicate: true,
        _id: existingMessage._id,
      }
    }
  }

  const normalizedType = String(type || 'text').toLowerCase()

  if (!['text', 'image', 'file', 'system'].includes(normalizedType)) {
    throw new AppError('Tipo de mensagem recebida inválido.', 400)
  }

  const normalizedAttachment = normalizeAttachment(attachment)
  const normalizedContent = String(content || '').trim()

  let message

  try {
    message = await Message.create({
      conversation: conversation._id,
      sender: null,
      senderType: 'whatsapp_contact',
      whatsappContact: contact._id,
      ...(externalMessageId
        ? { externalMessageId: String(externalMessageId) }
        : {}),
      direction: 'inbound',
      content:
        normalizedContent ||
        (normalizedType === 'image' ? 'Imagem recebida' : 'Arquivo recebido'),
      type: normalizedType,
      attachment: normalizedAttachment || undefined,
      status: 'delivered',
      readBy: [],
    })
  } catch (error) {
    // Protege contra dois webhooks concorrentes para o mesmo ID.
    if (externalMessageId && error?.code === 11000) {
      const existingMessage = await Message.findOne({
        externalMessageId: String(externalMessageId),
      })

      if (existingMessage) {
        return {
          duplicate: true,
          _id: existingMessage._id,
        }
      }
    }

    throw error
  }

  conversation.lastMessage = getMessagePreview(message)
  conversation.lastMessageAt = message.createdAt || new Date()
  conversation.lastMessageFrom = null

  if (conversation.assignedTo) {
    incrementUnreadCount(conversation, conversation.assignedTo)
  }

  await conversation.save()

  return populateMessage(Message.findById(message._id))
}

// ==========================================================
// EXPORT DEFAULT
// ==========================================================

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
