import mongoose from 'mongoose'

/* ============================================================
   Visitor Schema
============================================================ */

const visitorSchema = new mongoose.Schema(
  {
    /* ========================================================
       Rede
    ======================================================== */

    ip: {
      type: String,
      default: '',
      trim: true,
    },

    forwardedIp: {
      type: String,
      default: '',
      trim: true,
    },

    userAgent: {
      type: String,
      default: '',
      trim: true,
    },

    language: {
      type: String,
      default: '',
      trim: true,
    },

    /* ========================================================
       Localização
    ======================================================== */

    country: {
      type: String,
      default: '',
      trim: true,
    },

    countryCode: {
      type: String,
      default: '',
      uppercase: true,
      trim: true,
    },

    state: {
      type: String,
      default: '',
      trim: true,
    },

    city: {
      type: String,
      default: '',
      trim: true,
    },

    timezone: {
      type: String,
      default: '',
      trim: true,
    },

    latitude: {
      type: Number,
      default: null,
    },

    longitude: {
      type: Number,
      default: null,
    },

    /* ========================================================
       Navegador
    ======================================================== */

    browser: {
      type: String,
      default: '',
      trim: true,
    },

    browserVersion: {
      type: String,
      default: '',
      trim: true,
    },

    engine: {
      type: String,
      default: '',
      trim: true,
    },

    engineVersion: {
      type: String,
      default: '',
      trim: true,
    },

    /* ========================================================
       Sistema Operacional
    ======================================================== */

    os: {
      type: String,
      default: '',
      trim: true,
    },

    osVersion: {
      type: String,
      default: '',
      trim: true,
    },

    /* ========================================================
       Dispositivo
    ======================================================== */

    deviceType: {
      type: String,
      enum: [
        'desktop',
        'mobile',
        'tablet',
        'smarttv',
        'console',
        'wearable',
        'bot',
        'unknown',
      ],
      default: 'unknown',
    },

    vendor: {
      type: String,
      default: '',
      trim: true,
    },

    model: {
      type: String,
      default: '',
      trim: true,
    },

    cpuArchitecture: {
      type: String,
      default: '',
      trim: true,
    },

    /* ========================================================
       Front-end (opcional)
    ======================================================== */

    screenWidth: {
      type: Number,
      default: null,
    },

    screenHeight: {
      type: Number,
      default: null,
    },
  },
  {
    _id: false,
  },
)

/* ============================================================
   Campaign Schema
============================================================ */

const campaignSchema = new mongoose.Schema(
  {
    utmSource: {
      type: String,
      default: '',
      trim: true,
    },

    utmMedium: {
      type: String,
      default: '',
      trim: true,
    },

    utmCampaign: {
      type: String,
      default: '',
      trim: true,
    },

    utmTerm: {
      type: String,
      default: '',
      trim: true,
    },

    utmContent: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    _id: false,
  },
)

/* ============================================================
   Property View Schema
============================================================ */

const propertyViewSchema = new mongoose.Schema(
  {
    /* ==========================================================
       Relacionamentos
    ========================================================== */

    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    /* ==========================================================
       Sessão
    ========================================================== */

    sessionId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },

    visitorId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },

    /* ==========================================================
       Origem
    ========================================================== */

    source: {
      type: String,
      enum: [
        'crm',
        'site',
        'hotsite',
        'portal',
        'zap',
        'olx',
        'facebook',
        'instagram',
        'google',
        'outro',
      ],
      default: 'crm',
      index: true,
    },

    referrer: {
      type: String,
      default: '',
      trim: true,
    },

    landingPage: {
      type: String,
      default: '',
      trim: true,
    },

    /* ==========================================================
       Campanhas
    ========================================================== */

    campaign: {
      type: campaignSchema,
      default: () => ({}),
    },

    /* ==========================================================
       Visitante
    ========================================================== */

    visitor: {
      type: visitorSchema,
      default: () => ({}),
    },

    /* ==========================================================
       Informações da visita
    ========================================================== */

    duration: {
      type: Number,
      default: 0,
      min: 0,
    },

    pagesVisited: {
      type: Number,
      default: 1,
      min: 1,
    },

    bounced: {
      type: Boolean,
      default: false,
    },

    converted: {
      type: Boolean,
      default: false,
    },

    conversionType: {
      type: String,
      enum: ['', 'lead', 'proposal', 'visit', 'favorite', 'contact'],
      default: '',
    },

    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

/* ============================================================
   INDEXES
============================================================ */

/* ============================================================
   INDEXES
============================================================ */

propertyViewSchema.index({
  property: 1,
  createdAt: -1,
})

propertyViewSchema.index({
  property: 1,
  sessionId: 1,
})

propertyViewSchema.index({
  property: 1,
  user: 1,
})

