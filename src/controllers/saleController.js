// controllers/saleController.js

import * as saleService from '../service/saleService.js'

// ============================================================
// HELPERS
// ============================================================

const getUserId = (req) => {
  return (
    req.user?._id || req.user?.id || req.auth?.userId || req.auth?.id || null
  )
}

const getErrorMessage = (error, fallback) => {
  return error?.message || error?.response?.data?.message || fallback
}

const getStatusCode = (error) => {
  const message = error?.message || ''

  if (
    message.toLowerCase().includes('não encontrada') ||
    message.toLowerCase().includes('nao encontrada')
  ) {
    return 404
  }

  if (
    message.toLowerCase().includes('inválido') ||
    message.toLowerCase().includes('invalido') ||
    message.toLowerCase().includes('obrigatório') ||
    message.toLowerCase().includes('obrigatoria') ||
    message.toLowerCase().includes('já existe') ||
    message.toLowerCase().includes('ja existe') ||
    message.toLowerCase().includes('não pode') ||
    message.toLowerCase().includes('nao pode')
  ) {
    return 400
  }

  return 500
}

// ============================================================
// CREATE
// POST /api/sales
// ============================================================

export const createSale = async (req, res) => {
  try {
    const userId = getUserId(req)

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado.',
      })
    }

    const sale = await saleService.createSale(req.body, userId)

    return res.status(201).json({
      success: true,
      message: 'Venda criada com sucesso.',
      sale,
    })
  } catch (error) {
    console.error('❌ Erro ao criar venda:', error)

    return res.status(getStatusCode(error)).json({
      success: false,
      message: getErrorMessage(error, 'Não foi possível criar a venda.'),
    })
  }
}

// ============================================================
// GET BY ID
// GET /api/sales/:id
// ============================================================

export const getSaleById = async (req, res) => {
  try {
    const { id } = req.params

    const sale = await saleService.getSaleById(id)

    return res.status(200).json({
      success: true,
      sale,
    })
  } catch (error) {
    console.error('❌ Erro ao buscar venda:', error)

    return res.status(getStatusCode(error)).json({
      success: false,
      message: getErrorMessage(error, 'Não foi possível buscar a venda.'),
    })
  }
}

// ============================================================
// LIST
// GET /api/sales
// ============================================================

export const getSales = async (req, res) => {
  try {
    const {
      page,
      limit,
      search,
      status,
      paymentStatus,
      type,
      broker,
      lead,
      property,
      proposal,
      startDate,
      endDate,
      sort,
    } = req.query

    const result = await saleService.getSales({
      page,
      limit,
      search,
      status,
      paymentStatus,
      type,
      broker,
      lead,
      property,
      proposal,
      startDate,
      endDate,
      sort,
    })

    return res.status(200).json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('❌ Erro ao buscar vendas:', error)

    return res.status(getStatusCode(error)).json({
      success: false,
      message: getErrorMessage(error, 'Não foi possível buscar as vendas.'),
    })
  }
}

// ============================================================
// UPDATE
// PATCH /api/sales/:id
// ============================================================

export const updateSale = async (req, res) => {
  try {
    const { id } = req.params

    const sale = await saleService.updateSale(id, req.body)

    return res.status(200).json({
      success: true,
      message: 'Venda atualizada com sucesso.',
      sale,
    })
  } catch (error) {
    console.error('❌ Erro ao atualizar venda:', error)

    return res.status(getStatusCode(error)).json({
      success: false,
      message: getErrorMessage(error, 'Não foi possível atualizar a venda.'),
    })
  }
}

// ============================================================
// DELETE
// DELETE /api/sales/:id
// ============================================================

export const deleteSale = async (req, res) => {
  try {
    const { id } = req.params

    const result = await saleService.deleteSale(id)

    return res.status(200).json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('❌ Erro ao excluir venda:', error)

    return res.status(getStatusCode(error)).json({
      success: false,
      message: getErrorMessage(error, 'Não foi possível excluir a venda.'),
    })
  }
}

// ============================================================
// CHANGE STATUS
// PATCH /api/sales/:id/status
// ============================================================

export const changeSaleStatus = async (req, res) => {
  try {
    const { id } = req.params

    const { status } = req.body

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'O status da venda é obrigatório.',
      })
    }

    const sale = await saleService.changeSaleStatus(id, status)

    return res.status(200).json({
      success: true,
      message: 'Status da venda atualizado com sucesso.',
      sale,
    })
  } catch (error) {
    console.error('❌ Erro ao alterar status da venda:', error)

    return res.status(getStatusCode(error)).json({
      success: false,
      message: getErrorMessage(
        error,
        'Não foi possível alterar o status da venda.',
      ),
    })
  }
}

