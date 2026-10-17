// src/sockets/index.js
import { Server } from 'socket.io'
import Conversation from '../models/Conversation.js'

let ioInstance = null

export const getSocketIO = () => ioInstance

export function setupSocketIO(httpServer) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
    : ['http://localhost:3333', 'http://localhost:5173']

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  ioInstance = io

  // =========================================================
  // MIDDLEWARE DE AUTENTICAÇÃO
  // =========================================================

  io.use((socket, next) => {
    // Mantém o comportamento atual.
    // A validação JWT poderá ser adicionada sem alterar os eventos.
    next()
  })

  // =========================================================
  // CONEXÃO
  // =========================================================

  io.on('connection', (socket) => {
    console.log(`🟢 Cliente conectado ao Socket.IO: ${socket.id}`)

    // =======================================================
    // NOTIFICAÇÕES DE LEADS — SALAS DEDICADAS (NOVO)
    // =======================================================

    /**
     * O frontend chama este evento após o login para entrar na
     * sala correta de notificações.
     *
     * payload: { role: 'admin' | 'manager' | 'broker', userId: string }
     *
     * - admin/manager → sala "admins"
     * - broker        → sala "broker_{userId}"
     */
    socket.on('join_notifications', ({ role, userId } = {}) => {
      if (!role) {
        console.warn(
          `⚠️ Socket ${socket.id} chamou join_notifications sem role.`,
        )
        return
      }

      if (['admin', 'manager'].includes(role)) {
        socket.join('admins')
        console.log(`👨‍💼 Socket ${socket.id} → sala "admins"`)
      }

      if (role === 'broker' && userId) {
        const room = `broker_${String(userId)}`
        socket.join(room)
        console.log(`🧑‍💼 Socket ${socket.id} → sala "${room}"`)
      }
    })

    // =======================================================
    // LEADS NA MÃO — ENTRADA NA SALA DO USUÁRIO
    // =======================================================

    socket.on('join_conversations', () => {
      const userId = socket.handshake.auth?.userId

      if (!userId) {
        console.warn(
          `⚠️ Socket ${socket.id} solicitou join_conversations sem userId.`,
        )
        return
      }

      const userRoom = `user_${String(userId)}`

      socket.join(userRoom)

      console.log(
        `👤 Socket ${socket.id} entrou na sala do usuário: ${userRoom}`,
      )
    })

    // =======================================================
    // LEADS NA MÃO — ENTRADA NA SALA DA CONVERSA
    // =======================================================

    socket.on('join_conversation', (conversationId) => {
      const id =
        typeof conversationId === 'string'
          ? conversationId
          : conversationId?._id || conversationId?.conversationId

      if (!id || typeof id !== 'string') {
        console.warn(
          '⚠️ join_conversation recebeu um ID inválido:',
          conversationId,
        )
        return
      }

      socket.join(id)

      console.log(`💬 Socket ${socket.id} entrou na sala da conversa: ${id}`)
    })

    // =======================================================
    // COMPATIBILIDADE COM O EVENTO ANTIGO DO ADMIN
    // =======================================================

    socket.on('joinAdmin', async () => {
      socket.join('admins')

      console.log('👨‍💻 Admin conectado e ouvindo conversas antigas')

      try {
        const conversations = await Conversation.find({})

        conversations.forEach((conv) => {
          conv.messages.forEach((msg) => {
            socket.emit('newMessage', {
              from: msg.from,
              to: msg.to,
              body: msg.body,
              time: msg.createdAt?.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
              conversationId: conv.userName,
            })
          })
        })
      } catch (err) {
        console.error('❌ Erro ao carregar histórico do admin:', err.message)
      }
    })

    // =======================================================
    // COMPATIBILIDADE COM A CONVERSA ANTIGA POR USERNAME
    // =======================================================

    socket.on('joinConversation', async (data = {}) => {
      const userName = typeof data === 'string' ? data : data.userName

      if (!userName) {
        console.warn('⚠️ joinConversation recebido sem userName.')
        return
      }

      socket.join(userName)

      console.log(`👤 Usuário entrou na conversa antiga: ${userName}`)

      try {
        let conversation = await Conversation.findOne({ userName })

        if (!conversation) {
          conversation = new Conversation({
            userName,
            messages: [],
          })

          await conversation.save()
        }

        conversation.messages.forEach((msg) => {
          socket.emit('newMessage', {
            from: msg.from,
            to: msg.to,
            body: msg.body,
            time: msg.createdAt?.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            conversationId: userName,
          })
        })
      } catch (err) {
        console.error('❌ Erro ao carregar conversa antiga:', err.message)
      }
    })

    // =======================================================
    // COMPATIBILIDADE COM O ENVIO DE MENSAGENS ANTIGO
    // =======================================================

    socket.on('sendMessage', async (data = {}) => {
      const { conversationId, from, to, body } = data

      if (!conversationId || !body) {
        socket.emit('messageError', {
          message: 'conversationId e body são obrigatórios.',
        })
        return
      }

      try {
        let conversation = await Conversation.findOne({
          userName: conversationId,
        })

        if (!conversation) {
          conversation = new Conversation({
            userName: conversationId,
            messages: [],
          })
        }

        const msg = {
          from,
          to,
          body,
          read: false,
          createdAt: new Date(),
        }

        conversation.messages.push(msg)
        await conversation.save()

        const messageData = {
          ...msg,
          conversationId,
          time: msg.createdAt.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        }

        io.to(conversationId).emit('newMessage', messageData)
        io.to('admins').emit('newMessage', messageData)
      } catch (err) {
        console.error('❌ Erro ao salvar mensagem antiga:', err.message)

        socket.emit('messageError', {
          message: 'Erro ao enviar mensagem',
          error: err.message,
        })
      }
    })

    // =======================================================
    // DIGITAÇÃO — COMPATIBILIDADE COM O SISTEMA ANTIGO
    // =======================================================

    socket.on('typing', (conversationId) => {
      if (!conversationId) return

      socket.to(conversationId).emit('typing', conversationId)
      socket.to('admins').emit('typing', conversationId)
    })

    // =======================================================
    // DESCONEXÃO
    // =======================================================

    socket.on('disconnect', (reason) => {
      console.log(`🔴 Socket desconectado: ${socket.id}. Motivo: ${reason}`)
    })
  })

  return io
}
