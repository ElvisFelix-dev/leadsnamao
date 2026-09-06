// src/scripts/checkNewLeads.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

async function checkNewLeads() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/crm',
    )
    console.log('🔌 Conectado ao MongoDB')

    const Lead = (await import('../src/models/Lead.js')).default

    // Buscar leads criados recentemente (últimos 5)
    const recentLeads = await Lead.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select(
        'name region status sourceType assignedTo isDistributed distribution.status awaitingAssignment createdAt',
      )

    console.log('\n📊 ÚLTIMOS LEADS CRIADOS:\n')

    recentLeads.forEach((lead, index) => {
      console.log(`${index + 1}. ${lead.name}`)
      console.log(`   Região: ${lead.region || '❌ NÃO DEFINIDA'}`)
      console.log(`   Status: ${lead.status}`)
      console.log(`   sourceType: ${lead.sourceType}`)
      console.log(`   assignedTo: ${lead.assignedTo || '❌ NÃO ATRIBUIDO'}`)
      console.log(`   isDistributed: ${lead.isDistributed}`)
      console.log(`   awaitingAssignment: ${lead.awaitingAssignment}`)
      console.log(
        `   distribution.status: ${lead.distribution?.status || '❌ NÃO DEFINIDO'}`,
      )
      console.log(`   Criado em: ${lead.createdAt}`)
      console.log('')
    })

    // Contar leads pendentes
    const pending = await Lead.countDocuments({
      isDistributed: false,
      assignedTo: null,
      isDeleted: { $ne: true },
      status: { $nin: ['convertido', 'perdido', 'arquivado'] },
    })

    console.log(`\n📊 Total de leads pendentes: ${pending}`)

    await mongoose.disconnect()
    console.log('\n🔌 Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

checkNewLeads()
