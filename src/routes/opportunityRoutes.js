import express from 'express'

import {
  create,
  getAll,
  getById,
  update,
  updateStage,
  addInteraction,
  archive,
} from '../controllers/opportunityController.js'

import { protect } from '../middleware/authMiddleware.js'

import validateRequest from '../middleware/validateRequest.js'

import {
  createOpportunityValidator,
  updateOpportunityValidator,
  opportunityIdValidator,
  updateOpportunityStageValidator,
  addOpportunityInteractionValidator,
} from '../validators/opportunityValidator.js'

const router = express.Router()

/**
 * =========================================================
 * AUTHENTICATION
 * =========================================================
 *
 * Todas as rotas de oportunidades exigem usuário autenticado.
 */

router.use(protect)

/**
 * =========================================================
 * OPPORTUNITIES
 * =========================================================
 */

/**
 * =========================================================
 * LIST
 * =========================================================
 *
 * GET /api/opportunities
 *
 * Suporta:
 *
 * ?page=1
 * ?limit=12
 * ?search=João
 * ?stage=negociacao
 * ?status=aberta
 * ?type=venda
 * ?temperature=quente
 * ?priority=alta
 * ?assignedTo=USER_ID
 * ?property=PROPERTY_ID
 * ?lead=LEAD_ID
 */

router.get('/', getAll)

/**
 * =========================================================
 * CREATE
 * =========================================================
 *
 * POST /api/opportunities
 */

router.post('/', createOpportunityValidator, validateRequest, create)

/**
 * =========================================================
 * STAGE
 * =========================================================
 *
 * PATCH /api/opportunities/:id/stage
 *
 * Body:
 *
 * {
 *   "stage": "negociacao",
 *   "note": "Cliente solicitou nova condição"
 * }
 *
 * Para perda:
 *
 * {
 *   "stage": "perdida",
 *   "note": "Cliente desistiu",
 *   "lostReason": "Valor acima do orçamento"
 * }
 */

router.patch(
  '/:id/stage',
  opportunityIdValidator,
  updateOpportunityStageValidator,
  validateRequest,
  updateStage,
)

/**
 * =========================================================
 * INTERACTIONS
 * =========================================================
 *
 * POST /api/opportunities/:id/interactions
 *
 * Body:
 *
 * {
 *   "type": "whatsapp",
 *   "description": "Cliente confirmou interesse no imóvel."
 * }
 */

router.post(
  '/:id/interactions',
  opportunityIdValidator,
  addOpportunityInteractionValidator,
  validateRequest,
  addInteraction,
)

/**
 * =========================================================
 * GET BY ID
 * =========================================================
 *
 * GET /api/opportunities/:id
 *
 * IMPORTANTE:
 *
 * Esta rota deve ficar antes das rotas genéricas
 * somente por organização e legibilidade.
 *
 * O Express não terá conflito com /:id/stage ou
 * /:id/interactions porque essas rotas possuem segmentos
 * adicionais.
 */

router.get('/:id', opportunityIdValidator, validateRequest, getById)

/**
 * =========================================================
 * UPDATE
 * =========================================================
 *
 * PATCH /api/opportunities/:id
 *
 * Atualiza dados gerais da oportunidade.
 *
 * Não deve ser utilizado para alteração de stage.
 *
 * Alteração de stage deve passar por:
 *
 * PATCH /:id/stage
 */

router.patch(
  '/:id',
  opportunityIdValidator,
  updateOpportunityValidator,
  validateRequest,
  update,
)

/**
 * =========================================================
 * ARCHIVE
 * =========================================================
 *
 * DELETE /api/opportunities/:id
 *
 * Não remove fisicamente.
 *
 * Apenas:
 *
 * isArchived = true
 */

router.delete('/:id', opportunityIdValidator, validateRequest, archive)

/**
 * =========================================================
 * EXPORT
 * =========================================================
 */

export default router
