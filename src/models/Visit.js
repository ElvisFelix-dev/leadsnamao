import mongoose from 'mongoose'

import { VISIT_STATUS, VISIT_STATUS_LIST } from '../constants/visitStatus.js'

const visitSchema = new mongoose.Schema(
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
    },

    /*
    =====================================
    Data e Hora
    =====================================
    */

    date: {
      type: Date,
      required: true,
    },

    /*
    =====================================
    Status
    =====================================
    */

    status: {
      type: String,
      enum: VISIT_STATUS_LIST,
      default: VISIT_STATUS.SCHEDULED,
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
    Endereço da visita
    =====================================
    */

    address: {
      type: String,
      default: '',
    },

    /*
    =====================================
    Check-in
    =====================================
    */

    checkedInAt: {
      type: Date,
      default: null,
    },

    /*
    =====================================
    Finalização
    =====================================
    */

    finishedAt: {
      type: Date,
      default: null,
    },

    /*
    =====================================
    Criado por
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

// ==============================
// INDEXES
// ==============================

visitSchema.index({
  date: -1,
})

visitSchema.index({
  status: 1,
  date: -1,
})

visitSchema.index({
  broker: 1,
  status: 1,
  date: -1,
})

visitSchema.index({
  broker: 1,
  date: 1,
})

visitSchema.index({
  lead: 1,
})

visitSchema.index({
  property: 1,
})

visitSchema.index({
  status: 1,
})

export default mongoose.model('Visit', visitSchema)
