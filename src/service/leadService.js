import Lead from '../models/Lead.js'

<<<<<<< HEAD
import { LEAD_STAGES, LEAD_STAGE_LIST } from '../constants/leadStages.js'
import { LEAD_STATUS } from '../constants/leadStatus.js'
import { LEAD_PRIORITY } from '../constants/leadPriority.js'

// ======================================================
// CONSTANTS
// ======================================================

const LEAD_POPULATE = [
  {
    path: 'property',
    select: `
      name
      code
      slug
      type
      category
      purpose
      bedrooms
      suites
      bathrooms
      parkingSpaces
      images
      coverImage
      prices
      location
    `,
  },

  {
    path: 'createdBy',
    select: 'name avatar email',
  },

  {
    path: 'assignedTo',
    select: 'name avatar email phone',
  },

  {
    path: 'stageHistory.changedBy',
    select: 'name avatar',
  },

  {
    path: 'sourceBroker',
    select: 'name avatar email phone',
  },
]

const STAGE_STATUS_MAP = {
  [LEAD_STAGES.WON]: LEAD_STATUS.CONVERTED,
  [LEAD_STAGES.LOST]: LEAD_STATUS.LOST,
}

// ======================================================
// PRIVATE HELPERS
// ======================================================

const populateLead = (lead) => {
  return lead.populate(LEAD_POPULATE)
}

// ======================================================
// PROPERTY HELPER
// ======================================================

/**
 * Normaliza os dados do imóvel para o Lead.
 *
 * O Property possui:
 *
 * prices.salePrice
 * prices.rentPrice
 *
 * location.street
 * location.number
 * location.complement
 * location.district
 * location.city
 * location.state
 *
 * Assim o frontend recebe um objeto consistente.
 */
const normalizeProperty = (property) => {
  if (!property) {
    return null
  }

  const location = property.location || {}
  const prices = property.prices || {}

  let price = null

  if (property.purpose === 'venda') {
    price = prices.salePrice || null
  }

  if (property.purpose === 'aluguel') {
    price = prices.rentPrice || null
  }

  if (!price) {
    price = prices.salePrice || prices.rentPrice || null
  }

  const address = [
    location.street,
    location.number,
    location.complement,
    location.district,
    location.city,
    location.state,
  ]
    .filter(Boolean)
    .join(', ')

  const mainImage =
    property.coverImage ||
    property.images?.find((image) => image.isCover)?.url ||
    property.images?.[0]?.url ||
    ''

  return {
    ...property,

    mainImage,

    price,

    fullAddress: address,

    totalImages: property.images?.length || 0,

    formattedCode: property.code || '',
  }
}

const normalizeLead = (lead) => {
  if (!lead) return lead

  const plainLead =
    typeof lead.toObject === 'function'
      ? lead.toObject({
          virtuals: true,
        })
      : lead

  return {
    ...plainLead,

    property: normalizeProperty(plainLead.property),

    whatsappLink: buildWhatsappLink({
      ...plainLead,
      property: normalizeProperty(plainLead.property),
    }),
  }
}

// ======================================================
// FIND
// ======================================================

const findLeadOrThrow = async (leadId) => {
  const lead = await Lead.findById(leadId)

  if (!lead) {
    throw new Error('Lead não encontrado.')
  }

  return lead
}

// ======================================================
// STATUS
// ======================================================

const resolveLeadStatus = (stage) => {
  return STAGE_STATUS_MAP[stage] || LEAD_STATUS.IN_PROGRESS
}

// ======================================================
// STAGE HISTORY
// ======================================================

const addStageHistory = (lead, stage, userId, changedAt = new Date()) => {
  const lastStage = lead.stageHistory[lead.stageHistory.length - 1]

  if (lastStage?.stage === stage) {
    return
  }

  lead.stageHistory.push({
    stage,
    changedBy: userId,
    changedAt,
  })
}

// ======================================================
// PIPELINE
// ======================================================

const buildEmptyPipeline = () => {
  return LEAD_STAGE_LIST.reduce((acc, stage) => {
    acc[stage] = []

    return acc
  }, {})
}

// ======================================================
// WHATSAPP
// ======================================================

const buildWhatsappLink = (lead) => {
  if (!lead.phone) return null

  return `https://wa.me/${lead.phone.replace(/\D/g, '')}?text=Olá%20${encodeURIComponent(
    lead.name,
  )},%20vi%20seu%20interesse%20no%20imóvel%20${encodeURIComponent(
    lead.property?.name || '',
  )}`
}

