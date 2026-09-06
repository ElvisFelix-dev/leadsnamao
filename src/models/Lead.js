import mongoose from 'mongoose'

import { LEAD_STAGE_LIST, LEAD_STAGES } from '../constants/leadStages.js'

import { LEAD_STATUS } from '../constants/leadStatus.js'

import { LEAD_PRIORITY, LEAD_PRIORITY_LIST } from '../constants/leadPriority.js'

import { LEAD_SOURCE_TYPE_LIST } from '../constants/leadSourceType.js'

/*
|--------------------------------------------------------------------------
| STAGE HISTORY
|--------------------------------------------------------------------------
|
| Histórico das movimentações do Pipeline.
|
| Mantemos:
|
| from
| to
| stage
| changedBy
| reason
| changedAt
|
| Também mantemos timeline para eventos relacionados
| àquela etapa.
|
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

const stageHistorySchema = new mongoose.Schema(
  {
    /*
     * Etapa anterior.
     *
     * Mantemos nullable porque a primeira
     * movimentação pode não possuir etapa anterior.
     */

    from: {
      type: String,
      enum: LEAD_STAGE_LIST,
      default: null,
    },

    /*
     * Nova etapa.
     */

    to: {
      type: String,
      enum: LEAD_STAGE_LIST,
      default: null,
    },

    /*
     * Etapa atual registrada no histórico.
     *
     * Mantida para compatibilidade com
     * históricos antigos e componentes existentes.
     */

    stage: {
      type: String,
      enum: LEAD_STAGE_LIST,
      default: LEAD_STAGES.NEW,
      required: true,
    },

    /*
     * Usuário responsável pela alteração.
     */

    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /*
     * Motivo da alteração.
     */

    reason: {
      type: String,
      default: '',
      trim: true,
    },

    /*
     * Eventos ocorridos dentro da etapa.
     */

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

/* ============================================================
   DISTRIBUIÇÃO SCHEMA
============================================================ */

/**
 * Schema para rastrear a distribuição automática de leads
 */
const distributionSchema = new mongoose.Schema(
  {
    // Método de distribuição utilizado
    method: {
      type: String,
      enum: [
        'admin',
        'automatic',
        'broker',
        'manual',
        'round_robin',
        'specialized',
      ],
      default: 'manual',
    },

    // Região do lead para distribuição especializada
    region: {
      type: String,
      default: '',
    },

    // Tipo de imóvel do lead
    propertyType: {
      type: String,
      default: '',
    },

    // Status da distribuição
    status: {
      type: String,
      enum: ['pending', 'processing', 'success', 'failed', 'queue'],
      default: 'pending',
    },

    // Número de tentativas de distribuição
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Última tentativa de distribuição
    lastAttemptAt: {
      type: Date,
      default: null,
    },

    // Mensagem de erro da última tentativa
    errorMessage: {
      type: String,
      default: '',
    },

    // Se foi distribuído automaticamente
    isAutoDistributed: {
      type: Boolean,
      default: false,
    },

    // Data da distribuição
    distributedAt: {
      type: Date,
      default: null,
    },

    // Prioridade na fila de distribuição
    queuePriority: {
      type: Number,
      default: 0,
    },

    // Score de match com o corretor
    matchScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Motivo da distribuição
    reason: {
      type: String,
      default: '',
      trim: true,
    },

    // Metadados adicionais
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    _id: false,
  },
)

