import { body, param } from 'express-validator'
import mongoose from 'mongoose'

import {
  OPPORTUNITY_STAGE_LIST,
  OPPORTUNITY_STATUS_LIST,
  OPPORTUNITY_TYPE_LIST,
  OPPORTUNITY_TEMPERATURE_LIST,
  OPPORTUNITY_PRIORITY_LIST,
} from '../models/Opportunity.js'

/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

/**
 * Verifica se o valor é um ObjectId válido.
 */
const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value)
}

/**
 * Verifica se uma data é válida.
 */
const isValidDate = (value) => {
  if (!value) return true

  const date = new Date(value)

  return !Number.isNaN(date.getTime())
}

/**
 * =========================================================
 * CONSTANTES
 * =========================================================
 */

const INTERACTION_TYPES = [
  'ligacao',
  'whatsapp',
  'email',
  'mensagem',
  'visita',
  'reuniao',
  'nota',
  'outro',
]

/**
 * =========================================================
 * CREATE OPPORTUNITY
 * =========================================================
 */

export const createOpportunityValidator = [
  /**
   * -------------------------------------------------------
   * TITLE
   * -------------------------------------------------------
   */

  body('title')
    .trim()
    .notEmpty()
    .withMessage('O título da oportunidade é obrigatório.')
    .isLength({
      min: 3,
      max: 150,
    })
    .withMessage('O título deve ter entre 3 e 150 caracteres.'),

  /**
   * -------------------------------------------------------
   * DESCRIPTION
   * -------------------------------------------------------
   */

  body('description')
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 3000,
    })
    .withMessage('A descrição deve ter no máximo 3000 caracteres.'),

  /**
   * -------------------------------------------------------
   * LEAD
   * -------------------------------------------------------
   */

  body('lead')
    .notEmpty()
    .withMessage('O lead é obrigatório.')
    .custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error('O ID do lead é inválido.')
      }

      return true
    }),

  /**
   * -------------------------------------------------------
   * PROPERTY
   * -------------------------------------------------------
   */

  body('property')
    .optional({
      nullable: true,
    })
    .custom((value) => {
      if (!value) return true

      if (!isValidObjectId(value)) {
        throw new Error('O ID do imóvel é inválido.')
      }

      return true
    }),

  /**
   * -------------------------------------------------------
   * ASSIGNED TO
   * -------------------------------------------------------
   */

  body('assignedTo')
    .optional({
      nullable: true,
    })
    .custom((value) => {
      if (!value) return true

      if (!isValidObjectId(value)) {
        throw new Error('O ID do responsável pela oportunidade é inválido.')
      }

      return true
    }),

  /**
   * -------------------------------------------------------
   * TYPE
   * -------------------------------------------------------
   */

  body('type')
    .optional()
    .isIn(OPPORTUNITY_TYPE_LIST)
    .withMessage(
      `O tipo deve ser um dos seguintes valores: ${OPPORTUNITY_TYPE_LIST.join(
        ', ',
      )}.`,
    ),

  /**
   * -------------------------------------------------------
   * STAGE
   * -------------------------------------------------------
   *
   * Pode ser informado na criação.
   *
   * Depois da criação, alterações de stage devem utilizar:
   *
   * PATCH /api/opportunities/:id/stage
   */

  body('stage')
    .optional()
    .isIn(OPPORTUNITY_STAGE_LIST)
    .withMessage(
      `O estágio deve ser um dos seguintes valores: ${OPPORTUNITY_STAGE_LIST.join(
        ', ',
      )}.`,
    ),

  /**
   * -------------------------------------------------------
   * STATUS
   * -------------------------------------------------------
   *
   * Permitido somente na criação.
   *
   * Porém o ideal é que normalmente seja omitido,
   * deixando o Model utilizar "aberta".
   */

  body('status')
    .optional()
    .isIn(OPPORTUNITY_STATUS_LIST)
    .withMessage(
      `O status deve ser um dos seguintes valores: ${OPPORTUNITY_STATUS_LIST.join(
        ', ',
      )}.`,
    ),

  /**
   * -------------------------------------------------------
   * TEMPERATURE
   * -------------------------------------------------------
   */

  body('temperature')
    .optional()
    .isIn(OPPORTUNITY_TEMPERATURE_LIST)
    .withMessage(
      `A temperatura deve ser um dos seguintes valores: ${OPPORTUNITY_TEMPERATURE_LIST.join(
        ', ',
      )}.`,
    ),

  /**
   * -------------------------------------------------------
   * PRIORITY
   * -------------------------------------------------------
   */

  body('priority')
    .optional()
    .isIn(OPPORTUNITY_PRIORITY_LIST)
    .withMessage(
      `A prioridade deve ser um dos seguintes valores: ${OPPORTUNITY_PRIORITY_LIST.join(
        ', ',
      )}.`,
    ),

  /**
   * -------------------------------------------------------
   * ESTIMATED VALUE
   * -------------------------------------------------------
   */

  body('estimatedValue')
    .optional()
    .isFloat({
      min: 0,
    })
    .withMessage('O valor estimado deve ser um número maior ou igual a zero.')
    .toFloat(),

  /**
   * -------------------------------------------------------
   * EXPECTED CLOSING VALUE
   * -------------------------------------------------------
   */

  body('expectedClosingValue')
    .optional()
    .isFloat({
      min: 0,
    })
    .withMessage(
      'O valor esperado de fechamento deve ser um número maior ou igual a zero.',
    )
    .toFloat(),

  /**
   * -------------------------------------------------------
   * PROBABILITY
   * -------------------------------------------------------
   */

  body('probability')
    .optional()
    .isFloat({
      min: 0,
      max: 100,
    })
    .withMessage('A probabilidade deve estar entre 0 e 100.')
    .toFloat(),

  /**
   * -------------------------------------------------------
   * EXPECTED CLOSING DATE
   * -------------------------------------------------------
   */

  body('expectedClosingDate')
    .optional({
      nullable: true,
    })
    .custom((value) => {
      if (!isValidDate(value)) {
        throw new Error('A data prevista de fechamento é inválida.')
      }

      return true
    }),

  /**
   * -------------------------------------------------------
   * LAST INTERACTION
   * -------------------------------------------------------
   */

  body('lastInteractionAt')
    .optional({
      nullable: true,
    })
    .custom((value) => {
      if (!isValidDate(value)) {
        throw new Error('A data da última interação é inválida.')
      }

      return true
    }),

  /**
   * -------------------------------------------------------
   * NEXT ACTION DATE
   * -------------------------------------------------------
   */

  body('nextActionAt')
    .optional({
      nullable: true,
    })
    .custom((value) => {
      if (!isValidDate(value)) {
        throw new Error('A data da próxima ação é inválida.')
      }

      return true
    }),

  /**
   * -------------------------------------------------------
   * NEXT ACTION
   * -------------------------------------------------------
   */

  body('nextAction')
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 500,
    })
    .withMessage('A próxima ação deve ter no máximo 500 caracteres.'),

  /**
   * -------------------------------------------------------
   * SOURCE
   * -------------------------------------------------------
   */

  body('source')
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 100,
    })
    .withMessage('A origem deve ter no máximo 100 caracteres.'),

  /**
   * -------------------------------------------------------
   * LOST REASON
   * -------------------------------------------------------
   *
   * Normalmente não deve ser enviado na criação.
   *
   * A perda será tratada pelo endpoint /stage.
   */

  body('lostReason')
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 1000,
    })
    .withMessage('O motivo da perda deve ter no máximo 1000 caracteres.'),

  /**
   * -------------------------------------------------------
   * NOTES
   * -------------------------------------------------------
   */

  body('notes')
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 5000,
    })
    .withMessage('As observações devem ter no máximo 5000 caracteres.'),
]

