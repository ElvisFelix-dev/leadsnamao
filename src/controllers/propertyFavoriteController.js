import {
  addFavorite,
  removeFavorite,
  toggleFavorite,
  isFavorite,
  hasUserFavorite,
  getUserFavorites,
  favoriteUsers,
  latestFavorites,
  countFavorites,
  countUserFavorites,
  countFavoritesToday,
  countFavoritesThisWeek,
  countFavoritesThisMonth,
  favoriteStatistics,
  favoritesBySource,
  favoritesTimeline,
  topFavoriteProperties,
  favoriteDashboard,
  removeOldInactiveFavorites,
} from '../service/propertyFavoriteService.js'

/* ============================================================
   Adicionar Favorito
   ============================================================ */

export async function createFavorite(req, res) {
  try {
    const { propertyId } = req.params

    const {
      visitorId = '',
      sessionId = '',
      source = 'crm',
      referrer = '',
    } = req.body

    const userId = req.user?._id || null

    const result = await addFavorite({
      propertyId,
      userId,
      visitorId,
      sessionId,
      source,
      referrer,
    })

    return res.status(result.created || result.restored ? 201 : 200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Erro ao adicionar favorito:', error)

    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }
}

/* ============================================================
   Remover Favorito
   ============================================================ */

export async function deleteFavorite(req, res) {
  try {
    const { propertyId } = req.params

    const { visitorId = '' } = req.body

    const userId = req.user?._id || null

    const result = await removeFavorite({
      propertyId,
      userId,
      visitorId,
    })

    return res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Erro ao remover favorito:', error)

    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }
}

/* ============================================================
   Alternar Favorito
   ============================================================ */

export async function togglePropertyFavorite(req, res) {
  try {
    const { propertyId } = req.params

    const {
      visitorId = '',
      sessionId = '',
      source = 'crm',
      referrer = '',
    } = req.body

    const userId = req.user?._id || null

    const result = await toggleFavorite({
      propertyId,
      userId,
      visitorId,
      sessionId,
      source,
      referrer,
    })

    return res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Erro ao alternar favorito:', error)

    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }
}

/* ============================================================
   Verificar Favorito
   ============================================================ */

export async function checkFavorite(req, res) {
  try {
    const { propertyId } = req.params

    const { visitorId = '' } = req.query

    const userId = req.user?._id || null

    const result = await isFavorite({
      propertyId,
      userId,
      visitorId,
    })

    return res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Erro ao verificar favorito:', error)

    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }
}

/* ============================================================
   Favorito do Usuário
   ============================================================ */

export async function checkUserFavorite(req, res) {
  try {
    const { propertyId } = req.params

    const userId = req.user?._id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado.',
      })
    }

    const result = await hasUserFavorite(propertyId, userId)

    return res.json({
      success: true,
      data: {
        isFavorite: result,
      },
    })
  } catch (error) {
    console.error('Erro ao verificar favorito do usuário:', error)

    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }
}

/* ============================================================
   Contar Favoritos do Imóvel
   ============================================================ */

export async function getPropertyFavoriteCount(req, res) {
  try {
    const { propertyId } = req.params

    const total = await countFavorites(propertyId)

    return res.json({
      success: true,

      data: {
        total,
      },
    })
  } catch (error) {
    console.error('Erro ao contar favoritos:', error)

    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }
}

/* ============================================================
   Contar Favoritos do Usuário
   ============================================================ */

export async function getUserFavoriteCount(req, res) {
  try {
    const userId = req.user?._id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado.',
      })
    }

    const total = await countUserFavorites(userId)

    return res.json({
      success: true,

      data: {
        total,
      },
    })
  } catch (error) {
    console.error('Erro ao contar favoritos do usuário:', error)

    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }
}

/* ============================================================
   Favoritos de Hoje
   ============================================================ */

export async function getFavoritesToday(req, res) {
  try {
    const { propertyId } = req.params

    const total = await countFavoritesToday(propertyId)

    return res.json({
      success: true,

      data: {
        total,
      },
    })
  } catch (error) {
    console.error('Erro ao buscar favoritos de hoje:', error)

    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }
}

/* ============================================================
   Favoritos da Semana
   ============================================================ */

export async function getFavoritesThisWeek(req, res) {
  try {
    const { propertyId } = req.params

    const total = await countFavoritesThisWeek(propertyId)

    return res.json({
      success: true,

      data: {
        total,
      },
    })
  } catch (error) {
    console.error('Erro ao buscar favoritos da semana:', error)

    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }
}

/* ============================================================
   Favoritos do Mês
   ============================================================ */

export async function getFavoritesThisMonth(req, res) {
  try {
    const { propertyId } = req.params

    const total = await countFavoritesThisMonth(propertyId)

    return res.json({
      success: true,

      data: {
        total,
      },
    })
  } catch (error) {
    console.error('Erro ao buscar favoritos do mês:', error)

    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }
}

/* ============================================================
   Estatísticas do Imóvel
   ============================================================ */

