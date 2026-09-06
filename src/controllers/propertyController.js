import asyncHandler from '../middleware/asyncHandler.js'

import * as propertyService from '../service/property/propertyService.js'

/* ============================================================
   CREATE
============================================================ */

export const createProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.createProperty(req.body, req.user._id)

  res.status(201).json({
    success: true,
    message: 'Imóvel cadastrado com sucesso.',
    data: property,
  })
})

/* ============================================================
   GET ALL
============================================================ */

export const getProperties = asyncHandler(async (req, res) => {
  const result = await propertyService.getAllProperties(req.query)

  res.json({
    success: true,
    ...result,
  })
})

/* ============================================================
   GET BY ID
============================================================ */

export const getProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.getPropertyById(req.params.id)

  res.json({
    success: true,
    data: property,
  })
})

/* ============================================================
   GET BY ID — CRM
============================================================ */

export const getPropertyCRM = asyncHandler(async (req, res) => {
  const property = await propertyService.getPropertyCRMById(req.params.id)

  res.json({
    success: true,
    data: property,
  })
})

/* ============================================================
   GET BY SLUG
============================================================ */

export const getPropertyBySlug = asyncHandler(async (req, res) => {
  const property = await propertyService.getPropertyBySlug(req.params.slug)

  res.json({
    success: true,
    data: property,
  })
})

/* ============================================================
   GET BY CODE
============================================================ */

export const getPropertyByCode = asyncHandler(async (req, res) => {
  const property = await propertyService.getPropertyByCode(req.params.code)

  res.json({
    success: true,
    data: property,
  })
})

/* ============================================================
   UPDATE
============================================================ */

export const updateProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.updateProperty(
    req.params.id,
    req.body,
    req.user._id,
  )

  res.json({
    success: true,
    message: 'Imóvel atualizado com sucesso.',
    data: property,
  })
})

/* ============================================================
   DELETE (SOFT DELETE)
============================================================ */

export const deleteProperty = asyncHandler(async (req, res) => {
  await propertyService.deleteProperty(req.params.id, req.user._id)

  res.json({
    success: true,
    message: 'Imóvel removido com sucesso.',
  })
})

/* ============================================================
   RESTORE
============================================================ */

export const restoreProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.restoreProperty(
    req.params.id,
    req.user._id,
  )

  res.json({
    success: true,
    message: 'Imóvel restaurado com sucesso.',
    data: property,
  })
})

/* ============================================================
   PUBLICAR
============================================================ */

export const publishProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.publishProperty(
    req.params.id,
    req.user._id,
  )

  res.json({
    success: true,
    message: 'Imóvel publicado com sucesso.',
    data: property,
  })
})

/* ============================================================
   DESPUBLICAR
============================================================ */

export const unpublishProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.unpublishProperty(
    req.params.id,
    req.user._id,
  )

  res.json({
    success: true,
    message: 'Imóvel despublicado com sucesso.',
    data: property,
  })
})

/* ============================================================
   ARQUIVAR
============================================================ */

export const archiveProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.archiveProperty(
    req.params.id,
    req.user._id,
  )

  res.json({
    success: true,
    message: 'Imóvel arquivado com sucesso.',
    data: property,
  })
})

/* ============================================================
   REATIVAR
============================================================ */

export const activateProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.activateProperty(
    req.params.id,
    req.user._id,
  )

  res.json({
    success: true,
    message: 'Imóvel reativado com sucesso.',
    data: property,
  })
})

/* ============================================================
   DESTACAR / REMOVER DESTAQUE
============================================================ */

export const toggleFeatured = asyncHandler(async (req, res) => {
  const property = await propertyService.toggleFeatured(
    req.params.id,
    req.user._id,
  )

  res.json({
    success: true,
    message: property.featured
      ? 'Imóvel destacado com sucesso.'
      : 'Imóvel removido dos destaques.',
    data: property,
  })
})

/* ============================================================
   ATRIBUIR CORRETOR
============================================================ */

export const assignBroker = asyncHandler(async (req, res) => {
  const { brokerId } = req.body

  const property = await propertyService.assignBroker(
    req.params.id,
    brokerId,
    req.user._id,
  )

  res.json({
    success: true,
    message: 'Corretor atribuído com sucesso.',
    data: property,
  })
})

