import Opportunity, {
  OPPORTUNITY_STAGES,
  OPPORTUNITY_STATUS,
} from '../models/Opportunity.js'

import Lead from '../models/Lead.js'

/**
 * =========================================================
 * CONFIGURAÇÕES
 * =========================================================
 */

const DEFAULT_LIMIT = 12
const MAX_LIMIT = 100

/**
 * =========================================================
 * LEAD STAGES
 * =========================================================
 *
 * O Lead possui um pipeline próprio.
 *
 * Opportunity:
 *
 * ganha
 *   ↓
 * Lead.stage = fechado
 *
 * perdida
 *   ↓
 * Lead.stage = perdido
 *
 * IMPORTANTE:
 *
 * Não usamos:
 *
 * ganho
 * ganha no Lead
 * perdido na Opportunity
 *
 * Cada módulo possui sua responsabilidade.
 */

export const LEAD_STAGES = Object.freeze({
  NEW: 'novo_lead',
  FIRST_CONTACT: 'primeiro_contato',
  QUALIFIED: 'qualificado',
  VISIT: 'visita_agendada',
  PROPOSAL: 'proposta_enviada',
  NEGOTIATION: 'negociacao',
  WON: 'fechado',
  LOST: 'perdido',
})

/**
 * =========================================================
 * OPPORTUNITY TERMINAL STAGES
 * =========================================================
 *
 * Estes valores DEVEM ser exatamente iguais
 * aos definidos em Opportunity.js.
 */

const OPPORTUNITY_TERMINAL_STAGES = Object.freeze({
  WON: OPPORTUNITY_STAGES.GANHA,
  LOST: OPPORTUNITY_STAGES.PERDIDA,
})

/**
 * =========================================================
 * OPPORTUNITY STATUS
 * =========================================================
 */

const OPPORTUNITY_OPEN_STATUS = OPPORTUNITY_STATUS.OPEN
const OPPORTUNITY_WON_STATUS = OPPORTUNITY_STATUS.WON
const OPPORTUNITY_LOST_STATUS = OPPORTUNITY_STATUS.LOST

/**
 * =========================================================
 * POPULATE
 * =========================================================
 */

const OPPORTUNITY_POPULATE = [
  /**
   * -------------------------------------------------------
   * Lead
   * -------------------------------------------------------
   */

  {
    path: 'lead',
  },

  /**
   * -------------------------------------------------------
   * Imóvel
   * -------------------------------------------------------
   */

  {
    path: 'property',
  },

  /**
   * -------------------------------------------------------
   * Responsável atual
   * -------------------------------------------------------
   */

  {
    path: 'assignedTo',
    select: 'name email phone avatar position',
  },

  /**
   * -------------------------------------------------------
   * Criador
   * -------------------------------------------------------
   */

  {
    path: 'createdBy',
    select: 'name email phone avatar position',
  },

  /**
   * -------------------------------------------------------
   * Proposta
   * -------------------------------------------------------
   */

  {
    path: 'proposal',
  },

  /**
   * -------------------------------------------------------
   * Venda
   * -------------------------------------------------------
   */

  {
    path: 'sale',
  },

  /**
   * -------------------------------------------------------
   * Histórico do Pipeline
   * -------------------------------------------------------
   */

  {
    path: 'stageHistory.changedBy',
    select: 'name email avatar position',
  },

  /**
   * -------------------------------------------------------
   * Interações
   * -------------------------------------------------------
   */

  {
    path: 'interactions.createdBy',
    select: 'name email avatar position',
  },

  /**
   * -------------------------------------------------------
   * Histórico de responsáveis
   * -------------------------------------------------------
   */

  {
    path: 'assignmentHistory.changedBy',
    select: 'name email avatar position',
  },

  {
    path: 'assignmentHistory.from',
    select: 'name email avatar position',
  },

  {
    path: 'assignmentHistory.to',
    select: 'name email avatar position',
  },
]

/**
 * =========================================================
 * POPULATE HELPER
 * =========================================================
 */

const populateOpportunity = (query) => {
  OPPORTUNITY_POPULATE.forEach((item) => {
    query.populate(item)
  })

  return query
}

/**
 * =========================================================
 * ACCESS FILTER
 * =========================================================
 *
 * ADMIN
 * ---------------------------------------------------------
 * Visualiza todas as oportunidades.
 *
 * CORRETOR
 * ---------------------------------------------------------
 * Visualiza:
 *
 * 1. Oportunidades atribuídas a ele
 * 2. Oportunidades criadas por ele
 *
 * Isso permite que uma oportunidade continue visível
 * para quem a criou mesmo depois de uma transferência.
 */

