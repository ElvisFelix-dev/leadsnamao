import mongoose from 'mongoose'

import { LEAD_STAGE_LIST, LEAD_STAGES } from '../constants/leadStages.js'

import { LEAD_STATUS } from '../constants/leadStatus.js'

import { LEAD_PRIORITY, LEAD_PRIORITY_LIST } from '../constants/leadPriority.js'

import { LEAD_SOURCE_TYPE_LIST } from '../constants/leadSourceType.js'

/* ============================================================
   STAGE HISTORY
============================================================ */

const stageHistorySchema = new mongoose.Schema(
  {
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

    timeline: [
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
    ],

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
   LEAD SCHEMA
============================================================ */

const leadSchema = new mongoose.Schema(
  {
    /* ==========================================================
       DADOS DO LEAD
    ========================================================== */

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

    /* ==========================================================
       ORIGEM DO LEAD
    ========================================================== */

    /**
     * Canal tradicional da origem.
     *
     * Ex:
     * manual
     * public
     * meta
     * olx
     * zap
     * csv
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

    /**
     * Tipo específico da origem.
     *
     * Exemplos:
     *
     * site
     * broker_hotsite
     * property_page
     * portal
     * meta
     * manual
     * import
     * referral
     */

    sourceType: {
      type: String,

      enum: LEAD_SOURCE_TYPE_LIST,

      default: 'manual',

      required: true,

      index: true,
    },

    /**
     * Corretor responsável pela origem do lead.
     *
     * IMPORTANTE:
     *
     * Não representa necessariamente o corretor
     * atualmente responsável pelo lead.
     *
     * Exemplo:
     *
     * sourceBroker = Joe
     * assignedTo   = Maria
     *
     * Significa:
     *
     * "O lead veio do hotsite do Joe,
     * mas atualmente está sendo atendido pela Maria."
     */

    sourceBroker: {
      type: mongoose.Schema.Types.ObjectId,

      ref: 'User',

      default: null,

      index: true,
    },

    /**
     * Identificador do hotsite que originou o lead.
     *
     * Normalmente será o ID do corretor.
     *
     * Mantemos separado de sourceBroker porque
     * futuramente podemos ter outros tipos de landing page.
     */

    sourceSite: {
      type: String,

      default: '',

      trim: true,
    },

    /**
     * URL/página onde o lead iniciou o contato.
     */

    sourceUrl: {
      type: String,

      default: '',

      trim: true,
    },

    /**
     * Página específica do imóvel onde o contato aconteceu.
     */

    landingPage: {
      type: String,

      default: '',

      trim: true,
    },

    /**
     * URL de referência.
     *
     * Ex:
     * Google
     * Facebook
     * Instagram
     * outro site
     */

    referrer: {
      type: String,

      default: '',

      trim: true,
    },

    /* ==========================================================
       CAMPANHA / UTM
    ========================================================== */

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

    /* ==========================================================
       REGIÃO
    ========================================================== */

    region: {
      type: String,

      enum: [
        'central',
        'zona oeste',
        'zona leste',
        'zona sul',
        'zona norte',
        'abc',
      ],

      required: true,

      index: true,
    },

    /* ==========================================================
       STATUS GERAL
    ========================================================== */

    status: {
      type: String,

      enum: [
        LEAD_STATUS.NEW,
        LEAD_STATUS.IN_PROGRESS,
        LEAD_STATUS.CONVERTED,
        LEAD_STATUS.LOST,
      ],

      default: LEAD_STATUS.NEW,

      index: true,
    },

    /* ==========================================================
       PIPELINE COMERCIAL
    ========================================================== */

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

    /* ==========================================================
       PRIORIDADE
    ========================================================== */

    priority: {
      type: String,

      enum: LEAD_PRIORITY_LIST,

      default: LEAD_PRIORITY.MEDIUM,

      index: true,
    },

    /* ==========================================================
       SCORE
    ========================================================== */

    score: {
      type: Number,

      default: 0,

      min: 0,
    },

    /* ==========================================================
       ÚLTIMO CONTATO
    ========================================================== */

    lastContactAt: {
      type: Date,

      default: null,
    },

    /* ==========================================================
       OBSERVAÇÕES
    ========================================================== */

    notes: {
      type: String,

      default: '',

      trim: true,
    },

    /* ==========================================================
       HISTÓRICO DE CONTATOS
    ========================================================== */

    contactHistory: [
      {
        type: {
          type: String,

          enum: ['call', 'whatsapp', 'email', 'meeting', 'visit', 'note'],
        },

        description: {
          type: String,

          required: true,

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
    ],

    /* ==========================================================
       RELACIONAMENTO COM IMÓVEL
    ========================================================== */

    property: {
      type: mongoose.Schema.Types.ObjectId,

      ref: 'Property',

      default: null,

      index: true,
    },

    /* ==========================================================
       CRIADO POR
    ========================================================== */

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,

      ref: 'User',

      default: null,

      index: true,
    },

    /* ==========================================================
       CORRETOR RESPONSÁVEL
    ========================================================== */

    /**
     * Corretor que atualmente possui o lead.
     *
     * Pode ser:
     *
     * - automaticamente definido
     * - definido pelo admin
     * - alterado posteriormente
     */

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,

      ref: 'User',

      default: null,

      index: true,
    },

    /* ==========================================================
       DISTRIBUIÇÃO
    ========================================================== */

    /**
     * Indica se o lead está aguardando
     * distribuição pelo administrador.
     */

    awaitingAssignment: {
      type: Boolean,

      default: false,

      index: true,
    },

    /**
     * Indica como o lead foi distribuído.
     *
     * admin:
     * Admin escolheu manualmente.
     *
     * automatic:
     * Sistema distribuiu automaticamente.
     *
     * broker:
     * Já nasceu atribuído ao corretor,
     * normalmente através do hotsite.
     *
     * manual:
     * Cadastro manual.
     */

    assignmentType: {
      type: String,

      enum: ['admin', 'automatic', 'broker', 'manual'],

      default: 'manual',
    },

    /**
     * Data da atribuição atual.
     */

    assignedAt: {
      type: Date,

      default: null,
    },

    /**
     * Usuário/admin que realizou a distribuição.
     */

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,

      ref: 'User',

      default: null,
    },

    /* ==========================================================
       HISTÓRICO DE DISTRIBUIÇÃO
    ========================================================== */

    assignmentHistory: [
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

          enum: ['admin', 'automatic', 'broker', 'manual'],

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
    ],

    /* ==========================================================
       DADOS DA CAPTAÇÃO
    ========================================================== */

    /**
     * Identificador da sessão do visitante.
     *
     * Útil para relacionar:
     *
     * PropertyView
     * Favorite
     * Lead
     */

    sessionId: {
      type: String,

      default: '',

      trim: true,

      index: true,
    },

    /**
     * Identificador anônimo do visitante.
     */

    visitorId: {
      type: String,

      default: '',

      trim: true,

      index: true,
    },

    /* ==========================================================
       DATAS COMERCIAIS
    ========================================================== */

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

    /* ==========================================================
       PROPOSTA
    ========================================================== */

    proposalValue: {
      type: Number,

      default: 0,

      min: 0,
    },

    /* ==========================================================
       PERDA
    ========================================================== */

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

    /* ==========================================================
       PRÓXIMA AÇÃO
    ========================================================== */

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

/* ============================================================
   ÍNDICES
============================================================ */

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

/* ============================================================
   VIRTUALS
============================================================ */

/**
 * Lead já possui corretor responsável?
 */

leadSchema.virtual('isAssigned').get(function () {
  return !!this.assignedTo
})

/**
 * Lead está aguardando distribuição?
 */

leadSchema.virtual('isAwaitingAssignment').get(function () {
  return this.awaitingAssignment === true
})

/**
 * Lead veio de hotsite de corretor?
 */

leadSchema.virtual('isBrokerLead').get(function () {
  return this.sourceType === 'broker_hotsite'
})

/**
 * Lead veio do site da imobiliária?
 */

leadSchema.virtual('isCompanyLead').get(function () {
  return this.sourceType === 'site'
})

/**
 * Lead veio diretamente de uma página de imóvel?
 */

leadSchema.virtual('isPropertyLead').get(function () {
  return this.sourceType === 'property_page'
})

/* ============================================================
   JSON
============================================================ */

leadSchema.set('toJSON', {
  virtuals: true,

  versionKey: false,
})

/* ============================================================
   EXPORT
============================================================ */

export default mongoose.model('Lead', leadSchema)
