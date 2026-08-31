import mongoose from 'mongoose'

import Proposal, {
  PROPOSAL_STATUS,
  PROPOSAL_POPULATE,
} from '../models/Proposal.js'

import Lead from '../models/Lead.js'
import Property from '../models/Property.js'
import User from '../models/User.js'
import Opportunity from '../models/Opportunity.js'

/*
|--------------------------------------------------------------------------
| CONSTANTES
|--------------------------------------------------------------------------
*/

const ADMIN_ROLE = 'admin'
const BROKER_ROLE = 'broker'

const PIPELINE_STAGES = {
  PROPOSAL_SENT: 'proposta_enviada',
  NEGOTIATION: 'negociacao',
}

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const isAdmin = (user) => user?.role === ADMIN_ROLE

const isBroker = (user) => user?.role === BROKER_ROLE

const createError = (message, statusCode = 400) => {
  const error = new Error(message)

  error.statusCode = statusCode

  return error
}

const getObjectId = (id, fieldName = 'ID') => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw createError(`${fieldName} inválido.`, 400)
  }

  return new mongoose.Types.ObjectId(id)
}

const normalizeNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return 0
  }

  const number = Number(value)

  return Number.isFinite(number) ? number : 0
}

const normalizePositiveInteger = (value, fallback = 1) => {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return fallback
  }

  return Math.max(Math.floor(number), 1)
}

const calculateBalance = ({
  proposalPrice,
  downPayment = 0,
  financing = 0,
  fgts = 0,
}) => {
  return Math.max(proposalPrice - downPayment - financing - fgts, 0)
}

