import Property from '../models/Property.js'
import PropertyFavorite from '../models/PropertyFavorite.js'

/* ============================================================
   HELPERS
============================================================ */

/**
 * Retorna a identidade usada para localizar o favorito.
 *
 * Regra:
 *
 * 1. Usuário autenticado -> userId
 * 2. Visitante anônimo -> visitorId
 *
 * Não usamos os dois simultaneamente na mesma consulta.
 */
function buildFavoriteIdentity({ userId = null, visitorId = '' }) {
  if (userId) {
    return {
      user: userId,
    }
  }

  if (visitorId) {
    return {
      visitorId,
    }
  }

  return null
}

/**
 * Valida o imóvel antes de registrar o favorito.
 */
async function validateProperty(propertyId) {
  if (!propertyId) {
    throw new Error('ID do imóvel não informado.')
  }

  const property = await Property.findOne({
    _id: propertyId,
    isDeleted: false,
  }).select('_id statistics')

  if (!property) {
    throw new Error('Imóvel não encontrado.')
  }

  return property
}

/**
 * Incrementa a quantidade de favoritos do imóvel.
 */
async function incrementPropertyFavorites(propertyId) {
  return Property.findByIdAndUpdate(
    propertyId,
    {
      $inc: {
        'statistics.favorites': 1,
      },
    },
    {
      new: true,
    },
  )
}

/**
 * Decrementa favoritos sem permitir valor negativo.
 *
 * O filtro statistics.favorites >= 1 evita que o contador
 * fique negativo caso exista alguma inconsistência anterior.
 */
async function decrementPropertyFavorites(propertyId) {
  return Property.findOneAndUpdate(
    {
      _id: propertyId,

      'statistics.favorites': {
        $gte: 1,
      },
    },
    {
      $inc: {
        'statistics.favorites': -1,
      },
    },
    {
      new: true,
    },
  )
}

/* ============================================================
   ADICIONAR FAVORITO
============================================================ */

export async function addFavorite({
  propertyId,

  userId = null,

  visitorId = '',

  sessionId = '',

  source = 'crm',

  referrer = '',
}) {
  await validateProperty(propertyId)

  const identity = buildFavoriteIdentity({
    userId,
    visitorId,
  })

  if (!identity) {
    throw new Error('É necessário informar um usuário ou visitante.')
  }

  /*
   * Procura favorito existente para a mesma identidade.
   */
  let favorite = await PropertyFavorite.findOne({
    property: propertyId,

    ...identity,
  })

  /*
   * Já está ativo.
   *
   * Não incrementamos statistics novamente.
   */
  if (favorite?.active) {
    return {
      created: false,

      restored: false,

      alreadyFavorite: true,

      favorite,
    }
  }

  /*
   * Favorito existia, mas foi removido.
   *
   * Restauramos o registro.
   */
  if (favorite && !favorite.active) {
    favorite.active = true

    if (sessionId) {
      favorite.sessionId = sessionId
    }

    if (source) {
      favorite.source = source
    }

    if (referrer) {
      favorite.referrer = referrer
    }

    await favorite.save()

    await incrementPropertyFavorites(propertyId)

    return {
      created: false,

      restored: true,

      alreadyFavorite: false,

      favorite,
    }
  }

  /*
   * Não existe favorito.
   *
   * Criamos um novo.
   */
  favorite = await PropertyFavorite.create({
    property: propertyId,

    user: userId || null,

    visitorId: visitorId || '',

    sessionId: sessionId || '',

    source: source || 'crm',

    referrer: referrer || '',

    active: true,
  })

  await incrementPropertyFavorites(propertyId)

  return {
    created: true,

    restored: false,

    alreadyFavorite: false,

    favorite,
  }
}

/* ============================================================
   REMOVER FAVORITO
============================================================ */

export async function removeFavorite({
  propertyId,

  userId = null,

  visitorId = '',
}) {
  await validateProperty(propertyId)

  const identity = buildFavoriteIdentity({
    userId,
    visitorId,
  })

  if (!identity) {
    return {
      removed: false,

      favorite: null,
    }
  }

  const favorite = await PropertyFavorite.findOne({
    property: propertyId,

    ...identity,

    active: true,
  })

  /*
   * Não existe favorito ativo.
   */
  if (!favorite) {
    return {
      removed: false,

      favorite: null,
    }
  }

  /*
   * Soft delete.
   *
   * Mantemos o registro para histórico/analytics.
   */
  favorite.active = false

  await favorite.save()

  /*
   * Atualiza contador do imóvel.
   */
  await decrementPropertyFavorites(propertyId)

  return {
    removed: true,

    favorite,
  }
}

/* ============================================================
   ALTERNAR FAVORITO
============================================================ */

