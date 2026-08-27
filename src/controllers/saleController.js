/*
|--------------------------------------------------------------------------
| SALE CONTROLLER
|--------------------------------------------------------------------------
|
| Controller responsável pelo módulo de Vendas.
|
| Fluxo principal:
|
| Proposal ACCEPTED
|       ↓
| createSaleFromProposal()
|       ↓
| Sale PENDING
|       ↓
| Sale CONTRACT
|       ↓
| Sale COMPLETED
|       ↓
| Lead GANHO
|       ↓
| Property SOLD
|
|--------------------------------------------------------------------------
*/

import {
  createSaleFromProposal,
  getSaleById,
  getSales,
  updateSaleStatus,
  completeSale,
  cancelSale,
  updateSalePaymentStatus,
  getSaleMetrics,
} from '../service/saleService.js'

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

/**
 * Obtém o usuário autenticado.
 *
 * O middleware de autenticação deve
 * disponibilizar req.user.
 */
const getAuthenticatedUser = (req) => {
  if (!req.user) {
    const error = new Error('Usuário não autenticado.')
    error.statusCode = 401
    throw error
  }

  return req.user
}

/**
 * Normaliza erro para resposta HTTP.
 */
const handleControllerError = (res, error) => {
  console.error('❌ SaleController:', error)

  const statusCode =
    error?.statusCode || (error?.name === 'ValidationError' ? 400 : 500)

  return res.status(statusCode).json({
    success: false,
    message: error?.message || 'Erro interno ao processar a venda.',
  })
}

/**
 * Converte valor para número quando necessário.
 */
const parseNumber = (value, defaultValue = undefined) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue
  }

  const number = Number(value)

  return Number.isFinite(number) ? number : defaultValue
}

/*
|--------------------------------------------------------------------------
| CREATE SALE FROM PROPOSAL
|--------------------------------------------------------------------------
|
| POST /api/sales/from-proposal/:proposalId
|
| Também pode ser utilizado pelo:
|
| POST /api/proposals/:proposalId/convert-sale
|
| dependendo da configuração das rotas.
|
|--------------------------------------------------------------------------
*/

