// src/models/Message.js

import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    // ==========================================================
    // CONVERSA
    // ==========================================================

    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },

    // ==========================================================
    // REMETENTE INTERNO
    // ==========================================================
    // Obrigatório apenas para mensagens enviadas por usuários
    // do CRM.
    //
    // Para mensagens recebidas do WhatsApp:
    // sender = null
    // whatsappContact = contato externo
    // senderType = whatsapp_contact

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    // ==========================================================
    // TIPO DO REMETENTE
    // ==========================================================

    senderType: {
      type: String,
      enum: ['user', 'whatsapp_contact'],
      default: 'user',
      index: true,
    },

    // ==========================================================
    // CONTATO WHATSAPP
    // ==========================================================
    // Preenchido somente quando senderType ===
    // "whatsapp_contact".

    whatsappContact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WhatsAppContact',
      default: null,
      index: true,
    },

    // ==========================================================
    // IDENTIFICADOR DA MENSAGEM EXTERNA
    // ==========================================================
    // ID fornecido pelo WhatsApp / WA-AKG.
    //
    // Serve principalmente para impedir que o mesmo webhook
    // seja persistido duas vezes.

    externalMessageId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },

    // ==========================================================
    // DIREÇÃO DA MENSAGEM
    // ==========================================================

    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      default: 'outbound',
      index: true,
    },

    // ==========================================================
    // CONTEÚDO
    // ==========================================================

    content: {
      type: String,
      required: true,
      trim: true,
    },

    // ==========================================================
    // TIPO DA MENSAGEM
    // ==========================================================

    type: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text',
    },

    // ==========================================================
    // ANEXO
    // ==========================================================

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

    // ==========================================================
    // STATUS
    // ==========================================================

    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },

    // ==========================================================
    // USUÁRIOS QUE LERAM
    // ==========================================================

    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // ==========================================================
    // DATA DE LEITURA
    // ==========================================================

    readAt: {
      type: Date,
      default: null,
    },

    // ==========================================================
    // REPLY
    // ==========================================================

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },

    // ==========================================================
    // MENÇÕES
    // ==========================================================

    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // ==========================================================
    // SOFT DELETE
    // ==========================================================

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

// ==========================================================
// ÍNDICES
// ==========================================================

messageSchema.index({
  conversation: 1,
  createdAt: -1,
})

messageSchema.index({
  sender: 1,
  createdAt: -1,
})

messageSchema.index({
  status: 1,
})

messageSchema.index({
  mentions: 1,
})

messageSchema.index({
  whatsappContact: 1,
  createdAt: -1,
})

messageSchema.index({
  direction: 1,
  createdAt: -1,
})

// Evita duplicação de mensagens recebidas do provedor.
//
// sparse: true permite que mensagens internas,
// que não possuem externalMessageId, continuem funcionando.
messageSchema.index(
  { externalMessageId: 1 },
  {
    unique: true,
    sparse: true,
  },
)

// ==========================================================
// VALIDAÇÕES
// ==========================================================

messageSchema.pre('save', function (next) {
  if (this.isModified('content') && this.content) {
    this.content = this.content.trim()
  }

  // Mensagem interna
  if (this.senderType === 'user') {
    if (!this.sender) {
      return next(new Error('Mensagem interna precisa possuir um remetente.'))
    }

    this.whatsappContact = null
  }

  // Mensagem WhatsApp recebida
  if (this.senderType === 'whatsapp_contact') {
    if (!this.whatsappContact) {
      return next(
        new Error('Mensagem WhatsApp precisa possuir um contato WhatsApp.'),
      )
    }

    this.sender = null
    this.direction = 'inbound'
  }

  next()
})

export default mongoose.model('Message', messageSchema)
