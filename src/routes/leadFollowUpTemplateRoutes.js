import express from 'express'
import { protect, admin } from '../middleware/authMiddleware.js'
import {
  getLeadFollowUpTemplates,
  getLeadFollowUpTemplateUsage,
  saveLeadFollowUpTemplates,
  applyTemplatesToPendingFollowUps,
  getLeadFollowUpAutomationSettings,
  saveLeadFollowUpAutomationSettings,
  testLeadFollowUpAutomation,
} from '../controllers/leadFollowUpTemplateController.js'

const router = express.Router()

// A proteção é feita no servidor: somente administradores autenticados acessam.
router.use(protect, admin)
router.get('/', getLeadFollowUpTemplates)
router.get('/usage', getLeadFollowUpTemplateUsage)
router.get('/automation', getLeadFollowUpAutomationSettings)
router.put('/automation', saveLeadFollowUpAutomationSettings)
router.post('/automation/test', testLeadFollowUpAutomation)
router.put('/', saveLeadFollowUpTemplates)
router.post('/apply-pending', applyTemplatesToPendingFollowUps)

export default router
