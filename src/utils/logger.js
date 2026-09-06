// src/utils/logger.js - VERSÃO SIMPLIFICADA (SEM DEPENDÊNCIAS)
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 🔥 CONFIGURAÇÃO
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
}

const currentLevel = process.env.LOG_LEVEL || 'info'
const isProduction = process.env.NODE_ENV === 'production'

// 🔥 FUNÇÃO PARA ESCREVER NO ARQUIVO
function writeToFile(level, message, meta = {}) {
  if (!isProduction) return

  try {
    const logDir = path.join(__dirname, '../../logs')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    const timestamp = new Date().toISOString()
    const logEntry = `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}\n`

    fs.appendFileSync(path.join(logDir, `${level}.log`), logEntry)
    fs.appendFileSync(path.join(logDir, 'combined.log'), logEntry)
  } catch (error) {
    // Ignorar erros de escrita
  }
}

// 🔥 CRIAR O LOGGER
const logger = {
  error: (message, meta = {}) => {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.error) {
      console.error(`❌ ${message}`, meta)
      writeToFile('error', message, meta)
    }
  },

  warn: (message, meta = {}) => {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.warn) {
      console.warn(`⚠️ ${message}`, meta)
      writeToFile('warn', message, meta)
    }
  },

  info: (message, meta = {}) => {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.info) {
      console.log(`ℹ️ ${message}`, meta)
      writeToFile('info', message, meta)
    }
  },

  debug: (message, meta = {}) => {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.debug) {
      console.debug(`🐛 ${message}`, meta)
      writeToFile('debug', message, meta)
    }
  },

  // 🔥 MÉTODO PARA LOG DE ERRO COM STACK
  logError: (error, context = {}) => {
    logger.error(error.message, {
      stack: error.stack,
      ...context,
    })
  },

  // 🔥 TIMER PARA PERFORMANCE
  startTimer: () => {
    const start = Date.now()
    return {
      done: (message, meta = {}) => {
        const duration = Date.now() - start
        logger.info(message, { ...meta, duration: `${duration}ms` })
        return duration
      },
    }
  },

  // 🔥 MIDDLEWARE PARA LOG DE REQUESTS
  logRequest: (req, res, next) => {
    const start = Date.now()
    res.on('finish', () => {
      const duration = Date.now() - start
      logger.info(`${req.method} ${req.originalUrl}`, {
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent'),
      })
    })
    next()
  },
}

// 🔥 STREAM PARA MORGAN (SE USAR)
logger.stream = {
  write: (message) => {
    logger.info(message.trim())
  },
}

export default logger
