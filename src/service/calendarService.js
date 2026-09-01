import mongoose from 'mongoose'

import Visit, { VISIT_TYPES, VISIT_TYPE_LIST } from '../models/Visit.js'

import Lead from '../models/Lead.js'
import Property from '../models/Property.js'
import User from '../models/User.js'

import { VISIT_STATUS, VISIT_STATUS_LIST } from '../constants/visitStatus.js'

// ============================================================
// CONSTANTES
// ============================================================

const DEFAULT_EVENT_DURATION_MINUTES = 60

// ============================================================
// HELPERS
// ============================================================

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id)
}

const isAdminUser = (user) => {
  return user?.role === 'admin' || user?.isAdmin === true
}

const normalizeDate = (value) => {
  if (!value) return null

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

const getEndDate = (date, endDate = null) => {
  if (endDate) {
    return endDate
  }

  return new Date(date.getTime() + DEFAULT_EVENT_DURATION_MINUTES * 60 * 1000)
}

const getDateRange = ({ start, end }) => {
  const startDate = normalizeDate(start)
  const endDate = normalizeDate(end)

  if (!startDate || !endDate) {
    throw new Error('Período da agenda inválido.')
  }

  if (startDate >= endDate) {
    throw new Error('A data inicial deve ser anterior à data final.')
  }

  return {
    startDate,
    endDate,
  }
}

const normalizePagination = ({ page = 1, limit = 20 }) => {
  const parsedPage = Math.max(Number(page) || 1, 1)

  const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100)

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit,
  }
}

// ============================================================
// POPULATE
// ============================================================

const populateCalendarEvent = (query) => {
  return query
    .populate({
      path: 'lead',
      select: `
        name
        phone
        email
        region
        stage
        status
        priority
        source
        sourceType
        notes
        lastContactAt
      `,
    })

    .populate({
      path: 'property',
      select: `
        name
        code
        address
        price
        images
        coverImage
        type
        category
        purpose
        bedrooms
        bathrooms
        suites
        parkingSpaces
        location
      `,
    })

    .populate({
      path: 'broker',
      select: `
        name
        email
        phone
        avatar
        creci
        position
        role
        isAdmin
      `,
    })

    .populate({
      path: 'participants',
      select: `
        name
        email
        phone
        avatar
        creci
        position
        role
        isAdmin
      `,
    })

    .populate({
      path: 'createdBy',
      select: `
        name
        email
        phone
        avatar
        role
        isAdmin
      `,
    })
}

// ============================================================
// VALIDAR CORRETOR
// ============================================================

const validateBroker = async (brokerId) => {
  if (!brokerId || !isValidObjectId(brokerId)) {
    throw new Error('Corretor inválido.')
  }

  const broker = await User.findOne({
    _id: brokerId,
    isBroker: true,
  }).select(`
    _id
    name
    email
    phone
    avatar
    creci
    position
    role
    isAdmin
  `)

  if (!broker) {
    throw new Error('Corretor não encontrado.')
  }

  return broker
}

// ============================================================
// VALIDAR LEAD
// ============================================================

const validateLead = async (leadId) => {
  if (!leadId) {
    return null
  }

  if (!isValidObjectId(leadId)) {
    throw new Error('Lead inválido.')
  }

  const lead = await Lead.findById(leadId)

  if (!lead) {
    throw new Error('Lead não encontrado.')
  }

  return lead
}

// ============================================================
// VALIDAR IMÓVEL
// ============================================================

const validateProperty = async (propertyId) => {
  if (!propertyId) {
    return null
  }

  if (!isValidObjectId(propertyId)) {
    throw new Error('Imóvel inválido.')
  }

  const property = await Property.findById(propertyId)

  if (!property) {
    throw new Error('Imóvel não encontrado.')
  }

  return property
}

// ============================================================
// VALIDAR PARTICIPANTES
// ============================================================

