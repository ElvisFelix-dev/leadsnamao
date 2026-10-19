// src/routes/chatRoutes.js

import express from 'express'
import { protect } from '../middleware/authMiddleware.js'

import { chatMediaUpload } from '../utils/upload.js'
import { uploadChatMedia } from '../controllers/chatMediaController.js'

import {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  markAsRead,
  markMessageAsRead,
  createBrokerChannel,
  searchUsers,
  deleteMessage,
  addBrokerToChannel,
} from '../controllers/chatController.js'

const router = express.Router()

// Todas as rotas exigem autenticação.
router.use(protect)

// ==========================================================
// CONVERSAS
// ==========================================================

// Lista conversas internas e WhatsApp conforme as permissões.
router.get('/conversations', getConversations)

/*
==========================================================
UPLOAD DE MÍDIAS DO CHAT
==========================================================
*/

// Recebe um arquivo no campo multipart "file".
router.post('/media', chatMediaUpload.single('file'), uploadChatMedia)

// Cria conversa interna.
router.post('/conversations', createConversation)

// Cria canal compartilhado entre corretores.
router.post('/broker-channel', createBrokerChannel)

// ==========================================================
// MENSAGENS DA CONVERSA
// ==========================================================

// Lista mensagens.
// O nome do parâmetro deve corresponder ao controller.
router.get('/conversations/:conversationId/messages', getMessages)

// Envia mensagem interna ou WhatsApp.
router.post('/conversations/:conversationId/messages', sendMessage)

// ==========================================================
// LEITURA
// ==========================================================

// Marca a conversa como lida.
// Mantemos POST para preservar compatibilidade com chamadas existentes.
router.post('/conversations/:conversationId/read', markAsRead)

// Marca uma mensagem individual como lida.
router.patch('/messages/:messageId/read', markMessageAsRead)

// ==========================================================
// PARTICIPANTES
// ==========================================================

// Adiciona um corretor a um canal.
router.post('/conversations/:conversationId/participants', addBrokerToChannel)

// ==========================================================
// USUÁRIOS
// ==========================================================

// Pesquisa usuários para iniciar conversas ou montar grupos.
router.get('/users/search', searchUsers)

// ==========================================================
// MENSAGENS
// ==========================================================

// Exclui uma mensagem.
router.delete('/messages/:messageId', deleteMessage)

export default router
