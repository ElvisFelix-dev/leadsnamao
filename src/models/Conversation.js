import mongoose from 'mongoose'

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        validate: {
          validator: function (v) {
            return v !== null && v !== undefined
          },
          message: 'Participante não pode ser nulo ou indefinido',
        },
      },
    ],

    // ==========================================================
    // CANAL DA CONVERSA
    // ==========================================================

    channel: {
      type: String,
      enum: ['internal', 'whatsapp'],
      default: 'internal',
      index: true,
    },

    // ==========================================================
    // CONTATO EXTERNO DO WHATSAPP
    // ==========================================================

    whatsappContact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WhatsAppContact',
      default: null,
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
    },

    avatar: {
      type: String,
      default: '',
    },

    lastMessage: {
      type: String,
      default: '',
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
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
