// services/saleService.js

import mongoose from 'mongoose'
import Sale from '../models/Sale.js'
import Lead from '../models/Lead.js'
import User from '../models/User.js'
import Property from '../models/Property.js'
import Proposal from '../models/Proposal.js'

// ============================================================
// CONSTANTS
// ============================================================

export const SALE_STATUS = {
  NEGOCIACAO: 'negociacao',
  APROVADA: 'aprovada',
  CONTRATO_ASSINADO: 'contrato_assinado',
  PAGAMENTO_PENDENTE: 'pagamento_pendente',
  CONCLUIDA: 'concluida',
  CANCELADA: 'cancelada',
}

export const SALE_STATUS_LIST = Object.values(SALE_STATUS)

export const SALE_PAYMENT_STATUS = {
  PENDENTE: 'pendente',
  PARCIAL: 'parcial',
  PAGO: 'pago',
  CANCELADO: 'cancelado',
}

export const SALE_PAYMENT_STATUS_LIST = Object.values(SALE_PAYMENT_STATUS)

export const SALE_TYPES = {
  VENDA: 'venda',
  LOCACAO: 'locacao',
  INVESTIMENTO: 'investimento',
}

export const SALE_TYPES_LIST = Object.values(SALE_TYPES)

// ============================================================
// POPULATE
// ============================================================

const SALE_POPULATE = [
  {
    path: 'lead',
    select: 'name email phone source status priority',
  },
  {
    path: 'property',
    select:
      'name code slug type category purpose price location images mainImage coverImage',
  },
  {
    path: 'broker',
    select: 'name email phone avatar position role',
  },
  {
    path: 'createdBy',
    select: 'name email role',
  },
  {
    path: 'proposal',
    select: 'title code status value paymentMethod createdAt updatedAt',
  },
]

// ============================================================
// HELPERS
// ============================================================

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id)
}

const normalizeId = (value) => {
  if (!value) return null

  if (typeof value === 'object' && value._id) {
    return value._id
  }

  return value
}

const parseNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') {
    return defaultValue
  }

  const number = Number(value)

  return Number.isFinite(number) ? number : defaultValue
}

const calculateCommission = ({
  saleValue,
  commissionPercentage,
  commissionValue,
}) => {
  const value = parseNumber(saleValue)

  if (commissionValue !== undefined && commissionValue !== null) {
    return parseNumber(commissionValue)
  }

  const percentage = parseNumber(commissionPercentage)

  if (!value || !percentage) {
    return 0
  }

  return Number(((value * percentage) / 100).toFixed(2))
}

const ensureObjectId = (value, fieldName) => {
  const id = normalizeId(value)

  if (!id) {
    throw new Error(`${fieldName} é obrigatório.`)
  }

  if (!isValidObjectId(id)) {
    throw new Error(`${fieldName} inválido.`)
  }

  return id
}

// ============================================================
// VALIDATION
// ============================================================

const validateSaleReferences = async ({ lead, property, broker, proposal }) => {
  const leadId = normalizeId(lead)
  const propertyId = normalizeId(property)
  const brokerId = normalizeId(broker)
  const proposalId = normalizeId(proposal)

  if (leadId) {
    if (!isValidObjectId(leadId)) {
      throw new Error('Lead inválido.')
    }

    const leadExists = await Lead.exists({
      _id: leadId,
    })

    if (!leadExists) {
      throw new Error('Lead não encontrado.')
    }
  }

  if (propertyId) {
    if (!isValidObjectId(propertyId)) {
      throw new Error('Imóvel inválido.')
    }

    const propertyExists = await Property.exists({
      _id: propertyId,
    })

    if (!propertyExists) {
      throw new Error('Imóvel não encontrado.')
    }
  }

  if (brokerId) {
    if (!isValidObjectId(brokerId)) {
      throw new Error('Corretor inválido.')
    }

    const brokerExists = await User.exists({
      _id: brokerId,
      isBroker: true,
    })

    if (!brokerExists) {
      throw new Error('Corretor não encontrado.')
    }
  }

  if (proposalId) {
    if (!isValidObjectId(proposalId)) {
      throw new Error('Proposta inválida.')
    }

    const proposalExists = await Proposal.exists({
      _id: proposalId,
    })

    if (!proposalExists) {
      throw new Error('Proposta não encontrada.')
    }
  }
}

