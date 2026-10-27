import LeadFollowUpTemplate from '../models/LeadFollowUpTemplate.js'
import Lead from '../models/Lead.js'
import LeadFollowUp from '../models/LeadFollowUp.js'
import {
  FOLLOW_UP_TEMPLATE_DEFAULTS,
  renderFollowUpTemplate,
} from '../service/leadFollowUpTemplateService.js'
import {
  DEFAULT_FOLLOW_UP_SETTINGS,
  normalizeFollowUpSettings,
  calculateFollowUpSchedule,
} from '../service/leadFollowUpAutomationConfigService.js'

const STEPS = FOLLOW_UP_TEMPLATE_DEFAULTS.map((x) => x.step)
const getConfig = async () => {
  let doc = await LeadFollowUpTemplate.findOne({ key: 'default' }).lean()
  if (!doc) {
    doc = (await LeadFollowUpTemplate.create({
      key: 'default',
      settings: DEFAULT_FOLLOW_UP_SETTINGS,
      templates: FOLLOW_UP_TEMPLATE_DEFAULTS,
    })).toObject()
  }
  const settings = normalizeFollowUpSettings(doc.settings || {})
  const templates = doc.templates?.length ? doc.templates : FOLLOW_UP_TEMPLATE_DEFAULTS
  return {
    enabled: settings.enabled,
    timezone: settings.timezone,
    windowStart: settings.windowStart,
    windowEnd: settings.windowEnd,
    allowWeekends: settings.allowWeekends,
    steps: settings.schedule.map((schedule) => {
      const template = templates.find((x) => x.step === schedule.step) || FOLLOW_UP_TEMPLATE_DEFAULTS.find((x) => x.step === schedule.step)
      return { ...schedule, label: template.label, message: template.message, variations: template.variations || [] }
    }),
    updatedAt: doc.updatedAt || null,
  }
}

export const getLeadFollowUpAutomation = async (req, res) => {
  try {
    const config = await getConfig()
    return res.status(200).json({ success: true, config, ...config })
  } catch (error) {
    console.error('[LeadFollowUpAutomation] GET:', error)
    return res.status(500).json({ success: false, message: 'Não foi possível carregar a configuração.' })
  }
}

