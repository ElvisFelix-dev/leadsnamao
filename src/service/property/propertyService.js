import mongoose from 'mongoose'

import Property from '../../models/Property.js'

import AppError from '../../utils/AppError.js'
import { PROPERTY_STATUS } from '../../constants/propertyStatus.js'

/* ============================================================
   POPULATE
============================================================ */

export const PROPERTY_POPULATE = [
  {
    path: 'broker',
    select: 'name email avatar phone',
  },
  {
    path: 'createdBy',
    select: 'name email avatar',
  },
  {
    path: 'assignedTo',
    select: 'name email avatar',
  },
]

/*
============================================================
POPULATE CRM
============================================================
*/

export const PROPERTY_CRM_POPULATE = [
  {
    path: 'broker',
    select: 'name email avatar phone position slug',
  },
  {
    path: 'createdBy',
    select: 'name email avatar position',
  },
  {
    path: 'updatedBy',
    select: 'name email avatar position',
  },
  {
    path: 'assignedTo',
    select: 'name email avatar phone position slug',
  },
  {
    path: 'captation.broker',
    select: 'name email avatar phone position slug',
  },
]

/* ============================================================
   HELPERS
============================================================ */

const DEFAULT_LIMIT = 12

const MAX_LIMIT = 100

function normalizePagination(page = 1, limit = DEFAULT_LIMIT) {
  page = Number(page)
  limit = Number(limit)

  if (page < 1) page = 1

  if (limit < 1) limit = DEFAULT_LIMIT

  if (limit > MAX_LIMIT) limit = MAX_LIMIT

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  }
}

function buildSort(sort) {
  switch (sort) {
    case 'price_asc':
      return { 'prices.salePrice': 1 }

    case 'price_desc':
      return { 'prices.salePrice': -1 }

    case 'views':
      return { 'statistics.views': -1 }

    case 'favorites':
      return { 'statistics.favorites': -1 }

    case 'oldest':
      return { createdAt: 1 }

    case 'updated':
      return { updatedAt: -1 }

    default:
      return { createdAt: -1 }
  }
}

/* ============================================================
   CREATE
============================================================ */

export async function createProperty(data, userId) {
  const property = await Property.create({
    ...data,
    createdBy: userId,
  })

  return Property.findById(property._id).populate(PROPERTY_POPULATE)
}

/* ============================================================
   GET ALL
============================================================ */

export async function getAllProperties(query = {}) {
  const {
    page,
    limit,
    status,
    type,
    category,
    purpose,
    city,
    region,
    broker,
    featured,
    active,
    search,
    sort,
  } = query

  const pagination = normalizePagination(page, limit)

  const filters = {
    isDeleted: false,
  }

  if (status) filters.status = status

  if (type) filters.type = type

  if (category) filters.category = category

  if (purpose) filters.purpose = purpose

  if (broker) filters.broker = broker

  if (typeof featured !== 'undefined') {
    filters.featured = featured === 'true'
  }

  if (typeof active !== 'undefined') {
    filters.active = active === 'true'
  }

  if (city) {
    filters['location.city'] = new RegExp(city, 'i')
  }

  if (region) {
    filters['location.region'] = region
  }

  if (search) {
    filters.$text = {
      $search: search,
    }
  }

  const [properties, total] = await Promise.all([
    Property.find(filters)
      .populate(PROPERTY_POPULATE)
      .sort(buildSort(sort))
      .skip(pagination.skip)
      .limit(pagination.limit),

    Property.countDocuments(filters),
  ])

  return {
    data: properties,

    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
      hasNext: pagination.page < Math.ceil(total / pagination.limit),
      hasPrev: pagination.page > 1,
    },
  }
}

/* ============================================================
   GET BY ID
============================================================ */

export async function getPropertyById(id) {
  const property = await Property.findOne({
    _id: id,
    isDeleted: false,
  }).populate(PROPERTY_POPULATE)

  if (!property) {
    throw new AppError('Imóvel não encontrado.', 404)
  }

  return property
}

/* ============================================================
   GET BY SLUG
============================================================ */

export async function getPropertyBySlug(slug) {
  const property = await Property.findOne({
    slug,
    active: true,
    published: true,
    isDeleted: false,
  }).populate(PROPERTY_POPULATE)

  if (!property) {
    throw new AppError('Imóvel não encontrado.', 404)
  }

  return property
}

