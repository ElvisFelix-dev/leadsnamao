import mongoose from 'mongoose'

import Lead from '../models/Lead.js'
import Property from '../models/Property.js'
import User from '../models/User.js'

import { LEAD_SOURCE_TYPE } from '../constants/leadSourceType.js'

import { LEAD_STAGES } from '../constants/leadStages.js'

import { LEAD_STATUS } from '../constants/leadStatus.js'

import { LEAD_PRIORITY } from '../constants/leadPriority.js'

/* ============================================================
   HELPERS
============================================================ */

/**
 * Verifica se o ID é um ObjectId válido.
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

/**
 * Limpa strings recebidas do frontend.
 */
function cleanString(value = '') {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value).trim()
}

/**
 * Normaliza email.
 */
function normalizeEmail(email = '') {
  return cleanString(email).toLowerCase()
}

/**
 * Normaliza telefone removendo espaços desnecessários.
 */
function normalizePhone(phone = '') {
  return cleanString(phone)
}

/**
 * Normaliza uma origem.
 */
function normalizeSource(source = '') {
  return cleanString(source).toLowerCase()
}

/**
 * Normaliza sourceType.
 */
function normalizeSourceType(sourceType = '') {
  return cleanString(sourceType).toLowerCase()
}

/**
 * Retorna uma prioridade segura.
 */
function normalizePriority(priority) {
  if (!priority) {
    return LEAD_PRIORITY.MEDIUM
  }

  return priority
}

/* ============================================================
   VALIDAR DADOS BÁSICOS
============================================================ */

function validateLeadData({ name, email, phone }) {
  if (!name) {
    throw new Error('Nome do lead não informado.')
  }

  if (!email) {
    throw new Error('E-mail do lead não informado.')
  }

  if (!phone) {
    throw new Error('Telefone do lead não informado.')
  }

  if (name.length < 2) {
    throw new Error('Nome do lead inválido.')
  }

  if (!email.includes('@')) {
    throw new Error('E-mail do lead inválido.')
  }
}

/* ============================================================
   VALIDAR IMÓVEL
============================================================ */

async function validateProperty(propertyId) {
  if (!propertyId) {
    throw new Error('ID do imóvel não informado.')
  }

  if (!isValidObjectId(propertyId)) {
    throw new Error('ID do imóvel inválido.')
  }

  const property = await Property.findOne({
    _id: propertyId,

    isDeleted: {
      $ne: true,
    },
  })
    .select('_id name code slug status active published region')
    .lean()

  if (!property) {
    throw new Error('Imóvel não encontrado.')
  }

  return property
}

/* ============================================================
   VALIDAR CORRETOR
============================================================ */

async function validateBroker(brokerId) {
  if (!brokerId) {
    throw new Error('Corretor não informado.')
  }

  if (!isValidObjectId(brokerId)) {
    throw new Error('ID do corretor inválido.')
  }

  const broker = await User.findOne({
    _id: brokerId,

    role: 'broker',
  })
    .select('_id name email avatar role active availability')
    .lean()

  if (!broker) {
    throw new Error('Corretor não encontrado.')
  }

  /**
   * Se seu User model não possuir active,
   * o teste abaixo não bloqueará o corretor.
   */
  if (broker.active === false) {
    throw new Error('Este corretor não está ativo.')
  }

  return broker
}

/* ============================================================
   RESOLVER CONTEXTO DA ORIGEM
============================================================ */

/**
 * Define automaticamente como o lead deverá ser tratado.
 *
 * IMPORTANTE:
 *
 * Nunca confiamos em:
 *
 * assignedTo
 *
 * enviado pelo frontend.
 *
 * O frontend informa o contexto da captura.
 * O backend decide quem recebe o lead.
 */
