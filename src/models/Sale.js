import mongoose from 'mongoose'

const { Schema } = mongoose

/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

export const SALE_STATUS = {
  NEGOCIACAO: 'negociacao',
  EM_ANDAMENTO: 'em_andamento',
  DOCUMENTACAO: 'documentacao',
  CONTRATO: 'contrato',
  PAGAMENTO: 'pagamento',
  CONCLUIDA: 'concluida',
  CANCELADA: 'cancelada',
}

export const SALE_STATUS_LIST = Object.values(SALE_STATUS)

export const SALE_PAYMENT_METHOD = {
  FINANCIAMENTO: 'financiamento',
  A_VISTA: 'a_vista',
  PARCELADO: 'parcelado',
  FGTS: 'fgts',
  CONSORCIO: 'consorcio',
  MISTO: 'misto',
  OUTRO: 'outro',
}

export const SALE_PAYMENT_METHOD_LIST = Object.values(SALE_PAYMENT_METHOD)

export const SALE_TYPE = {
  VENDA: 'venda',
  LOCACAO: 'locacao',
}

export const SALE_TYPE_LIST = Object.values(SALE_TYPE)

/*
|--------------------------------------------------------------------------
| BUYER SCHEMA
|--------------------------------------------------------------------------
|
| Mantemos os dados principais do comprador dentro da venda.
| Isso evita perder o histórico caso os dados do Lead sejam alterados
| posteriormente.
|
*/

const buyerSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, 'Nome do comprador é obrigatório'],
      minlength: [2, 'Nome do comprador deve ter pelo menos 2 caracteres'],
      maxlength: [150, 'Nome do comprador deve ter no máximo 150 caracteres'],
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [150, 'E-mail deve ter no máximo 150 caracteres'],
      match: [/^\S+@\S+\.\S+$/, 'Informe um e-mail válido'],
    },

    phone: {
      type: String,
      trim: true,
      maxlength: [30, 'Telefone inválido'],
    },

    document: {
      type: String,
      trim: true,
      maxlength: [30, 'Documento inválido'],
    },

    documentType: {
      type: String,
      trim: true,
      enum: {
        values: ['cpf', 'cnpj', 'outro'],
        message: 'Tipo de documento inválido',
      },
      default: 'cpf',
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Observações devem ter no máximo 2000 caracteres'],
    },
  },
  {
    _id: false,
  },
)

/*
|--------------------------------------------------------------------------
| SELLER / OWNER SNAPSHOT
|--------------------------------------------------------------------------
|
| Futuramente podemos utilizar isso para registrar os dados do proprietário
| no momento da venda, sem depender exclusivamente do Property.
|
*/

const sellerSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 150,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 150,
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },

    document: {
      type: String,
      trim: true,
      maxlength: 30,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
  },
  {
    _id: false,
  },
)

/*
|--------------------------------------------------------------------------
| PAYMENT SCHEMA
|--------------------------------------------------------------------------
*/

const paymentSchema = new Schema(
  {
    method: {
      type: String,
      enum: {
        values: SALE_PAYMENT_METHOD_LIST,
        message: 'Forma de pagamento inválida',
      },
      default: SALE_PAYMENT_METHOD.OUTRO,
    },

    totalAmount: {
      type: Number,
      min: [0, 'Valor total do pagamento não pode ser negativo'],
      default: 0,
    },

    downPayment: {
      type: Number,
      min: [0, 'Valor da entrada não pode ser negativo'],
      default: 0,
    },

    financedAmount: {
      type: Number,
      min: [0, 'Valor financiado não pode ser negativo'],
      default: 0,
    },

    installmentAmount: {
      type: Number,
      min: [0, 'Valor da parcela não pode ser negativo'],
      default: 0,
    },

    installmentCount: {
      type: Number,
      min: [0, 'Quantidade de parcelas não pode ser negativa'],
      default: 0,
    },

    fgtsAmount: {
      type: Number,
      min: [0, 'Valor de FGTS não pode ser negativo'],
      default: 0,
    },

    consortiumAmount: {
      type: Number,
      min: [0, 'Valor do consórcio não pode ser negativo'],
      default: 0,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [3000, 'Observações devem ter no máximo 3000 caracteres'],
    },
  },
  {
    _id: false,
  },
)

/*
|--------------------------------------------------------------------------
| COMMISSION SCHEMA
|--------------------------------------------------------------------------
*/

const commissionSchema = new Schema(
  {
    percentage: {
      type: Number,
      min: [0, 'Percentual de comissão não pode ser negativo'],
      max: [100, 'Percentual de comissão não pode ser maior que 100'],
      default: 0,
    },

    totalAmount: {
      type: Number,
      min: [0, 'Valor da comissão não pode ser negativo'],
      default: 0,
    },

    brokerAmount: {
      type: Number,
      min: [0, 'Comissão do corretor não pode ser negativa'],
      default: 0,
    },

    companyAmount: {
      type: Number,
      min: [0, 'Comissão da imobiliária não pode ser negativa'],
      default: 0,
    },

    status: {
      type: String,
      enum: {
        values: ['prevista', 'parcial', 'paga', 'cancelada'],
        message: 'Status da comissão inválido',
      },
      default: 'prevista',
    },

    paidAt: {
      type: Date,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [3000, 'Observações devem ter no máximo 3000 caracteres'],
    },
  },
  {
    _id: false,
  },
)

