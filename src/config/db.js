// src/config/db.js
import mongoose from 'mongoose'

export const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    console.error('❌ Variável MONGODB_URI não definida')
    return
  }

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    console.log('✅ MongoDB conectado')
  } catch (error) {
    console.error('❌ Erro ao conectar MongoDB:', error.message)
  }
}
