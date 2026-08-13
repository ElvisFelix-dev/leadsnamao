import express from 'express'
import multer from 'multer'

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
  importLeadsFromCSV,
  publicCreateLeadFromWebhook,
  createBrokerHotsiteLeadController,
} from '../controllers/leadController.js'

const router = express.Router()

const upload = multer({
  dest: 'uploads/',
})

router.post('/hotsite', createBrokerHotsiteLeadController)

// ======================================================
// PUBLIC
// ======================================================

router.post('/public', publicCreateLead)

router.all('/webhook/:source', publicCreateLeadFromWebhook)

// ======================================================
// IMPORTAÇÃO CSV
// ======================================================

router.post(
  '/import/csv',
  protect,
  admin,
  upload.single('csv'),
  importLeadsFromCSV,
)

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

export default router
