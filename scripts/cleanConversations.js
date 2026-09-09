// src/scripts/cleanConversations.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

async function cleanConversations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('🔌 Conectado ao MongoDB')

    const Conversation = (await import('../src/models/Conversation.js')).default

    // 🔥 BUSCAR CONVERSAS COM PARTICIPANTES NULOS
    const conversations = await Conversation.find({})

    console.log(`📊 Encontradas ${conversations.length} conversas`)

    let cleaned = 0

    for (const conv of conversations) {
      if (conv.participants && Array.isArray(conv.participants)) {
        // 🔥 FILTRAR PARTICIPANTES NULOS/UNDEFINED
        const originalLength = conv.participants.length
        const validParticipants = conv.participants.filter(
          (p) => p !== null && p !== undefined && p.toString() !== '',
        )

        if (validParticipants.length !== originalLength) {
          conv.participants = validParticipants
          await conv.save()
          cleaned++
          console.log(
            `✅ Conversa ${conv._id}: ${originalLength} → ${validParticipants.length} participantes`,
          )
        }
      }
    }

    console.log(`\n✅ ${cleaned} conversas limpas com sucesso!`)

    await mongoose.disconnect()
    console.log('🔌 Desconectado do MongoDB')
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

cleanConversations()
