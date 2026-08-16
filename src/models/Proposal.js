import mongoose from 'mongoose'

export const PROPOSAL_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
})

export const PROPOSAL_STATUS_LIST = Object.freeze(
  Object.values(PROPOSAL_STATUS),
)

export const PAYMENT_METHOD = Object.freeze({
  CASH: 'cash',
  FINANCING: 'financing',
  FGTS: 'fgts',
  MIXED: 'mixed',
})

export const PAYMENT_METHOD_LIST = Object.freeze(Object.values(PAYMENT_METHOD))

const proposalHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    previousStatus: {
      type: String,
      enum: PROPOSAL_STATUS_LIST,
      default: null,
    },

    newStatus: {
      type: String,
      enum: PROPOSAL_STATUS_LIST,
      default: null,
    },

    comment: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    performedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
)

const proposalSchema = new mongoose.Schema(
  {
    /**
     * RELACIONAMENTOS
     */

    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },

    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },

    broker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    /**
     * STATUS
     */

    status: {
      type: String,
      enum: PROPOSAL_STATUS_LIST,
      default: PROPOSAL_STATUS.DRAFT,
      index: true,
    },

    /**
     * VALORES DA PROPOSTA
     */

    values: {
      propertyPrice: {
        type: Number,
        required: true,
        min: 0,
      },

      proposalPrice: {
        type: Number,
        required: true,
        min: 0,
      },

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
    },

    /**
     * PAGAMENTO
     */

    paymentMethod: {
      type: String,
      enum: PAYMENT_METHOD_LIST,
      default: PAYMENT_METHOD.FINANCING,
    },

    installments: {
      type: Number,
      default: 0,
      min: 0,
    },

    installmentValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * VALIDADE
     */

    validityDays: {
      type: Number,
      default: 7,
      min: 1,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    /**
     * OBSERVAÇÕES
     */

    clientMessage: {
      type: String,
      trim: true,
      maxlength: 3000,
    },

    adminComment: {
      type: String,
      trim: true,
      maxlength: 3000,
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    /**
     * SNAPSHOT DO LEAD
     */

    leadSnapshot: {
      name: {
        type: String,
        trim: true,
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
      },

      phone: {
        type: String,
        trim: true,
      },

      source: {
        type: String,
      },

      stage: {
        type: String,
      },
    },

    /**
     * SNAPSHOT DO IMÓVEL
     */

    propertySnapshot: {
      code: {
        type: String,
        trim: true,
      },

      title: {
        type: String,
        trim: true,
      },

      slug: {
        type: String,
        trim: true,
      },

      type: {
        type: String,
        trim: true,
      },

      status: {
        type: String,
        trim: true,
      },

      price: {
        type: Number,
        default: 0,
      },

      address: {
        street: String,
        number: String,
        district: String,
        city: String,
        state: String,
        zipCode: String,
      },
    },

    /**
     * HISTÓRICO
     */

    history: {
      type: [proposalHistorySchema],
      default: [],
    },

    /**
     * FLAGS
     */

    submittedAt: {
      type: Date,
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    expiredAt: {
      type: Date,
      default: null,
    },

    /**
     * SOFT DELETE
     */

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

/**
 * ÍNDICES
 */

proposalSchema.index({
  status: 1,
  createdAt: -1,
})

proposalSchema.index({
  broker: 1,
  status: 1,
})

proposalSchema.index({
  lead: 1,
  createdAt: -1,
})

proposalSchema.index({
  property: 1,
  createdAt: -1,
})

proposalSchema.index({
  approvedBy: 1,
})

proposalSchema.index({
  expiresAt: 1,
})

/**
 * VIRTUAL
 */

proposalSchema.virtual('isExpired').get(function () {
  if (!this.expiresAt) return false

  return new Date() > this.expiresAt
})

/**
 * POPULATE PADRÃO
 */

export const PROPOSAL_POPULATE = [
  {
    path: 'lead',
    select: 'name email phone source stage status assignedTo',
  },
  {
    path: 'property',
    select: 'title slug code price status type address proposalCount',
  },
  {
    path: 'broker',
    select: 'name email avatar position phone',
  },
  {
    path: 'createdBy',
    select: 'name email avatar role',
  },
  {
    path: 'approvedBy',
    select: 'name email avatar role',
  },
  {
    path: 'history.performedBy',
    select: 'name email avatar role',
  },
]

const Proposal = mongoose.model('Proposal', proposalSchema)

export default Proposal
