import proposalService from '../service/proposalService.js'

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const getUser = (req) => {
  return req.user
}

const sendSuccess = ({
  res,
  statusCode = 200,
  message = 'Operação realizada com sucesso.',
  data = null,
}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  })
}

const sendError = (res, error) => {
  const statusCode = error?.statusCode || 500

  return res.status(statusCode).json({
    success: false,
    message: error?.message || 'Erro interno do servidor.',

    ...(process.env.NODE_ENV !== 'production' && error?.stack
      ? {
          stack: error.stack,
        }
      : {}),
  })
}

/*
|--------------------------------------------------------------------------
| CREATE
|--------------------------------------------------------------------------
| POST /api/proposals
|--------------------------------------------------------------------------
*/

export const createProposal = async (req, res) => {
  try {
    const proposal = await proposalService.createProposal({
      data: req.body,
      user: getUser(req),
    })

    return sendSuccess({
      res,
      statusCode: 201,
      message: 'Proposta criada com sucesso.',
      data: proposal,
    })
  } catch (error) {
    return sendError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| UPDATE
|--------------------------------------------------------------------------
| PATCH /api/proposals/:proposalId
|--------------------------------------------------------------------------
|
| Somente propostas em DRAFT podem ser alteradas.
|
*/

export const updateProposal = async (req, res) => {
  try {
    const proposal = await proposalService.updateProposal({
      proposalId: req.params.proposalId,
      data: req.body,
      user: getUser(req),
    })

    return sendSuccess({
      res,
      statusCode: 200,
      message: 'Proposta atualizada com sucesso.',
      data: proposal,
    })
  } catch (error) {
    return sendError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| SUBMIT
|--------------------------------------------------------------------------
| PATCH /api/proposals/:proposalId/submit
|--------------------------------------------------------------------------
|
| DRAFT → PENDING
|
*/

export const submitProposal = async (req, res) => {
  try {
    const proposal = await proposalService.submitProposal({
      proposalId: req.params.proposalId,
      user: getUser(req),
    })

    return sendSuccess({
      res,
      statusCode: 200,
      message: 'Proposta enviada para aprovação com sucesso.',
      data: proposal,
    })
  } catch (error) {
    return sendError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| APPROVE
|--------------------------------------------------------------------------
| PATCH /api/proposals/:proposalId/approve
|--------------------------------------------------------------------------
|
| PENDING → ACCEPTED
|
| Somente ADMIN.
|
*/

export const approveProposal = async (req, res) => {
  try {
    const proposal = await proposalService.approveProposal({
      proposalId: req.params.proposalId,
      user: getUser(req),
      comment: req.body?.comment || '',
    })

    return sendSuccess({
      res,
      statusCode: 200,
      message: 'Proposta aprovada com sucesso.',
      data: proposal,
    })
  } catch (error) {
    return sendError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| REJECT
|--------------------------------------------------------------------------
| PATCH /api/proposals/:proposalId/reject
|--------------------------------------------------------------------------
|
| PENDING → REJECTED
|
*/

export const rejectProposal = async (req, res) => {
  try {
    const proposal = await proposalService.rejectProposal({
      proposalId: req.params.proposalId,
      user: getUser(req),
      reason: req.body?.reason,
    })

    return sendSuccess({
      res,
      statusCode: 200,
      message: 'Proposta rejeitada com sucesso.',
      data: proposal,
    })
  } catch (error) {
    return sendError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| CANCEL
|--------------------------------------------------------------------------
| PATCH /api/proposals/:proposalId/cancel
|--------------------------------------------------------------------------
|
*/

export const cancelProposal = async (req, res) => {
  try {
    const proposal = await proposalService.cancelProposal({
      proposalId: req.params.proposalId,
      user: getUser(req),
      reason: req.body?.reason || '',
    })

    return sendSuccess({
      res,
      statusCode: 200,
      message: 'Proposta cancelada com sucesso.',
      data: proposal,
    })
  } catch (error) {
    return sendError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| GET BY ID
|--------------------------------------------------------------------------
| GET /api/proposals/:proposalId
|--------------------------------------------------------------------------
*/

export const getProposalById = async (req, res) => {
  try {
    const proposal = await proposalService.getProposalById({
      proposalId: req.params.proposalId,
      user: getUser(req),
    })

    return sendSuccess({
      res,
      statusCode: 200,
      message: 'Proposta encontrada.',
      data: proposal,
    })
  } catch (error) {
    return sendError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| GET ALL
|--------------------------------------------------------------------------
| GET /api/proposals
|--------------------------------------------------------------------------
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
*/

export const getProposals = async (req, res) => {
  try {
    const {
      page,
      limit,
      search,
      status,
      broker,
      lead,
      property,
      startDate,
      endDate,
      sort,
    } = req.query

    /*
     * Status pode chegar como:
     *
     * ?status=pending
     *
     * ou:
     *
     * ?status=pending,accepted
     *
     * Também aceitamos:
     *
     * ?status=pending&status=accepted
     */

    let normalizedStatus = status

    if (Array.isArray(status)) {
      normalizedStatus = status
        .flatMap((item) =>
          String(item)
            .split(',')
            .map((value) => value.trim()),
        )
        .filter(Boolean)
    } else if (typeof status === 'string' && status.includes(',')) {
      normalizedStatus = status
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    }

    const result = await proposalService.getProposals({
      user: getUser(req),

      page,

      limit,

      search,

      status: normalizedStatus,

      broker,

      lead,

      property,

      startDate,

      endDate,

      sort,
    })

    return sendSuccess({
      res,
      statusCode: 200,
      message: 'Propostas carregadas com sucesso.',
      data: result,
    })
  } catch (error) {
    return sendError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| HISTORY
|--------------------------------------------------------------------------
| GET /api/proposals/:proposalId/history
|--------------------------------------------------------------------------
*/

export const getProposalHistory = async (req, res) => {
  try {
    const history = await proposalService.getProposalHistory({
      proposalId: req.params.proposalId,
      user: getUser(req),
    })

    return sendSuccess({
      res,
      statusCode: 200,
      message: 'Histórico da proposta carregado com sucesso.',
      data: history,
    })
  } catch (error) {
    return sendError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| GET BY LEAD
|--------------------------------------------------------------------------
| GET /api/proposals/lead/:leadId
|--------------------------------------------------------------------------
*/

export const getProposalsByLead = async (req, res) => {
  try {
    const proposals = await proposalService.getProposalsByLead({
      leadId: req.params.leadId,
      user: getUser(req),
    })

    return sendSuccess({
      res,
      statusCode: 200,
      message: 'Propostas do Lead carregadas com sucesso.',
      data: proposals,
    })
  } catch (error) {
    return sendError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| GET BY PROPERTY
|--------------------------------------------------------------------------
| GET /api/proposals/property/:propertyId
|--------------------------------------------------------------------------
*/

export const getProposalsByProperty = async (req, res) => {
  try {
    const proposals = await proposalService.getProposalsByProperty({
      propertyId: req.params.propertyId,
      user: getUser(req),
    })

    return sendSuccess({
      res,
      statusCode: 200,
      message: 'Propostas do imóvel carregadas com sucesso.',
      data: proposals,
    })
  } catch (error) {
    return sendError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| METRICS
|--------------------------------------------------------------------------
| GET /api/proposals/metrics
|--------------------------------------------------------------------------
|
| Query params:
|
| startDate
| endDate
| broker
|
*/

export const getProposalMetrics = async (req, res) => {
  try {
    const { startDate, endDate, broker } = req.query

    const metrics = await proposalService.getProposalMetrics({
      user: getUser(req),

      startDate,

      endDate,

      broker,
    })

    return sendSuccess({
      res,
      statusCode: 200,
      message: 'Métricas de propostas carregadas com sucesso.',
      data: metrics,
    })
  } catch (error) {
    return sendError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| DEFAULT EXPORT
|--------------------------------------------------------------------------
*/

export default {
  createProposal,

  updateProposal,

  submitProposal,

  approveProposal,

  rejectProposal,

  cancelProposal,

  getProposalById,

  getProposals,

  getProposalHistory,

  getProposalsByLead,

  getProposalsByProperty,

  getProposalMetrics,
}
