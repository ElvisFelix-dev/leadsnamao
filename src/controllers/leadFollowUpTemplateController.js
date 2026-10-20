import LeadFollowUpTemplate from '../models/LeadFollowUpTemplate.js'
import LeadFollowUp from '../models/LeadFollowUp.js'
import Lead from '../models/Lead.js'
import {
  FOLLOW_UP_TEMPLATE_DEFAULTS,
  renderFollowUpTemplate,
} from '../service/leadFollowUpTemplateService.js'

const VALID_STEPS = FOLLOW_UP_TEMPLATE_DEFAULTS.map(({ step }) => step)

const getOrCreateConfig = async () => {
  let config = await LeadFollowUpTemplate.findOne({ key: 'default' }).lean()
  if (!config) {
    config = await LeadFollowUpTemplate.create({
      key: 'default',
      templates: FOLLOW_UP_TEMPLATE_DEFAULTS,
    })
    config = config.toObject()
  }
  return config
}

export const getLeadFollowUpTemplates = async (req, res) => {
  try {
    const config = await getOrCreateConfig()
    const savedByStep = new Map((config.templates || []).map((item) => [item.step, item]))
    const templates = FOLLOW_UP_TEMPLATE_DEFAULTS.map((fallback) => ({
      ...fallback,
      ...(savedByStep.get(fallback.step) || {}),
    }))
    return res.status(200).json({ success: true, templates, updatedAt: config.updatedAt || null })
  } catch (error) {
    console.error('[LeadFollowUpTemplates] Erro ao buscar templates:', error)
    return res.status(500).json({ success: false, message: 'Não foi possível carregar as mensagens.' })
  }
}

export const saveLeadFollowUpTemplates = async (req, res) => {
  try {
    const incoming = req.body?.templates
    if (!Array.isArray(incoming) || incoming.length !== VALID_STEPS.length) {
      return res.status(400).json({ success: false, message: 'Envie os seis modelos de mensagem.' })
    }

    const byStep = new Map(incoming.map((item) => [item?.step, item]))
    const normalized = []
    for (const fallback of FOLLOW_UP_TEMPLATE_DEFAULTS) {
      const item = byStep.get(fallback.step)
      if (!item || typeof item.message !== 'string' || !item.message.trim()) {
        return res.status(400).json({ success: false, message: `A mensagem ${fallback.step} não pode ficar vazia.` })
      }
      if (item.message.length > 2000) {
        return res.status(400).json({ success: false, message: `A mensagem ${fallback.step} excede 2.000 caracteres.` })
      }
      normalized.push({
        step: fallback.step,
        label: fallback.label,
        enabled: item.enabled !== false,
        message: item.message.trim(),
      })
    }

    const config = await LeadFollowUpTemplate.findOneAndUpdate(
      { key: 'default' },
      {
        $set: { templates: normalized, updatedBy: req.user?._id || req.user?.id || null },
        $setOnInsert: { key: 'default' },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    )

    return res.status(200).json({ success: true, message: 'Mensagens salvas com sucesso.', templates: config.templates, updatedAt: config.updatedAt })
  } catch (error) {
    console.error('[LeadFollowUpTemplates] Erro ao salvar templates:', error)
    return res.status(500).json({ success: false, message: 'Não foi possível salvar as mensagens.' })
  }
}

// Atualiza somente registros ainda pendentes. Não toca em mensagens enviadas,
// simuladas, em processamento ou canceladas; portanto, não cria novos envios.
export const applyTemplatesToPendingFollowUps = async (req, res) => {
  try {
    const config = await getOrCreateConfig()
    const savedByStep = new Map((config.templates || []).map((item) => [item.step, item]))
    const templateMap = new Map(FOLLOW_UP_TEMPLATE_DEFAULTS.map((fallback) => [
      fallback.step,
      { ...fallback, ...(savedByStep.get(fallback.step) || {}) },
    ]))
    const pending = await LeadFollowUp.find({ status: 'pending' }).select('_id lead step').lean()
    let updated = 0
    let skipped = 0

    for (const followUp of pending) {
      const template = templateMap.get(followUp.step)
      if (!template || template.enabled === false) {
        skipped += 1
        continue
      }
      const lead = await Lead.findById(followUp.lead)
        .select('name property')
        .populate('property', 'name code location')
        .lean()
      if (!lead) {
        skipped += 1
        continue
      }
      const message = renderFollowUpTemplate(template.message, lead)
      const result = await LeadFollowUp.updateOne(
        { _id: followUp._id, status: 'pending' },
        { $set: { message } },
      )
      updated += result.modifiedCount || 0
    }

    return res.status(200).json({ success: true, message: 'Mensagens pendentes atualizadas.', updated, skipped })
  } catch (error) {
    console.error('[LeadFollowUpTemplates] Erro ao aplicar templates:', error)
    return res.status(500).json({ success: false, message: 'Não foi possível atualizar as mensagens pendentes.' })
  }
}
