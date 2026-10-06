import mongoose from 'mongoose'

import { LEAD_STAGE_LIST, LEAD_STAGES } from '../constants/leadStages.js'
import { LEAD_STATUS } from '../constants/leadStatus.js'
import { LEAD_PRIORITY, LEAD_PRIORITY_LIST } from '../constants/leadPriority.js'
import { LEAD_SOURCE_TYPE_LIST } from '../constants/leadSourceType.js'

import { normalizePhone } from '../utils/phone.js'

/*
|--------------------------------------------------------------------------
| ENUMS DE DISTRIBUIÇÃO
|--------------------------------------------------------------------------
|
| Centralizados aqui para evitar divergência entre schema e serviços.
| O `leadDistributionService.js` grava `'round_robin'`, então ele
| PRECISA estar no enum, senão o `save()` falha na validação.
|
*/

const ASSIGNMENT_TYPE_LIST = [
  'admin',
  'automatic',
  'broker',
  'manual',
  'round_robin', // ← usado pelo leadDistributionService
  'queue_based', // ← possível uso futuro / atual
  'region_based', // ← possível uso futuro / atual
  'reassignment', // ← usado em reatribuições
]

const ASSIGNMENT_HISTORY_TYPE_LIST = [
  'admin',
  'automatic',
  'broker',
  'manual',
  'round_robin',
  'queue_based',
  'region_based',
  'reassignment',
]

/*
|--------------------------------------------------------------------------
| STAGE TIMELINE
|--------------------------------------------------------------------------
*/

const stageTimelineSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      default: '',
      trim: true,
    },

    description: {
      type: String,
      default: '',
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
)

/*
|--------------------------------------------------------------------------
| STAGE HISTORY
|--------------------------------------------------------------------------
*/