// ============================================================
// CREATE SALE
// ============================================================

export const createSale = async (data, userId) => {
  if (!data) {
    throw new Error('Dados da venda são obrigatórios.')
  }

  const {
    lead,
    property,
    broker,
    proposal,

    type = SALE_TYPES.VENDA,

    saleValue,
    commissionPercentage,
    commissionValue,

    paymentMethod,
    paymentStatus = SALE_PAYMENT_STATUS.PENDENTE,

    status = SALE_STATUS.NEGOCIACAO,

    saleDate,
    contractDate,
    notes,

    ...rest
  } = data

  if (!userId) {
    throw new Error('Usuário responsável pela criação da venda não informado.')
  }

  if (!isValidObjectId(userId)) {
    throw new Error('Usuário responsável inválido.')
  }

  if (!SALE_TYPES_LIST.includes(type)) {
    throw new Error('Tipo de venda inválido.')
  }

  if (!SALE_STATUS_LIST.includes(status)) {
    throw new Error('Status da venda inválido.')
  }

  if (!SALE_PAYMENT_STATUS_LIST.includes(paymentStatus)) {
    throw new Error('Status de pagamento inválido.')
  }

  await validateSaleReferences({
    lead,
    property,
    broker,
    proposal,
  })

  const normalizedSaleValue = parseNumber(saleValue)

  if (normalizedSaleValue <= 0) {
    throw new Error('O valor da venda deve ser maior que zero.')
  }

  const normalizedCommissionPercentage =
    commissionPercentage !== undefined ? parseNumber(commissionPercentage) : 0

  const normalizedCommissionValue = calculateCommission({
    saleValue: normalizedSaleValue,
    commissionPercentage: normalizedCommissionPercentage,
    commissionValue,
  })

  const sale = await Sale.create({
    ...rest,

    lead: lead ? normalizeId(lead) : undefined,

    property: property ? normalizeId(property) : undefined,

    broker: broker ? normalizeId(broker) : undefined,

    proposal: proposal ? normalizeId(proposal) : undefined,

    type,

    saleValue: normalizedSaleValue,

    commissionPercentage: normalizedCommissionPercentage,

    commissionValue: normalizedCommissionValue,

    paymentMethod,

    paymentStatus,

    status,

    saleDate: saleDate || undefined,

    contractDate: contractDate || undefined,

    notes,

    createdBy: userId,
  })

  return getSaleById(sale._id)
}

// ============================================================
// GET SALE BY ID
// ============================================================

export const getSaleById = async (saleId) => {
  if (!isValidObjectId(saleId)) {
    throw new Error('Venda inválida.')
  }

  const sale = await Sale.findById(saleId).populate(SALE_POPULATE)

  if (!sale) {
    throw new Error('Venda não encontrada.')
  }

  return sale
}

// ============================================================
// GET SALES
// ============================================================

