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

  await property.save()

  return property
}

/* ============================================================
   RESTORE
============================================================ */

export async function restoreProperty(id, userId) {
  const property = await Property.findById(id)

  if (!property) {
    throw new AppError('Imóvel não encontrado.', 404)
  }

  property.isDeleted = false
  property.deletedAt = null
  property.updatedBy = userId
  property.active = true

  await property.save()

  return Property.findById(property._id).populate(PROPERTY_POPULATE)
}

/* ============================================================
   PUBLICAR
============================================================ */

export async function publishProperty(id, userId) {
  const property = await getPropertyById(id)

  property.published = true
  property.active = true
  property.updatedBy = userId

  if (!property.publishedAt) {
    property.publishedAt = new Date()
  }

  await property.save()

  return property
}

/* ============================================================
   DESPUBLICAR
============================================================ */

export async function unpublishProperty(id, userId) {
  const property = await getPropertyById(id)

  property.published = false
  property.updatedBy = userId

  await property.save()

  return property
}

/* ============================================================
   ARQUIVAR
============================================================ */

export async function archiveProperty(id, userId) {
  const property = await getPropertyById(id)

  property.active = false
  property.updatedBy = userId

  await property.save()

  return property
}

/* ============================================================
   REATIVAR
============================================================ */

export async function activateProperty(id, userId) {
  const property = await getPropertyById(id)

  property.active = true
  property.updatedBy = userId

  await property.save()

  return property
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
   VISUALIZAÇÕES
============================================================ */

export async function incrementViews(id) {
  const property = await getPropertyById(id)

  property.statistics.views += 1

  await property.save()

  return property.statistics.views
}

/* ============================================================
   FAVORITOS
============================================================ */

export async function incrementFavorites(id) {
  const property = await getPropertyById(id)

  property.statistics.favorites += 1

  await property.save()

  return property.statistics.favorites
}

/* ============================================================
   CONTATOS
============================================================ */

export async function incrementContacts(id) {
  const property = await getPropertyById(id)

  property.statistics.contacts += 1

  await property.save()

  return property.statistics.contacts
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
