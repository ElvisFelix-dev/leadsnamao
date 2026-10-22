import express from 'express'
import { protect, admin } from '../middleware/authMiddleware.js'
import {
  getLeadFollowUpTemplates,
  getLeadFollowUpTemplateUsage,
  saveLeadFollowUpTemplates,
  applyTemplatesToPendingFollowUps,
} from '../controllers/leadFollowUpTemplateController.js'

const router = express.Router()

// A proteção é feita no servidor: somente administradores autenticados acessam.
router.use(protect, admin)
router.get('/', getLeadFollowUpTemplates)
router.get('/usage', getLeadFollowUpTemplateUsage)
router.put('/', saveLeadFollowUpTemplates)
router.post('/apply-pending', applyTemplatesToPendingFollowUps)

export default router