async function resolveLeadSource({ sourceType, sourceBroker }) {
  const normalizedType = normalizeSourceType(sourceType)

  /* ----------------------------------------------------------
     HOTSITE DO CORRETOR
  ---------------------------------------------------------- */

  if (normalizedType === LEAD_SOURCE_TYPE.BROKER_HOTSITE) {
    if (!sourceBroker) {
      throw new Error('O hotsite do corretor não possui corretor vinculado.')
    }

    const broker = await validateBroker(sourceBroker)

    return {
      sourceType: LEAD_SOURCE_TYPE.BROKER_HOTSITE,

      sourceBroker: broker._id,

      assignedTo: broker._id,

      awaitingAssignment: false,

      assignmentType: 'broker',

      assignedAt: new Date(),

      assignedBy: null,
    }
  }

  /* ----------------------------------------------------------
     SITE DA IMOBILIÁRIA
  ---------------------------------------------------------- */

  if (normalizedType === LEAD_SOURCE_TYPE.SITE) {
    return {
      sourceType: LEAD_SOURCE_TYPE.SITE,

      sourceBroker: null,

      assignedTo: null,

      awaitingAssignment: true,

      assignmentType: 'admin',

      assignedAt: null,

      assignedBy: null,
    }
  }

  /* ----------------------------------------------------------
     PÁGINA DO IMÓVEL
  ---------------------------------------------------------- */

  if (normalizedType === LEAD_SOURCE_TYPE.PROPERTY_PAGE) {
    return {
      sourceType: LEAD_SOURCE_TYPE.PROPERTY_PAGE,

      sourceBroker: null,

      assignedTo: null,

      awaitingAssignment: true,

      assignmentType: 'admin',

      assignedAt: null,

      assignedBy: null,
    }
  }

  /* ----------------------------------------------------------
     PORTAL
  ---------------------------------------------------------- */

  if (normalizedType === LEAD_SOURCE_TYPE.PORTAL) {
    return {
      sourceType: LEAD_SOURCE_TYPE.PORTAL,

      sourceBroker: null,

      assignedTo: null,

      awaitingAssignment: true,

      assignmentType: 'admin',

      assignedAt: null,

      assignedBy: null,
    }
  }

  /* ----------------------------------------------------------
     META
  ---------------------------------------------------------- */

  if (normalizedType === LEAD_SOURCE_TYPE.META) {
    return {
      sourceType: LEAD_SOURCE_TYPE.META,

      sourceBroker: null,

      assignedTo: null,

      awaitingAssignment: true,

      assignmentType: 'admin',

      assignedAt: null,

      assignedBy: null,
    }
  }

  /* ----------------------------------------------------------
     IMPORTAÇÃO
  ---------------------------------------------------------- */

  if (normalizedType === LEAD_SOURCE_TYPE.IMPORT) {
    return {
      sourceType: LEAD_SOURCE_TYPE.IMPORT,

      sourceBroker: null,

      assignedTo: null,

      awaitingAssignment: true,

      assignmentType: 'admin',

      assignedAt: null,

      assignedBy: null,
    }
  }

  /* ----------------------------------------------------------
     INDICAÇÃO
  ---------------------------------------------------------- */

  if (normalizedType === LEAD_SOURCE_TYPE.REFERRAL) {
    return {
      sourceType: LEAD_SOURCE_TYPE.REFERRAL,

      sourceBroker: null,

      assignedTo: null,

      awaitingAssignment: true,

      assignmentType: 'manual',

      assignedAt: null,

      assignedBy: null,
    }
  }

  /* ----------------------------------------------------------
     MANUAL
  ---------------------------------------------------------- */

  return {
    sourceType: LEAD_SOURCE_TYPE.MANUAL,

    sourceBroker: null,

    assignedTo: null,

    awaitingAssignment: false,

    assignmentType: 'manual',

    assignedAt: null,

    assignedBy: null,
  }
}

/* ============================================================
   CRIAR LEAD
============================================================ */

/**
 * Captura principal de lead.
 *
 * Pode ser usada por:
 *
 * - Site
 * - Hotsite
 * - Página de imóvel
 * - Portal
 * - Meta
 * - Integrações futuras
 */
