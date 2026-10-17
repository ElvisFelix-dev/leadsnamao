// src/jobs/processLeadQueue.js
import cron from 'node-cron'
import mongoose from 'mongoose'
import { processPendingLeads } from '../service/leadDistributionService.js'
import logger from '../utils/logger.js'

// Impede execuções simultâneas dentro deste processo.
let isProcessing = false

// Executar a cada 5 minutos.
cron.schedule('*/5 * * * *', async () => {
  // O server.js é responsável pela conexão com o MongoDB.
  if (mongoose.connection.readyState !== 1) {
    logger.warn('[LeadQueue] MongoDB indisponível. Execução ignorada.')
    return
  }

  // Evita sobreposição caso a execução anterior ainda esteja ativa.
  if (isProcessing) {
    logger.warn('[LeadQueue] Já existe um processamento em andamento.')
    return
  }

  isProcessing = true

  try {
    logger.info('🔄 Processando fila de leads...')

    const result = await processPendingLeads()

    if (result?.distributed > 0) {
      logger.info(`✅ ${result.distributed} leads distribuídos.`)
    }

    logger.info(
      `[LeadQueue] Processamento concluído. Distribuídos: ${
        result?.distributed ?? 0
      }`,
    )
  } catch (error) {
    logger.error('[LeadQueue] Erro no processamento de leads:', error)
  } finally {
    isProcessing = false
  }
})

logger.info('📅 Job de processamento de leads agendado a cada 5 minutos.')
