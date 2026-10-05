import express from 'express'
import { protect, admin } from '../middleware/authMiddleware.js'

import {
  createIntegration,
  listIntegrations,
  testSend,
  getQrCode,
  receiveWebhook,
} from '../controllers/whatsappController.js'

const router = express.Router()

/*
 * ============================================================
 * WEBHOOK WHATSAPP
 * ============================================================
 *
 * IMPORTANTE:
 * Esta rota NÃO usa protect/admin.
 *
 * Quem chama essa rota é o WA-AKG.
 *
 * POST /api/whatsapp/webhook
 */
router.post('/webhook', receiveWebhook)

/*
 * ============================================================
 * ROTAS PROTEGIDAS DO CRM
 * ============================================================
 */

router.use(protect)

router.post('/integrations', admin, createIntegration)

router.get('/integrations', admin, listIntegrations)

router.get('/qr', admin, getQrCode)

router.post('/test/send', testSend)

export default router
