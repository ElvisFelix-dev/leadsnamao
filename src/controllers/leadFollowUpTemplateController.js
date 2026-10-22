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

export const getLeadFollowUpTemplateUsage = async (req, res) => {
  try {
    const usage = await LeadFollowUp.aggregate([
      {
        $match: {
          templateVariationId: { $ne: null },
          status: { $in: ['sent', 'simulated'] },
        },
      },
      {
        $group: {
          _id: '$templateVariationId',
          step: { $first: '$step' },
          usageCount: { $sum: 1 },
          sentCount: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          simulatedCount: { $sum: { $cond: [{ $eq: ['$status', 'simulated'] }, 1, 0] } },
          lastUsedAt: { $max: '$createdAt' },
        },
      },
      { $sort: { step: 1, usageCount: -1 } },
    ])

    return res.status(200).json({ success: true, usage: usage.map((item) => ({
      variationId: String(item._id),
      step: item.step,
      usageCount: item.usageCount,
      sentCount: item.sentCount,
      simulatedCount: item.simulatedCount,
      lastUsedAt: item.lastUsedAt || null,
    })) })
  } catch (error) {
    console.error('[LeadFollowUpTemplates] Erro ao buscar histórico de uso:', error)
    return res.status(500).json({ success: false, message: 'Não foi possível carregar o histórico de uso.' })
  }
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
      const variations = Array.isArray(item.variations)
        ? item.variations.map((variation, index) => {
            if (!variation || typeof variation.message !== 'string' || !variation.message.trim()) {
              throw new Error(`A variação ${index + 1} de ${fallback.step} não pode ficar vazia.`)
            }
            if (variation.message.length > 2000) {
              throw new Error(`A variação ${index + 1} de ${fallback.step} excede 2.000 caracteres.`)
            }
            return {
              ...(variation._id ? { _id: variation._id } : {}),
              message: variation.message.trim(),
              enabled: variation.enabled !== false,
            }
          })
        : []

      normalized.push({
        step: fallback.step,
        label: fallback.label,
        enabled: item.enabled !== false,
        message: item.message.trim(),
        variations,
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
    if (error.message?.startsWith('A variação ')) {
      return res.status(400).json({ success: false, message: error.message })
    }
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
    const pending = await LeadFollowUp.find({ status: 'pending' }).select('_id lead step templateVariationId').lean()
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
      const activeVariations = (template.variations || []).filter((item) => item && item.enabled !== false && String(item.message || '').trim())
      const selectedIndex = activeVariations.findIndex((item) => String(item._id) === String(followUp.templateVariationId))
      const selectedVariation = selectedIndex >= 0 ? activeVariations[selectedIndex] : activeVariations[0] || null
      const templateText = selectedVariation?.message || template.message
      const message = renderFollowUpTemplate(templateText, lead)
      const result = await LeadFollowUp.updateOne(
        { _id: followUp._id, status: 'pending' },
        { $set: {
          message,
          templateVariationId: selectedVariation?._id || null,
          templateVariationLabel: selectedVariation ? `Variação ${selectedIndex >= 0 ? selectedIndex + 1 : 1}` : '',
        } },
      )
      updated += result.modifiedCount || 0
    }

    return res.status(200).json({ success: true, message: 'Mensagens pendentes atualizadas.', updated, skipped })
  } catch (error) {
    console.error('[LeadFollowUpTemplates] Erro ao aplicar templates:', error)
    return res.status(500).json({ success: false, message: 'Não foi possível atualizar as mensagens pendentes.' })
  }
}
