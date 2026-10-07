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

/**
 * ============================================================
 * AUTHENTICATION
 * ============================================================
 *
 * Todas as rotas do chat exigem usuário autenticado.
 *
 * O middleware protect deve preencher:
 *
 * req.user
 *
 * antes de qualquer controller ser executado.
 */
router.use(protect)

/**
 * ============================================================
 * CONVERSATIONS
 * ============================================================
 *
 * GET  /api/chat/conversations
 * POST /api/chat/conversations
 *
 * A listagem pode retornar:
 *
 * - conversas internas
 * - conversas WhatsApp
 *
 * O controle de acesso é realizado pelo chatService.
 *
 * ADMIN
 *   → todas
 *
 * BROKER
 *   → internas onde participa
 *   → WhatsApp onde assignedTo === usuário
 */

/**
 * Lista conversas disponíveis para o usuário.
 */
router.get('/conversations', getConversations)

/**
 * Cria conversa interna.
 *
 * Conversas WhatsApp são criadas automaticamente
 * pela integração/webhook.
 */
router.post('/conversations', createConversation)

/**
 * ============================================================
 * BROKER CHANNEL
 * ============================================================
 *
 * Canal interno compartilhado entre corretores/admins.
 */
router.post('/broker-channel', createBrokerChannel)

/**
 * ============================================================
 * CONVERSATION MESSAGES
 * ============================================================
 */

/**
 * Lista mensagens de uma conversa.
 *
 * GET /api/chat/conversations/:id/messages
 *
 * O chatService valida se o usuário possui acesso:
 *
 * - admin
 * - participante da conversa interna
 * - responsável pela conversa WhatsApp
 */
router.get('/conversations/:id/messages', getMessages)

/**
 * ============================================================
 * ENVIO DE MENSAGENS
 * ============================================================
 *
 * POST /api/chat/conversations/:id/messages
 *
 * O mesmo endpoint suporta:
 *
 * INTERNAL
 *   → chatService.sendMessage()
 *
 * WHATSAPP
 *   → chatService.sendWhatsAppMessage()
 *   → WA-AKG
 *
 * O controller identifica o canal através de:
 *
 * conversation.channel
 *
 * Portanto, o frontend não precisa conhecer
 * endpoints diferentes para cada canal.
 */
router.post('/conversations/:id/messages', sendMessage)

/**
 * ============================================================
 * READ
 * ============================================================
 *
 * Marca uma conversa como lida.
 *
 * Funciona para:
 *
 * - chat interno
 * - WhatsApp
 *
 * A autorização é feita pelo chatService.
 */
router.post('/conversations/:id/read', markAsRead)

/**
 * ============================================================
 * USERS
 * ============================================================
 *
 * Pesquisa usuários para:
 *
 * - novas conversas
 * - grupos
 * - menções
 */
router.get('/users/search', searchUsers)

/**
 * ============================================================
 * MESSAGES
 * ============================================================
 */

/**
 * Exclui mensagem.
 *
 * A validação sobre o tipo de mensagem/conversa
 * permanece no chatService.
 */
router.delete('/messages/:id', deleteMessage)

/**
 * ============================================================
 * WHATSAPP
 * ============================================================
 *
 * Não precisamos criar uma rota separada para envio
 * de mensagens WhatsApp.
 *
 * O envio utiliza:
 *
 * POST /api/chat/conversations/:id/messages
 *
 * e o controller direciona automaticamente para
 * chatService.sendWhatsAppMessage() quando:
 *
 * conversation.channel === 'whatsapp'
 *
 * As rotas específicas da integração WA-AKG continuam
 * no whatsappRoutes.js, por exemplo:
 *
 * - integrações
 * - QR Code
 * - webhook
 * - teste de conexão
 * - configuração da integração
 */

export default router
