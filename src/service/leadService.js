import Lead from '../models/Lead.js'
import Property from '../models/Property.js'
import User from '../models/User.js'

import { LEAD_STAGES, LEAD_STAGE_LIST } from '../constants/leadStages.js'
import { LEAD_STATUS } from '../constants/leadStatus.js'
import { LEAD_PRIORITY } from '../constants/leadPriority.js'

// =========================================================
// NORMALIZAÇÃO DE REGIÃO
// =========================================================

// Valores EXATOS do enum do schema (todos minúsculos)
const VALID_REGIONS = [
  'central',
  'zona_oeste',
  'zona_leste',
  'zona_sul',
  'zona_norte',
  'abc',
  'grande_sp',
  'interior',
  'litoral',
]

// Apelidos comuns que o usuário pode digitar
const REGION_ALIASES = {
  // Centro
  CENTRO: 'central',
  CENTRAL: 'central',
  CENTRO_SP: 'central',

  // Zona Sul
  ZONA_SUL: 'zona_sul',
  SUL: 'zona_sul',
  ZS: 'zona_sul',

  // Zona Norte
  ZONA_NORTE: 'zona_norte',
  NORTE: 'zona_norte',
  ZN: 'zona_norte',

  // Zona Leste
  ZONA_LESTE: 'zona_leste',
  LESTE: 'zona_leste',
  ZL: 'zona_leste',

  // Zona Oeste
  ZONA_OESTE: 'zona_oeste',
  OESTE: 'zona_oeste',
  ZO: 'zona_oeste',

  // ABC
  ABC_PAULISTA: 'abc',
  ABCD: 'abc',
  SANTO_ANDRE: 'abc',
  SAO_BERNARDO: 'abc',
  SAO_CAETANO: 'abc',

  // Grande SP
  GRANDE_SAO_PAULO: 'grande_sp',
  GRANDE_SP: 'grande_sp',
  GUARULHOS: 'grande_sp',
  OSASCO: 'grande_sp',

  // Interior
  INTERIOR_SP: 'interior',
  CAMPINAS: 'interior',
  SOROCABA: 'interior',
  RIBEIRAO: 'interior',

  // Litoral
  LITORAL_SP: 'litoral',
  BAIXADA_SANTISTA: 'litoral',
  SANTOS: 'litoral',
  PRAIA_GRANDE: 'litoral',
}

// =========================================================
// MAPEAMENTO DE CABEÇALHOS CSV → CAMPOS DO SCHEMA
// =========================================================

const CSV_FIELD_MAP = {
  // Nome
  nome: 'name',
  name: 'name',
  Nome: 'name',
  Name: 'name',

  // Email
  email: 'email',
  Email: 'email',
  'e-mail': 'email',
  'E-mail': 'email',

  // Telefone
  telefone: 'phone',
  phone: 'phone',
  Telefone: 'phone',
  Phone: 'phone',
  celular: 'phone',
  Celular: 'phone',

  // Região
  regiao: 'region',
  região: 'region',
  region: 'region',
  Região: 'region',
  Regiao: 'region',
  Region: 'region',

  // Origem
  origem: 'source',
  source: 'source',
  Origem: 'source',
  Source: 'source',

  // Status
  status: 'status',
  Status: 'status',

  // Etapa
  stage: 'stage',
  etapa: 'stage',
  Stage: 'stage',
  Etapa: 'stage',

  // Prioridade
  priority: 'priority',
  prioridade: 'priority',
  Priority: 'priority',
  Prioridade: 'priority',

  // Observações
  observacoes: 'notes',
  observações: 'notes',
  notes: 'notes',
  Observações: 'notes',
  Notes: 'notes',
}

/**
 * Normaliza uma linha do CSV, mapeando cabeçalhos em PT/EN
 * para os campos do schema do Mongoose.
 */
const normalizeCSVRow = (row) => {
  const normalized = {}

  for (const [key, value] of Object.entries(row)) {
    const trimmedKey = String(key).trim()
    const mappedField = CSV_FIELD_MAP[trimmedKey] || trimmedKey

    if (value === undefined || value === null) continue

    const stringValue = String(value).trim()
    if (stringValue === '') continue

    normalized[mappedField] = stringValue
  }

  return normalized
}

