// src/scripts/syncBrokerSettings.js
import mongoose from 'mongoose'
import User from '../src/models/User.js'
import dotenv from 'dotenv'

dotenv.config()

async function syncBrokerSettings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('🔌 Conectado ao MongoDB')

    // Atualizar todos os corretores com configurações padrão
    const result = await User.updateMany(
      {
        role: 'broker',
        'brokerSettings.isActive': { $exists: false },
      },
      {
        $set: {
          brokerSettings: {
            specializedRegions: [],
            specializedTypes: [],
            isActive: true,
            maxActiveLeads: 50,
            priority: 0,
          },
          leadCounters: {
            totalAssigned: 0,
            activeLeads: 0,
            convertedLeads: 0,
            lastLeadReceivedAt: null,
            leadQueuePosition: 0,
          },
        },
      },
    )

    console.log(
      `✅ ${result.modifiedCount} corretores atualizados com sucesso!`,
    )

    // Listar corretores
    const brokers = await User.find({
      role: 'broker',
      isDeleted: false,
    }).select('name email brokerSettings')

    console.log('\n📊 Corretores configurados:')
    brokers.forEach((broker, index) => {
      console.log(`${index + 1}. ${broker.name} (${broker.email})`)
      console.log(
        `   - Ativo: ${broker.brokerSettings?.isActive ? '✅' : '❌'}`,
      )
      console.log(
        `   - Regiões: ${broker.brokerSettings?.specializedRegions?.join(', ') || 'Nenhuma'}`,
      )
      console.log(
        `   - Máximo de leads: ${broker.brokerSettings?.maxActiveLeads || 50}`,
      )
    })

    await mongoose.disconnect()
    console.log('\n🔌 Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

syncBrokerSettings()
