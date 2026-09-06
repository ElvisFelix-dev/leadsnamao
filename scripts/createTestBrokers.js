// src/scripts/createTestBrokers.js
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

async function createTestBrokers() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/crm',
    )
    console.log('🔌 Conectado ao MongoDB')

    const User = (await import('../src/models/User.js')).default

    // Verificar se já existem corretores
    const existingBrokers = await User.find({ role: 'broker' })
    if (existingBrokers.length > 0) {
      console.log(
        `📊 Já existem ${existingBrokers.length} corretores cadastrados:`,
      )
      existingBrokers.forEach((broker, index) => {
        console.log(`  ${index + 1}. ${broker.name} (${broker.email})`)
        console.log(
          `     - Regiões: ${broker.brokerSettings?.specializedRegions?.join(', ') || 'Nenhuma'}`,
        )
        console.log(
          `     - Leads ativos: ${broker.leadCounters?.activeLeads || 0}`,
        )
      })

      // Perguntar se deseja continuar
      console.log(
        '\n⚠️  Já existem corretores cadastrados. Deseja criar mais? (Ctrl+C para cancelar)',
      )
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }

    // Dados dos corretores de teste
    const brokersData = [
      {
        name: 'João Silva',
        email: 'joao@corretor.com',
        password: '123456',
        phone: '+5511999999991',
        position: 'Corretor Especialista',
        creci: 'CRECI-12345',
        role: 'broker',
        isActive: true,
        brokerSettings: {
          specializedRegions: ['zona_sul', 'central'],
          specializedTypes: ['apartamento', 'casa'],
          isActive: true,
          maxActiveLeads: 50,
          priority: 2,
          availableDays: [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
          ],
          workHours: {
            start: '09:00',
            end: '18:00',
          },
          acceptedLeadTypes: ['venda', 'aluguel'],
        },
        leadCounters: {
          totalAssigned: 0,
          activeLeads: 0,
          convertedLeads: 0,
          lastLeadReceivedAt: null,
          leadQueuePosition: 0,
        },
      },
      {
        name: 'Maria Oliveira',
        email: 'maria@corretor.com',
        password: '123456',
        phone: '+5511999999992',
        position: 'Corretora de Luxo',
        creci: 'CRECI-67890',
        role: 'broker',
        isActive: true,
        brokerSettings: {
          specializedRegions: ['zona_norte', 'central'],
          specializedTypes: ['cobertura', 'apartamento'],
          isActive: true,
          maxActiveLeads: 40,
          priority: 1,
          availableDays: [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
          ],
          workHours: {
            start: '08:00',
            end: '20:00',
          },
          acceptedLeadTypes: ['venda'],
        },
        leadCounters: {
          totalAssigned: 0,
          activeLeads: 0,
          convertedLeads: 0,
          lastLeadReceivedAt: null,
          leadQueuePosition: 0,
        },
      },
      {
        name: 'Pedro Santos',
        email: 'pedro@corretor.com',
        password: '123456',
        phone: '+5511999999993',
        position: 'Corretor Comercial',
        creci: 'CRECI-13579',
        role: 'broker',
        isActive: true,
        brokerSettings: {
          specializedRegions: ['zona_oeste', 'zona_leste'],
          specializedTypes: ['comercial', 'terreno'],
          isActive: true,
          maxActiveLeads: 60,
          priority: 0,
          availableDays: [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
          ],
          workHours: {
            start: '09:00',
            end: '19:00',
          },
          acceptedLeadTypes: ['venda', 'aluguel'],
        },
        leadCounters: {
          totalAssigned: 0,
          activeLeads: 0,
          convertedLeads: 0,
          lastLeadReceivedAt: null,
          leadQueuePosition: 0,
        },
      },
      {
        name: 'Ana Costa',
        email: 'ana@corretor.com',
        password: '123456',
        phone: '+5511999999994',
        position: 'Corretora de Alto Padrão',
        creci: 'CRECI-24680',
        role: 'broker',
        isActive: true,
        brokerSettings: {
          specializedRegions: ['central', 'zona_sul'],
          specializedTypes: ['apartamento', 'cobertura'],
          isActive: true,
          maxActiveLeads: 30,
          priority: 3,
          availableDays: [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
          ],
          workHours: {
            start: '10:00',
            end: '20:00',
          },
          acceptedLeadTypes: ['venda'],
        },
        leadCounters: {
          totalAssigned: 0,
          activeLeads: 0,
          convertedLeads: 0,
          lastLeadReceivedAt: null,
          leadQueuePosition: 0,
        },
      },
      {
        name: 'Carlos Lima',
        email: 'carlos@corretor.com',
        password: '123456',
        phone: '+5511999999995',
        position: 'Corretor de Locação',
        creci: 'CRECI-97531',
        role: 'broker',
        isActive: true,
        brokerSettings: {
          specializedRegions: ['zona_leste', 'zona_norte'],
          specializedTypes: ['casa', 'apartamento'],
          isActive: true,
          maxActiveLeads: 45,
          priority: 1,
          availableDays: [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
          ],
          workHours: {
            start: '08:00',
            end: '18:00',
          },
          acceptedLeadTypes: ['aluguel'],
        },
        leadCounters: {
          totalAssigned: 0,
          activeLeads: 0,
          convertedLeads: 0,
          lastLeadReceivedAt: null,
          leadQueuePosition: 0,
        },
      },
    ]

    // Criar os corretores
    let createdCount = 0
    for (const brokerData of brokersData) {
      const existing = await User.findOne({ email: brokerData.email })
      if (existing) {
        console.log(`⚠️  Corretor ${brokerData.email} já existe. Pulando...`)
        continue
      }

      // Hash da senha
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(brokerData.password, salt)

      const broker = new User({
        ...brokerData,
        password: hashedPassword,
        // Garantir que os campos estejam corretos
        isAdmin: false,
        isBroker: true,
        stats: {
          leads: 0,
          visits: 0,
          deals: 0,
          revenue: 0,
        },
        performance: {
          points: 0,
          level: 1,
          badges: [],
          achievements: [],
        },
        settings: {
          monthlyGoal: 10,
          commissionPercentage: 3,
          themeColor: '#2563EB',
          notifications: true,
          language: 'pt-BR',
          showcaseEnabled: true,
        },
      })

      await broker.save()
      createdCount++
      console.log(`✅ Corretor criado: ${broker.name} (${broker.email})`)
      console.log(
        `   - Regiões: ${broker.brokerSettings?.specializedRegions?.join(', ')}`,
      )
      console.log(
        `   - Tipos: ${broker.brokerSettings?.specializedTypes?.join(', ')}`,
      )
      console.log(`   - Prioridade: ${broker.brokerSettings?.priority}`)
      console.log(`   - Max Leads: ${broker.brokerSettings?.maxActiveLeads}`)
    }

    console.log(`\n✅ ${createdCount} corretores criados com sucesso!`)

    // Listar todos os corretores
    const allBrokers = await User.find({ role: 'broker' }).select(
      'name email brokerSettings leadCounters',
    )
    console.log('\n📊 Resumo dos corretores:')
    allBrokers.forEach((broker, index) => {
      console.log(`  ${index + 1}. ${broker.name} (${broker.email})`)
      console.log(
        `     - Ativo: ${broker.brokerSettings?.isActive ? '✅' : '❌'}`,
      )
      console.log(
        `     - Regiões: ${broker.brokerSettings?.specializedRegions?.join(', ') || 'Nenhuma'}`,
      )
      console.log(
        `     - Leads ativos: ${broker.leadCounters?.activeLeads || 0}`,
      )
      console.log(
        `     - Posição na fila: ${broker.leadCounters?.leadQueuePosition || 0}`,
      )
    })

    await mongoose.disconnect()
    console.log('\n🔌 Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

createTestBrokers()