export const getSales = async ({
  page = 1,
  limit = 20,
  search = '',
  status,
  paymentStatus,
  type,
  broker,
  lead,
  property,
  proposal,
  startDate,
  endDate,
  sort = '-createdAt',
} = {}) => {
  const currentPage = Math.max(parseInt(page, 10) || 1, 1)

  const currentLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)

  const skip = (currentPage - 1) * currentLimit

  const filter = {}

  // ----------------------------------------------------------
  // STATUS
  // ----------------------------------------------------------

  if (status) {
    if (Array.isArray(status)) {
      filter.status = {
        $in: status,
      }
    } else {
      filter.status = status
    }
  }

  // ----------------------------------------------------------
  // PAYMENT STATUS
  // ----------------------------------------------------------

  if (paymentStatus) {
    if (Array.isArray(paymentStatus)) {
      filter.paymentStatus = {
        $in: paymentStatus,
      }
    } else {
      filter.paymentStatus = paymentStatus
    }
  }

  // ----------------------------------------------------------
  // TYPE
  // ----------------------------------------------------------

  if (type) {
    filter.type = type
  }

  // ----------------------------------------------------------
  // REFERENCES
  // ----------------------------------------------------------

  if (broker) {
    filter.broker = ensureObjectId(broker, 'Corretor')
  }

  if (lead) {
    filter.lead = ensureObjectId(lead, 'Lead')
  }

  if (property) {
    filter.property = ensureObjectId(property, 'Imóvel')
  }

  if (proposal) {
    filter.proposal = ensureObjectId(proposal, 'Proposta')
  }

  // ----------------------------------------------------------
  // DATE RANGE
  // ----------------------------------------------------------

  if (startDate || endDate) {
    filter.saleDate = {}

    if (startDate) {
      filter.saleDate.$gte = new Date(startDate)
    }

    if (endDate) {
      const finalDate = new Date(endDate)

      finalDate.setHours(23, 59, 59, 999)

      filter.saleDate.$lte = finalDate
    }
  }

  // ----------------------------------------------------------
  // SEARCH
  // ----------------------------------------------------------

  if (search?.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i')

    const [matchingLeads, matchingProperties, matchingBrokers] =
      await Promise.all([
        Lead.find({
          $or: [
            { name: searchRegex },
            { email: searchRegex },
            { phone: searchRegex },
          ],
        }).select('_id'),

        Property.find({
          $or: [{ name: searchRegex }, { code: searchRegex }],
        }).select('_id'),

        User.find({
          $or: [{ name: searchRegex }, { email: searchRegex }],
          isBroker: true,
        }).select('_id'),
      ])

    filter.$or = [
      {
        lead: {
          $in: matchingLeads.map((item) => item._id),
        },
      },
      {
        property: {
          $in: matchingProperties.map((item) => item._id),
        },
      },
      {
        broker: {
          $in: matchingBrokers.map((item) => item._id),
        },
      },
      {
        code: searchRegex,
      },
    ]
  }

  // ----------------------------------------------------------
  // QUERY
  // ----------------------------------------------------------

  const [sales, total] = await Promise.all([
    Sale.find(filter)
      .populate(SALE_POPULATE)
      .sort(sort)
      .skip(skip)
      .limit(currentLimit)
      .lean(),

    Sale.countDocuments(filter),
  ])

  return {
    sales,

    pagination: {
      page: currentPage,
      limit: currentLimit,
      total,
      pages: Math.ceil(total / currentLimit),
      hasNextPage: currentPage * currentLimit < total,
      hasPreviousPage: currentPage > 1,
    },
  }
}

// ============================================================
// UPDATE SALE
// ============================================================

