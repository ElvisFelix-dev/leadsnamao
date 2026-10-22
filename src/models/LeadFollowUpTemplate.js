import mongoose from 'mongoose'
import { FOLLOW_UP_TEMPLATE_DEFAULTS } from '../service/leadFollowUpTemplateService.js'

const followUpTemplateItemSchema = new mongoose.Schema({
  step: {
    type: String,
    enum: ['D0', 'D1', 'D3', 'D5', 'D7', 'D10'],
    required: true,
  },
  label: { type: String, required: true, trim: true },
  enabled: { type: Boolean, default: true },
  // Mantido para compatibilidade com a configuração antiga.
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  // Alternativas opcionais para rodízio; cada item mantém ID estável.
  variations: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    enabled: { type: Boolean, default: true },
  }],
}, { _id: false })

const leadFollowUpTemplateSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'default', immutable: true },
  templates: {
    type: [followUpTemplateItemSchema],
    default: () => FOLLOW_UP_TEMPLATE_DEFAULTS,
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, versionKey: false })

export default mongoose.models.LeadFollowUpTemplate || mongoose.model('LeadFollowUpTemplate', leadFollowUpTemplateSchema)
