// testDistribution.js
import mongoose from 'mongoose'
import Lead from '../src/models/Lead.js'
import { autoDistributeLead } from '../src/service/leadDistributionService.js'
import dotenv from 'dotenv'
import { LEAD_STAGES } from '../src/constants/leadStages.js'
import { LEAD_STATUS } from '../src/constants/leadStatus.js'
import { LEAD_PRIORITY } from '../src/constants/leadPriority.js'

dotenv.config()

async function testDistribution() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/crm',
    )
    console.log('🔌 Conectado ao MongoDB')

    // 🔥 CORRIGIDO: Usar os valores corretos das constantes
    const testLead = await Lead.create({
      name: 'Teste Distribuição',
      email: 'teste@distribuicao.com',
      phone: '11999999999',
      region: 'zona_sul',
      source: 'manual',
      sourceType: 'manual',
      status: LEAD_STATUS.NEW, // 'novo'
      stage: LEAD_STAGES.NEW, // 'new' (em inglês)
      priority: LEAD_PRIORITY.HIGH, // 'alta'
    })

    console.log('✅ Lead de teste criado:', testLead._id)
    console.log('📊 Lead criado:', {
      id: testLead._id,
      name: testLead.name,
      status: testLead.status,
      stage: testLead.stage,
      priority: testLead.priority,
      region: testLead.region,
    })

    // Distribuir automaticamente
    const result = await autoDistributeLead({
      leadId: testLead._id,
      region: 'zona_sul',
      createdBy: null,
    })

    console.log(
      '📊 Resultado da distribuição:',
      JSON.stringify(result, null, 2),
    )

    await mongoose.disconnect()
    console.log('🔌 Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)

    // Mostrar detalhes do erro
    if (error.errors) {
      console.error('📋 Detalhes da validação:')
      Object.keys(error.errors).forEach((key) => {
        console.error(`  - ${key}: ${error.errors[key].message}`)
      })
    }

    process.exit(1)
  }
}

testDistribution()