/* ============================================================
   GET BY CODE
============================================================ */

export async function getPropertyByCode(code) {
  const property = await Property.findOne({
    code,
    isDeleted: false,
  }).populate(PROPERTY_POPULATE)

  if (!property) {
    throw new AppError('Imóvel não encontrado.', 404)
  }

  return property
}

/* ============================================================
   UPDATE
============================================================ */

export async function updateProperty(id, data, userId) {
  const property = await Property.findOne({
    _id: id,
    isDeleted: false,
  })

  if (!property) {
    throw new AppError('Imóvel não encontrado.', 404)
  }

  Object.assign(property, data)

  property.updatedBy = userId

  await property.save()

  return Property.findById(property._id).populate(PROPERTY_POPULATE)
}

/* ============================================================
   SOFT DELETE
============================================================ */

export async function deleteProperty(id, userId) {
  const property = await Property.findOne({
    _id: id,
    isDeleted: false,
  })

  if (!property) {
    throw new AppError('Imóvel não encontrado.', 404)
  }

  property.isDeleted = true
  property.deletedAt = new Date()
  property.updatedBy = userId
  property.active = false
  property.published = false
  property.isPublished = false
  property.status = PROPERTY_STATUS.INACTIVE

  await property.save()

  return property
}

/* ============================================================
   PUBLICAR
============================================================ */

export async function publishProperty(id, userId) {
  const property = await getPropertyById(id)

  property.published = true
  property.isPublished = true
  property.active = true
  property.status = PROPERTY_STATUS.AVAILABLE
  property.updatedBy = userId

  if (!property.publishedAt) {
    property.publishedAt = new Date()
  }

  await property.save()

  return Property.findById(property._id).populate(PROPERTY_POPULATE)
}

/* ============================================================
   DESPUBLICAR
============================================================ */

export async function unpublishProperty(id, userId) {
  const property = await getPropertyById(id)

  property.published = false
  property.isPublished = false
  property.updatedBy = userId

  await property.save()

  return Property.findById(property._id).populate(PROPERTY_POPULATE)
}

/* ============================================================
   ARQUIVAR - CORRIGIDO ✅
============================================================ */

export async function archiveProperty(id, userId) {
  const property = await getPropertyById(id)

  // 🔥 DEFINE O STATUS CORRETAMENTE
  property.active = false
  property.published = false
  property.isPublished = false
  property.status = PROPERTY_STATUS.ARCHIVED // 'arquivado'
  property.archivedAt = new Date()
  property.updatedBy = userId

  await property.save()

  return Property.findById(property._id).populate(PROPERTY_POPULATE)
}

/* ============================================================
   RESTAURAR - CORRIGIDO ✅
============================================================ */

export async function restoreProperty(id, userId) {
  const property = await Property.findById(id)

  if (!property) {
    throw new AppError('Imóvel não encontrado.', 404)
  }

  // 🔥 RESTAURA O STATUS
  property.isDeleted = false
  property.deletedAt = null
  property.active = true
  property.published = true
  property.isPublished = true
  property.status = PROPERTY_STATUS.AVAILABLE // 'disponivel'
  property.archivedAt = null
  property.updatedBy = userId

  await property.save()

  return Property.findById(property._id).populate(PROPERTY_POPULATE)
}

/* ============================================================
   REATIVAR (ACTIVATE) - CORRIGIDO ✅
============================================================ */

export async function activateProperty(id, userId) {
  const property = await getPropertyById(id)

  property.active = true
  property.published = true
  property.isPublished = true
  property.status = PROPERTY_STATUS.AVAILABLE
  property.archivedAt = null
  property.updatedBy = userId

  await property.save()

  return Property.findById(property._id).populate(PROPERTY_POPULATE)
}

/* ============================================================
   DESTACAR
============================================================ */

export async function toggleFeatured(id, userId) {
  const property = await getPropertyById(id)

  property.featured = !property.featured
  property.updatedBy = userId

  await property.save()

  return property
}

/* ============================================================
   ATRIBUIR CORRETOR
============================================================ */

