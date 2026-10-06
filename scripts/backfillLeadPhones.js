import mongoose from 'mongoose'
import dotenv from 'dotenv'

import Lead from '../src/models/Lead.js'
import { normalizePhone } from '../src/utils/phone.js'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI não configurada.')
}

const run = async () => {
  try {
    console.log('Conectando ao MongoDB...')

    await mongoose.connect(MONGODB_URI)

    console.log('MongoDB conectado.')

    const leads = await Lead.find({
      phone: {
        $exists: true,
        $ne: '',
      },
      $or: [
        {
          phoneNormalized: {
            $exists: false,
          },
        },
        {
          phoneNormalized: '',
        },
        {
          phoneNormalized: null,
        },
      ],
    }).select('_id name phone phoneNormalized')

    console.log(`Leads encontrados para normalização: ${leads.length}`)

    let updated = 0
    let skipped = 0

    for (const lead of leads) {
      const normalizedPhone = normalizePhone(lead.phone)

      if (!normalizedPhone) {
        skipped += 1

        console.log(`Ignorado: ${lead._id} - telefone inválido: ${lead.phone}`)

        continue
      }

      await Lead.updateOne(
        {
          _id: lead._id,
        },
        {
          $set: {
            phoneNormalized: normalizedPhone,
          },
        },
      )

      updated += 1

      console.log(
        `Atualizado: ${lead.name} | ${lead.phone} -> ${normalizedPhone}`,
      )
    }

    console.log('')
    console.log('======================================')
    console.log('BACKFILL FINALIZADO')
    console.log('======================================')
    console.log(`Total encontrado: ${leads.length}`)
    console.log(`Atualizados: ${updated}`)
    console.log(`Ignorados: ${skipped}`)
    console.log('======================================')
  } catch (error) {
    console.error('Erro no backfill:', error)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

run()
