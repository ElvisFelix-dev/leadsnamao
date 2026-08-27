import mongoose from 'mongoose'

/*
|--------------------------------------------------------------------------
| STATUS DA VENDA
|--------------------------------------------------------------------------
*/

export const SALE_STATUS = Object.freeze({
  PENDING: 'pending',
  CONTRACT: 'contract',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
})

export const SALE_STATUS_LIST = Object.freeze(Object.values(SALE_STATUS))

/*
|--------------------------------------------------------------------------
| STATUS FINANCEIRO
|--------------------------------------------------------------------------
*/

export const SALE_PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
})

export const SALE_PAYMENT_STATUS_LIST = Object.freeze(
  Object.values(SALE_PAYMENT_STATUS),
)

/*
|--------------------------------------------------------------------------
| TIPOS DE COMISSÃO
|--------------------------------------------------------------------------
*/

export const COMMISSION_TYPE = Object.freeze({
  SELLER: 'seller',
  ACQUISITION: 'acquisition',
})

export const COMMISSION_TYPE_LIST = Object.freeze(
  Object.values(COMMISSION_TYPE),
)

/*
|--------------------------------------------------------------------------
| SNAPSHOT DA COMISSÃO POR CORRETOR
|--------------------------------------------------------------------------
|
| Guarda os dados da comissão exatamente como estavam
| no momento em que a venda foi criada.
|
| Isso evita que alterações futuras na regra de comissão
| modifiquem vendas antigas.
|
*/

const commissionPersonSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | CORRETOR
    |--------------------------------------------------------------------------
    */

    broker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | PERCENTUAL
    |--------------------------------------------------------------------------
    |
    | Exemplo:
    | 20 = 20%
    |
    */

    percentage: {
      type: Number,
      default: 0,
      min: 0,
    },

    /*
    |--------------------------------------------------------------------------
    | VALOR
    |--------------------------------------------------------------------------
    |
    | Exemplo:
    | R$ 8.000
    |
    */

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  },
)

/*
|--------------------------------------------------------------------------
| COMISSÃO DA VENDA
|--------------------------------------------------------------------------
*/

const commissionSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | COMISSÃO TOTAL
    |--------------------------------------------------------------------------
    |
    | Exemplo:
    |
    | Venda: R$ 800.000
    | Comissão: 5%
    |
    | totalPercentage = 5
    | totalAmount = 40.000
    |
    */

    totalPercentage: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /*
    |--------------------------------------------------------------------------
    | CORRETOR VENDEDOR
    |--------------------------------------------------------------------------
    */

    seller: {
      type: commissionPersonSchema,
      default: () => ({}),
    },

    /*
    |--------------------------------------------------------------------------
    | CORRETOR CAPTADOR
    |--------------------------------------------------------------------------
    */

    acquisition: {
      type: commissionPersonSchema,
      default: () => ({}),
    },

    /*
    |--------------------------------------------------------------------------
    | IMOBILIÁRIA
    |--------------------------------------------------------------------------
    */

    company: {
      percentage: {
        type: Number,
        default: 0,
        min: 0,
      },

      amount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
  },
  {
    _id: false,
  },
)

/*
|--------------------------------------------------------------------------
| SALE SCHEMA
|--------------------------------------------------------------------------
*/

const saleSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | IDENTIFICAÇÃO
    |--------------------------------------------------------------------------
    */

    saleNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | PROPOSTA DE ORIGEM
    |--------------------------------------------------------------------------
    |
    | Uma proposta só pode gerar uma venda.
    |
    */

    proposal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proposal',
      required: true,
      unique: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | LEAD / CLIENTE
    |--------------------------------------------------------------------------
    */

    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | IMÓVEL
    |--------------------------------------------------------------------------
    */

    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | CORRETOR VENDEDOR
    |--------------------------------------------------------------------------
    |
    | Vem da Proposal.broker
    |
    */

    sellerBroker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | CORRETOR CAPTADOR
    |--------------------------------------------------------------------------
    |
    | Vem de:
    |
    | Property.captation.broker
    |
    */

    acquisitionBroker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | VALOR DA VENDA
    |--------------------------------------------------------------------------
    */

    saleAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    /*
    |--------------------------------------------------------------------------
    | VALOR DA PROPOSTA
    |--------------------------------------------------------------------------
    |
    | Mantemos separado para preservar o histórico.
    |
    */

    proposalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    /*
    |--------------------------------------------------------------------------
    | CONDIÇÕES FINANCEIRAS
    |--------------------------------------------------------------------------
    */

    downPayment: {
      type: Number,
      default: 0,
      min: 0,
    },

    financing: {
      type: Number,
      default: 0,
      min: 0,
    },

    fgts: {
      type: Number,
      default: 0,
      min: 0,
    },

    balance: {
      type: Number,
      default: 0,
      min: 0,
    },

    /*
    |--------------------------------------------------------------------------
    | COMISSÃO
    |--------------------------------------------------------------------------
    |
    | IMPORTANTE:
    |
    | Aqui NÃO colocamos:
    |
    | totalPercentage,
    | totalAmount,
    | broker,
    | percentage,
    | amount...
    |
    | diretamente.
    |
    | O commissionSchema acima define a estrutura.
    |
    */

    commission: {
      type: commissionSchema,
      default: () => ({}),
    },

    /*
    |--------------------------------------------------------------------------
    | STATUS DA VENDA
    |--------------------------------------------------------------------------
    */

    status: {
      type: String,
      enum: SALE_STATUS_LIST,
      default: SALE_STATUS.PENDING,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | STATUS DO PAGAMENTO
    |--------------------------------------------------------------------------
    */

    paymentStatus: {
      type: String,
      enum: SALE_PAYMENT_STATUS_LIST,
      default: SALE_PAYMENT_STATUS.PENDING,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | DATAS
    |--------------------------------------------------------------------------
    */

    saleDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | CANCELAMENTO
    |--------------------------------------------------------------------------
    */

    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },

    /*
    |--------------------------------------------------------------------------
    | OBSERVAÇÕES
    |--------------------------------------------------------------------------
    */

    notes: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },

    /*
    |--------------------------------------------------------------------------
    | AUDITORIA
    |--------------------------------------------------------------------------
    */

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

