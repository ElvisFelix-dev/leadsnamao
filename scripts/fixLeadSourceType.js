// src/scripts/fixLeadSourceType.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { LEAD_SOURCE_TYPE } from '../src/constants/leadSourceType.js'

dotenv.config()

async function fixLeadSourceType() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/crm',
    )
    console.log('🔌 Conectado ao MongoDB')

    const Lead = (await import('../src/models/Lead.js')).default

    // Buscar leads com sourceType inválido
    const validSourceTypes = Object.values(LEAD_SOURCE_TYPE)

    const invalidLeads = await Lead.find({
      sourceType: { $nin: validSourceTypes },
      isDeleted: { $ne: true },
    })

    console.log(
      `📊 Encontrados ${invalidLeads.length} leads com sourceType inválido:`,
    )

    invalidLeads.forEach((lead, index) => {
      console.log(
        `  ${index + 1}. ${lead.name} - sourceType: "${lead.sourceType}"`,
      )
    })

    if (invalidLeads.length > 0) {
      console.log('\n🔄 Corrigindo leads...')

      let corrected = 0
      for (const lead of invalidLeads) {
        // Mapear valores inválidos para válidos
        let newSourceType = LEAD_SOURCE_TYPE.MANUAL

        if (lead.sourceType === 'public' || lead.sourceType === 'site') {
          newSourceType = LEAD_SOURCE_TYPE.COMPANY_SITE
        } else if (lead.sourceType === 'hotsite') {
          newSourceType = LEAD_SOURCE_TYPE.BROKER_HOTSITE
        } else if (
          lead.sourceType === 'meta' ||
          lead.sourceType === 'facebook'
        ) {
          newSourceType = LEAD_SOURCE_TYPE.META
        } else if (
          lead.sourceType === 'zap' ||
          lead.sourceType === 'zap_imoveis'
        ) {
          newSourceType = LEAD_SOURCE_TYPE.ZAP
        } else {
          newSourceType = LEAD_SOURCE_TYPE.MANUAL
        }

        lead.sourceType = newSourceType
        await lead.save()
        corrected++
        console.log(
          `  ✅ ${lead.name}: "${lead.sourceType}" -> "${newSourceType}"`,
        )
      }

      console.log(`\n✅ ${corrected} leads corrigidos!`)
    } else {
      console.log('✅ Todos os leads têm sourceType válido.')
    }

    await mongoose.disconnect()
    console.log('\n🔌 Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

fixLeadSourceType()