export async function toggleFavorite({
  propertyId,

  userId = null,

  visitorId = '',

  sessionId = '',

  source = 'crm',

  referrer = '',
}) {
  await validateProperty(propertyId)

  const identity = buildFavoriteIdentity({
    userId,
    visitorId,
  })

  if (!identity) {
    throw new Error('É necessário informar um usuário ou visitante.')
  }

  const existing = await PropertyFavorite.findOne({
    property: propertyId,

    ...identity,
  })

  /*
   * Já está favoritado.
   *
   * Toggle => remover.
   */
  if (existing?.active) {
    return removeFavorite({
      propertyId,

      userId,

      visitorId,
    })
  }

  /*
   * Não existe ou está inativo.
   *
   * Toggle => adicionar/restaurar.
   */
  return addFavorite({
    propertyId,

    userId,

    visitorId,

    sessionId,

    source,

    referrer,
  })
}

/* ============================================================
   VERIFICAR FAVORITO
============================================================ */

export async function isFavorite({
  propertyId,

  userId = null,

  visitorId = '',
}) {
  if (!propertyId) {
    throw new Error('ID do imóvel não informado.')
  }

  const identity = buildFavoriteIdentity({
    userId,
    visitorId,
  })

  /*
   * Sem identidade não existe como determinar
   * se o visitante favoritou.
   */
  if (!identity) {
    return {
      isFavorite: false,

      favorite: null,
    }
  }

  const favorite = await PropertyFavorite.findOne({
    property: propertyId,

    ...identity,

    active: true,
  })

  return {
    isFavorite: !!favorite,

    favorite: favorite || null,
  }
}

/* ============================================================
   ALIAS
   Verificar favorito de usuário
============================================================ */

export async function hasUserFavorite(propertyId, userId) {
  if (!propertyId) {
    throw new Error('ID do imóvel não informado.')
  }

  if (!userId) {
    return false
  }

  const favorite = await PropertyFavorite.findOne({
    property: propertyId,

    user: userId,

    active: true,
  })

  return !!favorite
}

/* ============================================================
   CONTAR FAVORITOS DO IMÓVEL
============================================================ */

export async function countFavorites(propertyId) {
  if (!propertyId) {
    throw new Error('ID do imóvel não informado.')
  }

  return PropertyFavorite.countDocuments({
    property: propertyId,

    active: true,
  })
}

/* ============================================================
   FAVORITOS HOJE
============================================================ */

export async function countFavoritesToday(propertyId) {
  if (!propertyId) {
    throw new Error('ID do imóvel não informado.')
  }

  const start = new Date()

  start.setHours(0, 0, 0, 0)

  return PropertyFavorite.countDocuments({
    property: propertyId,

    active: true,

    createdAt: {
      $gte: start,
    },
  })
}

/* ============================================================
   FAVORITOS DA SEMANA
============================================================ */

export async function countFavoritesThisWeek(propertyId) {
  if (!propertyId) {
    throw new Error('ID do imóvel não informado.')
  }

  const start = new Date()

  start.setDate(start.getDate() - 7)

  start.setHours(0, 0, 0, 0)

  return PropertyFavorite.countDocuments({
    property: propertyId,

    active: true,

    createdAt: {
      $gte: start,
    },
  })
}

/* ============================================================
   FAVORITOS DO MÊS
============================================================ */

export async function countFavoritesThisMonth(propertyId) {
  if (!propertyId) {
    throw new Error('ID do imóvel não informado.')
  }

  const start = new Date()

  start.setDate(1)

  start.setHours(0, 0, 0, 0)

  return PropertyFavorite.countDocuments({
    property: propertyId,

    active: true,

    createdAt: {
      $gte: start,
    },
  })
}

/* ============================================================
   CONTAR FAVORITOS DO USUÁRIO
============================================================ */

export async function countUserFavorites(userId) {
  if (!userId) {
    throw new Error('ID do usuário não informado.')
  }

  return PropertyFavorite.countDocuments({
    user: userId,

    active: true,
  })
}

/* ============================================================
   FAVORITOS DE UM USUÁRIO
============================================================ */

export async function getUserFavorites(userId, options = {}) {
  if (!userId) {
    throw new Error('ID do usuário não informado.')
  }

  const {
    limit = 50,

    skip = 0,
  } = options

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100)

  const safeSkip = Math.max(Number(skip) || 0, 0)

  return PropertyFavorite.find({
    user: userId,

    active: true,
  })
    .populate(
      'property',
      'name code slug coverImage prices status purpose bedrooms bathrooms',
    )
    .sort({
      createdAt: -1,
    })
    .skip(safeSkip)
    .limit(safeLimit)
    .lean()
}

/* ============================================================
   USUÁRIOS QUE FAVORITARAM UM IMÓVEL
============================================================ */

export async function favoriteUsers(propertyId, limit = 50) {
  if (!propertyId) {
    throw new Error('ID do imóvel não informado.')
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100)

  return PropertyFavorite.find({
    property: propertyId,

    active: true,

    user: {
      $ne: null,
    },
  })
    .populate('user', 'name email avatar phone')
    .sort({
      createdAt: -1,
    })
    .limit(safeLimit)
    .lean()
}

/* ============================================================
   ÚLTIMOS FAVORITOS
============================================================ */

