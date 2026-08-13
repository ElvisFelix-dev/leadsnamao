import mongoose from 'mongoose'

const { Schema } = mongoose

/**
 * =========================================================
 * CONSTANTES
 * =========================================================
 */

export const OPPORTUNITY_STAGES = {
  NOVA: 'nova',
  QUALIFICACAO: 'qualificacao',
  IMOVEL_DEFINIDO: 'imovel_definido',
  VISITA_REALIZADA: 'visita_realizada',
  INTERESSE_CONFIRMADO: 'interesse_confirmado',
  PROPOSTA_SOLICITADA: 'proposta_solicitada',
  PROPOSTA_ENVIADA: 'proposta_enviada',
  NEGOCIACAO: 'negociacao',
  GANHA: 'ganha',
  PERDIDA: 'perdida',
}

export const OPPORTUNITY_STAGE_LIST = Object.values(OPPORTUNITY_STAGES)

export const OPPORTUNITY_STATUS = {
  OPEN: 'aberta',
  WON: 'ganha',
  LOST: 'perdida',
}

export const OPPORTUNITY_STATUS_LIST = Object.values(OPPORTUNITY_STATUS)

export const OPPORTUNITY_TYPES = {
  VENDA: 'venda',
  LOCACAO: 'locacao',
}

export const OPPORTUNITY_TYPE_LIST = Object.values(OPPORTUNITY_TYPES)

export const OPPORTUNITY_TEMPERATURE = {
  FRIO: 'frio',
  MORNO: 'morno',
  QUENTE: 'quente',
}

export const OPPORTUNITY_TEMPERATURE_LIST = Object.values(
  OPPORTUNITY_TEMPERATURE,
)

export const OPPORTUNITY_PRIORITIES = {
  BAIXA: 'baixa',
  MEDIA: 'media',
  ALTA: 'alta',
  URGENTE: 'urgente',
}

export const OPPORTUNITY_PRIORITY_LIST = Object.values(OPPORTUNITY_PRIORITIES)

/**
 * =========================================================
 * HISTÓRICO DE ESTÁGIOS
 * =========================================================
 *
 * Registra toda alteração no pipeline.
 *
 * Exemplo:
 *
 * nova
 *   ↓
 * qualificacao
 *
 * Quem alterou:
 * João
 *
 * Observação:
 * Cliente demonstrou interesse.
 */

const stageHistorySchema = new Schema(
  {
    from: {
      type: String,
      enum: OPPORTUNITY_STAGE_LIST,
      default: null,
    },

    to: {
      type: String,
      enum: OPPORTUNITY_STAGE_LIST,
      required: true,
    },

    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    changedAt: {
      type: Date,
      default: Date.now,
    },

    note: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
  },
  {
    _id: true,
  },
)

/**
 * =========================================================
 * HISTÓRICO DE RESPONSÁVEIS
 * =========================================================
 *
 * Registra todas as alterações de responsável
 * da oportunidade.
 *
 * Exemplo:
 *
 * Responsável anterior:
 * João
 *
 * Novo responsável:
 * Maria
 *
 * Alterado por:
 * Administrador
 */

const assignmentHistorySchema = new Schema(
  {
    from: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    to: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    changedAt: {
      type: Date,
      default: Date.now,
    },

    note: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
  },
  {
    _id: true,
  },
)

/**
 * =========================================================
 * HISTÓRICO DE INTERAÇÕES
 * =========================================================
 */

const interactionSchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        'ligacao',
        'whatsapp',
        'email',
        'mensagem',
        'visita',
        'reuniao',
        'nota',
        'outro',
      ],
      required: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

/**
 * =========================================================
 * SCHEMA PRINCIPAL
 * =========================================================
 */