export const createSaleFromProposalController = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req)

    const { proposalId } = req.params

    if (!proposalId) {
      return res.status(400).json({
        success: false,
        message: 'ID da proposta é obrigatório.',
      })
    }

    const { saleNumber, status, paymentStatus, saleDate, notes, commission } =
      req.body || {}

    const sale = await createSaleFromProposal({
      proposalId,

      user,

      data: {
        saleNumber,

        status,

        paymentStatus,

        saleDate,

        notes,

        commission,
      },
    })

    return res.status(201).json({
      success: true,

      message: 'Venda criada com sucesso.',

      data: sale,
    })
  } catch (error) {
    return handleControllerError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| GET SALE BY ID
|--------------------------------------------------------------------------
|
| GET /api/sales/:saleId
|
|--------------------------------------------------------------------------
*/

export const getSaleByIdController = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req)

    const { saleId } = req.params

    if (!saleId) {
      return res.status(400).json({
        success: false,
        message: 'ID da venda é obrigatório.',
      })
    }

    const sale = await getSaleById({
      saleId,

      user,
    })

    return res.status(200).json({
      success: true,

      data: sale,
    })
  } catch (error) {
    return handleControllerError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| GET SALES
|--------------------------------------------------------------------------
|
| GET /api/sales
|
| Query params:
|
| page
| limit
| search
| status
| paymentStatus
| sellerBroker
| acquisitionBroker
| lead
| property
| startDate
| endDate
| sort
|
|--------------------------------------------------------------------------
*/

export const getSalesController = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req)

    const {
      page,
      limit,
      search,
      status,
      paymentStatus,
      sellerBroker,
      acquisitionBroker,
      lead,
      property,
      startDate,
      endDate,
      sort,
    } = req.query

    const result = await getSales({
      user,

      page: parseNumber(page, 1),

      limit: parseNumber(limit, 20),

      search: search || '',

      status,

      paymentStatus,

      sellerBroker,

      acquisitionBroker,

      lead,

      property,

      startDate,

      endDate,

      sort: sort || '-createdAt',
    })

    return res.status(200).json({
      success: true,

      data: result.data,

      pagination: result.pagination,
    })
  } catch (error) {
    return handleControllerError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| UPDATE SALE STATUS
|--------------------------------------------------------------------------
|
| PATCH /api/sales/:saleId/status
|
| Body:
|
| {
|   "status": "contract",
|   "notes": "Contrato enviado"
| }
|
|--------------------------------------------------------------------------
*/

export const updateSaleStatusController = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req)

    const { saleId } = req.params

    const { status, notes } = req.body || {}

    if (!saleId) {
      return res.status(400).json({
        success: false,
        message: 'ID da venda é obrigatório.',
      })
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'O status da venda é obrigatório.',
      })
    }

    const sale = await updateSaleStatus({
      saleId,

      status,

      user,

      notes,
    })

    return res.status(200).json({
      success: true,

      message: 'Status da venda atualizado com sucesso.',

      data: sale,
    })
  } catch (error) {
    return handleControllerError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| COMPLETE SALE
|--------------------------------------------------------------------------
|
| PATCH /api/sales/:saleId/complete
|
| Body:
|
| {
|   "notes": "Venda concluída."
| }
|
|--------------------------------------------------------------------------
*/

export const completeSaleController = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req)

    const { saleId } = req.params

    const { notes } = req.body || {}

    if (!saleId) {
      return res.status(400).json({
        success: false,
        message: 'ID da venda é obrigatório.',
      })
    }

    const sale = await completeSale({
      saleId,

      user,

      notes,
    })

    return res.status(200).json({
      success: true,

      message: 'Venda concluída com sucesso.',

      data: sale,
    })
  } catch (error) {
    return handleControllerError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| CANCEL SALE
|--------------------------------------------------------------------------
|
| PATCH /api/sales/:saleId/cancel
|
| Body:
|
| {
|   "reason": "Cliente desistiu da compra."
| }
|
|--------------------------------------------------------------------------
*/

export const cancelSaleController = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req)

    const { saleId } = req.params

    const { reason } = req.body || {}

    if (!saleId) {
      return res.status(400).json({
        success: false,
        message: 'ID da venda é obrigatório.',
      })
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Informe o motivo do cancelamento.',
      })
    }

    const sale = await cancelSale({
      saleId,

      user,

      reason,
    })

    return res.status(200).json({
      success: true,

      message: 'Venda cancelada com sucesso.',

      data: sale,
    })
  } catch (error) {
    return handleControllerError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| UPDATE PAYMENT STATUS
|--------------------------------------------------------------------------
|
| PATCH /api/sales/:saleId/payment-status
|
| Body:
|
| {
|   "paymentStatus": "partial"
| }
|
|--------------------------------------------------------------------------
*/

export const updateSalePaymentStatusController = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req)

    const { saleId } = req.params

    const { paymentStatus } = req.body || {}

    if (!saleId) {
      return res.status(400).json({
        success: false,
        message: 'ID da venda é obrigatório.',
      })
    }

    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'O status financeiro é obrigatório.',
      })
    }

    const sale = await updateSalePaymentStatus({
      saleId,

      paymentStatus,

      user,
    })

    return res.status(200).json({
      success: true,

      message: 'Status financeiro atualizado com sucesso.',

      data: sale,
    })
  } catch (error) {
    return handleControllerError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| SALE METRICS
|--------------------------------------------------------------------------
|
| GET /api/sales/metrics
|
| Query:
|
| startDate
| endDate
|
|--------------------------------------------------------------------------
*/

export const getSaleMetricsController = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req)

    const { startDate, endDate } = req.query

    const metrics = await getSaleMetrics({
      user,

      startDate,

      endDate,
    })

    return res.status(200).json({
      success: true,

      data: metrics,
    })
  } catch (error) {
    return handleControllerError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| CONVERT SALE
|--------------------------------------------------------------------------
|
| Alias para facilitar integração com o módulo
| de Propostas.
|
| POST /api/proposals/:proposalId/convert-sale
|
|--------------------------------------------------------------------------
|
| Caso suas rotas estejam apontando diretamente
| para createSaleFromProposalController, este
| método também pode ser usado como alias.
|
|--------------------------------------------------------------------------
*/

export const convertProposalToSaleController = async (req, res) => {
  return createSaleFromProposalController(req, res)
}

/*
|--------------------------------------------------------------------------
| DEFAULT EXPORT
|--------------------------------------------------------------------------
*/

export default {
  createSaleFromProposalController,

  convertProposalToSaleController,

  getSaleByIdController,

  getSalesController,

  updateSaleStatusController,

  completeSaleController,

  cancelSaleController,

  updateSalePaymentStatusController,

  getSaleMetricsController,
}
