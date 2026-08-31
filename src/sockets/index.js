import { Server } from 'socket.io'
import Conversation from '../models/Conversation.js'

export function setupSocketIO(httpServer) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3333', 'http://localhost:5173']

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  // Middleware de autenticação do Socket (opcional)
  io.use((socket, next) => {
    // Aqui você pode validar o token JWT do socket
    // const token = socket.handshake.auth.token
    // if (!token) return next(new Error('Autenticação necessária'))
    // try {
    //   const decoded = jwt.verify(token, process.env.JWT_SECRET)
    //   socket.userId = decoded.id
    //   next()
    // } catch (err) {
    //   next(new Error('Token inválido'))
    // }
    next()
  })

  io.on('connection', (socket) => {
    console.log(`🟢 Cliente conectado: ${socket.id}`)

    // ============================================
    // ADMIN
    // ============================================
    socket.on('joinAdmin', async () => {
      socket.join('admins')
      console.log('👨‍💻 Admin conectado e ouvindo todas as conversas')

      try {
        const conversations = await Conversation.find({})
        conversations.forEach((conv) => {
          conv.messages.forEach((msg) => {
            socket.emit('newMessage', {
              from: msg.from,
              to: msg.to,
              body: msg.body,
              time: msg.createdAt.toLocaleTimeString([], {
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

    // ============================================
    // USUÁRIO
    // ============================================
    socket.on('joinConversation', async ({ userName }) => {
      socket.join(userName)
      console.log(`👤 Usuário ${userName} entrou na conversa`)

      try {
        let conversation = await Conversation.findOne({ userName })
        if (!conversation) {
          conversation = new Conversation({ userName, messages: [] })
          await conversation.save()
        }

        conversation.messages.forEach((msg) => {
          socket.emit('newMessage', {
            from: msg.from,
            to: msg.to,
            body: msg.body,
            time: msg.createdAt.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            conversationId: userName,
          })
        })
      } catch (err) {
        console.error('❌ Erro ao carregar conversa:', err.message)
      }
    })

    // ============================================
    // ENVIAR MENSAGEM
    // ============================================
    socket.on('sendMessage', async (data) => {
      const { conversationId, from, to, body } = data

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
        console.error('❌ Erro ao salvar mensagem:', err.message)
        socket.emit('messageError', {
          message: 'Erro ao enviar mensagem',
          error: err.message,
        })
      }
    })

    // ============================================
    // DIGITAÇÃO
    // ============================================
    socket.on('typing', (conversationId) => {
      socket.to(conversationId).emit('typing', conversationId)
      socket.to('admins').emit('typing', conversationId)
    })

    // ============================================
    // DESCONEXÃO
    // ============================================
    socket.on('disconnect', () => {
      console.log(`🔴 Cliente desconectado: ${socket.id}`)
    })
  })

  return io
}
