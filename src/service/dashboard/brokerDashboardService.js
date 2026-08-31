import mongoose from 'mongoose'

import Lead from '../../models/Lead.js'
import Visit from '../../models/Visit.js'
import Property from '../../models/Property.js'
import User from '../../models/User.js'
import Proposal from '../../models/Proposal.js' // ← CORRIGIDO: estava faltando o nome da variável
import Sale from '../../models/Sale.js'
import Commission from '../../models/Commission.js'

import { VISIT_STATUS } from '../../constants/visitStatus.js'

/*
|--------------------------------------------------------------------------
| CONFIGURAÇÕES
|--------------------------------------------------------------------------
*/

const MONTHS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

const RECENT_LIMIT = 10
const NEXT_VISITS_LIMIT = 5
const LEADERBOARD_LIMIT = 5

/*
|--------------------------------------------------------------------------
| STATUS DA VENDA
|--------------------------------------------------------------------------
|
| IMPORTANTE:
|
| Esses valores precisam estar alinhados ao Sale.js
|
*/

const SALE_STATUS = {
  PENDING: 'pending',
  CONTRACT: 'contract',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

/*
|--------------------------------------------------------------------------
| STATUS DO PAGAMENTO
|--------------------------------------------------------------------------
*/

const SALE_PAYMENT_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
}

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value)
}

const toObjectId = (value) => {
  if (!value) return null

  if (value instanceof mongoose.Types.ObjectId) {
    return value
  }

  if (!isValidObjectId(value)) {
    return null
  }

  return new mongoose.Types.ObjectId(value)
}

const toNumber = (value) => {
  const number = Number(value)

  return Number.isFinite(number) ? number : 0
}

const round = (value, decimals = 2) => {
  const factor = 10 ** decimals

  return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor
}

const percentage = (current, total) => {
  if (!total || total <= 0) {
    return 0
  }

  return round((current / total) * 100, 1)
}

/*
|--------------------------------------------------------------------------
| DATA HELPERS
|--------------------------------------------------------------------------
*/

const getMonthRange = (months = 12) => {
  const now = new Date()

  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)

  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  )

  return {
    start,
    end,
  }
}

