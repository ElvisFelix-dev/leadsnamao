import mongoose from 'mongoose'

import Lead from '../../models/Lead.js'
import Visit from '../../models/Visit.js'
import Property from '../../models/Property.js'
import User from '../../models/User.js'
import Proposal from '../../models/Proposal.js'
import Sale from '../../models/Sale.js'

import { VISIT_STATUS } from '../../constants/visitStatus.js'

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

const brokerDashboardService = async (brokerId) => {
  const objectId = new mongoose.Types.ObjectId(brokerId)

  /*
  ====================================================
  CORRETOR
  ====================================================
  */

  const broker = await User.findById(brokerId)
    .select('name email avatar')
    .lean()

  /*
  ====================================================
  CARDS
  ====================================================
  */

  const [
    totalLeads,
    totalVisits,
    totalProperties,
    totalProposals,
    totalSales,
    commission,
  ] = await Promise.all([
    Lead.countDocuments({
      assignedTo: brokerId,
    }),

    Visit.countDocuments({
      broker: brokerId,
      status: {
        $ne: VISIT_STATUS.CANCELLED,
      },
    }),

    Property.countDocuments({
      brokerId,
    }),

    Proposal.countDocuments({
      broker: brokerId,
    }),

    Sale.countDocuments({
      broker: brokerId,
    }),

    Sale.aggregate([
      {
        $match: {
          broker: objectId,
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: '$commission',
          },
        },
      },
    ]),
  ])

  const totalCommission = commission[0]?.total || 0

  /*
  ====================================================
  PONTUAÇÃO
  ====================================================
  */

  const points =
    totalLeads * 10 +
    totalVisits * 20 +
    totalProposals * 35 +
    totalSales * 100 +
    totalProperties * 15

  /*
  ====================================================
  RANKING
  ====================================================
  */

  const brokers = await User.find({
    role: 'broker',
  })
    .select('name avatar')
    .lean()

  const leaderboard = await Promise.all(
    brokers.map(async (user) => {
      const [leads, visits, proposals, sales, properties] = await Promise.all([
        Lead.countDocuments({
          assignedTo: user._id,
        }),

        Visit.countDocuments({
          broker: user._id,
          status: {
            $ne: VISIT_STATUS.CANCELLED,
          },
        }),

        Proposal.countDocuments({
          broker: user._id,
        }),

        Sale.countDocuments({
          broker: user._id,
        }),

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
    leaderboard.findIndex(
      (item) => item._id.toString() === brokerId.toString(),
    ) + 1

  /*
  ====================================================
  GRÁFICOS
  ====================================================
  */

  const [leadsChart, visitsChart, salesChart] = await Promise.all([
    Lead.aggregate([
      {
        $match: {
          assignedTo: objectId,
        },
      },
      {
        $group: {
          _id: {
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
          '_id.month': 1,
        },
      },
    ]),

    Visit.aggregate([
      {
        $match: {
          broker: objectId,
        },
      },
      {
        $group: {
          _id: {
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
          '_id.month': 1,
        },
      },
    ]),

    Sale.aggregate([
      {
        $match: {
          broker: objectId,
        },
      },
      {
        $group: {
          _id: {
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
          '_id.month': 1,
        },
      },
    ]),
  ])

  const chart = MONTHS.map((month, index) => {
    const monthNumber = index + 1

    return {
      month,

      leads:
        leadsChart.find((item) => item._id.month === monthNumber)?.total || 0,

      visits:
        visitsChart.find((item) => item._id.month === monthNumber)?.total || 0,

      sales:
        salesChart.find((item) => item._id.month === monthNumber)?.total || 0,
    }
  })

  /*
  ====================================================
  LISTAS
  ====================================================
  */

  const [nextVisits, recentLeads, recentVisits, recentProposals, recentSales] =
    await Promise.all([
      Visit.find({
        broker: brokerId,
        date: {
          $gte: new Date(),
        },
      })
        .sort({ date: 1 })
        .limit(3)
        .populate('lead', 'name phone')
        .populate('property', 'name')
        .lean(),

      Lead.find({
        assignedTo: brokerId,
      })
        .sort({
          updatedAt: -1,
        })
        .limit(10)
        .populate('property', 'name')
        .lean(),

      Visit.find({
        broker: brokerId,
      })
        .sort({
          updatedAt: -1,
        })
        .limit(10)
        .populate('lead', 'name')
        .lean(),

      Proposal.find({
        broker: brokerId,
      })
        .sort({
          updatedAt: -1,
        })
        .limit(10)
        .populate('lead', 'name')
        .lean(),

      Sale.find({
        broker: brokerId,
      })
        .sort({
          updatedAt: -1,
        })
        .limit(10)
        .populate('lead', 'name')
        .lean(),
    ])
  /*
  ====================================================
  METAS
  ====================================================
  */

  const goals = [
    {
      title: 'Cadastrar imóveis',
      current: totalProperties,
      target: 10,
    },
    {
      title: 'Captar leads',
      current: totalLeads,
      target: 50,
    },
    {
      title: 'Fechar vendas',
      current: totalSales,
      target: 5,
    },
  ].map((goal) => ({
    ...goal,
    percent: Math.min(Math.round((goal.current / goal.target) * 100), 100),
  }))

  /*
  ====================================================
  FEED DE ATIVIDADES
  ====================================================
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
    reagendada: 'Visita reagendada',
  }

  /*
  -----------------------
  Leads
  -----------------------
  */

  const leadActivities = recentLeads.map((lead) => ({
    id: lead._id,

    type: lead.stage === 'fechado' ? 'sale' : 'lead',

    title:
      leadMessages[lead.stage]?.(lead.name) || `Lead atualizado: ${lead.name}`,

    date: lead.updatedAt,
  }))

  /*
  -----------------------
  Visitas
  -----------------------
  */

  const visitActivities = recentVisits.map((visit) => ({
    id: visit._id,

    type: 'visit',

    title: `${
      visitMessages[visit.status] || 'Visita atualizada'
    } com ${visit.lead?.name || 'Lead'}`,

    date: visit.updatedAt,
  }))

  /*
  -----------------------
  Propostas
  -----------------------
  */

  const proposalActivities = recentProposals.map((proposal) => ({
    id: proposal._id,

    type: 'proposal',

    title: `Proposta enviada para ${proposal.lead?.name || 'Lead'}`,

    date: proposal.updatedAt,
  }))

  /*
  -----------------------
  Vendas
  -----------------------
  */

  const saleActivities = recentSales.map((sale) => ({
    id: sale._id,

    type: 'sale',

    title: `Venda concluída para ${sale.lead?.name || 'Cliente'}`,

    date: sale.updatedAt,
  }))

  /*
  -----------------------
  Timeline
  -----------------------
  */

  const activities = [
    ...leadActivities,
    ...visitActivities,
    ...proposalActivities,
    ...saleActivities,
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)

  /*
  ====================================================
  RETORNO
  ====================================================
  */

  return {
    broker,

    stats: {
      leads: totalLeads,

      imoveis: totalProperties,

      visitas: totalVisits,

      propostas: totalProposals,

      vendas: totalSales,

      commission: totalCommission,

      conversion:
        totalLeads === 0
          ? 0
          : Number(((totalSales / totalLeads) * 100).toFixed(1)),
    },

    /*
    =====================================
    Header
    =====================================
    */

    rank,

    points,

    /*
    =====================================
    Gráfico
    =====================================
    */

    chart,

    /*
    =====================================
    Metas
    =====================================
    */

    goals,

    /*
    =====================================
    Próximas visitas
    =====================================
    */

    nextVisits: nextVisits.map((visit) => ({
      _id: visit._id,

      name: visit.lead?.name || 'Lead',

      phone: visit.lead?.phone || '',

      property: visit.property?.name || 'Imóvel não informado',

      visitDate: visit.date,

      status: visit.status,
    })),

    /*
    =====================================
    Últimos Leads
    =====================================
    */

    recentLeads,

    /*
    =====================================
    Timeline
    =====================================
    */

    activities,

    /*
    =====================================
    Ranking
    =====================================
    */

    leaderboard: leaderboard.slice(0, 5),
  }
}

export default brokerDashboardService
