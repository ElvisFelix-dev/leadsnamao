import mongoose from 'mongoose'

/**
 * Schema de Comissão
 *
 * Gerado a partir de uma venda concluída.
 * Mantém sincronia com Sale.commission
 */
const CommissionSchema = new mongoose.Schema(
  {
    // ==========================================
    // RELACIONAMENTOS
    // ==========================================

    /** Venda que gerou esta comissão */
    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      required: true,
      unique: true,
      index: true,
    },

    /** Lead relacionado */
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },

    /** Imóvel relacionado */
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },

    // ==========================================
    // CORRETORES
    // ==========================================

    /** Corretor vendedor */
    sellerBroker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /** Corretor captador (opcional) */
    capturerBroker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    // ==========================================
    // VALORES DA COMISSÃO (snapshot)
    // ==========================================

    /** Percentual total (ex: 5 = 5%) */
    totalPercentage: {
      type: Number,
      required: true,
      min: 0,
    },

    /** Valor total da comissão */
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    /** Distribuição */
    distribution: {
      seller: {
        percentage: { type: Number, required: true, min: 0, default: 0 },
        amount: { type: Number, required: true, min: 0, default: 0 },
      },
      capturer: {
        percentage: { type: Number, required: true, min: 0, default: 0 },
        amount: { type: Number, required: true, min: 0, default: 0 },
      },
      company: {
        percentage: { type: Number, required: true, min: 0, default: 0 },
        amount: { type: Number, required: true, min: 0, default: 0 },
      },
    },

    // ==========================================
    // STATUS
    // ==========================================

    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'cancelled'],
      default: 'pending',
      index: true,
    },

    // ==========================================
    // DATAS
    // ==========================================

    approvedAt: Date,
    paidAt: Date,
    dueDate: Date,

    // ==========================================
    // PAGAMENTO
    // ==========================================

    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'pix', 'cash', 'check', 'other'],
      default: 'bank_transfer',
    },

    paymentProof: String,

    // ==========================================
    // AUDITORIA
    // ==========================================

    notes: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true },
)

// ==========================================
// ÍNDICES
// ==========================================

CommissionSchema.index({ sellerBroker: 1, status: 1 })
CommissionSchema.index({ capturerBroker: 1, status: 1 })
CommissionSchema.index({ createdAt: 1, status: 1 })
CommissionSchema.index({ paidAt: 1, status: 1 })
CommissionSchema.index({ sale: 1 }, { unique: true })

// ==========================================
// MÉTODOS DA INSTÂNCIA
// ==========================================

// ... dentro do schema

/**
 * Aprova a comissão
 */
CommissionSchema.methods.approve = async function (userId) {
  if (this.status !== 'pending') {
    throw new Error(
      `Comissão não pode ser aprovada (status atual: ${this.status})`,
    )
  }

  this.status = 'approved'
  this.approvedAt = new Date()
  this.approvedBy = userId

  await this.save()
  return this
}

/**
 * Marca a comissão como paga
 */
CommissionSchema.methods.markAsPaid = async function (
  userId,
  paymentMethod = 'bank_transfer',
) {
  if (this.status === 'paid') {
    throw new Error('Comissão já está paga')
  }

  if (this.status === 'cancelled') {
    throw new Error('Comissão cancelada não pode ser paga')
  }

  this.status = 'paid'
  this.paidAt = new Date()
  this.paidBy = userId
  this.paymentMethod = paymentMethod

  await this.save()
  return this
}

/**
 * Cancela a comissão
 */
CommissionSchema.methods.cancel = async function (userId, reason = '') {
  if (this.status === 'paid') {
    throw new Error('Comissão já paga não pode ser cancelada')
  }

  this.status = 'cancelled'
  if (reason) {
    this.notes = `${this.notes || ''}\nMotivo do cancelamento: ${reason}`
  }

  await this.save()
  return this
}

// ==========================================
// MÉTODOS ESTÁTICOS
// ==========================================

/**
 * Gera comissão a partir de uma venda
 */
CommissionSchema.statics.generateFromSale = async function (sale, userId) {
  // Verifica se já existe
  const existing = await this.findOne({ sale: sale._id })
  if (existing) {
    throw new Error('Comissão já gerada para esta venda')
  }

  // Extrai dados da venda
  const commissionData = sale.commission || {}

  // Cria comissão
  const commission = new this({
    sale: sale._id,
    lead: sale.lead,
    property: sale.property,
    sellerBroker: sale.sellerBroker,
    capturerBroker: sale.acquisitionBroker || null,

    totalPercentage: commissionData.totalPercentage || 0,
    totalAmount: commissionData.totalAmount || 0,

    distribution: {
      seller: {
        percentage: commissionData.seller?.percentage || 0,
        amount: commissionData.seller?.amount || 0,
      },
      capturer: {
        percentage: commissionData.acquisition?.percentage || 0,
        amount: commissionData.acquisition?.amount || 0,
      },
      company: {
        percentage: commissionData.company?.percentage || 0,
        amount: commissionData.company?.amount || 0,
      },
    },

    status: 'pending',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
    createdBy: userId,
  })

  await commission.save()
  return commission
}

/**
 * Busca comissões por corretor
 */
CommissionSchema.statics.findByBroker = function (brokerId, filters = {}) {
  const query = {
    $or: [{ sellerBroker: brokerId }, { capturerBroker: brokerId }],
    ...filters,
  }

  return this.find(query)
    .populate('sale', 'saleNumber saleAmount status saleDate')
    .populate('lead', 'name phone email')
    .populate('property', 'title code')
    .sort({ createdAt: -1 })
}

/**
 * Resumo financeiro do corretor
 */
CommissionSchema.statics.getSummaryByBroker = async function (brokerId) {
  const [pending, approved, paid] = await Promise.all([
    this.aggregate([
      {
        $match: {
          $or: [{ sellerBroker: brokerId }, { capturerBroker: brokerId }],
          status: 'pending',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$distribution.seller.amount' },
          count: { $sum: 1 },
        },
      },
    ]),
    this.aggregate([
      {
        $match: {
          $or: [{ sellerBroker: brokerId }, { capturerBroker: brokerId }],
          status: 'approved',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$distribution.seller.amount' },
          count: { $sum: 1 },
        },
      },
    ]),
    this.aggregate([
      {
        $match: {
          $or: [{ sellerBroker: brokerId }, { capturerBroker: brokerId }],
          status: 'paid',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$distribution.seller.amount' },
          count: { $sum: 1 },
        },
      },
    ]),
  ])

  return {
    pending: pending[0] || { total: 0, count: 0 },
    approved: approved[0] || { total: 0, count: 0 },
    paid: paid[0] || { total: 0, count: 0 },
  }
}

export default mongoose.model('Commission', CommissionSchema)