const buildLastMonths = (months = 12) => {
  const now = new Date()

  return Array.from({ length: months }, (_, index) => {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - (months - 1 - index),
      1,
    )

    return {
      year: date.getFullYear(),
      monthNumber: date.getMonth() + 1,
      month: MONTHS[date.getMonth()],
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        '0',
      )}`,
    }
  })
}

const buildMonthlyMap = (items = []) => {
  const map = new Map()

  items.forEach((item) => {
    const year = toNumber(item?._id?.year)
    const month = toNumber(item?._id?.month)

    if (!year || !month) {
      return
    }

    map.set(`${year}-${String(month).padStart(2, '0')}`, toNumber(item.total))
  })

  return map
}

const buildMonthlyValueMap = (items = []) => {
  const map = new Map()

  items.forEach((item) => {
    const year = toNumber(item?._id?.year)
    const month = toNumber(item?._id?.month)

    if (!year || !month) {
      return
    }

    map.set(`${year}-${String(month).padStart(2, '0')}`, toNumber(item.value))
  })

  return map
}

/*
|--------------------------------------------------------------------------
| SALE HELPERS
|--------------------------------------------------------------------------
*/

const getSaleValue = (sale) => {
  return toNumber(sale?.saleAmount ?? sale?.saleValue ?? sale?.value ?? 0)
}

/*
|--------------------------------------------------------------------------
| COMISSÃO DO CORRETOR
|--------------------------------------------------------------------------
|
| Agora a comissão do vendedor fica em:
|
| commission.seller.amount
|
*/

const getBrokerCommissionValue = (sale) => {
  return toNumber(sale?.commission?.seller?.amount ?? 0)
}

const getBrokerCommissionPercentage = (sale) => {
  return toNumber(sale?.commission?.seller?.percentage ?? 0)
}

/*
|--------------------------------------------------------------------------
| VALOR DA PROPOSTA
|--------------------------------------------------------------------------
*/

const getProposalValue = (proposal) => {
  return toNumber(
    proposal?.values?.proposalPrice ??
      proposal?.finalValue ??
      proposal?.proposalPrice ??
      proposal?.values?.finalValue ??
      0,
  )
}

/*
|--------------------------------------------------------------------------
| PROPOSTA -> VENDA
|--------------------------------------------------------------------------
|
| Proposal não possui saleId.
|
| A relação oficial é:
|
| Sale.proposal
|
| Também mantemos compatibilidade com:
|
| Proposal.history[].metadata.saleId
|
*/

const getProposalSaleIdFromHistory = (proposal) => {
  if (!proposal || !Array.isArray(proposal.history)) {
    return null
  }

  const convertedEntry = [...proposal.history]
    .reverse()
    .find(
      (item) => item?.action === 'converted_to_sale' && item?.metadata?.saleId,
    )

  return convertedEntry?.metadata?.saleId || null
}

/*
|--------------------------------------------------------------------------
| SERVIÇO
|--------------------------------------------------------------------------
*/

const brokerDashboardService = async (brokerId) => {
  /*
  |--------------------------------------------------------------------------
  | VALIDATE BROKER
  |--------------------------------------------------------------------------
  */

  if (!brokerId || !isValidObjectId(brokerId)) {
    throw new Error('Corretor inválido.')
  }

  const objectId = toObjectId(brokerId)

  console.log('\n========================================')
  console.log('🔥 BROKER DASHBOARD SERVICE EXECUTANDO')
  console.log('========================================')
  console.log('brokerId recebido:', brokerId)
  console.log('objectId:', objectId)
  console.log('objectId string:', String(objectId))
  console.log('========================================\n')

  const debugSales = await Sale.find({
    sellerBroker: objectId,
  })
    .select(
      '_id saleNumber sellerBroker saleAmount commission status paymentStatus',
    )
    .lean()

  console.log('\n========================================')
  console.log('🔥 DEBUG SALES')
  console.log('========================================')
  console.log('Vendas encontradas:', debugSales.length)
  console.log(JSON.stringify(debugSales, null, 2))
  console.log('========================================\n')

  /*
  |--------------------------------------------------------------------------
  | CORRETOR
  |--------------------------------------------------------------------------
  */

  const broker = await User.findById(objectId)
    .select('name email avatar position phone role')
    .lean()

  if (!broker) {
    throw new Error('Corretor não encontrado.')
  }

  /*
  |--------------------------------------------------------------------------
  | DATE RANGE
  |--------------------------------------------------------------------------
  */

  const { start: chartStart, end: chartEnd } = getMonthRange(12)

  const now = new Date()

  /*
  |--------------------------------------------------------------------------
  | CARDS / KPIs
  |--------------------------------------------------------------------------
  */

  const [
    totalLeads,
    newLeads,
    contactedLeads,
    qualifiedLeads,

    totalVisits,
    upcomingVisits,
    completedVisits,

    totalProperties,

    totalProposals,
    draftProposals,
    pendingProposals,
    acceptedProposals,
    rejectedProposals,
    cancelledProposals,

    /*
    |--------------------------------------------------------------------------
    | SALES
    |--------------------------------------------------------------------------
    |
    | CORREÇÃO PRINCIPAL:
    |
    | sellerBroker em vez de broker
    |
    */

    totalSales,
    activeSales,
    completedSales,
    cancelledSales,

    /*
    |--------------------------------------------------------------------------
    | PROPOSAL FINANCIAL
    |--------------------------------------------------------------------------
    */

    proposalFinancial,

    /*
    |--------------------------------------------------------------------------
    | SALES FINANCIAL
    |--------------------------------------------------------------------------
    */

    salesFinancial,

    /*
    |--------------------------------------------------------------------------
    | 🔥 COMMISSION FINANCIAL - VIA MODELO COMMISSION
    |--------------------------------------------------------------------------
    |
    | Agora buscamos diretamente do modelo Commission,
    | que é mais confiável e separado da Sale.
    |
    | A comissão do vendedor está em:
    |
    | distribution.seller.amount
    |
    */

    commissionFinancial,
  ] = await Promise.all([
    /*
    |--------------------------------------------------------------------------
    | LEADS
    |--------------------------------------------------------------------------
    */

    Lead.countDocuments({
      assignedTo: objectId,
    }),

    Lead.countDocuments({
      assignedTo: objectId,
      stage: 'novo',
    }),

    Lead.countDocuments({
      assignedTo: objectId,
      stage: 'em_contato',
    }),

    Lead.countDocuments({
      assignedTo: objectId,
      stage: 'qualificado',
    }),

    /*
    |--------------------------------------------------------------------------
    | VISITS
    |--------------------------------------------------------------------------
    */

    Visit.countDocuments({
      broker: objectId,
      status: {
        $ne: VISIT_STATUS.CANCELLED,
      },
    }),

    Visit.countDocuments({
      broker: objectId,
      date: {
        $gte: now,
      },
      status: {
        $nin: [VISIT_STATUS.CANCELLED, VISIT_STATUS.NO_SHOW],
      },
    }),

    Visit.countDocuments({
      broker: objectId,
      status: VISIT_STATUS.COMPLETED,
    }),

    /*
    |--------------------------------------------------------------------------
    | PROPERTIES
    |--------------------------------------------------------------------------
    */

    Property.countDocuments({
      brokerId: objectId,
    }),

    /*
    |--------------------------------------------------------------------------
    | PROPOSALS
    |--------------------------------------------------------------------------
    */

    Proposal.countDocuments({
      broker: objectId,
      isDeleted: false,
    }),

    Proposal.countDocuments({
      broker: objectId,
      isDeleted: false,
      status: 'draft',
    }),

    Proposal.countDocuments({
      broker: objectId,
      isDeleted: false,
      status: {
        $in: ['pending', 'sent'],
      },
    }),

    Proposal.countDocuments({
      broker: objectId,
      isDeleted: false,
      status: 'accepted',
    }),

    Proposal.countDocuments({
      broker: objectId,
      isDeleted: false,
      status: 'rejected',
    }),

    Proposal.countDocuments({
      broker: objectId,
      isDeleted: false,
      status: 'cancelled',
    }),

    /*
    |--------------------------------------------------------------------------
    | SALES
    |--------------------------------------------------------------------------
    |
    | Uma venda pertence ao corretor vendedor através de:
    |
    | sellerBroker
    |
    */

    Sale.countDocuments({
      sellerBroker: objectId,
    }),

    Sale.countDocuments({
      sellerBroker: objectId,
      status: {
        $nin: ['cancelled', 'completed'],
      },
    }),

    Sale.countDocuments({
      sellerBroker: objectId,
      status: 'completed',
    }),

    Sale.countDocuments({
      sellerBroker: objectId,
      status: 'cancelled',
    }),

    /*
    |--------------------------------------------------------------------------
    | PROPOSAL FINANCIAL
    |--------------------------------------------------------------------------
    */

    Proposal.aggregate([
      {
        $match: {
          broker: objectId,
          isDeleted: false,
        },
      },

      {
        $group: {
          _id: null,

          totalValue: {
            $sum: {
              $ifNull: ['$values.proposalPrice', 0],
            },
          },

          averageValue: {
            $avg: {
              $ifNull: ['$values.proposalPrice', 0],
            },
          },

          acceptedValue: {
            $sum: {
              $cond: [
                {
                  $eq: ['$status', 'accepted'],
                },

                {
                  $ifNull: ['$values.proposalPrice', 0],
                },

                0,
              ],
            },
          },
        },
      },
    ]),

    /*
    |--------------------------------------------------------------------------
    | SALES FINANCIAL
    |--------------------------------------------------------------------------
    |
    | CORREÇÃO:
    |
    | saleAmount em vez de saleValue
    |
    */

    Sale.aggregate([
      {
        $match: {
          sellerBroker: objectId,

          status: {
            $ne: SALE_STATUS.CANCELLED,
          },
        },
      },

      {
        $group: {
          _id: null,

          totalValue: {
            $sum: {
              $ifNull: ['$saleAmount', 0],
            },
          },

          averageValue: {
            $avg: {
              $ifNull: ['$saleAmount', 0],
            },
          },

          completedValue: {
            $sum: {
              $cond: [
                {
                  $eq: ['$status', SALE_STATUS.COMPLETED],
                },

                {
                  $ifNull: ['$saleAmount', 0],
                },

                0,
              ],
            },
          },
        },
      },
    ]),

    /*
    |--------------------------------------------------------------------------
    | 🔥 COMMISSION FINANCIAL - VIA MODELO COMMISSION
    |--------------------------------------------------------------------------
    |
    | Agora usamos o modelo Commission separado,
    | que é gerado automaticamente quando a venda é concluída.
    |
    | Isso garante:
    | - Dados mais confiáveis
    | - Histórico independente
    | - Melhor performance em relatórios
    |
    | A comissão do vendedor está em:
    |
    | distribution.seller.amount
    |
    */

    Commission.aggregate([
      {
        $match: {
          sellerBroker: objectId,

          status: {
            $ne: 'cancelled',
          },
        },
      },

      {
        $group: {
          _id: null,

          totalCommission: {
            $sum: {
              $ifNull: ['$distribution.seller.amount', 0],
            },
          },

          paidCommission: {
            $sum: {
              $cond: [
                {
                  $eq: ['$status', 'paid'],
                },

                {
                  $ifNull: ['$distribution.seller.amount', 0],
                },

                0,
              ],
            },
          },

          pendingCommission: {
            $sum: {
              $cond: [
                {
                  $eq: ['$status', 'pending'],
                },

                {
                  $ifNull: ['$distribution.seller.amount', 0],
                },

                0,
              ],
            },
          },

          approvedCommission: {
            $sum: {
              $cond: [
                {
                  $eq: ['$status', 'approved'],
                },

                {
                  $ifNull: ['$distribution.seller.amount', 0],
                },

                0,
              ],
            },
          },
        },
      },
    ]),
  ])

  /*
  |--------------------------------------------------------------------------
  | FINANCIAL NORMALIZATION
  |--------------------------------------------------------------------------
  */

  const proposalFinancialData = proposalFinancial[0] || {}

  const salesFinancialData = salesFinancial[0] || {}

  const commissionFinancialData = commissionFinancial[0] || {}

  const proposalTotalValue = toNumber(proposalFinancialData.totalValue)

  const proposalAverageValue = toNumber(proposalFinancialData.averageValue)

  const acceptedProposalValue = toNumber(proposalFinancialData.acceptedValue)

  const totalSalesValue = toNumber(salesFinancialData.totalValue)

  const averageSaleValue = toNumber(salesFinancialData.averageValue)

  const completedSalesValue = toNumber(salesFinancialData.completedValue)

  /*
  |--------------------------------------------------------------------------
  | 🔥 COMMISSION FINANCIAL - DADOS DO MODELO COMMISSION
  |--------------------------------------------------------------------------
  */

  const totalCommission = toNumber(commissionFinancialData.totalCommission)

  const paidCommission = toNumber(commissionFinancialData.paidCommission)

  const pendingCommission = toNumber(commissionFinancialData.pendingCommission)

  const approvedCommission = toNumber(
    commissionFinancialData.approvedCommission,
  )

  console.log('\n========================================')
  console.log('🔥 COMISSÕES VIA MODELO COMMISSION')
  console.log('========================================')
  console.log({
    totalCommission,
    paidCommission,
    pendingCommission,
    approvedCommission,
  })
  console.log('========================================\n')

  /*
  |--------------------------------------------------------------------------
  | CONVERSIONS
  |--------------------------------------------------------------------------
  */

  const leadToContactRate = percentage(contactedLeads, totalLeads)

  const contactToQualifiedRate = percentage(qualifiedLeads, contactedLeads)

  const leadToProposalRate = percentage(totalProposals, totalLeads)

  const proposalApprovalRate = percentage(acceptedProposals, totalProposals)

  /*
  |--------------------------------------------------------------------------
  | CONVERSÃO LEAD -> VENDA
  |--------------------------------------------------------------------------
  |
  | Agora usamos Sale.sellerBroker.
  |
  | Consideramos todas as vendas não canceladas,
  | pois a conversão da proposta gera uma Sale.
  |
  */

  const leadToSaleRate = percentage(totalSales, totalLeads)

  const acceptedToSaleRate = percentage(totalSales, acceptedProposals)

  /*
  |--------------------------------------------------------------------------
  | PONTUAÇÃO
  |--------------------------------------------------------------------------
  */

  const points =
    totalLeads * 10 +
    totalVisits * 20 +
    totalProposals * 35 +
    totalSales * 100 +
    totalProperties * 15

  /*
  |--------------------------------------------------------------------------
  | RANKING
  |--------------------------------------------------------------------------
  */

  const brokers = await User.find({
    role: 'broker',
  })
    .select('name avatar')
    .lean()

  const leaderboard = await Promise.all(
    brokers.map(async (user) => {
      const [leads, visits, proposals, sales, properties] = await Promise.all([
        /*
            |----------------------------------------------------------------
            | LEADS
            |----------------------------------------------------------------
            */

        Lead.countDocuments({
          assignedTo: user._id,
        }),

        /*
            |----------------------------------------------------------------
            | VISITS
            |----------------------------------------------------------------
            */

        Visit.countDocuments({
          broker: user._id,

          status: {
            $ne: VISIT_STATUS.CANCELLED,
          },
        }),

        /*
            |----------------------------------------------------------------
            | PROPOSALS
            |----------------------------------------------------------------
            */

        Proposal.countDocuments({
          broker: user._id,
          isDeleted: false,
        }),

        /*
            |----------------------------------------------------------------
            | SALES
            |----------------------------------------------------------------
            |
            | sellerBroker
            |
            */

        Sale.countDocuments({
          sellerBroker: user._id,

          status: {
            $ne: SALE_STATUS.CANCELLED,
          },
        }),

        /*
            |----------------------------------------------------------------
            | PROPERTIES
            |----------------------------------------------------------------
            */

        Property.countDocuments({
          brokerId: user._id,
        }),
      ])

      const brokerPoints =
        leads * 10 +
        visits * 20 +
        proposals * 35 +
        sales * 100 +
        properties * 15

      return {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        points: brokerPoints,
      }
    }),
  )

  leaderboard.sort((a, b) => b.points - a.points)

  const rank =
    leaderboard.findIndex((item) => String(item._id) === String(objectId)) + 1

  /*
  |--------------------------------------------------------------------------
  | GRÁFICOS - ÚLTIMOS 12 MESES
  |--------------------------------------------------------------------------
  */

  const [leadsChart, visitsChart, salesChart] = await Promise.all([
    /*
    |--------------------------------------------------------------------------
    | LEADS
    |--------------------------------------------------------------------------
    */

    Lead.aggregate([
      {
        $match: {
          assignedTo: objectId,

          createdAt: {
            $gte: chartStart,
            $lte: chartEnd,
          },
        },
      },

      {
        $group: {
          _id: {
            year: {
              $year: '$createdAt',
            },

            month: {
              $month: '$createdAt',
            },
          },

          total: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
        },
      },
    ]),

    /*
    |--------------------------------------------------------------------------
    | VISITS
    |--------------------------------------------------------------------------
    */

    Visit.aggregate([
      {
        $match: {
          broker: objectId,

          date: {
            $gte: chartStart,
            $lte: chartEnd,
          },

          status: {
            $ne: VISIT_STATUS.CANCELLED,
          },
        },
      },

      {
        $group: {
          _id: {
            year: {
              $year: '$date',
            },

            month: {
              $month: '$date',
            },
          },

          total: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
        },
      },
    ]),

    /*
    |--------------------------------------------------------------------------
    | SALES
    |--------------------------------------------------------------------------
    |
    | sellerBroker + saleAmount
    |
    */

    Sale.aggregate([
      {
        $match: {
          sellerBroker: objectId,

          createdAt: {
            $gte: chartStart,
            $lte: chartEnd,
          },

          status: {
            $ne: SALE_STATUS.CANCELLED,
          },
        },
      },

      {
        $group: {
          _id: {
            year: {
              $year: '$createdAt',
            },

            month: {
              $month: '$createdAt',
            },
          },

          total: {
            $sum: 1,
          },

          value: {
            $sum: {
              $ifNull: ['$saleAmount', 0],
            },
          },
        },
      },

      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
        },
      },
    ]),
  ])

  const leadsMap = buildMonthlyMap(leadsChart)

  const visitsMap = buildMonthlyMap(visitsChart)

  const salesMap = buildMonthlyMap(salesChart)

  const salesValueMap = buildMonthlyValueMap(salesChart)

  const months = buildLastMonths(12)

  const chart = months.map((item) => ({
    month: item.month,
    year: item.year,
    key: item.key,

    leads: leadsMap.get(item.key) || 0,

    visits: visitsMap.get(item.key) || 0,

    sales: salesMap.get(item.key) || 0,

    salesValue: salesValueMap.get(item.key) || 0,
  }))

  /*
  |--------------------------------------------------------------------------
  | PRÓXIMAS VISITAS
  |--------------------------------------------------------------------------
  */

  const nextVisits = await Visit.find({
    broker: objectId,

    date: {
      $gte: now,
    },

    status: {
      $nin: [VISIT_STATUS.CANCELLED, VISIT_STATUS.NO_SHOW],
    },
  })
    .sort({
      date: 1,
    })
    .limit(NEXT_VISITS_LIMIT)
    .populate('lead', 'name phone email')
    .populate('property', 'title name code')
    .lean()

  /*
  |--------------------------------------------------------------------------
  | LISTAS RECENTES
  |--------------------------------------------------------------------------
  */

  const [recentLeads, recentVisits, recentProposals, recentSales] =
    await Promise.all([
      /*
    |--------------------------------------------------------------------------
    | LEADS
    |--------------------------------------------------------------------------
    */

      Lead.find({
        assignedTo: objectId,
      })
        .sort({
          updatedAt: -1,
        })
        .limit(RECENT_LIMIT)
        .populate('property', 'title name code price')
        .lean(),

      /*
    |--------------------------------------------------------------------------
    | VISITS
    |--------------------------------------------------------------------------
    */

      Visit.find({
        broker: objectId,
      })
        .sort({
          updatedAt: -1,
        })
        .limit(RECENT_LIMIT)
        .populate('lead', 'name phone email')
        .populate('property', 'title name code')
        .lean(),

      /*
    |--------------------------------------------------------------------------
    | PROPOSALS
    |--------------------------------------------------------------------------
    */

      Proposal.find({
        broker: objectId,
        isDeleted: false,
      })
        .sort({
          updatedAt: -1,
        })
        .limit(RECENT_LIMIT)
        .populate('lead', 'name phone email')
        .populate('property', 'title name code price')
        .lean(),

      /*
    |--------------------------------------------------------------------------
    | SALES
    |--------------------------------------------------------------------------
    |
    | sellerBroker
    |
    */

      Sale.find({
        sellerBroker: objectId,
      })
        .sort({
          updatedAt: -1,
        })
        .limit(RECENT_LIMIT)
        .populate('lead', 'name phone email')
        .populate('property', 'title name code price')
        .populate('proposal', 'status values createdAt approvedAt history')
        .lean(),
    ])

  /*
  |--------------------------------------------------------------------------
  | PROPOSTAS RECENTES -> VENDAS
  |--------------------------------------------------------------------------
  */

  const recentProposalIds = recentProposals
    .map((proposal) => proposal?._id)
    .filter(Boolean)

  const salesFromRecentProposals = recentProposalIds.length
    ? await Sale.find({
        sellerBroker: objectId,

        proposal: {
          $in: recentProposalIds,
        },
      })
        .select('_id proposal status saleAmount saleDate createdAt')
        .lean()
    : []

  const saleByProposalId = new Map()

  salesFromRecentProposals.forEach((sale) => {
    if (!sale?.proposal) {
      return
    }

    saleByProposalId.set(String(sale.proposal), sale)
  })

  const enrichedRecentProposals = recentProposals.map((proposal) => {
    const saleFromReference = saleByProposalId.get(String(proposal._id))

    const historySaleId = getProposalSaleIdFromHistory(proposal)

    const sale =
      saleFromReference ||
      (historySaleId
        ? {
            _id: historySaleId,
          }
        : null)

    return {
      ...proposal,

      isConvertedToSale: Boolean(sale),

      saleId: sale?._id || null,

      proposalValue: getProposalValue(proposal),
    }
  })

  /*
  |--------------------------------------------------------------------------
  | VENDAS RECENTES
  |--------------------------------------------------------------------------
  */

  const enrichedRecentSales = recentSales.map((sale) => ({
    ...sale,

    saleValue: getSaleValue(sale),

    /*
        |--------------------------------------------------------------------------
        | comissão do vendedor
        |--------------------------------------------------------------------------
        */

    commissionValue: getBrokerCommissionValue(sale),

    commissionPercentage: getBrokerCommissionPercentage(sale),

    isCompleted: sale.status === SALE_STATUS.COMPLETED,

    isCancelled: sale.status === SALE_STATUS.CANCELLED,

    isPaid: sale.paymentStatus === SALE_PAYMENT_STATUS.PAID,
  }))

  /*
  |--------------------------------------------------------------------------
  | METAS
  |--------------------------------------------------------------------------
  */

  const goals = [
    {
      id: 'properties',

      title: 'Cadastrar imóveis',

      description: 'Aumente seu portfólio de imóveis.',

      current: totalProperties,

      target: 10,
    },

    {
      id: 'leads',

      title: 'Captar leads',

      description: 'Mantenha seu funil sempre abastecido.',

      current: totalLeads,

      target: 50,
    },

    {
      id: 'proposals',

      title: 'Enviar propostas',

      description: 'Transforme oportunidades em negociações.',

      current: totalProposals,

      target: 10,
    },

    {
      id: 'sales',

      title: 'Fechar vendas',

      description: 'Meta de vendas para o período.',

      current: totalSales,

      target: 5,
    },
  ].map((goal) => ({
    ...goal,

    percent:
      goal.target > 0
        ? Math.min(Math.round((goal.current / goal.target) * 100), 100)
        : 0,
  }))

  /*
  |--------------------------------------------------------------------------
  | FEED DE ATIVIDADES
  |--------------------------------------------------------------------------
  */

  const leadMessages = {
    novo_lead: (name) => `Novo lead cadastrado: ${name}`,

    primeiro_contato: (name) => `Primeiro contato realizado com ${name}`,

    qualificado: (name) => `${name} foi qualificado`,

    visita_agendada: (name) => `Visita agendada com ${name}`,

    proposta_enviada: (name) => `Proposta enviada para ${name}`,

    negociacao: (name) => `Negociação iniciada com ${name}`,

    fechado: (name) => `Venda concluída para ${name}`,

    perdido: (name) => `Lead perdido: ${name}`,
  }

  const visitMessages = {
    agendada: 'Visita agendada',

    confirmada: 'Visita confirmada',

    realizada: 'Visita realizada',

    cancelada: 'Visita cancelada',

    remarcada: 'Visita reagendada',

    reagendada: 'Visita reagendada',
  }

  const proposalMessages = {
    draft: 'Rascunho de proposta criado',

    pending: 'Proposta aguardando aprovação',

    sent: 'Proposta enviada',

    accepted: 'Proposta aceita',

    rejected: 'Proposta rejeitada',

    cancelled: 'Proposta cancelada',

    expired: 'Proposta expirada',
  }

  const saleMessages = {
    pending: 'Venda criada',

    contract: 'Venda em contrato',

    completed: 'Venda concluída',

    cancelled: 'Venda cancelada',
  }

  /*
  |--------------------------------------------------------------------------
  | LEAD ACTIVITIES
  |--------------------------------------------------------------------------
  */

  const leadActivities = recentLeads.map((lead) => ({
    id: `lead-${lead._id}`,

    entityId: lead._id,

    type: lead.stage === 'fechado' ? 'sale' : 'lead',

    title:
      leadMessages[lead.stage]?.(lead.name) || `Lead atualizado: ${lead.name}`,

    date: lead.updatedAt || lead.createdAt,
  }))

  /*
  |--------------------------------------------------------------------------
  | VISIT ACTIVITIES
  |--------------------------------------------------------------------------
  */

  const visitActivities = recentVisits.map((visit) => ({
    id: `visit-${visit._id}`,

    entityId: visit._id,

    type: 'visit',

    title: `${visitMessages[visit.status] || 'Visita atualizada'} com ${
      visit.lead?.name || 'Lead'
    }`,

    date: visit.updatedAt || visit.createdAt,
  }))

  /*
  |--------------------------------------------------------------------------
  | PROPOSAL ACTIVITIES
  |--------------------------------------------------------------------------
  */

  const proposalActivities = enrichedRecentProposals.map((proposal) => {
    const converted = proposal.isConvertedToSale

    return {
      id: `proposal-${proposal._id}`,

      entityId: proposal._id,

      type: converted ? 'sale' : 'proposal',

      title: converted
        ? `Proposta de ${proposal.lead?.name || 'Cliente'} convertida em venda`
        : `${proposalMessages[proposal.status] || 'Proposta atualizada'} para ${
            proposal.lead?.name || 'Cliente'
          }`,

      date: proposal.updatedAt || proposal.createdAt,
    }
  })

  /*
  |--------------------------------------------------------------------------
  | SALE ACTIVITIES
  |--------------------------------------------------------------------------
  */

  const saleActivities = enrichedRecentSales.map((sale) => ({
    id: `sale-${sale._id}`,

    entityId: sale._id,

    type: 'sale',

    title: `${saleMessages[sale.status] || 'Venda atualizada'} para ${
      sale.lead?.name || 'Cliente'
    }`,

    date: sale.updatedAt || sale.createdAt,
  }))

  /*
  |--------------------------------------------------------------------------
  | TIMELINE
  |--------------------------------------------------------------------------
  */

  const activities = [
    ...leadActivities,
    ...visitActivities,
    ...proposalActivities,
    ...saleActivities,
  ]
    .filter((item) => item.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)

  /*
  |--------------------------------------------------------------------------
  | PIPELINE
  |--------------------------------------------------------------------------
  */

  const pipelineStages = [
    'novo',
    'em_contato',
    'qualificado',
    'visita_agendada',
    'proposta',
    'convertido',
    'perdido',
  ]

  const pipelineCounts = await Lead.aggregate([
    {
      $match: {
        assignedTo: objectId,
      },
    },

    {
      $group: {
        _id: '$stage',

        total: {
          $sum: 1,
        },
      },
    },
  ])

  const pipelineMap = new Map()

  pipelineCounts.forEach((item) => {
    pipelineMap.set(item._id, toNumber(item.total))
  })

  const pipeline = pipelineStages.map((stage) => ({
    stage,

    total: pipelineMap.get(stage) || 0,
  }))

  console.log('\n========================================')
  console.log('🔥 DASHBOARD FINAL')
  console.log('========================================')
  console.log({
    broker: broker?.name,
    totalLeads,
    totalVisits,
    totalProposals,
    totalSales,
    activeSales,
    completedSales,
    totalCommission,
    paidCommission,
    pendingCommission,
    approvedCommission,
    totalSalesValue,
    completedSalesValue,
    points,
    rank,
  })
  console.log('========================================\n')

  /*
  |--------------------------------------------------------------------------
  | RETURN
  |--------------------------------------------------------------------------
  */

  return {
    /*
    |--------------------------------------------------------------------------
    | BROKER
    |--------------------------------------------------------------------------
    */

    broker,

    /*
    |--------------------------------------------------------------------------
    | STATS
    |--------------------------------------------------------------------------
    */

    stats: {
      /*
      |----------------------------------------------------------------------
      | Leads
      |----------------------------------------------------------------------
      */

      leads: totalLeads,

      novosLeads: newLeads,

      contatos: contactedLeads,

      qualificados: qualifiedLeads,

      /*
      |----------------------------------------------------------------------
      | Visitas
      |----------------------------------------------------------------------
      */

      visitas: totalVisits,

      visitasProximas: upcomingVisits,

      visitasRealizadas: completedVisits,

      /*
      |----------------------------------------------------------------------
      | Imóveis
      |----------------------------------------------------------------------
      */

      imoveis: totalProperties,

      /*
      |----------------------------------------------------------------------
      | Propostas
      |----------------------------------------------------------------------
      */

      propostas: totalProposals,

      propostasRascunho: draftProposals,

      propostasAbertas: pendingProposals,

      propostasAceitas: acceptedProposals,

      propostasRejeitadas: rejectedProposals,

      propostasCanceladas: cancelledProposals,

      /*
      |----------------------------------------------------------------------
      | Vendas
      |----------------------------------------------------------------------
      */

      vendas: totalSales,

      vendasEmAndamento: activeSales,

      vendasConcluidas: completedSales,

      vendasCanceladas: cancelledSales,

      /*
      |----------------------------------------------------------------------
      | Financeiro
      |----------------------------------------------------------------------
      */

      valorPropostas: proposalTotalValue,

      valorPropostasAceitas: acceptedProposalValue,

      valorVendas: totalSalesValue,

      valorVendasConcluidas: completedSalesValue,

      /*
      |--------------------------------------------------------------------------
      | 🔥 COMISSÃO DO CORRETOR - VIA MODELO COMMISSION
      |--------------------------------------------------------------------------
      */

      comissaoTotal: totalCommission,

      comissaoPaga: paidCommission,

      comissaoPendente: pendingCommission,

      comissaoAprovada: approvedCommission,

      /*
      |--------------------------------------------------------------------------
      | Ticket médio
      |--------------------------------------------------------------------------
      */

      ticketMedioProposta: proposalAverageValue,

      ticketMedioVenda: averageSaleValue,

      /*
      |--------------------------------------------------------------------------
      | Conversão
      |--------------------------------------------------------------------------
      */

      conversion: leadToSaleRate,
    },

    /*
    |--------------------------------------------------------------------------
    | PERFORMANCE
    |--------------------------------------------------------------------------
    */

    performance: {
      leadToContactRate,
      contactToQualifiedRate,
      leadToProposalRate,
      proposalApprovalRate,
      leadToSaleRate,
      acceptedToSaleRate,
    },

    /*
    |--------------------------------------------------------------------------
    | RANKING
    |--------------------------------------------------------------------------
    */

    rank,

    points,

    /*
    |--------------------------------------------------------------------------
    | CHART
    |--------------------------------------------------------------------------
    */

    chart,

    /*
    |--------------------------------------------------------------------------
    | PIPELINE
    |--------------------------------------------------------------------------
    */

    pipeline,

    /*
    |--------------------------------------------------------------------------
    | GOALS
    |--------------------------------------------------------------------------
    */

    goals,

    /*
    |--------------------------------------------------------------------------
    | NEXT VISITS
    |--------------------------------------------------------------------------
    */

    nextVisits: nextVisits.map((visit) => ({
      _id: visit._id,

      name: visit.lead?.name || 'Lead',

      phone: visit.lead?.phone || '',

      email: visit.lead?.email || '',

      property:
        visit.property?.title || visit.property?.name || 'Imóvel não informado',

      propertyCode: visit.property?.code || '',

      visitDate: visit.date,

      status: visit.status,

      type: visit.type || 'visit',

      title: visit.title || 'Compromisso',
    })),

    /*
    |--------------------------------------------------------------------------
    | RECENT LEADS
    |--------------------------------------------------------------------------
    */

    recentLeads,

    /*
    |--------------------------------------------------------------------------
    | RECENT PROPOSALS
    |--------------------------------------------------------------------------
    */

    recentProposals: enrichedRecentProposals,

    /*
    |--------------------------------------------------------------------------
    | RECENT SALES
    |--------------------------------------------------------------------------
    */

    recentSales: enrichedRecentSales,

    /*
    |--------------------------------------------------------------------------
    | ACTIVITIES
    |--------------------------------------------------------------------------
    */

    activities,

    /*
    |--------------------------------------------------------------------------
    | LEADERBOARD
    |--------------------------------------------------------------------------
    */

    leaderboard: leaderboard.slice(0, LEADERBOARD_LIMIT),
  }
}

export default brokerDashboardService
