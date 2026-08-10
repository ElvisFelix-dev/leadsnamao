import mongoose from 'mongoose'

import Property from '../models/Property.js'
import PropertyView from '../models/PropertyView.js'

/* ============================================================
   Helper
============================================================ */

function getDateRange(days = 0) {
  const start = new Date()

  if (days) {
    start.setDate(start.getDate() - days)
  }

  start.setHours(0, 0, 0, 0)

  return start
}

/* ============================================================
   Registrar Visualização
============================================================ */

export async function registerView({
  propertyId,

  userId = null,

  sessionId = '',

  visitorId = '',

  source = 'crm',

  referrer = '',

  landingPage = '',

  campaign = {},

  visitor = {},
}) {
  if (!propertyId) {
    throw new Error('ID do imóvel não informado.')
  }

  /*
    Evita contar várias vezes
    o mesmo visitante em pouco tempo
  */

  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

  const duplicateQuery = {
    property: propertyId,

    createdAt: {
      $gte: thirtyMinutesAgo,
    },
  }

  /*
    Prioridade:

    1 - sessionId
    2 - visitorId
    3 - IP

  */

  if (sessionId) {
    duplicateQuery.sessionId = sessionId
  } else if (visitorId) {
    duplicateQuery.visitorId = visitorId
  } else if (visitor?.ip) {
    duplicateQuery['visitor.ip'] = visitor.ip
  }

  const existingView = await PropertyView.findOne(duplicateQuery)

  if (existingView) {
    return {
      counted: false,

      view: existingView,
    }
  }

  /*
     Cria nova visualização
  */

  const view = await PropertyView.create({
    property: propertyId,

    user: userId,

    sessionId,

    visitorId,

    source,

    referrer,

    landingPage,

    campaign,

    visitor,
  })

  /*
     Incrementa contador
     do imóvel
  */

  await Property.findByIdAndUpdate(
    propertyId,

    {
      $inc: {
        'statistics.views': 1,
      },
    },
  )

  return {
    counted: true,

    view,
  }
}

/* ============================================================
   Total de Visualizações
============================================================ */

export async function countViews(propertyId) {
  return PropertyView.countDocuments({
    property: propertyId,
  })
}

/* ============================================================
   Visitantes Únicos
============================================================ */

export async function countUniqueVisitors(propertyId) {
  const result = await PropertyView.aggregate([
    {
      $match: {
        property: new mongoose.Types.ObjectId(propertyId),
      },
    },

    {
      $group: {
        _id: {
          $ifNull: ['$visitorId', '$visitor.ip'],
        },
      },
    },

    {
      $count: 'total',
    },
  ])

  return result[0]?.total || 0
}

/* ============================================================
   Visualizações Hoje
============================================================ */

export async function countViewsToday(propertyId) {
  const start = getDateRange()

  return PropertyView.countDocuments({
    property: propertyId,

    createdAt: {
      $gte: start,
    },
  })
}

/* ============================================================
   Visualizações Últimos 7 Dias
============================================================ */

export async function countViewsThisWeek(propertyId) {
  const start = getDateRange(7)

  return PropertyView.countDocuments({
    property: propertyId,

    createdAt: {
      $gte: start,
    },
  })
}

/* ============================================================
   Visualizações no Mês
============================================================ */

export async function countViewsThisMonth(propertyId) {
  const start = new Date()

  start.setDate(1)

  start.setHours(0, 0, 0, 0)

  return PropertyView.countDocuments({
    property: propertyId,

    createdAt: {
      $gte: start,
    },
  })
}

/* ============================================================
   Visualizações por Intervalo
============================================================ */

export async function countViewsBetween({
  propertyId,

  startDate,

  endDate,
}) {
  return PropertyView.countDocuments({
    property: propertyId,

    createdAt: {
      $gte: startDate,

      $lte: endDate,
    },
  })
}

/* ============================================================
   Visualizações por Usuário
============================================================ */

export async function countViewsByUser(userId) {
  return PropertyView.countDocuments({
    user: userId,
  })
}

/* ============================================================
   Visualizações por Corretor
============================================================ */