export async function captureLead({
  name,
  email,
  phone,

  propertyId = null,

  source = 'public',

  sourceType = LEAD_SOURCE_TYPE.SITE,

  sourceBroker = null,

  sourceSite = '',

  sourceUrl = '',

  landingPage = '',

  referrer = '',

  region = 'zona norte',

  notes = '',

  sessionId = '',

  visitorId = '',

  campaign = {},

  priority = LEAD_PRIORITY.MEDIUM,

  createdBy = null,
}) {
  /* ----------------------------------------------------------
     NORMALIZAÇÃO
  ---------------------------------------------------------- */

  const normalizedName = cleanString(name)

  const normalizedEmail = normalizeEmail(email)

  const normalizedPhone = normalizePhone(phone)

  const normalizedSource = normalizeSource(source) || 'public'

  const normalizedSourceType =
    normalizeSourceType(sourceType) || LEAD_SOURCE_TYPE.SITE

  /* ----------------------------------------------------------
     VALIDAÇÃO
  ---------------------------------------------------------- */

  validateLeadData({
    name: normalizedName,

    email: normalizedEmail,

    phone: normalizedPhone,
  })

  /* ----------------------------------------------------------
     IMÓVEL
  ---------------------------------------------------------- */

  let property = null

  if (propertyId) {
    property = await validateProperty(propertyId)
  }

  /* ----------------------------------------------------------
     ORIGEM
  ---------------------------------------------------------- */

  const sourceContext = await resolveLeadSource({
    sourceType: normalizedSourceType,

    sourceBroker,
  })

  /* ----------------------------------------------------------
     CAMPANHA
  ---------------------------------------------------------- */

  const safeCampaign = {
    utmSource: cleanString(campaign?.utmSource),

    utmMedium: cleanString(campaign?.utmMedium),

    utmCampaign: cleanString(campaign?.utmCampaign),

    utmTerm: cleanString(campaign?.utmTerm),

    utmContent: cleanString(campaign?.utmContent),
  }

  /* ----------------------------------------------------------
     VERIFICAR LEAD DUPLICADO RECENTE
  ---------------------------------------------------------- */

  /**
   * Não criamos vários leads idênticos em poucos segundos
   * caso o usuário clique duas vezes no botão.
   *
   * A janela é de 10 minutos.
   */

  const duplicateDate = new Date(Date.now() - 10 * 60 * 1000)

  const duplicateQuery = {
    email: normalizedEmail,

    phone: normalizedPhone,

    createdAt: {
      $gte: duplicateDate,
    },
  }

  if (propertyId) {
    duplicateQuery.property = propertyId
  }

  if (normalizedSourceType === LEAD_SOURCE_TYPE.BROKER_HOTSITE) {
    duplicateQuery.sourceBroker = sourceContext.sourceBroker
  }

  const existingLead = await Lead.findOne(duplicateQuery)
    .sort({
      createdAt: -1,
    })
    .lean()

  /* ----------------------------------------------------------
     SE JÁ EXISTIR
  ---------------------------------------------------------- */

  if (existingLead) {
    return {
      created: false,

      duplicate: true,

      lead: existingLead,

      message: 'Este contato já foi registrado recentemente.',
    }
  }

  /* ----------------------------------------------------------
     DADOS DO LEAD
  ---------------------------------------------------------- */

  const leadData = {
    name: normalizedName,

    email: normalizedEmail,

    phone: normalizedPhone,

    source: normalizedSource,

    sourceType: sourceContext.sourceType,

    sourceBroker: sourceContext.sourceBroker,

    sourceSite: cleanString(sourceSite),

    sourceUrl: cleanString(sourceUrl),

    landingPage: cleanString(landingPage),

    referrer: cleanString(referrer),

    campaign: safeCampaign,

    region: cleanString(region) || 'zona norte',

    status: LEAD_STATUS.NEW,

    stage: LEAD_STAGES.NEW,

    priority: normalizePriority(priority),

    score: 0,

    notes: cleanString(notes),

    property: property?._id || null,

    createdBy: createdBy || null,

    assignedTo: sourceContext.assignedTo,

    awaitingAssignment: sourceContext.awaitingAssignment,

    assignmentType: sourceContext.assignmentType,

    assignedAt: sourceContext.assignedAt,

    assignedBy: sourceContext.assignedBy,

    sessionId: cleanString(sessionId),

    visitorId: cleanString(visitorId),

    contactHistory: [],
  }

  /* ----------------------------------------------------------
     HISTÓRICO INICIAL DE DISTRIBUIÇÃO
  ---------------------------------------------------------- */

  if (sourceContext.assignedTo) {
    leadData.assignmentHistory = [
      {
        from: null,

        to: sourceContext.assignedTo,

        type: sourceContext.assignmentType,

        changedBy: null,

        reason:
          normalizedSourceType === LEAD_SOURCE_TYPE.BROKER_HOTSITE
            ? 'Lead capturado através do hotsite do corretor.'
            : 'Lead atribuído automaticamente.',

        createdAt: new Date(),
      },
    ]
  }

  /* ----------------------------------------------------------
     HISTÓRICO INICIAL DO PIPELINE
  ---------------------------------------------------------- */

  /**
   * stageHistory exige changedBy.
   *
   * Como um lead público pode ser criado sem usuário
   * autenticado, não adicionamos aqui.
   *
   * O histórico poderá ser criado pelo controller/service
   * quando houver usuário administrativo ou corretor.
   */

  /* ----------------------------------------------------------
     CRIAR
  ---------------------------------------------------------- */

  const lead = await Lead.create(leadData)

  /* ----------------------------------------------------------
     POPULATE
  ---------------------------------------------------------- */

  const populatedLead = await Lead.findById(lead._id)
    .populate('property', 'name code slug coverImage prices status purpose')
    .populate('sourceBroker', 'name email avatar')
    .populate('assignedTo', 'name email avatar')
    .lean()

  /* ----------------------------------------------------------
     RESULTADO
  ---------------------------------------------------------- */

  return {
    created: true,

    duplicate: false,

    lead: populatedLead,

    assignment: {
      assigned: !!sourceContext.assignedTo,

      assignedTo: sourceContext.assignedTo,

      awaitingAssignment: sourceContext.awaitingAssignment,

      type: sourceContext.assignmentType,
    },

    message: sourceContext.awaitingAssignment
      ? 'Lead criado e enviado para distribuição.'
      : 'Lead criado com sucesso.',
  }
}

