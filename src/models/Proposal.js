import mongoose from 'mongoose'
import {
  PROPOSAL_STATUS,
  PROPOSAL_STATUS_LIST,
} from '../constants/proposalStatus.js'

const proposalSchema = new mongoose.Schema(
  {
    /*
    =====================================
    Lead
    =====================================
    */

    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },

    /*
    =====================================
    Imóvel
    =====================================
    */

    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },

    /*
    =====================================
    Corretor
    =====================================
    */

    broker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /*
    =====================================
    Valor
    =====================================
    */

    value: {
      type: Number,
      required: true,
      min: 0,
    },

    /*
    =====================================
    Desconto
    =====================================
    */

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /*
    =====================================
    Valor Final
    =====================================
    */

    finalValue: {
      type: Number,
      required: true,
      min: 0,
    },

    /*
    =====================================
    Status
    =====================================
    */

    status: {
      type: String,
      enum: PROPOSAL_STATUS_LIST,
      default: PROPOSAL_STATUS.DRAFT,
    },

    /*
    =====================================
    Observações
    =====================================
    */

    notes: {
      type: String,
      default: '',
      trim: true,
    },

    /*
    =====================================
    Datas
    =====================================
    */

    sentAt: Date,

    acceptedAt: Date,

    rejectedAt: Date,

    /*
    =====================================
    Criador
    =====================================
    */

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

proposalSchema.index({ broker: 1, status: 1 })

proposalSchema.index({ createdAt: -1 })

export default mongoose.model('Proposal', proposalSchema)
