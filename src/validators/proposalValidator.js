import { body, param, query } from 'express-validator'

import { PROPOSAL_STATUS_LIST } from '../constants/proposalStatus.js'

/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

const isValidObjectId = (value) => {
  return /^[a-f\d]{24}$/i.test(value)
}

/**
 * =========================================================
 * CREATE
 * =========================================================
 *
 * POST /api/proposals
 *
 * Campos:
 *
 * lead
 * property
 * broker
 * value
 * discount
 * finalValue
 * status
 * notes
 *
 * createdBy NÃO deve vir do frontend.
 * O service utiliza o usuário autenticado.
 */

export const createProposalValidator = [
  /**
   * -------------------------------------------------------
   * LEAD
   * -------------------------------------------------------
   */

  body('lead')
    .notEmpty()
    .withMessage('O lead é obrigatório.')
    .custom(isValidObjectId)
    .withMessage('O ID do lead é inválido.'),

  /**
   * -------------------------------------------------------
   * IMÓVEL
   * -------------------------------------------------------
   */

  body('property')
    .notEmpty()
    .withMessage('O imóvel é obrigatório.')
    .custom(isValidObjectId)
    .withMessage('O ID do imóvel é inválido.'),

  /**
   * -------------------------------------------------------
   * CORRETOR
   * -------------------------------------------------------
   *
   * O broker pode ser informado pelo admin.
   * Caso sua regra de negócio determine que o corretor
   * seja sempre o usuário logado, podemos retirar esse
   * campo posteriormente.
   */

  body('broker')
    .notEmpty()
    .withMessage('O corretor é obrigatório.')
    .custom(isValidObjectId)
    .withMessage('O ID do corretor é inválido.'),

  /**
   * -------------------------------------------------------
   * VALOR
   * -------------------------------------------------------
   */

  body('value')
    .notEmpty()
    .withMessage('O valor da proposta é obrigatório.')
    .isFloat({ min: 0 })
    .withMessage('O valor da proposta deve ser maior ou igual a zero.')
    .toFloat(),

  /**
   * -------------------------------------------------------
   * DESCONTO
   * -------------------------------------------------------
   */

  body('discount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('O desconto deve ser maior ou igual a zero.')
    .toFloat(),

  /**
   * -------------------------------------------------------
   * VALOR FINAL
   * -------------------------------------------------------
   */

  body('finalValue')
    .notEmpty()
    .withMessage('O valor final da proposta é obrigatório.')
    .isFloat({ min: 0 })
    .withMessage('O valor final deve ser maior ou igual a zero.')
    .toFloat(),

  /**
   * -------------------------------------------------------
   * STATUS
   * -------------------------------------------------------
   */

  body('status')
    .optional()
    .isIn(PROPOSAL_STATUS_LIST)
    .withMessage(
      `Status inválido. Valores permitidos: ${PROPOSAL_STATUS_LIST.join(', ')}`,
    ),

  /**
   * -------------------------------------------------------
   * OBSERVAÇÕES
   * -------------------------------------------------------
   */

  body('notes')
    .optional()
    .isString()
    .withMessage('As observações devem ser um texto.')
    .trim()
    .isLength({ max: 5000 })
    .withMessage('As observações podem ter no máximo 5000 caracteres.'),
]

/**
 * =========================================================
 * UPDATE
 * =========================================================
 *
 * PATCH /api/proposals/:id
 *
 * Todos os campos são opcionais.
 */

export const updateProposalValidator = [
  /**
   * -------------------------------------------------------
   * LEAD
   * -------------------------------------------------------
   */

  body('lead')
    .optional()
    .custom(isValidObjectId)
    .withMessage('O ID do lead é inválido.'),

  /**
   * -------------------------------------------------------
   * IMÓVEL
   * -------------------------------------------------------
   */

  body('property')
    .optional()
    .custom(isValidObjectId)
    .withMessage('O ID do imóvel é inválido.'),

  /**
   * -------------------------------------------------------
   * CORRETOR
   * -------------------------------------------------------
   */

  body('broker')
    .optional()
    .custom(isValidObjectId)
    .withMessage('O ID do corretor é inválido.'),

  /**
   * -------------------------------------------------------
   * VALOR
   * -------------------------------------------------------
   */

  body('value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('O valor da proposta deve ser maior ou igual a zero.')
    .toFloat(),

  /**
   * -------------------------------------------------------
   * DESCONTO
   * -------------------------------------------------------
   */

  body('discount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('O desconto deve ser maior ou igual a zero.')
    .toFloat(),

  /**
   * -------------------------------------------------------
   * VALOR FINAL
   * -------------------------------------------------------
   */

  body('finalValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('O valor final deve ser maior ou igual a zero.')
    .toFloat(),

  /**
   * -------------------------------------------------------
   * STATUS
   * -------------------------------------------------------
   *
   * Embora exista endpoint específico para status,
   * mantemos a validação aqui para evitar valores inválidos.
   */

  body('status')
    .optional()
    .isIn(PROPOSAL_STATUS_LIST)
    .withMessage(
      `Status inválido. Valores permitidos: ${PROPOSAL_STATUS_LIST.join(', ')}`,
    ),

  /**
   * -------------------------------------------------------
   * OBSERVAÇÕES
   * -------------------------------------------------------
   */

  body('notes')
    .optional()
    .isString()
    .withMessage('As observações devem ser um texto.')
    .trim()
    .isLength({ max: 5000 })
    .withMessage('As observações podem ter no máximo 5000 caracteres.'),
]

/**
 * =========================================================
 * ID
 * =========================================================
 *
 * GET    /api/proposals/:id
 * PATCH  /api/proposals/:id
 * DELETE /api/proposals/:id
 * PATCH  /api/proposals/:id/status
 */

export const proposalIdValidator = [
  param('id')
    .notEmpty()
    .withMessage('O ID da proposta é obrigatório.')
    .custom(isValidObjectId)
    .withMessage('O ID da proposta é inválido.'),
]

/**
 * =========================================================
 * STATUS
 * =========================================================
 *
 * PATCH /api/proposals/:id/status
 *
 * Body:
 *
 * {
 *   "status": "enviada"
 * }
 */

export const updateProposalStatusValidator = [
  body('status')
    .notEmpty()
    .withMessage('O status é obrigatório.')
    .isIn(PROPOSAL_STATUS_LIST)
    .withMessage(
      `Status inválido. Valores permitidos: ${PROPOSAL_STATUS_LIST.join(', ')}`,
    ),
]

/**
 * =========================================================
 * QUERY - LISTAGEM
 * =========================================================
 *
 * GET /api/proposals
 *
 * Exemplos:
 *
 * ?page=1
 * ?limit=12
 * ?status=enviada
 * ?broker=ID
 * ?lead=ID
 * ?property=ID
 */

export const proposalListValidator = [
  /**
   * -------------------------------------------------------
   * PAGE
   * -------------------------------------------------------
   */

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('A página deve ser um número inteiro maior que zero.')
    .toInt(),

  /**
   * -------------------------------------------------------
   * LIMIT
   * -------------------------------------------------------
   */

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('O limite deve estar entre 1 e 100.')
    .toInt(),

  /**
   * -------------------------------------------------------
   * STATUS
   * -------------------------------------------------------
   */

  query('status')
    .optional()
    .isIn(PROPOSAL_STATUS_LIST)
    .withMessage(
      `Status inválido. Valores permitidos: ${PROPOSAL_STATUS_LIST.join(', ')}`,
    ),

  /**
   * -------------------------------------------------------
   * BROKER
   * -------------------------------------------------------
   */

  query('broker')
    .optional()
    .custom(isValidObjectId)
    .withMessage('O ID do corretor é inválido.'),

  /**
   * -------------------------------------------------------
   * LEAD
   * -------------------------------------------------------
   */

  query('lead')
    .optional()
    .custom(isValidObjectId)
    .withMessage('O ID do lead é inválido.'),

  /**
   * -------------------------------------------------------
   * PROPERTY
   * -------------------------------------------------------
   */

  query('property')
    .optional()
    .custom(isValidObjectId)
    .withMessage('O ID do imóvel é inválido.'),
]

/**
 * =========================================================
 * EXPORT DEFAULT
 * =========================================================
 */

export default {
  createProposalValidator,
  updateProposalValidator,
  proposalIdValidator,
  updateProposalStatusValidator,
  proposalListValidator,
}