/* ============================================================
   CAPTURAR LEAD DO SITE
============================================================ */

/**
 * Site da imobiliária.
 *
 * O admin deverá distribuir posteriormente.
 */

export async function captureSiteLead(data = {}) {
  return captureLead({
    ...data,

    source: data.source || 'site',

    sourceType: LEAD_SOURCE_TYPE.SITE,
  })
}

/* ============================================================
   CAPTURAR LEAD DO HOTSITE
============================================================ */

/**
 * Hotsite de corretor.
 *
 * O corretor deve ser determinado pelo backend/rota
 * do hotsite.
 *
 * Nunca confiar em assignedTo enviado pelo frontend.
 */

export async function captureBrokerHotsiteLead({
  brokerId,

  ...data
}) {
  if (!brokerId) {
    throw new Error('Corretor do hotsite não informado.')
  }

  return captureLead({
    ...data,

    source: data.source || 'hotsite',

    sourceType: LEAD_SOURCE_TYPE.BROKER_HOTSITE,

    sourceBroker: brokerId,
  })
}

/* ============================================================
   CAPTURAR LEAD DA PÁGINA DO IMÓVEL
============================================================ */

/**
 * Página pública do imóvel.
 *
 * O imóvel é identificado pelo backend.
 *
 * Não atribui automaticamente a um corretor.
 */

