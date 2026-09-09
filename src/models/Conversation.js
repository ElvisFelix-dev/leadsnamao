// src/models/Conversation.js
import mongoose from 'mongoose'

const conversationSchema = new mongoose.Schema(
  {
    // Participantes da conversa
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

    // Tipo de conversa
    type: {
      type: String,
      enum: ['direct', 'group', 'broker_channel'],
      default: 'direct',
    },

    // Nome do grupo (se for group)
    name: {
      type: String,
      default: '',
    },

    // Avatar do grupo
    avatar: {
      type: String,
      default: '',
    },

    // Última mensagem
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

    // Contagem de mensagens não lidas por participante
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },

    // Status da conversa
    isActive: {
      type: Boolean,
      default: true,
    },

    // Para canais de corretores (todos os corretores podem ver)
    isBrokerChannel: {
      type: Boolean,
      default: false,
    },

    // Criado por
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Metadados
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
)

// Índices
conversationSchema.index({ participants: 1 })
conversationSchema.index({ participants: 1, updatedAt: -1 })
conversationSchema.index({ isBrokerChannel: 1 })
conversationSchema.index({ type: 1 })

// Virtual para ID da conversa
conversationSchema.virtual('conversationId').get(function () {
  return `conv_${this._id.toString().slice(-8)}`
})

export default mongoose.model('Conversation', conversationSchema)
