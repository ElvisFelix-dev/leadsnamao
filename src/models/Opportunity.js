import mongoose from 'mongoose'

const { Schema } = mongoose

/**
 * =========================================================
 * CONSTANTES
 * =========================================================
 */

/**
 * =========================================================
 * PIPELINE DA OPORTUNIDADE
 * =========================================================
 *
 * IMPORTANTE:
 *
 * Os estágios representam o PROCESSO COMERCIAL.
 *
 * GANHA / PERDIDA NÃO são stages.
 *
 * O resultado final é controlado por:
 *
 * opportunity.status
 *
 * Dessa forma:
 *
 * Opportunity.stage
 *       ↓
 * nova
 * qualificacao
 * imovel_definido
 * visita_realizada
 * interesse_confirmado
 * proposta_solicitada
 * proposta_enviada
 * negociacao
 *
 * E o resultado:
 *
 * status = aberta
 * status = ganha
 * status = perdida
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
}

export const OPPORTUNITY_STAGE_LIST = Object.values(OPPORTUNITY_STAGES)

/**
 * =========================================================
 * STATUS DA OPORTUNIDADE
 * =========================================================
 *
 * O status representa o RESULTADO do negócio.
 */

export const OPPORTUNITY_STATUS = {
  OPEN: 'aberta',
  WON: 'ganha',
  LOST: 'perdida',
}

export const OPPORTUNITY_STATUS_LIST = Object.values(OPPORTUNITY_STATUS)

/**
 * =========================================================
 * TIPOS
 * =========================================================
 */

export const OPPORTUNITY_TYPES = {
  VENDA: 'venda',
  LOCACAO: 'locacao',
}

export const OPPORTUNITY_TYPE_LIST = Object.values(OPPORTUNITY_TYPES)

/**
 * =========================================================
 * TEMPERATURA
 * =========================================================
 */

export const OPPORTUNITY_TEMPERATURE = {
  FRIO: 'frio',
  MORNO: 'morno',
  QUENTE: 'quente',
}

export const OPPORTUNITY_TEMPERATURE_LIST = Object.values(
  OPPORTUNITY_TEMPERATURE,
)

/**
 * =========================================================
 * PRIORIDADES
 * =========================================================
 */

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
 * Registra toda alteração no pipeline da oportunidade.
 *
 * Exemplo:
 *
 * nova
 *   ↓
 * qualificacao
 *   ↓
 * imovel_definido
 *   ↓
 * visita_realizada
 *   ↓
 * negociacao
 *
 * O GANHA/PERDIDA não entra aqui.
 *
 * O resultado é controlado pelo status.
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
 * João
 *   ↓
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
     * =======================================================
     * IDENTIFICAÇÃO
     * =======================================================
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
     * =======================================================
     * RELACIONAMENTOS
     * =======================================================
     */

    /**
     * Lead relacionado.
     *
     * Toda oportunidade pertence a um Lead.
     */

    lead: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },

    /**
     * Imóvel relacionado.
     *
     * Pode ser definido posteriormente.
     */

    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      default: null,
      index: true,
    },

    /**
     * =======================================================
     * RESPONSÁVEL ATUAL
     * =======================================================
     */

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /**
     * =======================================================
     * CRIADOR
     * =======================================================
     */

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /**
     * =======================================================
     * NEGÓCIO
     * =======================================================
     */

    type: {
      type: String,
      enum: OPPORTUNITY_TYPE_LIST,
      required: true,
      default: OPPORTUNITY_TYPES.VENDA,
      index: true,
    },

    /**
     * =======================================================
     * STAGE
     * =======================================================
     *
     * Somente etapas do processo comercial.
     *
     * NÃO contém:
     *
     * ganha
     * perdida
     */

    stage: {
      type: String,
      enum: OPPORTUNITY_STAGE_LIST,
      default: OPPORTUNITY_STAGES.NOVA,
      index: true,
    },

    /**
     * =======================================================
     * STATUS
     * =======================================================
     *
     * Resultado da oportunidade.
     *
     * aberta
     * ganha
     * perdida
     */

    status: {
      type: String,
      enum: OPPORTUNITY_STATUS_LIST,
      default: OPPORTUNITY_STATUS.OPEN,
      index: true,
    },

    /**
     * =======================================================
     * TEMPERATURA
     * =======================================================
     */

    temperature: {
      type: String,
      enum: OPPORTUNITY_TEMPERATURE_LIST,
      default: OPPORTUNITY_TEMPERATURE.MORNO,
      index: true,
    },

    /**
     * =======================================================
     * PRIORIDADE
     * =======================================================
     */

    priority: {
      type: String,
      enum: OPPORTUNITY_PRIORITY_LIST,
      default: OPPORTUNITY_PRIORITIES.MEDIA,
      index: true,
    },

    /**
     * =======================================================
     * VALORES
     * =======================================================
     */

    /**
     * Valor estimado inicialmente.
     */

    estimatedValue: {
      type: Number,
      min: 0,
      default: 0,
    },

    /**
     * Valor esperado para fechamento.
     */

    expectedClosingValue: {
      type: Number,
      min: 0,
      default: 0,
    },

    /**
     * Probabilidade de fechamento.
     *
     * 0 - 100
     */

    probability: {
      type: Number,
      min: 0,
      max: 100,
      default: 20,
    },

    /**
     * =======================================================
     * DATAS
     * =======================================================
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
     * =======================================================
     * PRÓXIMA AÇÃO
     * =======================================================
     */

    nextAction: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },

    /**
     * =======================================================
     * ORIGEM
     * =======================================================
     */

    source: {
      type: String,
      trim: true,
      maxlength: 100,
      default: 'manual',
      index: true,
    },

    /**
     * =======================================================
     * MOTIVO DE PERDA
     * =======================================================
     *
     * Só deve ser preenchido quando:
     *
     * status = perdida
     */

    lostReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },

    /**
     * =======================================================
     * OBSERVAÇÕES
     * =======================================================
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
     * =======================================================
     * RESULTADO / CONVERSÃO
     * =======================================================
     */

    /**
     * Data em que a oportunidade foi ganha.
     *
     * IMPORTANTE:
     *
     * Isto não representa o Lead.stage.
     *
     * É o registro do fechamento da oportunidade.
     */

    wonAt: {
      type: Date,
      default: null,
      index: true,
    },

    /**
     * Data em que a oportunidade foi perdida.
     */

    lostAt: {
      type: Date,
      default: null,
      index: true,
    },

    /**
     * =======================================================
     * PROPOSTA
     * =======================================================
     *
     * Fluxo:
     *
     * Opportunity
     *      ↓
     * Proposal
     */

    proposal: {
      type: Schema.Types.ObjectId,
      ref: 'Proposal',
      default: null,
      index: true,
    },

    /**
     * =======================================================
     * VENDA
     * =======================================================
     *
     * Fluxo:
     *
     * Opportunity
     *      ↓
     * Proposal
     *      ↓
     * Sale
     *
     * Quando a venda for criada:
     *
     * opportunity.sale = sale._id
     *
     * opportunity.status = ganha
     */

    sale: {
      type: Schema.Types.ObjectId,
      ref: 'Sale',
      default: null,
      index: true,
    },

    /**
     * =======================================================
     * CONTROLE
     * =======================================================
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
 * Pipeline por responsável.
 */

