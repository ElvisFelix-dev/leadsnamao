import mongoose from 'mongoose'

import { VISIT_STATUS, VISIT_STATUS_LIST } from '../constants/visitStatus.js'

export const VISIT_TYPES = {
  VISIT: 'visit',
  MEETING: 'meeting',
  CALL: 'call',
  ONLINE_MEETING: 'online_meeting',
  PROPOSAL: 'proposal',
  NEGOTIATION: 'negotiation',
  INTERNAL: 'internal',
  OTHER: 'other',
}

export const VISIT_TYPE_LIST = Object.values(VISIT_TYPES)

const visitSchema = new mongoose.Schema(
  {
    /*
    =====================================
    Tipo do compromisso
    =====================================
    */

    type: {
      type: String,
      enum: VISIT_TYPE_LIST,
      default: VISIT_TYPES.VISIT,
      index: true,
    },

    /*
    =====================================
    Título
    =====================================
    */

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    /*
    =====================================
    Lead
    =====================================
    */

    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
    },

    /*
    =====================================
    Corretor responsável
    =====================================
    */

    broker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /*
    =====================================
    Participantes
    =====================================
    */

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    /*
    =====================================
    Imóvel
    =====================================
    */

    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      default: null,
    },

    /*
    =====================================
    Data e Hora de início
    =====================================
    */

    date: {
      type: Date,
      required: true,
    },

    /*
    =====================================
    Data e Hora de término
    =====================================
    */

    endDate: {
      type: Date,
      default: null,
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
    Local
    =====================================
    */

    location: {
      type: String,
      default: '',
      trim: true,
    },

    /*
    =====================================
    Endereço
    =====================================
    */

    address: {
      type: String,
      default: '',
      trim: true,
    },

    /*
    =====================================
    Reunião online
    =====================================
    */

    meetingUrl: {
      type: String,
      default: '',
      trim: true,
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
    Lembrete
    =====================================
    */

    reminder: {
      enabled: {
        type: Boolean,
        default: true,
      },

      minutesBefore: {
        type: Number,
        default: 30,
        min: 0,
      },
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

/*
=====================================
INDEXES
=====================================
*/

visitSchema.index({
  date: -1,
})

visitSchema.index({
  date: 1,
  endDate: 1,
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
  participants: 1,
  date: 1,
})

visitSchema.index({
  lead: 1,
})

visitSchema.index({
  property: 1,
})

visitSchema.index({
  type: 1,
  date: -1,
})

export default mongoose.model('Visit', visitSchema)
