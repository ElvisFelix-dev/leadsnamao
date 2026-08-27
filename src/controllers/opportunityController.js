import {
  createOpportunity,
  getOpportunities,
  getOpportunityById,
  updateOpportunity,
  updateOpportunityStage,
  addOpportunityInteraction,
  archiveOpportunity,
} from '../service/opportunityService.js'

/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

/**
 * Verifica se o erro é relacionado a ObjectId inválido.
 */
const isCastError = (error) => {
  return error?.name === 'CastError'
}

/**
 * Verifica erros de validação do Mongoose.
 */
const isValidationError = (error) => {
  return error?.name === 'ValidationError'
}

/**
 * Verifica erro de chave duplicada.
 */
const isDuplicateKeyError = (error) => {
  return error?.code === 11000
}

/**
 * Retorno padronizado para erros.
 */
const sendError = ({ res, error, defaultMessage, statusCode = 500 }) => {
  console.error(defaultMessage, error)

  /**
   * ObjectId inválido
   */
  if (isCastError(error)) {
    return res.status(400).json({
      success: false,
      message: 'Identificador inválido.',
      error: error.message,
    })
  }

  /**
   * Validação do Mongoose
   */
  if (isValidationError(error)) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos.',
      error: error.message,
      errors: error.errors,
    })
  }

  /**
   * Documento duplicado
   */
  if (isDuplicateKeyError(error)) {
    return res.status(409).json({
      success: false,
      message: 'Já existe um registro com esses dados.',
      error: error.message,
    })
  }

  /**
   * Erro padrão
   */
  return res.status(statusCode).json({
    success: false,
    message: defaultMessage,
    error: error.message,
  })
}

/**
 * =========================================================
 * CREATE
 * =========================================================
 *
 * POST /api/opportunities
 *
 * Responsabilidades:
 *
 * 1. Receber dados da oportunidade
 * 2. Identificar usuário logado
 * 3. Enviar para OpportunityService
 *
 * createdBy NÃO vem do frontend.
 *
 * O Service utiliza:
 *
 * req.user._id
 *
 * =========================================================
 */

export const create = async (req, res) => {
  try {
    const opportunity = await createOpportunity(req.body, req.user._id)

    return res.status(201).json({
      success: true,
      message: 'Oportunidade criada com sucesso.',
      data: opportunity,
    })
  } catch (error) {
    return sendError({
      res,
      error,
      defaultMessage: 'Erro ao criar oportunidade.',
    })
  }
}

/**
 * =========================================================
 * GET ALL
 * =========================================================
 *
 * GET /api/opportunities
 *
 * Filtros suportados:
 *
 * page
 * limit
 * search
 * stage
 * status
 * type
 * temperature
 * priority
 * assignedTo
 * property
 * lead
 *
 * O Service é responsável por:
 *
 * - permissões
 * - filtros
 * - busca
 * - paginação
 * - populate
 *
 * =========================================================
 */

export const getAll = async (req, res) => {
  try {
    const result = await getOpportunities({
      userId: req.user._id,
      role: req.user.role,

      /**
       * Paginação
       */
      page: req.query.page,
      limit: req.query.limit,

      /**
       * Busca
       */
      search: req.query.search,

      /**
       * Pipeline
       */
      stage: req.query.stage,

      /**
       * Status
       */
      status: req.query.status,

      /**
       * Tipo de negócio
       */
      type: req.query.type,

      /**
       * Temperatura
       */
      temperature: req.query.temperature,

      /**
       * Prioridade
       */
      priority: req.query.priority,

      /**
       * Relacionamentos
       */
      assignedTo: req.query.assignedTo,
      property: req.query.property,
      lead: req.query.lead,
    })

    return res.status(200).json({
      success: true,
      ...result,
    })
  } catch (error) {
    return sendError({
      res,
      error,
      defaultMessage: 'Erro ao buscar oportunidades.',
    })
  }
}

/**
 * =========================================================
 * GET BY ID
 * =========================================================
 *
 * GET /api/opportunities/:id
 *
 * =========================================================
 */

export const getById = async (req, res) => {
  try {
    const opportunity = await getOpportunityById(req.params.id)

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Oportunidade não encontrada.',
      })
    }

    return res.status(200).json({
      success: true,
      data: opportunity,
    })
  } catch (error) {
    return sendError({
      res,
      error,
      defaultMessage: 'Erro ao buscar oportunidade.',
    })
  }
}