/* ============================================================
   DUPLICAR IMÓVEL
============================================================ */

export const duplicateProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.duplicateProperty(
    req.params.id,
    req.user._id,
  )

  res.status(201).json({
    success: true,
    message: 'Imóvel duplicado com sucesso.',
    data: property,
  })
})

/* ============================================================
   VISUALIZAÇÕES
============================================================ */

export const incrementViews = asyncHandler(async (req, res) => {
  const views = await propertyService.incrementViews(req.params.id)

  res.json({
    success: true,
    views,
  })
})

/* ============================================================
   FAVORITOS
============================================================ */

export const incrementFavorites = asyncHandler(async (req, res) => {
  const favorites = await propertyService.incrementFavorites(req.params.id)

  res.json({
    success: true,
    favorites,
  })
})

/* ============================================================
   CONTATOS
============================================================ */

export const incrementContacts = asyncHandler(async (req, res) => {
  const contacts = await propertyService.incrementContacts(req.params.id)

  res.json({
    success: true,
    contacts,
  })
})

/* ============================================================
   FEATURED
============================================================ */

export const getFeaturedProperties = asyncHandler(async (req, res) => {
  const { limit } = req.query

  const properties = await propertyService.getFeaturedProperties(limit)

  res.json({
    success: true,
    data: properties,
  })
})

/* ============================================================
   LATEST
============================================================ */

export const getLatestProperties = asyncHandler(async (req, res) => {
  const { limit } = req.query

  const properties = await propertyService.getLatestProperties(limit)

  res.json({
    success: true,
    data: properties,
  })
})

/* ============================================================
   SEARCH
============================================================ */

export const searchProperties = asyncHandler(async (req, res) => {
  const { q } = req.query

  const result = await propertyService.searchProperties(q, req.query)

  res.json({
    success: true,
    ...result,
  })
})

/* ============================================================
   FILTER
============================================================ */

export const filterProperties = asyncHandler(async (req, res) => {
  const properties = await propertyService.filterProperties(req.query)

  res.json({
    success: true,
    total: properties.length,
    data: properties,
  })
})

/* ============================================================
   BY BROKER
============================================================ */

export const getBrokerProperties = asyncHandler(async (req, res) => {
  const properties = await propertyService.getBrokerProperties(
    req.params.brokerId,
  )

  res.json({
    success: true,
    total: properties.length,
    data: properties,
  })
})

/* ============================================================
   BY REGION
============================================================ */

export const getPropertiesByRegion = asyncHandler(async (req, res) => {
  const properties = await propertyService.getPropertiesByRegion(
    req.params.region,
  )

  res.json({
    success: true,
    total: properties.length,
    data: properties,
  })
})

/* ============================================================
   BY PURPOSE
============================================================ */

export const getPropertiesByPurpose = asyncHandler(async (req, res) => {
  const properties = await propertyService.getPropertiesByPurpose(
    req.params.purpose,
  )

  res.json({
    success: true,
    total: properties.length,
    data: properties,
  })
})

/* ============================================================
   BY TYPE
============================================================ */

export const getPropertiesByType = asyncHandler(async (req, res) => {
  const properties = await propertyService.getPropertiesByType(req.params.type)

  res.json({
    success: true,
    total: properties.length,
    data: properties,
  })
})

/* ============================================================
   STATISTICS
============================================================ */

export const getPropertyStatistics = asyncHandler(async (req, res) => {
  const statistics = await propertyService.getPropertyStatistics()

  res.json({
    success: true,
    data: statistics,
  })
})

/* ============================================================
   DASHBOARD
============================================================ */

export const getDashboardData = asyncHandler(async (req, res) => {
  const dashboard = await propertyService.getDashboardData()

  res.json({
    success: true,
    data: dashboard,
  })
})

/* ============================================================
   MÉTRICAS DO IMÓVEL
============================================================ */

/**
 * GET /api/properties/:id/metrics
 * Busca todas as métricas de um imóvel (favoritos, views, contatos, visitas)
 * Apenas admin ou corretor proprietário podem ver
 */
