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
  message: { type: String, required: true, trim: true, maxlength: 2000 },
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
