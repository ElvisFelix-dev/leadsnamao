// src/scripts/fixAndDistributeAllPending.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { autoDistributeLead } from '../src/service/leadDistributionService.js'

dotenv.config()

async function fixAndDistributeAllPending() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/crm',
    )
    console.log('🔌 Conectado ao MongoDB')

    const Lead = (await import('../src/models/Lead.js')).default

    // 🔥 BUSCAR TODOS OS LEADS PENDENTES (NÃO DISTRIBUÍDOS)
    const pendingLeads = await Lead.find({
      isDistributed: false,
      assignedTo: null,
      isDeleted: { $ne: true },
      status: { $nin: ['convertido', 'perdido', 'arquivado'] },
    })

    console.log(`\n📊 Encontrados ${pendingLeads.length} leads pendentes:`)

    pendingLeads.forEach((lead, index) => {
      console.log(`  ${index + 1}. ${lead.name}`)
      console.log(`     Email: ${lead.email}`)
      console.log(`     Região: ${lead.region}`)
      console.log(`     awaitingAssignment: ${lead.awaitingAssignment}`)
      console.log(`     Criado em: ${lead.createdAt.toLocaleDateString()}`)
      console.log('')
    })

    if (pendingLeads.length === 0) {
      console.log('✅ Nenhum lead pendente para distribuir.')
      await mongoose.disconnect()
      return
    }

    let successCount = 0
    let failCount = 0
    const alreadyAssigned = 0

    for (const lead of pendingLeads) {
      try {
        console.log(`\n🔄 Processando: ${lead.name} (${lead.region})`)

        // 🔥 1. CORRIGIR O LEAD
        lead.awaitingAssignment = true
        lead.isDistributed = false
        lead.distribution.status = 'pending'
        lead.distribution.attempts = 0
        lead.distribution.lastAttemptAt = null
        lead.distribution.isAutoDistributed = false
        lead.distribution.region = lead.region || 'central'
        await lead.save()

        console.log(
          `  ✅ Lead corrigido (awaitingAssignment: ${lead.awaitingAssignment})`,
        )

        // 🔥 2. TENTAR DISTRIBUIR
        const result = await autoDistributeLead({
          leadId: lead._id,
          region: lead.region || 'central',
          propertyId: lead.property || null,
          createdBy: null,
        })

        if (result.success) {
          successCount++
          console.log(
            `  ✅ Distribuído para: ${result.assignedTo?.name || 'N/A'}`,
          )

          // 🔥 MARCAR COMO DISTRIBUÍDO
          lead.isDistributed = true
          lead.awaitingAssignment = false
          if (result.assignedTo) {
            lead.assignedTo = result.assignedTo._id || result.assignedTo
          }
          lead.distribution.status = 'success'
          lead.distribution.method = result.matchMethod || 'automatic'
          lead.distribution.isAutoDistributed = true
          lead.distribution.distributedAt = new Date()
          await lead.save()
        } else if (result.inQueue) {
          console.log(`  ⏳ Em fila de espera: ${result.message}`)
          failCount++
        } else {
          console.log(`  ❌ Falha: ${result.message}`)
          failCount++
        }
      } catch (error) {
        failCount++
        console.error(`  ❌ Erro: ${error.message}`)
      }
    }

    // 🔥 3. RESUMO
    console.log('\n' + '='.repeat(60))
    console.log('📊 RESUMO DA DISTRIBUIÇÃO:')
    console.log('='.repeat(60))
    console.log(`  ✅ Distribuídos: ${successCount}`)
    console.log(`  ❌ Falhas: ${failCount}`)
    console.log(`  📋 Total processados: ${pendingLeads.length}`)

    // 🔥 4. VERIFICAR RESULTADO FINAL
    const remaining = await Lead.countDocuments({
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
    console.log(`  ⏳ Leads pendentes: ${remaining}`)

    // 🔥 5. LISTAR CORRETORES ATUALIZADOS
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

fixAndDistributeAllPending()
