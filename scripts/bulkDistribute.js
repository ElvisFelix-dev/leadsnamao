// src/scripts/bulkDistribute.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { LEAD_STAGES } from '../src/constants/leadStages.js'
import { LEAD_STATUS } from '../src/constants/leadStatus.js'
import { LEAD_PRIORITY } from '../src/constants/leadPriority.js'
import { processPendingLeads } from '../src/service/leadDistributionService.js'

dotenv.config()

async function bulkDistribute() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/crm',
    )
    console.log('🔌 Conectado ao MongoDB')

    const Lead = (await import('../src/models/Lead.js')).default

    // Criar múltiplos leads de teste
    console.log('📊 Criando leads de teste...')

    const testLeads = []
    const regions = [
      'zona_sul',
      'zona_norte',
      'central',
      'zona_oeste',
      'zona_leste',
    ]
    const names = [
      'Cliente A',
      'Cliente B',
      'Cliente C',
      'Cliente D',
      'Cliente E',
    ]

    for (let i = 0; i < 10; i++) {
      const lead = new Lead({
        name: `${names[i % names.length]} ${i + 1}`,
        email: `cliente${i + 1}@teste.com`,
        phone: `119999999${String(i + 1).padStart(2, '0')}`,
        region: regions[i % regions.length],
        source: 'manual',
        sourceType: 'manual',
        status: LEAD_STATUS.NEW,
        stage: LEAD_STAGES.NEW,
        priority: i % 3 === 0 ? LEAD_PRIORITY.HIGH : LEAD_PRIORITY.MEDIUM,
        awaitingAssignment: true,
        'distribution.status': 'pending',
      })

      await lead.save()
      testLeads.push(lead)
      console.log(`  ✅ Lead criado: ${lead.name} (${lead.region})`)
    }

    console.log(
      `\n📊 ${testLeads.length} leads criados. Processando distribuição...`,
    )

    // Processar distribuição
    const result = await processPendingLeads()

    console.log('\n📊 Resultado da distribuição:')
    console.log(`  - Total processados: ${result.totalProcessed}`)
    console.log(`  - Distribuídos: ${result.distributed}`)
    console.log(`  - Falhas: ${result.totalProcessed - result.distributed}`)

    // Verificar resultado final
    const distributed = await Lead.find({ isDistributed: true }).populate(
      'assignedTo',
      'name email',
    )
    const pending = await Lead.find({
      isDistributed: false,
      assignedTo: { $exists: false },
    })

    console.log('\n📊 Status final:')
    console.log(`  - Leads distribuídos: ${distributed.length}`)
    console.log(`  - Leads pendentes: ${pending.length}`)

    if (distributed.length > 0) {
      console.log('\n📋 Leads distribuídos:')
      distributed.forEach((lead, index) => {
        console.log(
          `  ${index + 1}. ${lead.name} -> ${lead.assignedTo?.name || 'N/A'} (${lead.region})`,
        )
      })
    }

    await mongoose.disconnect()
    console.log('\n🔌 Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

bulkDistribute()