const stageHistorySchema = new mongoose.Schema(
  {
    from: {
      type: String,
      enum: LEAD_STAGE_LIST,
      default: null,
    },

    to: {
      type: String,
      enum: LEAD_STAGE_LIST,
      default: null,
    },

    stage: {
      type: String,
      enum: LEAD_STAGE_LIST,
      default: LEAD_STAGES.NEW,
      required: true,
    },

    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    reason: {
      type: String,
      default: '',
      trim: true,
    },

    timeline: {
      type: [stageTimelineSchema],
      default: [],
    },

    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
)

/*
|--------------------------------------------------------------------------
| DISTRIBUTION
|--------------------------------------------------------------------------
*/

const distributionSchema = new mongoose.Schema(
  {
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastAttemptAt: {
      type: Date,
      default: null,
    },

    queueReason: {
      type: String,
      default: '',
      trim: true,
    },

    region: {
      type: String,
      default: '',
      trim: true,
    },

    priority: {
      type: Number,
      default: 0,
    },

    lastResult: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    _id: false,
  },
)

/*
|--------------------------------------------------------------------------
| ASSIGNMENT HISTORY
|--------------------------------------------------------------------------
*/

const assignmentHistorySchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    type: {
      type: String,
      enum: ASSIGNMENT_HISTORY_TYPE_LIST,
      default: 'admin',
    },

    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    reason: {
      type: String,
      default: '',
      trim: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
)

/*
|--------------------------------------------------------------------------
| LEAD SCHEMA
|--------------------------------------------------------------------------
*/

const leadSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | DADOS DO LEAD
    |--------------------------------------------------------------------------
    */

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 160,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },

    phoneNormalized: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | ORIGEM
    |--------------------------------------------------------------------------
    */

    source: {
      type: String,
      enum: [
        'manual',
        'public',
        'meta',
        'olx',
        'zap',
        'csv',
        'site',
        'hotsite',
        'portal',
        'referral',
      ],
      default: 'manual',
      index: true,
    },

    sourceType: {
      type: String,
      enum: LEAD_SOURCE_TYPE_LIST,
      default: 'manual',
      required: true,
      index: true,
    },

    sourceBroker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    sourceSite: {
      type: String,
      default: '',
      trim: true,
    },

    sourceUrl: {
      type: String,
      default: '',
      trim: true,
    },

    landingPage: {
      type: String,
      default: '',
      trim: true,
    },

    referrer: {
      type: String,
      default: '',
      trim: true,
    },

    /*
    |--------------------------------------------------------------------------
    | CAMPANHA / UTM
    |--------------------------------------------------------------------------
    */

    campaign: {
      utmSource: {
        type: String,
        default: '',
        trim: true,
      },

      utmMedium: {
        type: String,
        default: '',
        trim: true,
      },

      utmCampaign: {
        type: String,
        default: '',
        trim: true,
      },

      utmTerm: {
        type: String,
        default: '',
        trim: true,
      },

      utmContent: {
        type: String,
        default: '',
        trim: true,
      },
    },

    /*
    |--------------------------------------------------------------------------
    | REGIÃO
    |--------------------------------------------------------------------------
    |
    | IMPORTANTE: os valores do enum PRECISAM bater com o que o frontend
    | e os serviços enviam. Aqui aceitamos BOTH formas (com espaço e
    | com underscore) para não quebrar dados legados nem novos.
    |
    */

    region: {
      type: String,
      enum: [
        // forma com underscore (padrão novo)
        'central',
        'zona_oeste',
        'zona_leste',
        'zona_sul',
        'zona_norte',
        'abc',
        'grande_sp',
        'interior',
        'litoral',

        // forma com espaço (compatibilidade com dados antigos)
        'zona oeste',
        'zona leste',
        'zona sul',
        'zona norte',
      ],
      required: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | STATUS
    |--------------------------------------------------------------------------
    */

    status: {
      type: String,
      enum: [
        LEAD_STATUS.NEW,
        LEAD_STATUS.IN_PROGRESS,
        LEAD_STATUS.CONVERTED,
        LEAD_STATUS.LOST,
        LEAD_STATUS.CONTACTED,
        LEAD_STATUS.NEGOTIATION,
        LEAD_STATUS.ARCHIVED,
      ],
      default: LEAD_STATUS.NEW,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | PIPELINE
    |--------------------------------------------------------------------------
    */

    stage: {
      type: String,
      enum: LEAD_STAGE_LIST,
      default: LEAD_STAGES.NEW,
      index: true,
    },

    stageHistory: {
      type: [stageHistorySchema],
      default: [],
    },

    /*
    |--------------------------------------------------------------------------
    | PRIORIDADE
    |--------------------------------------------------------------------------
    */

    priority: {
      type: String,
      enum: LEAD_PRIORITY_LIST,
      default: LEAD_PRIORITY.MEDIUM,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | SCORE
    |--------------------------------------------------------------------------
    */

    score: {
      type: Number,
      default: 0,
      min: 0,
    },

    /*
    |--------------------------------------------------------------------------
    | ÚLTIMO CONTATO
    |--------------------------------------------------------------------------
    */

    lastContactAt: {
      type: Date,
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | OBSERVAÇÕES
    |--------------------------------------------------------------------------
    */

    notes: {
      type: String,
      default: '',
      trim: true,
    },

    /*
    |--------------------------------------------------------------------------
    | HISTÓRICO DE CONTATOS
    |--------------------------------------------------------------------------
    */

    contactHistory: [
      {
        type: {
          type: String,
          enum: [
            'call',
            'whatsapp',
            'email',
            'meeting',
            'visit',
            'note',
            'proposal',
          ],
          required: true,
        },

        action: {
          type: String,
          default: '',
          trim: true,
        },

        description: {
          type: String,
          required: true,
          trim: true,
        },

        proposal: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Proposal',
          default: null,
        },

        property: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Property',
          default: null,
        },

        metadata: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },

        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },

        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    /*
    |--------------------------------------------------------------------------
    | IMÓVEL
    |--------------------------------------------------------------------------
    */

    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      default: null,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | CRIADO POR
    |--------------------------------------------------------------------------
    */

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | CORRETOR RESPONSÁVEL
    |--------------------------------------------------------------------------
    */

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | DISTRIBUIÇÃO
    |--------------------------------------------------------------------------
    */

    awaitingAssignment: {
      type: Boolean,
      default: false,
      index: true,
    },

    assignmentType: {
      type: String,
      enum: ASSIGNMENT_TYPE_LIST,
      default: 'manual',
    },

    assignedAt: {
      type: Date,
      default: null,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    assignmentHistory: {
      type: [assignmentHistorySchema],
      default: [],
    },

    isDistributed: {
      type: Boolean,
      default: false,
      index: true,
    },

    distributedAt: {
      type: Date,
      default: null,
    },

    isAutoDistributed: {
      type: Boolean,
      default: false,
      index: true,
    },

    distribution: {
      type: distributionSchema,
      default: () => ({}),
    },

    /*
    |--------------------------------------------------------------------------
    | CAPTAÇÃO
    |--------------------------------------------------------------------------
    */

    sessionId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },

    visitorId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | DATAS COMERCIAIS
    |--------------------------------------------------------------------------
    */

    visitDate: {
      type: Date,
      default: null,
    },

    proposalDate: {
      type: Date,
      default: null,
    },

    closeDate: {
      type: Date,
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | PROPOSTA
    |--------------------------------------------------------------------------
    */

    proposalValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    /*
    |--------------------------------------------------------------------------
    | PERDA
    |--------------------------------------------------------------------------
    */

    lostReason: {
      type: String,
      enum: [
        'preco',
        'desistiu',
        'sem_financiamento',
        'comprou_com_concorrente',
        'sem_retorno',
        'outro',
      ],
      default: undefined,
    },

    lostReasonDescription: {
      type: String,
      default: '',
      trim: true,
    },

    /*
    |--------------------------------------------------------------------------
    | PRÓXIMA AÇÃO
    |--------------------------------------------------------------------------
    */

    nextAction: {
      type: String,
      default: '',
      trim: true,
    },

    nextActionDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

/*
|--------------------------------------------------------------------------
| ÍNDICES
|--------------------------------------------------------------------------
*/

leadSchema.index({ phoneNormalized: 1 })
leadSchema.index({ isDeleted: 1 })
leadSchema.index({ assignedTo: 1 })
leadSchema.index({ createdBy: 1 })
leadSchema.index({ sourceBroker: 1 })
leadSchema.index({ property: 1 })
leadSchema.index({ stage: 1 })
leadSchema.index({ status: 1 })
leadSchema.index({ priority: 1 })
leadSchema.index({ source: 1 })
leadSchema.index({ sourceType: 1 })
leadSchema.index({ region: 1 })
leadSchema.index({ createdAt: -1 })
leadSchema.index({ awaitingAssignment: 1 })
leadSchema.index({ sourceType: 1, sourceBroker: 1 })
leadSchema.index({ property: 1, sourceType: 1 })
leadSchema.index({ assignedTo: 1, stage: 1 })
leadSchema.index({ assignedTo: 1, status: 1 })
leadSchema.index({ assignedTo: 1, createdAt: -1 })
leadSchema.index({ sessionId: 1 })
leadSchema.index({ visitorId: 1 })

leadSchema.index({ isDistributed: 1, assignedTo: 1, isDeleted: 1 })
leadSchema.index({ assignedTo: 1, isDistributed: 1, status: 1 })
leadSchema.index({ awaitingAssignment: 1, region: 1 })
leadSchema.index({ awaitingAssignment: 1, isAutoDistributed: 1 })

leadSchema.index({ 'contactHistory.proposal': 1 })
leadSchema.index({ 'contactHistory.createdAt': -1 })
leadSchema.index({ 'stageHistory.changedAt': -1 })

/*
|--------------------------------------------------------------------------
| VIRTUALS
|--------------------------------------------------------------------------
*/

leadSchema.virtual('isAssigned').get(function () {
  return !!this.assignedTo
})

leadSchema.virtual('isAwaitingAssignment').get(function () {
  return this.awaitingAssignment === true
})

leadSchema.virtual('wasAutoDistributed').get(function () {
  return this.isAutoDistributed === true
})

leadSchema.virtual('isBrokerLead').get(function () {
  return this.sourceType === 'broker_hotsite'
})

leadSchema.virtual('isCompanyLead').get(function () {
  return this.sourceType === 'site'
})

leadSchema.virtual('isPropertyLead').get(function () {
  return this.sourceType === 'property_page'
})

leadSchema.virtual('distributionMethod').get(function () {
  if (this.isAutoDistributed) {
    return 'automatic'
  }

  if (this.assignedTo && this.assignmentType === 'admin') {
    return 'admin'
  }

  if (this.assignedTo && this.assignmentType === 'broker') {
    return 'broker'
  }

  if (this.assignedTo) {
    return 'manual'
  }

  return null
})

leadSchema.virtual('matchScore').get(function () {
  return this.distribution?.priority || 0
})

/*
|--------------------------------------------------------------------------
| METHODS
|--------------------------------------------------------------------------
*/

leadSchema.methods.markAsDistributed = function ({
  brokerId,
  type = 'automatic',
  changedBy = null,
  reason = '',
} = {}) {
  if (!brokerId) {
    throw new Error('Broker é obrigatório para distribuir o Lead.')
  }

  const previousBrokerId = this.assignedTo || null

  this.assignedTo = brokerId
  this.assignedAt = new Date()
  this.assignmentType = type
  this.assignedBy = changedBy || null
  this.awaitingAssignment = false
  this.isDistributed = true
  this.distributedAt = new Date()
  this.isAutoDistributed = type === 'automatic'

  this.assignmentHistory.push({
    from: previousBrokerId,
    to: brokerId,
    type,
    changedBy: changedBy || null,
    reason,
    createdAt: new Date(),
  })

  return this
}

leadSchema.methods.markAsQueued = function ({
  reason = '',
  region = '',
  priority = 0,
} = {}) {
  this.assignedTo = null
  this.assignedAt = null
  this.assignedBy = null
  this.assignmentType = 'manual'
  this.awaitingAssignment = true
  this.isDistributed = false
  this.distributedAt = null
  this.isAutoDistributed = false

  this.distribution = {
    ...(this.distribution?.toObject?.() || this.distribution || {}),
    queueReason: reason,
    region,
    priority,
    lastResult: 'queued',
  }

  return this
}

leadSchema.methods.recordDistributionAttempt = function ({
  result = '',
  reason = '',
} = {}) {
  if (!this.distribution) {
    this.distribution = {}
  }

  this.distribution.attempts = (this.distribution.attempts || 0) + 1
  this.distribution.lastAttemptAt = new Date()
  this.distribution.lastResult = result

  if (reason) {
    this.distribution.queueReason = reason
  }

  return this
}

leadSchema.methods.canBeDistributed = function () {
  if (this.isDeleted) return false
  if (this.assignedTo) return false
  if (this.awaitingAssignment === false) return true
  return true
}

/*
|--------------------------------------------------------------------------
| STATICS
|--------------------------------------------------------------------------
*/

leadSchema.statics.findByNormalizedPhone = function (phone) {
  const normalizedPhone = normalizePhone(phone)

  if (!normalizedPhone) {
    return null
  }

  return this.findOne({
    phoneNormalized: normalizedPhone,
    isDeleted: { $ne: true },
  })
}

leadSchema.statics.findPendingDistribution = function ({
  region = null,
  limit = 50,
} = {}) {
  const query = {
    isDeleted: { $ne: true },
    awaitingAssignment: true,
    $or: [{ assignedTo: { $exists: false } }, { assignedTo: null }],
  }

  if (region) {
    query.region = region
  }

  return this.find(query).sort({ priority: -1, createdAt: 1 }).limit(limit)
}

leadSchema.statics.findForReassignment = function ({ limit = 50 } = {}) {
  return this.find({
    isDeleted: { $ne: true },
    $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }],
  })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit)
}