export async function assignBroker(propertyId, brokerId, userId) {
  const property = await getPropertyById(propertyId)

  property.broker = brokerId
  property.updatedBy = userId

  await property.save()

  return Property.findById(property._id).populate(PROPERTY_POPULATE)
}

/* ============================================================
   DUPLICAR IMÓVEL
============================================================ */

export async function duplicateProperty(id, userId) {
  const property = await getPropertyById(id)

  const copy = property.toObject()

  delete copy._id
  delete copy.id
  delete copy.slug
  delete copy.code
  delete copy.createdAt
  delete copy.updatedAt

  copy.name = `${copy.name} (Cópia)`
  copy.createdBy = userId
  copy.updatedBy = userId
  copy.statistics = {
    views: 0,
    favorites: 0,
    contacts: 0,
    visitsScheduled: 0,
    proposals: 0,
  }

  const duplicated = await Property.create(copy)

  return Property.findById(duplicated._id).populate(PROPERTY_POPULATE)
}

/* ============================================================
   FEATURED
============================================================ */

export async function getFeaturedProperties(limit = 8) {
  return Property.find({
    featured: true,
    active: true,
    published: true,
    isDeleted: false,
    status: PROPERTY_STATUS.AVAILABLE,
  })
    .populate(PROPERTY_POPULATE)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
}

/* ============================================================
   LATEST
============================================================ */

export async function getLatestProperties(limit = 12) {
  return Property.find({
    active: true,
    published: true,
    isDeleted: false,
  })
    .populate(PROPERTY_POPULATE)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
}

/* ============================================================
   SEARCH
============================================================ */

export async function searchProperties(search, options = {}) {
  return getAllProperties({
    ...options,
    search,
  })
}

/* ============================================================
   ADVANCED FILTER
============================================================ */

export async function filterProperties(filters = {}) {
  const query = {
    isDeleted: false,
    active: true,
    published: true,
  }

  if (filters.type) query.type = filters.type

  if (filters.category) query.category = filters.category

  if (filters.purpose) query.purpose = filters.purpose

  if (filters.status) query.status = filters.status

  if (filters.region) query['location.region'] = filters.region

  if (filters.city) {
    query['location.city'] = new RegExp(filters.city, 'i')
  }

  if (filters.bedrooms) {
    query.bedrooms = { $gte: Number(filters.bedrooms) }
  }

  if (filters.bathrooms) {
    query.bathrooms = { $gte: Number(filters.bathrooms) }
  }

  if (filters.parkingSpaces) {
    query.parkingSpaces = { $gte: Number(filters.parkingSpaces) }
  }

  if (filters.minPrice || filters.maxPrice) {
    query['prices.salePrice'] = {}

    if (filters.minPrice) {
      query['prices.salePrice'].$gte = Number(filters.minPrice)
    }

    if (filters.maxPrice) {
      query['prices.salePrice'].$lte = Number(filters.maxPrice)
    }
  }

  return Property.find(query)
    .populate(PROPERTY_POPULATE)
    .sort({ createdAt: -1 })
}

/* ============================================================
   BY BROKER
============================================================ */

export async function getBrokerProperties(brokerId) {
  return Property.find({
    broker: brokerId,
    isDeleted: false,
  })
    .populate(PROPERTY_POPULATE)
    .sort({ createdAt: -1 })
}

/* ============================================================
   BY REGION
============================================================ */

export async function getPropertiesByRegion(region) {
  return Property.find({
    'location.region': region,
    active: true,
    published: true,
    isDeleted: false,
  }).populate(PROPERTY_POPULATE)
}

/* ============================================================
   BY PURPOSE
============================================================ */

export async function getPropertiesByPurpose(purpose) {
  return Property.find({
    purpose,
    active: true,
    published: true,
    isDeleted: false,
  }).populate(PROPERTY_POPULATE)
}

/* ============================================================
   BY TYPE
============================================================ */

export async function getPropertiesByType(type) {
  return Property.find({
    type,
    active: true,
    published: true,
    isDeleted: false,
  }).populate(PROPERTY_POPULATE)
}

/* ============================================================
   DASHBOARD STATS
============================================================ */