export const updateSale = async (saleId, data) => {
  if (!isValidObjectId(saleId)) {
    throw new Error('Venda inválida.')
  }

  const sale = await Sale.findById(saleId)

  if (!sale) {
    throw new Error('Venda não encontrada.')
  }

  if (
    sale.status === SALE_STATUS.CANCELADA &&
    data.status !== SALE_STATUS.CANCELADA
  ) {
    throw new Error('Uma venda cancelada não pode ser reaberta diretamente.')
  }

  const {
    lead,
    property,
    broker,
    proposal,

    saleValue,
    commissionPercentage,
    commissionValue,

    type,
    status,
    paymentStatus,

    ...rest
  } = data

  // ----------------------------------------------------------
  // REFERENCES
  // ----------------------------------------------------------

  await validateSaleReferences({
    lead,
    property,
    broker,
    proposal,
  })

  if (lead !== undefined) {
    sale.lead = normalizeId(lead)
  }

  if (property !== undefined) {
    sale.property = normalizeId(property)
  }

  if (broker !== undefined) {
    sale.broker = normalizeId(broker)
  }

  if (proposal !== undefined) {
    sale.proposal = normalizeId(proposal)
  }

  // ----------------------------------------------------------
  // TYPE
  // ----------------------------------------------------------

  if (type !== undefined) {
    if (!SALE_TYPES_LIST.includes(type)) {
      throw new Error('Tipo de venda inválido.')
    }

    sale.type = type
  }

  // ----------------------------------------------------------
  // STATUS
  // ----------------------------------------------------------

  if (status !== undefined) {
    if (!SALE_STATUS_LIST.includes(status)) {
      throw new Error('Status da venda inválido.')
    }

    sale.status = status
  }

  // ----------------------------------------------------------
  // PAYMENT STATUS
  // ----------------------------------------------------------

  if (paymentStatus !== undefined) {
    if (!SALE_PAYMENT_STATUS_LIST.includes(paymentStatus)) {
      throw new Error('Status de pagamento inválido.')
    }

    sale.paymentStatus = paymentStatus
  }

  // ----------------------------------------------------------
  // VALUES
  // ----------------------------------------------------------

  if (saleValue !== undefined) {
    const normalizedValue = parseNumber(saleValue)

    if (normalizedValue <= 0) {
      throw new Error('O valor da venda deve ser maior que zero.')
    }

    sale.saleValue = normalizedValue
  }

  if (commissionPercentage !== undefined) {
    sale.commissionPercentage = parseNumber(commissionPercentage)
  }

  if (
    saleValue !== undefined ||
    commissionPercentage !== undefined ||
    commissionValue !== undefined
  ) {
    sale.commissionValue = calculateCommission({
      saleValue: sale.saleValue,
      commissionPercentage:
        commissionPercentage !== undefined
          ? commissionPercentage
          : sale.commissionPercentage,
      commissionValue,
    })
  }

  // ----------------------------------------------------------
  // OTHER FIELDS
  // ----------------------------------------------------------

  Object.assign(sale, rest)

  await sale.save()

  return getSaleById(sale._id)
}

// ============================================================
// DELETE SALE
// ============================================================

export const deleteSale = async (saleId) => {
  if (!isValidObjectId(saleId)) {
    throw new Error('Venda inválida.')
  }

  const sale = await Sale.findById(saleId)

  if (!sale) {
    throw new Error('Venda não encontrada.')
  }

  if (sale.status === SALE_STATUS.CONCLUIDA) {
    throw new Error(
      'Uma venda concluída não pode ser excluída. Cancele ou estorne a venda conforme a regra do negócio.',
    )
  }

  await Sale.findByIdAndDelete(saleId)

  return {
    success: true,
    message: 'Venda excluída com sucesso.',
  }
}

// ============================================================
// CHANGE STATUS
// ============================================================

export const changeSaleStatus = async (saleId, status) => {
  if (!isValidObjectId(saleId)) {
    throw new Error('Venda inválida.')
  }

  if (!SALE_STATUS_LIST.includes(status)) {
    throw new Error('Status da venda inválido.')
  }

  const sale = await Sale.findById(saleId)

  if (!sale) {
    throw new Error('Venda não encontrada.')
  }

  if (
    sale.status === SALE_STATUS.CANCELADA &&
    status !== SALE_STATUS.CANCELADA
  ) {
    throw new Error('Uma venda cancelada não pode ser reaberta diretamente.')
  }

  sale.status = status

  // ----------------------------------------------------------
  // AUTOMATIC DATES
  // ----------------------------------------------------------

  if (status === SALE_STATUS.CONTRATO_ASSINADO) {
    if (!sale.contractDate) {
      sale.contractDate = new Date()
    }
  }

  if (status === SALE_STATUS.CONCLUIDA) {
    if (!sale.saleDate) {
      sale.saleDate = new Date()
    }
  }

  if (status === SALE_STATUS.CANCELADA) {
    sale.cancelledAt = new Date()
  }

  await sale.save()

  return getSaleById(sale._id)
}

