import Opportunity from '../models/Opportunity.js'
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
 * POPULATE
 * =========================================================
 */

const OPPORTUNITY_POPULATE = [
  /**
   * Lead
   */
  {
    path: 'lead',
  },

  /**
   * Imóvel
   */
  {
    path: 'property',
  },

  /**
   * Responsável atual
   */
  {
    path: 'assignedTo',
    select: 'name email phone avatar position',
  },

  /**
   * Criador
   */
  {
    path: 'createdBy',
    select: 'name email phone avatar position',
  },

  /**
   * Histórico do Pipeline
   */
  {
    path: 'stageHistory.changedBy',
    select: 'name email avatar position',
  },

  /**
   * Interações
   */
  {
    path: 'interactions.createdBy',
    select: 'name email avatar position',
  },

  /**
   * Histórico de responsáveis
   *
   * Exemplo:
   *
   * Corretor A
   *     ↓
   * Corretor B
   *
   * Alterado por Admin
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
 * para quem a criou mesmo depois de ser transferida.
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
 * REGRA CENTRAL:
 *
 * Opportunity.assignedTo
 *          ↓
 * Lead.assignedTo
 *
 * Sempre que a oportunidade possuir um Lead,
 * o responsável do Lead será sincronizado.
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
  console.log('🔄 LEAD SINCRONIZADO')
  console.log('🧲 Lead:', lead._id.toString())
  console.log('👤 Antigo responsável:', previousAssignedTo?.toString())
  console.log('👤 Novo responsável:', assignedTo.toString())
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
}) => {
  /**
   * Não registra se não houve mudança.
   */

  if (String(previousAssignedTo || '') === String(newAssignedTo || '')) {
    return false
  }

  /**
   * Segurança:
   * verifica se o schema realmente possui o campo.
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
   * Responsável:
   *
   * 1. assignedTo enviado
   * 2. usuário logado
   */

  const assignedTo = normalizeAssignedTo(data.assignedTo, userId)

  /**
   * Nunca confiamos no createdBy enviado
   * pelo frontend.
   */

  const opportunityData = {
    ...data,

    createdBy: userId,

    assignedTo,
  }

  /**
   * Criação.
   */

  const opportunity = await Opportunity.create(opportunityData)

  console.log('==============================================')
  console.log('✅ OPORTUNIDADE CRIADA')
  console.log('🎯 Opportunity:', opportunity._id.toString())
  console.log('👤 Criada por:', userId.toString())
  console.log('🧑 Responsável:', assignedTo.toString())
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

  /**
   * =======================================================
   * RESULT DEBUG
   * =======================================================
   */

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

export const getOpportunityById = async (id) => {
  return populateOpportunity(
    Opportunity.findOne({
      _id: id,
      isArchived: false,
    }),
  )
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
   * LIMPAR CAMPOS PROTEGIDOS
   * =======================================================
   *
   * Esses campos não devem ser alterados
   * através de update genérico.
   */

  const updateData = {
    ...data,
  }

  delete updateData.createdBy
  delete updateData.stageHistory
  delete updateData.interactions
  delete updateData.assignmentHistory

  /**
   * Também protegemos o _id.
   */

  delete updateData._id

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
   * VERIFICAR ALTERAÇÃO
   * =======================================================
   */

  const responsibleChanged =
    String(previousAssignedTo || '') !== String(newAssignedTo || '')

  /**
   * =======================================================
   * ALTERAÇÃO DE RESPONSÁVEL
   * =======================================================
   */

  if (responsibleChanged) {
    console.log('==============================================')
    console.log('🔄 RESPONSÁVEL DA OPORTUNIDADE ALTERADO')
    console.log('🎯 Opportunity:', opportunity._id.toString())
    console.log('👤 Antigo:', previousAssignedTo?.toString())
    console.log('👤 Novo:', newAssignedTo?.toString())
    console.log('📝 Alterado por:', userId.toString())
    console.log('==============================================')

    /**
     * Registra no histórico.
     */

    registerAssignmentHistory({
      opportunity,
      previousAssignedTo,
      newAssignedTo,
      changedBy: userId,
    })

    /**
     * Atualiza responsável.
     */

    opportunity.assignedTo = newAssignedTo
  }

  /**
   * =======================================================
   * APLICAR OUTROS CAMPOS
   * =======================================================
   */

  Object.assign(opportunity, updateData)

  /**
   * Garantia final do responsável.
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
   *
   * Se:
   *
   * Corretor A
   *    ↓
   * Corretor B
   *
   * então:
   *
   * Opportunity → B
   * Lead        → B
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
   * ACCESS
   * =======================================================
   */

  const filter = buildOpportunityAccessFilter(userId, role)

  filter._id = id

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
   * ALTERAR STAGE
   * =======================================================
   */

  opportunity.stage = newStage

  /**
   * =======================================================
   * GANHA
   * =======================================================
   */

  if (newStage === 'ganha') {
    opportunity.status = 'ganha'

    opportunity.wonAt = new Date()

    opportunity.lostAt = null

    opportunity.lostReason = ''
  } else if (newStage === 'perdida') {
    /**
     * =======================================================
     * PERDIDA
     * =======================================================
     */
    opportunity.status = 'perdida'

    opportunity.lostAt = new Date()

    opportunity.wonAt = null

    opportunity.lostReason = lostReason?.trim() || ''
  } else {
    /**
     * =======================================================
     * ABERTA
     * =======================================================
     */
    opportunity.status = 'aberta'

    opportunity.wonAt = null

    opportunity.lostAt = null

    opportunity.lostReason = ''
  }

  /**
   * =======================================================
   * HISTÓRICO DO PIPELINE
   * =======================================================
   */

  opportunity.stageHistory.push({
    from: previousStage,
    to: newStage,
    changedBy: userId,
    changedAt: new Date(),
    note: note?.trim() || '',
  })

  await opportunity.save()

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
   * INTERACTION
   * =======================================================
   */

  opportunity.interactions.push({
    type: data.type,
    description: data.description || '',
    createdBy: userId,
  })

  opportunity.lastInteractionAt = new Date()

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
