// src/scripts/fixAllPendingLeads.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

async function fixAllPendingLeads() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/crm',
    )
    console.log('🔌 Conectado ao MongoDB')

    const Lead = (await import('../src/models/Lead.js')).default

    // 🔥 CORRIGIR TODOS OS LEADS QUE DEVERIAM ESTAR PENDENTES
    const result = await Lead.updateMany(
      {
        // Leads sem corretor atribuído
        assignedTo: { $exists: false },
        // Leads não distribuídos
        isDistributed: false,
        // Leads não deletados
        isDeleted: { $ne: true },
        // Leads com status ativo (não convertidos/perdidos/arquivados)
        status: { $nin: ['convertido', 'perdido', 'arquivado'] },
      },
      {
        $set: {
          // 🔥 FORÇAR O STATUS CORRETO
          awaitingAssignment: true,
          'distribution.status': 'pending',
          'distribution.attempts': 0,
          'distribution.lastAttemptAt': null,
          'distribution.isAutoDistributed': false,
        },
      },
    )

    console.log(`✅ ${result.modifiedCount} leads corrigidos para 'pending'`)

    // Verificar quantos leads pendentes agora
    const pendingCount = await Lead.countDocuments({
      isDistributed: false,
      assignedTo: { $exists: false },
      isDeleted: { $ne: true },
      status: { $nin: ['convertido', 'perdido', 'arquivado'] },
      awaitingAssignment: true,
      'distribution.status': 'pending',
    })

    console.log(
      `\n📊 Leads pendentes e prontos para distribuição: ${pendingCount}`,
    )

    // Listar os primeiros 10 leads pendentes
    if (pendingCount > 0) {
      const pendingLeads = await Lead.find({
        isDistributed: false,
        assignedTo: { $exists: false },
        isDeleted: { $ne: true },
        status: { $nin: ['convertido', 'perdido', 'arquivado'] },
        awaitingAssignment: true,
        'distribution.status': 'pending',
      })
        .limit(10)
        .select('name region priority awaitingAssignment distribution.status')

      console.log('\n📋 Primeiros 10 leads pendentes:')
      pendingLeads.forEach((lead, index) => {
        console.log(
          `  ${index + 1}. ${lead.name} - ${lead.region} (${lead.priority})`,
        )
        console.log(`     awaitingAssignment: ${lead.awaitingAssignment}`)
        console.log(`     distribution.status: ${lead.distribution?.status}`)
      })
    }

    await mongoose.disconnect()
    console.log('\n🔌 Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

fixAllPendingLeads()
