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

// Todas as rotas exigem autenticação
router.use(protect)

// ==========================================
// ROTAS DO CORRETOR
// ==========================================

/** Minhas comissões */
router.get('/my-commissions', getMyCommissions)

/** Resumo financeiro */
router.get('/summary', getCommissionSummary)

// ==========================================
// ROTAS ADMIN - COM PREFIXO /admin/
// ==========================================

/** Backfill - gera comissões para vendas antigas */
router.post('/backfill', backfillCommissions)

/** 🔥 Gera comissão a partir de venda */
router.post('/generate-from-sale', generateFromSale)

/** Lista todas as comissões (com filtros) */
router.get('/', getAllCommissions)

// ==========================================
// ROTAS COM PARÂMETROS (:id)
// ==========================================

/** Busca comissão por ID */
router.get('/:id', getCommissionById)

/** Aprova comissão */
router.patch('/:id/approve', approveCommission)

/** Marca como paga */
router.patch('/:id/pay', payCommission)

/** Cancela comissão */
router.patch('/:id/cancel', cancelCommission)

export default router
