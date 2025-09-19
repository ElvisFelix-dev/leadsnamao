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

// ========================
// ROTAS NORMAIS DE LEADS
// ========================

// Criar lead (admin)
router.post('/', protect, admin, createLead)

// Criar lead público (hotsite)
router.post('/public', publicCreateLead)

// Listar leads
router.get('/', protect, getLeads)

// Atualizar lead
router.put('/:id', protect, updateLead)

// Deletar lead (admin)
router.delete('/:id', protect, admin, deleteLead)

// Repassar leads (admin)
router.put('/assign', protect, admin, assignLeads)

// Importar CSV (admin)
router.post(
  '/import/csv',
  protect,
  admin,
  upload.single('csv'),
  importLeadsFromCSV,
)

// ========================
// ROTAS PARA META WEBHOOK
// ========================

// GET para validação do Meta
router.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || '16996318063'

  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook do Meta verificado com sucesso!')
    return res.status(200).send(challenge)
  }

  return res.sendStatus(403)
})

router.all('/webhook/:source', publicCreateLeadFromWebhook)

// POST para receber leads externos (Meta, OLX, Zap)
router.post('/webhook/:source', (req, res) => {
  try {
    const source = req.params.source // ex: 'meta', 'olx', 'zap'
    console.log(`📥 Lead recebido do ${source}:`, req.body)

    // Salvar lead no banco usando o controller
    publicCreateLeadFromWebhook(req, res)
  } catch (error) {
    console.error('❌ Erro ao processar lead do webhook:', error)
    return res.sendStatus(500)
  }
})

export default router