opportunitySchema.index({
  assignedTo: 1,
  status: 1,
  stage: 1,
})

/**
 * Oportunidades de um lead.
 */

opportunitySchema.index({
  lead: 1,
  createdAt: -1,
})

/**
 * Oportunidades relacionadas a imóvel.
 */

opportunitySchema.index({
  property: 1,
  status: 1,
})

/**
 * Fechamento previsto.
 */

opportunitySchema.index({
  expectedClosingDate: 1,
  status: 1,
})

/**
 * Busca por criador.
 */

opportunitySchema.index({
  createdBy: 1,
  createdAt: -1,
})

/**
 * Oportunidades abertas.
 */

opportunitySchema.index({
  isArchived: 1,
  status: 1,
  assignedTo: 1,
})

/**
 * Oportunidades por proposta.
 */

opportunitySchema.index({
  proposal: 1,
})

/**
 * Oportunidades por venda.
 */

opportunitySchema.index({
  sale: 1,
})

/**
 * =========================================================
 * VIRTUAL — VALOR PONDERADO
 * =========================================================
 *
 * Exemplo:
 *
 * Valor esperado: R$ 500.000
 * Probabilidade: 40%
 *
 * weightedValue:
 *
 * R$ 200.000
 */

opportunitySchema.virtual('weightedValue').get(function () {
  const value = this.expectedClosingValue || this.estimatedValue || 0

  const probability = this.probability || 0

  return value * (probability / 100)
})

/**
 * =========================================================
 * VIRTUAL — OPORTUNIDADE ABERTA
 * =========================================================
 */

opportunitySchema.virtual('isOpen').get(function () {
  return this.status === OPPORTUNITY_STATUS.OPEN
})

/**
 * =========================================================
 * VIRTUAL — OPORTUNIDADE GANHA
 * =========================================================
 */

opportunitySchema.virtual('isWon').get(function () {
  return this.status === OPPORTUNITY_STATUS.WON
})

/**
 * =========================================================
 * VIRTUAL — OPORTUNIDADE PERDIDA
 * =========================================================
 */

opportunitySchema.virtual('isLost').get(function () {
  return this.status === OPPORTUNITY_STATUS.LOST
})

/**
 * =========================================================
 * VIRTUAL — TEM PROPOSTA
 * =========================================================
 */

opportunitySchema.virtual('hasProposal').get(function () {
  return Boolean(this.proposal)
})

/**
 * =========================================================
 * VIRTUAL — TEM VENDA
 * =========================================================
 */

opportunitySchema.virtual('hasSale').get(function () {
  return Boolean(this.sale)
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
