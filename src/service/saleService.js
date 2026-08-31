import mongoose from 'mongoose'

import Sale, {
  SALE_STATUS,
  SALE_PAYMENT_STATUS,
  SALE_POPULATE,
} from '../models/Sale.js'

import { LEAD_STAGES } from '../constants/leadStages.js'
import { PROPERTY_STATUS } from '../constants/propertyStatus.js'

import Proposal, { PROPOSAL_STATUS } from '../models/Proposal.js'
import Lead from '../models/Lead.js'
import Property from '../models/Property.js'
import User from '../models/User.js'
import CommissionService from './commissionService.js'

/*
|--------------------------------------------------------------------------
| CONSTANTES
|--------------------------------------------------------------------------
*/

const ADMIN_ROLE = 'admin'
const BROKER_ROLE = 'broker'

const SALE_COUNTER_KEY = 'sale_number'

/*
|--------------------------------------------------------------------------
| PIPELINE
|--------------------------------------------------------------------------
*/

const PIPELINE_STAGES = {
  NEGOTIATION: LEAD_STAGES.NEGOTIATION,
  WON: LEAD_STAGES.WON,
}

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

/**
 * Verifica se é administrador.
 */
const isAdmin = (user) => {
  return user?.role === ADMIN_ROLE
}

/**
 * Verifica se é corretor.
 */
const isBroker = (user) => {
  return user?.role === BROKER_ROLE
}

/**
 * Cria erro padronizado.
 */
const createError = (message, statusCode = 400) => {
  const error = new Error(message)

  error.statusCode = statusCode

  return error
}

/**
 * Obtém ID do usuário de forma segura.
 */
const getUserId = (user) => {
  return user?._id || user?.id || user
}

/**
 * Valida ObjectId.
 */
const getObjectId = (id, fieldName = 'ID') => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw createError(`${fieldName} inválido.`, 400)
  }

  return new mongoose.Types.ObjectId(id)
}

/**
 * Normaliza número.
 */
const normalizeNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return 0
  }

  const number = Number(value)

  return Number.isFinite(number) ? number : 0
}

/**
 * Arredondamento monetário.
 */
