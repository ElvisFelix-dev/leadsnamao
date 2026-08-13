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
 * TODAS AS ROTAS EXIGEM AUTENTICAÇÃO
 * =========================================================
 */

router.use(protect)

/**
 * =========================================================
 * LIST
 * =========================================================
 */

/**
 * GET
 * /api/opportunities
 */
router.get('/', getAll)

/**
 * =========================================================
 * CREATE
 * =========================================================
 */

/**
 * POST
 * /api/opportunities
 */
router.post('/', createOpportunityValidator, validateRequest, create)

/**
 * =========================================================
 * STAGE
 * =========================================================
 */

/**
 * PATCH
 * /api/opportunities/:id/stage
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
 */

/**
 * POST
 * /api/opportunities/:id/interactions
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
 */

/**
 * GET
 * /api/opportunities/:id
 */
router.get('/:id', opportunityIdValidator, validateRequest, getById)

/**
 * =========================================================
 * UPDATE
 * =========================================================
 */

/**
 * PATCH
 * /api/opportunities/:id
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
 */

/**
 * DELETE
 * /api/opportunities/:id
 */
router.delete('/:id', opportunityIdValidator, validateRequest, archive)

export default router