const formatCurrency = (value) => {
  return normalizeNumber(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const getPagination = ({ page = 1, limit = 20 } = {}) => {
  const currentPage = Math.max(Number(page) || 1, 1)

  const currentLimit = Math.min(Math.max(Number(limit) || 20, 1), 100)

  return {
    page: currentPage,
    limit: currentLimit,
    skip: (currentPage - 1) * currentLimit,
  }
}

const buildPaginationResponse = ({ page, limit, total }) => {
  const pages = Math.ceil(total / limit)

  return {
    page,
    limit,
    total,
    pages,
    hasNextPage: page < pages,
    hasPreviousPage: page > 1,
  }
}

/*
|--------------------------------------------------------------------------
| POPULATE DA PROPOSTA
|--------------------------------------------------------------------------
|
| Mantém o PROPOSAL_POPULATE existente e garante que o imóvel
| seja carregado com o schema atual de Property.js.
|
| Isso resolve o problema em que a proposta chegava ao frontend
| apenas com o ObjectId do imóvel ou com dados incompletos.
|
|--------------------------------------------------------------------------
*/

const populateProposal = (query) => {
  return query.populate(PROPOSAL_POPULATE).populate({
    path: 'property',
    model: Property,
  })
}

/*
|--------------------------------------------------------------------------
| STATUS
|--------------------------------------------------------------------------
*/

const getProposalStatuses = () => {
  return {
    draft: PROPOSAL_STATUS.DRAFT,
    pending: PROPOSAL_STATUS.PENDING,
    accepted: PROPOSAL_STATUS.ACCEPTED,
    rejected: PROPOSAL_STATUS.REJECTED,
    cancelled: PROPOSAL_STATUS.CANCELLED,
    expired: PROPOSAL_STATUS.EXPIRED,
  }
}

/*
|--------------------------------------------------------------------------
| PERMISSÕES
|--------------------------------------------------------------------------
*/

const validateLeadAccess = ({ lead, user }) => {
  if (!lead) {
    throw createError('Lead não encontrado.', 404)
  }

  if (isAdmin(user)) {
    return true
  }

  if (!isBroker(user)) {
    throw createError(
      'Usuário sem permissão para trabalhar com propostas.',
      403,
    )
  }

  const assignedTo = lead.assignedTo?._id || lead.assignedTo

  if (!assignedTo || String(assignedTo) !== String(user._id)) {
    throw createError('Você não é o corretor responsável por este lead.', 403)
  }

  return true
}

const validateProposalAccess = ({ proposal, user }) => {
  if (!proposal) {
    throw createError('Proposta não encontrada.', 404)
  }

  if (isAdmin(user)) {
    return true
  }

  if (!isBroker(user)) {
    throw createError(
      'Usuário sem permissão para trabalhar com propostas.',
      403,
    )
  }

  const brokerId = proposal.broker?._id || proposal.broker

  if (!brokerId || String(brokerId) !== String(user._id)) {
    throw createError('Você não tem permissão para acessar esta proposta.', 403)
  }

  return true
}

/*
|--------------------------------------------------------------------------
| SNAPSHOTS
|--------------------------------------------------------------------------
*/

const buildLeadSnapshot = (lead) => ({
  name: lead.name || '',
  email: lead.email || '',
  phone: lead.phone || '',
  source: lead.source || '',
  stage: lead.stage || '',
})

/*
|--------------------------------------------------------------------------
| SNAPSHOT DO IMÓVEL
|--------------------------------------------------------------------------
|
| ATUALIZADO PARA O NOVO PROPERTY.JS
|
| O model atual utiliza:
| - name
| - prices
| - location
| - dimensions
| - images
| - coverImage
| - bedrooms
| - suites
| - bathrooms
| - parkingSpaces
|
|--------------------------------------------------------------------------
*/

const buildPropertySnapshot = (property) => {
  const prices = property.prices || {}
  const location = property.location || {}
  const dimensions = property.dimensions || {}

  const salePrice = normalizeNumber(prices.salePrice)
  const rentPrice = normalizeNumber(prices.rentPrice)

  const mainPrice =
    property.purpose === 'aluguel'
      ? rentPrice
      : property.purpose === 'venda'
        ? salePrice
        : salePrice || rentPrice

  const images = Array.isArray(property.images)
    ? property.images.map((image) => ({
        url: image?.url || '',
        public_id: image?.public_id || '',
        isCover: Boolean(image?.isCover),
        order: normalizeNumber(image?.order),
      }))
    : []

  return {
    _id: property._id,

    code: property.code || '',

    name: property.name || '',

    title: property.name || '',

    description: property.description || '',

    shortDescription: property.shortDescription || '',

    slug: property.slug || '',

    type: property.type || '',

    category: property.category || '',

    purpose: property.purpose || '',

    status: property.status || '',

    constructionStatus: property.constructionStatus || '',

    featured: Boolean(property.featured),

    exclusive: Boolean(property.exclusive),

    published: Boolean(property.published),

    active: Boolean(property.active),

    bedrooms: normalizeNumber(property.bedrooms),

    suites: normalizeNumber(property.suites),

    bathrooms: normalizeNumber(property.bathrooms),

    parkingSpaces: normalizeNumber(property.parkingSpaces),

    floor: normalizeNumber(property.floor),

    furnished: Boolean(property.furnished),

    acceptsPets: Boolean(property.acceptsPets),

    price: mainPrice,

    prices: {
      salePrice,
      rentPrice,
      condominiumFee: normalizeNumber(prices.condominiumFee),
      iptu: normalizeNumber(prices.iptu),
      otherFees: normalizeNumber(prices.otherFees),
    },

    dimensions: {
      totalArea: normalizeNumber(dimensions.totalArea),
      builtArea: normalizeNumber(dimensions.builtArea),
      landArea: normalizeNumber(dimensions.landArea),
      frontage: normalizeNumber(dimensions.frontage),
      background: normalizeNumber(dimensions.background),
    },

    location: {
      zipCode: location.zipCode || '',
      street: location.street || '',
      number: location.number || '',
      complement: location.complement || '',
      district: location.district || '',
      city: location.city || '',
      state: location.state || '',
      country: location.country || 'Brasil',
      region: location.region || '',
      coordinates: location.coordinates || null,
    },

    /*
     * Mantém também o formato "address" para facilitar
     * compatibilidade com componentes antigos do frontend.
     */
    address: {
      street: location.street || '',
      number: location.number || '',
      complement: location.complement || '',
      district: location.district || '',
      city: location.city || '',
      state: location.state || '',
      zipCode: location.zipCode || '',
    },

    features: Array.isArray(property.features) ? property.features : [],

    highlights: Array.isArray(property.highlights) ? property.highlights : [],

    coverImage: property.coverImage || '',

    images,

    image: Array.isArray(property.image) ? property.image : [],

    videos: Array.isArray(property.videos) ? property.videos : [],

    virtualTour: property.virtualTour || '',

    floorPlan: property.floorPlan || '',

    acceptsFinancing: Boolean(property.acceptsFinancing),

    acceptsFGTS: Boolean(property.acceptsFGTS),

    condominium: property.condominium || null,

    captation: property.captation
      ? {
          broker: property.captation.broker || null,
          percentage: normalizeNumber(property.captation.percentage),
        }
      : null,
  }
}

/*
|--------------------------------------------------------------------------
| VALIDAÇÃO DOS VALORES
|--------------------------------------------------------------------------
*/

const normalizeProposalValues = ({
  propertyPrice,
  proposalPrice,
  downPayment,
  financing,
  fgts,
}) => {
  const normalized = {
    propertyPrice: normalizeNumber(propertyPrice),
    proposalPrice: normalizeNumber(proposalPrice),
    downPayment: normalizeNumber(downPayment),
    financing: normalizeNumber(financing),
    fgts: normalizeNumber(fgts),
  }

  if (normalized.propertyPrice <= 0) {
    throw createError('O valor do imóvel deve ser maior que zero.')
  }

  if (normalized.proposalPrice <= 0) {
    throw createError('O valor da proposta deve ser maior que zero.')
  }

  if (normalized.downPayment < 0) {
    throw createError('O valor da entrada não pode ser negativo.')
  }

  if (normalized.financing < 0) {
    throw createError('O valor do financiamento não pode ser negativo.')
  }

  if (normalized.fgts < 0) {
    throw createError('O valor do FGTS não pode ser negativo.')
  }

  const totalPayment =
    normalized.downPayment + normalized.financing + normalized.fgts

  if (totalPayment > normalized.proposalPrice) {
    throw createError(
      'A soma da entrada, financiamento e FGTS não pode ser maior que o valor da proposta.',
    )
  }

  return {
    ...normalized,

    balance: calculateBalance({
      proposalPrice: normalized.proposalPrice,
      downPayment: normalized.downPayment,
      financing: normalized.financing,
      fgts: normalized.fgts,
    }),
  }
}

/*
|--------------------------------------------------------------------------
| HISTÓRICO DA PROPOSTA
|--------------------------------------------------------------------------
*/

const createProposalHistoryEntry = ({
  action,
  performedBy,
  previousStatus = null,
  newStatus = null,
  comment = '',
  metadata = {},
}) => ({
  action,
  performedBy,
  previousStatus,
  newStatus,
  comment,
  metadata,
  performedAt: new Date(),
})

/*
|--------------------------------------------------------------------------
| HISTÓRICO DO LEAD
|--------------------------------------------------------------------------
*/

const createLeadContactHistoryEntry = ({ description, performedBy }) => ({
  type: 'note',
  description,
  createdBy: performedBy,
  createdAt: new Date(),
})

const addLeadProposalTimeline = ({
  lead,
  action,
  performedBy,
  description,
}) => {
  const now = new Date()

  let currentHistory = null

  if (Array.isArray(lead.stageHistory) && lead.stageHistory.length) {
    currentHistory = lead.stageHistory[lead.stageHistory.length - 1]
  }

  if (!currentHistory) {
    if (!Array.isArray(lead.stageHistory)) {
      lead.stageHistory = []
    }

    lead.stageHistory.push({
      stage: lead.stage,
      changedBy: performedBy,
      changedAt: now,
      timeline: [],
    })

    currentHistory = lead.stageHistory[lead.stageHistory.length - 1]
  }

  if (!Array.isArray(currentHistory.timeline)) {
    currentHistory.timeline = []
  }

  currentHistory.timeline.push({
    action,
    description,
    createdBy: performedBy,
    createdAt: now,
  })
}

const addLeadProposalHistory = async ({
  lead,
  proposalId,
  action,
  performedBy,
  description,
  session = null,
}) => {
  if (!Array.isArray(lead.contactHistory)) {
    lead.contactHistory = []
  }

  lead.contactHistory.push(
    createLeadContactHistoryEntry({
      description,
      performedBy,
    }),
  )

  addLeadProposalTimeline({
    lead,
    action,
    performedBy,
    description: `${description} Proposta: ${proposalId}.`,
  })

  await lead.save({
    session,
  })
}

/*
|--------------------------------------------------------------------------
| ALTERAÇÃO DO PIPELINE
|--------------------------------------------------------------------------
*/

const updateLeadStage = async ({
  lead,
  newStage,
  performedBy,
  reason,
  session = null,
}) => {
  const previousStage = lead.stage
  const now = new Date()

  if (previousStage === newStage) {
    addLeadProposalTimeline({
      lead,
      action: 'pipeline_updated',
      performedBy,
      description: reason,
    })

    await lead.save({
      session,
    })

    return lead
  }

  lead.stage = newStage

  if (!Array.isArray(lead.stageHistory)) {
    lead.stageHistory = []
  }

  lead.stageHistory.push({
    stage: newStage,
    changedBy: performedBy,
    changedAt: now,
    timeline: [
      {
        action: 'stage_changed',
        description: reason,
        createdBy: performedBy,
        createdAt: now,
      },
    ],
  })

  await lead.save({
    session,
  })

  return lead
}

/*
|--------------------------------------------------------------------------
| BUSCA LEAD
|--------------------------------------------------------------------------
*/

const getLeadForProposal = async (leadId, session = null) => {
  const query = Lead.findById(leadId)

  if (session) {
    query.session(session)
  }

  return query
}

/*
|--------------------------------------------------------------------------
| BUSCA IMÓVEL
|--------------------------------------------------------------------------
*/

const getPropertyForProposal = async (propertyId, session = null) => {
  const query = Property.findById(propertyId)

  if (session) {
    query.session(session)
  }

  return query
}

/*
|--------------------------------------------------------------------------
| BUSCA OPORTUNIDADE
|--------------------------------------------------------------------------
*/

const getOpportunityForProposal = async (opportunityId, session = null) => {
  const query = Opportunity.findById(opportunityId)

  if (session) {
    query.session(session)
  }

  return query
}

/*
|--------------------------------------------------------------------------
| VALIDAÇÃO DA OPORTUNIDADE
|--------------------------------------------------------------------------
*/

const validateOpportunityForProposal = ({ opportunity, lead }) => {
  if (!opportunity) {
    throw createError('Oportunidade não encontrada.', 404)
  }

  if (opportunity.isDeleted === true) {
    throw createError('Esta oportunidade foi removida.')
  }

  const opportunityLeadId = opportunity.lead?._id || opportunity.lead

  if (!opportunityLeadId || String(opportunityLeadId) !== String(lead._id)) {
    throw createError(
      'A oportunidade selecionada não pertence ao Lead informado.',
    )
  }

  return true
}

/*
|--------------------------------------------------------------------------
| CREATE PROPOSAL
|--------------------------------------------------------------------------
*/

export const createProposal = async ({ data, user }) => {
  const session = await mongoose.startSession()

  try {
    let createdProposalId = null

    await session.withTransaction(async () => {
      if (!data) {
        throw createError('Dados da proposta não informados.')
      }

      if (!user?._id) {
        throw createError('Usuário não autenticado.', 401)
      }

      const leadId = getObjectId(data.lead, 'Lead')

      const propertyId = getObjectId(data.property, 'Imóvel')

      const opportunityId = getObjectId(data.opportunity, 'Oportunidade')

      const lead = await getLeadForProposal(leadId, session)

      if (!lead) {
        throw createError('Lead não encontrado.', 404)
      }

      validateLeadAccess({
        lead,
        user,
      })

      const property = await getPropertyForProposal(propertyId, session)

      if (!property) {
        throw createError('Imóvel não encontrado.', 404)
      }

      if (property.isDeleted === true) {
        throw createError('Este imóvel não está disponível.')
      }

      const opportunity = await getOpportunityForProposal(
        opportunityId,
        session,
      )

      validateOpportunityForProposal({
        opportunity,
        lead,
      })

      const brokerId = isAdmin(user) ? data.broker || lead.assignedTo : user._id

      if (!brokerId) {
        throw createError('O Lead não possui corretor responsável.')
      }

      if (lead.assignedTo && String(brokerId) !== String(lead.assignedTo)) {
        throw createError(
          'O corretor da proposta deve ser o corretor responsável pelo Lead.',
        )
      }

      const broker = await User.findById(brokerId).session(session)

      if (!broker) {
        throw createError('Corretor não encontrado.', 404)
      }

      if (broker.role !== BROKER_ROLE) {
        throw createError('O usuário selecionado não é um corretor.')
      }

      const propertySalePrice = normalizeNumber(property.prices?.salePrice)

      const propertyRentPrice = normalizeNumber(property.prices?.rentPrice)

      const propertyMainPrice =
        property.purpose === 'aluguel'
          ? propertyRentPrice
          : propertySalePrice || propertyRentPrice

      const values = normalizeProposalValues({
        propertyPrice: data.values?.propertyPrice ?? propertyMainPrice,

        proposalPrice: data.values?.proposalPrice,

        downPayment: data.values?.downPayment,

        financing: data.values?.financing,

        fgts: data.values?.fgts,
      })

      const validityDays = normalizePositiveInteger(data.validityDays, 7)

      const expiresAt = new Date()

      expiresAt.setDate(expiresAt.getDate() + validityDays)

      const proposal = new Proposal({
        opportunity: opportunity._id,

        lead: lead._id,

        property: property._id,

        broker: broker._id,

        createdBy: user._id,

        status: PROPOSAL_STATUS.DRAFT,

        values,

        paymentMethod: data.paymentMethod || 'financing',

        installments: normalizeNumber(data.installments),

        installmentValue: normalizeNumber(data.installmentValue),

        validityDays,

        expiresAt,

        clientMessage:
          typeof data.clientMessage === 'string'
            ? data.clientMessage.trim()
            : '',

        leadSnapshot: buildLeadSnapshot(lead),

        propertySnapshot: buildPropertySnapshot(property),

        history: [
          createProposalHistoryEntry({
            action: 'created',

            performedBy: user._id,

            previousStatus: null,

            newStatus: PROPOSAL_STATUS.DRAFT,

            metadata: {
              opportunity: opportunity._id,

              lead: lead._id,

              property: property._id,

              broker: broker._id,

              proposalPrice: values.proposalPrice,

              propertyPrice: values.propertyPrice,

              paymentMethod: data.paymentMethod || 'financing',

              validityDays,
            },
          }),
        ],
      })

      await proposal.save({
        session,
      })

      createdProposalId = proposal._id

      await Property.findByIdAndUpdate(
        property._id,
        {
          $inc: {
            proposalCount: 1,
          },
        },
        {
          session,
        },
      )

      await addLeadProposalHistory({
        lead,

        proposalId: proposal._id,

        action: 'proposal_created',

        performedBy: user._id,

        description: `Proposta criada no valor de R$ ${formatCurrency(
          values.proposalPrice,
        )}.`,

        session,
      })
    })

    return populateProposal(Proposal.findById(createdProposalId))
  } finally {
    await session.endSession()
  }
}

/*
|--------------------------------------------------------------------------
| UPDATE PROPOSAL
|--------------------------------------------------------------------------
*/

export const updateProposal = async ({ proposalId, data, user }) => {
  const id = getObjectId(proposalId, 'Proposta')

  const proposal = await Proposal.findById(id)

  if (!proposal) {
    throw createError('Proposta não encontrada.', 404)
  }

  if (proposal.isDeleted) {
    throw createError('Esta proposta foi removida.')
  }

  validateProposalAccess({
    proposal,
    user,
  })

  if (proposal.status !== PROPOSAL_STATUS.DRAFT) {
    throw createError('Somente propostas em rascunho podem ser editadas.')
  }

  if (!data) {
    throw createError('Nenhum dado informado para atualização.')
  }

  if (data.values) {
    proposal.values = normalizeProposalValues({
      propertyPrice: data.values.propertyPrice ?? proposal.values.propertyPrice,

      proposalPrice: data.values.proposalPrice ?? proposal.values.proposalPrice,

      downPayment: data.values.downPayment ?? proposal.values.downPayment,

      financing: data.values.financing ?? proposal.values.financing,

      fgts: data.values.fgts ?? proposal.values.fgts,
    })
  }

  if (data.paymentMethod !== undefined) {
    proposal.paymentMethod = data.paymentMethod
  }

  if (data.installments !== undefined) {
    proposal.installments = normalizeNumber(data.installments)
  }

  if (data.installmentValue !== undefined) {
    proposal.installmentValue = normalizeNumber(data.installmentValue)
  }

  if (data.validityDays !== undefined) {
    const validityDays = normalizePositiveInteger(data.validityDays, 7)

    proposal.validityDays = validityDays

    const expiresAt = new Date()

    expiresAt.setDate(expiresAt.getDate() + validityDays)

    proposal.expiresAt = expiresAt
  }

  if (data.clientMessage !== undefined) {
    proposal.clientMessage =
      typeof data.clientMessage === 'string' ? data.clientMessage.trim() : ''
  }

  proposal.history.push(
    createProposalHistoryEntry({
      action: 'updated',

      performedBy: user._id,

      previousStatus: proposal.status,

      newStatus: proposal.status,

      metadata: {
        fields: Object.keys(data),
      },
    }),
  )

  await proposal.save()

  const lead = await Lead.findById(proposal.lead)

  if (lead) {
    await addLeadProposalHistory({
      lead,

      proposalId: proposal._id,

      action: 'proposal_updated',

      performedBy: user._id,

      description: 'Proposta em rascunho atualizada.',
    })
  }

  return populateProposal(Proposal.findById(proposal._id))
}

/*
|--------------------------------------------------------------------------
| SUBMIT PROPOSAL
|--------------------------------------------------------------------------
*/

export const submitProposal = async ({ proposalId, user }) => {
  const session = await mongoose.startSession()

  try {
    let updatedProposalId = null

    await session.withTransaction(async () => {
      const id = getObjectId(proposalId, 'Proposta')

      const proposal = await Proposal.findById(id).session(session)

      if (!proposal) {
        throw createError('Proposta não encontrada.', 404)
      }

      if (proposal.isDeleted) {
        throw createError('Esta proposta foi removida.')
      }

      if (proposal.status !== PROPOSAL_STATUS.DRAFT) {
        throw createError(
          'Somente propostas em rascunho podem ser enviadas para aprovação.',
        )
      }

      validateProposalAccess({
        proposal,
        user,
      })

      const lead = await Lead.findById(proposal.lead).session(session)

      if (!lead) {
        throw createError('Lead não encontrado.', 404)
      }

      validateLeadAccess({
        lead,
        user,
      })

      const previousStatus = proposal.status

      proposal.status = PROPOSAL_STATUS.PENDING

      proposal.submittedAt = new Date()

      proposal.history.push(
        createProposalHistoryEntry({
          action: 'submitted',

          performedBy: user._id,

          previousStatus,

          newStatus: PROPOSAL_STATUS.PENDING,
        }),
      )

      await proposal.save({
        session,
      })

      await updateLeadStage({
        lead,

        newStage: PIPELINE_STAGES.PROPOSAL_SENT,

        performedBy: user._id,

        reason: 'Proposta enviada para aprovação administrativa.',

        session,
      })

      await addLeadProposalHistory({
        lead,

        proposalId: proposal._id,

        action: 'proposal_submitted',

        performedBy: user._id,

        description: 'Proposta enviada para aprovação administrativa.',

        session,
      })

      updatedProposalId = proposal._id
    })

    return populateProposal(Proposal.findById(updatedProposalId))
  } finally {
    await session.endSession()
  }
}

/*
|--------------------------------------------------------------------------
| APPROVE PROPOSAL
|--------------------------------------------------------------------------
*/

export const approveProposal = async ({ proposalId, user, comment = '' }) => {
  if (!isAdmin(user)) {
    throw createError('Somente administradores podem aprovar propostas.', 403)
  }

  const session = await mongoose.startSession()

  try {
    let updatedProposalId = null

    await session.withTransaction(async () => {
      const id = getObjectId(proposalId, 'Proposta')

      const proposal = await Proposal.findById(id).session(session)

      if (!proposal) {
        throw createError('Proposta não encontrada.', 404)
      }

      if (proposal.isDeleted) {
        throw createError('Esta proposta foi removida.')
      }

      if (proposal.status !== PROPOSAL_STATUS.PENDING) {
        throw createError(
          'Somente propostas aguardando aprovação podem ser aprovadas.',
        )
      }

      const lead = await Lead.findById(proposal.lead).session(session)

      if (!lead) {
        throw createError('Lead não encontrado.', 404)
      }

      const previousStatus = proposal.status

      proposal.status = PROPOSAL_STATUS.ACCEPTED

      proposal.approvedBy = user._id

      proposal.approvedAt = new Date()

      proposal.adminComment = typeof comment === 'string' ? comment.trim() : ''

      proposal.history.push(
        createProposalHistoryEntry({
          action: 'approved',

          performedBy: user._id,

          previousStatus,

          newStatus: PROPOSAL_STATUS.ACCEPTED,

          comment: proposal.adminComment,
        }),
      )

      await proposal.save({
        session,
      })

      await updateLeadStage({
        lead,

        newStage: PIPELINE_STAGES.NEGOTIATION,

        performedBy: user._id,

        reason: 'Proposta aprovada pelo administrador.',

        session,
      })

      await addLeadProposalHistory({
        lead,

        proposalId: proposal._id,

        action: 'proposal_approved',

        performedBy: user._id,

        description: `Proposta aprovada pelo administrador no valor de R$ ${formatCurrency(
          proposal.values.proposalPrice,
        )}.`,

        session,
      })

      updatedProposalId = proposal._id
    })

    return populateProposal(Proposal.findById(updatedProposalId))
  } finally {
    await session.endSession()
  }
}

/*
|--------------------------------------------------------------------------
| REJECT PROPOSAL
|--------------------------------------------------------------------------
*/

export const rejectProposal = async ({ proposalId, user, reason }) => {
  if (!isAdmin(user)) {
    throw createError('Somente administradores podem rejeitar propostas.', 403)
  }

  if (!reason || !reason.trim()) {
    throw createError('Informe o motivo da rejeição.')
  }

  const cleanReason = reason.trim()

  const session = await mongoose.startSession()

  try {
    let updatedProposalId = null

    await session.withTransaction(async () => {
      const id = getObjectId(proposalId, 'Proposta')

      const proposal = await Proposal.findById(id).session(session)

      if (!proposal) {
        throw createError('Proposta não encontrada.', 404)
      }

      if (proposal.isDeleted) {
        throw createError('Esta proposta foi removida.')
      }

      if (proposal.status !== PROPOSAL_STATUS.PENDING) {
        throw createError(
          'Somente propostas aguardando aprovação podem ser rejeitadas.',
        )
      }

      const lead = await Lead.findById(proposal.lead).session(session)

      if (!lead) {
        throw createError('Lead não encontrado.', 404)
      }

      const previousStatus = proposal.status

      proposal.status = PROPOSAL_STATUS.REJECTED

      proposal.rejectionReason = cleanReason

      proposal.adminComment = cleanReason

      proposal.rejectedAt = new Date()

      proposal.history.push(
        createProposalHistoryEntry({
          action: 'rejected',

          performedBy: user._id,

          previousStatus,

          newStatus: PROPOSAL_STATUS.REJECTED,

          comment: cleanReason,
        }),
      )

      await proposal.save({
        session,
      })

      await addLeadProposalHistory({
        lead,

        proposalId: proposal._id,

        action: 'proposal_rejected',

        performedBy: user._id,

        description: `Proposta rejeitada pelo administrador. Motivo: ${cleanReason}`,

        session,
      })

      updatedProposalId = proposal._id
    })

    return populateProposal(Proposal.findById(updatedProposalId))
  } finally {
    await session.endSession()
  }
}

/*
|--------------------------------------------------------------------------
| CANCEL PROPOSAL
|--------------------------------------------------------------------------
*/

export const cancelProposal = async ({ proposalId, user, reason = '' }) => {
  const session = await mongoose.startSession()

  try {
    let updatedProposalId = null

    await session.withTransaction(async () => {
      const id = getObjectId(proposalId, 'Proposta')

      const proposal = await Proposal.findById(id).session(session)

      if (!proposal) {
        throw createError('Proposta não encontrada.', 404)
      }

      if (proposal.isDeleted) {
        throw createError('Esta proposta foi removida.')
      }

      const finalStatuses = [
        PROPOSAL_STATUS.ACCEPTED,
        PROPOSAL_STATUS.REJECTED,
        PROPOSAL_STATUS.CANCELLED,
        PROPOSAL_STATUS.EXPIRED,
      ]

      if (finalStatuses.includes(proposal.status)) {
        throw createError('Esta proposta não pode mais ser cancelada.')
      }

      validateProposalAccess({
        proposal,
        user,
      })

      const previousStatus = proposal.status

      const cleanReason = typeof reason === 'string' ? reason.trim() : ''

      proposal.status = PROPOSAL_STATUS.CANCELLED

      proposal.cancelledAt = new Date()

      proposal.history.push(
        createProposalHistoryEntry({
          action: 'cancelled',

          performedBy: user._id,

          previousStatus,

          newStatus: PROPOSAL_STATUS.CANCELLED,

          comment: cleanReason,
        }),
      )

      await proposal.save({
        session,
      })

      const lead = await Lead.findById(proposal.lead).session(session)

      if (lead) {
        await addLeadProposalHistory({
          lead,

          proposalId: proposal._id,

          action: 'proposal_cancelled',

          performedBy: user._id,

          description: cleanReason
            ? `Proposta cancelada. Motivo: ${cleanReason}`
            : 'Proposta cancelada.',

          session,
        })
      }

      updatedProposalId = proposal._id
    })

    return populateProposal(Proposal.findById(updatedProposalId))
  } finally {
    await session.endSession()
  }
}

/*
|--------------------------------------------------------------------------
| GET PROPOSAL BY ID
|--------------------------------------------------------------------------
*/

export const getProposalById = async ({ proposalId, user }) => {
  const id = getObjectId(proposalId, 'Proposta')

  const proposal = await populateProposal(
    Proposal.findOne({
      _id: id,
      isDeleted: false,
    }),
  )

  if (!proposal) {
    throw createError('Proposta não encontrada.', 404)
  }

  validateProposalAccess({
    proposal,
    user,
  })

  return proposal
}

/*
|--------------------------------------------------------------------------
| GET PROPOSALS
|--------------------------------------------------------------------------
*/

export const getProposals = async ({
  user,
  page = 1,
  limit = 20,
  search = '',
  status,
  broker,
  lead,
  property,
  opportunity,
  startDate,
  endDate,
  sort = '-createdAt',
}) => {
  const {
    page: currentPage,
    limit: currentLimit,
    skip,
  } = getPagination({
    page,
    limit,
  })

  const filter = {
    isDeleted: false,
  }

  if (isBroker(user)) {
    filter.broker = user._id
  }

  if (isAdmin(user) && broker) {
    filter.broker = getObjectId(broker, 'Corretor')
  }

  if (lead) {
    filter.lead = getObjectId(lead, 'Lead')
  }

  if (property) {
    filter.property = getObjectId(property, 'Imóvel')
  }

  if (opportunity) {
    filter.opportunity = getObjectId(opportunity, 'Oportunidade')
  }

  if (status) {
    if (Array.isArray(status)) {
      filter.status = {
        $in: status,
      }
    } else {
      filter.status = status
    }
  }

  if (startDate || endDate) {
    filter.createdAt = {}

    if (startDate) {
      const start = new Date(startDate)

      if (Number.isNaN(start.getTime())) {
        throw createError('Data inicial inválida.')
      }

      start.setHours(0, 0, 0, 0)

      filter.createdAt.$gte = start
    }

    if (endDate) {
      const end = new Date(endDate)

      if (Number.isNaN(end.getTime())) {
        throw createError('Data final inválida.')
      }

      end.setHours(23, 59, 59, 999)

      filter.createdAt.$lte = end
    }
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(
      search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i',
    )

    const [leads, properties, brokers, opportunities] = await Promise.all([
      Lead.find({
        $or: [
          {
            name: searchRegex,
          },
          {
            email: searchRegex,
          },
          {
            phone: searchRegex,
          },
        ],
      }).select('_id'),

      Property.find({
        $or: [
          {
            name: searchRegex,
          },
          {
            description: searchRegex,
          },
          {
            shortDescription: searchRegex,
          },
          {
            code: searchRegex,
          },
          {
            slug: searchRegex,
          },
        ],
      }).select('_id'),

      User.find({
        role: BROKER_ROLE,

        $or: [
          {
            name: searchRegex,
          },
          {
            email: searchRegex,
          },
        ],
      }).select('_id'),

      Opportunity.find({
        $or: [
          {
            title: searchRegex,
          },
          {
            name: searchRegex,
          },
        ],
      }).select('_id'),
    ])

    const leadIds = leads.map((item) => item._id)

    const propertyIds = properties.map((item) => item._id)

    const brokerIds = brokers.map((item) => item._id)

    const opportunityIds = opportunities.map((item) => item._id)

    const orConditions = []

    if (leadIds.length) {
      orConditions.push({
        lead: {
          $in: leadIds,
        },
      })
    }

    if (propertyIds.length) {
      orConditions.push({
        property: {
          $in: propertyIds,
        },
      })
    }

    if (brokerIds.length) {
      orConditions.push({
        broker: {
          $in: brokerIds,
        },
      })
    }

    if (opportunityIds.length) {
      orConditions.push({
        opportunity: {
          $in: opportunityIds,
        },
      })
    }

    if (orConditions.length) {
      filter.$or = orConditions
    } else {
      filter._id = {
        $in: [],
      }
    }
  }

  const allowedSortFields = [
    'createdAt',
    'updatedAt',
    'status',
    'submittedAt',
    'approvedAt',
  ]

  let sortField = 'createdAt'

  let sortDirection = -1

  if (sort) {
    const cleanSort = sort.replace(/^-/, '')

    if (allowedSortFields.includes(cleanSort)) {
      sortField = cleanSort

      sortDirection = sort.startsWith('-') ? -1 : 1
    }
  }

  const [proposals, total] = await Promise.all([
    populateProposal(
      Proposal.find(filter)
        .sort({
          [sortField]: sortDirection,
        })
        .skip(skip)
        .limit(currentLimit)
        .lean(),
    ),

    Proposal.countDocuments(filter),
  ])

  return {
    proposals,

    pagination: buildPaginationResponse({
      page: currentPage,
      limit: currentLimit,
      total,
    }),
  }
}

/*
|--------------------------------------------------------------------------
| GET PROPOSAL HISTORY
|--------------------------------------------------------------------------
*/

export const getProposalHistory = async ({ proposalId, user }) => {
  const proposal = await getProposalById({
    proposalId,
    user,
  })

  const history = Array.isArray(proposal.history) ? [...proposal.history] : []

  return history.sort(
    (a, b) => new Date(b.performedAt) - new Date(a.performedAt),
  )
}

/*
|--------------------------------------------------------------------------
| GET PROPOSALS BY LEAD
|--------------------------------------------------------------------------
*/

export const getProposalsByLead = async ({ leadId, user }) => {
  const id = getObjectId(leadId, 'Lead')

  const lead = await Lead.findById(id)

  if (!lead) {
    throw createError('Lead não encontrado.', 404)
  }

  validateLeadAccess({
    lead,
    user,
  })

  const filter = {
    lead: id,
    isDeleted: false,
  }

  if (isBroker(user)) {
    filter.broker = user._id
  }

  return populateProposal(
    Proposal.find(filter)
      .sort({
        createdAt: -1,
      })
      .lean(),
  )
}

/*
|--------------------------------------------------------------------------
| GET PROPOSALS BY PROPERTY
|--------------------------------------------------------------------------
*/

export const getProposalsByProperty = async ({ propertyId, user }) => {
  const id = getObjectId(propertyId, 'Imóvel')

  const property = await Property.findById(id)

  if (!property) {
    throw createError('Imóvel não encontrado.', 404)
  }

  const filter = {
    property: id,
    isDeleted: false,
  }

  if (isBroker(user)) {
    filter.broker = user._id
  }

  return populateProposal(
    Proposal.find(filter)
      .sort({
        createdAt: -1,
      })
      .lean(),
  )
}

/*
|--------------------------------------------------------------------------
| GET PROPOSALS BY OPPORTUNITY
|--------------------------------------------------------------------------
*/

export const getProposalsByOpportunity = async ({ opportunityId, user }) => {
  const id = getObjectId(opportunityId, 'Oportunidade')

  const opportunity = await Opportunity.findById(id)

  if (!opportunity) {
    throw createError('Oportunidade não encontrada.', 404)
  }

  if (opportunity.isDeleted) {
    throw createError('Esta oportunidade foi removida.')
  }

  const opportunityLeadId = opportunity.lead?._id || opportunity.lead

  if (!opportunityLeadId) {
    throw createError('A oportunidade não possui Lead associado.')
  }

  const lead = await Lead.findById(opportunityLeadId)

  if (!lead) {
    throw createError('Lead da oportunidade não encontrado.', 404)
  }

  validateLeadAccess({
    lead,
    user,
  })

  const filter = {
    opportunity: id,
    isDeleted: false,
  }

  if (isBroker(user)) {
    filter.broker = user._id
  }

  return populateProposal(
    Proposal.find(filter)
      .sort({
        createdAt: -1,
      })
      .lean(),
  )
}

/*
|--------------------------------------------------------------------------
| METRICS
|--------------------------------------------------------------------------
*/

export const getProposalMetrics = async ({
  user,
  startDate,
  endDate,
  broker,
} = {}) => {
  const match = {
    isDeleted: false,
  }

  if (isBroker(user)) {
    match.broker = getObjectId(user._id, 'Usuário')
  }

  if (isAdmin(user) && broker) {
    match.broker = getObjectId(broker, 'Corretor')
  }

  if (startDate || endDate) {
    match.createdAt = {}

    if (startDate) {
      const start = new Date(startDate)

      start.setHours(0, 0, 0, 0)

      match.createdAt.$gte = start
    }

    if (endDate) {
      const end = new Date(endDate)

      end.setHours(23, 59, 59, 999)

      match.createdAt.$lte = end
    }
  }

  const [
    statusMetrics,
    valueMetrics,
    brokerMetrics,
    propertyMetrics,
    dailyMetrics,
  ] = await Promise.all([
    Proposal.aggregate([
      {
        $match: match,
      },

      {
        $group: {
          _id: '$status',

          count: {
            $sum: 1,
          },

          totalValue: {
            $sum: '$values.proposalPrice',
          },
        },
      },
    ]),

    Proposal.aggregate([
      {
        $match: match,
      },

      {
        $group: {
          _id: null,

          totalProposalValue: {
            $sum: '$values.proposalPrice',
          },

          averageProposalValue: {
            $avg: '$values.proposalPrice',
          },

          totalPropertyValue: {
            $sum: '$values.propertyPrice',
          },

          acceptedProposalValue: {
            $sum: {
              $cond: [
                {
                  $eq: ['$status', PROPOSAL_STATUS.ACCEPTED],
                },

                '$values.proposalPrice',

                0,
              ],
            },
          },

          acceptedCount: {
            $sum: {
              $cond: [
                {
                  $eq: ['$status', PROPOSAL_STATUS.ACCEPTED],
                },

                1,

                0,
              ],
            },
          },

          rejectedCount: {
            $sum: {
              $cond: [
                {
                  $eq: ['$status', PROPOSAL_STATUS.REJECTED],
                },

                1,

                0,
              ],
            },
          },

          pendingCount: {
            $sum: {
              $cond: [
                {
                  $eq: ['$status', PROPOSAL_STATUS.PENDING],
                },

                1,

                0,
              ],
            },
          },

          draftCount: {
            $sum: {
              $cond: [
                {
                  $eq: ['$status', PROPOSAL_STATUS.DRAFT],
                },

                1,

                0,
              ],
            },
          },
        },
      },
    ]),

    Proposal.aggregate([
      {
        $match: match,
      },

      {
        $group: {
          _id: '$broker',

          total: {
            $sum: 1,
          },

          accepted: {
            $sum: {
              $cond: [
                {
                  $eq: ['$status', PROPOSAL_STATUS.ACCEPTED],
                },

                1,

                0,
              ],
            },
          },

          pending: {
            $sum: {
              $cond: [
                {
                  $eq: ['$status', PROPOSAL_STATUS.PENDING],
                },

                1,

                0,
              ],
            },
          },

          rejected: {
            $sum: {
              $cond: [
                {
                  $eq: ['$status', PROPOSAL_STATUS.REJECTED],
                },

                1,

                0,
              ],
            },
          },

          totalValue: {
            $sum: '$values.proposalPrice',
          },

          acceptedValue: {
            $sum: {
              $cond: [
                {
                  $eq: ['$status', PROPOSAL_STATUS.ACCEPTED],
                },

                '$values.proposalPrice',

                0,
              ],
            },
          },
        },
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
          brokerId: '$_id',

          brokerName: '$broker.name',

          total: 1,

          accepted: 1,

          pending: 1,

          rejected: 1,

          totalValue: 1,

          acceptedValue: 1,
        },
      },

      {
        $sort: {
          total: -1,
        },
      },
    ]),

    Proposal.aggregate([
      {
        $match: match,
      },

      {
        $group: {
          _id: '$property',

          total: {
            $sum: 1,
          },

          accepted: {
            $sum: {
              $cond: [
                {
                  $eq: ['$status', PROPOSAL_STATUS.ACCEPTED],
                },

                1,

                0,
              ],
            },
          },

          totalValue: {
            $sum: '$values.proposalPrice',
          },
        },
      },

      {
        $lookup: {
          from: 'properties',

          localField: '_id',

          foreignField: '_id',

          as: 'property',
        },
      },

      {
        $unwind: {
          path: '$property',

          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          propertyId: '$_id',

          propertyTitle: '$property.name',

          propertyCode: '$property.code',

          proposalCount: '$property.statistics.proposals',

          total: 1,

          accepted: 1,

          totalValue: 1,
        },
      },

      {
        $sort: {
          total: -1,
        },
      },

      {
        $limit: 10,
      },
    ]),

    Proposal.aggregate([
      {
        $match: match,
      },

      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',

              date: '$createdAt',
            },
          },

          count: {
            $sum: 1,
          },

          totalValue: {
            $sum: '$values.proposalPrice',
          },

          accepted: {
            $sum: {
              $cond: [
                {
                  $eq: ['$status', PROPOSAL_STATUS.ACCEPTED],
                },

                1,

                0,
              ],
            },
          },
        },
      },

      {
        $sort: {
          _id: 1,
        },
      },
    ]),
  ])

  const statuses = getProposalStatuses()

  const status = {
    total: 0,
    draft: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    cancelled: 0,
    expired: 0,
  }

  const statusValues = {
    draft: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    cancelled: 0,
    expired: 0,
  }

  statusMetrics.forEach((item) => {
    const statusKey = Object.keys(statuses).find(
      (key) => statuses[key] === item._id,
    )

    if (statusKey) {
      status[statusKey] = item.count || 0

      statusValues[statusKey] = item.totalValue || 0
    }

    status.total += item.count || 0
  })

  const values = valueMetrics[0] || {
    totalProposalValue: 0,
    averageProposalValue: 0,
    totalPropertyValue: 0,
    acceptedProposalValue: 0,
    acceptedCount: 0,
    rejectedCount: 0,
    pendingCount: 0,
    draftCount: 0,
  }

  const approvalBase = status.accepted + status.rejected

  const approvalRate =
    approvalBase > 0 ? (status.accepted / approvalBase) * 100 : 0

  const conversionRate =
    status.total > 0 ? (status.accepted / status.total) * 100 : 0

  return {
    summary: {
      total: status.total,

      draft: status.draft,

      pending: status.pending,

      accepted: status.accepted,

      rejected: status.rejected,

      cancelled: status.cancelled,

      expired: status.expired,
    },

    values: {
      totalProposalValue: values.totalProposalValue || 0,

      averageProposalValue: values.averageProposalValue || 0,

      totalPropertyValue: values.totalPropertyValue || 0,

      acceptedProposalValue: values.acceptedProposalValue || 0,

      approvalRate: Number(approvalRate.toFixed(2)),

      conversionRate: Number(conversionRate.toFixed(2)),
    },

    statusValues,

    byBroker: brokerMetrics,

    byProperty: propertyMetrics,

    daily: dailyMetrics,
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

  getProposalsByOpportunity,

  getProposalMetrics,
}
