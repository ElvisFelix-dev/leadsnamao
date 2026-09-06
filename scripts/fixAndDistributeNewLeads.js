// src/scripts/fixAndDistributeNewLeads.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { autoDistributeLead } from '../src/service/leadDistributionService.js'

dotenv.config()

async function fixAndDistributeNewLeads() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/crm',
    )
    console.log('🔌 Conectado ao MongoDB')

    const Lead = (await import('../src/models/Lead.js')).default

    // 🔥 1. BUSCAR OS LEADS ESPECÍFICOS
    const leads = await Lead.find({
      name: { $in: ['Carlitos Tevez', 'Bebeto Silva'] },
      isDeleted: { $ne: true },
    })

    console.log(`\n📊 Encontrados ${leads.length} leads:`)
    leads.forEach((lead, index) => {
      console.log(`  ${index + 1}. ${lead.name}`)
      console.log(`     Região: ${lead.region}`)
      console.log(`     awaitingAssignment: ${lead.awaitingAssignment}`)
      console.log(`     distribution.status: ${lead.distribution?.status}`)
      console.log(`     isDistributed: ${lead.isDistributed}`)
    })

    // 🔥 2. CORRIGIR E DISTRIBUIR CADA LEAD
    let successCount = 0
    let failCount = 0

    for (const lead of leads) {
      try {
        console.log(`\n🔄 Corrigindo e distribuindo: ${lead.name}`)

        // 🔥 CORRIGIR O LEAD
        lead.awaitingAssignment = true
        lead.isDistributed = false
        lead.distribution.status = 'pending'
        lead.distribution.attempts = 0
        lead.distribution.lastAttemptAt = null
        lead.distribution.isAutoDistributed = false
        await lead.save()

        console.log(
          `  ✅ Lead corrigido (awaitingAssignment: ${lead.awaitingAssignment})`,
        )

        // 🔥 DISTRIBUIR
        const result = await autoDistributeLead({
          leadId: lead._id,
          region: lead.region || 'central',
          createdBy: null,
        })

        if (result.success) {
          successCount++
          console.log(
            `  ✅ Distribuído para: ${result.assignedTo?.name || 'N/A'}`,
          )
        } else {
          failCount++
          console.log(`  ❌ Falha: ${result.message}`)
        }
      } catch (error) {
        failCount++
        console.error(`  ❌ Erro: ${error.message}`)
      }
    }

    console.log('\n📊 RESUMO:')
    console.log(`  ✅ Sucessos: ${successCount}`)
    console.log(`  ❌ Falhas: ${failCount}`)

    // 🔥 3. VERIFICAR RESULTADO FINAL
    const pending = await Lead.countDocuments({
      isDistributed: false,
      assignedTo: null,
      isDeleted: { $ne: true },
      status: { $nin: ['convertido', 'perdido', 'arquivado'] },
    })

    const distributed = await Lead.countDocuments({
      isDistributed: true,
      assignedTo: { $ne: null },
      isDeleted: { $ne: true },
    })

    console.log('\n📊 STATUS FINAL:')
    console.log(`  ✅ Leads distribuídos: ${distributed}`)
    console.log(`  ⏳ Leads pendentes: ${pending}`)

    await mongoose.disconnect()
    console.log('\n🔌 Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

fixAndDistributeNewLeads()