// ============================================================
// APPROVE
// PATCH /api/sales/:id/approve
// ============================================================

export const approveSale = async (req, res) => {
  try {
    const { id } = req.params

    const sale = await saleService.approveSale(id)

    return res.status(200).json({
      success: true,
      message: 'Venda aprovada com sucesso.',
      sale,
    })
  } catch (error) {
    console.error('❌ Erro ao aprovar venda:', error)

    return res.status(getStatusCode(error)).json({
      success: false,
      message: getErrorMessage(error, 'Não foi possível aprovar a venda.'),
    })
  }
}

// ============================================================
// SIGN CONTRACT
// PATCH /api/sales/:id/sign-contract
// ============================================================

export const signSaleContract = async (req, res) => {
  try {
    const { id } = req.params

    const sale = await saleService.signSaleContract(id)

    return res.status(200).json({
      success: true,
      message: 'Contrato registrado com sucesso.',
      sale,
    })
  } catch (error) {
    console.error('❌ Erro ao registrar contrato da venda:', error)

    return res.status(getStatusCode(error)).json({
      success: false,
      message: getErrorMessage(error, 'Não foi possível registrar o contrato.'),
    })
  }
}

// ============================================================
// COMPLETE
// PATCH /api/sales/:id/complete
// ============================================================

export const completeSale = async (req, res) => {
  try {
    const { id } = req.params

    const sale = await saleService.completeSale(id)

    return res.status(200).json({
      success: true,
      message: 'Venda concluída com sucesso.',
      sale,
    })
  } catch (error) {
    console.error('❌ Erro ao concluir venda:', error)

    return res.status(getStatusCode(error)).json({
      success: false,
      message: getErrorMessage(error, 'Não foi possível concluir a venda.'),
    })
  }
}

// ============================================================
// CANCEL
// PATCH /api/sales/:id/cancel
// ============================================================

export const cancelSale = async (req, res) => {
  try {
    const { id } = req.params

    const { reason = '' } = req.body

    const sale = await saleService.cancelSale(id, reason)

    return res.status(200).json({
      success: true,
      message: 'Venda cancelada com sucesso.',
      sale,
    })
  } catch (error) {
    console.error('❌ Erro ao cancelar venda:', error)

    return res.status(getStatusCode(error)).json({
      success: false,
      message: getErrorMessage(error, 'Não foi possível cancelar a venda.'),
    })
  }
}

// ============================================================
// PAYMENT STATUS
// PATCH /api/sales/:id/payment-status
// ============================================================

export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params

    const { paymentStatus } = req.body

    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'O status de pagamento é obrigatório.',
      })
    }

    const sale = await saleService.updatePaymentStatus(id, paymentStatus)

    return res.status(200).json({
      success: true,
      message: 'Status de pagamento atualizado com sucesso.',
      sale,
    })
  } catch (error) {
    console.error('❌ Erro ao atualizar pagamento da venda:', error)

    return res.status(getStatusCode(error)).json({
      success: false,
      message: getErrorMessage(
        error,
        'Não foi possível atualizar o pagamento.',
      ),
    })
  }
}

// ============================================================
// SALES BY BROKER
// GET /api/sales/broker/:brokerId
// ============================================================

export const getSalesByBroker = async (req, res) => {
  try {
    const { brokerId } = req.params

    const result = await saleService.getSalesByBroker(brokerId, req.query)

    return res.status(200).json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('❌ Erro ao buscar vendas do corretor:', error)

    return res.status(getStatusCode(error)).json({
      success: false,
      message: getErrorMessage(
        error,
        'Não foi possível buscar as vendas do corretor.',
      ),
    })
  }
}

// ============================================================
// SALES BY LEAD
// GET /api/sales/lead/:leadId
// ============================================================

export const getSalesByLead = async (req, res) => {
  try {
    const { leadId } = req.params

    const result = await saleService.getSalesByLead(leadId, req.query)

    return res.status(200).json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('❌ Erro ao buscar vendas do lead:', error)

    return res.status(getStatusCode(error)).json({
      success: false,
      message: getErrorMessage(
        error,
        'Não foi possível buscar as vendas do lead.',
      ),
    })
  }
}

