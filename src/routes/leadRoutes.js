import express from 'express'
import { protect, admin } from '../middleware/authMiddleware.js'
import {
  createLead,
  getLeads,
  updateLead,
  assignLeads,
  deleteLead,
} from '../controllers/leadController.js'

const router = express.Router()

// Criar lead
router.post('/', protect, createLead)

// Listar leads
router.get('/', protect, getLeads)

// Repassar leads (apenas admin)
router.put('/assign', protect, admin, assignLeads)

// Atualizar lead
router.put('/:id', protect, updateLead)

// Deletar lead
router.delete('/:id', protect, admin, deleteLead)

export default router