/* ============================================================
   ASSIGNMENT HISTORY SCHEMA (ATUALIZADO)
============================================================ */

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
      enum: [
        'admin',
        'automatic',
        'broker',
        'manual',
        'round_robin',
        'specialized',
      ],
      default: 'admin',
    },

    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // 🔥 NOVOS CAMPOS PARA HISTÓRICO DE DISTRIBUIÇÃO
    distributionMethod: {
      type: String,
      enum: [
        'admin',
        'automatic',
        'broker',
        'manual',
        'round_robin',
        'specialized',
      ],
      default: 'manual',
    },

    region: {
      type: String,
      default: '',
    },

    propertyType: {
      type: String,
      default: '',
    },

    matchScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    reason: {
      type: String,
      default: '',
      trim: true,
    },

    // Se foi distribuído automaticamente
    isAuto: {
      type: Boolean,
      default: false,
    },

    // Metadados da distribuição
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
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

    /*
    |--------------------------------------------------------------------------
    | TIPO DA ORIGEM
    |--------------------------------------------------------------------------
    */

    sourceType: {
      type: String,

      enum: LEAD_SOURCE_TYPE_LIST,

      default: 'manual',

      required: true,

      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | CORRETOR DA ORIGEM
    |--------------------------------------------------------------------------
    |
    | Não necessariamente é o corretor responsável atual.
    |
    | Ex:
    |
    | sourceBroker = Joe
    | assignedTo   = Maria
    |
    */

    sourceBroker: {
      type: mongoose.Schema.Types.ObjectId,

      ref: 'User',

      default: null,

      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | SITE DE ORIGEM
    |--------------------------------------------------------------------------
    */

    sourceSite: {
      type: String,

      default: '',

      trim: true,
    },

    /*
    |--------------------------------------------------------------------------
    | URL DE ORIGEM
    |--------------------------------------------------------------------------
    */

    sourceUrl: {
      type: String,

      default: '',

      trim: true,
    },

    /*
    |--------------------------------------------------------------------------
    | LANDING PAGE
    |--------------------------------------------------------------------------
    */

    landingPage: {
      type: String,

      default: '',

      trim: true,
    },

    /*
    |--------------------------------------------------------------------------
    | REFERRER
    |--------------------------------------------------------------------------
    */

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
    | REGIÃO 🔥 ATUALIZADO
    |--------------------------------------------------------------------------
    */

    region: {
      type: String,

      enum: [
        'central',
        'zona_oeste',
        'zona_leste',
        'zona_sul',
        'zona_norte',
        'abc',
        'grande_sp',
        'interior',
        'litoral',
      ],

      default: 'central',

      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | STATUS GERAL
    |--------------------------------------------------------------------------
    */

    status: {
      type: String,
      enum: [
        LEAD_STATUS.NEW, // 'novo'
        LEAD_STATUS.IN_PROGRESS, // 'em_andamento'
        LEAD_STATUS.CONVERTED, // 'convertido'
        LEAD_STATUS.LOST, // 'perdido'
        LEAD_STATUS.CONTACTED, // 'contatado'
        LEAD_STATUS.NEGOTIATION, // 'em_negociacao'
        LEAD_STATUS.ARCHIVED, // 'arquivado'
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
    | HISTÓRICO DE CONTATOS / ATIVIDADES
    |--------------------------------------------------------------------------
    |
    | Incluímos "proposal".
    |
    | Isso é importante porque o proposalService
    | registra as propostas dentro do histórico do Lead.
    |
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

        /*
         * Ação específica.
         *
         * Exemplos:
         *
         * created
         * submitted
         * approved
         * rejected
         * cancelled
         * updated
         */

        action: {
          type: String,

          default: '',

          trim: true,
        },

        /*
         * Descrição exibida na timeline.
         */

        description: {
          type: String,

          required: true,

          trim: true,
        },

        /*
         * Referência da proposta.
         */

        proposal: {
          type: mongoose.Schema.Types.ObjectId,

          ref: 'Proposal',

          default: null,
        },

        /*
         * Referência opcional ao imóvel.
         */

        property: {
          type: mongoose.Schema.Types.ObjectId,

          ref: 'Property',

          default: null,
        },

        /*
         * Dados adicionais do evento.
         */

        metadata: {
          type: mongoose.Schema.Types.Mixed,

          default: {},
        },

        /*
         * Usuário que criou o evento.
         */

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
    | IMÓVEL PRINCIPAL DO LEAD
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
    | DISTRIBUIÇÃO 🔥 NOVO
    |--------------------------------------------------------------------------
    */

    distribution: {
      type: distributionSchema,
      default: () => ({}),
    },

    /*
    |--------------------------------------------------------------------------
    | CAMPOS DE DISTRIBUIÇÃO (LEGADO - MANTIDOS PARA COMPATIBILIDADE)
    |--------------------------------------------------------------------------
    */

    awaitingAssignment: {
      type: Boolean,

      default: false,

      index: true,
    },

    assignmentType: {
      type: String,

      enum: [
        'admin',
        'automatic',
        'broker',
        'manual',
        'round_robin',
        'specialized',
      ],

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

    /*
    |--------------------------------------------------------------------------
    | HISTÓRICO DE DISTRIBUIÇÃO 🔥 ATUALIZADO
    |--------------------------------------------------------------------------
    */

    assignmentHistory: {
      type: [assignmentHistorySchema],
      default: [],
    },

    /*
    |--------------------------------------------------------------------------
    | DADOS DE CAPTAÇÃO
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
    |
    | Mantemos esses campos no Lead como resumo da negociação.
    |
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

    /*
    |--------------------------------------------------------------------------
    | INDICADOR DE DISTRIBUIÇÃO 🔥 NOVO
    |--------------------------------------------------------------------------
    */

    isDistributed: {
      type: Boolean,
      default: false,
      index: true,
    },

    distributedAt: {
      type: Date,
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | INDICADOR DE DISTRIBUIÇÃO AUTOMÁTICA 🔥 NOVO
    |--------------------------------------------------------------------------
    */

    isAutoDistributed: {
      type: Boolean,
      default: false,
      index: true,
    },
  },

  {
    timestamps: true,
  },
)

/*
|--------------------------------------------------------------------------
| ÍNDICES 🔥 ATUALIZADOS
|--------------------------------------------------------------------------
*/

leadSchema.index({
  assignedTo: 1,
})

leadSchema.index({
  createdBy: 1,
})

leadSchema.index({
  sourceBroker: 1,
})

leadSchema.index({
  property: 1,
})

leadSchema.index({
  stage: 1,
})

leadSchema.index({
  status: 1,
})

leadSchema.index({
  priority: 1,
})

leadSchema.index({
  source: 1,
})

leadSchema.index({
  sourceType: 1,
})

leadSchema.index({
  region: 1,
})

leadSchema.index({
  createdAt: -1,
})

leadSchema.index({
  awaitingAssignment: 1,
})

leadSchema.index({
  sourceType: 1,
  sourceBroker: 1,
})

leadSchema.index({
  property: 1,
  sourceType: 1,
})

leadSchema.index({
  assignedTo: 1,
  stage: 1,
})

leadSchema.index({
  assignedTo: 1,
  status: 1,
})

leadSchema.index({
  assignedTo: 1,
  createdAt: -1,
})

leadSchema.index({
  sessionId: 1,
})

leadSchema.index({
  visitorId: 1,
})

/*
|--------------------------------------------------------------------------
| ÍNDICES ÚTEIS PARA O HISTÓRICO
|--------------------------------------------------------------------------
*/

leadSchema.index({
  'contactHistory.proposal': 1,
})

leadSchema.index({
  'contactHistory.createdAt': -1,
})

leadSchema.index({
  'stageHistory.changedAt': -1,
})

/*
|--------------------------------------------------------------------------
| ÍNDICES PARA DISTRIBUIÇÃO 🔥 NOVOS
|--------------------------------------------------------------------------
*/

// Índice para buscar leads não distribuídos
leadSchema.index({
  isDistributed: 1,
  assignedTo: 1,
  isDeleted: 1,
})

// Índice para fila de distribuição
leadSchema.index({
  'distribution.status': 1,
  'distribution.attempts': 1,
  createdAt: 1,
})

// Índice para distribuição por região
leadSchema.index({
  region: 1,
  isDistributed: 1,
  'distribution.status': 1,
})

// Índice para distribuição automática
leadSchema.index({
  isAutoDistributed: 1,
  isDistributed: 1,
  'distribution.attempts': 1,
})

// Índice composto para estatísticas
leadSchema.index({
  assignedTo: 1,
  isDistributed: 1,
  status: 1,
})

/*
|--------------------------------------------------------------------------
| VIRTUALS 🔥 CORRIGIDOS - REMOVIDO O DUPLICADO
|--------------------------------------------------------------------------
*/

/*
 * Lead possui corretor responsável?
 */

leadSchema.virtual('isAssigned').get(function () {
  return !!this.assignedTo
})

/*
 * Lead aguarda distribuição?
 */

leadSchema.virtual('isAwaitingAssignment').get(function () {
  return (
    this.awaitingAssignment === true || this.distribution?.status === 'pending'
  )
})

/*
 * 🔥 VIRTUAL RENOMEADO PARA EVITAR CONFLITO
 * Lead foi distribuído automaticamente?
 */

leadSchema.virtual('wasAutoDistributed').get(function () {
  return (
    this.isAutoDistributed === true ||
    this.distribution?.isAutoDistributed === true
  )
})

/*
 * Lead veio do hotsite de corretor?
 */

leadSchema.virtual('isBrokerLead').get(function () {
  return this.sourceType === 'broker_hotsite'
})

/*
 * Lead veio do site da imobiliária?
 */

leadSchema.virtual('isCompanyLead').get(function () {
  return this.sourceType === 'site'
})

/*
 * Lead veio de página de imóvel?
 */

leadSchema.virtual('isPropertyLead').get(function () {
  return this.sourceType === 'property_page'
})

/*
 * Método de distribuição do lead
 */

leadSchema.virtual('distributionMethod').get(function () {
  return this.distribution?.method || this.assignmentType || 'manual'
})

/*
 * Score de match do lead
 */

leadSchema.virtual('matchScore').get(function () {
  return this.distribution?.matchScore || 0
})

/*
|--------------------------------------------------------------------------
| MÉTODOS 🔥 NOVOS
|--------------------------------------------------------------------------
*/

/**
 * Marca o lead como distribuído
 */
leadSchema.methods.markAsDistributed = function (brokerId, method, userId) {
  const now = new Date()

  // Atualizar campos principais
  this.assignedTo = brokerId
  this.assignedAt = now
  this.assignedBy = userId || null
  this.isDistributed = true
  this.distributedAt = now
  this.awaitingAssignment = false

  // Atualizar objeto distribution
  if (!this.distribution) {
    this.distribution = {}
  }
  this.distribution.method = method || 'manual'
  this.distribution.status = 'success'
  this.distribution.isAutoDistributed =
    method === 'automatic' ||
    method === 'round_robin' ||
    method === 'specialized'
  this.distribution.distributedAt = now

  // Adicionar ao histórico de distribuição
  this.assignmentHistory.push({
    from: this.assignedTo,
    to: brokerId,
    type: method || 'manual',
    changedBy: userId || null,
    distributionMethod: method || 'manual',
    isAuto:
      method === 'automatic' ||
      method === 'round_robin' ||
      method === 'specialized',
    region: this.region,
    propertyType: this.property?.type || '',
    matchScore: this.distribution?.matchScore || 0,
    createdAt: now,
  })

  return this
}

/**
 * Marca o lead como em fila de espera
 */
leadSchema.methods.markAsQueued = function (reason) {
  if (!this.distribution) {
    this.distribution = {}
  }

  this.awaitingAssignment = true
  this.isDistributed = false
  this.distribution.status = 'queue'
  this.distribution.reason = reason || 'Aguardando distribuição'
  this.distribution.attempts = (this.distribution.attempts || 0) + 1
  this.distribution.lastAttemptAt = new Date()

  return this
}

/**
 * Registra uma tentativa de distribuição
 */
leadSchema.methods.recordDistributionAttempt = function () {
  if (!this.distribution) {
    this.distribution = {}
  }

  this.distribution.attempts = (this.distribution.attempts || 0) + 1
  this.distribution.lastAttemptAt = new Date()

  return this
}

/**
 * Verifica se o lead pode ser distribuído
 */
leadSchema.methods.canBeDistributed = function () {
  // Já distribuído
  if (this.isDistributed && this.assignedTo) {
    return false
  }

  // Limite de tentativas
  const maxAttempts = 5
  if ((this.distribution?.attempts || 0) >= maxAttempts) {
    return false
  }

  // Lead vendido/perdido não deve ser distribuído
  if (this.status === 'convertido' || this.status === 'perdido') {
    return false
  }

  return true
}

/*
|--------------------------------------------------------------------------
| STATIC METHODS 🔥 NOVOS
|--------------------------------------------------------------------------
*/

/**
 * Busca leads pendentes de distribuição
 */
leadSchema.statics.findPendingDistribution = function (options = {}) {
  const { limit = 50, region, priority } = options

  const query = {
    isDistributed: false,
    assignedTo: { $exists: false },
    isDeleted: { $ne: true },
    status: { $nin: ['convertido', 'perdido', 'arquivado'] },
  }

  if (region) {
    query.region = region
  }

  if (priority) {
    query.priority = priority
  }

  return this.find(query).sort({ priority: -1, createdAt: 1 }).limit(limit)
}

/**
 * Busca leads para reatribuição (antigos)
 */
leadSchema.statics.findForReassignment = function (hours = 24) {
  const cutoff = new Date()
  cutoff.setHours(cutoff.getHours() - hours)

  return this.find({
    isDistributed: false,
    assignedTo: { $exists: false },
    isDeleted: { $ne: true },
    createdAt: { $lt: cutoff },
    'distribution.attempts': { $lt: 5 },
  }).sort({ createdAt: 1 })
}

/**
 * Estatísticas de distribuição por corretor
 */
leadSchema.statics.getDistributionStats = async function (brokerId) {
  const pipeline = [
    {
      $match: {
        assignedTo: brokerId,
        isDeleted: { $ne: true },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        converted: {
          $sum: { $cond: [{ $eq: ['$status', 'convertido'] }, 1, 0] },
        },
        lost: {
          $sum: { $cond: [{ $eq: ['$status', 'perdido'] }, 1, 0] },
        },
        active: {
          $sum: {
            $cond: [
              {
                $in: [
                  '$status',
                  ['novo', 'em_andamento', 'contatado', 'em_negociacao'],
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]

  const result = await this.aggregate(pipeline)
  return result[0] || { total: 0, converted: 0, lost: 0, active: 0 }
}

/*
|--------------------------------------------------------------------------
| JSON
|--------------------------------------------------------------------------
*/

leadSchema.set('toJSON', {
  virtuals: true,

  versionKey: false,

  transform(doc, ret) {
    // 🔥 INCLUIR CAMPOS DE DISTRIBUIÇÃO NO RETORNO
    ret.isAssigned = doc.isAssigned
    ret.isAwaitingAssignment = doc.isAwaitingAssignment
    ret.wasAutoDistributed = doc.wasAutoDistributed // 🔥 NOME CORRIGIDO
    ret.distributionMethod = doc.distributionMethod
    ret.matchScore = doc.matchScore

    return ret
  },
})

/*
|--------------------------------------------------------------------------
| PRE-SAVE HOOK 🔥 NOVO
|--------------------------------------------------------------------------
*/

leadSchema.pre('save', function (next) {
  // 🔥 ATUALIZAR IS_DISTRIBUTED BASEADO NO ASSIGNEDTO
  if (this.assignedTo) {
    this.isDistributed = true
    if (!this.distributedAt) {
      this.distributedAt = new Date()
    }
    this.awaitingAssignment = false
  } else {
    this.isDistributed = false
  }

  // 🔥 ATUALIZAR STATUS DA DISTRIBUIÇÃO
  if (this.distribution) {
    if (this.assignedTo) {
      this.distribution.status = 'success'
      this.distribution.distributedAt = this.distributedAt || new Date()
    } else if (this.awaitingAssignment) {
      this.distribution.status = 'queue'
    }
  }

  next()
})

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

export default mongoose.model('Lead', leadSchema)
