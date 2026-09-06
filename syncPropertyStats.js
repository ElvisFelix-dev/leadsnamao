// scripts/syncPropertyStats.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Property from './src/models/Property.js'

dotenv.config()

const syncAllStatistics = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('🔌 Conectado ao MongoDB')

    const updated = await Property.syncAllStatistics()

    console.log(`✅ ${updated} propriedades sincronizadas com sucesso!`)

    await mongoose.disconnect()
    console.log('🔌 Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

syncAllStatistics()
