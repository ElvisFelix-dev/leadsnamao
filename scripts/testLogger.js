// src/scripts/testLogger.js
import logger from '../src/utils/logger.js'

async function testLogger() {
  console.log('🧪 Testando logger...\n')

  // Testar diferentes níveis
  logger.info('📊 Mensagem de info')
  logger.warn('⚠️ Mensagem de warning')
  logger.error('❌ Mensagem de erro')
  logger.debug('🐛 Mensagem de debug')

  // Testar com meta dados
  logger.info('Lead criado', {
    leadId: '12345',
    name: 'Cliente Teste',
    region: 'zona_sul',
  })

  // Testar timer
  const timer = logger.startTimer()
  await new Promise((resolve) => setTimeout(resolve, 100))
  timer.done('Operação concluída')

  // Testar log de erro
  try {
    throw new Error('Erro de teste')
  } catch (error) {
    logger.logError(error, {
      context: 'Teste de logger',
      userId: '123',
    })
  }

  console.log('\n✅ Teste concluído!')
}

testLogger()
