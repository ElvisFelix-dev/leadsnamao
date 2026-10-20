import express from 'express'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import cors from 'cors'
import cron from 'node-cron'
import { createServer } from 'http'

// ============================================
// IMPORTAÇÃO DAS ROTAS
// ============================================
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
import orchestratorRoutes from './routes/orchestratorRoutes.js'
import webhookRoutes from './routes/webhookRoutes.js'
import chatRoutes from './routes/chatRoutes.js'
import whatsappRoutes from './routes/whatsappRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import leadFollowUpTemplateRoutes from './routes/leadFollowUpTemplateRoutes.js'

// ============================================
// JOBS
// ============================================
import './jobs/processLeadQueue.js'
import { processVisitReminders } from './jobs/processVisitReminders.js'
import { processLeadFollowUps } from './jobs/processLeadFollowUps.js'

// ============================================
// MIDDLEWARES E SOCKET.IO
// ============================================
import errorMiddleware from './middleware/errorMiddleware.js'
import { setupSocketIO } from './sockets/index.js'
import { setupChatSocket } from './sockets/chatSocket.js'

// ============================================
// CONFIGURAÇÃO DE AMBIENTE
// ============================================
dotenv.config()

const requiredEnv = ['MONGODB_URI', 'JWT_SECRET', 'WEBHOOK_VERIFY_TOKEN']

const missingEnv = requiredEnv.filter((key) => !process.env[key])

if (missingEnv.length > 0) {
  console.error(
    `❌ Variáveis de ambiente obrigatórias faltando: ${missingEnv.join(', ')}`,
  )
  console.error('⚠️ O servidor não será iniciado.')
  process.exit(1)
}

// ============================================
// CONFIGURAÇÃO DO EXPRESS
// ============================================
const app = express()

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : ['http://localhost:3333', 'http://localhost:5173']

const corsOptions = {
  origin(origin, callback) {
    if (!origin || process.env.NODE_ENV === 'development') {
      return callback(null, true)
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    return callback(new Error('❌ Não permitido pelo CORS'))
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}

app.use(cors(corsOptions))

app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = Buffer.from(buf)
    },
  }),
)

app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ============================================
// ROTAS PÚBLICAS
// ============================================
app.get('/health', (req, res) => {
  const readyState = mongoose.connection.readyState

  const states = {
    0: 'desconectado',
    1: 'conectado',
    2: 'conectando',
    3: 'desconectando',
  }

  const isConnected = readyState === 1

  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: states[readyState] || 'desconhecido',
  })
})

app.get('/test-server', (req, res) => {
  res.send('🚀 Leads Na Mão server running! ✅')
})