const validateParticipants = async (participants = []) => {
  if (!Array.isArray(participants)) {
    throw new Error('Participantes inválidos.')
  }

  const uniqueParticipants = [
    ...new Set(participants.filter(Boolean).map((id) => id.toString())),
  ]

  if (!uniqueParticipants.length) {
    return []
  }

  const invalidId = uniqueParticipants.find((id) => !isValidObjectId(id))

  if (invalidId) {
    throw new Error('Um dos participantes é inválido.')
  }

  const users = await User.find({
    _id: {
      $in: uniqueParticipants,
    },
  }).select(`
    _id
    name
    email
    phone
    avatar
    creci
    position
    role
    isAdmin
  `)

  if (users.length !== uniqueParticipants.length) {
    throw new Error('Um ou mais participantes não foram encontrados.')
  }

  return uniqueParticipants
}

// ============================================================
// VALIDAR TIPO
// ============================================================

const normalizeType = (type) => {
  if (!type) {
    return VISIT_TYPES.VISIT
  }

  if (!VISIT_TYPE_LIST.includes(type)) {
    throw new Error('Tipo de compromisso inválido.')
  }

  return type
}

// ============================================================
// VALIDAR STATUS
// ============================================================

const normalizeStatus = (status) => {
  const normalizedStatus = status || VISIT_STATUS.SCHEDULED

  if (
    VISIT_STATUS_LIST.length &&
    !VISIT_STATUS_LIST.includes(normalizedStatus)
  ) {
    throw new Error('Status do compromisso inválido.')
  }

  return normalizedStatus
}

// ============================================================
// TÍTULO PADRÃO
// ============================================================

const generateDefaultTitle = ({ type, lead, property }) => {
  const leadName = lead?.name
  const propertyName = property?.name

  switch (type) {
    case VISIT_TYPES.VISIT:
      if (propertyName) {
        return `Visita - ${propertyName}`
      }

      return leadName ? `Visita - ${leadName}` : 'Visita'

    case VISIT_TYPES.MEETING:
      return leadName ? `Reunião - ${leadName}` : 'Reunião'

    case VISIT_TYPES.CALL:
      return leadName ? `Ligação - ${leadName}` : 'Ligação'

    case VISIT_TYPES.ONLINE_MEETING:
      return leadName ? `Reunião online - ${leadName}` : 'Reunião online'

    case VISIT_TYPES.PROPOSAL:
      return leadName
        ? `Apresentação de proposta - ${leadName}`
        : 'Apresentação de proposta'

    case VISIT_TYPES.NEGOTIATION:
      return leadName ? `Negociação - ${leadName}` : 'Negociação'

    case VISIT_TYPES.INTERNAL:
      return 'Reunião interna'

    case VISIT_TYPES.OTHER:
    default:
      return 'Compromisso'
  }
}

// ============================================================
// CONFLITO DE AGENDA
// ============================================================

export const checkCalendarConflict = async ({
  broker,
  participants = [],
  date,
  endDate,
  excludeId = null,
}) => {
  const startDate = normalizeDate(date)
  const finishDate = normalizeDate(endDate)

  if (!startDate || !finishDate) {
    throw new Error('Data de início e término são obrigatórias.')
  }

  const people = [
    broker?.toString(),
    ...participants.map((id) => id.toString()),
  ].filter(Boolean)

  const uniquePeople = [...new Set(people)]

  if (!uniquePeople.length) {
    return null
  }

  const query = {
    $and: [
      // ======================================
      // ENVOLVIDOS
      // ======================================

      {
        $or: [
          {
            broker: {
              $in: uniquePeople,
            },
          },
          {
            participants: {
              $in: uniquePeople,
            },
          },
        ],
      },

      // ======================================
      // NÃO CONSIDERAR CANCELADOS
      // ======================================

      {
        status: {
          $ne: VISIT_STATUS.CANCELLED,
        },
      },

      // ======================================
      // SOBREPOSIÇÃO
      // ======================================

      {
        date: {
          $lt: finishDate,
        },
      },

      {
        $or: [
          {
            endDate: {
              $gt: startDate,
            },
          },

          // Compatibilidade com eventos antigos
          {
            endDate: null,
          },
        ],
      },
    ],
  }

  // ======================================
  // EXCLUIR EVENTO ATUAL
  // ======================================

  if (excludeId && isValidObjectId(excludeId)) {
    query._id = {
      $ne: excludeId,
    }
  }

  const conflict = await Visit.findOne(query)
    .sort({
      date: 1,
    })
    .select(
      `
      _id
      title
      type
      date
      endDate
      broker
      participants
      status
    `,
    )
    .populate({
      path: 'broker',
      select: `
        name
        email
        avatar
        position
      `,
    })

  return conflict
}