const buildOpportunityAccessFilter = (userId, role) => {
  const filter = {
    isArchived: false,
  }

  if (role !== 'admin') {
    filter.$or = [
      {
        assignedTo: userId,
      },
      {
        createdBy: userId,
      },
    ]
  }

  return filter
}

/**
 * =========================================================
 * SEARCH FILTER
 * =========================================================
 */

const mergeSearchFilter = (filter, search) => {
  if (!search?.trim()) {
    return filter
  }

  const searchRegex = {
    $regex: search.trim(),
    $options: 'i',
  }

  const searchConditions = [
    {
      title: searchRegex,
    },

    {
      description: searchRegex,
    },

    {
      notes: searchRegex,
    },

    {
      source: searchRegex,
    },
  ]

  /**
   * Se já existe $or de permissão,
   * precisamos combinar usando $and.
   */

  if (filter.$or) {
    const permissionConditions = filter.$or

    delete filter.$or

    filter.$and = [
      {
        $or: permissionConditions,
      },

      {
        $or: searchConditions,
      },
    ]

    return filter
  }

  filter.$or = searchConditions

  return filter
}

/**
 * =========================================================
 * VALIDAR STAGE
 * =========================================================
 */

const isValidOpportunityStage = (stage) => {
  return Object.values(OPPORTUNITY_STAGES).includes(stage)
}

/**
 * =========================================================
 * NORMALIZAR RESPONSÁVEL
 * =========================================================
 */

const normalizeAssignedTo = (assignedTo, userId) => {
  return assignedTo || userId
}

/**
 * =========================================================
 * SINCRONIZAR RESPONSÁVEL DO LEAD
 * =========================================================
 *
 * Opportunity.assignedTo
 *          ↓
 * Lead.assignedTo
 *
 * REGRA:
 *
 * Quando o responsável da oportunidade muda,
 * o Lead também muda.
 */

const syncLeadResponsible = async (leadId, assignedTo) => {
  if (!leadId || !assignedTo) {
    return null
  }

  const lead = await Lead.findById(leadId)

  if (!lead) {
    console.warn(
      `⚠️ Lead ${leadId} não encontrado para sincronização da oportunidade.`,
    )

    return null
  }

  /**
   * Evita update desnecessário.
   */

  if (String(lead.assignedTo || '') === String(assignedTo)) {
    return lead
  }

  const previousAssignedTo = lead.assignedTo

  lead.assignedTo = assignedTo

  await lead.save()

  console.log('==============================================')
  console.log('🔄 LEAD RESPONSÁVEL SINCRONIZADO')
  console.log('🧲 Lead:', lead._id.toString())
  console.log('👤 Antigo:', previousAssignedTo?.toString())
  console.log('👤 Novo:', assignedTo.toString())
  console.log('==============================================')

  return lead
}

/**
 * =========================================================
 * SINCRONIZAR STAGE DO LEAD
 * =========================================================
 *
 * Opportunity.ganha
 *       ↓
 * Lead.fechar
 *
 * Opportunity.perdida
 *       ↓
 * Lead.perdido
 *
 * NÃO:
 *
 * - cria Sale
 * - altera Lead.status
 * - cria Proposal
 *
 * Isso pertence aos respectivos módulos.
 */

