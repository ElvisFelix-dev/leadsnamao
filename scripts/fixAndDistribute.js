// src/scripts/fixAndDistribute.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { autoDistributeLead } from '../src/service/leadDistributionService.js'

dotenv.config()

async function fixAndDistribute() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/crm',
    )
    console.log('🔌 Conectado ao MongoDB')

    const Lead = (await import('../src/models/Lead.js')).default

    // 🔥 1. CORRIGIR TODOS OS LEADS COM STATUS 'queue' PARA 'pending'
    const fixResult = await Lead.updateMany(
      {
        'distribution.status': 'queue',
        isDistributed: false,
        assignedTo: null,
        isDeleted: { $ne: true },
        status: { $nin: ['convertido', 'perdido', 'arquivado'] },
      },
      {
        $set: {
          'distribution.status': 'pending',
          'distribution.attempts': 0,
          'distribution.lastAttemptAt': null,
          'distribution.isAutoDistributed': false,
          awaitingAssignment: true,
        },
      },
    )

    console.log(
      `✅ ${fixResult.modifiedCount} leads corrigidos de 'queue' para 'pending'`,
    )

    // 🔥 2. BUSCAR LEADS COM DISTRIBUTION.STATUS = 'PENDING'
    const pendingLeads = await Lead.find({
      'distribution.status': 'pending',
      isDistributed: false,
      assignedTo: null,
      isDeleted: { $ne: true },
      status: { $nin: ['convertido', 'perdido', 'arquivado'] },
    }).select('_id name region priority')

    console.log(`\n📊 ${pendingLeads.length} leads prontos para distribuição`)

    if (pendingLeads.length === 0) {
      console.log('⚠️  Nenhum lead pendente para distribuir.')
      await mongoose.disconnect()
      return
    }

    // Mostrar os leads
    console.log('\n📋 Leads a serem distribuídos:')
    pendingLeads.forEach((lead, index) => {
      console.log(
        `  ${index + 1}. ${lead.name} - ${lead.region} (${lead.priority})`,
      )
    })

    // 🔥 3. DISTRIBUIR CADA LEAD
    let successCount = 0
    let failCount = 0

    for (const lead of pendingLeads) {
      try {
        console.log(`\n🔄 Distribuindo: ${lead.name} (${lead.region})`)

        const result = await autoDistributeLead({
          leadId: lead._id,
          region: lead.region,
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

    // 🔥 4. RESUMO
    console.log('\n' + '='.repeat(60))
    console.log('📊 RESUMO DA DISTRIBUIÇÃO:')
    console.log('='.repeat(60))
    console.log(`  ✅ Distribuídos: ${successCount}`)
    console.log(`  ❌ Falhas: ${failCount}`)
    console.log(`  📋 Total: ${pendingLeads.length}`)

    // 🔥 5. VERIFICAR STATUS FINAL
    const distributed = await Lead.countDocuments({
      isDistributed: true,
      assignedTo: { $ne: null },
      isDeleted: { $ne: true },
    })

    const pending = await Lead.countDocuments({
      isDistributed: false,
      assignedTo: null,
      isDeleted: { $ne: true },
      status: { $nin: ['convertido', 'perdido', 'arquivado'] },
    })

    console.log('\n📊 STATUS FINAL:')
    console.log(`  ✅ Leads distribuídos: ${distributed}`)
    console.log(`  ⏳ Leads pendentes: ${pending}`)

    // 🔥 6. MOSTRAR CORRETORES COM LEADS
    const User = (await import('../src/models/User.js')).default
    const brokers = await User.find({ role: 'broker' }).select(
      'name leadCounters',
    )

    console.log('\n📊 STATUS DOS CORRETORES:')
    brokers.forEach((broker) => {
      const active = broker.leadCounters?.activeLeads || 0
      const total = broker.leadCounters?.totalAssigned || 0
      console.log(`  ${broker.name}: ${active} leads ativos (total: ${total})`)
    })

    await mongoose.disconnect()
    console.log('\n🔌 Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

fixAndDistribute()