export const getPropertyMetrics = asyncHandler(async (req, res) => {
  const { id } = req.params

  // Verificar se o imóvel existe
  const property = await propertyService.getPropertyById(id)

  // Verificar permissão: admin ou corretor do imóvel
  const isAdmin = req.user.isAdmin || req.user.role === 'admin'
  const isOwner =
    property.broker?._id?.toString() === req.user._id?.toString() ||
    property.broker?.toString() === req.user._id?.toString()

  if (!isAdmin && !isOwner) {
    return res.status(403).json({
      success: false,
      message:
        'Acesso negado. Apenas o corretor responsável ou admin podem ver as métricas.',
    })
  }

  const metrics = await propertyService.getPropertyMetrics(id)

  res.json({
    success: true,
    data: metrics,
  })
})

/* ============================================================
   MÉTRICAS EM MASSA
============================================================ */

/**
 * POST /api/properties/metrics/batch
 * Busca métricas para múltiplos imóveis
 * Body: { propertyIds: [...] }
 */
export const getBatchPropertyMetrics = asyncHandler(async (req, res) => {
  const { propertyIds } = req.body

  if (!propertyIds || !Array.isArray(propertyIds) || propertyIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Informe um array de IDs de imóveis.',
    })
  }

  // Verificar permissão: admin ou corretores proprietários
  const isAdmin = req.user.isAdmin || req.user.role === 'admin'

  let properties
  if (isAdmin) {
    // Admin vê tudo
    properties = await Promise.all(
      propertyIds.map((id) =>
        propertyService.getPropertyById(id).catch(() => null),
      ),
    )
  } else {
    // Corretor vê apenas seus imóveis
    properties = await Promise.all(
      propertyIds.map(async (id) => {
        try {
          const property = await propertyService.getPropertyById(id)
          const isOwner =
            property.broker?._id?.toString() === req.user._id?.toString() ||
            property.broker?.toString() === req.user._id?.toString()
          return isOwner ? property : null
        } catch {
          return null
        }
      }),
    )
  }

  const validProperties = properties.filter((p) => p !== null)
  const validIds = validProperties.map((p) => p._id)

  const metrics = await propertyService.getPropertiesMetrics(validIds)

  res.json({
    success: true,
    data: metrics,
  })
})

/* ============================================================
   TIMELINE DE ENGAGEMENT
============================================================ */

/**
 * GET /api/properties/:id/timeline
 * Busca timeline de engajamento do imóvel (últimos 30 dias por padrão)
 * Query: { days: 30 }
 */
export const getPropertyTimeline = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { days = 30 } = req.query

  // Verificar se o imóvel existe
  const property = await propertyService.getPropertyById(id)

  // Verificar permissão
  const isAdmin = req.user.isAdmin || req.user.role === 'admin'
  const isOwner =
    property.broker?._id?.toString() === req.user._id?.toString() ||
    property.broker?.toString() === req.user._id?.toString()

  if (!isAdmin && !isOwner) {
    return res.status(403).json({
      success: false,
      message:
        'Acesso negado. Apenas o corretor responsável ou admin podem ver as métricas.',
    })
  }

  const timeline = await propertyService.getPropertyEngagementTimeline(
    id,
    Number(days),
  )

  res.json({
    success: true,
    data: {
      property: {
        id: property._id,
        name: property.name,
        code: property.code,
        status: property.status,
      },
      days: Number(days),
      timeline,
    },
  })
})

/* ============================================================
   IMÓVEIS MAIS POPULARES
============================================================ */

/* ============================================================
   LISTA PÚBLICA (SITE / HOTSITES)
============================================================ */

/**
 * GET /api/properties/public
 * Lista imóveis para exibição pública (site e hotsites)
 * Apenas imóveis: ativos, publicados, disponíveis
 * Suporta todos os filtros: type, purpose, city, minPrice, maxPrice, etc.
 */
export const getPublicProperties = asyncHandler(async (req, res) => {
  const result = await propertyService.getPublicProperties(req.query)

  res.json({
    success: true,
    ...result,
  })
})

/* ============================================================
   IMÓVEIS DO CORRETOR COM MÉTRICAS
============================================================ */

/**
 * GET /api/properties/broker/me
 * Lista todos os imóveis do corretor logado com métricas
 * Inclui imóveis vendidos (para histórico)
 * Query: { page, limit, status, search, sort }
 */