export async function capturePropertyLead({
  propertyId,

  ...data
}) {
  if (!propertyId) {
    throw new Error('Imóvel do contato não informado.')
  }

  return captureLead({
    ...data,

    propertyId,

    source: data.source || 'public',

    sourceType: LEAD_SOURCE_TYPE.PROPERTY_PAGE,
  })
}

/* ============================================================
   CAPTURAR LEAD DE PORTAL
============================================================ */

export async function capturePortalLead(data = {}) {
  return captureLead({
    ...data,

    source: data.source || 'portal',

    sourceType: LEAD_SOURCE_TYPE.PORTAL,
  })
}

/* ============================================================
   CAPTURAR LEAD META
============================================================ */

export async function captureMetaLead(data = {}) {
  return captureLead({
    ...data,

    source: data.source || 'meta',

    sourceType: LEAD_SOURCE_TYPE.META,
  })
}

/* ============================================================
   CAPTURAR LEAD MANUAL
============================================================ */

export async function captureManualLead(data = {}) {
  return captureLead({
    ...data,

    source: data.source || 'manual',

    sourceType: LEAD_SOURCE_TYPE.MANUAL,
  })
}

/* ============================================================
   ATRIBUIR LEAD AO CORRETOR
============================================================ */

/**
 * Usaremos essa função posteriormente no painel Admin.
 *
 * Fluxo:
 *
 * Lead do site
 *      ↓
 * Admin escolhe corretor
 *      ↓
 * assignLead()
 */

export async function assignLead({
  leadId,

  brokerId,

  assignedBy = null,

  reason = '',
}) {
  if (!leadId) {
    throw new Error('ID do lead não informado.')
  }

  if (!isValidObjectId(leadId)) {
    throw new Error('ID do lead inválido.')
  }

  if (!brokerId) {
    throw new Error('Corretor não informado.')
  }

  const broker = await validateBroker(brokerId)

  const lead = await Lead.findById(leadId)

  if (!lead) {
    throw new Error('Lead não encontrado.')
  }

  const previousBroker = lead.assignedTo || null

  /* ----------------------------------------------------------
     Atualizar lead
  ---------------------------------------------------------- */

  lead.assignedTo = broker._id

  lead.awaitingAssignment = false

  lead.assignmentType = 'admin'

  lead.assignedAt = new Date()

  lead.assignedBy = assignedBy || null

  /* ----------------------------------------------------------
     Histórico
  ---------------------------------------------------------- */

  if (!Array.isArray(lead.assignmentHistory)) {
    lead.assignmentHistory = []
  }

  lead.assignmentHistory.push({
    from: previousBroker,

    to: broker._id,

    type: 'admin',

    changedBy: assignedBy || null,

    reason: cleanString(reason) || 'Lead distribuído pelo administrador.',

    createdAt: new Date(),
  })

  await lead.save()

  /* ----------------------------------------------------------
     Retornar atualizado
  ---------------------------------------------------------- */

  const updatedLead = await Lead.findById(lead._id)
    .populate('property', 'name code slug coverImage prices status')
    .populate('sourceBroker', 'name email avatar')
    .populate('assignedTo', 'name email avatar')
    .lean()

  return {
    success: true,

    lead: updatedLead,

    broker,

    previousBroker,

    message: 'Lead distribuído com sucesso.',
  }
}

/* ============================================================
   REMOVER ATRIBUIÇÃO
============================================================ */

/**
 * Retorna o lead para a fila de distribuição.
 *
 * Útil quando o admin precisa redistribuir um lead.
 */

