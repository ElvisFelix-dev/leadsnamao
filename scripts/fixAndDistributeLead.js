// src/scripts/fixAndDistributeLead.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { autoDistributeLead } from '../src/service/leadDistributionService.js'

dotenv.config()

async function fixAndDistributeLead() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/crm',
    )
    console.log('🔌 Conectado ao MongoDB')

    const Lead = (await import('../src/models/Lead.js')).default

    // 🔥 BUSCAR O LEAD PELO NOME
    const lead = await Lead.findOne({
      name: 'Memphis Depay',
      isDeleted: { $ne: true },
    })

    if (!lead) {
      console.log('❌ Lead "Memphis Depay" não encontrado.')
      await mongoose.disconnect()
      return
    }

    console.log(`\n📊 Lead encontrado:`)
    console.log(`  ID: ${lead._id}`)
    console.log(`  Nome: ${lead.name}`)
    console.log(`  Região: ${lead.region}`)
    console.log(`  assignedTo: ${lead.assignedTo || 'null'}`)
    console.log(`  awaitingAssignment: ${lead.awaitingAssignment}`)
    console.log(`  isDistributed: ${lead.isDistributed}`)
    console.log(`  distribution.status: ${lead.distribution?.status}`)

    // 🔥 CORRIGIR O LEAD
    lead.awaitingAssignment = true
    lead.isDistributed = false
    lead.distribution.status = 'pending'
    lead.distribution.attempts = 0
    lead.distribution.lastAttemptAt = null
    lead.distribution.isAutoDistributed = false
    lead.distribution.region = lead.region || 'central'
    await lead.save()

    console.log(`\n✅ Lead corrigido:`)
    console.log(`  awaitingAssignment: ${lead.awaitingAssignment}`)
    console.log(`  distribution.status: ${lead.distribution?.status}`)

    // 🔥 DISTRIBUIR
    console.log(`\n🔄 Distribuindo lead...`)

    const result = await autoDistributeLead({
      leadId: lead._id,
      region: lead.region || 'central',
      propertyId: lead.property,
      createdBy: null,
    })

    console.log('\n📊 RESULTADO:')
    console.log(`  ✅ Sucesso: ${result.success}`)
    console.log(`  📝 Mensagem: ${result.message}`)

    if (result.assignedTo) {
      console.log(`  👤 Corretor: ${result.assignedTo.name}`)
      console.log(`  📧 Email: ${result.assignedTo.email}`)
      console.log(`  🎯 Método: ${result.matchMethod}`)
    } else if (result.inQueue) {
      console.log(`  ⏳ Lead em fila de espera`)
    }

    // 🔥 VERIFICAR LEAD ATUALIZADO
    const updatedLead = await Lead.findById(lead._id).populate(
      'assignedTo',
      'name email',
    )
    console.log(`\n📋 LEAD ATUALIZADO:`)
    console.log(`  Nome: ${updatedLead.name}`)
    console.log(`  assignedTo: ${updatedLead.assignedTo?.name || 'Nenhum'}`)
    console.log(`  isDistributed: ${updatedLead.isDistributed}`)
    console.log(`  awaitingAssignment: ${updatedLead.awaitingAssignment}`)
    console.log(`  distribution.status: ${updatedLead.distribution?.status}`)

    await mongoose.disconnect()
    console.log('\n🔌 Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

fixAndDistributeLead()