export const saveLeadFollowUpAutomation = async (req, res) => {
  try {
    const incoming = req.body?.config
    if (!incoming || !Array.isArray(incoming.steps) || incoming.steps.length !== STEPS.length) {
      return res.status(400).json({ success: false, message: 'Envie as seis etapas da automação.' })
    }
    const settings = normalizeFollowUpSettings({
      enabled: incoming.enabled === true,
      timezone: incoming.timezone || 'America/Sao_Paulo',
      windowStart: incoming.windowStart,
      windowEnd: incoming.windowEnd,
      allowWeekends: incoming.allowWeekends,
      schedule: incoming.steps.map((step) => ({
        step: step.step,
        enabled: step.enabled !== false,
        delayMinutes: Number(step.delayMinutes ?? 0),
        time: step.time,
      })),
    })
    const byStep = new Map(incoming.steps.map((x) => [x.step, x]))
    const templates = FOLLOW_UP_TEMPLATE_DEFAULTS.map((fallback) => {
      const item = byStep.get(fallback.step)
      if (!item || typeof item.message !== 'string' || !item.message.trim() || item.message.length > 2000) {
        throw new Error(`A mensagem ${fallback.step} é obrigatória e deve ter até 2.000 caracteres.`)
      }
      return {
        step: fallback.step,
        label: fallback.label,
        enabled: item.enabled !== false,
        message: item.message.trim(),
        variations: Array.isArray(item.variations) ? item.variations.map((v) => ({
          ...(v._id ? { _id: v._id } : {}),
          message: String(v.message || '').trim(),
          enabled: v.enabled !== false,
        })).filter((v) => v.message && v.message.length <= 2000) : [],
      }
    })
    const doc = await LeadFollowUpTemplate.findOneAndUpdate(
      { key: 'default' },
      { $set: { settings, templates, updatedBy: req.user?._id || req.user?.id || null }, $setOnInsert: { key: 'default' } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    )
    // Recalcula somente follow-ups ainda pendentes. Registros enviados,
    // simulados, em processamento ou cancelados nunca são alterados.
    const pending = await LeadFollowUp.find({ status: 'pending' })
      .select('_id lead step')
      .lean()
    let rescheduled = 0
    let cancelled = 0
    for (const followUp of pending) {
      const schedule = settings.schedule.find((item) => item.step === followUp.step)
      if (!schedule || !schedule.enabled) {
        const result = await LeadFollowUp.updateOne(
          { _id: followUp._id, status: 'pending' },
          { $set: { status: 'cancelled', cancelledAt: new Date(), cancelReason: 'Etapa desativada nas configurações.' } },
        )
        cancelled += result.modifiedCount || 0
        continue
      }
      // Quando a automação global está pausada, preservamos a fila pendente.
      // Ela será reprogramada ao salvar/ativar as configurações posteriormente.
      if (!settings.enabled) continue
      const lead = await Lead.findById(followUp.lead)
        .select('name property followUpAutomation')
        .populate('property', 'name code location')
        .lean()
      if (!lead) continue
      const baseDate = lead.followUpAutomation?.startedAt ? new Date(lead.followUpAutomation.startedAt) : new Date()
      const scheduledAt = calculateFollowUpSchedule(baseDate, followUp.step, settings)
      const template = templates.find((item) => item.step === followUp.step)
      if (!scheduledAt || !template || template.enabled === false) continue
      const result = await LeadFollowUp.updateOne(
        { _id: followUp._id, status: 'pending' },
        { $set: { scheduledAt, message: renderFollowUpTemplate(template.message, lead) } },
      )
      rescheduled += result.modifiedCount || 0
    }
    const config = await getConfig()
    return res.status(200).json({
      success: true,
      message: 'Configuração salva. Nenhuma mensagem foi enviada.',
      rescheduled,
      cancelled,
      config: { ...config, updatedAt: doc.updatedAt || config.updatedAt },
      updatedAt: doc.updatedAt || config.updatedAt,
    })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Configuração inválida.' })
  }
}

export const testLeadFollowUpAutomation = async (req, res) => {
  try {
    const { leadId, step = 'D0', dryRun = true } = req.body || {}
    if (dryRun !== true) {
      return res.status(400).json({ success: false, message: 'Este endpoint aceita apenas testes simulados (dryRun: true).' })
    }
    if (!leadId || !STEPS.includes(step)) {
      return res.status(400).json({ success: false, message: 'Informe o ID do lead e uma etapa válida.' })
    }
    const lead = await Lead.findById(leadId).populate('property', 'name code location').lean()
    if (!lead) return res.status(404).json({ success: false, message: 'Lead não encontrado.' })
    const config = await getConfig()
    const currentStep = config.steps.find((x) => x.step === step)
    const checks = {
      consentGranted: lead.whatsappConsent?.status === 'granted' && !lead.whatsappConsent?.revokedAt,
      notDeleted: lead.isDeleted !== true,
      notTestLead: lead.isTestLead !== true,
      notTerminal: !['converted', 'lost'].includes(lead.status) && !['won', 'lost'].includes(lead.stage),
      stepEnabled: Boolean(currentStep?.enabled),
    }
    return res.status(200).json({
      success: true, dryRun: true, sent: false, eligible: Object.values(checks).every(Boolean),
      lead: { id: String(lead._id), name: lead.name || '' }, step, checks,
      message: renderFollowUpTemplate(currentStep?.message || '', lead),
      notice: 'Prévia simulada: nenhuma mensagem foi enviada, nenhuma conversa foi criada e nenhum registro foi alterado.',
    })
  } catch (error) {
    console.error('[LeadFollowUpAutomation] TEST:', error)
    return res.status(500).json({ success: false, message: 'Não foi possível executar a simulação.' })
  }
}
