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

// Rotas para leads internos
router.post('/', protect, admin, createLead) // Criar lead admin
router.get('/', protect, getLeads) // Listar leads
router.put('/:id', protect, updateLead) // Atualizar lead
router.delete('/:id', protect, admin, deleteLead) // Deletar lead
router.put('/assign', protect, admin, assignLeads) // Repassar leads
router.post(
  '/import/csv',
  protect,
  admin,
  upload.single('csv'),
  importLeadsFromCSV,
)

// Rotas públicas
router.post('/public', publicCreateLead) // Criar lead público

// Webhook: GET para validação + POST para receber leads
router.all('/webhook/:source', publicCreateLeadFromWebhook)

export default router