/**
 * =========================================================
 * UPDATE OPPORTUNITY
 * =========================================================
 *
 * IMPORTANTE:
 *
 * Este endpoint NÃO altera:
 *
 * - stage
 * - status
 * - stageHistory
 * - interactions
 * - assignmentHistory
 * - createdBy
 * - wonAt
 * - lostAt
 *
 * Stage possui endpoint próprio.
 */

export const updateOpportunityValidator = [
  /**
   * -------------------------------------------------------
   * TITLE
   * -------------------------------------------------------
   */

  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('O título não pode ficar vazio.')
    .isLength({
      min: 3,
      max: 150,
    })
    .withMessage('O título deve ter entre 3 e 150 caracteres.'),

  /**
   * -------------------------------------------------------
   * DESCRIPTION
   * -------------------------------------------------------
   */

  body('description')
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 3000,
    })
    .withMessage('A descrição deve ter no máximo 3000 caracteres.'),

  /**
   * -------------------------------------------------------
   * LEAD
   * -------------------------------------------------------
   */

  body('lead')
    .optional()
    .custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error('O ID do lead é inválido.')
      }

      return true
    }),

  /**
   * -------------------------------------------------------
   * PROPERTY
   * -------------------------------------------------------
   */

  body('property')
    .optional({
      nullable: true,
    })
    .custom((value) => {
      if (!value) return true

      if (!isValidObjectId(value)) {
        throw new Error('O ID do imóvel é inválido.')
      }

      return true
    }),

  /**
   * -------------------------------------------------------
   * ASSIGNED TO
   * -------------------------------------------------------
   */

  body('assignedTo')
    .optional({
      nullable: true,
    })
    .custom((value) => {
      if (!value) return true

      if (!isValidObjectId(value)) {
        throw new Error('O ID do responsável pela oportunidade é inválido.')
      }

      return true
    }),

  /**
   * -------------------------------------------------------
   * TYPE
   * -------------------------------------------------------
   */

  body('type')
    .optional()
    .isIn(OPPORTUNITY_TYPE_LIST)
    .withMessage(
      `O tipo deve ser um dos seguintes valores: ${OPPORTUNITY_TYPE_LIST.join(
        ', ',
      )}.`,
    ),

  /**
   * -------------------------------------------------------
   * TEMPERATURE
   * -------------------------------------------------------
   */

  body('temperature')
    .optional()
    .isIn(OPPORTUNITY_TEMPERATURE_LIST)
    .withMessage(
      `A temperatura deve ser um dos seguintes valores: ${OPPORTUNITY_TEMPERATURE_LIST.join(
        ', ',
      )}.`,
    ),

  /**
   * -------------------------------------------------------
   * PRIORITY
   * -------------------------------------------------------
   */

  body('priority')
    .optional()
    .isIn(OPPORTUNITY_PRIORITY_LIST)
    .withMessage(
      `A prioridade deve ser um dos seguintes valores: ${OPPORTUNITY_PRIORITY_LIST.join(
        ', ',
      )}.`,
    ),

  /**
   * -------------------------------------------------------
   * ESTIMATED VALUE
   * -------------------------------------------------------
   */

  body('estimatedValue')
    .optional()
    .isFloat({
      min: 0,
    })
    .withMessage('O valor estimado deve ser maior ou igual a zero.')
    .toFloat(),

  /**
   * -------------------------------------------------------
   * EXPECTED CLOSING VALUE
   * -------------------------------------------------------
   */

  body('expectedClosingValue')
    .optional()
    .isFloat({
      min: 0,
    })
    .withMessage(
      'O valor esperado de fechamento deve ser maior ou igual a zero.',
    )
    .toFloat(),

  /**
   * -------------------------------------------------------
   * PROBABILITY
   * -------------------------------------------------------
   */

  body('probability')
    .optional()
    .isFloat({
      min: 0,
      max: 100,
    })
    .withMessage('A probabilidade deve estar entre 0 e 100.')
    .toFloat(),

  /**
   * -------------------------------------------------------
   * EXPECTED CLOSING DATE
   * -------------------------------------------------------
   */

  body('expectedClosingDate')
    .optional({
      nullable: true,
    })
    .custom((value) => {
      if (!isValidDate(value)) {
        throw new Error('A data prevista de fechamento é inválida.')
      }

      return true
    }),

  /**
   * -------------------------------------------------------
   * LAST INTERACTION
   * -------------------------------------------------------
   */

  body('lastInteractionAt')
    .optional({
      nullable: true,
    })
    .custom((value) => {
      if (!isValidDate(value)) {
        throw new Error('A data da última interação é inválida.')
      }

      return true
    }),

  /**
   * -------------------------------------------------------
   * NEXT ACTION
   * -------------------------------------------------------
   */

  body('nextAction')
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 500,
    })
    .withMessage('A próxima ação deve ter no máximo 500 caracteres.'),

  /**
   * -------------------------------------------------------
   * NEXT ACTION DATE
   * -------------------------------------------------------
   */

  body('nextActionAt')
    .optional({
      nullable: true,
    })
    .custom((value) => {
      if (!isValidDate(value)) {
        throw new Error('A data da próxima ação é inválida.')
      }

      return true
    }),

  /**
   * -------------------------------------------------------
   * SOURCE
   * -------------------------------------------------------
   */

  body('source')
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 100,
    })
    .withMessage('A origem deve ter no máximo 100 caracteres.'),

  /**
   * -------------------------------------------------------
   * NOTES
   * -------------------------------------------------------
   */

  body('notes')
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 5000,
    })
    .withMessage('As observações devem ter no máximo 5000 caracteres.'),
]

