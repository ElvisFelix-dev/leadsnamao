// src/routes/chatRoutes.js
import express from 'express'
import { protect } from '../middleware/authMiddleware.js'
import {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  markAsRead,
  createBrokerChannel,
  searchUsers,
  deleteMessage,
} from '../controllers/chatController.js'

const router = express.Router()

// 🔥 TODAS AS ROTAS EXIGEM AUTENTICAÇÃO
router.use(protect)

// Conversas
router.get('/conversations', getConversations)
router.post('/conversations', createConversation)

// Canal de corretores
router.post('/broker-channel', createBrokerChannel)

// Mensagens
router.get('/conversations/:id/messages', getMessages)
router.post('/conversations/:id/messages', sendMessage)
router.post('/conversations/:id/read', markAsRead)

// Usuários
router.get('/users/search', searchUsers)

// Mensagem individual
router.delete('/messages/:id', deleteMessage)

export default router