// ============================================================
// CRIAR COMPROMISSO
// ============================================================

export const createCalendarEvent = async ({ body = {}, user }) => {
  const {
    type: rawType,
    title: rawTitle,

    lead: leadId,
    broker: brokerId,
    property: propertyId,

    date: rawDate,
    endDate: rawEndDate,

    participants = [],

    status,

    location = '',
    address = '',
    meetingUrl = '',
    notes = '',

    reminder = {},
  } = body

  // ======================================
  // USUÁRIO
  // ======================================

  if (!user?._id) {
    throw new Error('Usuário não autenticado.')
  }

  const isAdmin = isAdminUser(user)

  // ======================================
  // TIPO
  // ======================================

  const type = normalizeType(rawType)

  // ======================================
  // DATA
  // ======================================

  const date = normalizeDate(rawDate)

  if (!date) {
    throw new Error('Data e hora do compromisso são obrigatórias.')
  }

  const requestedEndDate = normalizeDate(rawEndDate)

  const endDate = getEndDate(date, requestedEndDate)

  if (endDate <= date) {
    throw new Error('A data de término deve ser posterior à data de início.')
  }

  // ======================================
  // CORRETOR
  // ======================================

  let broker

  if (isAdmin) {
    broker = await validateBroker(brokerId || user._id)
  } else {
    broker = await validateBroker(user._id)
  }

  // ======================================
  // LEAD
  // ======================================

  const lead = await validateLead(leadId)

  // ======================================
  // IMÓVEL
  // ======================================

  const property = await validateProperty(propertyId)

  // ======================================
  // PARTICIPANTES
  // ======================================

  let normalizedParticipants = await validateParticipants(participants)

  // Não duplicar o corretor responsável
  normalizedParticipants = normalizedParticipants.filter(
    (participantId) => participantId.toString() !== broker._id.toString(),
  )

  // ======================================
  // TÍTULO
  // ======================================

  const title =
    rawTitle?.trim() ||
    generateDefaultTitle({
      type,
      lead,
      property,
    })

  // ======================================
  // STATUS
  // ======================================

  const normalizedStatus = normalizeStatus(status)

  // ======================================
  // LEMBRETE
  // ======================================

  const normalizedReminder = {
    enabled: reminder?.enabled !== undefined ? Boolean(reminder.enabled) : true,

    minutesBefore:
      reminder?.minutesBefore !== undefined
        ? Math.max(Number(reminder.minutesBefore) || 0, 0)
        : 30,
  }

  // ======================================
  // CONFLITO
  // ======================================

  const conflict = await checkCalendarConflict({
    broker: broker._id,
    participants: normalizedParticipants,
    date,
    endDate,
  })

  if (conflict) {
    throw new Error(
      `Conflito de agenda. Já existe o compromisso "${conflict.title}" neste horário.`,
    )
  }

  // ======================================
  // CRIAR
  // ======================================

  const event = await Visit.create({
    type,
    title,

    lead: lead?._id || null,

    broker: broker._id,

    participants: normalizedParticipants,

    property: property?._id || null,

    date,
    endDate,

    status: normalizedStatus,

    location: location?.trim() || '',
    address: address?.trim() || '',
    meetingUrl: meetingUrl?.trim() || '',
    notes: notes?.trim() || '',
    reminder: normalizedReminder,

    createdBy: user._id,
  })

  // ======================================
  // ATUALIZAR PIPELINE DO LEAD
  // ======================================

  if (
    lead &&
    type === VISIT_TYPES.VISIT &&
    [
      VISIT_STATUS.SCHEDULED,
      VISIT_STATUS.CONFIRMED,
      VISIT_STATUS.RESCHEDULED,
    ].includes(normalizedStatus)
  ) {
    if (lead.stage !== 'visita_agendada') {
      lead.stage = 'visita_agendada'
      lead.lastContactAt = new Date()

      if (!Array.isArray(lead.stageHistory)) {
        lead.stageHistory = []
      }

      lead.stageHistory.push({
        stage: 'visita_agendada',
        changedBy: user._id,
        changedAt: new Date(),
      })

      await lead.save()
    }
  }

  // ======================================
  // RETORNO
  // ======================================

  return populateCalendarEvent(Visit.findById(event._id))
}

