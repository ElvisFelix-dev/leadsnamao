// scripts/fixDistributedLeads.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Lead from '../src/models/Lead.js'

dotenv.config()

async function fixDistributedLeads() {
  try {
    console.log('🔌 Conectando ao MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Conectado\n')

    // ==========================================
    // 1. DIAGNÓSTICO
    // ==========================================
    console.log('🔍 ANALISANDO ESTADO ATUAL...\n')

    const stats = {
      total: await Lead.countDocuments({}),

      // Leads COM corretor atribuído (devem ser considerados distribuídos)
      comCorretor: await Lead.countDocuments({
        assignedTo: { $exists: true, $ne: null },
      }),

      // Leads SEM corretor (verdadeiramente pendentes)
      semCorretor: await Lead.countDocuments({
        $or: [{ assignedTo: { $exists: false } }, { assignedTo: null }],
      }),

      // ⚠️ INCONSISTENTES: Tem corretor MAS isDistributed: false
      inconsistentesIsDistributed: await Lead.countDocuments({
        assignedTo: { $exists: true, $ne: null },
        isDistributed: { $ne: true },
      }),

      // ⚠️ INCONSISTENTES: Tem corretor MAS awaitingAssignment: true
      inconsistentesAwaiting: await Lead.countDocuments({
        assignedTo: { $exists: true, $ne: null },
        awaitingAssignment: true,
      }),

      // ⚠️ INCONSISTENTES: Tem corretor MAS distribution.status: 'queue'
      inconsistentesQueue: await Lead.countDocuments({
        assignedTo: { $exists: true, $ne: null },
        'distribution.status': 'queue',
      }),
    }

    console.log('📊 DIAGNÓSTICO:')
    console.log(`   Total de leads:                          ${stats.total}`)
    console.log(
      `   Com corretor atribuído (assignedTo):     ${stats.comCorretor}`,
    )
    console.log(
      `   Sem corretor (pendentes reais):          ${stats.semCorretor}`,
    )
    console.log('')
    console.log('⚠️  INCONSISTÊNCIAS ENCONTRADAS:')
    console.log(
      `   Com corretor mas isDistributed: false    ${stats.inconsistentesIsDistributed}`,
    )
    console.log(
      `   Com corretor mas awaitingAssignment: true ${stats.inconsistentesAwaiting}`,
    )
    console.log(
      `   Com corretor mas distribution.status=queue ${stats.inconsistentesQueue}`,
    )
    console.log('')

    const totalInconsistentes = Math.max(
      stats.inconsistentesIsDistributed,
      stats.inconsistentesAwaiting,
      stats.inconsistentesQueue,
    )

    if (totalInconsistentes === 0) {
      console.log('🎉 Nenhum lead inconsistente encontrado!')
      await mongoose.disconnect()
      return
    }

    // ==========================================
    // 2. MOSTRAR EXEMPLOS
    // ==========================================
    console.log('📋 EXEMPLOS DE LEADS INCONSISTENTES:\n')

    const examples = await Lead.find({
      assignedTo: { $exists: true, $ne: null },
      $or: [
        { isDistributed: { $ne: true } },
        { awaitingAssignment: true },
        { 'distribution.status': 'queue' },
      ],
    })
      .select(
        'name email region awaitingAssignment isDistributed assignedTo distribution.status',
      )
      .limit(10)
      .lean()

    examples.forEach((lead, i) => {
      console.log(
        `   ${i + 1}. ${lead.name || 'Sem nome'} (${lead.email || 'sem email'})`,
      )
      console.log(`      assignedTo: ${lead.assignedTo || 'null'}`)
      console.log(`      awaitingAssignment: ${lead.awaitingAssignment}`)
      console.log(`      isDistributed: ${lead.isDistributed}`)
      console.log(
        `      distribution.status: ${lead.distribution?.status || 'N/A'}`,
      )
      console.log('')
    })

    // ==========================================
    // 3. CORREÇÃO
    // ==========================================
    console.log(
      `\n🔄 Corrigindo leads com assignedTo mas marcados como pendentes...\n`,
    )

    const now = new Date()

    const result = await Lead.updateMany(
      {
        assignedTo: { $exists: true, $ne: null },
        $or: [
          { isDistributed: { $ne: true } },
          { awaitingAssignment: true },
          { 'distribution.status': 'queue' },
          { distributedAt: null },
        ],
      },
      {
        $set: {
          awaitingAssignment: false,
          isDistributed: true,
          distributedAt: now,
          'distribution.status': 'success',
          'distribution.distributedAt': now,
        },
      },
    )

    console.log(`✅ ${result.modifiedCount} leads corrigidos`)
    console.log(`   (matched: ${result.matchedCount})\n`)

    // ==========================================
    // 4. VERIFICAÇÃO FINAL
    // ==========================================
    const remaining = await Lead.countDocuments({
      assignedTo: { $exists: true, $ne: null },
      $or: [
        { isDistributed: { $ne: true } },
        { awaitingAssignment: true },
        { 'distribution.status': 'queue' },
      ],
    })

    console.log('📊 ESTADO FINAL:')
    console.log(`   Leads ainda inconsistentes: ${remaining}`)
    console.log('')

    if (remaining === 0) {
      console.log('🎉 SUCESSO! Todos os leads estão consistentes.')
    } else {
      console.log('⚠️  Ainda existem leads inconsistentes. Rode novamente.')
    }

    await mongoose.disconnect()
    console.log('✅ Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

fixDistributedLeads()
