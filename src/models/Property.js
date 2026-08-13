import mongoose from 'mongoose'
import slugify from 'slugify'

import { PROPERTY_TYPE_LIST } from '../constants/propertyType.js'

import {
  PROPERTY_STATUS,
  PROPERTY_STATUS_LIST,
} from '../constants/propertyStatus.js'

import {
  PROPERTY_PURPOSE,
  PROPERTY_PURPOSE_LIST,
} from '../constants/propertyPurpose.js'

import { PROPERTY_REGION_LIST } from '../constants/propertyRegion.js'

import { PROPERTY_CATEGORY_LIST } from '../constants/propertyCategory.js'

import { PROPERTY_CONSTRUCTION_STATUS_LIST } from '../constants/propertyConstructionStatus.js'

import { PROPERTY_FEATURES } from '../constants/propertyFeatures.js'

/* =====================================================================
   Helpers
===================================================================== */

const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },

    publicId: {
      type: String,
      default: '',
    },

    alt: {
      type: String,
      default: '',
    },

    order: {
      type: Number,
      default: 0,
    },

    isCover: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  },
)

const videoSchema = new mongoose.Schema(
  {
    title: String,

    url: String,

    provider: {
      type: String,
      enum: ['youtube', 'vimeo', 'drive', 'outro'],
      default: 'youtube',
    },
  },
  {
    _id: false,
  },
)

const locationSchema = new mongoose.Schema(
  {
    zipCode: String,

    street: String,

    number: String,

    complement: String,

    district: String,

    city: String,

    state: String,

    country: {
      type: String,
      default: 'Brasil',
    },

    region: {
      type: String,
      enum: PROPERTY_REGION_LIST,
    },

    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
  {
    _id: false,
  },
)

const dimensionsSchema = new mongoose.Schema(
  {
    totalArea: {
      type: Number,
      default: 0,
      min: 0,
    },

    builtArea: {
      type: Number,
      default: 0,
      min: 0,
    },

    landArea: {
      type: Number,
      default: 0,
      min: 0,
    },

    frontage: {
      type: Number,
      default: 0,
    },

    background: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  },
)

const pricesSchema = new mongoose.Schema(
  {
    salePrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    rentPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    condominiumFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    iptu: {
      type: Number,
      default: 0,
      min: 0,
    },

    otherFees: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  },
)

const seoSchema = new mongoose.Schema(
  {
    title: String,

    description: String,

    keywords: [String],
  },
  {
    _id: false,
  },
)

const ownerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: '',
    },

    phone: {
      type: String,
      trim: true,
      default: '',
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },

    document: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    _id: false,
  },
)

const condominiumSchema = new mongoose.Schema(
  {
    name: String,

    blocks: Number,

    towers: Number,

    apartments: Number,

    hasElevator: Boolean,

    hasDoorman: Boolean,

    hasSecurity: Boolean,
  },
  {
    _id: false,
  },
)

const statisticsSchema = new mongoose.Schema(
  {
    views: {
      type: Number,
      default: 0,
    },

    favorites: {
      type: Number,
      default: 0,
    },

    contacts: {
      type: Number,
      default: 0,
    },

    visitsScheduled: {
      type: Number,
      default: 0,
    },

    proposals: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  },
)

/* =====================================================================
   Property Schema
===================================================================== */

const propertySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      index: true,
      trim: true,
    },

    /* ============================================================
       Imagens
    ============================================================ */

    images: [
      {
        url: {
          type: String,
          required: true,
        },

        public_id: {
          type: String,
          required: true,
        },

        isCover: {
          type: Boolean,
          default: false,
        },

        order: {
          type: Number,
          default: 0,
        },
      },
    ],

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },

    description: {
      type: String,
      default: '',
      trim: true,
    },

    shortDescription: {
      type: String,
      default: '',
      maxlength: 300,
    },

    type: {
      type: String,
      required: true,
      enum: PROPERTY_TYPE_LIST,
    },

    category: {
      type: String,
      enum: PROPERTY_CATEGORY_LIST,
    },

    purpose: {
      type: String,
      enum: PROPERTY_PURPOSE_LIST,
      default: PROPERTY_PURPOSE.SALE,
    },

    status: {
      type: String,
      enum: PROPERTY_STATUS_LIST,
      default: PROPERTY_STATUS.AVAILABLE,
    },

    constructionStatus: {
      type: String,
      enum: PROPERTY_CONSTRUCTION_STATUS_LIST,
    },

    featured: {
      type: Boolean,
      default: false,
    },

    exclusive: {
      type: Boolean,
      default: false,
    },

    published: {
      type: Boolean,
      default: true,
    },

    active: {
      type: Boolean,
      default: true,
    },

    bedrooms: {
      type: Number,
      default: 0,
      min: 0,
    },

    suites: {
      type: Number,
      default: 0,
      min: 0,
    },

    bathrooms: {
      type: Number,
      default: 0,
      min: 0,
    },

    parkingSpaces: {
      type: Number,
      default: 0,
      min: 0,
    },

    floor: {
      type: Number,
      default: 0,
    },

    furnished: {
      type: Boolean,
      default: false,
    },

    acceptsPets: {
      type: Boolean,
      default: false,
    },

    dimensions: {
      type: dimensionsSchema,
      default: () => ({}),
    },

    prices: {
      type: pricesSchema,
      default: () => ({}),
    },

    location: {
      type: locationSchema,
      default: () => ({}),
    },

    /* ============================================================
       Características
    ============================================================ */

    features: [
      {
        type: String,
        enum: PROPERTY_FEATURES,
      },
    ],

    highlights: [
      {
        type: String,
        trim: true,
      },
    ],

    /* ============================================================
       Mídias
    ============================================================ */

    coverImage: {
      type: String,
      default: '',
    },

    image: {
      type: [imageSchema],
      default: [],
    },

    videos: {
      type: [videoSchema],
      default: [],
    },

    virtualTour: {
      type: String,
      default: '',
      trim: true,
    },

    floorPlan: {
      type: String,
      default: '',
    },

    /* ============================================================
       Documentação
    ============================================================ */

    documents: [
      {
        title: {
          type: String,
          trim: true,
        },

        url: {
          type: String,
          trim: true,
        },

        publicId: {
          type: String,
          default: '',
        },
      },
    ],

    registrationNumber: {
      type: String,
      default: '',
    },

    deedNumber: {
      type: String,
      default: '',
    },

    acceptsFinancing: {
      type: Boolean,
      default: true,
    },

    acceptsFGTS: {
      type: Boolean,
      default: false,
    },

    /* ============================================================
       Proprietário
    ============================================================ */

    owner: {
      type: ownerSchema,
      default: () => ({}),
    },

    /* ============================================================
       Condomínio
    ============================================================ */

    condominium: {
      type: condominiumSchema,
      default: () => ({}),
    },

    /* ============================================================
       SEO
    ============================================================ */

    seo: {
      type: seoSchema,
      default: () => ({}),
    },

    /* ============================================================
       Estatísticas
    ============================================================ */

    statistics: {
      type: statisticsSchema,
      default: () => ({}),
    },

    /* ============================================================
       Publicação
    ============================================================ */

    publishedAt: {
      type: Date,
    },

    expiresAt: {
      type: Date,
    },

    /* ============================================================
       Relacionamentos
    ============================================================ */

    broker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    captation: {
      broker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },

      percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    leads: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
      },
    ],

    proposals: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Proposal',
      },
    ],

    visits: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Visit',
      },
    ],

    /* ============================================================
       Dashboard
    ============================================================ */

    lastLeadAt: Date,

    lastVisitAt: Date,

    lastProposalAt: Date,

    soldAt: Date,

    rentedAt: Date,

    /* ============================================================
       Controle
    ============================================================ */

    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    notes: {
      type: String,
      default: '',
    },

    internalNotes: {
      type: String,
      default: '',
      select: false,
    },

    priority: {
      type: Number,
      default: 0,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },

    color: {
      type: String,
      default: '',
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: Date,
  },
  {
    timestamps: true,

    versionKey: false,

    toJSON: {
      virtuals: true,
    },

    toObject: {
      virtuals: true,
    },
  },
)

/* ============================================================
   INDEXES
============================================================ */

propertySchema.index({ slug: 1 }, { unique: true })

propertySchema.index({ code: 1 }, { unique: true })

propertySchema.index({ status: 1 })

propertySchema.index({ type: 1 })

propertySchema.index({ category: 1 })

propertySchema.index({ purpose: 1 })

propertySchema.index({ featured: 1 })

propertySchema.index({ active: 1 })

propertySchema.index({ broker: 1 })

propertySchema.index({ createdBy: 1 })

propertySchema.index({ 'location.city': 1 })

propertySchema.index({ 'location.state': 1 })

propertySchema.index({ 'location.region': 1 })

propertySchema.index({ 'prices.salePrice': 1 })

propertySchema.index({ 'prices.rentPrice': 1 })

propertySchema.index({ bedrooms: 1 })

propertySchema.index({ bathrooms: 1 })

propertySchema.index({ parkingSpaces: 1 })

propertySchema.index({ createdAt: -1 })

propertySchema.index({
  name: 'text',
  description: 'text',
  shortDescription: 'text',
})

/* ============================================================
   GEO INDEX
============================================================ */

