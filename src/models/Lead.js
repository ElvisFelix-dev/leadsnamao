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
    | REGIÃO
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | STATUS GERAL
    |--------------------------------------------------------------------------
    */

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

      enum: ['admin', 'automatic', 'broker', 'manual'],

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
    | HISTÓRICO DE DISTRIBUIÇÃO
    |--------------------------------------------------------------------------
    */

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
| VIRTUALS
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
  return this.awaitingAssignment === true
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
| EXPORT
|--------------------------------------------------------------------------
*/

export default mongoose.model('Lead', leadSchema)
