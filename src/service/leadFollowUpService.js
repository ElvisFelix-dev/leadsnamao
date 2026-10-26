import mongoose from 'mongoose'

import Lead from '../models/Lead.js'
import LeadFollowUp from '../models/LeadFollowUp.js'
import WhatsAppIntegration from '../models/WhatsAppIntegration.js'

const FOLLOW_UP_TIMEZONE =
  process.env.LEAD_FOLLOWUPS_TIMEZONE || 'America/Sao_Paulo'
const WINDOW_START_MINUTES = 9 * 60
const WINDOW_END_MINUTES = 18 * 60

// Horários padrão por etapa; podem ser ajustados aqui. Todos ficam dentro
// da janela 09:00–18:00. Fins de semana são permitidos.
const FOLLOW_UP_STEPS = [
  {
    step: 'D0',
    dayOffset: 0,
    time: null, // primeira mensagem após 5 minutos, respeitando a janela
    delayMinutes: 5,
    message: (name) =>
      `Olá${name ? `, ${name}` : ''}! Tudo bem? Recebemos seu interesse e estamos aqui para ajudar. Você poderia nos contar um pouco sobre o imóvel que procura?`,
  },
  {
    step: 'D1',
    dayOffset: 1,
    time: '09:00',
    message: (name) =>
      `Olá${name ? `, ${name}` : ''}! Passando para saber se ainda podemos ajudar você com sua busca por um imóvel. Podemos conversar?`,
  },
  {
    step: 'D3',
    dayOffset: 3,
    time: '10:30',
    message: (name) =>
      `Olá${name ? `, ${name}` : ''}! Gostaríamos de entender melhor o que você procura para ajudar na sua busca por um imóvel. Ainda está procurando?`,
  },
  {
    step: 'D5',
    dayOffset: 5,
    time: '14:00',
    message: (name) =>
      `Olá${name ? `, ${name}` : ''}! Continuamos à disposição para ajudar você a encontrar um imóvel que combine com suas necessidades. Podemos ajudar em algo?`,
  },
  {
    step: 'D7',
    dayOffset: 7,
    time: '15:00',
    message: (name) =>
      `Olá${name ? `, ${name}` : ''}! Gostaríamos de saber se você ainda deseja receber ajuda na busca pelo seu imóvel. Se quiser continuar, estamos à disposição.`,
  },
  {
    step: 'D10',
    dayOffset: 10,
    time: '16:30',
    message: (name) =>
      `Olá${name ? `, ${name}` : ''}! Esta é nossa última mensagem automática de acompanhamento. Se precisar de ajuda para encontrar um imóvel, pode falar conosco quando quiser.`,
  },
]

const getZonedParts = (date, timeZone = FOLLOW_UP_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  return Object.fromEntries(parts.map(({ type, value }) => [type, value]))
}

const zonedDateTimeToUtc = (
  year,
  month,
  day,
  hour,
  minute,
  timeZone = FOLLOW_UP_TIMEZONE,
) => {
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0)
  let guess = targetAsUtc

  // Ajusta a estimativa para que a hora local corresponda à hora desejada.
  for (let i = 0; i < 3; i += 1) {
    const parts = getZonedParts(new Date(guess), timeZone)
    const representedAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    )
    guess += targetAsUtc - representedAsUtc
  }

  return new Date(guess)
}