/**
 * Normaliza uma região para o formato do enum do Mongoose.
 *
 * Aceita:
 *   - "zona sul"     → "zona_sul"
 *   - "Zona Sul"     → "zona_sul"
 *   - "ZONA SUL"     → "zona_sul"
 *   - "zona-sul"     → "zona_sul"
 *   - "ZonaSul"      → "zona_sul"
 *   - "Sul"          → "zona_sul"
 *   - "Centro"       → "central"
 *   - "abc"          → "abc"
 *
 * Retorna null se não for possível normalizar.
 */
export const normalizeRegion = (region) => {
  if (!region) return null

  // Remove espaços, converte para minúsculo, remove acentos
  const cleaned = String(region)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[\s\-./]+/g, '_') // Espaços, hífens, pontos → underscore
    .replace(/[^a-zA-Z0-9_]/g, '') // Remove caracteres inválidos
    .toUpperCase()

  // 1. Verifica se é um valor direto do enum
  const directMatch = cleaned.toLowerCase()
  if (VALID_REGIONS.includes(directMatch)) {
    return directMatch
  }

  // 2. Verifica no mapa de apelidos
  if (REGION_ALIASES[cleaned]) {
    return REGION_ALIASES[cleaned]
  }

  // 3. Tenta match parcial (ex: "ZONA_SUL_SP" → "zona_sul")
  for (const validRegion of VALID_REGIONS) {
    const validUpper = validRegion.toUpperCase()
    if (cleaned.includes(validUpper) || validUpper.includes(cleaned)) {
      return validRegion
    }
  }

  return null
}

/**
 * Normaliza a região ou lança erro se inválida
 */