/**
 * =========================================================
 * UPDATE
 * =========================================================
 *
 * PUT/PATCH /api/opportunities/:id
 *
 * O Service protege:
 *
 * createdBy
 * stageHistory
 * interactions
 * assignmentHistory
 * _id
 *
 * O responsável pode ser alterado através do Service.
 *
 * Quando isso acontecer:
 *
 * Opportunity.assignedTo
 *        ↓
 * Lead.assignedTo
 *
 * =========================================================
 */

export const update = async (req, res) => {
  try {
    const opportunity = await updateOpportunity(
      req.params.id,
      req.body,
      req.user._id,
      req.user.role,
    )

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Oportunidade não encontrada ou sem permissão.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Oportunidade atualizada com sucesso.',
      data: opportunity,
    })
  } catch (error) {
    return sendError({
      res,
      error,
      defaultMessage: 'Erro ao atualizar oportunidade.',
    })
  }
}

/**
 * =========================================================
 * UPDATE STAGE
 * =========================================================
 *
 * PATCH /api/opportunities/:id/stage
 *
 * Body:
 *
 * {
 *   "stage": "negociacao",
 *   "note": "Cliente avançou na negociação"
 * }
 *
 * OU:
 *
 * {
 *   "stage": "perdida",
 *   "note": "Cliente desistiu",
 *   "lostReason": "Valor acima do orçamento"
 * }
 *
 * =========================================================
 *
 * FLUXO DE GANHA
 *
 * Opportunity:
 *
 * stage  = ganha
 * status = ganha
 * wonAt  = agora
 *
 * Lead:
 *
 * stage = fechado
 *
 * Sale:
 *
 * NÃO criada aqui.
 *
 * =========================================================
 *
 * FLUXO DE PERDIDA
 *
 * Opportunity:
 *
 * stage      = perdida
 * status     = perdida
 * lostAt     = agora
 * lostReason = motivo
 *
 * Lead:
 *
 * stage = perdido
 *
 * =========================================================
 */

export const updateStage = async (req, res) => {
  try {
    const { stage, note = '', lostReason = '' } = req.body

    /**
     * Stage é obrigatório.
     *
     * O Model também valida,
     * mas retornamos uma mensagem mais clara.
     */
    if (!stage) {
      return res.status(400).json({
        success: false,
        message: 'O campo "stage" é obrigatório.',
      })
    }

    /**
     * Não permitimos enviar lostReason
     * para qualquer stage como regra de negócio.
     *
     * O Service também controla o comportamento,
     * mas o controller mantém o contrato claro.
     */
    const opportunity = await updateOpportunityStage(
      req.params.id,
      stage,
      req.user._id,
      req.user.role,
      note,
      lostReason,
    )

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Oportunidade não encontrada ou sem permissão.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Etapa da oportunidade atualizada com sucesso.',
      data: opportunity,
    })
  } catch (error) {
    return sendError({
      res,
      error,
      defaultMessage: 'Erro ao atualizar etapa.',
    })
  }
}

/**
 * =========================================================
 * ADD INTERACTION
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
 *
 * =========================================================
 */

export const addInteraction = async (req, res) => {
  try {
    const opportunity = await addOpportunityInteraction(
      req.params.id,
      req.body,
      req.user._id,
      req.user.role,
    )

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Oportunidade não encontrada ou sem permissão.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Interação adicionada com sucesso.',
      data: opportunity,
    })
  } catch (error) {
    return sendError({
      res,
      error,
      defaultMessage: 'Erro ao adicionar interação.',
    })
  }
}

/**
 * =========================================================
 * ARCHIVE
 * =========================================================
 *
 * PATCH /api/opportunities/:id/archive
 *
 * A oportunidade não é excluída.
 *
 * Apenas:
 *
 * isArchived = true
 *
 * =========================================================
 */

export const archive = async (req, res) => {
  try {
    const opportunity = await archiveOpportunity(
      req.params.id,
      req.user._id,
      req.user.role,
    )

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Oportunidade não encontrada ou sem permissão.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Oportunidade arquivada com sucesso.',
      data: opportunity,
    })
  } catch (error) {
    return sendError({
      res,
      error,
      defaultMessage: 'Erro ao arquivar oportunidade.',
    })
  }
}