export async function getPropertyStatistics() {
  const [total, available, sold, rented, featured, inactive] =
    await Promise.all([
      Property.countDocuments({
        isDeleted: false,
      }),

      Property.countDocuments({
        status: PROPERTY_STATUS.AVAILABLE,
        isDeleted: false,
      }),

      Property.countDocuments({
        status: PROPERTY_STATUS.SOLD,
        isDeleted: false,
      }),

      Property.countDocuments({
        status: PROPERTY_STATUS.RENTED,
        isDeleted: false,
      }),

      Property.countDocuments({
        featured: true,
        isDeleted: false,
      }),

      Property.countDocuments({
        active: false,
        isDeleted: false,
      }),
    ])

  const views = await Property.aggregate([
    {
      $group: {
        _id: null,
        totalViews: {
          $sum: '$statistics.views',
        },
        totalFavorites: {
          $sum: '$statistics.favorites',
        },
        totalContacts: {
          $sum: '$statistics.contacts',
        },
      },
    },
  ])

  return {
    total,
    available,
    sold,
    rented,
    featured,
    inactive,

    totalViews: views[0]?.totalViews || 0,
    totalFavorites: views[0]?.totalFavorites || 0,
    totalContacts: views[0]?.totalContacts || 0,
  }
}

/* ============================================================
   DASHBOARD
============================================================ */

export async function getDashboardData() {
  const [statistics, latestProperties, featuredProperties] = await Promise.all([
    getPropertyStatistics(),
    getLatestProperties(5),
    getFeaturedProperties(5),
  ])

  return {
    statistics,
    latestProperties,
    featuredProperties,
  }
}

/*
============================================================
GET BY ID — CRM
============================================================
*/

export async function getPropertyCRMById(id) {
  const property = await Property.findOne({
    _id: id,
    isDeleted: false,
  }).populate(PROPERTY_CRM_POPULATE)

  if (!property) {
    throw new AppError('Imóvel não encontrado.', 404)
  }

  return property
}

/**
 * Busca todas as métricas de um imóvel
 * Inclui: favoritos, visualizações, contatos, visitas
 */
export async function getPropertyMetrics(id) {
  const property = await Property.findById(id)
    .select('_id name code status statistics')
    .lean()

  if (!property) {
    throw new AppError('Imóvel não encontrado.', 404)
  }

  // Buscar métricas de outras collections
  const [favorites, views, contacts, visits, proposals] = await Promise.all([
    // Favoritos
    mongoose.model('PropertyFavorite').countDocuments({
      property: id,
      active: true,
    }),
    // Visualizações
    mongoose.model('PropertyView').countDocuments({
      property: id,
    }),
    // Contatos (lead captures)
    mongoose.model('LeadCapture').countDocuments({
      property: id,
    }),
    // Visitas
    mongoose.model('Visit').countDocuments({
      property: id,
    }),
    // Propostas
    mongoose.model('Proposal').countDocuments({
      property: id,
      isDeleted: false,
    }),
  ])

  return {
    property: {
      id: property._id,
      name: property.name,
      code: property.code,
      status: property.status,
      statistics: property.statistics || {},
    },
    metrics: {
      favorites,
      views,
      contacts,
      visits,
      proposals,
      total: favorites + views + contacts + visits + proposals,
    },
  }
}

/**
 * Busca métricas para múltiplos imóveis
 */
export async function getPropertiesMetrics(propertyIds) {
  const metrics = await Promise.all(
    propertyIds.map(async (propertyId) => {
      try {
        const result = await getPropertyMetrics(propertyId)
        return result
      } catch (error) {
        return {
          property: { id: propertyId },
          metrics: {
            favorites: 0,
            views: 0,
            contacts: 0,
            visits: 0,
            proposals: 0,
            total: 0,
          },
        }
      }
    }),
  )

  return metrics
}

/* ============================================================
   IMÓVEIS MAIS POPULARES
============================================================ */

/**
 * Busca os imóveis mais populares baseado em engajamento
 * (favoritos + visualizações + contatos + visitas)
 */