// ============================================================
// APPROVE SALE
// ============================================================

export const approveSale = async (saleId) => {
  return changeSaleStatus(saleId, SALE_STATUS.APROVADA)
}

// ============================================================
// SIGN CONTRACT
// ============================================================

export const signSaleContract = async (saleId) => {
  if (!isValidObjectId(saleId)) {
    throw new Error('Venda inválida.')
  }

  const sale = await Sale.findById(saleId)

  if (!sale) {
    throw new Error('Venda não encontrada.')
  }

  if (sale.status === SALE_STATUS.CANCELADA) {
    throw new Error('Não é possível assinar contrato de uma venda cancelada.')
  }

  sale.status = SALE_STATUS.CONTRATO_ASSINADO

  if (!sale.contractDate) {
    sale.contractDate = new Date()
  }

  await sale.save()

  return getSaleById(sale._id)
}

// ============================================================
// COMPLETE SALE
// ============================================================

export const completeSale = async (saleId) => {
  if (!isValidObjectId(saleId)) {
    throw new Error('Venda inválida.')
  }

  const sale = await Sale.findById(saleId)

  if (!sale) {
    throw new Error('Venda não encontrada.')
  }

  if (sale.status === SALE_STATUS.CANCELADA) {
    throw new Error('Não é possível concluir uma venda cancelada.')
  }

  sale.status = SALE_STATUS.CONCLUIDA

  if (!sale.saleDate) {
    sale.saleDate = new Date()
  }

  await sale.save()

  return getSaleById(sale._id)
}

// ============================================================
// CANCEL SALE
// ============================================================

export const cancelSale = async (saleId, reason = '') => {
  if (!isValidObjectId(saleId)) {
    throw new Error('Venda inválida.')
  }

  const sale = await Sale.findById(saleId)

  if (!sale) {
    throw new Error('Venda não encontrada.')
  }

  if (sale.status === SALE_STATUS.CONCLUIDA) {
    throw new Error('Uma venda concluída não pode ser cancelada diretamente.')
  }

  sale.status = SALE_STATUS.CANCELADA

  sale.cancelledAt = new Date()

  if (reason) {
    sale.cancelReason = reason
  }

  await sale.save()

  return getSaleById(sale._id)
}

// ============================================================
// UPDATE PAYMENT STATUS
// ============================================================

export const updatePaymentStatus = async (saleId, paymentStatus) => {
  if (!isValidObjectId(saleId)) {
    throw new Error('Venda inválida.')
  }

  if (!SALE_PAYMENT_STATUS_LIST.includes(paymentStatus)) {
    throw new Error('Status de pagamento inválido.')
  }

  const sale = await Sale.findById(saleId)

  if (!sale) {
    throw new Error('Venda não encontrada.')
  }

  sale.paymentStatus = paymentStatus

  if (paymentStatus === SALE_PAYMENT_STATUS.PAGO) {
    sale.paidAt = new Date()
  }

  await sale.save()

  return getSaleById(sale._id)
}

// ============================================================
// GET SALES BY BROKER
// ============================================================

export const getSalesByBroker = async (brokerId, options = {}) => {
  if (!isValidObjectId(brokerId)) {
    throw new Error('Corretor inválido.')
  }

  return getSales({
    ...options,
    broker: brokerId,
  })
}

// ============================================================
// GET SALES BY LEAD
// ============================================================

export const getSalesByLead = async (leadId, options = {}) => {
  if (!isValidObjectId(leadId)) {
    throw new Error('Lead inválido.')
  }

  return getSales({
    ...options,
    lead: leadId,
  })
}