const requireValidRegion = (region) => {
  if (!region) return null

  const normalized = normalizeRegion(region)

  if (!normalized) {
    throw new Error(
      `Região inválida: "${region}". ` +
        `Valores permitidos: ${VALID_REGIONS.join(', ')}`,
    )
  }

  return normalized
}

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
}) => {
  // ✅ CORRIGIDO: Define um autor válido para o stageHistory
  // Prioridade: createdBy → assignedTo
  // Se nenhum existir, o stageHistory fica vazio (evita ValidationError)
  const historyAuthor = createdBy || assignedTo || null

  return {
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

    // ✅ CORRIGIDO: Só cria stageHistory se tiver autor válido
    // Se não tiver, deixa vazio (aceito pelo schema quando o campo não é obrigatório em arrays vazios)
    stageHistory: historyAuthor
      ? [
          {
            stage: LEAD_STAGES.NEW,
            changedBy: historyAuthor,
            changedAt: new Date(),
          },
        ]
      : [],
  }
}

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
  try {
    console.log('🔄 Iniciando atualização do lead:', {
      leadId,
      userId,
      isAdmin,
      data,
    })

    // 1. Buscar o lead
    const lead = await findLeadOrThrow(leadId)
    console.log('📋 Lead encontrado:', {
      id: lead._id,
      name: lead.name,
      statusAtual: lead.status,
      stageAtual: lead.stage,
    })

    // 2. Verificar permissão
    if (!isAdmin) {
      if (
        !lead.assignedTo ||
        lead.assignedTo.toString() !== userId.toString()
      ) {
        throw new Error('Sem permissão para atualizar este lead.')
      }
      console.log('✅ Permissão verificada: usuário é o responsável')
    } else {
      console.log('✅ Permissão verificada: usuário é admin')
    }

    // 3. Mapear os campos editáveis (incluindo todos os novos)
    const editableFields = [
      // Dados básicos
      'name',
      'email',
      'phone',
      'notes',

      // Status e pipeline
      'status',
      'stage',
      'priority',
      'region',

      // Associação
      'property',
      'assignedTo',

      // Origem
      'sourceType',
      'sourceBroker',
      'sourceSite',
      'sourceUrl',
      'landingPage',
      'referrer',
      'campaign',

      // Datas
      'lastContactAt',
      'visitDate',
      'proposalDate',
      'closeDate',

      // Outros
      'score',
      'nextAction',
      'nextActionDate',
      'proposalValue',
    ]

    // 4. Aplicar as atualizações
    let hasChanges = false
    editableFields.forEach((field) => {
      if (data[field] !== undefined && data[field] !== null) {
        // Se for um objeto, faz merge (caso de campaign)
        if (
          field === 'campaign' &&
          typeof data[field] === 'object' &&
          lead[field]
        ) {
          lead[field] = {
            ...(lead[field].toObject ? lead[field].toObject() : lead[field]),
            ...data[field],
          }
          hasChanges = true
          console.log(`📝 Atualizado campo '${field}':`, data[field])
        } else {
          lead[field] = data[field]
          hasChanges = true
          console.log(`📝 Atualizado campo '${field}':`, data[field])
        }
      }
    })

    // 5. Se o status foi alterado, atualizar também o stage (opcional)
    if (data.status && data.status !== lead.status) {
      const stageMap = {
        [LEAD_STATUS.NEW]: LEAD_STAGES.NEW,
        [LEAD_STATUS.CONTACTED]: LEAD_STAGES.QUALIFIED,
        [LEAD_STATUS.NEGOTIATION]: LEAD_STAGES.NEGOTIATION,
        [LEAD_STATUS.CONVERTED]: LEAD_STAGES.WON,
        [LEAD_STATUS.LOST]: LEAD_STAGES.LOST,
        [LEAD_STATUS.ARCHIVED]: LEAD_STAGES.LOST,
        [LEAD_STATUS.IN_PROGRESS]: LEAD_STAGES.QUALIFIED,
      }

      const newStage = stageMap[data.status]
      if (newStage && lead.stage !== newStage) {
        lead.stage = newStage
        hasChanges = true
        console.log(
          `🔄 Stage atualizado automaticamente: ${lead.stage} → ${newStage}`,
        )
      }

      // Adicionar ao histórico de estágio
      if (lead.stageHistory) {
        lead.stageHistory.push({
          from: lead.stage,
          to: lead.stage,
          stage: lead.stage,
          changedBy: userId,
          changedAt: new Date(),
          reason: `Status alterado para ${data.status}`,
        })
        hasChanges = true
      }
    }

    // 6. Verificar se houve mudanças
    if (!hasChanges) {
      console.log('⚠️ Nenhuma alteração detectada')
      await populateLead(lead)
      return normalizeLead(lead)
    }

    // 7. Atualizar timestamps
    lead.updatedAt = new Date()

    // 8. Salvar
    await lead.save()
    console.log('✅ Lead atualizado com sucesso')

    // 9. Popular e retornar
    await populateLead(lead)
    const normalizedLead = normalizeLead(lead)

    console.log('📤 Lead retornado:', {
      id: normalizedLead._id,
      name: normalizedLead.name,
      status: normalizedLead.status,
      stage: normalizedLead.stage,
    })

    return normalizedLead
  } catch (error) {
    console.error('❌ Erro ao atualizar lead:', {
      leadId,
      error: error.message,
      stack: error.stack,
    })
    throw error
  }
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
  const results = {
    total: rows.length,
    success: 0,
    failed: 0,
    errors: [],
    leads: [],
  }

  for (const [index, rawRow] of rows.entries()) {
    const rowNumber = index + 2 // +2 porque linha 1 é o cabeçalho

    try {
      // 1. Normaliza cabeçalhos (nome → name, etc)
      const normalized = normalizeCSVRow(rawRow)

      // 2. Valida campos obrigatórios
      if (!normalized.name || normalized.name.trim() === '') {
        throw new Error('Campo "name" é obrigatório')
      }

      // 3. Normaliza a região
      const normalizedRegion = normalizeRegion(normalized.region)

      // 4. Cria o lead usando o buildLeadData
      const lead = await createLeadFromSource(
        {
          name: normalized.name.trim(),
          email: normalized.email?.toLowerCase().trim() || '',
          phone: normalized.phone?.trim() || '',
          region: normalizedRegion || 'central',
          notes: normalized.notes?.trim() || '',
          source: 'csv',
          sourceType: 'csv',
        },
        'csv',
      )

      results.success++
      results.leads.push(lead)
    } catch (error) {
      results.failed++
      results.errors.push({
        row: rowNumber,
        data: rawRow,
        error: error.message,
      })

      console.error(`❌ Erro na linha ${rowNumber}:`, error.message)
    }
  }

  console.log(
    `📊 Importação CSV: ${results.success}/${results.total} importados (${results.failed} falhas)`,
  )

  return results
}
// ======================================================
// CREATE BROKER HOTSITE LEAD
// ======================================================

