import mongoose from 'mongoose'

const leadFollowUpSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },

    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
    },

    integration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WhatsAppIntegration',
      required: true,
    },

    // Etapa da sequência: D0, D1, D3, D5, D7 ou D10.
    step: {
      type: String,
      enum: ['D0', 'D1', 'D3', 'D5', 'D7', 'D10'],
      required: true,
    },

    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        'pending',
        'processing',
        'sent',
        'cancelled',
        'failed',
        'simulated',
      ],
      default: 'pending',
      index: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    // Identifica a alternativa selecionada; registros antigos ficam sem este campo.
    templateVariationId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    templateVariationLabel: {
      type: String,
      default: '',
      trim: true,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    processingAt: {
      type: Date,
      default: null,
    },

    sentAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelReason: {
      type: String,
      default: '',
      trim: true,
    },

    lastError: {
      type: String,
      default: '',
      trim: true,
    },

    // Identifica unicamente cada etapa para impedir
    // que o mesmo follow-up seja cadastrado duas vezes.
    dedupeKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
)

leadFollowUpSchema.index({ status: 1, scheduledAt: 1 })
leadFollowUpSchema.index({ lead: 1, status: 1, step: 1 })

export default mongoose.model('LeadFollowUp', leadFollowUpSchema)