const syncLeadStage = async ({
  leadId,
  opportunityStage,
  userId,
  note = '',
}) => {
  if (!leadId) {
    return null
  }

  /**
   * =======================================================
   * DETERMINAR STAGE DO LEAD
   * =======================================================
   */

  let newLeadStage = null

  if (opportunityStage === OPPORTUNITY_TERMINAL_STAGES.WON) {
    newLeadStage = LEAD_STAGES.WON
  }

  if (opportunityStage === OPPORTUNITY_TERMINAL_STAGES.LOST) {
    newLeadStage = LEAD_STAGES.LOST
  }

  /**
   * Não é stage terminal.
   */

  if (!newLeadStage) {
    return null
  }

  /**
   * =======================================================
   * BUSCAR LEAD
   * =======================================================
   */

  const lead = await Lead.findById(leadId)

  if (!lead) {
    console.warn(
      `⚠️ Lead ${leadId} não encontrado para sincronização do stage.`,
    )

    return null
  }

  const previousStage = lead.stage

  /**
   * Evita update desnecessário.
   */

  if (previousStage === newLeadStage) {
    return lead
  }

  /**
   * =======================================================
   * ATUALIZAR STAGE
   * =======================================================
   */

  lead.stage = newLeadStage

  /**
   * =======================================================
   * DATA DE FECHAMENTO
   * =======================================================
   *
   * Só tentamos utilizar closeDate se o schema
   * realmente possuir esse campo.
   */

  if (newLeadStage === LEAD_STAGES.WON && lead.schema?.path('closeDate')) {
    lead.closeDate = new Date()
  }

  /**
   * =======================================================
   * HISTÓRICO
   * =======================================================
   */

  if (lead.schema?.path('stageHistory')) {
    if (!Array.isArray(lead.stageHistory)) {
      lead.stageHistory = []
    }

    lead.stageHistory.push({
      from: previousStage,
      to: newLeadStage,
      changedBy: userId,
      changedAt: new Date(),
      note: note?.trim() || '',
    })
  }

  await lead.save()

  console.log('==============================================')
  console.log('🔄 LEAD STAGE SINCRONIZADO')
  console.log('🧲 Lead:', lead._id.toString())
  console.log('📌 Stage anterior:', previousStage)
  console.log('📌 Novo stage:', newLeadStage)
  console.log('🎯 Opportunity stage:', opportunityStage)
  console.log('👤 Alterado por:', userId?.toString())
  console.log('==============================================')

  return lead
}

/**
 * =========================================================
 * REGISTRAR HISTÓRICO DE RESPONSÁVEL
 * =========================================================
 */

const registerAssignmentHistory = ({
  opportunity,
  previousAssignedTo,
  newAssignedTo,
  changedBy,
  note = '',
}) => {
  /**
   * Não registra se não houve alteração.
   */

  if (String(previousAssignedTo || '') === String(newAssignedTo || '')) {
    return false
  }

  /**
   * Segurança:
   * verifica se o schema possui o campo.
   */

  const assignmentHistoryPath = opportunity.schema?.path('assignmentHistory')

  if (!assignmentHistoryPath) {
    console.warn('⚠️ OpportunitySchema não possui assignmentHistory.')

    return false
  }

  if (!Array.isArray(opportunity.assignmentHistory)) {
    opportunity.assignmentHistory = []
  }

  opportunity.assignmentHistory.push({
    from: previousAssignedTo || null,
    to: newAssignedTo || null,
    changedBy,
    changedAt: new Date(),
    note: note?.trim() || '',
  })

  return true
}

/**
 * =========================================================
 * CREATE
 * =========================================================
 */

export const createOpportunity = async (data, userId) => {
  /**
   * =======================================================
   * RESPONSÁVEL
   * =======================================================
   */

  const assignedTo = normalizeAssignedTo(data.assignedTo, userId)

  /**
   * =======================================================
   * DADOS PROTEGIDOS
   * =======================================================
   *
   * Nunca confiamos nesses campos vindos do frontend.
   */

  const opportunityData = {
    ...data,

    createdBy: userId,

    assignedTo,

    /**
     * Garantimos que uma oportunidade nova
     * comece aberta.
     */

    status: OPPORTUNITY_OPEN_STATUS,

    /**
     * Garantimos que o stage inicial seja
     * nova caso não seja informado.
     */

    stage: data.stage || OPPORTUNITY_STAGES.NOVA,
  }

  delete opportunityData._id
  delete opportunityData.stageHistory
  delete opportunityData.assignmentHistory
  delete opportunityData.interactions
  delete opportunityData.wonAt
  delete opportunityData.lostAt
  delete opportunityData.lostReason
  delete opportunityData.sale

  /**
   * =======================================================
   * CRIAÇÃO
   * =======================================================
   */

  const opportunity = await Opportunity.create(opportunityData)

  console.log('==============================================')
  console.log('✅ OPORTUNIDADE CRIADA')
  console.log('🎯 Opportunity:', opportunity._id.toString())
  console.log('👤 Criada por:', userId.toString())
  console.log('🧑 Responsável:', assignedTo.toString())
  console.log('📌 Stage:', opportunity.stage)
  console.log('📊 Status:', opportunity.status)
  console.log('==============================================')

  /**
   * =======================================================
   * SINCRONIZAR LEAD
   * =======================================================
   */

  if (opportunity.lead) {
    await syncLeadResponsible(opportunity.lead, assignedTo)
  }

  return populateOpportunity(Opportunity.findById(opportunity._id))
}

/**
 * =========================================================
 * LIST
 * =========================================================
 */