leadSchema.statics.getDistributionStats = async function () {
  const [total, distributed, pending, automatic, manual] = await Promise.all([
    this.countDocuments({ isDeleted: { $ne: true } }),
    this.countDocuments({ isDeleted: { $ne: true }, isDistributed: true }),
    this.countDocuments({ isDeleted: { $ne: true }, awaitingAssignment: true }),
    this.countDocuments({ isDeleted: { $ne: true }, isAutoDistributed: true }),
    this.countDocuments({
      isDeleted: { $ne: true },
      isDistributed: true,
      isAutoDistributed: false,
    }),
  ])

  return { total, distributed, pending, automatic, manual }
}

/*
|--------------------------------------------------------------------------
| MIDDLEWARE
|--------------------------------------------------------------------------
*/

leadSchema.pre('save', function (next) {
  if (this.isModified('phone') || !this.phoneNormalized) {
    this.phoneNormalized = normalizePhone(this.phone)
  }

  if (this.assignedTo) {
    this.isDistributed = true
    if (!this.distributedAt) {
      this.distributedAt = new Date()
    }
    this.awaitingAssignment = false
  }

  if (!this.assignedTo && this.awaitingAssignment) {
    this.isDistributed = false
  }

  next()
})

/*
|--------------------------------------------------------------------------
| JSON
|--------------------------------------------------------------------------
*/

leadSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
})

/*
|--------------------------------------------------------------------------
| MODEL
|--------------------------------------------------------------------------
*/

export default mongoose.model('Lead', leadSchema)