export const getMyBrokerProperties = asyncHandler(async (req, res) => {
  const result = await propertyService.getBrokerPropertiesWithStats(
    req.user._id,
    req.query,
  )

  res.json({
    success: true,
    ...result,
  })
})

/* ============================================================
   ADMIN SUMMARY
============================================================ */

/**
 * GET /api/properties/admin/summary
 * Resumo administrativo dos imóveis
 * Acesso restrito a admin
 */
export const getPropertyAdminSummary = asyncHandler(async (req, res) => {
  // Verificar se é admin
  const isAdmin = req.user.isAdmin || req.user.role === 'admin'

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Apenas administradores.',
    })
  }

  const summary = await propertyService.getPropertyAdminSummary()

  res.json({
    success: true,
    data: summary,
  })
})

/* ============================================================
   GET BY BROKER WITH METRICS (Admin)
============================================================ */

/**
 * GET /api/properties/broker/:brokerId/with-metrics
 * Lista imóveis de um corretor específico com métricas
 * Acesso restrito a admin
 */
export const getBrokerPropertiesWithMetrics = asyncHandler(async (req, res) => {
  const { brokerId } = req.params

  const isAdmin = req.user.isAdmin || req.user.role === 'admin'

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Apenas administradores.',
    })
  }

  const result = await propertyService.getBrokerPropertiesWithStats(
    brokerId,
    req.query,
  )

  res.json({
    success: true,
    ...result,
  })
})

/* ============================================================
   IMÓVEIS MAIS POPULARES
============================================================ */

/**
 * GET /api/properties/popular
 * Lista os imóveis mais populares baseado em engajamento
 *
 * Query Parameters:
 * - limit: número de resultados (padrão: 20)
 * - sort: ordenação (views, contacts, favorites, conversion, engagement)
 * - type: filtrar por tipo de imóvel
 * - status: filtrar por status (padrão: disponivel)
 * - days: dias para análise (padrão: 30)
 */
export const getPopularProperties = asyncHandler(async (req, res) => {
  const {
    limit = 20,
    sort = 'views',
    type,
    status = 'disponivel',
    days = 30,
  } = req.query

  console.log('📊 Buscando imóveis populares:', {
    limit,
    sort,
    type,
    status,
    days,
  })

  // 🔥 CORREÇÃO: Buscar imóveis e formatar os dados
  const properties = await propertyService.getPopularProperties({
    limit: Number(limit),
    sort,
    type,
    status,
    days: Number(days),
  })

  // 🔥 FORMATAR OS DADOS PARA O FRONTEND
  const formattedProperties = properties.map((property) => ({
    _id: property._id,
    name: property.name,
    slug: property.slug,
    code: property.code,
    type: property.type,
    category: property.category,
    purpose: property.purpose,
    status: property.status,
    price: property.prices?.salePrice || property.price || 0,
    prices: property.prices,
    dimensions: property.dimensions,
    location: property.location,
    bedrooms: property.bedrooms || 0,
    bathrooms: property.bathrooms || 0,
    parkingSpaces: property.parkingSpaces || 0,
    suites: property.suites || 0,
    features: property.features || [],
    images: property.images || [],
    coverImage: property.coverImage || '',
    featured: property.featured || false,
    exclusive: property.exclusive || false,
    // 🔥 CAMPOS DE ESTATÍSTICAS FORMATADOS
    totalViews: property.totalViews || property.statistics?.views || 0,
    totalContacts: property.totalContacts || property.statistics?.contacts || 0,
    totalFavorites:
      property.totalFavorites || property.statistics?.favorites || 0,
    totalVisits:
      property.totalVisits || property.statistics?.visitsScheduled || 0,
    conversionRate: property.conversionRate || 0,
    engagementScore: property.engagementScore || 0,
    // Manter o objeto statistics original
    statistics: property.statistics || {
      views: 0,
      contacts: 0,
      favorites: 0,
      visitsScheduled: 0,
      proposals: 0,
    },
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
  }))

  res.json({
    success: true,
    data: formattedProperties,
    meta: {
      total: formattedProperties.length,
      sort,
      type: type || 'todos',
      status,
      limit: Number(limit),
      days: Number(days),
    },
  })
})