// ============================================
// ROTAS DA API
// ============================================
app.use('/api/users', userRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/lead-follow-up-templates', leadFollowUpTemplateRoutes)
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
app.use('/api/whatsapp', whatsappRoutes)
app.use('/api/conversations', conversationRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/commissions', commissonRoutes)
app.use('/api/orchestrator', orchestratorRoutes)
app.use('/api/webhooks', webhookRoutes)

// ============================================
// MIDDLEWARE DE ERRO
// ============================================
app.use(errorMiddleware)

// ============================================
// ESTADO DA CONEXÃO MONGODB
// ============================================
let connectionPromise = null
let initialConnectionLogged = false
let wasDisconnected = false

// Registra os listeners uma única vez.
// Não registre estes eventos dentro de connectDB().
mongoose.connection.on('disconnected', () => {
  if (!wasDisconnected) {
    console.warn(
      '⚠️ MongoDB desconectado. Aguardando recuperação da conexão...',
    )
  }

  wasDisconnected = true
})

mongoose.connection.on('reconnected', () => {
  wasDisconnected = false
  console.log('🔄 MongoDB reconectado com sucesso!')
})

mongoose.connection.on('error', (err) => {
  console.error('❌ Erro na conexão MongoDB:', err.message)
})

// ============================================
// CONEXÃO COM MONGODB
// ============================================
const connectDB = async (maxRetries = 5, delay = 5000) => {
  // Impede duas chamadas simultâneas de connectDB().
  if (connectionPromise) {
    return connectionPromise
  }

  // Se o Mongoose já estiver conectado, não conecta novamente.
  if (mongoose.connection.readyState === 1) {
    return true
  }

  connectionPromise = (async () => {
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        await mongoose.connect(process.env.MONGODB_URI, {
          serverSelectionTimeoutMS: 10000,
          socketTimeoutMS: 45000,
          maxPoolSize: 10,
          minPoolSize: 0,
        })

        wasDisconnected = false

        if (!initialConnectionLogged) {
          console.log('📊 Conectado ao MongoDB com sucesso!')
          initialConnectionLogged = true
        }

        return true
      } catch (err) {
        console.error(
          `❌ Falha ao conectar ao MongoDB (tentativa ${attempt + 1}/${maxRetries + 1}):`,
          err.message,
        )

        if (attempt < maxRetries) {
          console.log(
            `⏳ Nova tentativa de conexão em ${delay / 1000} segundos...`,
          )

          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    throw new Error(
      'Número máximo de tentativas de conexão com o MongoDB excedido.',
    )
  })()

  try {
    return await connectionPromise
  } finally {
    connectionPromise = null
  }
}

// ============================================
// TAREFAS AGENDADAS
// ============================================
let cronJobsStarted = false

const startCronJobs = () => {
  // Evita registrar os mesmos crons mais de uma vez.
  if (cronJobsStarted) {
    return
  }

  cronJobsStarted = true

  // ------------------------------------------
  // PING DO MONGODB: A CADA 6 HORAS
  // ------------------------------------------
  cron.schedule('0 */6 * * *', async () => {
    if (mongoose.connection.readyState !== 1) {
      console.warn('[MongoDB Ping] Banco indisponível; ping ignorado.')
      return
    }

    try {
      await mongoose.connection.db.admin().ping()

      console.log(
        `🏓 MongoDB Ping executado em ${new Date().toLocaleString('pt-BR')}`,
      )
    } catch (err) {
      console.error('[MongoDB Ping] Erro:', err.message)
    }
  })

  console.log('⏰ MongoDB Ping agendado a cada 6 horas.')

  // ------------------------------------------
  // LEMBRETES DE VISITAS: A CADA 5 MINUTOS
  // ------------------------------------------
  cron.schedule('*/5 * * * *', async () => {
    if (mongoose.connection.readyState !== 1) {
      return
    }

    try {
      const result = await processVisitReminders()

      if (result?.error) {
        console.error(
          '[VisitReminders] Processamento concluído com erro:',
          result.error,
        )
      }
    } catch (err) {
      console.error('[VisitReminders] Erro inesperado no cron:', err.message)
    }
  })

  console.log('⏰ Lembretes de visitas agendados a cada 5 minutos.')

  // ------------------------------------------
  // FOLLOW-UPS: A CADA 5 MINUTOS
  // ------------------------------------------
  cron.schedule('*/5 * * * *', async () => {
    if (mongoose.connection.readyState !== 1) {
      console.warn('[LeadFollowUp] MongoDB indisponível; execução ignorada.')
      return
    }

    try {
      const result = await processLeadFollowUps()

      console.log('[LeadFollowUp] Resultado do cron:', result)
    } catch (err) {
      console.error(
        '[LeadFollowUp] Erro no processamento agendado:',
        err.stack || err,
      )
    }
  })

  console.log('⏰ Follow-ups agendados a cada 5 minutos.')
}

// ============================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================
let httpServer
let isShuttingDown = false
let shutdownTimeout

const startServer = async () => {
  // O servidor HTTP só inicia após a conexão inicial.
  await connectDB()

  console.log('[LeadFollowUp] Configuração carregada:', {
    dryRun: process.env.LEAD_FOLLOWUPS_DRY_RUN,
    allowBulkSend: process.env.LEAD_FOLLOWUPS_ALLOW_BULK_SEND,
    testFollowUpConfigured: Boolean(process.env.LEAD_FOLLOWUPS_TEST_ID),
    processId: process.pid,
  })

  httpServer = createServer(app)

  const io = setupSocketIO(httpServer)
  setupChatSocket(io)

  app.set('io', io)

  // Registra os crons uma única vez por processo.
  startCronJobs()

  const PORT = process.env.PORT || 3333

  await new Promise((resolve, reject) => {
    const onError = (err) => {
      httpServer.off('listening', onListening)
      reject(err)
    }

    const onListening = () => {
      httpServer.off('error', onError)
      resolve()
    }

    httpServer.once('error', onError)
    httpServer.once('listening', onListening)
    httpServer.listen(PORT)
  })

  console.log(`🚀 Servidor rodando na porta ${PORT}`)
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`)
  console.log('📊 MongoDB: Conectado ✅')
  console.log(`💬 Chat Socket: ${io ? 'Ativo ✅' : 'Inativo ❌'}`)
}

// ============================================
// ENCERRAMENTO GRACIOSO
// ============================================
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    return
  }

  isShuttingDown = true

  console.log(`🛑 Sinal ${signal} recebido. Encerrando o servidor...`)

  // Evita que o processo fique preso indefinidamente.
  shutdownTimeout = setTimeout(() => {
    console.error('⏰ Tempo limite de encerramento excedido. Forçando saída...')
    process.exit(1)
  }, 15000)

  shutdownTimeout.unref()

  try {
    if (httpServer?.listening) {
      await new Promise((resolve, reject) => {
        httpServer.close((err) => {
          if (err) return reject(err)
          resolve()
        })
      })

      console.log('🛑 Servidor HTTP fechado.')
    }

    // Encerra a conexão sem disparar outra tentativa manual.
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close()
      console.log('📊 Conexão MongoDB fechada.')
    }

    if (shutdownTimeout) {
      clearTimeout(shutdownTimeout)
    }

    process.exit(0)
  } catch (err) {
    console.error('❌ Erro durante o encerramento:', err.message)
    process.exit(1)
  }
}

process.once('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.once('SIGINT', () => gracefulShutdown('SIGINT'))

// ============================================
// TRATAMENTO DE ERRO NA INICIALIZAÇÃO
// ============================================
startServer().catch((err) => {
  console.error('❌ Erro fatal ao iniciar servidor:', err.message)
  process.exit(1)
})
