// src/scripts/fixQueueLeads.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

async function fixQueueLeads() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/crm',
    )
    console.log('🔌 Conectado ao MongoDB')

    const Lead = (await import('../src/models/Lead.js')).default

    // 🔥 CORRIGIR LEADS COM STATUS 'queue' PARA 'pending'
    const result = await Lead.updateMany(
      {
        'distribution.status': 'queue',
        isDistributed: false,
        assignedTo: { $exists: false },
        isDeleted: { $ne: true },
        status: { $nin: ['convertido', 'perdido', 'arquivado'] },
      },
      {
        $set: {
          'distribution.status': 'pending',
          'distribution.attempts': 0,
          'distribution.lastAttemptAt': null,
          awaitingAssignment: true,
        },
      },
    )

    console.log(
      `✅ ${result.modifiedCount} leads corrigidos de 'queue' para 'pending'`,
    )

    // Verificar quantos leads pendentes agora
    const pendingCount = await Lead.countDocuments({
      isDistributed: false,
      assignedTo: { $exists: false },
      isDeleted: { $ne: true },
      status: { $nin: ['convertido', 'perdido', 'arquivado'] },
      'distribution.status': 'pending',
      awaitingAssignment: true,
    })

    console.log(
      `\n📊 Leads pendentes e prontos para distribuição: ${pendingCount}`,
    )

    await mongoose.disconnect()
    console.log('\n🔌 Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

fixQueueLeads()
