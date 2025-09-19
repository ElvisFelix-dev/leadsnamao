import express from 'express'
import multer from 'multer'
import { protect, admin } from '../middleware/authMiddleware.js'
import {
  createLead,
  getLeads,
  updateLead,
  assignLeads,
  deleteLead,
  publicCreateLead,
  importLeadsFromCSV,
  publicCreateLeadFromWebhook,
} from '../controllers/leadController.js'

const router = express.Router()
const upload = multer({ dest: 'uploads/' })

// Criar lead
router.post('/', protect, admin, createLead)

// Criar lead
router.post('/public', publicCreateLead)

// Listar leads
router.get('/', protect, getLeads)

// Receber leads externos (Meta, OLX, Zap)
router.post('/webhook/:source', publicCreateLeadFromWebhook)

router.post(
  '/import/csv',
  protect,
  admin,
  upload.single('csv'),
  importLeadsFromCSV,
)

// Repassar leads (apenas admin)
router.put('/assign', protect, admin, assignLeads)

// Atualizar lead
router.put('/:id', protect, updateLead)

// Deletar lead
router.delete('/:id', protect, admin, deleteLead)

export default router