// ============================================================
// LISTAR AGENDA
// ============================================================

export const getCalendarEvents = async ({ user, query = {} }) => {
  const {
    start,
    end,
    broker,
    lead,
    property,
    type,
    status,
    search = '',
    page = 1,
    limit = 20,
    upcoming = false,
  } = query

  if (!user?._id) {
    throw new Error('Usuário não autenticado.')
  }

  const isAdmin = isAdminUser(user)

  const {
    skip,
    limit: parsedLimit,
    page: parsedPage,
  } = normalizePagination({
    page,
    limit,
  })

  const conditions = []

  // ======================================
  // PERMISSÃO
  // ======================================

  if (!isAdmin) {
    conditions.push({
      $or: [
        {
          broker: user._id,
        },
        {
          participants: user._id,
        },
      ],
    })
  } else if (broker) {
    if (!isValidObjectId(broker)) {
      throw new Error('Corretor inválido.')
    }

    conditions.push({
      $or: [
        {
          broker,
        },
        {
          participants: broker,
        },
      ],
    })
  }

  // ======================================
  // PERÍODO
  // ======================================

  if (start || end) {
    const { startDate, endDate } = getDateRange({
      start,
      end,
    })

    conditions.push({
      date: {
        $gte: startDate,
        $lt: endDate,
      },
    })
  }

  // ======================================
  // PRÓXIMOS
  // ======================================

  if (upcoming === true || upcoming === 'true') {
    conditions.push({
      date: {
        $gte: new Date(),
      },
    })
  }

  // ======================================
  // LEAD
  // ======================================

  if (lead) {
    if (!isValidObjectId(lead)) {
      throw new Error('Lead inválido.')
    }

    conditions.push({
      lead,
    })
  }

  // ======================================
  // IMÓVEL
  // ======================================

  if (property) {
    if (!isValidObjectId(property)) {
      throw new Error('Imóvel inválido.')
    }

    conditions.push({
      property,
    })
  }

  // ======================================
  // TIPO
  // ======================================

  if (type) {
    if (!VISIT_TYPE_LIST.includes(type)) {
      throw new Error('Tipo de compromisso inválido.')
    }

    conditions.push({
      type,
    })
  }

  // ======================================
  // STATUS
  // ======================================

  if (status) {
    if (VISIT_STATUS_LIST.length && !VISIT_STATUS_LIST.includes(status)) {
      throw new Error('Status inválido.')
    }

    conditions.push({
      status,
    })
  }

  // ======================================
  // BUSCA
  // ======================================

  if (search?.trim()) {
    const regex = new RegExp(
      search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i',
    )

    conditions.push({
      $or: [
        {
          title: regex,
        },
        {
          notes: regex,
        },
        {
          location: regex,
        },
        {
          address: regex,
        },
      ],
    })
  }

  // ======================================
  // FILTER
  // ======================================

  const filter =
    conditions.length > 0
      ? {
          $and: conditions,
        }
      : {}

  // ======================================
  // CONSULTA
  // ======================================

  const [events, total] = await Promise.all([
    populateCalendarEvent(
      Visit.find(filter)
        .sort({
          date: 1,
        })
        .skip(skip)
        .limit(parsedLimit),
    ),

    Visit.countDocuments(filter),
  ])

  const totalPages = Math.ceil(total / parsedLimit)

  return {
    events,

    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages,

      hasNextPage: parsedPage < totalPages,

      hasPreviousPage: parsedPage > 1,
    },
  }
}

