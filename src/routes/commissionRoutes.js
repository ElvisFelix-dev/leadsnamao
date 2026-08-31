import express from 'express'
import {
  getAllCommissions,
  getCommissionById,
  getMyCommissions,
  getCommissionSummary,
  generateFromSale,
  approveCommission,
  payCommission,
  cancelCommission,
  backfillCommissions,
} from '../controllers/commissionController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

console.log('🔵 Carregando rotas de comissão...')

// Todas as rotas exigem autenticação
router.use(protect)

// ==========================================
// ROTAS DO CORRETOR
// ==========================================

/** Minhas comissões */
router.get('/my-commissions', getMyCommissions)
console.log('  ✅ GET /my-commissions')

/** Resumo financeiro */
router.get('/summary', getCommissionSummary)
console.log('  ✅ GET /summary')

// ==========================================
// ROTAS ADMIN - COM PREFIXO /admin/
// ==========================================

/** Backfill - gera comissões para vendas antigas */
router.post('/backfill', backfillCommissions)
console.log('  ✅ POST /admin/backfill')

/** 🔥 Gera comissão a partir de venda */
router.post('/generate-from-sale', generateFromSale)
console.log('  ✅ POST /admin/generate-from-sale')

/** Lista todas as comissões (com filtros) */
router.get('/', getAllCommissions)
console.log('  ✅ GET /')

// ==========================================
// ROTAS COM PARÂMETROS (:id)
// ==========================================

/** Busca comissão por ID */
router.get('/:id', getCommissionById)
console.log('  ✅ GET /:id')

/** Aprova comissão */
router.patch('/:id/approve', approveCommission)
console.log('  ✅ PATCH /:id/approve')

/** Marca como paga */
router.patch('/:id/pay', payCommission)
console.log('  ✅ PATCH /:id/pay')

/** Cancela comissão */
router.patch('/:id/cancel', cancelCommission)
console.log('  ✅ PATCH /:id/cancel')

console.log('🔵 Rotas de comissão carregadas com sucesso!')

export default router
