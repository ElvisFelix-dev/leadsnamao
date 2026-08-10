import express from 'express'
import multer from 'multer'
<<<<<<< HEAD

import { protect, admin } from '../middleware/authMiddleware.js'

import {
  createLead,
  publicCreateLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
  assignLeads,
  changeLeadStage,
  getPipeline,
  getPipelineMetrics,
=======
import { protect, admin } from '../middleware/authMiddleware.js'
import {
  createLead,
  getLeads,
  updateLead,
  assignLeads,
  deleteLead,
  publicCreateLead,
>>>>>>> 32e8de98b92a233f54261a3612474c5a61832f64
  importLeadsFromCSV,
  publicCreateLeadFromWebhook,
} from '../controllers/leadController.js'

const router = express.Router()
<<<<<<< HEAD

const upload = multer({
  dest: 'uploads/',
})

// ======================================================
// PUBLIC
// ======================================================

router.post('/public', publicCreateLead)

router.all('/webhook/:source', publicCreateLeadFromWebhook)

// ======================================================
// IMPORTAÇÃO CSV
// ======================================================

=======
const upload = multer({ dest: 'uploads/' })

// Rotas para leads internos
router.post('/', protect, admin, createLead) // Criar lead admin
router.get('/', protect, getLeads) // Listar leads
// Repassar leads (admin)
router.put('/assign', protect, admin, assignLeads)

// Atualizar lead
router.put('/:id', protect, updateLead)

router.delete('/:id', protect, admin, deleteLead) // Deletar lead
>>>>>>> 32e8de98b92a233f54261a3612474c5a61832f64
router.post(
  '/import/csv',
  protect,
  admin,
  upload.single('csv'),
  importLeadsFromCSV,
)

<<<<<<< HEAD
// ======================================================
// PIPELINE
// ======================================================

// Kanban

router.get('/pipeline', protect, getPipeline)

// Métricas do Pipeline

router.get('/pipeline/metrics', protect, getPipelineMetrics)

// Alterar etapa Drag & Drop

router.patch('/:id/stage', protect, changeLeadStage)

// ======================================================
// DISTRIBUIÇÃO DE LEADS
// ======================================================

router.patch('/assign', protect, admin, assignLeads)

// ======================================================
// CRUD LEADS
// ======================================================

// Criar lead manual

router.post('/', protect, admin, createLead)

// Listar leads

router.get('/', protect, getLeads)

// Buscar lead por ID

router.get('/:id', protect, getLeadById)

// Atualizar lead

router.patch('/:id', protect, updateLead)

// Excluir lead

router.delete('/:id', protect, admin, deleteLead)
=======
// Rotas públicas
router.post('/public', publicCreateLead) // Criar lead público

// Webhook: GET para validação + POST para receber leads
router.all('/webhook/:source', publicCreateLeadFromWebhook)
>>>>>>> 32e8de98b92a233f54261a3612474c5a61832f64

export default router