// ============================================================
// BUSCAR POR ID
// ============================================================

export const getCalendarEventById = async ({ id, user }) => {
  if (!isValidObjectId(id)) {
    throw new Error('Compromisso inválido.')
  }

  if (!user?._id) {
    throw new Error('Usuário não autenticado.')
  }

  const event = await populateCalendarEvent(Visit.findById(id))

  if (!event) {
    throw new Error('Compromisso não encontrado.')
  }

  const isAdmin = isAdminUser(user)

  if (!isAdmin) {
    const userId = user._id.toString()

    const brokerId = event.broker?._id?.toString()

    const participantIds =
      event.participants?.map((participant) => participant._id.toString()) || []

    const hasAccess = brokerId === userId || participantIds.includes(userId)

    if (!hasAccess) {
      throw new Error('Você não possui acesso a este compromisso.')
    }
  }

  return event
}

// ============================================================
// ATUALIZAR
// ============================================================

export const updateCalendarEvent = async ({ id, body = {}, user }) => {
  if (!isValidObjectId(id)) {
    throw new Error('Compromisso inválido.')
  }

  if (!user?._id) {
    throw new Error('Usuário não autenticado.')
  }

  const event = await Visit.findById(id)

  if (!event) {
    throw new Error('Compromisso não encontrado.')
  }

  const isAdmin = isAdminUser(user)

  // ======================================
  // PERMISSÃO
  // ======================================

  if (!isAdmin) {
    const userId = user._id.toString()

    const brokerId = event.broker?.toString()

    const isParticipant = event.participants?.some(
      (participant) => participant.toString() === userId,
    )

    if (brokerId !== userId && !isParticipant) {
      throw new Error(
        'Você não possui permissão para alterar este compromisso.',
      )
    }
  }

  // ======================================
  // DATA
  // ======================================

  const newDate =
    body.date !== undefined ? normalizeDate(body.date) : event.date

  if (!newDate) {
    throw new Error('Data e hora inválidas.')
  }

  const newEndDate =
    body.endDate !== undefined
      ? normalizeDate(body.endDate)
      : event.endDate || getEndDate(newDate, null)

  if (!newEndDate || newEndDate <= newDate) {
    throw new Error('A data de término deve ser posterior à data de início.')
  }

  // ======================================
  // CORRETOR
  // ======================================

  let newBrokerId = event.broker

  if (body.broker !== undefined) {
    if (!isAdmin) {
      throw new Error(
        'Somente administradores podem alterar o corretor responsável.',
      )
    }

    const broker = await validateBroker(body.broker)

    newBrokerId = broker._id
  }

  // ======================================
  // LEAD
  // ======================================

  let newLeadId = event.lead

  if (body.lead !== undefined) {
    const lead = await validateLead(body.lead)

    newLeadId = lead?._id || null
  }

  // ======================================
  // IMÓVEL
  // ======================================

  let newPropertyId = event.property

  if (body.property !== undefined) {
    const property = await validateProperty(body.property)

    newPropertyId = property?._id || null
  }

  // ======================================
  // PARTICIPANTES
  // ======================================

  let newParticipants = event.participants || []

  if (body.participants !== undefined) {
    newParticipants = await validateParticipants(body.participants)
  }

  newParticipants = newParticipants.filter(
    (participantId) => participantId.toString() !== newBrokerId.toString(),
  )

  // ======================================
  // TIPO
  // ======================================

  let newType = event.type || VISIT_TYPES.VISIT

  if (body.type !== undefined) {
    newType = normalizeType(body.type)
  }

  // ======================================
  // TÍTULO
  // ======================================

  let newTitle = event.title

  if (body.title !== undefined) {
    newTitle = body.title?.trim()
  }

  if (!newTitle) {
    let lead = null
    let property = null

    if (newLeadId) {
      lead = await Lead.findById(newLeadId)
    }

    if (newPropertyId) {
      property = await Property.findById(newPropertyId)
    }

    newTitle = generateDefaultTitle({
      type: newType,
      lead,
      property,
    })
  }

  // ======================================
  // STATUS
  // ======================================

  if (body.status !== undefined) {
    event.status = normalizeStatus(body.status)
  }

  // ======================================
  // CONFLITO
  // ======================================

  const conflict = await checkCalendarConflict({
    broker: newBrokerId,
    participants: newParticipants,
    date: newDate,
    endDate: newEndDate,
    excludeId: event._id,
  })

  if (conflict) {
    throw new Error(
      `Conflito de agenda. Já existe o compromisso "${conflict.title}" neste horário.`,
    )
  }

  // ======================================
  // ATUALIZAÇÃO
  // ======================================

  event.type = newType

  event.title = newTitle

  event.lead = newLeadId || null

  event.broker = newBrokerId

  event.property = newPropertyId || null

  event.participants = newParticipants

  event.date = newDate

  event.endDate = newEndDate

  // ======================================
  // LOCAL
  // ======================================

  if (body.location !== undefined) {
    event.location = body.location?.trim() || ''
  }

  // ======================================
  // ENDEREÇO
  // ======================================

  if (body.address !== undefined) {
    event.address = body.address?.trim() || ''
  }

  // ======================================
  // URL
  // ======================================

  if (body.meetingUrl !== undefined) {
    event.meetingUrl = body.meetingUrl?.trim() || ''
  }

  // ======================================
  // OBSERVAÇÕES
  // ======================================

  if (body.notes !== undefined) {
    event.notes = body.notes?.trim() || ''
  }

  // ======================================
  // LEMBRETE
  // ======================================

  if (body.reminder !== undefined) {
    event.reminder = {
      enabled:
        body.reminder?.enabled !== undefined
          ? Boolean(body.reminder.enabled)
          : (event.reminder?.enabled ?? true),

      minutesBefore:
        body.reminder?.minutesBefore !== undefined
          ? Math.max(Number(body.reminder.minutesBefore) || 0, 0)
          : (event.reminder?.minutesBefore ?? 30),
    }
  }

  await event.save()

  return populateCalendarEvent(Visit.findById(event._id))
}