export async function getMostPopularProperties(limit = 10) {
  const properties = await Property.aggregate([
    {
      $match: {
        isDeleted: false,
      },
    },
    {
      $lookup: {
        from: 'propertyfavorites',
        localField: '_id',
        foreignField: 'property',
        as: 'favorites',
      },
    },
    {
      $lookup: {
        from: 'propertyviews',
        localField: '_id',
        foreignField: 'property',
        as: 'views',
      },
    },
    {
      $lookup: {
        from: 'leadcaptures',
        localField: '_id',
        foreignField: 'property',
        as: 'contacts',
      },
    },
    {
      $lookup: {
        from: 'visits',
        localField: '_id',
        foreignField: 'property',
        as: 'visits',
      },
    },
    {
      $addFields: {
        totalFavorites: { $size: '$favorites' },
        totalViews: { $size: '$views' },
        totalContacts: { $size: '$contacts' },
        totalVisits: { $size: '$visits' },
        totalEngagement: {
          $sum: [
            { $size: '$favorites' },
            { $size: '$views' },
            { $size: '$contacts' },
            { $size: '$visits' },
          ],
        },
      },
    },
    {
      $sort: {
        totalEngagement: -1,
      },
    },
    {
      $limit: Number(limit),
    },
    {
      $project: {
        _id: 1,
        name: 1,
        code: 1,
        slug: 1,
        coverImage: 1,
        prices: 1,
        purpose: 1,
        type: 1,
        status: 1,
        location: 1,
        totalFavorites: 1,
        totalViews: 1,
        totalContacts: 1,
        totalVisits: 1,
        totalEngagement: 1,
      },
    },
  ])

  return properties
}

/* ============================================================
   ESTATÍSTICAS DE ENGajAMENTO POR PERÍODO
============================================================ */

/**
 * Busca estatísticas de engajamento de um imóvel por período
 */