// ============================================================
// GET SALES BY PROPERTY
// ============================================================

export const getSalesByProperty = async (propertyId, options = {}) => {
  if (!isValidObjectId(propertyId)) {
    throw new Error('Imóvel inválido.')
  }

  return getSales({
    ...options,
    property: propertyId,
  })
}

// ============================================================
// GET SALE BY PROPOSAL
// ============================================================

export const getSaleByProposal = async (proposalId) => {
  if (!isValidObjectId(proposalId)) {
    throw new Error('Proposta inválida.')
  }

  const sale = await Sale.findOne({
    proposal: proposalId,
  }).populate(SALE_POPULATE)

  return sale
}

// ============================================================
// CHECK EXISTING SALE
// ============================================================

export const checkExistingSale = async ({ lead, property, proposal }) => {
  const filter = {}

  if (lead) {
    filter.lead = normalizeId(lead)
  }

  if (property) {
    filter.property = normalizeId(property)
  }

  if (proposal) {
    filter.proposal = normalizeId(proposal)
  }

  if (!Object.keys(filter).length) {
    return null
  }

  return Sale.findOne({
    ...filter,

    status: {
      $ne: SALE_STATUS.CANCELADA,
    },
  }).populate(SALE_POPULATE)
}

// ============================================================
// CREATE SALE FROM PROPOSAL
// ============================================================

export const createSaleFromProposal = async (
  proposalId,
  userId,
  overrides = {},
) => {
  if (!isValidObjectId(proposalId)) {
    throw new Error('Proposta inválida.')
  }

  const proposal = await Proposal.findById(proposalId)
    .populate('lead')
    .populate('property')
    .populate('broker')

  if (!proposal) {
    throw new Error('Proposta não encontrada.')
  }

  const existingSale = await Sale.findOne({
    proposal: proposal._id,
    status: {
      $ne: SALE_STATUS.CANCELADA,
    },
  })

  if (existingSale) {
    throw new Error('Já existe uma venda vinculada a esta proposta.')
  }

  const proposalValue =
    proposal.value ?? proposal.totalValue ?? proposal.price ?? 0

  const saleData = {
    proposal: proposal._id,

    lead: proposal.lead?._id || proposal.lead,

    property: proposal.property?._id || proposal.property,

    broker: proposal.broker?._id || proposal.broker,

    saleValue: proposalValue,

    type: overrides.type || SALE_TYPES.VENDA,

    status: overrides.status || SALE_STATUS.APROVADA,

    paymentStatus: overrides.paymentStatus || SALE_PAYMENT_STATUS.PENDENTE,

    paymentMethod: overrides.paymentMethod || proposal.paymentMethod,

    commissionPercentage:
      overrides.commissionPercentage ?? proposal.commissionPercentage ?? 0,

    notes:
      overrides.notes ||
      `Venda criada a partir da proposta ${proposal.code || proposal._id}.`,
  }

  return createSale(saleData, userId)
}

// ============================================================
// METRICS
// ============================================================

