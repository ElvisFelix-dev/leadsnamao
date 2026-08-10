import mongoose from 'mongoose'
import { SALE_STATUS, SALE_STATUS_LIST } from '../constants/saleStatus.js'

import {
  PAYMENT_METHODS,
  PAYMENT_METHODS_LIST,
} from '../constants/paymentMethods.js'

const saleSchema = new mongoose.Schema(
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
    Proposta
    =====================================
    */

    proposal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proposal',
      default: null,
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
    Comissão
    =====================================
    */

    commissionPercent: {
      type: Number,
      default: 5,
    },

    commissionValue: {
      type: Number,
      default: 0,
    },

    /*
    =====================================
    Forma de pagamento
    =====================================
    */

    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS_LIST,
      default: PAYMENT_METHODS.FINANCING,
    },

    /*
    =====================================
    Status
    =====================================
    */

    status: {
      type: String,
      enum: SALE_STATUS_LIST,
      default: SALE_STATUS.PENDING,
    },

    /*
    =====================================
    Observações
    =====================================
    */

    notes: {
      type: String,
      default: '',
    },

    /*
    =====================================
    Data da venda
    =====================================
    */

    soldAt: {
      type: Date,
      default: Date.now,
    },

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

saleSchema.index({ broker: 1 })

saleSchema.index({ soldAt: -1 })

export default mongoose.model('Sale', saleSchema)