export async function getPropertyEngagementTimeline(propertyId, days = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  const [views, favorites, contacts, visits] = await Promise.all([
    // Visualizações por dia
    mongoose.model('PropertyView').aggregate([
      {
        $match: {
          property: mongoose.Types.ObjectId(propertyId),
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]),
    // Favoritos por dia
    mongoose.model('PropertyFavorite').aggregate([
      {
        $match: {
          property: mongoose.Types.ObjectId(propertyId),
          createdAt: { $gte: startDate },
          active: true,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]),
    // Contatos por dia
    mongoose.model('LeadCapture').aggregate([
      {
        $match: {
          property: mongoose.Types.ObjectId(propertyId),
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]),
    // Visitas por dia
    mongoose.model('Visit').aggregate([
      {
        $match: {
          property: mongoose.Types.ObjectId(propertyId),
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]),
  ])

  // Combinar todos os dados em uma única timeline
  const timeline = {}
  const allDates = new Set()

  const addToTimeline = (data, type) => {
    data.forEach((item) => {
      const date = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`
      allDates.add(date)
      if (!timeline[date]) {
        timeline[date] = {
          date,
          views: 0,
          favorites: 0,
          contacts: 0,
          visits: 0,
        }
      }
      timeline[date][type] = item.count
    })
  }

  addToTimeline(views, 'views')
  addToTimeline(favorites, 'favorites')
  addToTimeline(contacts, 'contacts')
  addToTimeline(visits, 'visits')

  return Object.values(timeline).sort((a, b) => a.date.localeCompare(b.date))
}

/* ============================================================
   GET PUBLIC PROPERTIES (Site e Hotsites)
============================================================ */

/**
 * Busca imóveis para exibição pública (site e hotsites)
 * Apenas imóveis: ativos, publicados, disponíveis e não deletados
 */
export async function getPublicProperties(query = {}) {
  const {
    page = 1,
    limit = 20,
    status,
    type,
    category,
    purpose,
    city,
    region,
    broker,
    featured,
    search,
    sort,
    minPrice,
    maxPrice,
    bedrooms,
    bathrooms,
    parkingSpaces,
  } = query

  const pagination = normalizePagination(page, limit)

  // 🔥 FILTRO PRINCIPAL: APENAS IMÓVEIS DISPONÍVEIS PARA PÚBLICO
  const filters = {
    isDeleted: false,
    active: true,
    published: true,
    status: {
      $in: [
        PROPERTY_STATUS.AVAILABLE,
        PROPERTY_STATUS.RESERVED, // Reservado ainda aparece, mas com indicação
      ],
    },
  }

  // Filtros adicionais
  if (status) filters.status = status
  if (type) filters.type = type
  if (category) filters.category = category
  if (purpose) filters.purpose = purpose
  if (broker) filters.broker = broker
  if (typeof featured !== 'undefined') {
    filters.featured = featured === 'true'
  }

  if (city) {
    filters['location.city'] = new RegExp(city, 'i')
  }

  if (region) {
    filters['location.region'] = region
  }

  // Filtro de preço
  if (minPrice || maxPrice) {
    filters['prices.salePrice'] = {}
    if (minPrice) filters['prices.salePrice'].$gte = Number(minPrice)
    if (maxPrice) filters['prices.salePrice'].$lte = Number(maxPrice)
  }

  // Filtro de características
  if (bedrooms) filters.bedrooms = { $gte: Number(bedrooms) }
  if (bathrooms) filters.bathrooms = { $gte: Number(bathrooms) }
  if (parkingSpaces) filters.parkingSpaces = { $gte: Number(parkingSpaces) }

  if (search) {
    filters.$text = { $search: search }
  }

  const [properties, total] = await Promise.all([
    Property.find(filters)
      .populate(PROPERTY_POPULATE)
      .sort(buildSort(sort))
      .skip(pagination.skip)
      .limit(pagination.limit)
      .select(
        'name code slug coverImage price prices purpose type status bedrooms bathrooms parkingSpaces area location statistics featured',
      ),

    Property.countDocuments(filters),
  ])

  return {
    data: properties,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
      hasNext: pagination.page < Math.ceil(total / pagination.limit),
      hasPrev: pagination.page > 1,
    },
  }
}

/**
 * Busca imóveis para o corretor (dashboard)
 * Corretor vê TODOS os seus imóveis, incluindo vendidos
 */
export async function getBrokerPropertiesWithStats(brokerId, query = {}) {
  const { page = 1, limit = 20, status, search, sort = '-createdAt' } = query

  const pagination = normalizePagination(page, limit)

  const filters = {
    broker: brokerId,
    isDeleted: false,
  }

  if (status) filters.status = status

  if (search) {
    filters.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ]
  }

  const sortField = sort.startsWith('-') ? sort.slice(1) : sort
  const sortOrder = sort.startsWith('-') ? -1 : 1

  const [properties, total] = await Promise.all([
    Property.find(filters)
      .populate(PROPERTY_CRM_POPULATE)
      .sort({ [sortField]: sortOrder })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Property.countDocuments(filters),
  ])

  // Adicionar métricas para cada imóvel
  const propertiesWithMetrics = await Promise.all(
    properties.map(async (property) => {
      try {
        const metrics = await getPropertyMetrics(property._id)
        return {
          ...property.toObject(),
          metrics: metrics.metrics,
        }
      } catch (error) {
        return {
          ...property.toObject(),
          metrics: {
            favorites: 0,
            views: 0,
            contacts: 0,
            visits: 0,
            proposals: 0,
            total: 0,
          },
        }
      }
    }),
  )

  return {
    data: propertiesWithMetrics,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
      hasNext: pagination.page < Math.ceil(total / pagination.limit),
      hasPrev: pagination.page > 1,
    },
  }
}

/* ============================================================
   RESUMO DO IMÓVEL PARA ADMIN
============================================================ */

export async function getPropertyAdminSummary() {
  const [total, available, reserved, sold, rented, inactive, featured] =
    await Promise.all([
      Property.countDocuments({ isDeleted: false }),
      Property.countDocuments({
        status: PROPERTY_STATUS.AVAILABLE,
        isDeleted: false,
      }),
      Property.countDocuments({
        status: PROPERTY_STATUS.RESERVED,
        isDeleted: false,
      }),
      Property.countDocuments({
        status: PROPERTY_STATUS.SOLD,
        isDeleted: false,
      }),
      Property.countDocuments({
        status: PROPERTY_STATUS.RENTED,
        isDeleted: false,
      }),
      Property.countDocuments({ active: false, isDeleted: false }),
      Property.countDocuments({ featured: true, isDeleted: false }),
    ])

  // Métricas agregadas
  const metrics = await Property.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: null,
        totalViews: { $sum: '$statistics.views' },
        totalFavorites: { $sum: '$statistics.favorites' },
        totalContacts: { $sum: '$statistics.contacts' },
        totalVisitsScheduled: { $sum: '$statistics.visitsScheduled' },
        totalProposals: { $sum: '$statistics.proposals' },
        avgPrice: { $avg: '$prices.salePrice' },
        totalValue: { $sum: '$prices.salePrice' },
      },
    },
  ])

  // Imóveis por tipo
  const byType = await Property.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ])

  // Imóveis por cidade
  const byCity = await Property.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: '$location.city',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ])

  return {
    summary: {
      total,
      available,
      reserved,
      sold,
      rented,
      inactive,
      featured,
    },
    metrics: metrics[0] || {
      totalViews: 0,
      totalFavorites: 0,
      totalContacts: 0,
      totalVisitsScheduled: 0,
      totalProposals: 0,
      avgPrice: 0,
      totalValue: 0,
    },
    byType,
    byCity,
  }
}

// backend/service/property/propertyService.js

// Adicione esta função no final do arquivo, após a função getPropertyAdminSummary

/* ============================================================
   GET POPULAR PROPERTIES - IMÓVEIS MAIS POPULARES
============================================================ */

/**
 * Busca os imóveis mais populares baseado em engajamento
 * (visualizações, contatos, favoritos, visitas)
 *
// service/property/propertyService.js

/* ============================================================
   GET POPULAR PROPERTIES - IMÓVEIS MAIS POPULARES
============================================================ */

/**
 * Busca os imóveis mais populares baseado em engajamento
 * (visualizações, contatos, favoritos, visitas)
 *
 * @param {Object} options - Opções de busca
 * @param {number} options.limit - Quantidade de imóveis (padrão: 20)
 * @param {string} options.sort - Ordenação: 'views', 'contacts', 'favorites', 'conversion'
 * @param {string} options.type - Tipo de imóvel (opcional)
 * @param {string} options.status - Status do imóvel (padrão: 'disponivel')
 * @param {number} options.days - Dias para análise (padrão: 30)
 */
export async function getPopularProperties(options = {}) {
  const {
    limit = 20,
    sort = 'views',
    type,
    status = 'disponivel',
    days = 30,
  } = options

  console.log('📊 Buscando imóveis populares:', {
    limit,
    sort,
    type,
    status,
    days,
  })

  // 🔥 Pipeline de agregação CORRIGIDO
  const pipeline = [
    // 1. Filtrar imóveis ativos e não deletados
    {
      $match: {
        isDeleted: false,
        active: true,
        ...(status ? { status } : {}),
        ...(type && type !== 'todos' ? { type } : {}),
      },
    },
    // 2. Adicionar campos de métricas a partir do objeto statistics
    {
      $addFields: {
        // 🔥 Extrair valores do objeto statistics
        totalViews: { $ifNull: ['$statistics.views', 0] },
        totalContacts: { $ifNull: ['$statistics.contacts', 0] },
        totalFavorites: { $ifNull: ['$statistics.favorites', 0] },
        totalVisits: { $ifNull: ['$statistics.visitsScheduled', 0] },
        // Calcular taxa de conversão (contatos / visualizações * 100)
        conversionRate: {
          $cond: [
            { $gt: [{ $ifNull: ['$statistics.views', 0] }, 0] },
            {
              $multiply: [
                {
                  $divide: [
                    { $ifNull: ['$statistics.contacts', 0] },
                    { $ifNull: ['$statistics.views', 1] },
                  ],
                },
                100,
              ],
            },
            0,
          ],
        },
        // Score de engajamento combinado
        engagementScore: {
          $add: [
            { $multiply: [{ $ifNull: ['$statistics.views', 0] }, 1] },
            { $multiply: [{ $ifNull: ['$statistics.contacts', 0] }, 3] },
            { $multiply: [{ $ifNull: ['$statistics.favorites', 0] }, 2] },
          ],
        },
      },
    },
  ]

  // 3. Ordenação
  const sortFieldMap = {
    views: 'totalViews',
    contacts: 'totalContacts',
    favorites: 'totalFavorites',
    conversion: 'conversionRate',
    engagement: 'engagementScore',
    visits: 'totalVisits',
  }

  const sortField = sortFieldMap[sort] || 'totalViews'

  pipeline.push({
    $sort: { [sortField]: -1 },
  })

  // 4. Limitar resultados
  pipeline.push({
    $limit: Number(limit),
  })

  // 5. 🔥 PROJETAR CAMPOS RETORNADOS (INCLUINDO OS CAMPOS FORMATADOS)
  pipeline.push({
    $project: {
      _id: 1,
      name: 1,
      slug: 1,
      code: 1,
      type: 1,
      category: 1,
      purpose: 1,
      status: 1,
      prices: 1,
      price: {
        $cond: [
          { $eq: ['$purpose', 'venda'] },
          '$prices.salePrice',
          '$prices.rentPrice',
        ],
      },
      dimensions: 1,
      location: 1,
      bedrooms: 1,
      bathrooms: 1,
      parkingSpaces: 1,
      suites: 1,
      features: 1,
      images: 1,
      coverImage: 1,
      featured: 1,
      exclusive: 1,
      // 🔥 CAMPOS DE ESTATÍSTICAS FORMATADOS
      totalViews: 1,
      totalContacts: 1,
      totalFavorites: 1,
      totalVisits: 1,
      conversionRate: 1,
      engagementScore: 1,
      // Manter o objeto statistics original
      statistics: 1,
      createdAt: 1,
      updatedAt: 1,
    },
  })

  const properties = await Property.aggregate(pipeline)

  console.log(`✅ ${properties.length} imóveis populares encontrados`)

  return properties
}

// backend/service/property/propertyService.js

/* ============================================================
   VISUALIZAÇÕES - CORRIGIDO ✅
============================================================ */

export async function incrementViews(id) {
  const property = await Property.findById(id)

  if (!property) {
    throw new AppError('Imóvel não encontrado.', 404)
  }

  // Inicializar statistics se não existir
  if (!property.statistics) {
    property.statistics = {
      views: 0,
      contacts: 0,
      favorites: 0,
      visitsScheduled: 0,
      proposals: 0,
    }
  }

  // Incrementar
  property.statistics.views = (property.statistics.views || 0) + 1
  property.totalViews = property.statistics.views // Sincronizar campo direto

  await property.save()

  return {
    views: property.statistics.views,
    totalViews: property.totalViews,
  }
}

/* ============================================================
   CONTATOS - CORRIGIDO ✅
============================================================ */

export async function incrementContacts(id) {
  const property = await Property.findById(id)

  if (!property) {
    throw new AppError('Imóvel não encontrado.', 404)
  }

  if (!property.statistics) {
    property.statistics = {
      views: 0,
      contacts: 0,
      favorites: 0,
      visitsScheduled: 0,
      proposals: 0,
    }
  }

  property.statistics.contacts = (property.statistics.contacts || 0) + 1
  property.totalContacts = property.statistics.contacts // Sincronizar campo direto

  await property.save()

  return {
    contacts: property.statistics.contacts,
    totalContacts: property.totalContacts,
  }
}

/* ============================================================
   FAVORITOS - CORRIGIDO ✅
============================================================ */

export async function incrementFavorites(id) {
  const property = await Property.findById(id)

  if (!property) {
    throw new AppError('Imóvel não encontrado.', 404)
  }

  if (!property.statistics) {
    property.statistics = {
      views: 0,
      contacts: 0,
      favorites: 0,
      visitsScheduled: 0,
      proposals: 0,
    }
  }

  property.statistics.favorites = (property.statistics.favorites || 0) + 1
  property.totalFavorites = property.statistics.favorites // Sincronizar campo direto

  await property.save()

  return {
    favorites: property.statistics.favorites,
    totalFavorites: property.totalFavorites,
  }
}

/* ============================================================
   VISITAS AGENDADAS - CORRIGIDO ✅
============================================================ */

export async function incrementVisits(id) {
  const property = await Property.findById(id)

  if (!property) {
    throw new AppError('Imóvel não encontrado.', 404)
  }

  if (!property.statistics) {
    property.statistics = {
      views: 0,
      contacts: 0,
      favorites: 0,
      visitsScheduled: 0,
      proposals: 0,
    }
  }

  property.statistics.visitsScheduled =
    (property.statistics.visitsScheduled || 0) + 1
  property.lastVisitAt = new Date()

  await property.save()

  return {
    visitsScheduled: property.statistics.visitsScheduled,
  }
}