export const getOpportunities = async ({
  userId,
  role,
  page = 1,
  limit = DEFAULT_LIMIT,
  search,
  stage,
  status,
  type,
  temperature,
  priority,
  assignedTo,
  property,
  lead,
}) => {
  const safeLimit = Math.min(
    Math.max(Number(limit) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  )

  const safePage = Math.max(Number(page) || 1, 1)

  /**
   * =======================================================
   * ACCESS
   * =======================================================
   */

  const filter = buildOpportunityAccessFilter(userId, role)

  /**
   * =======================================================
   * ADMIN RESPONSIBLE FILTER
   * =======================================================
   */

  if (role === 'admin' && assignedTo) {
    filter.assignedTo = assignedTo
  }

  /**
   * =======================================================
   * FILTERS
   * =======================================================
   */

  if (stage) {
    filter.stage = stage
  }

  if (status) {
    filter.status = status
  }

  if (type) {
    filter.type = type
  }

  if (temperature) {
    filter.temperature = temperature
  }

  if (priority) {
    filter.priority = priority
  }

  if (property) {
    filter.property = property
  }

  if (lead) {
    filter.lead = lead
  }

  /**
   * =======================================================
   * SEARCH
   * =======================================================
   */

  mergeSearchFilter(filter, search)

  /**
   * =======================================================
   * DEBUG
   * =======================================================
   */

  console.log('==============================================')
  console.log('🔎 GET OPPORTUNITIES')
  console.log('👤 userId:', userId)
  console.log('👤 role:', role)
  console.log('📄 page:', safePage)
  console.log('📄 limit:', safeLimit)
  console.log('🔍 search:', search || '(vazio)')
  console.log('🎯 stage:', stage || '(todos)')
  console.log('📊 status:', status || '(todos)')
  console.log('🏷️ type:', type || '(todos)')
  console.log('🔥 temperature:', temperature || '(todas)')
  console.log('⚡ priority:', priority || '(todas)')
  console.log('🧑 assignedTo:', assignedTo || '(todos)')
  console.log('🧱 Mongo filter:', JSON.stringify(filter, null, 2))

  /**
   * =======================================================
   * PAGINATION
   * =======================================================
   */

  const skip = (safePage - 1) * safeLimit

  /**
   * =======================================================
   * QUERY
   * =======================================================
   */

  const [opportunities, total] = await Promise.all([
    populateOpportunity(
      Opportunity.find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(safeLimit),
    ),

    Opportunity.countDocuments(filter),
  ])

  console.log('📦 oportunidades encontradas:', opportunities.length)

  console.log('📊 total:', total)

  if (opportunities.length > 0) {
    console.log(
      '📝 IDs:',
      opportunities.map((item) => item._id.toString()),
    )
  }

  console.log('==============================================')

  return {
    opportunities,

    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit),
    },
  }
}

/**
 * =========================================================
 * GET BY ID
 * =========================================================
 */

export const getOpportunityById = async (id, userId = null, role = 'admin') => {
  const filter = {
    _id: id,
    isArchived: false,
  }

  /**
   * Se receber usuário,
   * aplicamos controle de acesso.
   */

  if (userId) {
    const accessFilter = buildOpportunityAccessFilter(userId, role)

    Object.assign(filter, accessFilter)
  }

  return populateOpportunity(Opportunity.findOne(filter))
}

/**
 * =========================================================
 * UPDATE
 * =========================================================
 */