const opportunitySchema = new Schema(
  {
    /**
     * -------------------------------------------------------
     * IDENTIFICAÇÃO
     * -------------------------------------------------------
     */

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: '',
    },

    /**
     * -------------------------------------------------------
     * RELACIONAMENTOS
     * -------------------------------------------------------
     */

    lead: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },

    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      default: null,
      index: true,
    },

    /**
     * -------------------------------------------------------
     * RESPONSÁVEL ATUAL
     * -------------------------------------------------------
     */

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /**
     * -------------------------------------------------------
     * CRIADOR
     * -------------------------------------------------------
     */

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /**
     * -------------------------------------------------------
     * NEGÓCIO
     * -------------------------------------------------------
     */

    type: {
      type: String,
      enum: OPPORTUNITY_TYPE_LIST,
      required: true,
      default: OPPORTUNITY_TYPES.VENDA,
      index: true,
    },

    stage: {
      type: String,
      enum: OPPORTUNITY_STAGE_LIST,
      default: OPPORTUNITY_STAGES.NOVA,
      index: true,
    },

    status: {
      type: String,
      enum: OPPORTUNITY_STATUS_LIST,
      default: OPPORTUNITY_STATUS.OPEN,
      index: true,
    },

    temperature: {
      type: String,
      enum: OPPORTUNITY_TEMPERATURE_LIST,
      default: OPPORTUNITY_TEMPERATURE.MORNO,
      index: true,
    },

    priority: {
      type: String,
      enum: OPPORTUNITY_PRIORITY_LIST,
      default: OPPORTUNITY_PRIORITIES.MEDIA,
      index: true,
    },

    /**
     * -------------------------------------------------------
     * VALORES
     * -------------------------------------------------------
     */

    estimatedValue: {
      type: Number,
      min: 0,
      default: 0,
    },

    expectedClosingValue: {
      type: Number,
      min: 0,
      default: 0,
    },

    probability: {
      type: Number,
      min: 0,
      max: 100,
      default: 20,
    },

    /**
     * -------------------------------------------------------
     * DATAS
     * -------------------------------------------------------
     */

    expectedClosingDate: {
      type: Date,
      default: null,
      index: true,
    },

    lastInteractionAt: {
      type: Date,
      default: null,
      index: true,
    },

    nextActionAt: {
      type: Date,
      default: null,
      index: true,
    },

    /**
     * -------------------------------------------------------
     * PRÓXIMA AÇÃO
     * -------------------------------------------------------
     */

    nextAction: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },

    /**
     * -------------------------------------------------------
     * ORIGEM
     * -------------------------------------------------------
     */

    source: {
      type: String,
      trim: true,
      maxlength: 100,
      default: 'manual',
      index: true,
    },

    /**
     * -------------------------------------------------------
     * MOTIVO DE PERDA
     * -------------------------------------------------------
     */

    lostReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },

    /**
     * -------------------------------------------------------
     * OBSERVAÇÕES
     * -------------------------------------------------------
     */

    notes: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },

    /**
     * =======================================================
     * HISTÓRICO
     * =======================================================
     */

    /**
     * -------------------------------------------------------
     * HISTÓRICO DO PIPELINE
     * -------------------------------------------------------
     */

    stageHistory: {
      type: [stageHistorySchema],
      default: [],
    },

    /**
     * -------------------------------------------------------
     * HISTÓRICO DE RESPONSÁVEIS
     * -------------------------------------------------------
     *
     * Aqui ficará registrado sempre que a oportunidade
     * mudar de corretor.
     */

    assignmentHistory: {
      type: [assignmentHistorySchema],
      default: [],
    },

    /**
     * -------------------------------------------------------
     * HISTÓRICO DE INTERAÇÕES
     * -------------------------------------------------------
     */

    interactions: {
      type: [interactionSchema],
      default: [],
    },

    /**
     * -------------------------------------------------------
     * CONVERSÃO
     * -------------------------------------------------------
     */

    wonAt: {
      type: Date,
      default: null,
      index: true,
    },

    lostAt: {
      type: Date,
      default: null,
      index: true,
    },

    /**
     * -------------------------------------------------------
     * PROPOSTA
     * -------------------------------------------------------
     */

    proposal: {
      type: Schema.Types.ObjectId,
      ref: 'Proposal',
      default: null,
    },

    /**
     * -------------------------------------------------------
     * VENDA
     * -------------------------------------------------------
     */

    sale: {
      type: Schema.Types.ObjectId,
      ref: 'Sale',
      default: null,
    },

    /**
     * -------------------------------------------------------
     * CONTROLE
     * -------------------------------------------------------
     */

    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
)

/**
 * =========================================================
 * ÍNDICES
 * =========================================================
 */

/**
 * Pipeline por responsável
 */
opportunitySchema.index({
  assignedTo: 1,
  status: 1,
  stage: 1,
})

/**
 * Oportunidades de um lead
 */
opportunitySchema.index({
  lead: 1,
  createdAt: -1,
})

/**
 * Oportunidades relacionadas a imóvel
 */
opportunitySchema.index({
  property: 1,
  status: 1,
})

/**
 * Fechamento previsto
 */
opportunitySchema.index({
  expectedClosingDate: 1,
  status: 1,
})

/**
 * Busca por criador
 */
opportunitySchema.index({
  createdBy: 1,
  createdAt: -1,
})

/**
 * Oportunidades abertas
 */
opportunitySchema.index({
  isArchived: 1,
  status: 1,
  assignedTo: 1,
})

/**
 =========================================================
 * VIRTUAL — VALOR PONDERADO
 * =========================================================
 *
 * Exemplo:
 *
 * Valor esperado: R$ 500.000
 * Probabilidade: 40%
 *
 * weightedValue:
 * R$ 200.000
 */

opportunitySchema.virtual('weightedValue').get(function () {
  const value = this.expectedClosingValue || this.estimatedValue || 0

  const probability = this.probability || 0

  return value * (probability / 100)
})

/**
 * =========================================================
 * VIRTUAL — TEM HISTÓRICO
 * =========================================================
 */

opportunitySchema.virtual('hasStageHistory').get(function () {
  return this.stageHistory?.length > 0
})

opportunitySchema.virtual('hasAssignmentHistory').get(function () {
  return this.assignmentHistory?.length > 0
})

opportunitySchema.virtual('hasInteractions').get(function () {
  return this.interactions?.length > 0
})

/**
 * =========================================================
 * JSON
 * =========================================================
 */

opportunitySchema.set('toJSON', {
  virtuals: true,
})

opportunitySchema.set('toObject', {
  virtuals: true,
})

/**
 * =========================================================
 * MODEL
 * =========================================================
 */

const Opportunity = mongoose.model('Opportunity', opportunitySchema)

export default Opportunity
