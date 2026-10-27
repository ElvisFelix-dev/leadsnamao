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

const followUpScheduleItemSchema = new mongoose.Schema({
  step: { type: String, enum: ['D0', 'D1', 'D3', 'D5', 'D7', 'D10'], required: true },
  enabled: { type: Boolean, default: true },
  delayMinutes: { type: Number, min: 0, max: 43200, default: 0 },
  time: { type: String, default: '09:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
}, { _id: false })

const followUpSettingsSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  timezone: { type: String, default: 'America/Sao_Paulo' },
  windowStart: { type: String, default: '09:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  windowEnd: { type: String, default: '18:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  allowWeekends: { type: Boolean, default: true },
  schedule: {
    type: [followUpScheduleItemSchema],
    default: () => [
      { step: 'D0', enabled: true, delayMinutes: 5, time: '09:00' },
      { step: 'D1', enabled: true, delayMinutes: 1440, time: '09:00' },
      { step: 'D3', enabled: true, delayMinutes: 4320, time: '10:30' },
      { step: 'D5', enabled: true, delayMinutes: 7200, time: '14:00' },
      { step: 'D7', enabled: true, delayMinutes: 10080, time: '15:00' },
      { step: 'D10', enabled: true, delayMinutes: 14400, time: '16:30' },
    ],
  },
}, { _id: false })

const leadFollowUpTemplateSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'default', immutable: true },
  settings: { type: followUpSettingsSchema, default: () => ({}) },
  templates: {
    type: [followUpTemplateItemSchema],
    default: () => FOLLOW_UP_TEMPLATE_DEFAULTS,
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, versionKey: false })

export default mongoose.models.LeadFollowUpTemplate || mongoose.model('LeadFollowUpTemplate', leadFollowUpTemplateSchema)