/*
|--------------------------------------------------------------------------
| ÍNDICES
|--------------------------------------------------------------------------
*/

saleSchema.index({
  status: 1,
  createdAt: -1,
})

saleSchema.index({
  sellerBroker: 1,
  status: 1,
})

saleSchema.index({
  acquisitionBroker: 1,
  status: 1,
})

saleSchema.index({
  lead: 1,
  createdAt: -1,
})

saleSchema.index({
  property: 1,
  createdAt: -1,
})

saleSchema.index({
  saleDate: -1,
})

/*
|--------------------------------------------------------------------------
| VALIDAÇÃO DAS COMISSÕES
|--------------------------------------------------------------------------
|
| A soma da distribuição não pode ultrapassar
| o percentual total da comissão.
|
| Exemplo:
|
| Comissão total: 5%
|
| Vendedor:     2.5%
| Captador:     1%
| Imobiliária:  1.5%
|
| Total:        5%
|
*/

saleSchema.pre('validate', function (next) {
  const commission = this.commission

  if (!commission) {
    return next()
  }

  const sellerPercentage = Number(commission.seller?.percentage || 0)

  const acquisitionPercentage = Number(commission.acquisition?.percentage || 0)

  const companyPercentage = Number(commission.company?.percentage || 0)

  const distributedPercentage =
    sellerPercentage + acquisitionPercentage + companyPercentage

  /*
  |--------------------------------------------------------------------------
  | A distribuição interna deve representar 100%
  | da comissão total.
  |--------------------------------------------------------------------------
  */

  if (Math.abs(distributedPercentage - 100) > 0.0001) {
    return next(new Error('A distribuição da comissão deve totalizar 100%.'))
  }

  next()
})

/*
|--------------------------------------------------------------------------
| CONTROLE AUTOMÁTICO DAS DATAS
|--------------------------------------------------------------------------
*/

saleSchema.pre('save', function (next) {
  /*
  |--------------------------------------------------------------------------
  | VENDA CONCLUÍDA
  |--------------------------------------------------------------------------
  */

  if (
    this.isModified('status') &&
    this.status === SALE_STATUS.COMPLETED &&
    !this.completedAt
  ) {
    this.completedAt = new Date()
  }

  /*
  |--------------------------------------------------------------------------
  | VENDA CANCELADA
  |--------------------------------------------------------------------------
  */

  if (
    this.isModified('status') &&
    this.status === SALE_STATUS.CANCELLED &&
    !this.cancelledAt
  ) {
    this.cancelledAt = new Date()
  }

  next()
})

/*
|--------------------------------------------------------------------------
| POPULATE PADRÃO
|--------------------------------------------------------------------------
*/

export const SALE_POPULATE = [
  /*
  |--------------------------------------------------------------------------
  | PROPOSTA
  |--------------------------------------------------------------------------
  */

  {
    path: 'proposal',
    select:
      'status values paymentMethod installments installmentValue approvedAt',
  },

  /*
  |--------------------------------------------------------------------------
  | LEAD
  |--------------------------------------------------------------------------
  */

  {
    path: 'lead',
    select: 'name email phone source stage status assignedTo',
  },

  /*
  |--------------------------------------------------------------------------
  | IMÓVEL
  |--------------------------------------------------------------------------
  */

  {
    path: 'property',
    select:
      'name slug code type category purpose status images coverImage prices location captation broker',
  },

  /*
  |--------------------------------------------------------------------------
  | CORRETOR VENDEDOR
  |--------------------------------------------------------------------------
  */

  {
    path: 'sellerBroker',
    select: 'name email avatar position phone',
  },

  /*
  |--------------------------------------------------------------------------
  | CORRETOR CAPTADOR
  |--------------------------------------------------------------------------
  */

  {
    path: 'acquisitionBroker',
    select: 'name email avatar position phone',
  },

  /*
  |--------------------------------------------------------------------------
  | USUÁRIO QUE CRIOU
  |--------------------------------------------------------------------------
  */

  {
    path: 'createdBy',
    select: 'name email avatar role',
  },

  /*
  |--------------------------------------------------------------------------
  | USUÁRIO QUE ATUALIZOU
  |--------------------------------------------------------------------------
  */

  {
    path: 'updatedBy',
    select: 'name email avatar role',
  },

  /*
  |--------------------------------------------------------------------------
  | CORRETOR DA COMISSÃO DO VENDEDOR
  |--------------------------------------------------------------------------
  */

  {
    path: 'commission.seller.broker',
    select: 'name email avatar position phone',
  },

  /*
  |--------------------------------------------------------------------------
  | CORRETOR DA COMISSÃO DO CAPTADOR
  |--------------------------------------------------------------------------
  */

  {
    path: 'commission.acquisition.broker',
    select: 'name email avatar position phone',
  },
]

/*
|--------------------------------------------------------------------------
| MODEL
|--------------------------------------------------------------------------
*/

const Sale = mongoose.model('Sale', saleSchema)

export default Sale
