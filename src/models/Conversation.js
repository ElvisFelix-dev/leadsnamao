import mongoose from 'mongoose'

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    channel: {
      type: String,
      enum: ['internal', 'whatsapp'],
      default: 'internal',
      index: true,
    },

    type: {
      type: String,
      enum: ['direct', 'group', 'broker_channel'],
      default: 'direct',
    },

    name: {
      type: String,
      default: '',
      trim: true,
    },

    avatar: {
      type: String,
      default: '',
      trim: true,
    },

    lastMessage: {
      type: String,
      default: '',
    },

    lastMessageAt: {
      type: Date,
      default: null,
    },

    lastMessageFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isBrokerChannel: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ========================================================
    // WHATSAPP
    // ========================================================

    whatsappContact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WhatsAppContact',
      default: null,
      index: true,
    },

    whatsappIntegration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WhatsAppIntegration',
      default: null,
      index: true,
    },

    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
      index: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
)

conversationSchema.index({ participants: 1 })
conversationSchema.index({ participants: 1, updatedAt: -1 })
conversationSchema.index({ isBrokerChannel: 1 })
conversationSchema.index({ type: 1 })

// Índice para localizar rapidamente conversas WhatsApp
conversationSchema.index({
  channel: 1,
  whatsappContact: 1,
})

conversationSchema.virtual('conversationId').get(function () {
  return `conv_${this._id.toString().slice(-8)}`
})

export default mongoose.model('Conversation', conversationSchema)