const roundMoney = (value) => {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

/**
 * Formata moeda para histórico.
 */
const formatCurrency = (value) => {
  return Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Verifica se um status de venda existe.
 */
const isValidSaleStatus = (status) => {
  return Object.values(SALE_STATUS).includes(status)
}

/**
 * Verifica se um status financeiro existe.
 */
const isValidPaymentStatus = (status) => {
  return Object.values(SALE_PAYMENT_STATUS).includes(status)
}

/**
 * Cria uma sessão opcionalmente.
 */
const applySession = (query, session) => {
  if (session) {
    query.session(session)
  }

  return query
}

/*
|--------------------------------------------------------------------------
| PERMISSÕES
|--------------------------------------------------------------------------
*/

/**
 * Verifica acesso à venda.
 *
 * Admin:
 *   qualquer venda.
 *
 * Broker:
 *   somente vendas onde é vendedor.
 */
const validateSaleAccess = ({ sale, user }) => {
  if (!sale) {
    throw createError('Venda não encontrada.', 404)
  }

  if (isAdmin(user)) {
    return true
  }

  if (!isBroker(user)) {
    throw createError('Usuário sem permissão para trabalhar com vendas.', 403)
  }

  const sellerBrokerId = sale.sellerBroker?._id || sale.sellerBroker

  if (!sellerBrokerId || String(sellerBrokerId) !== String(getUserId(user))) {
    throw createError('Você não é o corretor responsável por esta venda.', 403)
  }

  return true
}

/**
 * Apenas administrador.
 */
const validateAdmin = (user, message) => {
  if (!isAdmin(user)) {
    throw createError(
      message || 'Somente administradores podem realizar esta ação.',
      403,
    )
  }
}

/*
|--------------------------------------------------------------------------
| STATUS
|--------------------------------------------------------------------------
*/

/**
 * Máquina de estados da venda.
 *
 * Fluxo:
 *
 * PENDING
 *    ↓
 * CONTRACT
 *    ↓
 * COMPLETED
 *
 * Cancelamento:
 *
 * PENDING   → CANCELLED
 * CONTRACT  → CANCELLED
 *
 * Estados finais:
 *
 * COMPLETED
 * CANCELLED
 */
const validateSaleStatusTransition = ({ previousStatus, nextStatus }) => {
  if (previousStatus === nextStatus) {
    return true
  }

  if (previousStatus === SALE_STATUS.COMPLETED) {
    throw createError('Uma venda concluída não pode ter o status alterado.')
  }

  if (previousStatus === SALE_STATUS.CANCELLED) {
    throw createError('Uma venda cancelada não pode ter o status alterado.')
  }

  if (previousStatus === SALE_STATUS.PENDING) {
    const allowed = [
      SALE_STATUS.CONTRACT,
      SALE_STATUS.COMPLETED,
      SALE_STATUS.CANCELLED,
    ]

    if (!allowed.includes(nextStatus)) {
      throw createError(
        `Não é permitido alterar uma venda "${previousStatus}" para "${nextStatus}".`,
      )
    }

    return true
  }

  if (previousStatus === SALE_STATUS.CONTRACT) {
    const allowed = [SALE_STATUS.COMPLETED, SALE_STATUS.CANCELLED]

    if (!allowed.includes(nextStatus)) {
      throw createError(
        `Não é permitido alterar uma venda "${previousStatus}" para "${nextStatus}".`,
      )
    }

    return true
  }

  throw createError(
    `Transição de status inválida: "${previousStatus}" → "${nextStatus}".`,
  )
}

/*
|--------------------------------------------------------------------------
| BUSCAS
|--------------------------------------------------------------------------
*/

/**
 * Busca proposta dentro da sessão.
 */
const getProposal = async ({ proposalId, session = null }) => {
  const id = getObjectId(proposalId, 'Proposta')

  const query = Proposal.findById(id)

  applySession(query, session)

  return query
}

/**
 * Busca Lead dentro da sessão.
 */
const getLead = async ({ leadId, session = null }) => {
  const id = getObjectId(leadId, 'Lead')

  const query = Lead.findById(id)

  applySession(query, session)

  return query
}

/**
 * Busca imóvel dentro da sessão.
 */
const getProperty = async ({ propertyId, session = null }) => {
  const id = getObjectId(propertyId, 'Imóvel')

  const query = Property.findById(id)

  applySession(query, session)

  return query
}

/**
 * Busca usuário dentro da sessão.
 */
const getUser = async ({ userId, session = null }) => {
  const id = getObjectId(userId, 'Usuário')

  const query = User.findById(id)

  applySession(query, session)

  return query
}

/*
|--------------------------------------------------------------------------
| VALIDAÇÕES
|--------------------------------------------------------------------------
*/

/**
 * Valida corretor vendedor.
 *
 * Proposal.broker
 */
const validateSellerBroker = async ({ brokerId, session = null }) => {
  if (!brokerId) {
    throw createError('A proposta não possui um corretor vendedor.')
  }

  const broker = await getUser({
    userId: brokerId,
    session,
  })

  if (!broker) {
    throw createError('Corretor vendedor não encontrado.', 404)
  }

  if (broker.role !== BROKER_ROLE) {
    throw createError('O usuário responsável pela proposta não é um corretor.')
  }

  return broker
}

/**
 * Valida corretor captador.
 *
 * Property.captation.broker
 */
const validateAcquisitionBroker = async ({ property, session = null }) => {
  const brokerId = property?.captation?.broker

  if (!brokerId) {
    return null
  }

  const broker = await getUser({
    userId: brokerId,
    session,
  })

  if (!broker) {
    throw createError(
      'O corretor captador informado no imóvel não foi encontrado.',
      404,
    )
  }

  if (broker.role !== BROKER_ROLE) {
    throw createError('O usuário responsável pela captação não é um corretor.')
  }

  return broker
}

/*
|--------------------------------------------------------------------------
| VALORES DA PROPOSTA
|--------------------------------------------------------------------------
*/

/**
 * Valida e normaliza os valores financeiros.
 */
const validateProposalValues = (proposal) => {
  const values = proposal.values || {}

  const saleAmount = normalizeNumber(values.proposalPrice)

  const proposalAmount = normalizeNumber(values.proposalPrice)

  const downPayment = normalizeNumber(values.downPayment)

  const financing = normalizeNumber(values.financing)

  const fgts = normalizeNumber(values.fgts)

  if (saleAmount <= 0) {
    throw createError('O valor da proposta deve ser maior que zero.')
  }

  if (downPayment < 0) {
    throw createError('O valor da entrada não pode ser negativo.')
  }

  if (financing < 0) {
    throw createError('O valor do financiamento não pode ser negativo.')
  }

  if (fgts < 0) {
    throw createError('O valor do FGTS não pode ser negativo.')
  }

  const totalAllocated = roundMoney(downPayment + financing + fgts)

  if (totalAllocated > saleAmount) {
    throw createError(
      'A soma da entrada, financiamento e FGTS não pode ser maior que o valor da venda.',
    )
  }

  const balance = roundMoney(
    Math.max(saleAmount - downPayment - financing - fgts, 0),
  )

  return {
    saleAmount: roundMoney(saleAmount),
    proposalAmount: roundMoney(proposalAmount),
    downPayment: roundMoney(downPayment),
    financing: roundMoney(financing),
    fgts: roundMoney(fgts),
    balance,
  }
}

/*
|--------------------------------------------------------------------------
| COMISSÕES
|--------------------------------------------------------------------------
*/

/**
 * Normaliza configuração da comissão.
 *
 * totalPercentage:
 *   percentual total da venda destinado à comissão.
 *
 * sellerPercentage:
 *   percentual da comissão destinado ao vendedor.
 *
 * acquisitionPercentage:
 *   percentual da comissão destinado ao captador.
 *
 * companyPercentage:
 *   percentual da comissão destinado à imobiliária.
 */
const normalizeCommissionInput = ({
  property,
  saleAmount,
  commission = {},
}) => {
  const totalPercentage = normalizeNumber(commission.totalPercentage)

  const sellerPercentage = normalizeNumber(commission.sellerPercentage)

  /*
   * O percentual do captador vem do imóvel.
   */
  const acquisitionPercentage = property?.captation?.broker
    ? normalizeNumber(property?.captation?.percentage)
    : 0

  const companyPercentage = normalizeNumber(commission.companyPercentage)

  if (totalPercentage < 0) {
    throw createError('O percentual total da comissão não pode ser negativo.')
  }

  if (sellerPercentage < 0) {
    throw createError('O percentual do vendedor não pode ser negativo.')
  }

  if (acquisitionPercentage < 0) {
    throw createError('O percentual do captador não pode ser negativo.')
  }

  if (companyPercentage < 0) {
    throw createError('O percentual da imobiliária não pode ser negativo.')
  }

  if (totalPercentage <= 0) {
    throw createError('O percentual total da comissão deve ser maior que zero.')
  }

  const distributedShare = roundMoney(
    sellerPercentage + acquisitionPercentage + companyPercentage,
  )

  if (Math.abs(distributedShare - 100) > 0.0001) {
    throw createError(
      `A distribuição da comissão deve totalizar 100%. Atualmente está em ${distributedShare}%.`,
    )
  }

  const totalAmount = roundMoney(saleAmount * (totalPercentage / 100))

  const sellerAmount = roundMoney(totalAmount * (sellerPercentage / 100))

  const acquisitionAmount = roundMoney(
    totalAmount * (acquisitionPercentage / 100),
  )

  const companyAmount = roundMoney(totalAmount * (companyPercentage / 100))

  const distributedAmount = roundMoney(
    sellerAmount + acquisitionAmount + companyAmount,
  )

  if (Math.abs(distributedAmount - totalAmount) > 0.02) {
    throw createError(
      'Os valores distribuídos da comissão não correspondem à comissão total.',
    )
  }

  return {
    totalPercentage: roundMoney(totalPercentage),

    totalAmount,

    seller: {
      broker: null,
      percentage: roundMoney(sellerPercentage),
      amount: sellerAmount,
    },

    acquisition: {
      broker: property?.captation?.broker || null,
      percentage: roundMoney(acquisitionPercentage),
      amount: acquisitionAmount,
    },

    company: {
      percentage: roundMoney(companyPercentage),
      amount: companyAmount,
    },
  }
}

/*
|--------------------------------------------------------------------------
| HISTÓRICO DO LEAD
|--------------------------------------------------------------------------
*/

/**
 * Adiciona uma entrada no contactHistory.
 */
const addLeadContactHistory = ({ lead, description, performedBy }) => {
  if (!Array.isArray(lead.contactHistory)) {
    lead.contactHistory = []
  }

  lead.contactHistory.push({
    type: 'note',
    description,
    createdBy: performedBy,
    createdAt: new Date(),
  })
}

/**
 * Adiciona evento à timeline.
 */
const addLeadTimeline = ({ lead, action, performedBy, description }) => {
  const now = new Date()

  if (!Array.isArray(lead.stageHistory)) {
    lead.stageHistory = []
  }

  let currentHistory = lead.stageHistory[lead.stageHistory.length - 1]

  /*
   * Cria histórico inicial.
   */
  if (!currentHistory) {
    lead.stageHistory.push({
      stage: lead.stage,
      changedBy: performedBy,
      changedAt: now,
      timeline: [],
    })

    currentHistory = lead.stageHistory[lead.stageHistory.length - 1]
  }

  if (!Array.isArray(currentHistory.timeline)) {
    currentHistory.timeline = []
  }

  currentHistory.timeline.push({
    action,
    description,
    createdBy: performedBy,
    createdAt: now,
  })
}

/**
 * Registra evento completo relacionado à venda.
 */
const addLeadSaleHistory = async ({
  lead,
  sale,
  action,
  performedBy,
  description,
  session = null,
}) => {
  const saleReference = sale?.saleNumber || sale?._id

  const finalDescription = `${description} Venda: ${saleReference}.`

  addLeadContactHistory({
    lead,
    description: finalDescription,
    performedBy,
  })

  addLeadTimeline({
    lead,
    action,
    performedBy,
    description: finalDescription,
  })

  await lead.save({
    session,
  })
}

/*
|--------------------------------------------------------------------------
| PIPELINE
|--------------------------------------------------------------------------
*/

/**
 * Atualiza estágio do Lead.
 */
const updateLeadStage = async ({
  lead,
  newStage,
  performedBy,
  reason,
  session = null,
}) => {
  const previousStage = lead.stage
  const now = new Date()

  /*
   * Se já estiver no estágio,
   * registra somente atividade.
   */
  if (previousStage === newStage) {
    addLeadTimeline({
      lead,
      action: 'pipeline_updated',
      performedBy,
      description: reason,
    })

    await lead.save({
      session,
    })

    return lead
  }

  lead.stage = newStage

  if (!Array.isArray(lead.stageHistory)) {
    lead.stageHistory = []
  }

  lead.stageHistory.push({
    stage: newStage,
    changedBy: performedBy,
    changedAt: now,
    timeline: [
      {
        action: 'stage_changed',
        description: reason,
        createdBy: performedBy,
        createdAt: now,
      },
    ],
  })

  await lead.save({
    session,
  })

  return lead
}

/*
|--------------------------------------------------------------------------
| VENDA - NUMERAÇÃO
|--------------------------------------------------------------------------
*/

/**
 * Gera número sequencial de venda.
 *
 * Utiliza documento atômico na coleção
 * "counters" para evitar colisões.
 */
const generateSaleNumber = async ({ session = null }) => {
  const countersCollection = mongoose.connection.db.collection('counters')

  const options = {
    upsert: true,
    returnDocument: 'after',
  }

  if (session) {
    options.session = session
  }

  const result = await countersCollection.findOneAndUpdate(
    {
      _id: SALE_COUNTER_KEY,
    },
    {
      $inc: {
        sequence: 1,
      },
    },
    options,
  )

  const sequence = result?.value?.sequence ?? result?.sequence

  if (!sequence) {
    throw createError('Não foi possível gerar o número da venda.', 500)
  }

  return `VEN-${String(sequence).padStart(6, '0')}`
}

/**
 * Procura venda criada a partir de determinada proposta.
 */
const findSaleByProposal = async ({ proposalId, session = null }) => {
  const query = Sale.findOne({
    proposal: proposalId,
  })

  applySession(query, session)

  return query
}

/*
|--------------------------------------------------------------------------
| IMÓVEL
|--------------------------------------------------------------------------
*/

/**
 * Marca imóvel como reservado.
 */
export const markPropertyAsReserved = async ({ property, session = null }) => {
  if (!property?._id) {
    throw createError('Imóvel inválido para atualização.')
  }

  /*
   * Não permitimos reservar imóvel vendido.
   */
  if (property.status === PROPERTY_STATUS.SOLD) {
    throw createError('Um imóvel vendido não pode ser reservado.', 409)
  }

  const update = {
    $set: {
      status: PROPERTY_STATUS.RESERVED,
      active: false,
      published: false,
    },
  }

  const query = Property.updateOne(
    {
      _id: property._id,
    },
    update,
  )

  applySession(query, session)

  const result = await query

  if (!result.matchedCount) {
    throw createError('Imóvel não encontrado para atualização.', 404)
  }

  property.status = PROPERTY_STATUS.RESERVED

  property.active = false
  property.published = false

  return property
}

/**
 * Marca imóvel como vendido.
 */
const markPropertyAsSold = async ({ property, sale, session = null }) => {
  if (!property) {
    throw createError('Imóvel não encontrado.', 404)
  }

  const completedAt = sale.completedAt || new Date()

  const update = {
    $set: {
      status: PROPERTY_STATUS.SOLD,
      soldAt: completedAt,
      active: false,
      published: false,
    },
  }

  if (sale.updatedBy) {
    update.$set.updatedBy = sale.updatedBy
  }

  const query = Property.updateOne(
    {
      _id: property._id,
    },
    update,
  )

  applySession(query, session)

  const result = await query

  if (!result.matchedCount) {
    throw createError('Imóvel não encontrado para atualização.', 404)
  }

  property.status = PROPERTY_STATUS.SOLD

  property.soldAt = completedAt
  property.active = false
  property.published = false

  return property
}

/**
 * Libera imóvel.
 */
export const releaseProperty = async ({ property, session = null }) => {
  if (!property?._id) {
    throw createError('Imóvel inválido para atualização.')
  }

  const update = {
    $set: {
      status: PROPERTY_STATUS.AVAILABLE,
      active: true,
      published: true,
    },
  }

  const query = Property.updateOne(
    {
      _id: property._id,
    },
    update,
  )

  applySession(query, session)

  const result = await query

  if (!result.matchedCount) {
    throw createError('Imóvel não encontrado para atualização.', 404)
  }

  property.status = PROPERTY_STATUS.AVAILABLE

  property.active = true
  property.published = true

  return property
}

/*
|--------------------------------------------------------------------------
| HELPERS DE FLUXO DA VENDA
|--------------------------------------------------------------------------
*/

/**
 * Finaliza venda dentro de uma transaction.
 *
 * Responsabilidades:
 *
 * Sale → COMPLETED
 * Property → SOLD
 * Lead → WON
 * Lead History
 */
const finalizeSale = async ({ sale, user, lead, property, session }) => {
  const performedBy = getUserId(user)

  // Garante completedAt.
  if (!sale.completedAt) {
    sale.completedAt = new Date()
  }

  // Imóvel → vendido.
  await markPropertyAsSold({
    property,
    sale,
    session,
  })

  // Lead → ganho.
  await updateLeadStage({
    lead,
    newStage: PIPELINE_STAGES.WON,
    performedBy,
    reason: `Venda ${sale.saleNumber} concluída no valor de R$ ${formatCurrency(
      sale.saleAmount,
    )}.`,
    session,
  })

  // Histórico.
  await addLeadSaleHistory({
    lead,
    sale,
    action: 'sale_completed',
    performedBy,
    description: `Venda concluída no valor de R$ ${formatCurrency(
      sale.saleAmount,
    )}.`,
    session,
  })

  // ==========================================
  // 🔥 NOVO: GERA COMISSÃO AUTOMATICAMENTE
  // ==========================================
  try {
    await CommissionService.generateFromSale(sale._id, performedBy)
    console.log(`✅ Comissão gerada para venda ${sale.saleNumber}`)
  } catch (commissionError) {
    // Log do erro, mas não interrompe o fluxo
    console.error(
      `❌ Erro ao gerar comissão para venda ${sale.saleNumber}:`,
      commissionError.message,
    )
    // Opcional: enviar notificação para admin
  }
}

/**
 * Processa venda em contrato.
 */
const processContractSale = async ({ sale, user, session }) => {
  const performedBy = getUserId(user)

  const lead = await Lead.findById(sale.lead).session(session)

  if (lead) {
    await addLeadSaleHistory({
      lead,
      sale,
      action: 'sale_contract_started',
      performedBy,
      description: 'Venda avançou para contrato.',
      session,
    })
  }

  const property = await Property.findById(sale.property).session(session)

  if (property && property.status !== PROPERTY_STATUS.SOLD) {
    await markPropertyAsReserved({
      property,
      session,
    })
  }
}

/**
 * Processa venda cancelada.
 */
const processCancelledSale = async ({
  sale,
  user,
  previousStatus,
  reason,
  session,
}) => {
  const performedBy = getUserId(user)

  /*
   * Imóvel.
   */
  const property = await Property.findById(sale.property).session(session)

  if (property) {
    /*
     * Procuramos outra venda ativa.
     */
    const activeSale = await Sale.findOne({
      property: sale.property,
      _id: {
        $ne: sale._id,
      },
      status: {
        $in: [SALE_STATUS.PENDING, SALE_STATUS.CONTRACT, SALE_STATUS.COMPLETED],
      },
    }).session(session)

    /*
     * Só libera se não existir
     * outra venda ativa.
     */
    if (!activeSale) {
      await releaseProperty({
        property,
        session,
      })
    }
  }

  /*
   * Lead.
   */
  const lead = await Lead.findById(sale.lead).session(session)

  if (lead) {
    await addLeadSaleHistory({
      lead,
      sale,
      action: 'sale_cancelled',
      performedBy,
      description: `Venda cancelada. Status anterior: "${previousStatus}". Motivo: ${reason}`,
      session,
    })
  }
}

/*
|--------------------------------------------------------------------------
| CREATE SALE FROM PROPOSAL
|--------------------------------------------------------------------------
*/

/**
 * Converte uma proposta aprovada em venda.
 */
export const createSaleFromProposal = async ({
  proposalId,
  user,
  data = {},
}) => {
  const session = await mongoose.startSession()

  try {
    let createdSaleId = null

    await session.withTransaction(async () => {
      /*
       * Proposta.
       */
      const proposal = await getProposal({
        proposalId,
        session,
      })

      if (!proposal) {
        throw createError('Proposta não encontrada.', 404)
      }

      if (proposal.isDeleted) {
        throw createError('Esta proposta foi removida.')
      }

      if (proposal.status !== PROPOSAL_STATUS.ACCEPTED) {
        throw createError(
          'Somente propostas aprovadas podem ser convertidas em venda.',
        )
      }

      /*
       * Permissão.
       */
      if (!isAdmin(user)) {
        if (!isBroker(user)) {
          throw createError(
            'Usuário sem permissão para converter propostas em vendas.',
            403,
          )
        }

        if (String(proposal.broker) !== String(getUserId(user))) {
          throw createError(
            'Você não é o corretor responsável por esta proposta.',
            403,
          )
        }
      }

      /*
       * Uma proposta só pode gerar uma venda.
       */
      const existingSale = await findSaleByProposal({
        proposalId: proposal._id,
        session,
      })

      if (existingSale) {
        throw createError(
          `Esta proposta já foi convertida na venda ${
            existingSale.saleNumber || existingSale._id
          }.`,
          409,
        )
      }

      /*
       * Lead.
       */
      const lead = await getLead({
        leadId: proposal.lead,
        session,
      })

      if (!lead) {
        throw createError('Lead não encontrado.', 404)
      }

      /*
       * Imóvel.
       */
      const property = await getProperty({
        propertyId: proposal.property,
        session,
      })

      if (!property) {
        throw createError('Imóvel não encontrado.', 404)
      }

      if (property.isDeleted) {
        throw createError('Este imóvel foi removido.')
      }

      if (property.status === PROPERTY_STATUS.SOLD) {
        throw createError('Este imóvel já foi vendido.', 409)
      }

      /*
       * Imóvel reservado.
       */
      if (property.status === PROPERTY_STATUS.RESERVED) {
        const activeSale = await Sale.findOne({
          property: property._id,
          status: {
            $in: [SALE_STATUS.PENDING, SALE_STATUS.CONTRACT],
          },
        }).session(session)

        if (activeSale) {
          throw createError(
            'Este imóvel já possui uma venda em andamento.',
            409,
          )
        }
      }

      /*
       * Vendedor.
       */
      const sellerBroker = await validateSellerBroker({
        brokerId: proposal.broker,
        session,
      })

      /*
       * Captador.
       */
      const acquisitionBroker = await validateAcquisitionBroker({
        property,
        session,
      })

      /*
       * Valores.
       */
      const values = validateProposalValues(proposal)

      /*
       * Comissão.
       */
      const commission = normalizeCommissionInput({
        property,
        saleAmount: values.saleAmount,
        commission: data.commission || {},
      })

      /*
       * Snapshot do vendedor.
       */
      commission.seller.broker = sellerBroker._id

      /*
       * Número.
       */
      const saleNumber =
        data.saleNumber ||
        (await generateSaleNumber({
          session,
        }))

      /*
       * Duplicidade.
       */
      const saleNumberExists = await Sale.findOne({
        saleNumber,
      }).session(session)

      if (saleNumberExists) {
        throw createError('O número da venda já está sendo utilizado.', 409)
      }

      /*
       * Status inicial.
       *
       * Mantemos a possibilidade de
       * criar diretamente como COMPLETED,
       * pois isso já fazia parte do fluxo.
       */
      const initialStatus = data.status || SALE_STATUS.PENDING

      if (!isValidSaleStatus(initialStatus)) {
        throw createError('Status inicial da venda inválido.')
      }

      if (initialStatus === SALE_STATUS.CANCELLED) {
        throw createError(
          'Uma venda não pode ser criada diretamente como cancelada.',
        )
      }

      /*
       * Status financeiro.
       */
      const initialPaymentStatus =
        data.paymentStatus || SALE_PAYMENT_STATUS.PENDING

      if (!isValidPaymentStatus(initialPaymentStatus)) {
        throw createError('Status financeiro inicial inválido.')
      }

      /*
       * Data.
       */
      const saleDate = data.saleDate ? new Date(data.saleDate) : new Date()

      if (Number.isNaN(saleDate.getTime())) {
        throw createError('Data da venda inválida.')
      }

      /*
       * Venda.
       */
      const sale = new Sale({
        saleNumber,

        proposal: proposal._id,

        lead: lead._id,

        property: property._id,

        sellerBroker: sellerBroker._id,

        acquisitionBroker: acquisitionBroker?._id || null,

        saleAmount: values.saleAmount,

        proposalAmount: values.proposalAmount,

        downPayment: values.downPayment,

        financing: values.financing,

        fgts: values.fgts,

        balance: values.balance,

        commission,

        status: initialStatus,

        paymentStatus: initialPaymentStatus,

        saleDate,

        notes: data.notes || '',

        createdBy: getUserId(user),

        updatedBy: getUserId(user),
      })

      await sale.save({
        session,
      })

      /*
       * Lead → negociação.
       */
      await updateLeadStage({
        lead,
        newStage: PIPELINE_STAGES.NEGOTIATION,
        performedBy: getUserId(user),
        reason: `Venda ${sale.saleNumber} criada a partir da proposta aprovada.`,
        session,
      })

      /*
       * Histórico.
       */
      await addLeadSaleHistory({
        lead,
        sale,
        action: 'sale_created',
        performedBy: getUserId(user),
        description: `Venda criada a partir da proposta aprovada no valor de R$ ${formatCurrency(
          values.saleAmount,
        )}.`,
        session,
      })

      /*
       * Venda não concluída:
       * reserva imóvel.
       */
      if (sale.status !== SALE_STATUS.COMPLETED) {
        await markPropertyAsReserved({
          property,
          session,
        })
      }

      /*
       * Venda já concluída.
       */
      if (sale.status === SALE_STATUS.COMPLETED) {
        await finalizeSale({
          sale,
          user,
          lead,
          property,
          session,
        })
      }

      createdSaleId = sale._id
    })

    return Sale.findById(createdSaleId).populate(SALE_POPULATE)
  } finally {
    await session.endSession()
  }
}

/*
|--------------------------------------------------------------------------
| GET SALE BY ID
|--------------------------------------------------------------------------
*/

export const getSaleById = async ({ saleId, user }) => {
  const id = getObjectId(saleId, 'Venda')

  const sale = await Sale.findById(id).populate(SALE_POPULATE)

  if (!sale) {
    throw createError('Venda não encontrada.', 404)
  }

  validateSaleAccess({
    sale,
    user,
  })

  return sale
}

/*
|--------------------------------------------------------------------------
| GET SALES
|--------------------------------------------------------------------------
*/

export const getSales = async ({
  user,
  page = 1,
  limit = 20,
  search = '',
  status,
  paymentStatus,
  sellerBroker,
  acquisitionBroker,
  lead,
  property,
  startDate,
  endDate,
  sort = '-createdAt',
} = {}) => {
  const currentPage = Math.max(Number(page) || 1, 1)

  const currentLimit = Math.min(Math.max(Number(limit) || 20, 1), 100)

  const skip = (currentPage - 1) * currentLimit

  const filter = {}

  /*
   * Broker:
   * somente suas vendas.
   */
  if (isBroker(user)) {
    filter.sellerBroker = getUserId(user)
  }

  /*
   * Admin:
   * filtro vendedor.
   */
  if (sellerBroker && isAdmin(user)) {
    filter.sellerBroker = getObjectId(sellerBroker, 'Corretor vendedor')
  }

  /*
   * Captador.
   */
  if (acquisitionBroker) {
    filter.acquisitionBroker = getObjectId(
      acquisitionBroker,
      'Corretor captador',
    )
  }

  /*
   * Lead.
   */
  if (lead) {
    filter.lead = getObjectId(lead, 'Lead')
  }

  /*
   * Imóvel.
   */
  if (property) {
    filter.property = getObjectId(property, 'Imóvel')
  }

  /*
   * Status.
   */
  if (status) {
    if (!isValidSaleStatus(status)) {
      throw createError('Status da venda inválido.')
    }

    filter.status = status
  }

  /*
   * Status financeiro.
   */
  if (paymentStatus) {
    if (!isValidPaymentStatus(paymentStatus)) {
      throw createError('Status financeiro inválido.')
    }

    filter.paymentStatus = paymentStatus
  }

  /*
   * Datas.
   */
  if (startDate || endDate) {
    filter.saleDate = {}

    if (startDate) {
      const start = new Date(startDate)

      if (Number.isNaN(start.getTime())) {
        throw createError('Data inicial inválida.')
      }

      start.setHours(0, 0, 0, 0)

      filter.saleDate.$gte = start
    }

    if (endDate) {
      const end = new Date(endDate)

      if (Number.isNaN(end.getTime())) {
        throw createError('Data final inválida.')
      }

      end.setHours(23, 59, 59, 999)

      filter.saleDate.$lte = end
    }
  }

  /*
   * Busca por número.
   */
  if (search?.trim()) {
    filter.saleNumber = {
      $regex: search.trim(),
      $options: 'i',
    }
  }

  /*
   * Ordenações permitidas.
   */
  const allowedSorts = new Set([
    'createdAt',
    '-createdAt',
    'saleDate',
    '-saleDate',
    'saleAmount',
    '-saleAmount',
    'status',
    '-status',
  ])

  const normalizedSort = allowedSorts.has(sort) ? sort : '-createdAt'

  const [sales, total] = await Promise.all([
    Sale.find(filter)
      .populate(SALE_POPULATE)
      .sort(normalizedSort)
      .skip(skip)
      .limit(currentLimit),

    Sale.countDocuments(filter),
  ])

  const pages = Math.ceil(total / currentLimit)

  return {
    data: sales,

    pagination: {
      page: currentPage,
      limit: currentLimit,
      total,
      pages,

      hasNextPage: currentPage < pages,

      hasPreviousPage: currentPage > 1,
    },
  }
}

/*
|--------------------------------------------------------------------------
| UPDATE SALE STATUS
|--------------------------------------------------------------------------
*/

export const updateSaleStatus = async ({ saleId, status, user, notes }) => {
  validateAdmin(
    user,
    'Somente administradores podem alterar o status da venda.',
  )

  if (!isValidSaleStatus(status)) {
    throw createError('Status da venda inválido.')
  }

  const session = await mongoose.startSession()

  try {
    let updatedSaleId = null

    await session.withTransaction(async () => {
      const id = getObjectId(saleId, 'Venda')

      const sale = await Sale.findById(id).session(session)

      if (!sale) {
        throw createError('Venda não encontrada.', 404)
      }

      const previousStatus = sale.status

      validateSaleStatusTransition({
        previousStatus,
        nextStatus: status,
      })

      /*
       * Nenhuma alteração.
       */
      if (previousStatus === status) {
        if (notes !== undefined) {
          sale.notes = notes
        }

        sale.updatedBy = getUserId(user)

        await sale.save({
          session,
        })

        updatedSaleId = sale._id

        return
      }

      /*
       * Atualiza status.
       */
      sale.status = status

      if (notes !== undefined) {
        sale.notes = notes
      }

      sale.updatedBy = getUserId(user)

      /*
       * Sale.js pode preencher
       * completedAt automaticamente.
       */
      await sale.save({
        session,
      })

      /*
       * COMPLETED
       */
      if (status === SALE_STATUS.COMPLETED) {
        const lead = await Lead.findById(sale.lead).session(session)

        if (!lead) {
          throw createError('Lead da venda não encontrado.', 404)
        }

        const property = await Property.findById(sale.property).session(session)

        if (!property) {
          throw createError('Imóvel da venda não encontrado.', 404)
        }

        await finalizeSale({
          sale,
          user,
          lead,
          property,
          session,
        })

        /*
         * Salvamos novamente caso
         * completedAt tenha sido
         * alterado pelo finalizeSale.
         */
        await sale.save({
          session,
        })
      } else if (status === SALE_STATUS.CONTRACT) {
        /*
         * CONTRACT
         */
        await processContractSale({
          sale,
          user,
          session,
        })
      } else if (status === SALE_STATUS.CANCELLED) {
        /*
         * CANCELLED
         */
        /*
         * Este fluxo existe para
         * manter compatibilidade
         * com updateSaleStatus.
         *
         * A API cancelSale continua
         * sendo o fluxo recomendado
         * quando houver motivo.
         */
        const lead = await Lead.findById(sale.lead).session(session)

        if (lead) {
          await addLeadSaleHistory({
            lead,
            sale,
            action: 'sale_cancelled',
            performedBy: getUserId(user),
            description: `Venda cancelada. Status anterior: "${previousStatus}".`,
            session,
          })
        }

        const property = await Property.findById(sale.property).session(session)

        if (property) {
          const activeSale = await Sale.findOne({
            property: sale.property,

            _id: {
              $ne: sale._id,
            },

            status: {
              $in: [
                SALE_STATUS.PENDING,
                SALE_STATUS.CONTRACT,
                SALE_STATUS.COMPLETED,
              ],
            },
          }).session(session)

          if (!activeSale) {
            await releaseProperty({
              property,
              session,
            })
          }
        }
      } else {
        /*
         * Outros status.
         */
        const lead = await Lead.findById(sale.lead).session(session)

        if (lead) {
          await addLeadSaleHistory({
            lead,
            sale,
            action: 'sale_status_updated',
            performedBy: getUserId(user),
            description: `Status da venda alterado de "${previousStatus}" para "${status}".`,
            session,
          })
        }
      }

      updatedSaleId = sale._id
    })

    return Sale.findById(updatedSaleId).populate(SALE_POPULATE)
  } finally {
    await session.endSession()
  }
}

/*
|--------------------------------------------------------------------------
| COMPLETE SALE
|--------------------------------------------------------------------------
*/

/**
 * Conclui venda.
 *
 * Mantemos esta função separada porque
 * ela já existe no seu backend.
 *
 * Diferentemente de updateSaleStatus,
 * não restringimos automaticamente a Admin,
 * preservando o comportamento atual.
 */
export const completeSale = async ({ saleId, user, notes }) => {
  const session = await mongoose.startSession()

  try {
    let completedSaleId = null

    await session.withTransaction(async () => {
      const id = getObjectId(saleId, 'Venda')

      const sale = await Sale.findById(id).session(session)

      if (!sale) {
        throw createError('Venda não encontrada.', 404)
      }

      /*
       * Proteção contra duplicidade.
       */
      if (sale.status === SALE_STATUS.COMPLETED) {
        throw createError('Esta venda já está concluída.', 409)
      }

      /*
       * Venda cancelada não pode
       * ser concluída.
       */
      if (sale.status === SALE_STATUS.CANCELLED) {
        throw createError('Uma venda cancelada não pode ser concluída.', 409)
      }

      /*
       * Validação da máquina de estados.
       */
      validateSaleStatusTransition({
        previousStatus: sale.status,
        nextStatus: SALE_STATUS.COMPLETED,
      })

      /*
       * Atualiza Sale.
       */
      sale.status = SALE_STATUS.COMPLETED

      sale.completedAt = new Date()

      sale.updatedBy = getUserId(user)

      if (notes !== undefined) {
        sale.notes = notes
      }

      await sale.save({
        session,
      })

      /*
       * Lead.
       */
      const lead = await Lead.findById(sale.lead).session(session)

      if (!lead) {
        throw createError('Lead da venda não encontrado.', 404)
      }

      /*
       * Property.
       */
      const property = await Property.findById(sale.property).session(session)

      if (!property) {
        throw createError('Imóvel da venda não encontrado.', 404)
      }

      /*
       * Finaliza tudo.
       */
      await finalizeSale({
        sale,
        user,
        lead,
        property,
        session,
      })

      completedSaleId = sale._id
    })

    return Sale.findById(completedSaleId).populate(SALE_POPULATE)
  } finally {
    await session.endSession()
  }
}

/*
|--------------------------------------------------------------------------
| CANCEL SALE
|--------------------------------------------------------------------------
*/

export const cancelSale = async ({ saleId, user, reason }) => {
  validateAdmin(user, 'Somente administradores podem cancelar vendas.')

  if (!reason || !reason.trim()) {
    throw createError('Informe o motivo do cancelamento.')
  }

  const session = await mongoose.startSession()

  try {
    let cancelledSaleId = null

    await session.withTransaction(async () => {
      const id = getObjectId(saleId, 'Venda')

      const sale = await Sale.findById(id).session(session)

      if (!sale) {
        throw createError('Venda não encontrada.', 404)
      }

      if (sale.status === SALE_STATUS.CANCELLED) {
        throw createError('Esta venda já está cancelada.', 409)
      }

      if (sale.status === SALE_STATUS.COMPLETED) {
        throw createError(
          'Uma venda concluída não pode ser cancelada por este fluxo.',
          409,
        )
      }

      const previousStatus = sale.status

      /*
       * Validação.
       */
      validateSaleStatusTransition({
        previousStatus,
        nextStatus: SALE_STATUS.CANCELLED,
      })

      /*
       * Atualiza.
       */
      sale.status = SALE_STATUS.CANCELLED

      sale.cancelledAt = new Date()

      sale.cancellationReason = reason.trim()

      sale.updatedBy = getUserId(user)

      await sale.save({
        session,
      })

      /*
       * Processa imóvel + Lead.
       */
      await processCancelledSale({
        sale,
        user,
        previousStatus,
        reason: reason.trim(),
        session,
      })

      cancelledSaleId = sale._id
    })

    return Sale.findById(cancelledSaleId).populate(SALE_POPULATE)
  } finally {
    await session.endSession()
  }
}

/*
|--------------------------------------------------------------------------
| UPDATE PAYMENT STATUS
|--------------------------------------------------------------------------
*/

export const updateSalePaymentStatus = async ({
  saleId,
  paymentStatus,
  user,
}) => {
  validateAdmin(
    user,
    'Somente administradores podem alterar o status financeiro da venda.',
  )

  if (!isValidPaymentStatus(paymentStatus)) {
    throw createError('Status financeiro inválido.')
  }

  const session = await mongoose.startSession()

  try {
    let updatedSaleId = null

    await session.withTransaction(async () => {
      const id = getObjectId(saleId, 'Venda')

      const sale = await Sale.findById(id).session(session)

      if (!sale) {
        throw createError('Venda não encontrada.', 404)
      }

      /*
       * Venda cancelada não deve
       * receber alterações financeiras.
       */
      if (sale.status === SALE_STATUS.CANCELLED) {
        throw createError(
          'Não é possível alterar o status financeiro de uma venda cancelada.',
        )
      }

      const previousPaymentStatus = sale.paymentStatus

      /*
       * Mesmo status:
       * não precisa gerar histórico.
       */
      if (previousPaymentStatus === paymentStatus) {
        updatedSaleId = sale._id

        return
      }

      sale.paymentStatus = paymentStatus

      sale.updatedBy = getUserId(user)

      await sale.save({
        session,
      })

      /*
       * Histórico.
       */
      const lead = await Lead.findById(sale.lead).session(session)

      if (lead) {
        await addLeadSaleHistory({
          lead,
          sale,
          action: 'sale_payment_status_updated',
          performedBy: getUserId(user),
          description: `Status financeiro da venda alterado de "${previousPaymentStatus}" para "${paymentStatus}".`,
          session,
        })
      }

      updatedSaleId = sale._id
    })

    return Sale.findById(updatedSaleId).populate(SALE_POPULATE)
  } finally {
    await session.endSession()
  }
}

/*
|--------------------------------------------------------------------------
| DASHBOARD / MÉTRICAS
|--------------------------------------------------------------------------
*/

export const getSaleMetrics = async ({ user, startDate, endDate } = {}) => {
  const match = {}

  /*
   * Broker:
   * somente vendas próprias.
   */
  if (isBroker(user)) {
    match.sellerBroker = getObjectId(getUserId(user), 'Corretor')
  }

  /*
   * Datas.
   */
  if (startDate || endDate) {
    match.saleDate = {}

    if (startDate) {
      const start = new Date(startDate)

      if (Number.isNaN(start.getTime())) {
        throw createError('Data inicial inválida.')
      }

      start.setHours(0, 0, 0, 0)

      match.saleDate.$gte = start
    }

    if (endDate) {
      const end = new Date(endDate)

      if (Number.isNaN(end.getTime())) {
        throw createError('Data final inválida.')
      }

      end.setHours(23, 59, 59, 999)

      match.saleDate.$lte = end
    }
  }

  const [summary, bySeller, byAcquisition] = await Promise.all([
    /*
     * RESUMO
     */
    Sale.aggregate([
      {
        $match: match,
      },

      {
        $group: {
          _id: null,

          totalSales: {
            $sum: 1,
          },

          totalVGV: {
            $sum: '$saleAmount',
          },

          completedSales: {
            $sum: {
              $cond: [
                {
                  $eq: ['$status', SALE_STATUS.COMPLETED],
                },
                1,
                0,
              ],
            },
          },

          pendingSales: {
            $sum: {
              $cond: [
                {
                  $eq: ['$status', SALE_STATUS.PENDING],
                },
                1,
                0,
              ],
            },
          },

          contractSales: {
            $sum: {
              $cond: [
                {
                  $eq: ['$status', SALE_STATUS.CONTRACT],
                },
                1,
                0,
              ],
            },
          },

          cancelledSales: {
            $sum: {
              $cond: [
                {
                  $eq: ['$status', SALE_STATUS.CANCELLED],
                },
                1,
                0,
              ],
            },
          },

          totalCommission: {
            $sum: '$commission.totalAmount',
          },

          sellerCommission: {
            $sum: '$commission.seller.amount',
          },

          acquisitionCommission: {
            $sum: '$commission.acquisition.amount',
          },

          companyCommission: {
            $sum: '$commission.company.amount',
          },
        },
      },
    ]),

    /*
     * RANKING DE VENDEDORES
     */
    Sale.aggregate([
      {
        $match: match,
      },

      {
        $group: {
          _id: '$sellerBroker',

          sales: {
            $sum: 1,
          },

          vgv: {
            $sum: '$saleAmount',
          },

          commission: {
            $sum: '$commission.seller.amount',
          },
        },
      },

      {
        $lookup: {
          from: 'users',

          localField: '_id',

          foreignField: '_id',

          as: 'broker',
        },
      },

      {
        $unwind: {
          path: '$broker',

          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          brokerId: '$_id',

          brokerName: '$broker.name',

          sales: 1,

          vgv: 1,

          commission: 1,
        },
      },

      {
        $sort: {
          vgv: -1,
        },
      },

      {
        $limit: 10,
      },
    ]),

    /*
     * RANKING DE CAPTADORES
     */
    Sale.aggregate([
      {
        $match: match,
      },

      {
        $match: {
          acquisitionBroker: {
            $ne: null,
          },
        },
      },

      {
        $group: {
          _id: '$acquisitionBroker',

          sales: {
            $sum: 1,
          },

          vgv: {
            $sum: '$saleAmount',
          },

          commission: {
            $sum: '$commission.acquisition.amount',
          },
        },
      },

      {
        $lookup: {
          from: 'users',

          localField: '_id',

          foreignField: '_id',

          as: 'broker',
        },
      },

      {
        $unwind: {
          path: '$broker',

          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          brokerId: '$_id',

          brokerName: '$broker.name',

          sales: 1,

          vgv: 1,

          commission: 1,
        },
      },

      {
        $sort: {
          commission: -1,
        },
      },

      {
        $limit: 10,
      },
    ]),
  ])

  /*
   * Valores padrão.
   */
  const data = summary[0] || {
    totalSales: 0,
    totalVGV: 0,

    completedSales: 0,
    pendingSales: 0,
    contractSales: 0,
    cancelledSales: 0,

    totalCommission: 0,
    sellerCommission: 0,
    acquisitionCommission: 0,
    companyCommission: 0,
  }

  return {
    summary: {
      totalSales: data.totalSales || 0,

      totalVGV: data.totalVGV || 0,

      completedSales: data.completedSales || 0,

      pendingSales: data.pendingSales || 0,

      contractSales: data.contractSales || 0,

      cancelledSales: data.cancelledSales || 0,

      totalCommission: data.totalCommission || 0,

      sellerCommission: data.sellerCommission || 0,

      acquisitionCommission: data.acquisitionCommission || 0,

      companyCommission: data.companyCommission || 0,
    },

    bySeller,

    byAcquisition,
  }
}

/*
|--------------------------------------------------------------------------
| DEFAULT EXPORT
|--------------------------------------------------------------------------
*/

export default {
  createSaleFromProposal,

  getSaleById,

  getSales,

  updateSaleStatus,

  completeSale,

  cancelSale,

  updateSalePaymentStatus,

  getSaleMetrics,

  markPropertyAsReserved,

  releaseProperty,
}
