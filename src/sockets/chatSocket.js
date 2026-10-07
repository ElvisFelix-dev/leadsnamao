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

const getSocketUserId = (socket) => {
  return socket.data?.userId || socket.handshake?.auth?.userId || null
}

const logSocketInstance = (label, socket = null) => {
  console.log('')
  console.log('==========================================')
  console.log(`🧪 SOCKET INSTANCE — ${label}`)
  console.log('==========================================')
  console.log('PID:', process.pid)
  console.log('HOSTNAME:', process.env.HOSTNAME || 'unknown')
  console.log('NODE_ENV:', process.env.NODE_ENV || 'unknown')

  if (socket) {
    console.log('Socket ID:', socket.id)
    console.log('Transport:', socket.conn?.transport?.name || 'unknown')
    console.log('Origin:', socket.handshake?.headers?.origin || null)
    console.log('User ID:', getSocketUserId(socket))
    console.log('Rooms:', [...socket.rooms])
  }

  console.log('==========================================')
}

export function setupChatSocket(io) {
  console.log('')
  console.log('==========================================')
  console.log('🔌 CHAT SOCKET.IO INICIADO')
  console.log('==========================================')
  console.log('PID:', process.pid)
  console.log('HOSTNAME:', process.env.HOSTNAME || 'unknown')
  console.log('NODE_ENV:', process.env.NODE_ENV || 'unknown')
  console.log('Socket.IO disponível:', !!io)
  console.log('Socket.IO engine disponível:', !!io?.engine)
  console.log('==========================================')

  /**
   * Diagnóstico periódico da instância.
   *
   * Isso ajuda a descobrir se o webhook e o WebSocket
   * estão sendo processados pela mesma instância/processo.
   */
  if (io) {
    try {
      console.log('')
      console.log('📊 SOCKET.IO INSTANCE INFO')
      console.log('PID:', process.pid)
      console.log('Engine clients:', io.engine?.clientsCount ?? 'unknown')
      console.log(
        'Engine connections:',
        io.engine?.clients ? io.engine.clients.size : 'unknown',
      )
    } catch (error) {
      console.error(
        '❌ Erro ao obter informações da instância Socket.IO:',
        error,
      )
    }
  }

  io.on('connection', async (socket) => {
    console.log('')
    console.log('==========================================')
    console.log('🟢 NOVO CLIENTE SOCKET.IO')
    console.log('==========================================')

    console.log('Socket ID:', socket.id)

    console.log('Transport:', socket.conn?.transport?.name || 'unknown')

    console.log('Origin:', socket.handshake?.headers?.origin || null)

    console.log('Host:', socket.handshake?.headers?.host || null)

    console.log(
      'User-Agent:',
      socket.handshake?.headers?.['user-agent'] || null,
    )

    console.log('==========================================')

    /**
     * Diagnóstico principal da instância.
     *
     * IMPORTANTE:
     * Se o webhook mostrar PID 83 e aqui aparecer PID 82,
     * temos processos/instâncias diferentes.
     */
    logSocketInstance('CONNECTION', socket)

    const rawUserId = socket.handshake?.auth?.userId

    console.log('')
    console.log('🔍 AUTENTICAÇÃO DO SOCKET')
    console.log('==========================================')
    console.log('RAW userId:', rawUserId)
    console.log('typeof userId:', typeof rawUserId)
    console.log('Auth completa:', socket.handshake?.auth || {})
    console.log('==========================================')

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

    await socket.join(userRoom)

    console.log('')
    console.log('👤 USER ROOM')
    console.log('==========================================')
    console.log('User:', userId)
    console.log('Room:', userRoom)
    console.log('Socket:', socket.id)
    console.log('Rooms atuais:', [...socket.rooms])
    console.log('==========================================')

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

          const assignedTo = normalizeId(conversation.assignedTo)

          const participants = conversation.participants || []

          const isAssigned = assignedTo === userId

          const isParticipant = participants.some(
            (participant) => normalizeId(participant) === userId,
          )

          const canJoin =
            conversation.channel === 'whatsapp' ? isAssigned : isParticipant

          console.log('')
          console.log('💬 CONVERSA')
          console.log('------------------------------------------')
          console.log('Conversation:', conversationId)
          console.log('Channel:', conversation.channel)
          console.log('AssignedTo:', assignedTo)
          console.log('Participants:', participants.map(normalizeId))
          console.log('Is assigned:', isAssigned)
          console.log('Is participant:', isParticipant)
          console.log('Pode entrar:', canJoin)

          if (!canJoin) {
            console.log('⛔ Socket não entrou na conversa')

            continue
          }

          await socket.join(conversationId)

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

        const isParticipant =
          conversation.participants?.some(
            (participant) => normalizeId(participant) === userId,
          ) || false

        /**
         * O admin pode acessar qualquer conversa.
         *
         * Atualmente socket.data.user não é populado,
         * então mantemos também a validação de assignedTo
         * e participant.
         */
        const isAdmin = isAdminUser(socket.data?.user)

        const canJoin = isAdmin || isAssigned || isParticipant

        console.log('Channel:', conversation.channel)
        console.log('AssignedTo:', assignedTo)
        console.log('Is assigned:', isAssigned)
        console.log('Is participant:', isParticipant)
        console.log('Is admin:', isAdmin)
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

        await socket.join(conversationId)

        console.log('✅ SOCKET ENTROU NA ROOM:', conversationId)

        console.log('📦 ROOMS DO SOCKET:', [...socket.rooms])

        /**
         * Confirma imediatamente que o socket
         * está realmente presente na room.
         */
        try {
          const roomSockets = await io.in(conversationId).fetchSockets()

          console.log('🔎 SOCKETS NA ROOM APÓS JOIN:', roomSockets.length)

          roomSockets.forEach((roomSocket) => {
            console.log('   • Socket:', roomSocket.id)

            console.log(
              '     User:',
              roomSocket.data?.userId ||
                roomSocket.handshake?.auth?.userId ||
                null,
            )

            console.log('     PID:', process.pid)
          })
        } catch (inspectionError) {
          console.error('❌ Erro ao verificar room após join:', inspectionError)
        }

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

      console.log('⌨️ TYPING:', {
        socket: socket.id,
        userId,
        conversationId,
      })

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
      console.log('PID:', process.pid)
      console.log('HOSTNAME:', process.env.HOSTNAME || 'unknown')
      console.log('==========================================')
    })
  })
}