/**
 * =========================================================
 * OPPORTUNITY ID
 * =========================================================
 */

export const opportunityIdValidator = [
  param('id')
    .notEmpty()
    .withMessage('O ID da oportunidade é obrigatório.')
    .custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error('O ID da oportunidade é inválido.')
      }

      return true
    }),
]

/**
 * =========================================================
 * UPDATE STAGE
 * =========================================================
 *
 * Endpoint:
 *
 * PATCH /api/opportunities/:id/stage
 *
 * Responsável por:
 *
 * - alterar stage
 * - atualizar status
 * - registrar histórico
 * - sincronizar Lead
 * - controlar ganha/perdida
 */

export const updateOpportunityStageValidator = [
  /**
   * -------------------------------------------------------
   * STAGE
   * -------------------------------------------------------
   */

  body('stage')
    .notEmpty()
    .withMessage('O estágio da oportunidade é obrigatório.')
    .isIn(OPPORTUNITY_STAGE_LIST)
    .withMessage(
      `O estágio deve ser um dos seguintes valores: ${OPPORTUNITY_STAGE_LIST.join(
        ', ',
      )}.`,
    ),

  /**
   * -------------------------------------------------------
   * NOTE
   * -------------------------------------------------------
   */

  body('note')
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 1000,
    })
    .withMessage('A observação deve ter no máximo 1000 caracteres.'),

  /**
   * -------------------------------------------------------
   * LOST REASON
   * -------------------------------------------------------
   */

  body('lostReason')
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 1000,
    })
    .withMessage('O motivo da perda deve ter no máximo 1000 caracteres.'),

  /**
   * -------------------------------------------------------
   * REGRA DE PERDA
   * -------------------------------------------------------
   */

  body().custom((body) => {
    if (
      body.stage === 'perdida' &&
      (!body.lostReason || !String(body.lostReason).trim())
    ) {
      throw new Error(
        'O motivo da perda é obrigatório quando a oportunidade é marcada como perdida.',
      )
    }

    /**
     * Se não for perdida, ignoramos qualquer
     * lostReason enviado.
     */

    return true
  }),
]

/**
 * =========================================================
 * ADD INTERACTION
 * =========================================================
 */

export const addOpportunityInteractionValidator = [
  /**
   * -------------------------------------------------------
   * TYPE
   * -------------------------------------------------------
   */

  body('type')
    .notEmpty()
    .withMessage('O tipo da interação é obrigatório.')
    .isIn(INTERACTION_TYPES)
    .withMessage(
      `O tipo da interação deve ser um dos seguintes valores: ${INTERACTION_TYPES.join(
        ', ',
      )}.`,
    ),

  /**
   * -------------------------------------------------------
   * DESCRIPTION
   * -------------------------------------------------------
   */

  body('description')
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 2000,
    })
    .withMessage('A descrição deve ter no máximo 2000 caracteres.'),
]

/**
 * =========================================================
 * EXPORT DEFAULT
 * =========================================================
 */

export default {
  createOpportunityValidator,
  updateOpportunityValidator,
  opportunityIdValidator,
  updateOpportunityStageValidator,
  addOpportunityInteractionValidator,
}