/*
  Para usar este índice futuramente, o ideal é alterar o
  locationSchema para armazenar GeoJSON:

  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  }

  Assim será possível fazer buscas por raio.
*/

// propertySchema.index({
//   'location.coordinates': '2dsphere',
// })

/* ============================================================
   VIRTUALS
============================================================ */

propertySchema.virtual('mainImage').get(function () {
  if (this.coverImage) {
    return this.coverImage
  }

  if (this.images?.length) {
    return this.images[0]?.url || ''
  }

  return ''
})

/*
 * Preço principal do imóvel.
 *
 * IMPORTANTE:
 * Todos os acessos a prices são protegidos.
 * Isso evita que um imóvel antigo/incompleto
 * cause erro durante populate/toJSON.
 */

propertySchema.virtual('price').get(function () {
  const prices = this.prices || {}

  if (this.purpose === 'venda') {
    return prices.salePrice ?? null
  }

  if (this.purpose === 'aluguel') {
    return prices.rentPrice ?? null
  }

  return prices.salePrice ?? prices.rentPrice ?? null
})

propertySchema.virtual('fullAddress').get(function () {
  const location = this.location

  if (!location) {
    return ''
  }

  return [
    location.street,
    location.number,
    location.complement,
    location.district,
    location.city,
    location.state,
  ]
    .filter(Boolean)
    .join(', ')
})

propertySchema.virtual('totalImages').get(function () {
  return this.images?.length || 0
})

propertySchema.virtual('formattedCode').get(function () {
  return this.code || ''
})

/* ============================================================
   HELPERS
============================================================ */

async function generatePropertyCode() {
  const Property = mongoose.model('Property')

  const total = await Property.countDocuments()

  return `NV-${String(total + 1).padStart(6, '0')}`
}

/* ============================================================
   PRE SAVE
============================================================ */

propertySchema.pre('save', async function (next) {
  if (!this.slug || this.isModified('name')) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      locale: 'pt',
      trim: true,
    })
  }

  if (!this.code) {
    this.code = await generatePropertyCode()
  }

  if (!this.coverImage && this.images?.length) {
    this.coverImage = this.images[0]?.url || ''
  }

  if (this.isModified('published') && this.published && !this.publishedAt) {
    this.publishedAt = new Date()
  }

  next()
})

/* ============================================================
   METHODS
============================================================ */

/*
 * Garante que statistics exista antes
 * de alterar qualquer contador.
 */

propertySchema.methods.incrementViews = async function () {
  if (!this.statistics) {
    this.statistics = {}
  }

  this.statistics.views = (this.statistics.views ?? 0) + 1

  return this.save()
}

propertySchema.methods.incrementFavorites = async function () {
  if (!this.statistics) {
    this.statistics = {}
  }

  this.statistics.favorites = (this.statistics.favorites ?? 0) + 1

  return this.save()
}

propertySchema.methods.incrementContacts = async function () {
  if (!this.statistics) {
    this.statistics = {}
  }

  this.statistics.contacts = (this.statistics.contacts ?? 0) + 1

  return this.save()
}

propertySchema.methods.incrementVisits = async function () {
  if (!this.statistics) {
    this.statistics = {}
  }

  this.statistics.visitsScheduled = (this.statistics.visitsScheduled ?? 0) + 1

  this.lastVisitAt = new Date()

  return this.save()
}

propertySchema.methods.incrementProposals = async function () {
  if (!this.statistics) {
    this.statistics = {}
  }

  this.statistics.proposals = (this.statistics.proposals ?? 0) + 1

  this.lastProposalAt = new Date()

  return this.save()
}

/* ============================================================
   STATIC METHODS
============================================================ */

propertySchema.statics.findAvailable = function () {
  return this.find({
    active: true,
    isDeleted: false,
    status: 'disponivel',
  })
}

propertySchema.statics.findFeatured = function () {
  return this.find({
    featured: true,
    active: true,
    isDeleted: false,
  })
}

propertySchema.statics.findByBroker = function (brokerId) {
  return this.find({
    broker: brokerId,
    isDeleted: false,
  })
}

/* ============================================================
   QUERY HELPERS
============================================================ */

propertySchema.query.available = function () {
  return this.where({
    active: true,
    status: 'disponivel',
    isDeleted: false,
  })
}

propertySchema.query.featured = function () {
  return this.where({
    featured: true,
  })
}

propertySchema.query.published = function () {
  return this.where({
    published: true,
  })
}

/* ============================================================
   TRANSFORM
============================================================ */

propertySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,

  transform(doc, ret) {
    delete ret.__v

    return ret
  },
})

/* ============================================================
   MODEL
============================================================ */

const Property = mongoose.model('Property', propertySchema)

export default Property
