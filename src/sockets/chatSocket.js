import mongoose from 'mongoose'

export const setupChatSocket = (io) => {
  io.on('connection', async (socket) => {
    console.log(`🔌 Cliente conectado ao chat: ${socket.id}`)

    // =========================================================
    // IDENTIFICAR USUÁRIO
    // =========================================================

    let rawUserId = socket.handshake.auth?.userId

    console.log('🔍 RAW userId:', rawUserId, '| typeof:', typeof rawUserId)

    /**
     * Corrige caso o frontend envie o ObjectId
     * como objeto MongoDB:
     *
     * { $oid: "..." }
     *
     * ou:
     *
     * { _id: "..." }
     */
    if (rawUserId && typeof rawUserId === 'object') {
      rawUserId = rawUserId.$oid || rawUserId._id || rawUserId.toString()
    }

    if (!rawUserId) {
      console.warn('⚠️ Socket conectado sem userId. Desconectando...')

      socket.disconnect(true)
      return
    }

    const userIdString = String(rawUserId)

    console.log(`🔍 userId normalizado: ${userIdString}`)

    // =========================================================
    // VALIDAR USER ID
    // =========================================================

    if (!mongoose.Types.ObjectId.isValid(userIdString)) {
      console.warn(`⚠️ userId inválido no Socket.IO: ${userIdString}`)

      socket.disconnect(true)
      return
    }

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
        /**
         * CHAT INTERNO
         * ----------------
         * O usuário participa através de:
         *
         * participants: [userId]
         *
         * WHATSAPP
         * ----------------
         * O corretor responsável participa através de:
         *
         * assignedTo: userId
         *
         * Portanto usamos $or para contemplar os
         * dois tipos de conversa.
         */
        const conversations = await Conversation.find({
          isActive: true,
          $or: [
            {
              participants: userIdString,
            },
            {
              assignedTo: userIdString,
            },
          ],
        }).select('_id channel assignedTo participants')

        console.log(
          `📩 Usuário ${userIdString} possui ${conversations.length} conversas`,
        )

        for (const conversation of conversations) {
          const conversationId = conversation._id.toString()

          socket.join(conversationId)

          console.log(
            `📩 Usuário ${userIdString} entrou na conversa ${conversationId} (${conversation.channel})`,
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

        /**
         * Precisamos buscar tanto:
         *
         * - participants → chat interno
         * - assignedTo → WhatsApp
         */
        const conversation = await Conversation.findOne({
          _id: conversationId,
          isActive: true,
        }).select('channel participants assignedTo')

        if (!conversation) {
          console.warn(`⚠️ Conversa não encontrada: ${conversationId}`)

          return
        }

        // ===================================================
        // CHAT INTERNO
        // ===================================================

        const isInternalParticipant = conversation.participants?.some(
          (participant) =>
            participant && participant.toString() === userIdString,
        )

        // ===================================================
        // WHATSAPP
        // ===================================================

        const isWhatsAppAssigned =
          conversation.channel === 'whatsapp' &&
          conversation.assignedTo &&
          conversation.assignedTo.toString() === userIdString

        // ===================================================
        // AUTORIZAÇÃO
        // ===================================================

        if (!isInternalParticipant && !isWhatsAppAssigned) {
          console.warn(
            `⚠️ Usuário ${userIdString} tentou entrar em conversa sem permissão: ${conversationId}`,
          )

          return
        }

        // ===================================================
        // ENTRAR NA ROOM
        // ===================================================

        socket.join(conversationId)

        console.log(
          `📩 Usuário ${userIdString} entrou na conversa ${conversationId} (${conversation.channel})`,
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

        /**
         * Envia somente para os outros usuários
         * da conversa.
         *
         * O próprio usuário não recebe o evento.
         */
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