propertyViewSchema.index({
  property: 1,
  source: 1,
})

propertyViewSchema.index({
  property: 1,
  'visitor.country': 1,
})

propertyViewSchema.index({
  property: 1,
  'visitor.state': 1,
})

propertyViewSchema.index({
  property: 1,
  'visitor.city': 1,
})

propertyViewSchema.index({
  property: 1,
  'visitor.deviceType': 1,
})

propertyViewSchema.index({
  property: 1,
  'visitor.browser': 1,
})

propertyViewSchema.index({
  property: 1,
  'visitor.os': 1,
})

propertyViewSchema.index({
  property: 1,
  converted: 1,
})

propertyViewSchema.index({
  property: 1,
  conversionType: 1,
})

propertyViewSchema.index({
  createdAt: -1,
})

propertyViewSchema.index({
  source: 1,
})

propertyViewSchema.index({
  user: 1,
})

propertyViewSchema.index({
  sessionId: 1,
})

propertyViewSchema.index({
  visitorId: 1,
})

propertyViewSchema.index({
  'campaign.utmSource': 1,
})

propertyViewSchema.index({
  'campaign.utmMedium': 1,
})

propertyViewSchema.index({
  'campaign.utmCampaign': 1,
})

propertyViewSchema.index({
  'visitor.country': 1,
})

propertyViewSchema.index({
  'visitor.state': 1,
})

propertyViewSchema.index({
  'visitor.city': 1,
})

propertyViewSchema.index({
  'visitor.browser': 1,
})

propertyViewSchema.index({
  'visitor.deviceType': 1,
})

propertyViewSchema.index({
  'visitor.os': 1,
})

/* ============================================================
   VIRTUALS
============================================================ */

propertyViewSchema.virtual('isAuthenticated').get(function () {
  return !!this.user
})

propertyViewSchema.virtual('isAnonymous').get(function () {
  return !this.user
})

propertyViewSchema.virtual('isConversion').get(function () {
  return this.converted
})

/* ============================================================
   STATIC METHODS
============================================================ */

propertyViewSchema.statics.today = function () {
  const start = new Date()

  start.setHours(0, 0, 0, 0)

  return this.find({
    createdAt: {
      $gte: start,
    },
  })
}

propertyViewSchema.statics.thisWeek = function () {
  const start = new Date()

  start.setDate(start.getDate() - 7)

  start.setHours(0, 0, 0, 0)

  return this.find({
    createdAt: {
      $gte: start,
    },
  })
}

propertyViewSchema.statics.thisMonth = function () {
  const start = new Date()

  start.setDate(1)

  start.setHours(0, 0, 0, 0)

  return this.find({
    createdAt: {
      $gte: start,
    },
  })
}

/* ============================================================
   QUERY HELPERS
============================================================ */

propertyViewSchema.query.byProperty = function (propertyId) {
  return this.where({
    property: propertyId,
  })
}

propertyViewSchema.query.byUser = function (userId) {
  return this.where({
    user: userId,
  })
}

propertyViewSchema.query.bySource = function (source) {
  return this.where({
    source,
  })
}

propertyViewSchema.query.byCountry = function (country) {
  return this.where({
    'visitor.country': country,
  })
}

propertyViewSchema.query.byState = function (state) {
  return this.where({
    'visitor.state': state,
  })
}

propertyViewSchema.query.byCity = function (city) {
  return this.where({
    'visitor.city': city,
  })
}

propertyViewSchema.query.byBrowser = function (browser) {
  return this.where({
    'visitor.browser': browser,
  })
}

propertyViewSchema.query.byDevice = function (deviceType) {
  return this.where({
    'visitor.deviceType': deviceType,
  })
}

propertyViewSchema.query.byOS = function (os) {
  return this.where({
    'visitor.os': os,
  })
}

/* ============================================================
   TRANSFORM
============================================================ */

/* ============================================================
   TRANSFORM
============================================================ */

propertyViewSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,

  transform(doc, ret) {
    delete ret.__v

    return ret
  },
})

propertyViewSchema.set('toObject', {
  virtuals: true,
  versionKey: false,
})

/* ============================================================
   INSTANCE METHODS
============================================================ */

propertyViewSchema.methods.markAsConverted = async function (type = 'lead') {
  this.converted = true
  this.conversionType = type

  return this.save()
}

propertyViewSchema.methods.incrementPagesVisited = async function () {
  this.pagesVisited += 1

  return this.save()
}

propertyViewSchema.methods.updateDuration = async function (seconds = 0) {
  this.duration = Math.max(this.duration, seconds)

  return this.save()
}

/* ============================================================
   MODEL
============================================================ */

const PropertyView = mongoose.model('PropertyView', propertyViewSchema)

export default PropertyView