// ============================================================
// EXCLUIR
// ============================================================

export const deleteCalendarEvent = async ({ id, user }) => {
  if (!isValidObjectId(id)) {
    throw new Error('Compromisso inválido.')
  }

  if (!user?._id) {
    throw new Error('Usuário não autenticado.')
  }

  const event = await Visit.findById(id)

  if (!event) {
    throw new Error('Compromisso não encontrado.')
  }

  const isAdmin = isAdminUser(user)

  if (!isAdmin) {
    const userId = user._id.toString()

    const brokerId = event.broker?.toString()

    if (brokerId !== userId) {
      throw new Error(
        'Você não possui permissão para excluir este compromisso.',
      )
    }
  }

  // Não apagar realizados
  if (event.status === VISIT_STATUS.COMPLETED) {
    throw new Error('Não é possível excluir um compromisso realizado.')
  }

  await Visit.findByIdAndDelete(id)

  return {
    success: true,
    id,
  }
}

// ============================================================
// AGENDA POR PERÍODO
// ============================================================

export const getCalendarByPeriod = async ({
  user,
  start,
  end,
  broker,
  type,
  status,
}) => {
  const result = await getCalendarEvents({
    user,

    query: {
      start,
      end,
      broker,
      type,
      status,

      page: 1,
      limit: 100,
    },
  })

  return result.events
}

// ============================================================
// AGENDA DO DIA
// ============================================================

export const getCalendarByDay = async ({ user, date, broker }) => {
  const baseDate = normalizeDate(date)

  if (!baseDate) {
    throw new Error('Data inválida.')
  }

  const start = new Date(baseDate)

  start.setHours(0, 0, 0, 0)

  const end = new Date(start)

  end.setDate(end.getDate() + 1)

  return getCalendarByPeriod({
    user,
    start,
    end,
    broker,
  })
}

