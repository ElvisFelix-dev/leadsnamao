import mongoose from 'mongoose'

const whatsappContactSchema = new mongoose.Schema(
  {
    integration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WhatsAppIntegration',
      required: true,
      index: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
      index: true,
    },

    remoteJid: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },

    name: {
      type: String,
      default: '',
      trim: true,
    },

    profilePicture: {
      type: String,
      default: '',
      trim: true,
    },

    isGroup: {
      type: Boolean,
      default: false,
    },

    lastMessageAt: {
      type: Date,
      default: null,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
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

whatsappContactSchema.index(
  {
    integration: 1,
    remoteJid: 1,
  },
  {
    unique: true,
  },
)

whatsappContactSchema.index({
  integration: 1,
  phone: 1,
})

whatsappContactSchema.index({
  lead: 1,
})

export default mongoose.model('WhatsAppContact', whatsappContactSchema)
