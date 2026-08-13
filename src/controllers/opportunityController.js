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
 * CREATE
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
    console.error('Erro ao criar oportunidade:', error)

    return res.status(500).json({
      success: false,
      message: 'Erro ao criar oportunidade.',
      error: error.message,
    })
  }
}

/**
 * =========================================================
 * GET ALL
 * =========================================================
 */

export const getAll = async (req, res) => {
  try {
    const result = await getOpportunities({
      userId: req.user._id,
      role: req.user.role,

      page: req.query.page,
      limit: req.query.limit,

      search: req.query.search,
      stage: req.query.stage,
      status: req.query.status,
      type: req.query.type,
      temperature: req.query.temperature,
      priority: req.query.priority,

      assignedTo: req.query.assignedTo,
      property: req.query.property,
      lead: req.query.lead,
    })

    return res.status(200).json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Erro ao buscar oportunidades:', error)

    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar oportunidades.',
      error: error.message,
    })
  }
}

/**
 * =========================================================
 * GET BY ID
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
    console.error('Erro ao buscar oportunidade:', error)

    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar oportunidade.',
      error: error.message,
    })
  }
}

/**
 * =========================================================
 * UPDATE
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
    console.error('Erro ao atualizar oportunidade:', error)

    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar oportunidade.',
      error: error.message,
    })
  }
}

/**
 * =========================================================
 * UPDATE STAGE
 * =========================================================
 */

export const updateStage = async (req, res) => {
  try {
    const { stage, note, lostReason } = req.body

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
    console.error('Erro ao atualizar etapa:', error)

    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar etapa.',
      error: error.message,
    })
  }
}

/**
 * =========================================================
 * INTERACTION
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
    console.error('Erro ao adicionar interação:', error)

    return res.status(500).json({
      success: false,
      message: 'Erro ao adicionar interação.',
      error: error.message,
    })
  }
}

/**
 * =========================================================
 * ARCHIVE
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
    console.error('Erro ao arquivar oportunidade:', error)

    return res.status(500).json({
      success: false,
      message: 'Erro ao arquivar oportunidade.',
      error: error.message,
    })
  }
}
