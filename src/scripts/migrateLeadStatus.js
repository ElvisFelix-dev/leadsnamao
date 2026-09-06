// backend/scripts/migrateLeadStatus.js
import mongoose from 'mongoose'
import Lead from '../models/Lead.js'
import dotenv from 'dotenv'
import { LEAD_STATUS } from '../constants/leadStatus.js'

dotenv.config()

async function migrateLeadStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Conectado ao MongoDB')

    // 1. Atualizar leads com status 'contatado' (se existir algum com esse valor)
    const contactedResult = await Lead.updateMany(
      { status: 'contatado' },
      { $set: { status: LEAD_STATUS.CONTACTED } },
    )
    console.log(
      `✅ ${contactedResult.modifiedCount} leads 'contatado' → '${LEAD_STATUS.CONTACTED}'`,
    )

    // 2. Atualizar leads com status 'em_negociacao'
    const negotiationResult = await Lead.updateMany(
      { status: 'em_negociacao' },
      { $set: { status: LEAD_STATUS.NEGOTIATION } },
    )
    console.log(
      `✅ ${negotiationResult.modifiedCount} leads 'em_negociacao' → '${LEAD_STATUS.NEGOTIATION}'`,
    )

    // 3. Atualizar leads com status 'arquivado'
    const archivedResult = await Lead.updateMany(
      { status: 'arquivado' },
      { $set: { status: LEAD_STATUS.ARCHIVED } },
    )
    console.log(
      `✅ ${archivedResult.modifiedCount} leads 'arquivado' → '${LEAD_STATUS.ARCHIVED}'`,
    )

    // 4. Verificar status que não estão no enum
    const validStatuses = Object.values(LEAD_STATUS)
    const invalidLeads = await Lead.find({
      status: { $nin: validStatuses },
      isDeleted: { $ne: true },
    })

    if (invalidLeads.length > 0) {
      console.log(`⚠️ ${invalidLeads.length} leads com status inválido:`)
      invalidLeads.forEach((lead) => {
        console.log(`  - ${lead.name}: ${lead.status}`)
      })

      // Corrigir para 'novo'
      const fixResult = await Lead.updateMany(
        { status: { $nin: validStatuses } },
        { $set: { status: LEAD_STATUS.NEW } },
      )
      console.log(
        `✅ ${fixResult.modifiedCount} leads corrigidos para '${LEAD_STATUS.NEW}'`,
      )
    }

    console.log('✅ Migração concluída!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Erro na migração:', error)
    process.exit(1)
  }
}

migrateLeadStatus()
