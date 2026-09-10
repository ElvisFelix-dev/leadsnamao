// scripts/fixInconsistentAwaitingAssignment.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Lead from '../src/models/Lead.js'

dotenv.config()

async function fixInconsistentAwaitingAssignment() {
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

      // awaitingAssignment true (todos)
      awaitingTrue: await Lead.countDocuments({ awaitingAssignment: true }),

      // awaitingAssignment false (todos)
      awaitingFalse: await Lead.countDocuments({ awaitingAssignment: false }),

      // INCONSISTENTES: awaitingAssignment true MAS já distribuído
      inconsistent: await Lead.countDocuments({
        awaitingAssignment: true,
        $or: [
          { isDistributed: true },
          { assignedTo: { $exists: true, $ne: null } },
        ],
      }),

      // Pendentes legítimos: awaitingAssignment true E SEM corretor
      legitPending: await Lead.countDocuments({
        awaitingAssignment: true,
        isDistributed: { $ne: true },
        assignedTo: { $exists: false },
      }),
    }

    console.log('📊 DIAGNÓSTICO:')
    console.log(`   Total de leads:              ${stats.total}`)
    console.log(`   awaitingAssignment: true     ${stats.awaitingTrue}`)
    console.log(`   awaitingAssignment: false    ${stats.awaitingFalse}`)
    console.log('')
    console.log(`   ⚠️  Inconsistentes:           ${stats.inconsistent}`)
    console.log(`      (true mas já tem corretor)`)
    console.log(`   ✅ Pendentes legítimos:      ${stats.legitPending}`)
    console.log(`      (true e sem corretor)`)
    console.log('')

    if (stats.inconsistent === 0) {
      console.log('🎉 Nenhum lead inconsistente encontrado!')
      console.log('   Todos já estão sincronizados corretamente.')
      await mongoose.disconnect()
      return
    }

    // ==========================================
    // 2. MOSTRAR EXEMPLOS
    // ==========================================
    console.log('📋 EXEMPLOS DE LEADS INCONSISTENTES:')

    const examples = await Lead.find({
      awaitingAssignment: true,
      $or: [
        { isDistributed: true },
        { assignedTo: { $exists: true, $ne: null } },
      ],
    })
      .select(
        'name email region awaitingAssignment isDistributed assignedTo createdAt',
      )
      .limit(5)
      .lean()

    examples.forEach((lead, i) => {
      console.log(
        `   ${i + 1}. ${lead.name || 'Sem nome'} (${lead.email || 'sem email'})`,
      )
      console.log(`      awaitingAssignment: ${lead.awaitingAssignment}`)
      console.log(`      isDistributed: ${lead.isDistributed}`)
      console.log(`      assignedTo: ${lead.assignedTo || 'null'}`)
      console.log('')
    })

    // ==========================================
    // 3. CONFIRMAÇÃO (se rodar interativo)
    // ==========================================
    // Descomente se quiser confirmação manual:
    //
    // const readline = await import('readline')
    // const rl = readline.createInterface({
    //   input: process.stdin,
    //   output: process.stdout,
    // })
    //
    // const confirm = await new Promise((resolve) => {
    //   rl.question(`\n⚠️  Corrigir ${stats.inconsistent} leads? (s/N): `, resolve)
    // })
    // rl.close()
    //
    // if (confirm.toLowerCase() !== 's') {
    //   console.log('❌ Operação cancelada.')
    //   await mongoose.disconnect()
    //   return
    // }

    // ==========================================
    // 4. CORREÇÃO
    // ==========================================
    console.log(
      `\n🔄 Corrigindo ${stats.inconsistent} leads inconsistentes...\n`,
    )

    const result = await Lead.updateMany(
      {
        awaitingAssignment: true,
        $or: [
          { isDistributed: true },
          { assignedTo: { $exists: true, $ne: null } },
        ],
      },
      {
        $set: {
          awaitingAssignment: false,
        },
      },
    )

    console.log(`✅ ${result.modifiedCount} leads corrigidos`)
    console.log(`   (matched: ${result.matchedCount})\n`)

    // ==========================================
    // 5. VERIFICAÇÃO FINAL
    // ==========================================
    const remainingInconsistent = await Lead.countDocuments({
      awaitingAssignment: true,
      $or: [
        { isDistributed: true },
        { assignedTo: { $exists: true, $ne: null } },
      ],
    })

    const finalAwaitingTrue = await Lead.countDocuments({
      awaitingAssignment: true,
    })
    const finalAwaitingFalse = await Lead.countDocuments({
      awaitingAssignment: false,
    })

    console.log('📊 ESTADO FINAL:')
    console.log(`   awaitingAssignment: true  → ${finalAwaitingTrue}`)
    console.log(`   awaitingAssignment: false → ${finalAwaitingFalse}`)
    console.log(`   Inconsistentes restantes: ${remainingInconsistent}`)
    console.log('')

    if (remainingInconsistent === 0) {
      console.log('🎉 SUCESSO! Todos os leads estão consistentes.')
    } else {
      console.log(
        '⚠️  Ainda existem leads inconsistentes. Verifique manualmente.',
      )
    }

    await mongoose.disconnect()
    console.log('✅ Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

fixInconsistentAwaitingAssignment()