/*
|--------------------------------------------------------------------------
| DOCUMENTATION SCHEMA
|--------------------------------------------------------------------------
*/

const documentationSchema = new Schema(
  {
    status: {
      type: String,
      enum: {
        values: ['pendente', 'em_analise', 'completa', 'aprovada', 'rejeitada'],
        message: 'Status da documentação inválido',
      },
      default: 'pendente',
    },

    requestedAt: {
      type: Date,
    },

    completedAt: {
      type: Date,
    },

    approvedAt: {
      type: Date,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [3000, 'Observações devem ter no máximo 3000 caracteres'],
    },
  },
  {
    _id: false,
  },
)

/*
|--------------------------------------------------------------------------
| CONTRACT SCHEMA
|--------------------------------------------------------------------------
*/

const contractSchema = new Schema(
  {
    status: {
      type: String,
      enum: {
        values: [
          'pendente',
          'em_elaboracao',
          'enviado',
          'assinado',
          'cancelado',
        ],
        message: 'Status do contrato inválido',
      },
      default: 'pendente',
    },

    contractNumber: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    sentAt: {
      type: Date,
    },

    signedAt: {
      type: Date,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [3000, 'Observações devem ter no máximo 3000 caracteres'],
    },
  },
  {
    _id: false,
  },
)

/*
|--------------------------------------------------------------------------
| SALE HISTORY SCHEMA
|--------------------------------------------------------------------------
*/

const saleHistorySchema = new Schema(
  {
    action: {
      type: String,
      trim: true,
      required: true,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    fromStatus: {
      type: String,
      enum: SALE_STATUS_LIST,
    },

    toStatus: {
      type: String,
      enum: SALE_STATUS_LIST,
    },

    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  },
)

/*
|--------------------------------------------------------------------------
| MAIN SALE SCHEMA
|--------------------------------------------------------------------------
*/

const saleSchema = new Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | IDENTIFICATION
    |--------------------------------------------------------------------------
    */

    code: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
    },

    type: {
      type: String,
      enum: {
        values: SALE_TYPE_LIST,
        message: 'Tipo de negociação inválido',
      },
      default: SALE_TYPE.VENDA,
      index: true,
    },

    status: {
      type: String,
      enum: {
        values: SALE_STATUS_LIST,
        message: 'Status da venda inválido',
      },
      default: SALE_STATUS.NEGOCIACAO,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | RELATIONSHIPS
    |--------------------------------------------------------------------------
    */

    lead: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      index: true,
    },

    proposal: {
      type: Schema.Types.ObjectId,
      ref: 'Proposal',
      index: true,
    },

    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      index: true,
    },

    broker: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | CLIENT / BUYER
    |--------------------------------------------------------------------------
    */

    buyer: {
      type: buyerSchema,
      required: true,
    },

    additionalBuyers: {
      type: [buyerSchema],
      default: [],
    },

    /*
    |--------------------------------------------------------------------------
    | SELLER
    |--------------------------------------------------------------------------
    */

    seller: {
      type: sellerSchema,
      default: undefined,
    },

    /*
    |--------------------------------------------------------------------------
    | PROPERTY SNAPSHOT
    |--------------------------------------------------------------------------
    |
    | Guardamos algumas informações da propriedade no momento da venda.
    | Isso é útil para preservar o histórico comercial.
    |
    */

    propertySnapshot: {
      name: {
        type: String,
        trim: true,
        maxlength: 200,
      },

      code: {
        type: String,
        trim: true,
        maxlength: 100,
      },

      type: {
        type: String,
        trim: true,
        maxlength: 100,
      },

      address: {
        type: String,
        trim: true,
        maxlength: 500,
      },
    },

    /*
    |--------------------------------------------------------------------------
    | FINANCIAL
    |--------------------------------------------------------------------------
    */

    saleValue: {
      type: Number,
      required: [true, 'Valor da venda é obrigatório'],
      min: [0, 'Valor da venda não pode ser negativo'],
      index: true,
    },

    originalValue: {
      type: Number,
      min: [0, 'Valor original não pode ser negativo'],
      default: 0,
    },

    discountAmount: {
      type: Number,
      min: [0, 'Desconto não pode ser negativo'],
      default: 0,
    },

    payment: {
      type: paymentSchema,
      default: () => ({}),
    },

    /*
    |--------------------------------------------------------------------------
    | COMMISSION
    |--------------------------------------------------------------------------
    */

    commission: {
      type: commissionSchema,
      default: () => ({}),
    },

    /*
    |--------------------------------------------------------------------------
    | DOCUMENTATION
    |--------------------------------------------------------------------------
    */

    documentation: {
      type: documentationSchema,
      default: () => ({}),
    },

    /*
    |--------------------------------------------------------------------------
    | CONTRACT
    |--------------------------------------------------------------------------
    */

    contract: {
      type: contractSchema,
      default: () => ({}),
    },

    /*
    |--------------------------------------------------------------------------
    | DATES
    |--------------------------------------------------------------------------
    */

    negotiationStartedAt: {
      type: Date,
      default: Date.now,
    },

    proposalAcceptedAt: {
      type: Date,
    },

    saleDate: {
      type: Date,
    },

    expectedClosingDate: {
      type: Date,
    },

    closedAt: {
      type: Date,
    },

    cancelledAt: {
      type: Date,
    },

    /*
    |--------------------------------------------------------------------------
    | CANCELLATION
    |--------------------------------------------------------------------------
    */

    cancellation: {
      reason: {
        type: String,
        trim: true,
        maxlength: [2000, 'Motivo do cancelamento muito longo'],
      },

      cancelledBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    },

    /*
    |--------------------------------------------------------------------------
    | NOTES
    |--------------------------------------------------------------------------
    */

    notes: {
      type: String,
      trim: true,
      maxlength: [5000, 'Observações devem ter no máximo 5000 caracteres'],
    },

    /*
    |--------------------------------------------------------------------------
    | HISTORY
    |--------------------------------------------------------------------------
    */

    history: {
      type: [saleHistorySchema],
      default: [],
    },

    /*
    |--------------------------------------------------------------------------
    | METADATA
    |--------------------------------------------------------------------------
    */

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    /*
    |--------------------------------------------------------------------------
    | SOFT DELETE
    |--------------------------------------------------------------------------
    */

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
    },

    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

