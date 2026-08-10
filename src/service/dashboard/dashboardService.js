import Lead from '../../models/Lead.js'
import Property from '../../models/Property.js'
import User from '../../models/User.js'

export const getAdminDashboardService = async (currentUser) => {
  if (!currentUser?.isAdmin) {
    throw new Error('Acesso negado.')
  }

  /*
  ======================================
      TOTAIS
  ======================================
  */

  const [
    leads,
    imoveis,
    usuarios,
    corretores,
    visitas,
    propostas,
    fechados,
    perdidos,
  ] = await Promise.all([
    Lead.countDocuments(),
    Property.countDocuments(),
    User.countDocuments(),
    User.countDocuments({
      isAdmin: false,
      isBroker: true,
    }),
    Lead.countDocuments({
      status: 'VISITA',
    }),
    Lead.countDocuments({
      status: 'PROPOSTA',
    }),
    Lead.countDocuments({
      status: 'FECHADO',
    }),
    Lead.countDocuments({
      status: 'PERDIDO',
    }),
  ])

  /*
  ======================================
      PIPELINE
  ======================================
  */

  const pipeline = await Lead.countDocuments({
    status: {
      $nin: ['FECHADO', 'PERDIDO'],
    },
  })

  /*
  ======================================
      LEADS POR DIA
  ======================================
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
  ======================================
      IMÓVEIS POR DIA
  ======================================
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
  ======================================
      ÚLTIMOS LEADS
  ======================================
  */

  const latestLeads = await Lead.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('assignedTo', 'name')
    .lean()

  /*
  ======================================
      ÚLTIMOS IMÓVEIS
  ======================================
  */

  const latestProperties = await Property.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .lean()

  /*
  ======================================
      RETORNO
  ======================================
  */

  return {
    totals: {
      leads,
      imoveis,
      usuarios,
      corretores,
      pipeline,
      visitas,
      propostas,
      fechados,
      perdidos,
    },

    leadsDaily,

    imoveisDaily,

    latestLeads,

    latestProperties,
  }
}
