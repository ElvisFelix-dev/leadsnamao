import mongoose from 'mongoose'
import Conversation from '../models/Conversation.js'

const normalizeId = (value) => {
  if (!value) return null

  if (typeof value === 'string') {
    return value
  }

  if (value?._id) {
    return value._id.toString()
  }

  return value.toString()
}

const isAdminUser = (user) => {
  return user?.isAdmin === true || user?.role === 'admin'
}

export function setupChatSocket(io) {
  console.log('')
  console.log('==========================================')
  console.log('🔌 CHAT SOCKET.IO INICIADO')
  console.log('==========================================')

  io.on('connection', async (socket) => {
    console.log('')
    console.log('==========================================')
    console.log('🟢 NOVO CLIENTE SOCKET.IO')
    console.log('==========================================')
    console.log('Socket ID:', socket.id)
    console.log('Transport:', socket.conn?.transport?.name)
    console.log('Origin:', socket.handshake?.headers?.origin || null)

    console.log('')
    console.log('==========================================')
    console.log('🧪 SOCKET INSTANCE DIAGNOSTIC')
    console.log('==========================================')
    console.log('PID:', process.pid)
    console.log('HOSTNAME:', process.env.HOSTNAME || 'unknown')
    console.log('NODE_ENV:', process.env.NODE_ENV)
    console.log('Socket ID:', socket.id)
    console.log(
      'User ID:',
      socket.data?.userId || socket.handshake?.auth?.userId,
    )
    console.log('==========================================')

    const rawUserId = socket.handshake?.auth?.userId

    console.log('🔍 RAW userId:', rawUserId)
    console.log('🔍 typeof userId:', typeof rawUserId)

    const userId = normalizeId(rawUserId)

    console.log('🔍 userId normalizado:', userId)

    if (!userId) {
      console.warn('⚠️ Socket conectado sem userId.')
      return
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.warn('⚠️ userId inválido:', userId)
      return
    }

    socket.data.userId = userId

    // =====================================================
    // USER ROOM
    // =====================================================

    const userRoom = `user_${userId}`

    socket.join(userRoom)

    console.log('')
    console.log('👤 USER ROOM')
    console.log('==========================================')
    console.log('User:', userId)
    console.log('Room:', userRoom)
    console.log('Socket:', socket.id)

    // =====================================================
    // BUSCAR CONVERSAS DO USUÁRIO
    // =====================================================

    const joinUserConversations = async () => {
      try {
        console.log('')
        console.log('🔎 BUSCANDO CONVERSAS DO USUÁRIO')
        console.log('User:', userId)

        const conversations = await Conversation.find({
          isActive: true,
          $or: [
            {
              participants: userId,
            },
            {
              assignedTo: userId,
            },
          ],
        })
          .select('_id channel assignedTo participants')
          .lean()

        console.log('📩 Conversas encontradas:', conversations.length)

        for (const conversation of conversations) {
          const conversationId = conversation._id.toString()

          const canJoin =
            conversation.channel === 'whatsapp'
              ? normalizeId(conversation.assignedTo) === userId
              : conversation.participants?.some(
                  (participant) => normalizeId(participant) === userId,
                )

          console.log('')
          console.log('💬 CONVERSA')
          console.log('------------------------------------------')
          console.log('Conversation:', conversationId)
          console.log('Channel:', conversation.channel)
          console.log('AssignedTo:', normalizeId(conversation.assignedTo))
          console.log(
            'Participants:',
            conversation.participants?.map(normalizeId),
          )
          console.log('Pode entrar:', canJoin)

          if (!canJoin) {
            console.log('⛔ Socket não entrou na conversa')
            continue
          }

          socket.join(conversationId)

          console.log('✅ SOCKET ENTROU NA CONVERSA:', conversationId)

          console.log('📦 ROOMS ATUAIS DO SOCKET:', [...socket.rooms])
        }

        console.log('')
        console.log('==========================================')
        console.log('🏁 JOIN AUTOMÁTICO FINALIZADO')
        console.log('Socket:', socket.id)
        console.log('User:', userId)
        console.log('Rooms:', [...socket.rooms])
        console.log('==========================================')
      } catch (error) {
        console.error('❌ Erro ao entrar nas conversas:', error)
      }
    }

    await joinUserConversations()

    // =====================================================
    // JOIN CONVERSATIONS
    // =====================================================

    socket.on('join_conversations', async () => {
      console.log('')
      console.log('📡 EVENTO join_conversations')
      console.log('Socket:', socket.id)
      console.log('User:', userId)

      await joinUserConversations()
    })

    // =====================================================
    // JOIN CONVERSATION
    // =====================================================

    socket.on('join_conversation', async (conversationId, callback) => {
      try {
        console.log('')
        console.log('==========================================')
        console.log('📡 EVENTO join_conversation')
        console.log('==========================================')
        console.log('Socket:', socket.id)
        console.log('User:', userId)
        console.log('Conversation:', conversationId)

        if (
          !conversationId ||
          !mongoose.Types.ObjectId.isValid(conversationId)
        ) {
          console.warn('⚠️ Conversation ID inválido:', conversationId)

          if (typeof callback === 'function') {
            callback({
              success: false,
              message: 'Conversation ID inválido.',
            })
          }

          return
        }

        const conversation = await Conversation.findOne({
          _id: conversationId,
          isActive: true,
        })
          .select('_id channel assignedTo participants')
          .lean()

        if (!conversation) {
          console.warn('⚠️ Conversa não encontrada:', conversationId)

          if (typeof callback === 'function') {
            callback({
              success: false,
              message: 'Conversa não encontrada.',
            })
          }

          return
        }

        const assignedTo = normalizeId(conversation.assignedTo)

        const isAssigned = assignedTo === userId

        const isParticipant = conversation.participants?.some(
          (participant) => normalizeId(participant) === userId,
        )

        const canJoin =
          isAdminUser(socket.data.user) || isAssigned || isParticipant

        console.log('Channel:', conversation.channel)
        console.log('AssignedTo:', assignedTo)
        console.log('Is assigned:', isAssigned)
        console.log('Is participant:', isParticipant)
        console.log('Can join:', canJoin)

        if (!canJoin) {
          console.warn('⛔ Usuário não autorizado para room:', conversationId)

          if (typeof callback === 'function') {
            callback({
              success: false,
              message: 'Sem permissão para esta conversa.',
            })
          }

          return
        }

        socket.join(conversationId)

        console.log('✅ SOCKET ENTROU NA ROOM:', conversationId)

        console.log('📦 ROOMS DO SOCKET:', [...socket.rooms])

        if (typeof callback === 'function') {
          callback({
            success: true,
            conversationId,
            rooms: [...socket.rooms],
          })
        }
      } catch (error) {
        console.error('❌ Erro no join_conversation:', error)

        if (typeof callback === 'function') {
          callback({
            success: false,
            message: error.message,
          })
        }
      }
    })

    // =====================================================
    // TYPING
    // =====================================================

    socket.on('typing', (conversationId) => {
      if (!conversationId) return

      socket.to(conversationId).emit('typing', conversationId)
    })

    // =====================================================
    // DISCONNECT
    // =====================================================

    socket.on('disconnect', (reason) => {
      console.log('')
      console.log('==========================================')
      console.log('🔴 SOCKET DESCONECTADO')
      console.log('==========================================')
      console.log('Socket:', socket.id)
      console.log('User:', userId)
      console.log('Reason:', reason)
      console.log('Rooms:', [...socket.rooms])
      console.log('==========================================')
    })
  })
}