export const getSaleMetrics = async ({ broker, startDate, endDate } = {}) => {
  const match = {}

  if (broker) {
    match.broker = ensureObjectId(broker, 'Corretor')
  }

  if (startDate || endDate) {
    match.saleDate = {}

    if (startDate) {
      match.saleDate.$gte = new Date(startDate)
    }

    if (endDate) {
      const finalDate = new Date(endDate)

      finalDate.setHours(23, 59, 59, 999)

      match.saleDate.$lte = finalDate
    }
  }

  const [
    totalSales,
    concludedSales,
    cancelledSales,
    pendingSales,
    totalValueResult,
    concludedValueResult,
    commissionResult,
  ] = await Promise.all([
    Sale.countDocuments(match),

    Sale.countDocuments({
      ...match,
      status: SALE_STATUS.CONCLUIDA,
    }),

    Sale.countDocuments({
      ...match,
      status: SALE_STATUS.CANCELADA,
    }),

    Sale.countDocuments({
      ...match,
      status: {
        $nin: [SALE_STATUS.CONCLUIDA, SALE_STATUS.CANCELADA],
      },
    }),

    Sale.aggregate([
      {
        $match: match,
      },
      {
        $group: {
          _id: null,
          value: {
            $sum: '$saleValue',
          },
        },
      },
    ]),

    Sale.aggregate([
      {
        $match: {
          ...match,
          status: SALE_STATUS.CONCLUIDA,
        },
      },
      {
        $group: {
          _id: null,
          value: {
            $sum: '$saleValue',
          },
        },
      },
    ]),

    Sale.aggregate([
      {
        $match: {
          ...match,
          status: SALE_STATUS.CONCLUIDA,
        },
      },
      {
        $group: {
          _id: null,
          value: {
            $sum: '$commissionValue',
          },
        },
      },
    ]),
  ])

  const totalValue = totalValueResult[0]?.value || 0

  const concludedValue = concludedValueResult[0]?.value || 0

  const totalCommission = commissionResult[0]?.value || 0

  const averageTicket =
    concludedSales > 0
      ? Number((concludedValue / concludedSales).toFixed(2))
      : 0

  const conversionRate =
    totalSales > 0
      ? Number(((concludedSales / totalSales) * 100).toFixed(2))
      : 0

  return {
    totalSales,

    concludedSales,

    cancelledSales,

    pendingSales,

    totalValue,

    concludedValue,

    totalCommission,

    averageTicket,

    conversionRate,
  }
}

// ============================================================
// DASHBOARD
// ============================================================

export const getSalesDashboard = async ({
  broker,
  startDate,
  endDate,
} = {}) => {
  const metrics = await getSaleMetrics({
    broker,
    startDate,
    endDate,
  })

  const match = {}

  if (broker) {
    match.broker = ensureObjectId(broker, 'Corretor')
  }

  if (startDate || endDate) {
    match.saleDate = {}

    if (startDate) {
      match.saleDate.$gte = new Date(startDate)
    }

    if (endDate) {
      const finalDate = new Date(endDate)

      finalDate.setHours(23, 59, 59, 999)

      match.saleDate.$lte = finalDate
    }
  }

  const [byStatus, byBroker, byType, recentSales] = await Promise.all([
    Sale.aggregate([
      {
        $match: match,
      },
      {
        $group: {
          _id: '$status',
          count: {
            $sum: 1,
          },
          value: {
            $sum: '$saleValue',
          },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    ]),

    Sale.aggregate([
      {
        $match: match,
      },
      {
        $group: {
          _id: '$broker',
          sales: {
            $sum: 1,
          },
          value: {
            $sum: '$saleValue',
          },
          commission: {
            $sum: '$commissionValue',
          },
        },
      },
      {
        $sort: {
          value: -1,
        },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'broker',
        },
      },
      {
        $unwind: {
          path: '$broker',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          sales: 1,
          value: 1,
          commission: 1,
          broker: {
            _id: '$broker._id',
            name: '$broker.name',
            email: '$broker.email',
            avatar: '$broker.avatar',
          },
        },
      },
    ]),

    Sale.aggregate([
      {
        $match: match,
      },
      {
        $group: {
          _id: '$type',
          count: {
            $sum: 1,
          },
          value: {
            $sum: '$saleValue',
          },
        },
      },
      {
        $sort: {
          value: -1,
        },
      },
    ]),

    Sale.find(match)
      .populate(SALE_POPULATE)
      .sort('-createdAt')
      .limit(10)
      .lean(),
  ])

  return {
    metrics,

    byStatus,

    byBroker,

    byType,

    recentSales,
  }
}

// ============================================================
// EXPORT DEFAULT
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
