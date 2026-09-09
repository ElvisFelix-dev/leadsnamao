import mongoose from 'mongoose'

export const setupChatSocket = (io) => {
  io.on('connection', async (socket) => {
    console.log(`🔌 Cliente conectado ao chat: ${socket.id}`)

    // =========================================================
    // IDENTIFICAR USUÁRIO
    // =========================================================

    const userId = socket.handshake.auth?.userId

    if (!userId) {
      console.warn('⚠️ Socket conectado sem userId. Desconectando...')
      socket.disconnect(true)
      return
    }

    const userIdString = userId.toString()

    // =========================================================
    // MODEL
    // =========================================================

    const Conversation = mongoose.model('Conversation')

    // =========================================================
    // SALA INDIVIDUAL DO USUÁRIO
    // =========================================================

    const userRoom = `user_${userIdString}`

    socket.join(userRoom)

    console.log(`👤 Usuário ${userIdString} entrou na sala ${userRoom}`)

    // =========================================================
    // FUNÇÃO: ENTRAR NAS CONVERSAS DO USUÁRIO
    // =========================================================

    const joinUserConversations = async () => {
      try {
        const conversations = await Conversation.find({
          participants: userIdString,
          isActive: true,
        }).select('_id')

        console.log(
          `📩 Usuário ${userIdString} possui ${conversations.length} conversas`,
        )

        for (const conversation of conversations) {
          const conversationId = conversation._id.toString()

          socket.join(conversationId)

          console.log(
            `📩 Usuário ${userIdString} entrou na conversa ${conversationId}`,
          )
        }

        return conversations
      } catch (error) {
        console.error('❌ Erro ao entrar nas conversas:', error.message)
        return []
      }
    }

    // =========================================================
    // ENTRAR AUTOMATICAMENTE NAS CONVERSAS
    // =========================================================

    await joinUserConversations()

    // =========================================================
    // NOTIFICAR OUTROS USUÁRIOS QUE ESTE USUÁRIO ESTÁ ONLINE
    // =========================================================

    socket.broadcast.emit('user_online', userIdString)

    console.log(`🟢 Usuário ${userIdString} está online`)

    // =========================================================
    // EVENTO: JOIN_CONVERSATIONS
    // =========================================================

    socket.on('join_conversations', async () => {
      console.log(`📩 Solicitação para entrar nas conversas: ${userIdString}`)
      await joinUserConversations()
    })

    // =========================================================
    // EVENTO: JOIN_CONVERSATION
    // =========================================================

    socket.on('join_conversation', async (conversationId) => {
      try {
        if (!conversationId) {
          console.warn('⚠️ join_conversation sem conversationId')
          return
        }

        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
          console.warn(`⚠️ conversationId inválido: ${conversationId}`)
          return
        }

        const conversation = await Conversation.findOne({
          _id: conversationId,
          isActive: true,
        }).select('participants')

        if (!conversation) {
          console.warn(`⚠️ Conversa não encontrada: ${conversationId}`)
          return
        }

        // ===================================================
        // CORREÇÃO IMPORTANTE:
        //
        // Não usar:
        //
        // conversation.participants.includes(userId)
        //
        // porque participants contém ObjectIds e userId
        // normalmente é string.
        // ===================================================

        const isParticipant = conversation.participants?.some(
          (participant) =>
            participant && participant.toString() === userIdString,
        )

        if (!isParticipant) {
          console.warn(
            `⚠️ Usuário ${userIdString} tentou entrar em conversa sem permissão: ${conversationId}`,
          )
          return
        }

        socket.join(conversationId)

        console.log(
          `📩 Usuário ${userIdString} entrou na conversa ${conversationId}`,
        )
      } catch (error) {
        console.error('❌ Erro ao entrar na conversa:', error.message)
      }
    })

    // =========================================================
    // EVENTO: TYPING
    // =========================================================

    socket.on('typing', ({ conversationId, isTyping } = {}) => {
      try {
        if (!conversationId) {
          return
        }

        socket.to(conversationId).emit('user_typing', {
          userId: userIdString,
          isTyping: Boolean(isTyping),
        })
      } catch (error) {
        console.error('❌ Erro no evento typing:', error.message)
      }
    })

    // =========================================================
    // DESCONEXÃO
    // =========================================================

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Cliente desconectado do chat: ${socket.id}`)
      console.log(`👤 Usuário: ${userIdString}`)
      console.log(`📌 Motivo: ${reason}`)

      // Avisar outros usuários
      socket.broadcast.emit('user_offline', userIdString)
    })
  })
}
