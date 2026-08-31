// src/server.js
import express from 'express'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import cors from 'cors'
import cron from 'node-cron'
import { createServer } from 'http'

// Importação das rotas
import userRoutes from './routes/userRoutes.js'
import brokerRoutes from './routes/brokerRoutes.js'
import propertyRoutes from './routes/propertyRoutes.js'
import leadRoutes from './routes/leadRoutes.js'
import visitRoutes from './routes/visitRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'
import brokerDashboardRoutes from './routes/brokerDashboardRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'
import propertyViewRoutes from './routes/propertyViewRoutes.js'
import propertyFavoreriteRoutes from './routes/propertyFavoriteRoutes.js'
import leadCaptureRoutes from './routes/leadCaptureRoutes.js'
import opportunityRoutes from './routes/opportunityRoutes.js'
import proposalRoutes from './routes/proposalRoutes.js'
import calendarRoutes from './routes/calendarRoutes.js'
import saleRoutes from './routes/saleRoutes.js'
import conversationRoutes from './routes/conversationRoutes.js'
import commissonRoutes from './routes/commissionRoutes.js'
import webhookRoutes from './routes/webhookRoutes.js'

// Importação de middlewares
import errorMiddleware from './middleware/errorMiddleware.js'

// Importação do Socket.io
import { setupSocketIO } from './sockets/index.js'

// Configuração de ambiente
dotenv.config()

// Validação de variáveis de ambiente OBRIGATÓRIAS
const requiredEnv = ['MONGODB_URI', 'JWT_SECRET', 'WEBHOOK_VERIFY_TOKEN']

const missingEnv = requiredEnv.filter((key) => !process.env[key])

if (missingEnv.length > 0) {
  console.error(
    `❌ Variáveis de ambiente obrigatórias faltando: ${missingEnv.join(', ')}`,
  )
  console.error(
    '⚠️ O servidor NÃO vai iniciar até que todas sejam configuradas!',
  )
  process.exit(1)
}

// ============================================
// CONFIGURAÇÃO DO EXPRESS
// ============================================
const app = express()

// Configuração de CORS dinâmico
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3333', 'http://localhost:5173']

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origin (como mobile apps ou curl)
    if (!origin) return callback(null, true)

    if (
      allowedOrigins.indexOf(origin) !== -1 ||
      process.env.NODE_ENV === 'development'
    ) {
      callback(null, true)
    } else {
      callback(new Error('❌ Não permitido pelo CORS'))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}

app.use(cors(corsOptions))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ============================================
// ROTAS PÚBLICAS (sem autenticação)
// ============================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb:
      mongoose.connection.readyState === 1 ? 'conectado' : 'desconectado',
  })
})

app.get('/test-server', (req, res) => {
  res.send('🚀 Lead na Mão server running! ✅')
})

// ============================================
// ROTAS DA API
// ============================================
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
app.use('/api/opportunities', opportunityRoutes)
app.use('/api/proposals', proposalRoutes)
app.use('/api/sales', saleRoutes)
app.use('/api/calendar', calendarRoutes)
app.use('/api/conversations', conversationRoutes)
app.use('/api/commissions', commissonRoutes)
app.use('/webhook', webhookRoutes)

// ============================================
// MIDDLEWARE DE ERRO (DEVE SER O ÚLTIMO!)
// ============================================
app.use(errorMiddleware)

// ============================================
// CONEXÃO COM MONGODB COM RECONEXÃO AUTOMÁTICA
// ============================================
const connectDB = async (retries = 5, delay = 5000) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    })

    console.log('📊 Conectado ao MongoDB com sucesso!')

    // Configurar eventos de conexão
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB desconectado. Tentando reconectar...')
      setTimeout(() => connectDB(1, 1000), 1000)
    })

    mongoose.connection.on('error', (err) => {
      console.error('❌ Erro na conexão MongoDB:', err.message)
    })

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconectado com sucesso!')
    })

    return true
  } catch (err) {
    console.error(
      `❌ Falha ao conectar ao MongoDB (tentativa ${retries}):`,
      err.message,
    )

    if (retries > 0) {
      console.log(`⏳ Tentando novamente em ${delay / 1000} segundos...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
      return connectDB(retries - 1, delay)
    } else {
      console.error(
        '❌ Número máximo de tentativas excedido. Servidor NÃO vai iniciar.',
      )
      process.exit(1)
    }
  }
}

// ============================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================
const startServer = async () => {
  // Primeiro, conecta ao MongoDB
  await connectDB()

  // Cria servidor HTTP
  const httpServer = createServer(app)

  // Configura Socket.io
  const io = setupSocketIO(httpServer)

  // Disponibiliza io para as rotas (se necessário)
  app.set('io', io)

  // ============================================
  // TAREFAS AGENDADAS (CRON)
  // ============================================

  // Ping no MongoDB a cada 6 horas (mantém conexão ativa)
  cron.schedule('0 */6 * * *', async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.admin().ping()
        console.log(
          `🏓 MongoDB Ping executado em ${new Date().toLocaleString('pt-BR')}`,
        )
      } else {
        console.warn('⚠️ MongoDB não está conectado para executar ping')
      }
    } catch (err) {
      console.error('❌ Erro ao executar MongoDB Ping:', err.message)
    }
  })
  console.log('⏰ MongoDB Ping agendado para cada 6 horas.')

  // ============================================
  // INICIA O SERVIDOR
  // ============================================
  const PORT = process.env.PORT || 3333

  httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`)
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`)
    console.log(
      `📊 MongoDB: ${mongoose.connection.readyState === 1 ? 'Conectado ✅' : 'Desconectado ❌'}`,
    )
  })

  // Tratamento de encerramento gracioso
  const gracefulShutdown = () => {
    console.log('🛑 Recebido sinal de encerramento. Finalizando conexões...')

    httpServer.close(async () => {
      console.log('🛑 Servidor HTTP fechado')

      try {
        await mongoose.connection.close()
        console.log('📊 Conexão MongoDB fechada')
        process.exit(0)
      } catch (err) {
        console.error('❌ Erro ao fechar MongoDB:', err.message)
        process.exit(1)
      }
    })

    // Forçar encerramento após 10 segundos
    setTimeout(() => {
      console.error(
        '⏰ Tempo limite de encerramento excedido. Forçando saída...',
      )
      process.exit(1)
    }, 10000)
  }

  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)
}

// ============================================
// INICIALIZA A APLICAÇÃO
// ============================================
startServer().catch((err) => {
  console.error('❌ Erro fatal ao iniciar servidor:', err.message)
  process.exit(1)
})
