import Lead from '../models/Lead.js'
import Property from '../models/Property.js'
import User from '../models/User.js'

/*
====================================================
Ranking dos Corretores
====================================================
*/

const calculateBrokerRanking = async () => {
  const brokers = await User.find({
    role: 'broker',
  }).select('_id name email avatar position')

  const ranking = await Promise.all(
    brokers.map(async (broker) => {
      const leads = await Lead.find({
        assignedTo: broker._id,
      }).select('stage')

      let points = 0

      leads.forEach((lead) => {
        points += 1

        switch (lead.stage) {
          case 'qualificado':
            points += 3

            break

          case 'visita_agendada':
            points += 5

            break

          case 'proposta_enviada':
            points += 10

            break

          case 'fechado':
            points += 30

            break

          default:
            break
        }
      })

      return {
        id: broker._id,

        name: broker.name,

        email: broker.email,

        avatar: broker.avatar || '',

        position: broker.position || 'Corretor de Imóveis',

        leads: leads.length,

        points,
      }
    }),
  )

  return ranking.sort((a, b) => b.points - a.points)
}

/*
====================================================
Dashboard Admin
====================================================
*/

export const getAdminDashboard = async (req, res) => {
  try {
    /*
    ====================================================
    TOTAIS
    ====================================================
    */

    const leads = await Lead.countDocuments()

    const imoveis = await Property.countDocuments()

    const usuarios = await User.countDocuments()

    const corretores = await User.countDocuments({
      role: 'broker',
    })

    /*
    ====================================================
    INDICADORES
    ====================================================
    */

    const pipelineCount = await Lead.countDocuments({
      status: {
        $ne: 'perdido',
      },
    })

    const visitas = await Lead.countDocuments({
      stage: 'visita_agendada',
    })

    const propostas = await Lead.countDocuments({
      stage: 'proposta_enviada',
    })

    const fechados = await Lead.countDocuments({
      stage: 'fechado',
    })

    const perdidos = await Lead.countDocuments({
      status: 'perdido',
    })

    /*
    ====================================================
    USUÁRIOS
    ====================================================
    */

    const users = await User.find()
      .select(
        `
        name
        email
        avatar
        role
        position
        isAdmin
      `,
      )
      .sort({
        createdAt: -1,
      })

    /*
    ====================================================
    ÚLTIMOS LEADS
    ====================================================
    */

    const latestLeads = await Lead.find()
      .sort({
        createdAt: -1,
      })
      .limit(8)
      .populate('assignedTo', 'name avatar position')
      .select(
        `
        name
        email
        phone
        region
        source
        status
        stage
        createdAt
        assignedTo
      `,
      )

    /*
    ====================================================
    LEADS POR CORRETOR
    ====================================================
    */

    const leadsByBroker = await Lead.aggregate([
      {
        $match: {
          assignedTo: {
            $ne: null,
          },
        },
      },

      {
        $group: {
          _id: '$assignedTo',

          total: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          total: -1,
        },
      },
    ])

    const populatedBrokers = await User.populate(leadsByBroker, {
      path: '_id',
      select: 'name avatar position',
    })

    const formattedLeadsByBroker = populatedBrokers.map((broker) => ({
      id: broker._id._id,

      name: broker._id.name,

      avatar: broker._id.avatar,

      position: broker._id.position,

      total: broker.total,
    }))

    /*
    ====================================================
    PIPELINE
    ====================================================
    */

    const pipeline = await Lead.aggregate([
      {
        $match: {
          stage: {
            $exists: true,
            $ne: null,
          },
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

      {
        $sort: {
          total: -1,
        },
      },
    ])

    /*
    ====================================================
    ATIVIDADES RECENTES
    ====================================================
    */

    const activities = await Lead.find()
      .sort({
        updatedAt: -1,
      })
      .limit(10)
      .populate('assignedTo', 'name avatar position')
      .select(
        `
        name
        stage
        status
        updatedAt
        createdAt
        assignedTo
      `,
      )

    /*
    ====================================================
    LEADS POR DIA
    ====================================================
    */

    const leadsDaily = await Lead.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%d/%m',
              date: '$createdAt',
            },
          },

          count: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          _id: 1,
        },
      },
    ])

    /*
    ====================================================
    IMÓVEIS POR DIA
    ====================================================
    */

    const imoveisDaily = await Property.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%d/%m',
              date: '$createdAt',
            },
          },

          count: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          _id: 1,
        },
      },
    ])

    /*
    ====================================================
    RANKING
    ====================================================
    */

    const ranking = await calculateBrokerRanking()

    /*
    ====================================================
    RESPONSE
    ====================================================
    */

    return res.json({
      totals: {
        leads,
        imoveis,
        usuarios,
        corretores,

        pipeline: pipelineCount,

        visitas,

        propostas,

        fechados,

        perdidos,
      },

      users,

      latestLeads,

      leadsByBroker: formattedLeadsByBroker,

      pipeline,

      ranking: ranking.slice(0, 10),

      leadsDaily,

      imoveisDaily,

      activities,
    })
  } catch (error) {
    console.error('❌ Erro dashboard admin:', error)

    return res.status(500).json({
      success: false,

      message: 'Erro ao buscar dashboard administrativo.',

      error: error.message,
    })
  }
}

