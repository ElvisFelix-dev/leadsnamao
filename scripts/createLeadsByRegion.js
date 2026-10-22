// src/scripts/createLeadsByRegion.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { LEAD_STAGES } from '../src/constants/leadStages.js'
import { LEAD_STATUS } from '../src/constants/leadStatus.js'
import { LEAD_PRIORITY } from '../src/constants/leadPriority.js'
import { LEAD_SOURCE_TYPE } from '../src/constants/leadSourceType.js'

dotenv.config()

async function createLeadsByRegion() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/crm',
    )
    console.log('🔌 Conectado ao MongoDB')

    const Lead = (await import('../src/models/Lead.js')).default

    // Definir leads específicos para testar cada região
    const leadsToCreate = [
      {
        name: 'Raquel Rosa',
        email: 'raquel.zona.sul@teste.com',
        phone: '15981104901',
        region: 'zona_sul',
        priority: LEAD_PRIORITY.HIGH,
      },
      {
        name: 'Mari Lecker',
        email: 'mari.zona.norte@teste.com',
        phone: '22913502112',
        region: 'zona_norte',
        priority: LEAD_PRIORITY.MEDIUM,
      },
      {
        name: 'Carl Jhonson',
        email: 'carl.central@teste.com',
        phone: '11999721323',
        region: 'central',
        priority: LEAD_PRIORITY.HIGH,
      },
      {
        name: 'Jessica Costa',
        email: 'jessica.zona.oeste@teste.com',
        phone: '1998011014',
        region: 'zona_oeste',
        priority: LEAD_PRIORITY.LOW,
      },
      {
        name: 'Karina Bezerra',
        email: 'karina.zona.leste@teste.com',
        phone: '119963157405',
        region: 'zona_leste',
        priority: LEAD_PRIORITY.MEDIUM,
      },
      {
        name: 'Carla Citta',
        email: 'carla.abc@teste.com',
        phone: '13950572290',
        region: 'abc',
        priority: LEAD_PRIORITY.HIGH,
      },
      {
        name: 'Jefferson Clinton',
        email: 'jefferson.grande.sp@teste.com',
        phone: '45919490117',
        region: 'grande_sp',
        priority: LEAD_PRIORITY.LOW,
      },
    ]

    console.log('\n📊 Criando leads específicos...')

    const createdLeads = []
    for (const leadData of leadsToCreate) {
      // Verificar se já existe
      const existing = await Lead.findOne({ email: leadData.email })
      if (existing) {
        console.log(`  ⚠️ Lead ${leadData.email} já existe. Pulando...`)
        continue
      }

      const lead = new Lead({
        ...leadData,
        source: 'zap',
        sourceType: LEAD_SOURCE_TYPE.MANUAL,
        status: LEAD_STATUS.NEW,
        stage: LEAD_STAGES.NEW,
        awaitingAssignment: true,
        isDistributed: false,
        'distribution.status': 'pending',
        'distribution.attempts': 0,
        notes: `Lead criado para teste de distribuição na região ${leadData.region}`,
      })

      await lead.save()
      createdLeads.push(lead)
      console.log(`  ✅ ${lead.name} - ${lead.region} (${lead.priority})`)
    }

    console.log(`\n✅ ${createdLeads.length} leads criados com sucesso!`)

    // Listar todos os leads pendentes
    const pendingLeads = await Lead.find({
      isDistributed: false,
      assignedTo: { $exists: false },
      isDeleted: { $ne: true },
    }).select('name region priority sourceType')

    console.log('\n📊 Leads pendentes:')
    pendingLeads.forEach((lead, index) => {
      console.log(
        `  ${index + 1}. ${lead.name} - ${lead.region} (${lead.priority})`,
      )
    })

    await mongoose.disconnect()
    console.log('\n🔌 Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

createLeadsByRegion()