const addCalendarDays = (year, month, day, days) => {
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

const clampToSendWindow = (date) => {
  const parts = getZonedParts(date)
  const minuteOfDay = Number(parts.hour) * 60 + Number(parts.minute)

  if (minuteOfDay < WINDOW_START_MINUTES) {
    return zonedDateTimeToUtc(
      Number(parts.year),
      Number(parts.month),
      Number(parts.day),
      9,
      0,
    )
  }

  if (minuteOfDay >= WINDOW_END_MINUTES) {
    const nextDay = addCalendarDays(
      Number(parts.year),
      Number(parts.month),
      Number(parts.day),
      1,
    )
    return zonedDateTimeToUtc(nextDay.year, nextDay.month, nextDay.day, 9, 0)
  }

  return date
}

const calculateScheduledAt = ({
  baseDate,
  stepConfig,
  previousScheduledAt,
}) => {
  let scheduledAt

  if (stepConfig.step === 'D0') {
    scheduledAt = new Date(
      baseDate.getTime() + stepConfig.delayMinutes * 60 * 1000,
    )
  } else {
    const baseParts = getZonedParts(baseDate)
    const targetDay = addCalendarDays(
      Number(baseParts.year),
      Number(baseParts.month),
      Number(baseParts.day),
      stepConfig.dayOffset,
    )
    const [hour, minute] = stepConfig.time.split(':').map(Number)
    scheduledAt = zonedDateTimeToUtc(
      targetDay.year,
      targetDay.month,
      targetDay.day,
      hour,
      minute,
    )
  }

  scheduledAt = clampToSendWindow(scheduledAt)

  // Garante que uma etapa posterior nunca fique antes da etapa anterior,
  // por exemplo quando D0 é adiado para a manhã seguinte.
  if (previousScheduledAt && scheduledAt <= previousScheduledAt) {
    scheduledAt = clampToSendWindow(
      new Date(previousScheduledAt.getTime() + 60 * 1000),
    )
  }

  return scheduledAt
}

/**
 * Resolve a integração WhatsApp com segurança.
 * Nunca escolhe arbitrariamente entre várias imobiliárias.
 */
const resolveIntegration = async (integrationId) => {
  if (integrationId) {
    if (!mongoose.Types.ObjectId.isValid(String(integrationId))) {
      throw new Error('ID da integração WhatsApp inválido.')
    }

    const integration = await WhatsAppIntegration.findOne({
      _id: integrationId,
      enabled: true,
      status: 'connected',
    })

    if (!integration) {
      throw new Error(
        'A integração WhatsApp informada não está ativa e conectada.',
      )
    }

    return integration
  }

  const integrations = await WhatsAppIntegration.find({
    enabled: true,
    status: 'connected',
  })
    .select('_id name enabled status')
    .limit(2)
    .lean()

  if (integrations.length === 0) {
    throw new Error(
      'Nenhuma integração WhatsApp ativa e conectada foi encontrada.',
    )
  }

  if (integrations.length > 1) {
    throw new Error(
      'Existem várias integrações WhatsApp conectadas. Informe integrationId para selecionar a correta.',
    )
  }

  return integrations[0]
}

/**
 * Cria os agendamentos D0, D1, D3, D5, D7 e D10.
 *
 * Não envia mensagens e não distribui o lead.
 * A chave única impede duplicações para o mesmo lead,
 * integração e etapa.
 */
export const scheduleLeadFollowUps = async ({
  leadId,
  integrationId,
  conversationId = null,
}) => {
  if (!mongoose.Types.ObjectId.isValid(String(leadId))) {
    throw new Error('ID do lead inválido para agendamento de follow-ups.')
  }

  const lead = await Lead.findById(leadId)
    .select('_id name phone createdAt status stage')
    .lean()

  if (!lead) {
    throw new Error('Lead não encontrado para agendamento de follow-ups.')
  }

  if (!lead.phone?.trim()) {
    return {
      scheduled: 0,
      skipped: true,
      reason: 'Lead sem telefone cadastrado.',
    }
  }

  const integration = await resolveIntegration(integrationId)

  const baseDate = lead.createdAt ? new Date(lead.createdAt) : new Date()

  let scheduled = 0
  let updatedPending = 0
  let alreadyExisted = 0
  let previousScheduledAt = null

  for (const stepConfig of FOLLOW_UP_STEPS) {
    const { step, message } = stepConfig
    const scheduledAt = calculateScheduledAt({
      baseDate,
      stepConfig,
      previousScheduledAt,
    })
    previousScheduledAt = scheduledAt

    const dedupeKey = `${lead._id}:${integration._id}:${step}`
    const document = {
      lead: lead._id,
      conversation: conversationId || null,
      integration: integration._id,
      step,
      scheduledAt,
      status: 'pending',
      message: message(lead.name?.trim()),
      dedupeKey,
    }

    const existing = await LeadFollowUp.findOne({ dedupeKey })
      .select('_id status scheduledAt')
      .lean()

    if (existing) {
      if (existing.status === 'pending') {
        await LeadFollowUp.updateOne(
          { _id: existing._id, status: 'pending' },
          {
            $set: {
              scheduledAt,
              message: document.message,
              conversation: document.conversation,
            },
          },
        )
        updatedPending += 1
      } else {
        // Não altera registros enviados, em processamento ou cancelados.
        alreadyExisted += 1
      }
      continue
    }

    const result = await LeadFollowUp.updateOne(
      { dedupeKey },
      { $setOnInsert: document },
      { upsert: true },
    )

    if (result.upsertedCount) scheduled += 1
    else alreadyExisted += 1
  }

  console.log('[LeadFollowUp] Agendamentos preparados:', {
    leadId: String(lead._id),
    integrationId: String(integration._id),
    created: scheduled,
    updatedPending,
    alreadyExisted,
  })

  return {
    leadId: String(lead._id),
    integrationId: String(integration._id),
    scheduled,
    updatedPending,
    alreadyExisted,
    timezone: FOLLOW_UP_TIMEZONE,
    sendWindow: '09:00-18:00',
    steps: FOLLOW_UP_STEPS.map(({ step, time }) => ({
      step,
      time: time || 'após 5 min, dentro da janela',
    })),
  }
}

export default scheduleLeadFollowUps