export async function countViewsByBroker(brokerId) {
  const properties = await Property.find({
    broker: brokerId,

    isDeleted: false,
  }).select('_id')

  const propertyIds = properties.map((item) => item._id)

  return PropertyView.countDocuments({
    property: {
      $in: propertyIds,
    },
  })
}

/* ============================================================
   Visualizações por Origem
============================================================ */

export async function viewsBySource(propertyId) {
  return PropertyView.aggregate([
    {
      $match: {
        property: propertyId,
      },
    },

    {
      $group: {
        _id: '$source',

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
}

/* ============================================================
   Visualizações por Dispositivo
============================================================ */

export async function viewsByDevice(propertyId) {
  return PropertyView.aggregate([
    {
      $match: {
        property: propertyId,
      },
    },

    {
      $group: {
        _id: '$visitor.deviceType',

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
}

/* ============================================================
   Visualizações por Navegador
============================================================ */

export async function viewsByBrowser(propertyId) {
  return PropertyView.aggregate([
    {
      $match: {
        property: propertyId,
      },
    },

    {
      $group: {
        _id: '$visitor.browser',

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

    {
      $limit: 10,
    },
  ])
}

/* ============================================================
   Visualizações por Sistema Operacional
============================================================ */

export async function viewsByOperatingSystem(propertyId) {
  return PropertyView.aggregate([
    {
      $match: {
        property: propertyId,
      },
    },

    {
      $group: {
        _id: '$visitor.os',

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
}

/* ============================================================
   Visualizações por País
============================================================ */

export async function viewsByCountry(propertyId) {
  return PropertyView.aggregate([
    {
      $match: {
        property: propertyId,
      },
    },

    {
      $group: {
        _id: '$visitor.country',

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
}

/* ============================================================
   Visualizações por Estado
============================================================ */

export async function viewsByState(propertyId) {
  return PropertyView.aggregate([
    {
      $match: {
        property: propertyId,
      },
    },

    {
      $group: {
        _id: '$visitor.state',

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
}

/* ============================================================
   Visualizações por Cidade
============================================================ */

export async function viewsByCity(propertyId) {
  return PropertyView.aggregate([
    {
      $match: {
        property: propertyId,
      },
    },

    {
      $group: {
        _id: '$visitor.city',

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

    {
      $limit: 20,
    },
  ])
}

/* ============================================================
   Timeline de Visualizações
============================================================ */

export async function viewsTimeline(propertyId, days = 30) {
  const start = new Date()

  start.setDate(start.getDate() - days)

  return PropertyView.aggregate([
    {
      $match: {
        property: propertyId,

        createdAt: {
          $gte: start,
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

          day: {
            $dayOfMonth: '$createdAt',
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

        '_id.day': 1,
      },
    },
  ])
}

/* ============================================================
   Imóveis Mais Visualizados
============================================================ */

export async function topViewedProperties(limit = 10) {
  return PropertyView.aggregate([
    {
      $group: {
        _id: '$property',

        views: {
          $sum: 1,
        },
      },
    },

    {
      $sort: {
        views: -1,
      },
    },

    {
      $limit: limit,
    },

    {
      $lookup: {
        from: 'properties',

        localField: '_id',

        foreignField: '_id',

        as: 'property',
      },
    },

    {
      $unwind: '$property',
    },

    {
      $project: {
        _id: '$property._id',

        name: '$property.name',

        code: '$property.code',

        coverImage: '$property.coverImage',

        salePrice: '$property.prices.salePrice',

        rentPrice: '$property.prices.rentPrice',

        status: '$property.status',

        purpose: '$property.purpose',

        views: 1,
      },
    },
  ])
}

/* ============================================================
   Últimas Visualizações
============================================================ */

export async function latestViews(propertyId, limit = 20) {
  return PropertyView.find({
    property: propertyId,
  })

    .sort({
      createdAt: -1,
    })

    .limit(limit)

    .populate('user', 'name email avatar')
}

/* ============================================================
   Dashboard Completo do Imóvel
============================================================ */

export async function dashboardStatistics(propertyId) {
  const [
    total,

    uniqueVisitors,

    today,

    week,

    month,

    sources,

    devices,

    browsers,

    systems,

    countries,

    states,

    cities,

    timeline,
  ] = await Promise.all([
    countViews(propertyId),

    countUniqueVisitors(propertyId),

    countViewsToday(propertyId),

    countViewsThisWeek(propertyId),

    countViewsThisMonth(propertyId),

    viewsBySource(propertyId),

    viewsByDevice(propertyId),

    viewsByBrowser(propertyId),

    viewsByOperatingSystem(propertyId),

    viewsByCountry(propertyId),

    viewsByState(propertyId),

    viewsByCity(propertyId),

    viewsTimeline(propertyId),
  ])

  return {
    summary: {
      total,

      uniqueVisitors,

      today,

      week,

      month,
    },

    analytics: {
      sources,

      devices,

      browsers,

      systems,

      countries,

      states,

      cities,

      timeline,
    },
  }
}

/* ============================================================
   Export Default
============================================================ */

export default {
  registerView,

  countViews,

  countUniqueVisitors,

  countViewsToday,

  countViewsThisWeek,

  countViewsThisMonth,

  countViewsBetween,

  countViewsByUser,

  countViewsByBroker,

  viewsBySource,

  viewsByDevice,

  viewsByBrowser,

  viewsByOperatingSystem,

  viewsByCountry,

  viewsByState,

  viewsByCity,

  viewsTimeline,

  latestViews,

  topViewedProperties,

  dashboardStatistics,
}

/* ============================================================
   Últimos Visitantes do Imóvel
============================================================ */

export async function recentVisitors(propertyId, limit = 20) {
  return PropertyView.find({
    property: propertyId,
  })

    .sort({
      createdAt: -1,
    })

    .limit(limit)

    .select(
      `
      visitor
      source
      referrer
      createdAt
      user
      `,
    )

    .populate('user', 'name email avatar')
}

/* ============================================================
   Visitantes por Período
============================================================ */

export async function visitorsBetween({
  propertyId,

  startDate,

  endDate,
}) {
  return PropertyView.find({
    property: propertyId,

    createdAt: {
      $gte: startDate,

      $lte: endDate,
    },
  })

    .sort({
      createdAt: -1,
    })
}

/* ============================================================
   Crescimento de Visualizações
============================================================ */

export async function viewsGrowth(propertyId) {
  const now = new Date()

  const currentStart = new Date()

  currentStart.setDate(now.getDate() - 30)

  const previousStart = new Date()

  previousStart.setDate(now.getDate() - 60)

  const [current, previous] = await Promise.all([
    PropertyView.countDocuments({
      property: propertyId,

      createdAt: {
        $gte: currentStart,
      },
    }),

    PropertyView.countDocuments({
      property: propertyId,

      createdAt: {
        $gte: previousStart,

        $lt: currentStart,
      },
    }),
  ])

  let percentage = 0

  if (previous > 0) {
    percentage = ((current - previous) / previous) * 100
  }

  return {
    current,

    previous,

    percentage: Number(percentage.toFixed(2)),
  }
}

/* ============================================================
   Taxa de Conversão Visualização → Lead
============================================================ */

export async function viewConversionRate(propertyId) {
  const property = await Property.findById(propertyId).select('statistics')

  if (!property) {
    throw new Error('Imóvel não encontrado.')
  }

  const views = property.statistics?.views || 0

  const contacts = property.statistics?.contacts || 0

  if (!views) {
    return 0
  }

  return Number(((contacts / views) * 100).toFixed(2))
}

/* ============================================================
   Ranking por Interesse
============================================================ */

export async function interestScore(propertyId) {
  const [views, contacts, visits, proposals] = await Promise.all([
    countViews(propertyId),

    Property.findById(propertyId).then(
      (property) => property?.statistics?.contacts || 0,
    ),

    Property.findById(propertyId).then(
      (property) => property?.statistics?.visitsScheduled || 0,
    ),

    Property.findById(propertyId).then(
      (property) => property?.statistics?.proposals || 0,
    ),
  ])

  const score = views * 1 + contacts * 5 + visits * 10 + proposals * 20

  return {
    score,

    breakdown: {
      views,

      contacts,

      visits,

      proposals,
    },
  }
}
