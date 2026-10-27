import express from 'express'
import { protect, admin } from '../middleware/authMiddleware.js'
import {
  getLeadFollowUpAutomation,
  saveLeadFollowUpAutomation,
  testLeadFollowUpAutomation,
} from '../controllers/leadFollowUpAutomationController.js'

const router = express.Router()
router.use(protect, admin)
router.get('/', getLeadFollowUpAutomation)
router.put('/', saveLeadFollowUpAutomation)
router.post('/test', testLeadFollowUpAutomation)
export default router
