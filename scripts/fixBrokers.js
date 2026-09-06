// src/scripts/fixBrokers.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

async function fixBrokers() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/crm',
    )
    console.log('🔌 Conectado ao MongoDB')

    const User = (await import('../src/models/User.js')).default

    // 🔥 VERIFICAR TODOS OS CORRETORES
    const brokers = await User.find({ role: 'broker' })

    console.log(`\n📊 ${brokers.length} corretores encontrados:`)

    for (const broker of brokers) {
      console.log(`\n👤 ${broker.name} (${broker.email})`)
      console.log(
        `   brokerSettings: ${broker.brokerSettings ? '✅ Existe' : '❌ Não existe'}`,
      )

      if (broker.brokerSettings) {
        console.log(`   isActive: ${broker.brokerSettings.isActive}`)
        console.log(
          `   specializedRegions: ${broker.brokerSettings.specializedRegions?.join(', ') || 'Nenhuma'}`,
        )
      }
    }

    // 🔥 CORRIGIR TODOS OS CORRETORES
    const result = await User.updateMany(
      { role: 'broker' },
      {
        $set: {
          'brokerSettings.isActive': true,
          'brokerSettings.specializedRegions': [
            'central',
            'zona_sul',
            'zona_norte',
            'zona_oeste',
            'zona_leste',
          ],
          'brokerSettings.specializedTypes': [
            'apartamento',
            'casa',
            'cobertura',
            'comercial',
            'terreno',
          ],
          'brokerSettings.maxActiveLeads': 50,
          'brokerSettings.priority': 1,
          'leadCounters.totalAssigned': 0,
          'leadCounters.activeLeads': 0,
          'leadCounters.convertedLeads': 0,
          'leadCounters.leadQueuePosition': 0,
        },
      },
    )

    console.log(`\n✅ ${result.modifiedCount} corretores corrigidos!`)

    // 🔥 VERIFICAR NOVAMENTE
    const updatedBrokers = await User.find({ role: 'broker' }).select(
      'name brokerSettings leadCounters',
    )

    console.log('\n📊 CORRETORES ATUALIZADOS:')
    updatedBrokers.forEach((broker) => {
      console.log(`  ${broker.name}:`)
      console.log(`    isActive: ${broker.brokerSettings?.isActive}`)
      console.log(
        `    Regiões: ${broker.brokerSettings?.specializedRegions?.join(', ') || 'Nenhuma'}`,
      )
      console.log(`    Max Leads: ${broker.brokerSettings?.maxActiveLeads}`)
    })

    await mongoose.disconnect()
    console.log('\n🔌 Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

fixBrokers()
