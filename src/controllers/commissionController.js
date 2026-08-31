import Commission from '../models/Commission.js'
import CommissionService from '../service/commissionService.js'

// ... resto dos métodos (getAllCommissions, getCommissionById, etc.)

/**
 * Lista todas as comissões (admin)
 * GET /api/commissions
 * Suporta filtros: status, sale, sellerBroker, startDate, endDate
 */
export const getAllCommissions = async (req, res, next) => {
  try {
    const { status, sale, sellerBroker, capturerBroker, startDate, endDate } =
      req.query

    const filters = {}

    if (status) filters.status = status
    if (sale) filters.sale = sale
    if (sellerBroker) filters.sellerBroker = sellerBroker
    if (capturerBroker) filters.capturerBroker = capturerBroker

    if (startDate || endDate) {
      filters.createdAt = {}
      if (startDate) filters.createdAt.$gte = new Date(startDate)
      if (endDate) filters.createdAt.$lte = new Date(endDate)
    }

    const commissions = await Commission.find(filters)
      .populate('sale', 'saleNumber saleAmount status saleDate')
      .populate('lead', 'name phone email')
      .populate(
        'property',
        'name title code formattedCode description coverImage mainImage images photos location prices price purpose type category status slug',
      )
      .populate('sellerBroker', 'name email avatar')
      .populate('capturerBroker', 'name email avatar')
      .populate('approvedBy', 'name')
      .populate('paidBy', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      count: commissions.length,
      data: commissions,
    })
  } catch (error) {
    console.error('❌ Erro ao listar comissões:', error)
    next(error)
  }
}

/**
 * Busca comissão por ID
 * GET /api/commissions/:id
 */
export const getCommissionById = async (req, res, next) => {
  try {
    const commission = await Commission.findById(req.params.id)
      .populate('sale', 'saleNumber saleAmount status saleDate')
      .populate('lead', 'name phone email')
      .populate('property')
      .populate('sellerBroker', 'name email avatar position')
      .populate('capturerBroker', 'name email avatar')
      .populate('approvedBy', 'name')
      .populate('paidBy', 'name')
      .populate('createdBy', 'name')

    if (!commission) {
      return res.status(404).json({
        success: false,
        message: 'Comissão não encontrada',
      })
    }

    res.json({
      success: true,
      data: commission,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Minhas comissões (corretor)
 * GET /api/commissions/my-commissions
 */
export const getMyCommissions = async (req, res, next) => {
  try {
    const brokerId = req.user.id
    const { status } = req.query

    const filters = { status }
    const commissions = await CommissionService.getByBroker(brokerId, filters)

    res.json({
      success: true,
      count: commissions.length,
      data: commissions,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Resumo financeiro do corretor
 * GET /api/commissions/summary
 */
export const getCommissionSummary = async (req, res, next) => {
  try {
    const brokerId = req.user.id
    const summary = await CommissionService.getSummary(brokerId)

    res.json({
      success: true,
      data: summary,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Gera comissão a partir de venda
 * POST /api/commissions/generate-from-sale
 */
export const generateFromSale = async (req, res, next) => {
  try {
    const { saleId, config } = req.body
    const userId = req.user.id

    if (!saleId) {
      return res.status(400).json({
        success: false,
        message: 'ID da venda é obrigatório',
      })
    }

    console.log('📝 Gerando comissão para venda:', saleId)
    console.log('📝 Config:', config)

    const commission = await CommissionService.createFromSale(
      saleId,
      userId,
      config || {},
    )

    res.status(201).json({
      success: true,
      message: 'Comissão gerada com sucesso',
      data: commission,
    })
  } catch (error) {
    console.error('❌ Erro ao gerar comissão:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao gerar comissão',
    })
  }
}

/**
 * Aprova comissão
 * PATCH /api/commissions/:id/approve
 */
export const approveCommission = async (req, res, next) => {
  try {
    const userId = req.user.id
    const commission = await CommissionService.approve(req.params.id, userId)

    res.json({
      success: true,
      message: 'Comissão aprovada com sucesso',
      data: commission,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Marca comissão como paga
 * PATCH /api/commissions/:id/pay
 */
export const payCommission = async (req, res, next) => {
  try {
    const { paymentMethod, paymentProof } = req.body
    const userId = req.user.id

    const commission = await CommissionService.markAsPaid(
      req.params.id,
      userId,
      paymentMethod || 'bank_transfer',
    )

    if (paymentProof) {
      commission.paymentProof = paymentProof
      await commission.save()
    }

    res.json({
      success: true,
      message: 'Comissão marcada como paga',
      data: commission,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Cancela comissão
 * PATCH /api/commissions/:id/cancel
 */
export const cancelCommission = async (req, res, next) => {
  try {
    const { reason } = req.body
    const userId = req.user.id

    const commission = await CommissionService.cancel(
      req.params.id,
      userId,
      reason,
    )

    res.json({
      success: true,
      message: 'Comissão cancelada',
      data: commission,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Backfill - Gera comissões para vendas antigas
 * POST /api/commissions/backfill
 */
export const backfillCommissions = async (req, res, next) => {
  try {
    const userId = req.user.id
    const result = await CommissionService.backfillCommissions(userId)

    res.json({
      success: true,
      message: 'Backfill concluído',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}
