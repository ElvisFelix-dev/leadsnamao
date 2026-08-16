import express from 'express'

import {
  createProposal,
  updateProposal,
  submitProposal,
  approveProposal,
  rejectProposal,
  cancelProposal,
  getProposalById,
  getProposals,
  getProposalHistory,
  getProposalMetrics,
  getProposalsByLead,
  getProposalsByProperty,
} from '../controllers/proposalController.js'

import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

/*
|--------------------------------------------------------------------------
| AUTENTICAÇÃO
|--------------------------------------------------------------------------
|
| Todas as rotas de propostas exigem usuário autenticado.
|
*/

router.use(protect)

/*
|--------------------------------------------------------------------------
| LISTAGEM
|--------------------------------------------------------------------------
|
| GET /api/proposals
|
| Query params:
|
| ?page=1
| ?limit=20
| ?search=joao
| ?status=pending
| ?broker=ID
| ?lead=ID
| ?property=ID
| ?startDate=2026-08-01
| ?endDate=2026-08-31
| ?sort=-createdAt
|
*/

router.get('/', getProposals)

/*
|--------------------------------------------------------------------------
| MÉTRICAS
|--------------------------------------------------------------------------
|
| GET /api/proposals/metrics
|
| Deve ficar antes de /:proposalId.
|
*/

router.get('/metrics', getProposalMetrics)

/*
|--------------------------------------------------------------------------
| CONSULTAS ESPECÍFICAS
|--------------------------------------------------------------------------
|
| Propostas de um Lead
|
| GET /api/proposals/lead/:leadId
|
*/

router.get('/lead/:leadId', getProposalsByLead)

/*
|--------------------------------------------------------------------------
| CONSULTAS POR IMÓVEL
|--------------------------------------------------------------------------
|
| GET /api/proposals/property/:propertyId
|
*/

router.get('/property/:propertyId', getProposalsByProperty)

/*
|--------------------------------------------------------------------------
| CRIAR PROPOSTA
|--------------------------------------------------------------------------
|
| POST /api/proposals
|
*/

router.post('/', createProposal)

/*
|--------------------------------------------------------------------------
| HISTÓRICO
|--------------------------------------------------------------------------
|
| GET /api/proposals/:proposalId/history
|
| IMPORTANTE:
| Esta rota fica antes de /:proposalId.
|
*/

router.get('/:proposalId/history', getProposalHistory)

/*
|--------------------------------------------------------------------------
| DETALHES
|--------------------------------------------------------------------------
|
| GET /api/proposals/:proposalId
|
*/

router.get('/:proposalId', getProposalById)

/*
|--------------------------------------------------------------------------
| ATUALIZAR
|--------------------------------------------------------------------------
|
| PATCH /api/proposals/:proposalId
|
| Somente DRAFT.
|
*/

router.patch('/:proposalId', updateProposal)

/*
|--------------------------------------------------------------------------
| ENVIAR PARA APROVAÇÃO
|--------------------------------------------------------------------------
|
| PATCH /api/proposals/:proposalId/submit
|
| DRAFT → PENDING
|
*/

router.patch('/:proposalId/submit', submitProposal)

/*
|--------------------------------------------------------------------------
| APROVAR
|--------------------------------------------------------------------------
|
| PATCH /api/proposals/:proposalId/approve
|
| PENDING → ACCEPTED
|
| Somente ADMIN.
|
*/

router.patch('/:proposalId/approve', approveProposal)

/*
|--------------------------------------------------------------------------
| REJEITAR
|--------------------------------------------------------------------------
|
| PATCH /api/proposals/:proposalId/reject
|
| PENDING → REJECTED
|
| Somente ADMIN.
|
*/

router.patch('/:proposalId/reject', rejectProposal)

/*
|--------------------------------------------------------------------------
| CANCELAR
|--------------------------------------------------------------------------
|
| PATCH /api/proposals/:proposalId/cancel
|
*/

router.patch('/:proposalId/cancel', cancelProposal)

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

export default router
