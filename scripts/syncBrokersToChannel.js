import mongoose from 'mongoose'
import dotenv from 'dotenv'

import User from '../src/models/User.js'
import Conversation from '../src/models/Conversation.js'

dotenv.config()

const MONGO_URI = process.env.MONGODB_URI

async function syncBrokersToChannel() {
  try {
    console.log('')
    console.log('==============================================')
    console.log(' SINCRONIZAÇÃO DO CANAL DOS CORRETORES')
    console.log('==============================================')
    console.log('')

    if (!MONGO_URI) {
      throw new Error('MONGO_URI não encontrada nas variáveis de ambiente.')
    }

    /*
    ==============================================
    CONECTAR AO MONGODB
    ==============================================
    */

    await mongoose.connect(MONGO_URI)

    console.log('MongoDB conectado.')
    console.log('')

    /*
    ==============================================
    BUSCAR CANAL DOS CORRETORES
    ==============================================
    */

    const channel = await Conversation.findOne({
      type: 'broker_channel',
      isBrokerChannel: true,
      isActive: true,
    })

    if (!channel) {
      console.log('Nenhum Canal dos Corretores ativo foi encontrado.')

      console.log('')
      console.log('Crie o canal primeiro e execute o script novamente.')

      return
    }

    console.log(`Canal encontrado: ${channel.name}`)
    console.log(`ID: ${channel._id}`)
    console.log('')

    /*
    ==============================================
    BUSCAR CORRETORES ATIVOS
    ==============================================
    */

    const brokers = await User.find({
      role: 'broker',
      isActive: true,
    }).select('_id name email')

    console.log(`Corretores ativos encontrados: ${brokers.length}`)
    console.log('')

    /*
    ==============================================
    GARANTIR PARTICIPANTS
    ==============================================
    */

    if (!Array.isArray(channel.participants)) {
      channel.participants = []
    }

    /*
    ==============================================
    MAPEAR PARTICIPANTES ATUAIS
    ==============================================
    */

    const participantIds = new Set(
      channel.participants.filter(Boolean).map((id) => id.toString()),
    )

    /*
    ==============================================
    GARANTIR UNREAD COUNTS
    ==============================================
    */

    if (!channel.unreadCounts) {
      channel.unreadCounts = new Map()
    }

    /*
    ==============================================
    ADICIONAR CORRETORES AUSENTES
    ==============================================
    */

    const addedBrokers = []
    const alreadyInChannel = []

    for (const broker of brokers) {
      const brokerId = broker._id.toString()

      if (participantIds.has(brokerId)) {
        alreadyInChannel.push(broker)
        continue
      }

      /*
      ----------------------------------------------
      ADICIONAR PARTICIPANTE
      ----------------------------------------------
      */

      channel.participants.push(broker._id)

      /*
      ----------------------------------------------
      INICIALIZAR NÃO LIDAS
      ----------------------------------------------
      */

      channel.unreadCounts.set(brokerId, 0)

      participantIds.add(brokerId)

      addedBrokers.push(broker)

      console.log(`+ Adicionado: ${broker.name} (${broker.email})`)
    }

    /*
    ==============================================
    SALVAR ALTERAÇÕES
    ==============================================
    */

    if (addedBrokers.length > 0) {
      await channel.save()

      console.log('')
      console.log(`${addedBrokers.length} corretor(es) adicionado(s) ao canal.`)
    } else {
      console.log('Nenhum corretor precisava ser adicionado.')
    }

    /*
    ==============================================
    RESUMO
    ==============================================
    */

    console.log('')
    console.log('==============================================')
    console.log(' RESUMO')
    console.log('==============================================')
    console.log(`Canal: ${channel.name}`)
    console.log(`Corretores ativos: ${brokers.length}`)
    console.log(`Já estavam no canal: ${alreadyInChannel.length}`)
    console.log(`Adicionados agora: ${addedBrokers.length}`)
    console.log(`Total de participantes: ${channel.participants.length}`)
    console.log('==============================================')
    console.log('')
    console.log('Sincronização concluída.')
    console.log('')
  } catch (error) {
    console.error('')
    console.error('==============================================')
    console.error(' ERRO NA SINCRONIZAÇÃO')
    console.error('==============================================')
    console.error(error)
    console.error('')
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()

    console.log('MongoDB desconectado.')
  }
}

syncBrokersToChannel()
