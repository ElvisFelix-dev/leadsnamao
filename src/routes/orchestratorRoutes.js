// routes/orchestratorRoutes.js
import express from 'express'

import {
  approveProposal,
  getBrokerDashboard,
  getAdminDashboard,
  getPipeline,
  getCommissionSummary,
  getCommissions,
  getSalesMetrics,
} from '../controllers/orchestratorController.js'

import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

/*
|--------------------------------------------------------------------------
| AUTENTICAÇÃO
|--------------------------------------------------------------------------
|
| Todas as rotas do módulo de orquestração exigem autenticação.
|
*/

router.use(protect)

/*
|--------------------------------------------------------------------------
| PROPOSTAS
|--------------------------------------------------------------------------
*/

/**
 * POST /api/orchestrator/proposals/:proposalId/approve
 *
 * Aprova uma proposta e dispara todo o fluxo:
 * - Proposta → ACCEPTED
 * - Venda → Criada
 * - Comissão → Gerada
 * - Oportunidade → WON
 * - Lead → FECHADO
 * - Imóvel → VENDIDO
 *
 * Body (opcional):
 * {
 *   "comment": "Proposta aprovada pela diretoria"
 * }
 *
 * Exemplo:
 * POST /api/orchestrator/proposals/67a1b2c3d4e5f67890123456/approve
 */
router.post('/proposals/:proposalId/approve', approveProposal)

/*
|--------------------------------------------------------------------------
| DASHBOARDS
|--------------------------------------------------------------------------
*/

/**
 * GET /api/orchestrator/dashboard/broker
 *
 * Dashboard do corretor:
 * - Oportunidades abertas
 * - Propostas pendentes
 * - Vendas ativas
 * - Resumo de comissões
 * - VGV pendente
 * - Total a receber
 *
 * Retorna os dados consolidados do corretor logado.
 *
 * Exemplo:
 * GET /api/orchestrator/dashboard/broker
 */
router.get('/dashboard/broker', getBrokerDashboard)

/**
 * GET /api/orchestrator/dashboard/admin
 *
 * Dashboard do administrador:
 * - Visão geral da imobiliária
 * - VGV total
 * - Ranking de corretores
 * - Métricas gerais
 *
 * Acesso restrito a administradores.
 *
 * Exemplo:
 * GET /api/orchestrator/dashboard/admin
 */
router.get('/dashboard/admin', getAdminDashboard)

/*
|--------------------------------------------------------------------------
| PIPELINE
|--------------------------------------------------------------------------
*/

/**
 * GET /api/orchestrator/pipeline
 *
 * Funil completo:
 * - Oportunidades por stage
 * - Propostas por status
 * - Vendas por status
 * - Comissões por status
 *
 * Para corretor: apenas seus dados
 * Para admin: todos os dados
 *
 * Exemplo:
 * GET /api/orchestrator/pipeline
 */
router.get('/pipeline', getPipeline)

/*
|--------------------------------------------------------------------------
| COMISSÕES
|--------------------------------------------------------------------------
*/

/**
 * GET /api/orchestrator/commissions/summary
 *
 * Resumo financeiro do corretor:
 * - Pendentes (total e quantidade)
 * - Aprovadas (total e quantidade)
 * - Pagas (total e quantidade)
 *
 * Apenas do corretor logado.
 *
 * Exemplo:
 * GET /api/orchestrator/commissions/summary
 */
router.get('/commissions/summary', getCommissionSummary)

/**
 * GET /api/orchestrator/commissions
 *
 * Lista comissões do corretor com paginação
 *
 * Query params:
 * - status: pending, approved, paid (opcional)
 * - page: 1 (padrão)
 * - limit: 20 (padrão)
 *
 * Exemplos:
 * GET /api/orchestrator/commissions
 * GET /api/orchestrator/commissions?status=pending
 * GET /api/orchestrator/commissions?status=pending&page=1&limit=10
 */
router.get('/commissions', getCommissions)

/*
|--------------------------------------------------------------------------
| MÉTRICAS
|--------------------------------------------------------------------------
*/

/**
 * GET /api/orchestrator/metrics/sales
 *
 * Métricas de vendas
 *
 * Query params:
 * - startDate: 2024-01-01 (opcional)
 * - endDate: 2024-12-31 (opcional)
 *
 * Exemplos:
 * GET /api/orchestrator/metrics/sales
 * GET /api/orchestrator/metrics/sales?startDate=2024-01-01&endDate=2024-12-31
 */
router.get('/metrics/sales', getSalesMetrics)

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

export default router