// ======================================================
// CREATE HELPERS
// ======================================================

const buildLeadData = ({
  name,
  email,
  phone,

  property,

  region,

  notes,

  assignedTo,

  createdBy,

  source = 'manual',

  sourceType = 'manual',

  sourceBroker = null,

  sourceSite = '',

  sourceUrl = '',

  landingPage = '',

  referrer = '',

  campaign = {},

  sessionId = '',

  visitorId = '',
}) => ({
  name,

  email,

  phone,

  property: property || null,

  region: region || 'central',

  notes: notes || '',

  createdBy: createdBy || null,

  assignedTo: assignedTo || null,

  source,

  sourceType,

  sourceBroker: sourceBroker || null,

  sourceSite: sourceSite || '',

  sourceUrl: sourceUrl || '',

  landingPage: landingPage || '',

  referrer: referrer || '',

  campaign: {
    utmSource: campaign?.utmSource || '',
    utmMedium: campaign?.utmMedium || '',
    utmCampaign: campaign?.utmCampaign || '',
    utmTerm: campaign?.utmTerm || '',
    utmContent: campaign?.utmContent || '',
  },

  sessionId: sessionId || '',

  visitorId: visitorId || '',

  stage: LEAD_STAGES.NEW,

  status: LEAD_STATUS.NEW,

  priority: LEAD_PRIORITY.MEDIUM,

  stageHistory: [
    {
      stage: LEAD_STAGES.NEW,

      changedBy: createdBy || null,

      changedAt: new Date(),
    },
  ],
})

// ======================================================
// CREATE
// ======================================================

export const createLead = async (data) => {
  const payload = buildLeadData({
    ...data,

    source: data.source || 'manual',

    sourceType: data.sourceType || 'manual',
  })

  const lead = new Lead(payload)

  await lead.save()

  return populateLead(lead)
}

// ======================================================
// PUBLIC CREATE
// ======================================================

export const publicCreateLead = async (data) => {
  const lead = await Lead.create(
    buildLeadData({
      ...data,

      createdBy: null,

      source: 'public',

      sourceType: data.sourceType || 'company_site',
    }),
  )

  return populateLead(lead)
}

// ======================================================
// CREATE FROM SOURCE
// ======================================================

export const createLeadFromSource = async (data, source = 'manual') => {
  const lead = await Lead.create(
    buildLeadData({
      ...data,

      source,

      sourceType: data.sourceType || source,
    }),
  )

  return populateLead(lead)
}

// ======================================================
// CHANGE STAGE
// ======================================================

export const changeLeadStage = async ({ leadId, stage, userId }) => {
  if (!LEAD_STAGE_LIST.includes(stage)) {
    throw new Error('Etapa do pipeline inválida.')
  }

  const lead = await findLeadOrThrow(leadId)

  if (lead.stage === stage) {
    await populateLead(lead)

    return normalizeLead(lead)
  }

  const now = new Date()

  lead.stage = stage

  lead.status = resolveLeadStatus(stage)

  lead.lastContactAt = now

  addStageHistory(lead, stage, userId, now)

  await lead.save()

  await populateLead(lead)

  return normalizeLead(lead)
}

// ======================================================
// GET PIPELINE
// ======================================================

export const getPipeline = async (filters = {}) => {
  const query = {}

  if (filters.assignedTo) {
    query.assignedTo = filters.assignedTo
  }

  if (filters.createdBy) {
    query.createdBy = filters.createdBy
  }

  if (filters.region) {
    query.region = filters.region
  }

  if (filters.source) {
    query.source = filters.source
  }

  if (filters.sourceType) {
    query.sourceType = filters.sourceType
  }

  if (filters.status) {
    query.status = filters.status
  }

  const leads = await Lead.find(query)
    .populate(LEAD_POPULATE)
    .sort({
      createdAt: -1,
    })
    .lean()

  const pipeline = buildEmptyPipeline()

  leads.forEach((lead) => {
    const normalizedLead = normalizeLead(lead)

    pipeline[lead.stage]?.push(normalizedLead)
  })

  return pipeline
}

// ======================================================
// DASHBOARD
// ======================================================

