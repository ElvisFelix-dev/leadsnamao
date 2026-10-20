import Lead from '../models/Lead.js'
import LeadFollowUp from '../models/LeadFollowUp.js'
import LeadFollowUpTemplate from '../models/LeadFollowUpTemplate.js'
import {
  FOLLOW_UP_TEMPLATE_DEFAULTS,
  getTemplateText,
  renderFollowUpTemplate,
} from './leadFollowUpTemplateService.js'
import WhatsAppIntegration from '../models/WhatsAppIntegration.js'

import {
  upsertWhatsAppContact,
  upsertWhatsAppConversation,
} from './whatsapp/whatsappAkgService.js'

import { normalizePhone } from '../utils/phone.js'
import { LEAD_STATUS } from '../constants/leadStatus.js'
import { LEAD_STAGES } from '../constants/leadStages.js'

// ============================================================
// CONFIGURAÇÕES
// ============================================================

const FOLLOW_UP_STEPS = [
  { step: 'D0', offsetMs: 5 * 60 * 1000 },
  { step: 'D1', offsetMs: 1 * 24 * 60 * 60 * 1000 },
  { step: 'D3', offsetMs: 3 * 24 * 60 * 60 * 1000 },
  { step: 'D5', offsetMs: 5 * 24 * 60 * 60 * 1000 },
  { step: 'D7', offsetMs: 7 * 24 * 60 * 60 * 1000 },
  { step: 'D10', offsetMs: 10 * 24 * 60 * 60 * 1000 },
]

const TERMINAL_STATUSES = [LEAD_STATUS.CONVERTED, LEAD_STATUS.LOST]

const TERMINAL_STAGES = [LEAD_STAGES.WON, LEAD_STAGES.LOST]

// ============================================================
// MENSAGENS EDITÁVEIS PELO ADMIN
// ============================================================

const buildMessage = (lead, step, templates) => {
  const template = getTemplateText(templates, step)
  return renderFollowUpTemplate(template, lead)
}

const getConfiguredTemplates = async () => {
  const config = await LeadFollowUpTemplate.findOne({ key: 'default' }).lean()
  if (!config?.templates?.length) return FOLLOW_UP_TEMPLATE_DEFAULTS

  const byStep = new Map(config.templates.map((item) => [item.step, item]))
  return FOLLOW_UP_TEMPLATE_DEFAULTS.map((fallback) => ({
    ...fallback,
    ...(byStep.get(fallback.step) || {}),
  }))
}

// ============================================================
// ELEGIBILIDADE
// ============================================================

const validateLeadEligibility = (lead) => {
  if (!lead) {
    return 'Lead não encontrado.'
  }

  if (lead.isDeleted === true) {
    return 'Lead excluído.'
  }

  if (
    TERMINAL_STATUSES.includes(lead.status) ||
    TERMINAL_STAGES.includes(lead.stage)
  ) {
    return 'Lead convertido ou perdido.'
  }

  // O estágio é o critério principal de elegibilidade.
  if (lead.stage !== LEAD_STAGES.NEW) {
    return `Estágio não elegível para follow-up: ${lead.stage || 'não informado'}.`
  }

  // A sequência só começa depois de existir um responsável.
  // Isso contempla distribuição automática e atribuição manual,
  // inclusive leads de hotsites, desde que permaneçam no estágio inicial.
  if (!lead.assignedTo) {
    return 'Lead ainda não possui corretor atribuído.'
  }

  if (lead.followUpAutomation?.status === 'replied') {
    return 'O cliente já respondeu.'
  }

  if (
    ['completed', 'cancelled', 'converted', 'lost'].includes(
      lead.followUpAutomation?.status,
    )
  ) {
    return 'A automação deste lead já foi encerrada.'
  }

  const phone = normalizePhone(lead.phoneNormalized || lead.phone)

  if (!phone) {
    return 'Lead sem telefone válido.'
  }

  return null
}

// ============================================================
// INTEGRAÇÃO WHATSAPP
// ============================================================

const getConnectedIntegration = async (integrationId = null) => {
  const query = {
    provider: 'wa-akg',
    enabled: true,
    status: 'connected',
  }

  if (integrationId) {
    query._id = integrationId
  }

  return WhatsAppIntegration.findOne(query)
    .select('_id name provider baseUrl sessionId enabled status')
    .lean()
}

// ============================================================
// CRIAR OU RECUPERAR CONVERSA
// ============================================================

