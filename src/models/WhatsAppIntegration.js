import mongoose from 'mongoose'

const whatsappIntegrationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    provider: {
      type: String,
      enum: ['wa-akg'],
      default: 'wa-akg',
      immutable: true,
    },

    baseUrl: {
      type: String,
      required: true,
      trim: true,
    },

    apiKey: {
      type: String,
      required: true,
      select: false,
    },

    sessionId: {
      type: String,
      required: true,
      trim: true,
    },

    webhookSecret: {
      type: String,
      default: '',
      select: false,
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: ['unknown', 'connected', 'disconnected', 'error'],
      default: 'unknown',
    },

    lastError: {
      type: String,
      default: '',
    },

    lastCheckedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

whatsappIntegrationSchema.index({ provider: 1, sessionId: 1 }, { unique: true })
whatsappIntegrationSchema.index({ enabled: 1 })

export default mongoose.model(
  'WhatsAppIntegration',
  whatsappIntegrationSchema,
)
