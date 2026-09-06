// src/scripts/checkPendingLeads.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

async function checkPendingLeads() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/crm',
    )
    console.log('🔌 Conectado ao MongoDB')

    const Lead = (await import('../src/models/Lead.js')).default

    // Contar leads por status
    const total = await Lead.countDocuments({ isDeleted: { $ne: true } })
    const distributed = await Lead.countDocuments({
      isDistributed: true,
      isDeleted: { $ne: true },
    })
    const pending = await Lead.countDocuments({
      isDistributed: false,
      assignedTo: { $exists: false },
      isDeleted: { $ne: true },
    })

    console.log('\n📊 ESTATÍSTICAS DE LEADS:')
    console.log(`  📋 Total de leads: ${total}`)
    console.log(`  ✅ Leads distribuídos: ${distributed}`)
    console.log(`  ⏳ Leads pendentes: ${pending}`)
    console.log(
      `  📊 Taxa de distribuição: ${total > 0 ? Math.round((distributed / total) * 100) : 0}%`,
    )

    if (pending > 0) {
      console.log('\n📋 LEADS PENDENTES:')
      const pendingLeads = await Lead.find({
        isDistributed: false,
        assignedTo: { $exists: false },
        isDeleted: { $ne: true },
      }).select('name region priority sourceType createdAt')

      pendingLeads.forEach((lead, index) => {
        console.log(
          `  ${index + 1}. ${lead.name} - ${lead.region} (${lead.priority}) - Criado: ${lead.createdAt.toLocaleDateString()}`,
        )
      })
    } else {
      console.log('\n✅ Nenhum lead pendente!')
    }

    await mongoose.disconnect()
    console.log('\n🔌 Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

checkPendingLeads()
