import mongoose from 'mongoose'

/* ============================================================
   Property Favorite Schema
============================================================ */

const propertyFavoriteSchema = new mongoose.Schema(
  {
    /* ========================================================
       Relacionamentos
    ======================================================== */

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

    /* ========================================================
       Visitante anônimo
    ======================================================== */

    visitorId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },

    sessionId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },

    /* ========================================================
       Origem
    ======================================================== */

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

    /* ========================================================
       Status
    ======================================================== */

    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    /* ========================================================
       Conversão
    ======================================================== */

    converted: {
      type: Boolean,
      default: false,
    },

    conversionType: {
      type: String,

      enum: ['', 'lead', 'contact', 'visit', 'proposal'],

      default: '',
    },

    /* ========================================================
       Metadata
    ======================================================== */

    referrer: {
      type: String,
      default: '',
      trim: true,
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

propertyFavoriteSchema.index({
  property: 1,
  user: 1,
})

propertyFavoriteSchema.index({
  property: 1,
  visitorId: 1,
})

propertyFavoriteSchema.index({
  property: 1,
  sessionId: 1,
})

propertyFavoriteSchema.index({
  property: 1,
  active: 1,
})

propertyFavoriteSchema.index({
  createdAt: -1,
})

propertyFavoriteSchema.index({
  source: 1,
})

/* ============================================================
   VIRTUALS
============================================================ */

propertyFavoriteSchema.virtual('isAuthenticated').get(function () {
  return !!this.user
})

propertyFavoriteSchema.virtual('isAnonymous').get(function () {
  return !this.user
})

propertyFavoriteSchema.virtual('isConverted').get(function () {
  return this.converted
})

/* ============================================================
   METHODS
============================================================ */

propertyFavoriteSchema.methods.markAsConverted = async function (
  type = 'lead',
) {
  this.converted = true

  this.conversionType = type

  return this.save()
}

propertyFavoriteSchema.methods.remove = async function () {
  this.active = false

  return this.save()
}

propertyFavoriteSchema.methods.restore = async function () {
  this.active = true

  return this.save()
}

/* ============================================================
   QUERY HELPERS
============================================================ */

propertyFavoriteSchema.query.byProperty = function (propertyId) {
  return this.where({
    property: propertyId,
  })
}

propertyFavoriteSchema.query.active = function () {
  return this.where({
    active: true,
  })
}

propertyFavoriteSchema.query.byUser = function (userId) {
  return this.where({
    user: userId,
  })
}

propertyFavoriteSchema.query.byVisitor = function (visitorId) {
  return this.where({
    visitorId,
  })
}

/* ============================================================
   TRANSFORM
============================================================ */

propertyFavoriteSchema.set('toJSON', {
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

const PropertyFavorite = mongoose.model(
  'PropertyFavorite',
  propertyFavoriteSchema,
)

export default PropertyFavorite
