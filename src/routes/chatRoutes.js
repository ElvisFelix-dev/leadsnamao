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
 * Chat interno:
 *
 * GET  /api/chat/conversations
 * POST /api/chat/conversations
 *
 * A listagem também retorna conversas WhatsApp às quais
 * o usuário possui acesso.
 *
 * O controle de acesso é realizado pelo chatService:
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
 * O usuário autenticado é automaticamente adicionado
 * aos participantes pelo controller.
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
 * O chatService valida se:
 *
 * - admin
 * - participante da conversa interna
 * - responsável pela conversa WhatsApp
 */
router.get('/conversations/:id/messages', getMessages)

/**
 * Envia mensagem pelo chat interno.
 *
 * IMPORTANTE:
 *
 * Esta rota NÃO envia mensagens WhatsApp.
 *
 * Se a conversa for:
 *
 * channel === 'whatsapp'
 *
 * o chatService irá bloquear a operação.
 *
 * O WhatsApp terá endpoint próprio:
 *
 * POST /api/whatsapp/conversations/:id/messages
 */
router.post('/conversations/:id/messages', sendMessage)

/**
 * Marca uma conversa como lida.
 *
 * Funciona para:
 *
 * - chat interno
 * - conversa WhatsApp
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
 * Exclui mensagem do chat interno.
 *
 * Mensagens recebidas pelo WhatsApp não podem ser excluídas
 * através deste endpoint.
 */
router.delete('/messages/:id', deleteMessage)

/**
 * ============================================================
 * FUTURE WHATSAPP ROUTES
 * ============================================================
 *
 * As rotas WhatsApp NÃO devem ficar neste router.
 *
 * Elas ficarão em:
 *
 * src/routes/whatsappRoutes.js
 *
 * Exemplos futuros:
 *
 * POST /api/whatsapp/conversations/:id/messages
 * POST /api/whatsapp/conversations/:id/read
 * GET  /api/whatsapp/integrations
 * POST /api/whatsapp/integrations
 *
 * Isso mantém o domínio do chat interno separado
 * da integração externa WhatsApp.
 */

export default router