/*
====================================================
Dashboard Corretor
====================================================
*/

export const getBrokerDashboard = async (req, res) => {
  try {
    const brokerId = req.user._id

    /*
    ==========================================
    Estatísticas
    ==========================================
    */

    const totalImoveis = await Property.countDocuments({
      brokerId,
    })

    const totalLeads = await Lead.countDocuments({
      assignedTo: brokerId,
    })

    const visitas = await Lead.countDocuments({
      assignedTo: brokerId,
      stage: 'visita_agendada',
    })

    const propostas = await Lead.countDocuments({
      assignedTo: brokerId,
      stage: 'proposta_enviada',
    })

    const vendas = await Lead.countDocuments({
      assignedTo: brokerId,
      stage: 'fechado',
    })

    /*
    ==========================================
    Últimos Leads
    ==========================================
    */

    const recentLeads = await Lead.find({
      assignedTo: brokerId,
    })
      .sort({
        createdAt: -1,
      })
      .limit(5)
      .select('name phone status stage createdAt')

    /*
    ==========================================
    Próximas Visitas
    ==========================================
    */

    const nextVisits = await Lead.find({
      assignedTo: brokerId,
      visitDate: {
        $gte: new Date(),
      },
    })
      .sort({
        visitDate: 1,
      })
      .limit(5)
      .populate('property', 'name')
      .select('name phone visitDate property')

    /*
    ==========================================
    Atividades
    ==========================================
    */

    const activities = await Lead.find({
      assignedTo: brokerId,
    })
      .sort({
        updatedAt: -1,
      })
      .limit(5)
      .select('name stage updatedAt')

    /*
    ==========================================
    Ranking
    ==========================================
    */

    const ranking = await calculateBrokerRanking()

    const brokerIndex = ranking.findIndex(
      (item) => item.id.toString() === brokerId.toString(),
    )

    const brokerRank = brokerIndex >= 0 ? brokerIndex + 1 : 0

    const brokerPoints = brokerIndex >= 0 ? ranking[brokerIndex].points : 0

    /*
    ==========================================
    Metas
    ==========================================
    */

    const goals = [
      {
        title: 'Cadastrar imóveis',
        current: totalImoveis,
        target: 10,
      },
      {
        title: 'Captar leads',
        current: totalLeads,
        target: 50,
      },
      {
        title: 'Fechar vendas',
        current: vendas,
        target: 5,
      },
    ]

    /*
    ==========================================
    Resposta
    ==========================================
    */

    res.json({
      broker: {
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar || '',
        rank: brokerRank,
        points: brokerPoints,
      },

      stats: {
        leads: totalLeads,
        imoveis: totalImoveis,
        visitas,
        propostas,
        vendas,
      },

      goals,

      activities,

      nextVisits,

      recentLeads,

      leaderboard: ranking.slice(0, 5),
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Erro ao carregar dashboard do corretor',
      error: error.message,
    })
  }
}