/*
|--------------------------------------------------------------------------
| INDEXES
|--------------------------------------------------------------------------
*/

saleSchema.index({
  status: 1,
  createdAt: -1,
})

saleSchema.index({
  broker: 1,
  status: 1,
})

saleSchema.index({
  lead: 1,
  createdAt: -1,
})

saleSchema.index({
  property: 1,
  status: 1,
})

saleSchema.index({
  proposal: 1,
})

saleSchema.index({
  saleDate: -1,
})

saleSchema.index({
  createdAt: -1,
})

/*
|--------------------------------------------------------------------------
| VIRTUALS
|--------------------------------------------------------------------------
*/

saleSchema.virtual('isActive').get(function () {
  return (
    !this.isDeleted &&
    this.status !== SALE_STATUS.CANCELADA &&
    this.status !== SALE_STATUS.CONCLUIDA
  )
})

saleSchema.virtual('isCompleted').get(function () {
  return this.status === SALE_STATUS.CONCLUIDA
})

saleSchema.virtual('isCancelled').get(function () {
  return this.status === SALE_STATUS.CANCELADA
})

/*
|--------------------------------------------------------------------------
| INSTANCE METHODS
|--------------------------------------------------------------------------
*/

saleSchema.methods.addHistory = function ({
  action,
  description,
  fromStatus,
  toStatus,
  performedBy,
  metadata = {},
}) {
  this.history.push({
    action,
    description,
    fromStatus,
    toStatus,
    performedBy,
    metadata,
    createdAt: new Date(),
  })

  return this
}

saleSchema.methods.changeStatus = function (
  newStatus,
  performedBy,
  description = '',
) {
  if (!SALE_STATUS_LIST.includes(newStatus)) {
    throw new Error('Status da venda inválido')
  }

  const previousStatus = this.status

  this.status = newStatus

  const now = new Date()

  if (newStatus === SALE_STATUS.CONCLUIDA) {
    this.closedAt = now

    if (!this.saleDate) {
      this.saleDate = now
    }
  }

  if (newStatus === SALE_STATUS.CANCELADA) {
    this.cancelledAt = now
  }

  this.addHistory({
    action: 'status_changed',
    description:
      description || `Status alterado de ${previousStatus} para ${newStatus}`,
    fromStatus: previousStatus,
    toStatus: newStatus,
    performedBy,
  })

  return this
}

saleSchema.methods.softDelete = function (userId) {
  this.isDeleted = true
  this.deletedAt = new Date()
  this.deletedBy = userId

  this.addHistory({
    action: 'deleted',
    description: 'Venda excluída',
    performedBy: userId,
  })

  return this
}

/*
|--------------------------------------------------------------------------
| QUERY HELPERS
|--------------------------------------------------------------------------
*/

saleSchema.query.active = function () {
  return this.where({
    isDeleted: false,
  })
}

saleSchema.query.notDeleted = function () {
  return this.where({
    isDeleted: false,
  })
}

/*
|--------------------------------------------------------------------------
| JSON
|--------------------------------------------------------------------------
*/

saleSchema.set('toJSON', {
  virtuals: true,
})

saleSchema.set('toObject', {
  virtuals: true,
})

/*
|--------------------------------------------------------------------------
| MODEL
|--------------------------------------------------------------------------
*/

const Sale = mongoose.models.Sale || mongoose.model('Sale', saleSchema)

export default Sale
