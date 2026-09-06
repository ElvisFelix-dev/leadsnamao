// src/scripts/inspectLeads.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

async function inspectLeads() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/crm',
    )
    console.log('🔌 Conectado ao MongoDB')

    const Lead = (await import('../src/models/Lead.js')).default

    // Buscar TODOS os leads (incluindo os que não são pendentes)
    const allLeads = await Lead.find({ isDeleted: { $ne: true } }).select(
      'name region status isDistributed assignedTo awaitingAssignment distribution.status',
    )

    console.log(`\n📊 Total de leads: ${allLeads.length}`)
    console.log('\n📋 DETALHES DOS LEADS:')
    console.log('='.repeat(80))

    allLeads.forEach((lead, index) => {
      console.log(`\n${index + 1}. ${lead.name}`)
      console.log(`   ID: ${lead._id}`)
      console.log(`   Região: ${lead.region}`)
      console.log(`   Status: ${lead.status}`)
      console.log(`   isDistributed: ${lead.isDistributed}`)
      console.log(`   assignedTo: ${lead.assignedTo || 'null'}`)
      console.log(`   awaitingAssignment: ${lead.awaitingAssignment}`)
      console.log(
        `   distribution.status: ${lead.distribution?.status || 'undefined'}`,
      )
    })

    // Contar por status
    const withAssigned = allLeads.filter((l) => l.assignedTo)
    const withoutAssigned = allLeads.filter((l) => !l.assignedTo)
    const distributed = allLeads.filter((l) => l.isDistributed === true)
    const notDistributed = allLeads.filter((l) => l.isDistributed === false)
    const awaiting = allLeads.filter((l) => l.awaitingAssignment === true)

    console.log('\n📊 RESUMO:')
    console.log(`   Com assignedTo: ${withAssigned.length}`)
    console.log(`   Sem assignedTo: ${withoutAssigned.length}`)
    console.log(`   isDistributed true: ${distributed.length}`)
    console.log(`   isDistributed false: ${notDistributed.length}`)
    console.log(`   awaitingAssignment true: ${awaiting.length}`)

    await mongoose.disconnect()
    console.log('\n🔌 Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

inspectLeads()
