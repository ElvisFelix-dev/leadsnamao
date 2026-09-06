// src/scripts/processDistribution.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { processPendingLeads } from '../src/service/leadDistributionService.js'

dotenv.config()

async function processDistribution() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/crm',
    )
    console.log('🔌 Conectado ao MongoDB')

    const Lead = (await import('../src/models/Lead.js')).default

    // Verificar leads pendentes
    const pendingLeads = await Lead.find({
      isDistributed: false,
      assignedTo: { $exists: false },
      isDeleted: { $ne: true },
      status: { $nin: ['convertido', 'perdido', 'arquivado'] },
    }).select('name region priority sourceType')

    console.log(`\n📊 ${pendingLeads.length} leads pendentes encontrados:`)
    pendingLeads.forEach((lead, index) => {
      console.log(
        `  ${index + 1}. ${lead.name} - ${lead.region} (${lead.priority}) - ${lead.sourceType}`,
      )
    })

    if (pendingLeads.length === 0) {
      console.log('\n⚠️  Nenhum lead pendente para distribuir.')
      await mongoose.disconnect()
      return
    }

    console.log('\n🔄 Processando distribuição automática...')

    // Processar distribuição
    const result = await processPendingLeads()

    console.log('\n📊 Resultado da distribuição:')
    console.log(`  ✅ Distribuídos: ${result.distributed}`)
    console.log(`  ❌ Falhas: ${result.totalProcessed - result.distributed}`)
    console.log(`  📋 Total processados: ${result.totalProcessed}`)

    // Verificar resultado final
    const distributed = await Lead.find({
      isDistributed: true,
      assignedTo: { $exists: true },
    })
      .populate('assignedTo', 'name email')
      .select('name region assignedTo')

    const stillPending = await Lead.find({
      isDistributed: false,
      assignedTo: { $exists: false },
      isDeleted: { $ne: true },
    }).select('name region')

    console.log('\n📊 Status final:')
    console.log(`  ✅ Leads distribuídos: ${distributed.length}`)
    console.log(`  ⏳ Leads pendentes: ${stillPending.length}`)

    if (distributed.length > 0) {
      console.log('\n📋 Leads distribuídos:')
      distributed.forEach((lead, index) => {
        console.log(
          `  ${index + 1}. ${lead.name} (${lead.region}) -> ${lead.assignedTo?.name || 'N/A'}`,
        )
      })
    }

    if (stillPending.length > 0) {
      console.log('\n⏳ Leads ainda pendentes:')
      stillPending.forEach((lead, index) => {
        console.log(`  ${index + 1}. ${lead.name} (${lead.region})`)
      })
    }

    // Estatísticas dos corretores
    const User = (await import('../src/models/User.js')).default
    const brokers = await User.find({ role: 'broker' }).select(
      'name leadCounters brokerSettings',
    )

    console.log('\n📊 Status dos corretores:')
    brokers.forEach((broker) => {
      const active = broker.leadCounters?.activeLeads || 0
      const max = broker.brokerSettings?.maxActiveLeads || 50
      const total = broker.leadCounters?.totalAssigned || 0
      console.log(
        `  ${broker.name}: ${active}/${max} leads ativos (total: ${total})`,
      )
    })

    await mongoose.disconnect()
    console.log('\n🔌 Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

processDistribution()