export const updateOpportunity = async (id, data, userId, role) => {
  /**
   * =======================================================
   * ACCESS
   * =======================================================
   */

  const filter = buildOpportunityAccessFilter(userId, role)

  filter._id = id

  /**
   * =======================================================
   * BUSCAR OPORTUNIDADE
   * =======================================================
   */

  const opportunity = await Opportunity.findOne(filter)

  if (!opportunity) {
    return null
  }

  /**
   * =======================================================
   * RESPONSÁVEL ATUAL
   * =======================================================
   */

  const previousAssignedTo = opportunity.assignedTo

  /**
   * =======================================================
   * CAMPOS PROTEGIDOS
   * =======================================================
   */

  const updateData = {
    ...data,
  }

  delete updateData._id
  delete updateData.createdBy
  delete updateData.stageHistory
  delete updateData.interactions
  delete updateData.assignmentHistory
  delete updateData.wonAt
  delete updateData.lostAt
  delete updateData.lostReason
  delete updateData.sale

  /**
   * Stage deve ser alterado exclusivamente
   * por updateOpportunityStage().
   */

  delete updateData.stage
  delete updateData.status

  /**
   * =======================================================
   * RESPONSÁVEL
   * =======================================================
   */

  let newAssignedTo = opportunity.assignedTo

  const hasAssignedTo = Object.prototype.hasOwnProperty.call(
    updateData,
    'assignedTo',
  )

  if (hasAssignedTo) {
    newAssignedTo = updateData.assignedTo

    /**
     * Não permite responsável vazio.
     */

    if (!newAssignedTo) {
      delete updateData.assignedTo

      newAssignedTo = opportunity.assignedTo
    }
  }

  /**
   * =======================================================
   * ALTERAÇÃO DE RESPONSÁVEL
   * =======================================================
   */

  const responsibleChanged =
    String(previousAssignedTo || '') !== String(newAssignedTo || '')

  if (responsibleChanged) {
    console.log('==============================================')
    console.log('🔄 RESPONSÁVEL DA OPORTUNIDADE ALTERADO')
    console.log('🎯 Opportunity:', opportunity._id.toString())
    console.log('👤 Antigo:', previousAssignedTo?.toString())
    console.log('👤 Novo:', newAssignedTo?.toString())
    console.log('📝 Alterado por:', userId.toString())
    console.log('==============================================')

    registerAssignmentHistory({
      opportunity,
      previousAssignedTo,
      newAssignedTo,
      changedBy: userId,
      note: data.assignmentNote || '',
    })

    opportunity.assignedTo = newAssignedTo
  }

  /**
   * Campo auxiliar que não pertence
   * ao OpportunitySchema.
   */

  delete updateData.assignmentNote

  /**
   * =======================================================
   * APLICAR CAMPOS
   * =======================================================
   */

  Object.assign(opportunity, updateData)

  /**
   * Garantia final.
   */

  if (responsibleChanged) {
    opportunity.assignedTo = newAssignedTo
  }

  /**
   * =======================================================
   * SALVAR
   * =======================================================
   */

  await opportunity.save()

  /**
   * =======================================================
   * SINCRONIZAR LEAD
   * =======================================================
   */

  if (responsibleChanged && opportunity.lead) {
    await syncLeadResponsible(opportunity.lead, newAssignedTo)
  }

  /**
   * =======================================================
   * RETORNO
   * =======================================================
   */

  return populateOpportunity(Opportunity.findById(opportunity._id))
}

/**
 * =========================================================
 * ALTERAR STAGE
 * =========================================================
 *
 * RESPONSABILIDADES:
 *
 * 1. Alterar Opportunity.stage
 * 2. Atualizar Opportunity.status
 * 3. Registrar stageHistory
 * 4. Sincronizar Lead
 *
 * NÃO:
 *
 * - cria Sale
 * - cria Proposal
 * - altera Lead.status
 *
 * A Sale possui seu próprio ciclo.
 */