export const getPipelineMetrics = async (filters = {}) => {
  const match = {}

  if (filters.assignedTo) {
    match.assignedTo = filters.assignedTo
  }

  if (filters.createdBy) {
    match.createdBy = filters.createdBy
  }

  if (filters.region) {
    match.region = filters.region
  }

  if (filters.source) {
    match.source = filters.source
  }

  if (filters.sourceType) {
    match.sourceType = filters.sourceType
  }

  if (filters.status) {
    match.status = filters.status
  }

  const metrics = await Lead.aggregate([
    {
      $match: match,
    },

    {
      $group: {
        _id: '$stage',

        total: {
          $sum: 1,
        },
      },
    },
  ])

  const response = buildEmptyPipeline()

  Object.keys(response).forEach((stage) => {
    response[stage] = 0
  })

  metrics.forEach(({ _id, total }) => {
    response[_id] = total
  })

  return response
}

// ======================================================
// READ
// ======================================================

export const getLeads = async ({ userId, isAdmin, filters = {} }) => {
  const query = {}

  if (!isAdmin) {
    query.$or = [
      {
        createdBy: userId,
      },

      {
        assignedTo: userId,
      },
    ]
  }

  if (filters.status) {
    query.status = filters.status
  }

  if (filters.stage) {
    query.stage = filters.stage
  }

  if (filters.priority) {
    query.priority = filters.priority
  }

  if (filters.region) {
    query.region = filters.region
  }

  if (filters.source) {
    query.source = filters.source
  }

  if (filters.sourceType) {
    query.sourceType = filters.sourceType
  }

  const leads = await Lead.find(query)
    .populate(LEAD_POPULATE)
    .sort({
      createdAt: -1,
    })
    .lean()

  console.log(
    'LEADS DO BANCO:',
    leads.map((lead) => ({
      name: lead.name,

      status: lead.status,

      stage: lead.stage,

      source: lead.source,

      sourceType: lead.sourceType,

      property: lead.property?.name,

      address: lead.property?.location,
    })),
  )

  return leads.map((lead) => normalizeLead(lead))
}

// ======================================================
// GET LEAD BY ID
// ======================================================

export const getLeadById = async (leadId) => {
  const lead = await findLeadOrThrow(leadId)

  await populateLead(lead)

  return normalizeLead(lead)
}

// ======================================================
// UPDATE
// ======================================================

export const updateLead = async ({ leadId, userId, isAdmin, data }) => {
  const lead = await findLeadOrThrow(leadId)

  if (!isAdmin) {
    if (!lead.assignedTo || lead.assignedTo.toString() !== userId.toString()) {
      throw new Error('Sem permissão para atualizar este lead.')
    }
  }

  const editableFields = [
    'name',
    'email',
    'phone',
    'notes',
    'priority',
    'region',
    'property',
    'assignedTo',

    // origem
    'sourceType',
    'sourceBroker',
    'sourceSite',
    'sourceUrl',
    'landingPage',
    'referrer',
    'campaign',
  ]

  editableFields.forEach((field) => {
    if (data[field] !== undefined) {
      lead[field] = data[field]
    }
  })

  await lead.save()

  await populateLead(lead)

  return normalizeLead(lead)
}

// ======================================================
// ASSIGN
// ======================================================

export const assignLeads = async ({ leadIds, userId }) => {
  const result = await Lead.updateMany(
    {
      _id: {
        $in: leadIds,
      },
    },

    {
      $set: {
        assignedTo: userId,
      },
    },
  )

  return {
    modifiedCount: result.modifiedCount,
  }
}

// ======================================================
// DELETE
// ======================================================

export const deleteLead = async ({ leadId, userId, isAdmin }) => {
  const lead = await findLeadOrThrow(leadId)

  if (!isAdmin && lead.createdBy?.toString() !== userId.toString()) {
    throw new Error('Sem permissão para remover este lead.')
  }

  await lead.deleteOne()

  return {
    success: true,
  }
}

// ======================================================
// IMPORT / WEBHOOK
// ======================================================

export const createLeadFromWebhook = async ({ data, source }) => {
  return createLeadFromSource(data, source)
}

// ======================================================
// CSV
// ======================================================

export const importLeadsFromCSV = async (rows) => {
  const createdLeads = []

  for (const row of rows) {
    const lead = await createLeadFromSource(row, 'csv')

    createdLeads.push(lead)
  }

  return {
    total: createdLeads.length,

    leads: createdLeads,
  }
=======
// Função central para salvar lead normalizado
export const createLeadFromSource = async (data, source = 'manual') => {
  const { name, email, phone, property, region, notes, assignedTo } = data

  return await Lead.create({
    name,
    email,
    phone,
    property: property || null,
    region: region || 'central',
    notes: notes || '',
    createdBy: data.createdBy || null,
    assignedTo: assignedTo || null,
    source, // 👈 identifica origem do lead
  })
>>>>>>> 32e8de98b92a233f54261a3612474c5a61832f64
}