export async function getFavoriteStatistics(req, res) {
  try {
    const { propertyId } = req.params

    const statistics = await favoriteStatistics(propertyId)

    return res.json({
      success: true,

      data: statistics,
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas de favoritos:', error)

    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }
}

/* ============================================================
   Favoritos por Origem
   ============================================================ */

export async function getFavoritesBySource(req, res) {
  try {
    const { propertyId } = req.params

    const data = await favoritesBySource(propertyId)

    return res.json({
      success: true,

      data,
    })
  } catch (error) {
    console.error('Erro ao buscar favoritos por origem:', error)

    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }
}

/* ============================================================
   Timeline de Favoritos
   ============================================================ */

export async function getFavoritesTimeline(req, res) {
  try {
    const { propertyId } = req.params

    const { days = 30 } = req.query

    const data = await favoritesTimeline(propertyId, Number(days))

    return res.json({
      success: true,

      data,
    })
  } catch (error) {
    console.error('Erro ao buscar timeline de favoritos:', error)

    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }
}

/* ============================================================
   Dashboard de Favoritos
   ============================================================ */

export async function getFavoriteDashboard(req, res) {
  try {
    const { propertyId } = req.params

    const data = await favoriteDashboard(propertyId)

    return res.json({
      success: true,

      data,
    })
  } catch (error) {
    console.error('Erro ao buscar dashboard de favoritos:', error)

    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

/* ============================================================
   Imóveis Mais Favoritados
   ============================================================ */

export async function getTopFavoriteProperties(req, res) {
  try {
    const { limit = 10 } = req.query

    const data = await topFavoriteProperties(Number(limit))

    return res.json({
      success: true,

      data,
    })
  } catch (error) {
    console.error('Erro ao buscar imóveis mais favoritados:', error)

    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

/* ============================================================
   Últimos Favoritos
   ============================================================ */

export async function getLatestFavorites(req, res) {
  try {
    const { propertyId } = req.params

    const { limit = 20 } = req.query

    const data = await latestFavorites(propertyId, Number(limit))

    return res.json({
      success: true,

      data,
    })
  } catch (error) {
    console.error('Erro ao buscar favoritos recentes:', error)

    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

/* ============================================================
   Usuários que Favoritaram
   ============================================================ */

export async function getFavoriteUsers(req, res) {
  try {
    const { propertyId } = req.params

    const { limit = 50 } = req.query

    const data = await favoriteUsers(propertyId, Number(limit))

    return res.json({
      success: true,

      data,
    })
  } catch (error) {
    console.error('Erro ao buscar usuários que favoritaram:', error)

    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

/* ============================================================
   Limpar Favoritos Inativos
   ============================================================ */

export async function cleanupInactiveFavorites(req, res) {
  try {
    const { days = 90 } = req.query

    const result = await removeOldInactiveFavorites(Number(days))

    return res.json({
      success: true,

      data: {
        deleted: result.deletedCount || 0,
      },
    })
  } catch (error) {
    console.error('Erro ao limpar favoritos inativos:', error)

    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

/* ============================================================
   Favoritos do Usuário
   ============================================================ */

export async function getMyFavorites(req, res) {
  try {
    const userId = req.user?._id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado.',
      })
    }

    const { limit = 50, skip = 0 } = req.query

    const favorites = await getUserFavorites(userId, {
      limit: Number(limit),
      skip: Number(skip),
    })

    return res.json({
      success: true,

      data: favorites,
    })
  } catch (error) {
    console.error('Erro ao buscar meus favoritos:', error)

    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

/* ============================================================
   EXPORT CONTROLLER
   ============================================================ */

export default {
  /* ----------------------------------------------------------
     Criação / Alteração
  ---------------------------------------------------------- */

  createFavorite,

  deleteFavorite,

  togglePropertyFavorite,

  /* ----------------------------------------------------------
     Verificação
  ---------------------------------------------------------- */

  checkFavorite,

  checkUserFavorite,

  /* ----------------------------------------------------------
     Favoritos do usuário
  ---------------------------------------------------------- */

  getMyFavorites,

  getUserFavoriteCount,

  /* ----------------------------------------------------------
     Contadores
  ---------------------------------------------------------- */

  getPropertyFavoriteCount,

  getFavoritesToday,

  getFavoritesThisWeek,

  getFavoritesThisMonth,

  /* ----------------------------------------------------------
     Analytics
  ---------------------------------------------------------- */

  getFavoriteStatistics,

  getFavoritesBySource,

  getFavoritesTimeline,

  /* ----------------------------------------------------------
     Dashboard
  ---------------------------------------------------------- */

  getFavoriteDashboard,

  /* ----------------------------------------------------------
     Ranking
  ---------------------------------------------------------- */

  getTopFavoriteProperties,

  /* ----------------------------------------------------------
     Listagens
  ---------------------------------------------------------- */

  getLatestFavorites,

  getFavoriteUsers,

  /* ----------------------------------------------------------
     Manutenção
  ---------------------------------------------------------- */

  cleanupInactiveFavorites,
}
