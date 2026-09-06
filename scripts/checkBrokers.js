// src/scripts/checkBrokers.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

async function checkBrokers() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/crm',
    )
    console.log('🔌 Conectado ao MongoDB')

    const User = (await import('../src/models/User.js')).default
    const Lead = (await import('../src/models/Lead.js')).default

    // Buscar todos os corretores
    const brokers = await User.find({ role: 'broker' }).select(
      'name email brokerSettings leadCounters stats',
    )

    console.log(`\n📊 ${brokers.length} corretores encontrados:\n`)

    for (const broker of brokers) {
      console.log(`👤 ${broker.name} (${broker.email})`)
      console.log(
        `   📍 Regiões: ${broker.brokerSettings?.specializedRegions?.join(', ') || 'Nenhuma'}`,
      )
      console.log(
        `   🏠 Tipos: ${broker.brokerSettings?.specializedTypes?.join(', ') || 'Nenhum'}`,
      )
      console.log(
        `   📊 Status: ${broker.brokerSettings?.isActive ? '✅ Ativo' : '❌ Inativo'}`,
      )
      console.log(
        `   📈 Max Leads: ${broker.brokerSettings?.maxActiveLeads || 50}`,
      )
      console.log(`   🎯 Prioridade: ${broker.brokerSettings?.priority || 0}`)
      console.log(
        `   📋 Leads ativos: ${broker.leadCounters?.activeLeads || 0}`,
      )
      console.log(
        `   📋 Total atribuídos: ${broker.leadCounters?.totalAssigned || 0}`,
      )
      console.log(
        `   📋 Convertidos: ${broker.leadCounters?.convertedLeads || 0}`,
      )
      console.log(
        `   🔄 Posição na fila: ${broker.leadCounters?.leadQueuePosition || 0}`,
      )
      console.log(
        `   📅 Último lead: ${broker.leadCounters?.lastLeadReceivedAt ? new Date(broker.leadCounters.lastLeadReceivedAt).toLocaleString() : 'Nunca'}`,
      )

      // Buscar leads ativos do corretor
      const activeLeads = await Lead.find({
        assignedTo: broker._id,
        isDistributed: true,
        status: { $in: ['novo', 'em_andamento', 'contatado', 'em_negociacao'] },
      }).limit(5)

      if (activeLeads.length > 0) {
        console.log(
          `   📋 Últimos leads: ${activeLeads.map((l) => l.name).join(', ')}`,
        )
      }

      console.log('') // Linha em branco
    }

    // Estatísticas gerais
    const totalLeads = await Lead.countDocuments({ isDeleted: { $ne: true } })
    const distributedLeads = await Lead.countDocuments({ isDistributed: true })
    const pendingLeads = await Lead.countDocuments({
      isDistributed: false,
      assignedTo: { $exists: false },
    })

    console.log('📊 Estatísticas gerais:')
    console.log(`   Total de leads: ${totalLeads}`)
    console.log(`   Leads distribuídos: ${distributedLeads}`)
    console.log(`   Leads pendentes: ${pendingLeads}`)
    console.log(
      `   Taxa de distribuição: ${totalLeads > 0 ? Math.round((distributedLeads / totalLeads) * 100) : 0}%`,
    )

    await mongoose.disconnect()
    console.log('\n🔌 Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

checkBrokers()
