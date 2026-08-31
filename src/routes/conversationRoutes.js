import express from 'express'
import Conversation from '../models/Conversation.js'

const router = express.Router()

// Buscar conversa completa de um usuário
router.get('/:userName', async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      userName: req.params.userName,
    })

    if (!conversation) {
      return res.status(404).json({
        message: 'Conversa não encontrada',
      })
    }

    res.json(conversation)
  } catch (err) {
    next(err)
  }
})

// Buscar todas as conversas (para admin)
router.get('/', async (req, res, next) => {
  try {
    const conversations = await Conversation.find({})
      .sort({ updatedAt: -1 })
      .limit(100)

    res.json(conversations)
  } catch (err) {
    next(err)
  }
})

// Buscar mensagens não lidas
router.get('/:userName/unread', async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      userName: req.params.userName,
    })

    if (!conversation) {
      return res.status(404).json({
        message: 'Conversa não encontrada',
      })
    }

    const unread = conversation.messages.filter((msg) => !msg.read)
    res.json({ unread: unread.length, messages: unread })
  } catch (err) {
    next(err)
  }
})

// Marcar mensagens como lidas
router.patch('/:userName/read', async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      userName: req.params.userName,
    })

    if (!conversation) {
      return res.status(404).json({
        message: 'Conversa não encontrada',
      })
    }

    conversation.messages.forEach((msg) => {
      if (!msg.read) msg.read = true
    })

    await conversation.save()
    res.json({ message: 'Mensagens marcadas como lidas' })
  } catch (err) {
    next(err)
  }
})

export default router
