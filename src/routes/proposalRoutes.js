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
| page
| limit
| search
| status
| broker
| lead
| property
| startDate
| endDate
| sort
|
| Exemplos:
|
| GET /api/proposals?page=1&limit=20
| GET /api/proposals?status=pending
| GET /api/proposals?status=pending,accepted
| GET /api/proposals?broker=ID
| GET /api/proposals?lead=ID
| GET /api/proposals?property=ID
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
| Query params:
|
| startDate
| endDate
| broker
|
| IMPORTANTE:
| Deve ficar antes de /:proposalId.
|
*/

router.get('/metrics', getProposalMetrics)

/*
|--------------------------------------------------------------------------
| PROPOSTAS POR LEAD
|--------------------------------------------------------------------------
|
| GET /api/proposals/lead/:leadId
|
*/

router.get('/lead/:leadId', getProposalsByLead)

/*
|--------------------------------------------------------------------------
| PROPOSTAS POR IMÓVEL
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
| Cria uma proposta inicialmente como:
|
| DRAFT
|
| O body deve conter, entre outros:
|
| {
|   opportunity,
|   lead,
|   property,
|   broker,
|   values,
|   paymentMethod,
|   installments,
|   installmentValue,
|   validityDays,
|   clientMessage
| }
|
*/

router.post('/', createProposal)

/*
|--------------------------------------------------------------------------
| HISTÓRICO DA PROPOSTA
|--------------------------------------------------------------------------
|
| GET /api/proposals/:proposalId/history
|
| Deve ficar antes de:
|
| GET /api/proposals/:proposalId
|
*/

router.get('/:proposalId/history', getProposalHistory)

/*
|--------------------------------------------------------------------------
| ENVIAR PROPOSTA PARA APROVAÇÃO
|--------------------------------------------------------------------------
|
| PATCH /api/proposals/:proposalId/submit
|
| Fluxo:
|
| DRAFT → PENDING
|
*/

router.patch('/:proposalId/submit', submitProposal)

/*
|--------------------------------------------------------------------------
| APROVAR PROPOSTA
|--------------------------------------------------------------------------
|
| PATCH /api/proposals/:proposalId/approve
|
| Fluxo:
|
| PENDING → ACCEPTED
|
| Somente ADMIN.
|
| Também atualiza o Pipeline do Lead:
|
| proposta_enviada → negociacao
|
*/

router.patch('/:proposalId/approve', approveProposal)

/*
|--------------------------------------------------------------------------
| REJEITAR PROPOSTA
|--------------------------------------------------------------------------
|
| PATCH /api/proposals/:proposalId/reject
|
| Fluxo:
|
| PENDING → REJECTED
|
| Somente ADMIN.
|
| Body:
|
| {
|   reason: "Motivo da rejeição"
| }
|
*/

router.patch('/:proposalId/reject', rejectProposal)

/*
|--------------------------------------------------------------------------
| CANCELAR PROPOSTA
|--------------------------------------------------------------------------
|
| PATCH /api/proposals/:proposalId/cancel
|
| Body opcional:
|
| {
|   reason: "Motivo do cancelamento"
| }
|
*/

router.patch('/:proposalId/cancel', cancelProposal)

/*
|--------------------------------------------------------------------------
| ATUALIZAR PROPOSTA
|--------------------------------------------------------------------------
|
| PATCH /api/proposals/:proposalId
|
| Somente propostas DRAFT podem ser editadas.
|
*/

router.patch('/:proposalId', updateProposal)

/*
|--------------------------------------------------------------------------
| DETALHES DA PROPOSTA
|--------------------------------------------------------------------------
|
| GET /api/proposals/:proposalId
|
| Esta deve ficar depois das rotas específicas.
|
*/

router.get('/:proposalId', getProposalById)

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

export default router