export async function unassignLead({
  leadId,

  changedBy = null,

  reason = '',
}) {
  if (!leadId) {
    throw new Error('ID do lead não informado.')
  }

  if (!isValidObjectId(leadId)) {
    throw new Error('ID do lead inválido.')
  }

  const lead = await Lead.findById(leadId)

  if (!lead) {
    throw new Error('Lead não encontrado.')
  }

  const previousBroker = lead.assignedTo || null

  lead.assignedTo = null

  lead.awaitingAssignment = true

  lead.assignmentType = 'admin'

  lead.assignedAt = null

  lead.assignedBy = null

  if (!Array.isArray(lead.assignmentHistory)) {
    lead.assignmentHistory = []
  }

  lead.assignmentHistory.push({
    from: previousBroker,

    to: null,

    type: 'admin',

    changedBy: changedBy || null,

    reason: cleanString(reason) || 'Lead retornado para distribuição.',

    createdAt: new Date(),
  })

  await lead.save()

  return {
    success: true,

    lead,

    message: 'Lead retornado para a fila de distribuição.',
  }
}

/* ============================================================
   BUSCAR LEADS AGUARDANDO DISTRIBUIÇÃO
============================================================ */

/**
 * Usaremos no Dashboard/Admin.
 */

export async function getLeadsAwaitingAssignment({
  limit = 50,

  skip = 0,
} = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100)

  const safeSkip = Math.max(Number(skip) || 0, 0)

  return Lead.find({
    awaitingAssignment: true,
  })
    .populate('property', 'name code slug coverImage prices status purpose')
    .populate('sourceBroker', 'name email avatar')
    .sort({
      createdAt: -1,
    })
    .skip(safeSkip)
    .limit(safeLimit)
    .lean()
}

/* ============================================================
   CONTAR LEADS AGUARDANDO DISTRIBUIÇÃO
============================================================ */

export async function countLeadsAwaitingAssignment() {
  return Lead.countDocuments({
    awaitingAssignment: true,
  })
}

/* ============================================================
   BUSCAR LEADS DE UM CORRETOR
============================================================ */

export async function getBrokerCapturedLeads(
  brokerId,
  {
    limit = 50,

    skip = 0,
  } = {},
) {
  if (!brokerId) {
    throw new Error('ID do corretor não informado.')
  }

  if (!isValidObjectId(brokerId)) {
    throw new Error('ID do corretor inválido.')
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100)

  const safeSkip = Math.max(Number(skip) || 0, 0)

  return Lead.find({
    sourceBroker: brokerId,
  })
    .populate('property', 'name code slug coverImage prices status')
    .populate('assignedTo', 'name email avatar')
    .sort({
      createdAt: -1,
    })
    .skip(safeSkip)
    .limit(safeLimit)
    .lean()
}

/* ============================================================
   ESTATÍSTICAS DE ORIGEM DO CORRETOR
============================================================ */

/**
 * Quantos leads foram gerados através do hotsite
 * de determinado corretor.
 */

export async function getBrokerLeadSourceStats(brokerId) {
  if (!brokerId) {
    throw new Error('ID do corretor não informado.')
  }

  if (!isValidObjectId(brokerId)) {
    throw new Error('ID do corretor inválido.')
  }

  const [total, assignedToBroker, converted, lost] = await Promise.all([
    Lead.countDocuments({
      sourceBroker: brokerId,
    }),

    Lead.countDocuments({
      sourceBroker: brokerId,

      assignedTo: brokerId,
    }),

    Lead.countDocuments({
      sourceBroker: brokerId,

      status: LEAD_STATUS.CONVERTED,
    }),

    Lead.countDocuments({
      sourceBroker: brokerId,

      status: LEAD_STATUS.LOST,
    }),
  ])

  const conversionRate =
    total > 0 ? Number(((converted / total) * 100).toFixed(2)) : 0

  return {
    total,

    assignedToBroker,

    converted,

    lost,

    conversionRate,
  }
}

/* ============================================================
   EXPORT DEFAULT
============================================================ */

export default {
  captureLead,

  captureSiteLead,

  captureBrokerHotsiteLead,

  capturePropertyLead,

  capturePortalLead,

  captureMetaLead,

  captureManualLead,

  assignLead,

  unassignLead,

  getLeadsAwaitingAssignment,

  countLeadsAwaitingAssignment,

  getBrokerCapturedLeads,

  getBrokerLeadSourceStats,
}