const prepareConversation = async ({ lead, integration }) => {
  const phone = normalizePhone(lead.phoneNormalized || lead.phone)

  if (!phone) {
    throw new Error('Não foi possível normalizar o telefone do lead.')
  }

  const digits = String(phone).replace(/\D/g, '')

  if (!digits) {
    throw new Error('O telefone do lead é inválido.')
  }

  const integrationId = String(integration._id)
  const leadId = String(lead._id)
  const remoteJid = `${digits}@s.whatsapp.net`

  const contact = await upsertWhatsAppContact({
    integrationId,
    remoteJid,
    leadId,
    name: lead.name || '',
    isGroup: false,
    metadata: {
      source: 'leads-na-mao-follow-up',
    },
  })

  const conversation = await upsertWhatsAppConversation({
    whatsappContactId: String(contact._id),
    integrationId,
    leadId,
    assignedTo: null,
    name: lead.name || '',
  })

  return conversation
}

// ============================================================
// AGENDAR FOLLOW-UPS
// ============================================================

/**
 * Agenda D0, D1, D3, D5, D7 e D10 para um lead elegível.
 *
 * Não envia mensagens.
 *
 * @param {Object} params
 * @param {string|Object} params.leadId
 * @param {string|Object|null} [params.integrationId]
 *
 * @returns {Promise<Object>}
 */
export const scheduleLeadFollowUps = async ({
  leadId,
  integrationId = null,
} = {}) => {
  if (!leadId) {
    throw new Error('leadId é obrigatório para agendar follow-ups.')
  }

  const lead = await Lead.findById(leadId).populate('property', 'name code location')

  if (!lead) {
    return {
      success: false,
      skipped: true,
      reason: 'Lead não encontrado.',
      scheduled: 0,
    }
  }

  const eligibilityReason = validateLeadEligibility(lead)

  if (eligibilityReason) {
    return {
      success: false,
      skipped: true,
      reason: eligibilityReason,
      leadId: String(lead._id),
      scheduled: 0,
    }
  }

  // Não reutilizar uma integração aleatória sem confirmar
  // que está habilitada e conectada.
  const integration = await getConnectedIntegration(integrationId)

  if (!integration) {
    return {
      success: false,
      skipped: true,
      reason: integrationId
        ? 'A integração informada não está habilitada e conectada.'
        : 'Nenhuma integração WA-AKG habilitada e conectada foi encontrada.',
      leadId: String(lead._id),
      scheduled: 0,
    }
  }

  // Se já há uma sequência ativa, não criar outra.
  if (lead.followUpAutomation?.status === 'active') {
    const existingCount = await LeadFollowUp.countDocuments({
      lead: lead._id,
      integration: integration._id,
      status: {
        $in: ['pending', 'processing', 'simulated', 'sent'],
      },
    })

    return {
      success: true,
      skipped: true,
      reason: 'O lead já possui uma sequência de follow-up ativa.',
      leadId: String(lead._id),
      integrationId: String(integration._id),
      existingCount,
      scheduled: 0,
    }
  }

  const conversation = await prepareConversation({
    lead,
    integration,
  })

  // Os prazos começam quando a sequência é iniciada após a atribuição,
  // e não quando o lead foi originalmente criado.
  const baseDate = new Date()

  let scheduled = 0
  const templates = await getConfiguredTemplates()

  for (const item of FOLLOW_UP_STEPS) {
    const scheduledAt = new Date(baseDate.getTime() + item.offsetMs)

    const dedupeKey = `lead:${lead._id}:${item.step}`

    // $setOnInsert preserva registros já existentes, inclusive
    // os cancelados ou processados, e evita reenvio por recriação.
    const result = await LeadFollowUp.updateOne(
      { dedupeKey },
      {
        $setOnInsert: {
          lead: lead._id,
          conversation: conversation._id,
          integration: integration._id,
          step: item.step,
          scheduledAt,
          status: 'pending',
          message: buildMessage(lead, item.step, templates),
          attempts: 0,
          dedupeKey,
        },
      },
      {
        upsert: true,
        runValidators: true,
      },
    )

    if (result.upsertedCount > 0) {
      scheduled += 1
    }
  }

  // Só ativar depois que todos os registros forem processados.
  // startedAt usa a mesma base temporal do D0.
  await Lead.updateOne(
    {
      _id: lead._id,
      'followUpAutomation.status': { $ne: 'active' },
    },
    {
      $set: {
        'followUpAutomation.status': 'active',
        'followUpAutomation.startedAt': baseDate,
      },
    },
  )

  console.info('[LeadFollowUpScheduler] Sequência agendada', {
    leadId: String(lead._id),
    integrationId: String(integration._id),
    conversationId: String(conversation._id),
    scheduled,
    dryRun:
      String(process.env.LEAD_FOLLOWUPS_DRY_RUN || 'true')
        .trim()
        .toLowerCase() !== 'false',
  })

  return {
    success: true,
    skipped: false,
    leadId: String(lead._id),
    integrationId: String(integration._id),
    conversationId: String(conversation._id),
    scheduled,
    steps: FOLLOW_UP_STEPS.map(({ step, offsetMs }) => ({
      step,
      scheduledAt: new Date(baseDate.getTime() + offsetMs),
    })),
  }
}

export default {
  scheduleLeadFollowUps,
}
