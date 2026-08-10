// src/server.js
import express from 'express'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cron from 'node-cron'

// Rotas
import userRoutes from './routes/userRoutes.js'

import brokerRoutes from './routes/brokerRoutes.js'
import propertyRoutes from './routes/propertyRoutes.js'
import Conversation from './models/Conversation.js'
import leadRoutes from './routes/leadRoutes.js'
import visitRoutes from './routes/visitRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'
import brokerDashboardRoutes from './routes/brokerDashboardRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'
import propertyViewRoutes from './routes/propertyViewRoutes.js'
import propertyFavoreriteRoutes from './routes/propertyFavoriteRoutes.js'
import leadCaptureRoutes from './routes/leadCaptureRoutes.js'

import errorMiddleware from './middleware/errorMiddleware.js'

dotenv.config()

const app = express()
app.use(express.json())
app.use(cors())

app.use(errorMiddleware)

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('📊 Connected to MongoDB')

    // ==========================
    // Ping a cada 6 horas
    // ==========================
    cron.schedule('0 */6 * * *', async () => {
      try {
        await mongoose.connection.db.admin().ping()

        console.log(
          `🏓 MongoDB Ping executado em ${new Date().toLocaleString('pt-BR')}`,
        )
      } catch (err) {
        console.error('❌ Erro ao executar MongoDB Ping:', err.message)
      }
    })

    console.log('⏰ MongoDB Ping agendado para cada 6 horas.')
  })
  .catch((err) => console.error('❌ MongoDB error:', err.message))

// Rotas de teste
app.get('/test-server', (req, res) => {
  res.send('🚀 Lead na Mão server running! ✅')
})

// Rotas da aplicação
app.use('/api/users', userRoutes)
app.use('/api/brokers', brokerRoutes)
app.use('/api/properties', propertyRoutes)
app.use('/api/leads', leadRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/visits', visitRoutes)
app.use('/api/broker-dashboard', brokerDashboardRoutes)
app.use('/api/uploads', uploadRoutes)
app.use('/api/property-views', propertyViewRoutes)
app.use('/api/property-favorite', propertyFavoreriteRoutes)
app.use('/api/lead-capture', leadCaptureRoutes)

app.use('/api/properties', propertyRoutes)
app.use('/api/leads', leadRoutes)
app.use('/api/dashboard', dashboardRoutes)

// Rota de validação do Webhook
app.get('/webhook/', (req, res) => {
  const VERIFY_TOKEN = '16996318063' // mesmo que você colocou no Meta

  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verificado com sucesso!')
    return res.status(200).send(challenge)
  } else {
    return res.sendStatus(403)
  }
})

const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: 'https://imosmart.netlify.app',
    methods: ['GET', 'POST'],
  },
})

io.on('connection', (socket) => {
  console.log('🟢 Novo cliente conectado')

  // Admin entra
  socket.on('joinAdmin', async () => {
    socket.join('admins')
    console.log('👨‍💻 Admin conectado e ouvindo todas as conversas')

    // Envia histórico de todas conversas para o admin
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
  })

  // Usuário entra
  socket.on('joinConversation', async ({ userName }) => {
    socket.join(userName)
    console.log(`👤 Usuário entrou na conversa: ${userName}`)

    // Busca histórico da conversa e envia
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
  })

  // Enviar mensagem
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

      const msg = { from, to, body, createdAt: new Date() }
      conversation.messages.push(msg)
      await conversation.save()

      io.to(conversationId).emit('newMessage', { ...msg, conversationId })
      io.to('admins').emit('newMessage', { ...msg, conversationId })
    } catch (err) {
      console.error('Erro ao salvar mensagem:', err)
    }
  })

  // Digitação
  socket.on('typing', (conversationId) => {
    socket.to(conversationId).emit('typing', conversationId)
  })

  socket.on('disconnect', () => {
    console.log('🔴 Cliente desconectado')
  })
})

// REST para buscar conversa completa
app.get('/api/conversations/:userName', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      userName: req.params.userName,
    })
    if (!conversation)
      return res.status(404).json({ message: 'Conversa não encontrada' })
    res.json(conversation)
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Erro ao buscar conversa', error: err.message })
  }
})

const PORT = process.env.PORT || 3333
httpServer.listen(PORT, () =>
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`),
)
