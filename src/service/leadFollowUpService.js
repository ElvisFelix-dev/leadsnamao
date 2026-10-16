import mongoose from 'mongoose'

import Lead from '../models/Lead.js'
import LeadFollowUp from '../models/LeadFollowUp.js'
import WhatsAppIntegration from '../models/WhatsAppIntegration.js'

const FOLLOW_UP_STEPS = [
  {
    step: 'D0',
    delayMinutes: 5,
    message: (name) =>
      `Olá${name ? `, ${name}` : ''}! Tudo bem? Recebemos seu interesse e estamos aqui para ajudar. Você poderia nos contar um pouco sobre o imóvel que procura?`,
  },
  {
    step: 'D1',
    delayMinutes: 24 * 60,
    message: (name) =>
      `Olá${name ? `, ${name}` : ''}! Passando para saber se ainda podemos ajudar você com sua busca por um imóvel. Podemos conversar?`,
  },
  {
    step: 'D3',
    delayMinutes: 3 * 24 * 60,
    message: (name) =>
      `Olá${name ? `, ${name}` : ''}! Gostaríamos de entender melhor o que você procura para ajudar na sua busca por um imóvel. Ainda está procurando?`,
  },
  {
    step: 'D5',
    delayMinutes: 5 * 24 * 60,
    message: (name) =>
      `Olá${name ? `, ${name}` : ''}! Continuamos à disposição para ajudar você a encontrar um imóvel que combine com suas necessidades. Podemos ajudar em algo?`,
  },
  {
    step: 'D7',
    delayMinutes: 7 * 24 * 60,
    message: (name) =>
      `Olá${name ? `, ${name}` : ''}! Gostaríamos de saber se você ainda deseja receber ajuda na busca pelo seu imóvel. Se quiser continuar, estamos à disposição.`,
  },
  {
    step: 'D10',
    delayMinutes: 10 * 24 * 60,
    message: (name) =>
      `Olá${name ? `, ${name}` : ''}! Esta é nossa última mensagem automática de acompanhamento. Se precisar de ajuda para encontrar um imóvel, pode falar conosco quando quiser.`,
  },
]

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

  const operations = FOLLOW_UP_STEPS.map(({ step, delayMinutes, message }) => {
    const scheduledAt = new Date(baseDate.getTime() + delayMinutes * 60 * 1000)

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

    return {
      updateOne: {
        filter: { dedupeKey },
        update: {
          $setOnInsert: document,
        },
        upsert: true,
      },
    }
  })

  const result = await LeadFollowUp.bulkWrite(operations, {
    ordered: false,
  })

  const scheduled = result.upsertedCount || 0

  console.log('[LeadFollowUp] Agendamentos preparados:', {
    leadId: String(lead._id),
    integrationId: String(integration._id),
    created: scheduled,
    alreadyExisted: FOLLOW_UP_STEPS.length - scheduled,
  })

  return {
    leadId: String(lead._id),
    integrationId: String(integration._id),
    scheduled,
    alreadyExisted: FOLLOW_UP_STEPS.length - scheduled,
    steps: FOLLOW_UP_STEPS.map(({ step }) => step),
  }
}

export default scheduleLeadFollowUps
