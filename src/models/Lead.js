import mongoose from 'mongoose'

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Nome do interessado
    email: { type: String, required: true },
    phone: { type: String, required: true },
    source: {
      type: String,
      enum: ['manual', 'public', 'meta', 'olx', 'zap', 'csv'],
      default: 'manual',
    },

    region: {
      type: String,
      enum: [
        'central',
        'zona oeste',
        'zona leste',
        'zona sul',
        'zona norte',
        'abc',
      ],
      required: true, // pode ser opcional
    },

    // Status do lead
    status: {
      type: String,
      enum: ['novo', 'em andamento', 'convertido', 'perdido'],
      default: 'novo',
    },

    // Observações do corretor/admin
    notes: { type: String },

    // Relacionamentos
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true },
)

export default mongoose.model('Lead', leadSchema)
