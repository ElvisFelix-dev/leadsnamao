// src/models/Message.js
import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    // Conversa relacionada
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },

    // Remetente
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Conteúdo da mensagem
    content: {
      type: String,
      required: true,
      trim: true,
    },

    // Tipo de mensagem
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text',
    },

    // URL do anexo (se houver)
    attachment: {
      url: {
        type: String,
        default: '',
      },
      name: {
        type: String,
        default: '',
      },
      size: {
        type: Number,
        default: 0,
      },
      mimeType: {
        type: String,
        default: '',
      },
    },

    // Status da mensagem
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },

    // Usuários que leram a mensagem
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Data de leitura
    readAt: {
      type: Date,
      default: null,
    },

    // Mensagem respondida (reply)
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },

    // Menções (@usuário)
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

// Índices
messageSchema.index({ conversation: 1, createdAt: -1 })
messageSchema.index({ sender: 1, createdAt: -1 })
messageSchema.index({ status: 1 })
messageSchema.index({ mentions: 1 })

messageSchema.pre('save', function (next) {
  if (this.isModified('content')) {
    this.content = this.content.trim()
  }
  next()
})

export default mongoose.model('Message', messageSchema)