export async function latestFavorites(propertyId, limit = 20) {
  if (!propertyId) {
    throw new Error('ID do imóvel não informado.')
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100)

  return PropertyFavorite.find({
    property: propertyId,

    active: true,
  })
    .populate('user', 'name email avatar phone')
    .sort({
      createdAt: -1,
    })
    .limit(safeLimit)
    .lean()
}

/* ============================================================
   IMÓVEIS MAIS FAVORITADOS
============================================================ */

export async function topFavoriteProperties(limit = 10) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100)

  return PropertyFavorite.aggregate([
    {
      $match: {
        active: true,
      },
    },

    {
      $group: {
        _id: '$property',

        favorites: {
          $sum: 1,
        },
      },
    },

    {
      $sort: {
        favorites: -1,
      },
    },

    {
      $limit: safeLimit,
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
      $match: {
        'property.isDeleted': {
          $ne: true,
        },
      },
    },

    {
      $project: {
        _id: '$property._id',

        name: '$property.name',

        code: '$property.code',

        slug: '$property.slug',

        coverImage: '$property.coverImage',

        salePrice: '$property.prices.salePrice',

        rentPrice: '$property.prices.rentPrice',

        status: '$property.status',

        purpose: '$property.purpose',

        favorites: 1,
      },
    },
  ])
}

/* ============================================================
   ESTATÍSTICAS DE FAVORITOS
============================================================ */

export async function favoriteStatistics(propertyId) {
  if (!propertyId) {
    throw new Error('ID do imóvel não informado.')
  }

  const [total, authenticated, anonymous, converted] = await Promise.all([
    /*
     * Total
     */
    PropertyFavorite.countDocuments({
      property: propertyId,

      active: true,
    }),

    /*
     * Usuários autenticados
     */
    PropertyFavorite.countDocuments({
      property: propertyId,

      active: true,

      user: {
        $ne: null,
      },
    }),

    /*
     * Visitantes anônimos
     */
    PropertyFavorite.countDocuments({
      property: propertyId,

      active: true,

      user: null,
    }),

    /*
     * Favoritos convertidos
     */
    PropertyFavorite.countDocuments({
      property: propertyId,

      active: true,

      converted: true,
    }),
  ])

  const conversionRate =
    total > 0 ? Number(((converted / total) * 100).toFixed(2)) : 0

  return {
    total,

    authenticated,

    anonymous,

    converted,

    conversionRate,
  }
}

/* ============================================================
   FAVORITOS POR ORIGEM
============================================================ */

export async function favoritesBySource(propertyId) {
  if (!propertyId) {
    throw new Error('ID do imóvel não informado.')
  }

  return PropertyFavorite.aggregate([
    {
      $match: {
        property: propertyId,

        active: true,
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
   FAVORITOS POR DATA
============================================================ */

export async function favoritesTimeline(propertyId, days = 30) {
  if (!propertyId) {
    throw new Error('ID do imóvel não informado.')
  }

  const safeDays = Math.min(Math.max(Number(days) || 30, 1), 365)

  const start = new Date()

  start.setDate(start.getDate() - safeDays)

  start.setHours(0, 0, 0, 0)

  return PropertyFavorite.aggregate([
    {
      $match: {
        property: propertyId,

        active: true,

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
   DASHBOARD DE FAVORITOS
============================================================ */

export async function favoriteDashboard(propertyId) {
  if (!propertyId) {
    throw new Error('ID do imóvel não informado.')
  }

  const [total, today, week, month, statistics, bySource, timeline] =
    await Promise.all([
      countFavorites(propertyId),

      countFavoritesToday(propertyId),

      countFavoritesThisWeek(propertyId),

      countFavoritesThisMonth(propertyId),

      favoriteStatistics(propertyId),

      favoritesBySource(propertyId),

      favoritesTimeline(propertyId),
    ])

  return {
    total,

    today,

    week,

    month,

    statistics,

    bySource,

    timeline,
  }
}

/* ============================================================
   LIMPAR FAVORITOS INATIVOS ANTIGOS
============================================================ */

export async function removeOldInactiveFavorites(days = 90) {
  const safeDays = Math.min(Math.max(Number(days) || 90, 1), 3650)

  const date = new Date()

  date.setDate(date.getDate() - safeDays)

  return PropertyFavorite.deleteMany({
    active: false,

    updatedAt: {
      $lt: date,
    },
  })
}

/* ============================================================
   EXPORT DEFAULT
============================================================ */

export default {
  /*
   * Criação / remoção
   */
  addFavorite,

  removeFavorite,

  toggleFavorite,

  /*
   * Verificação
   */
  isFavorite,

  hasUserFavorite,

  /*
   * Usuários
   */
  getUserFavorites,

  countUserFavorites,

  favoriteUsers,

  latestFavorites,

  /*
   * Contadores
   */
  countFavorites,

  countFavoritesToday,

  countFavoritesThisWeek,

  countFavoritesThisMonth,

  /*
   * Analytics
   */
  topFavoriteProperties,

  favoriteStatistics,

  favoritesBySource,

  favoritesTimeline,

  favoriteDashboard,

  /*
   * Manutenção
   */
  removeOldInactiveFavorites,
}