export const updateOpportunityStage = async (
  id,
  newStage,
  userId,
  role,
  note = '',
  lostReason = '',
) => {
  /**
   * =======================================================
   * VALIDAR STAGE
   * =======================================================
   */

  if (!isValidOpportunityStage(newStage)) {
    throw new Error(`Stage de oportunidade inválido: ${newStage}`)
  }

  /**
   * =======================================================
   * ACCESS
   * =======================================================
   */

  const filter = buildOpportunityAccessFilter(userId, role)

  filter._id = id

  /**
   * =======================================================
   * BUSCAR OPORTUNIDADE
   * =======================================================
   */

  const opportunity = await Opportunity.findOne(filter)

  if (!opportunity) {
    return null
  }

  const previousStage = opportunity.stage

  /**
   * =======================================================
   * STAGE NÃO MUDOU
   * =======================================================
   */

  if (previousStage === newStage) {
    return populateOpportunity(Opportunity.findById(opportunity._id))
  }

  /**
   * =======================================================
   * NOVO STAGE
   * =======================================================
   */

  opportunity.stage = newStage

  /**
   * =======================================================
   * GANHA
   * =======================================================
   *
   * Opportunity:
   *
   * stage  = ganha
   * status = ganha
   *
   * Lead:
   *
   * stage = fechado
   *
   * Sale:
   *
   * não criada aqui.
   */

  if (newStage === OPPORTUNITY_TERMINAL_STAGES.WON) {
    opportunity.status = OPPORTUNITY_WON_STATUS

    opportunity.wonAt = new Date()

    opportunity.lostAt = null

    opportunity.lostReason = ''

    /**
     * A probabilidade de fechamento
     * passa naturalmente para 100%.
     */

    opportunity.probability = 100
  } else if (newStage === OPPORTUNITY_TERMINAL_STAGES.LOST) {
    /**
     * =======================================================
     * PERDIDA
     * =======================================================
     */
    opportunity.status = OPPORTUNITY_LOST_STATUS

    opportunity.lostAt = new Date()

    opportunity.wonAt = null

    opportunity.lostReason = lostReason?.trim() || ''

    /**
     * O motivo de perda é importante.
     */

    if (!opportunity.lostReason) {
      console.warn('⚠️ Oportunidade marcada como perdida sem motivo.')
    }

    /**
     * Não obrigamos probability = 0
     * para preservar histórico comercial.
     */
  } else {
    /**
     * =======================================================
     * ABERTA
     * =======================================================
     */
    opportunity.status = OPPORTUNITY_OPEN_STATUS

    opportunity.wonAt = null

    opportunity.lostAt = null

    opportunity.lostReason = ''
  }

  /**
   * =======================================================
   * HISTÓRICO DO PIPELINE
   * =======================================================
   */

  if (!Array.isArray(opportunity.stageHistory)) {
    opportunity.stageHistory = []
  }

  opportunity.stageHistory.push({
    from: previousStage,
    to: newStage,
    changedBy: userId,
    changedAt: new Date(),
    note: note?.trim() || '',
  })

  /**
   * =======================================================
   * SALVAR OPPORTUNITY
   * =======================================================
   */

  await opportunity.save()

  console.log('==============================================')
  console.log('🚀 OPPORTUNITY STAGE ALTERADO')
  console.log('🎯 Opportunity:', opportunity._id.toString())
  console.log('📌 Stage anterior:', previousStage)
  console.log('📌 Novo stage:', newStage)
  console.log('📊 Status:', opportunity.status)
  console.log('👤 Alterado por:', userId?.toString())
  console.log('==============================================')

  /**
   * =======================================================
   * SINCRONIZAR LEAD
   * =======================================================
   *
   * Somente stages terminais alteram o Lead.
   */

  if (opportunity.lead) {
    await syncLeadStage({
      leadId: opportunity.lead,
      opportunityStage: newStage,
      userId,
      note,
    })
  }

  /**
   * =======================================================
   * RETORNO
   * =======================================================
   */

  return populateOpportunity(Opportunity.findById(opportunity._id))
}

/**
 * =========================================================
 * ADD INTERACTION
 * =========================================================
 */

export const addOpportunityInteraction = async (id, data, userId, role) => {
  /**
   * =======================================================
   * ACCESS
   * =======================================================
   */

  const filter = buildOpportunityAccessFilter(userId, role)

  filter._id = id

  const opportunity = await Opportunity.findOne(filter)

  if (!opportunity) {
    return null
  }

  /**
   * =======================================================
   * VALIDAR TIPO
   * =======================================================
   */

  if (!data?.type) {
    throw new Error('O tipo da interação é obrigatório.')
  }

  /**
   * =======================================================
   * INTERAÇÃO
   * =======================================================
   */

  if (!Array.isArray(opportunity.interactions)) {
    opportunity.interactions = []
  }

  opportunity.interactions.push({
    type: data.type,

    description: data.description || '',

    createdBy: userId,
  })

  opportunity.lastInteractionAt = new Date()

  /**
   * =======================================================
   * PRÓXIMA AÇÃO
   * =======================================================
   *
   * Se enviada, atualizamos também
   * a próxima ação comercial.
   */

  if (Object.prototype.hasOwnProperty.call(data, 'nextAction')) {
    opportunity.nextAction = data.nextAction || ''
  }

  if (Object.prototype.hasOwnProperty.call(data, 'nextActionAt')) {
    opportunity.nextActionAt = data.nextActionAt || null
  }

  await opportunity.save()

  return populateOpportunity(Opportunity.findById(opportunity._id))
}

/**
 * =========================================================
 * ARCHIVE
 * =========================================================
 */

export const archiveOpportunity = async (id, userId, role) => {
  const filter = buildOpportunityAccessFilter(userId, role)

  filter._id = id

  return Opportunity.findOneAndUpdate(
    filter,
    {
      isArchived: true,
    },
    {
      new: true,
      runValidators: true,
    },
  )
}

/**
 * =========================================================
 * EXPORT
 * =========================================================
 */

export default {
  createOpportunity,

  getOpportunities,

  getOpportunityById,

  updateOpportunity,

  updateOpportunityStage,

  addOpportunityInteraction,

  archiveOpportunity,
}