// ============================================================
// PRÓXIMOS COMPROMISSOS
// ============================================================

export const getUpcomingCalendarEvents = async ({ user, limit = 10 }) => {
  if (!user?._id) {
    throw new Error('Usuário não autenticado.')
  }

  const parsedLimit = Math.min(Math.max(Number(limit) || 10, 1), 50)

  const filter = {
    date: {
      $gte: new Date(),
    },

    status: {
      $nin: [VISIT_STATUS.CANCELLED, VISIT_STATUS.COMPLETED],
    },
  }

  if (!isAdminUser(user)) {
    filter.$or = [
      {
        broker: user._id,
      },
      {
        participants: user._id,
      },
    ]
  }

  return populateCalendarEvent(
    Visit.find(filter)
      .sort({
        date: 1,
      })
      .limit(parsedLimit),
  )
}

// ============================================================
// MÉTRICAS DA AGENDA
// ============================================================

export const getCalendarMetrics = async ({ user, start, end, broker }) => {
  if (!user?._id) {
    throw new Error('Usuário não autenticado.')
  }

  const conditions = []

  // ======================================
  // PERMISSÃO
  // ======================================

  if (!isAdminUser(user)) {
    conditions.push({
      $or: [
        {
          broker: user._id,
        },
        {
          participants: user._id,
        },
      ],
    })
  } else if (broker) {
    if (!isValidObjectId(broker)) {
      throw new Error('Corretor inválido.')
    }

    conditions.push({
      $or: [
        {
          broker,
        },
        {
          participants: broker,
        },
      ],
    })
  }

  // ======================================
  // PERÍODO
  // ======================================

  if (start || end) {
    const { startDate, endDate } = getDateRange({
      start,
      end,
    })

    conditions.push({
      date: {
        $gte: startDate,
        $lt: endDate,
      },
    })
  }

  const filter =
    conditions.length > 0
      ? {
          $and: conditions,
        }
      : {}

  // ======================================
  // MÉTRICAS
  // ======================================

  const [
    total,
    scheduled,
    confirmed,
    completed,
    cancelled,
    rescheduled,
    byType,
  ] = await Promise.all([
    // Total
    Visit.countDocuments(filter),

    // Agendadas
    Visit.countDocuments({
      ...filter,
      status: VISIT_STATUS.SCHEDULED,
    }),

    // Confirmadas
    Visit.countDocuments({
      ...filter,
      status: VISIT_STATUS.CONFIRMED,
    }),

    // Realizadas
    Visit.countDocuments({
      ...filter,
      status: VISIT_STATUS.COMPLETED,
    }),

    // Canceladas
    Visit.countDocuments({
      ...filter,
      status: VISIT_STATUS.CANCELLED,
    }),

    // Remarcadas
    Visit.countDocuments({
      ...filter,
      status: VISIT_STATUS.RESCHEDULED,
    }),

    // Por tipo
    Visit.aggregate([
      {
        $match: filter,
      },

      {
        $group: {
          _id: {
            $ifNull: ['$type', VISIT_TYPES.VISIT],
          },

          count: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          count: -1,
        },
      },
    ]),
  ])

  // ======================================
  // PENDENTES
  // ======================================

  const pending = scheduled + confirmed + rescheduled

  // ======================================
  // RETORNO
  // ======================================

  return {
    total,

    scheduled,

    confirmed,

    completed,

    cancelled,

    rescheduled,

    pending,

    byType: byType.map((item) => ({
      type: item._id,
      count: item.count,
    })),
  }
}

// ============================================================
// EXPORT DEFAULT
// ============================================================

export default {
  createCalendarEvent,

  getCalendarEvents,

  getCalendarEventById,

  updateCalendarEvent,

  deleteCalendarEvent,

  getCalendarByPeriod,

  getCalendarByDay,

  getUpcomingCalendarEvents,

  getCalendarMetrics,

  checkCalendarConflict,
}
