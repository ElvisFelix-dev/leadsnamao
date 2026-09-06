// src/jobs/processLeadQueue.js
import cron from 'node-cron'
import mongoose from 'mongoose'
import { processPendingLeads } from '../service/leadDistributionService.js'
import logger from '../utils/logger.js'

// 🔥 EXECUTAR A CADA 5 MINUTOS
cron.schedule('*/5 * * * *', async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    logger.info('🔄 Processando fila de leads...')

    const result = await processPendingLeads()

    if (result.distributed > 0) {
      logger.info(`✅ ${result.distributed} leads distribuídos.`)
    }

    await mongoose.disconnect()
  } catch (error) {
    logger.error('❌ Erro no processamento de leads:', error)
  }
})

logger.info('📅 Job de processamento de leads iniciado!')
