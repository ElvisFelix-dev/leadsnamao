// src/scripts/generateTestLeads.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { LEAD_STAGES } from '../src/constants/leadStages.js'
import { LEAD_STATUS } from '../src/constants/leadStatus.js'
import { LEAD_PRIORITY } from '../src/constants/leadPriority.js'
import { LEAD_SOURCE_TYPE } from '../src/constants/leadSourceType.js'

dotenv.config()

async function generateTestLeads() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/crm',
    )
    console.log('🔌 Conectado ao MongoDB')

    const Lead = (await import('../src/models/Lead.js')).default

    // Verificar leads existentes
    const existingLeads = await Lead.countDocuments({
      isDeleted: { $ne: true },
    })
    console.log(`📊 Leads existentes: ${existingLeads}`)

    // Dados para gerar leads
    const regions = [
      'zona_sul',
      'zona_norte',
      'central',
      'zona_oeste',
      'zona_leste',
      'abc',
      'grande_sp',
    ]
    const names = [
      'Ana Paula Souza',
      'Carlos Eduardo Lima',
      'Fernanda Oliveira',
      'Ricardo Santos',
      'Patrícia Costa',
      'Marcelo Ferreira',
      'Juliana Almeida',
      'Roberto Nunes',
      'Cristina Rocha',
      'André Carvalho',
      'Simone Pereira',
      'Gustavo Ribeiro',
      'Luciana Martins',
      'Fernando Silva',
      'Tatiana Gomes',
    ]
    const priorities = [
      LEAD_PRIORITY.HIGH,
      LEAD_PRIORITY.MEDIUM,
      LEAD_PRIORITY.LOW,
    ]

    // 🔥 USANDO OS VALORES CORRETOS DO LEAD_SOURCE_TYPE
    const sourceTypes = [
      LEAD_SOURCE_TYPE.COMPANY_SITE,
      LEAD_SOURCE_TYPE.META,
      LEAD_SOURCE_TYPE.OLX,
      LEAD_SOURCE_TYPE.ZAP,
      LEAD_SOURCE_TYPE.MANUAL,
      LEAD_SOURCE_TYPE.CRM,
    ]

    // Mapeamento para o campo 'source' (legado)
    const sourceMap = {
      [LEAD_SOURCE_TYPE.COMPANY_SITE]: 'site',
      [LEAD_SOURCE_TYPE.META]: 'meta',
      [LEAD_SOURCE_TYPE.OLX]: 'olx',
      [LEAD_SOURCE_TYPE.ZAP]: 'zap',
      [LEAD_SOURCE_TYPE.MANUAL]: 'manual',
      [LEAD_SOURCE_TYPE.CRM]: 'manual',
    }

    console.log('\n📊 Gerando leads de teste...')

    const createdLeads = []
    const leadsPerRegion = 3 // 3 leads por região

    for (const region of regions) {
      for (let i = 0; i < leadsPerRegion; i++) {
        const randomName = names[Math.floor(Math.random() * names.length)]
        const randomPriority =
          priorities[Math.floor(Math.random() * priorities.length)]
        const randomSourceType =
          sourceTypes[Math.floor(Math.random() * sourceTypes.length)]
        const index = createdLeads.length + 1

        const lead = new Lead({
          name: `${randomName} ${index}`,
          email: `cliente${index}@teste.com`,
          phone: `1199999${String(index).padStart(4, '0')}`,
          region,
          source: sourceMap[randomSourceType] || 'manual',
          sourceType: randomSourceType, // 🔥 USANDO VALOR CORRETO
          status: LEAD_STATUS.NEW,
          stage: LEAD_STAGES.NEW,
          priority: randomPriority,
          awaitingAssignment: true,
          isDistributed: false,
          'distribution.status': 'pending',
          'distribution.attempts': 0,
        })

        await lead.save()
        createdLeads.push(lead)

        console.log(
          `  ✅ Lead ${index}: ${lead.name} - ${lead.region} (${lead.priority}) - ${lead.sourceType}`,
        )
      }
    }

    console.log(`\n✅ ${createdLeads.length} leads criados com sucesso!`)

    // Resumo por região
    const summary = await Lead.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          isDistributed: false,
          assignedTo: { $exists: false },
        },
      },
      {
        $group: {
          _id: '$region',
          count: { $sum: 1 },
          priorities: {
            $push: '$priority',
          },
        },
      },
      { $sort: { count: -1 } },
    ])

    console.log('\n📊 Resumo dos leads pendentes por região:')
    summary.forEach((item) => {
      console.log(`  - ${item._id}: ${item.count} leads`)
    })

    // Total de leads pendentes
    const pendingLeads = await Lead.countDocuments({
      isDistributed: false,
      assignedTo: { $exists: false },
      isDeleted: { $ne: true },
    })

    console.log(`\n📊 Total de leads pendentes: ${pendingLeads}`)

    await mongoose.disconnect()
    console.log('\n🔌 Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

generateTestLeads()