// ============================================================
// SALES BY PROPERTY
// GET /api/sales/property/:propertyId
// ============================================================

export const getSalesByProperty = async (req, res) => {
  try {
    const { propertyId } = req.params

    const result = await saleService.getSalesByProperty(propertyId, req.query)

    return res.status(200).json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('❌ Erro ao buscar vendas do imóvel:', error)

    return res.status(getStatusCode(error)).json({
      success: false,
      message: getErrorMessage(
        error,
        'Não foi possível buscar as vendas do imóvel.',
      ),
    })
  }
}

// ============================================================
// SALE BY PROPOSAL
// GET /api/sales/proposal/:proposalId
// ============================================================

export const getSaleByProposal = async (req, res) => {
  try {
    const { proposalId } = req.params

    const sale = await saleService.getSaleByProposal(proposalId)

    return res.status(200).json({
      success: true,
      sale,
    })
  } catch (error) {
    console.error('❌ Erro ao buscar venda da proposta:', error)

    return res.status(getStatusCode(error)).json({
      success: false,
      message: getErrorMessage(
        error,
        'Não foi possível buscar a venda da proposta.',
      ),
    })
  }
}

// ============================================================
// CHECK EXISTING SALE
// GET /api/sales/check
// ============================================================

export const checkExistingSale = async (req, res) => {
  try {
    const { lead, property, proposal } = req.query

    const sale = await saleService.checkExistingSale({
      lead,
      property,
      proposal,
    })

    return res.status(200).json({
      success: true,
      exists: Boolean(sale),
      sale,
    })
  } catch (error) {
    console.error('❌ Erro ao verificar venda existente:', error)

    return res.status(getStatusCode(error)).json({
      success: false,
      message: getErrorMessage(error, 'Não foi possível verificar a venda.'),
    })
  }
}

// ============================================================
// CREATE SALE FROM PROPOSAL
// POST /api/sales/from-proposal/:proposalId
// ============================================================

export const createSaleFromProposal = async (req, res) => {
  try {
    const userId = getUserId(req)

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado.',
      })
    }

    const { proposalId } = req.params

    const sale = await saleService.createSaleFromProposal(
      proposalId,
      userId,
      req.body || {},
    )

    return res.status(201).json({
      success: true,
      message: 'Venda criada a partir da proposta com sucesso.',
      sale,
    })
  } catch (error) {
    console.error('❌ Erro ao converter proposta em venda:', error)

    return res.status(getStatusCode(error)).json({
      success: false,
      message: getErrorMessage(
        error,
        'Não foi possível converter a proposta em venda.',
      ),
    })
  }
}

// ============================================================
// METRICS
// GET /api/sales/metrics
// ============================================================

export const getSaleMetrics = async (req, res) => {
  try {
    const { broker, startDate, endDate } = req.query

    const metrics = await saleService.getSaleMetrics({
      broker,
      startDate,
      endDate,
    })

    return res.status(200).json({
      success: true,
      metrics,
    })
  } catch (error) {
    console.error('❌ Erro ao buscar métricas de vendas:', error)

    return res.status(getStatusCode(error)).json({
      success: false,
      message: getErrorMessage(
        error,
        'Não foi possível buscar as métricas de vendas.',
      ),
    })
  }
}

// ============================================================
// DASHBOARD
// GET /api/sales/dashboard
// ============================================================

export const getSalesDashboard = async (req, res) => {
  try {
    const { broker, startDate, endDate } = req.query

    const dashboard = await saleService.getSalesDashboard({
      broker,
      startDate,
      endDate,
    })

    return res.status(200).json({
      success: true,
      ...dashboard,
    })
  } catch (error) {
    console.error('❌ Erro ao buscar dashboard de vendas:', error)

    return res.status(getStatusCode(error)).json({
      success: false,
      message: getErrorMessage(
        error,
        'Não foi possível carregar o dashboard de vendas.',
      ),
    })
  }
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  createSale,
  getSaleById,
  getSales,
  updateSale,
  deleteSale,

  changeSaleStatus,
  approveSale,
  signSaleContract,
  completeSale,
  cancelSale,

  updatePaymentStatus,

  getSalesByBroker,
  getSalesByLead,
  getSalesByProperty,
  getSaleByProposal,

  checkExistingSale,

  createSaleFromProposal,

  getSaleMetrics,
  getSalesDashboard,
}