export const createBrokerHotsiteLead = async (data) => {
  const normalizedRegion = requireValidRegion(data.region)
  const {
    name,
    email,
    phone,
    message,

    property: propertyId,

    broker: brokerId,

    sourceSite = '',
    sourceUrl = '',
    landingPage = '',
    referrer = '',

    campaign = {},

    sessionId = '',
    visitorId = '',
  } = data

  // ====================================================
  // VALIDATE REQUIRED DATA
  // ====================================================

  if (!name?.trim()) {
    throw new Error('Nome é obrigatório.')
  }

  if (!email?.trim()) {
    throw new Error('E-mail é obrigatório.')
  }

  if (!phone?.trim()) {
    throw new Error('Telefone é obrigatório.')
  }

  if (!propertyId) {
    throw new Error('Imóvel é obrigatório.')
  }

  if (!brokerId) {
    throw new Error('Corretor do hotsite é obrigatório.')
  }

  // ====================================================
  // FIND PROPERTY
  // ====================================================

  const property = await Property.findById(propertyId)

  if (!property) {
    throw new Error('Imóvel não encontrado.')
  }

  // ====================================================
  // FIND BROKER
  // ====================================================

  const broker = await User.findOne({
    _id: brokerId,
    isBroker: true,
  })

  if (!broker) {
    throw new Error('Corretor do hotsite não encontrado.')
  }

  // ====================================================
  // REGION
  // ====================================================

  const region = property.region || property.location?.region

  if (!region) {
    throw new Error('Não foi possível identificar a região do imóvel.')
  }

  // ====================================================
  // CREATE LEAD
  // ====================================================

  const lead = new Lead({
    name: name.trim(),

    email: email.trim().toLowerCase(),

    phone: phone.trim(),

    property: property._id,

    region: normalizedRegion,

    // --------------------------------------------------
    // ORIGIN
    // --------------------------------------------------

    source: 'hotsite',

    sourceType: 'broker_hotsite',

    sourceBroker: broker._id,

    sourceSite: sourceSite?.trim() || '',

    sourceUrl: sourceUrl?.trim() || '',

    landingPage: landingPage?.trim() || '',

    referrer: referrer?.trim() || '',

    campaign: {
      utmSource: campaign?.utmSource || '',
      utmMedium: campaign?.utmMedium || '',
      utmCampaign: campaign?.utmCampaign || '',
      utmTerm: campaign?.utmTerm || '',
      utmContent: campaign?.utmContent || '',
    },

    // --------------------------------------------------
    // ASSIGNMENT
    // --------------------------------------------------

    assignedTo: broker._id,

    assignmentType: 'broker',

    awaitingAssignment: false,

    assignedAt: new Date(),

    assignedBy: null,

    // --------------------------------------------------
    // CREATION
    // --------------------------------------------------

    createdBy: null,

    // --------------------------------------------------
    // PIPELINE
    // --------------------------------------------------

    stage: LEAD_STAGES.NEW,

    status: LEAD_STATUS.NEW,

    priority: LEAD_PRIORITY.MEDIUM,

    // --------------------------------------------------
    // NOTES
    // --------------------------------------------------

    notes: message?.trim() || '',

    // --------------------------------------------------
    // VISITOR
    // --------------------------------------------------

    sessionId: sessionId?.trim() || '',

    visitorId: visitorId?.trim() || '',

    // --------------------------------------------------
    // STAGE HISTORY
    // --------------------------------------------------

    /*
     * Não adicionamos stageHistory aqui porque
     * changedBy é obrigatório no seu schema e
     * o visitante não é um usuário autenticado.
     */
    stageHistory: [],
  })

  await lead.save()

  // ====================================================
  // POPULATE
  // ====================================================

  await populateLead(lead)

  return normalizeLead(lead)
}
