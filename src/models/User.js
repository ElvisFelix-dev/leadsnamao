import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import slugify from 'slugify'

const userSchema = new mongoose.Schema(
  {
    /*
    =========================================
    DADOS BÁSICOS
    =========================================
    */

    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      sparse: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      trim: true,
      set: (value) => value?.replace(/\s+/g, ''),
      validate: {
        validator(v) {
          return !v || v === '+55' || /^\+55\d{10,11}$/.test(v)
        },
        message: (props) =>
          `${props.value} não é um número válido de telefone brasileiro!`,
      },
    },

    avatar: {
      type: String,
      default: '',
    },

    coverImage: {
      type: String,
      default: '',
    },

    bio: {
      type: String,
      default: '',
      maxlength: 500,
    },

    website: {
      type: String,
      default: '',
    },

    /*
    =========================================
    PERFIL PROFISSIONAL
    =========================================
    */

    position: {
      type: String,
      default: 'Corretor de Imóveis',
    },

    company: {
      type: String,
      default: '',
    },

    creci: {
      type: String,
      default: '',
      trim: true,
    },

    creciActive: {
      type: Boolean,
      default: false,
    },

    experienceYears: {
      type: Number,
      default: 0,
      min: 0,
    },

    signature: {
      type: String,
      default: '',
    },

    subscription: {
      plan: {
        type: String,
        enum: ['free', 'starter', 'professional', 'enterprise'],
        default: 'free',
      },

      status: {
        type: String,
        enum: ['active', 'pending', 'cancelled', 'expired'],
        default: 'active',
      },

      expiresAt: {
        type: Date,
        default: null,
      },
    },

    specialties: [
      {
        type: String,
        enum: [
          'Apartamento',
          'Casa',
          'Cobertura',
          'Alto Padrão',
          'Lançamentos',
          'Comercial',
          'Locação',
          'Terrenos',
          'Investimentos',
        ],
      },
    ],

    regions: [
      {
        type: String,
        trim: true,
      },
    ],

    highlights: [
      {
        type: String,
      },
    ],

    languages: [
      {
        name: {
          type: String,
          trim: true,
        },

        level: {
          type: String,
          enum: ['Básico', 'Intermediário', 'Avançado', 'Fluente'],
        },
      },
    ],

    workingHours: {
      start: {
        type: String,
        default: '',
      },

      end: {
        type: String,
        default: '',
      },
    },

    availability: {
      type: String,
      enum: ['Disponível', 'Em visita', 'Em reunião', 'Offline'],
      default: 'Disponível',
    },

    /*
    =========================================
    ENDEREÇO
    =========================================
    */

    address: {
      street: {
        type: String,
        default: '',
      },

      number: {
        type: String,
        default: '',
      },

      district: {
        type: String,
        default: '',
      },

      city: {
        type: String,
        default: '',
      },

      state: {
        type: String,
        default: '',
      },

      zipCode: {
        type: String,
        default: '',
      },
    },

    /*
    =========================================
    REDES SOCIAIS
    =========================================
    */

    socials: {
      instagram: {
        type: String,
        default: '',
      },

      facebook: {
        type: String,
        default: '',
      },

      linkedin: {
        type: String,
        default: '',
      },

      youtube: {
        type: String,
        default: '',
      },

      tiktok: {
        type: String,
        default: '',
      },

      whatsapp: {
        type: String,
        default: '',
      },
    },

    /*
    =========================================
    CONFIGURAÇÕES
    =========================================
    */

    settings: {
      monthlyGoal: {
        type: Number,
        default: 10,
      },

      commissionPercentage: {
        type: Number,
        default: 3,
        min: 0,
        max: 100,
      },

      themeColor: {
        type: String,
        default: '#2563EB',
      },

      notifications: {
        type: Boolean,
        default: true,
      },

      language: {
        type: String,
        default: 'pt-BR',
      },

      showcaseEnabled: {
        type: Boolean,
        default: true,
      },
    },

    /*
    =========================================
    NOTIFICAÇÕES PUSH
    =========================================

    Um usuário pode ter várias subscriptions:

    - Chrome desktop
    - Chrome celular
    - Edge
    - Firefox
    - outro dispositivo

    Cada navegador/dispositivo gera uma subscription
    diferente.
    =========================================
    */

    pushSubscriptions: [
      {
        endpoint: {
          type: String,
          required: true,
          trim: true,
        },

        /*
        A Push API retorna expirationTime em milissegundos
        ou null. Por isso armazenamos como Number.
        */
        expirationTime: {
          type: Number,
          default: null,
        },

        keys: {
          p256dh: {
            type: String,
            required: true,
          },

          auth: {
            type: String,
            required: true,
          },
        },

        createdAt: {
          type: Date,
          default: Date.now,
        },

        lastUsedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    /*
    =========================================
    COMISSÕES
    =========================================
    */

    commissionPercentage: {
      type: Number,
      default: 3,
      min: 0,
      max: 100,
    },

    capturerCommissionPercentage: {
      type: Number,
      default: 1,
      min: 0,
      max: 100,
    },

    /*
    =========================================
    PERFORMANCE
    =========================================
    */

    performance: {
      points: {
        type: Number,
        default: 0,
      },

      level: {
        type: Number,
        default: 1,
      },

      badges: [
        {
          type: String,
        },
      ],

      achievements: [
        {
          type: String,
        },
      ],
    },

    /*
    =========================================
    PERMISSÕES
    =========================================
    */

    role: {
      type: String,
      enum: ['admin', 'broker'],
      default: 'broker',
    },

    isAdmin: {
      type: Boolean,
      default: false,
    },

    isBroker: {
      type: Boolean,
      default: true,
    },

    /*
    =========================================
    STATUS
    =========================================
    */

    isActive: {
      type: Boolean,
      default: true,
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    lastSeen: {
      type: Date,
      default: null,
    },

    stats: {
      leads: {
        type: Number,
        default: 0,
      },

      visits: {
        type: Number,
        default: 0,
      },

      deals: {
        type: Number,
        default: 0,
      },

      revenue: {
        type: Number,
        default: 0,
      },
    },

    /*
    =========================================
    CONFIGURAÇÕES DO CORRETOR
    PARA DISTRIBUIÇÃO
    =========================================
    */

    brokerSettings: {
      specializedRegions: {
        type: [String],
        enum: [
          'central',
          'zona_oeste',
          'zona_leste',
          'zona_sul',
          'zona_norte',
          'abc',
          'grande_sp',
          'interior',
          'litoral',
        ],
        default: [],
      },

      specializedTypes: {
        type: [String],
        enum: ['apartamento', 'casa', 'cobertura', 'comercial', 'terreno'],
        default: [],
      },

      isActive: {
        type: Boolean,
        default: true,
      },

      maxActiveLeads: {
        type: Number,
        default: 50,
        min: 1,
        max: 500,
      },

      priority: {
        type: Number,
        default: 0,
        min: 0,
        max: 10,
      },

      availableDays: {
        type: [String],
        enum: [
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
          'sunday',
        ],
        default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      },

      workHours: {
        start: {
          type: String,
          default: '09:00',
        },

        end: {
          type: String,
          default: '18:00',
        },
      },

      acceptedLeadTypes: {
        type: [String],
        enum: ['venda', 'aluguel', 'ambos'],
        default: ['venda', 'aluguel'],
      },

      minPropertyValue: {
        type: Number,
        default: 0,
        min: 0,
      },

      maxPropertyValue: {
        type: Number,
        default: null,
        min: 0,
      },

      metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },

    /*
    =========================================
    CONTADORES DO CORRETOR
    =========================================
    */

    leadCounters: {
      totalAssigned: {
        type: Number,
        default: 0,
        min: 0,
      },

      activeLeads: {
        type: Number,
        default: 0,
        min: 0,
      },

      convertedLeads: {
        type: Number,
        default: 0,
        min: 0,
      },

      lastLeadReceivedAt: {
        type: Date,
        default: null,
      },

      leadQueuePosition: {
        type: Number,
        default: 0,
        min: 0,
      },

      lostLeads: {
        type: Number,
        default: 0,
        min: 0,
      },

      averageResponseTime: {
        type: Number,
        default: 0,
      },

      lastActivityAt: {
        type: Date,
        default: null,
      },
    },

    /*
    =========================================
    RECUPERAÇÃO DE SENHA
    =========================================
    */

    resetPasswordToken: {
      type: String,
      default: null,
    },

    resetPasswordExpire: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

/*
=========================================
ÍNDICES
=========================================
*/

userSchema.index({ role: 1 })
userSchema.index({ availability: 1 })
userSchema.index({ isOnline: 1 })
userSchema.index({ commissionPercentage: 1 })

// Distribuição de leads
userSchema.index({ 'brokerSettings.isActive': 1 })
userSchema.index({ 'brokerSettings.specializedRegions': 1 })
userSchema.index({ 'brokerSettings.priority': 1 })
userSchema.index({ 'leadCounters.activeLeads': 1 })
userSchema.index({ 'leadCounters.leadQueuePosition': 1 })
userSchema.index({ 'leadCounters.lastLeadReceivedAt': -1 })

// Busca otimizada de corretores
userSchema.index({
  'brokerSettings.isActive': 1,
  'leadCounters.activeLeads': 1,
  'brokerSettings.priority': -1,
})

/*
=========================================
GERAR SLUG
=========================================
*/

userSchema.pre('save', async function (next) {
  if (!this.isModified('name') && this.slug) {
    return next()
  }

  let slug = slugify(this.name, {
    lower: true,
    strict: true,
    locale: 'pt',
  })

  const exists = await mongoose.models.User.findOne({
    slug,
    _id: {
      $ne: this._id,
    },
  })

  if (exists) {
    slug = `${slug}-${Date.now()}`
  }

  this.slug = slug

  next()
})

/*
=========================================
CRIPTOGRAFAR SENHA
=========================================
*/

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next()
  }

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)

  next()
})

/*
=========================================
PADRONIZAR TELEFONE
=========================================
*/

userSchema.pre('save', function (next) {
  if (!this.phone) {
    return next()
  }

  let number = this.phone.replace(/\D/g, '')

  if (!number.startsWith('55')) {
    number = `55${number}`
  }

  this.phone = `+${number}`

  next()
})

/*
=========================================
VIRTUAIS
=========================================
*/

/**
 * Verifica se o corretor está disponível para receber leads.
 */
userSchema.virtual('isAvailableForLeads').get(function () {
  return (
    this.role === 'broker' &&
    this.isActive === true &&
    this.brokerSettings?.isActive !== false &&
    (this.leadCounters?.activeLeads || 0) <
      (this.brokerSettings?.maxActiveLeads || 50)
  )
})

/**
 * Verifica especializações.
 */
userSchema.virtual('hasSpecialization').get(function () {
  return {
    inRegion: (region) => {
      return this.brokerSettings?.specializedRegions?.includes(region) || false
    },

    inType: (type) => {
      return this.brokerSettings?.specializedTypes?.includes(type) || false
    },
  }
})

/**
 * Retorna porcentagem de ocupação.
 */
userSchema.virtual('occupationRate').get(function () {
  const active = this.leadCounters?.activeLeads || 0
  const max = this.brokerSettings?.maxActiveLeads || 50

  if (max <= 0) {
    return 0
  }

  return Math.round((active / max) * 100)
})

/*
=========================================
MÉTODOS DE PUSH NOTIFICATION
=========================================
*/

/**
 * Adiciona ou atualiza uma subscription push.
 *
 * Um usuário pode possuir várias subscriptions,
 * uma para cada navegador/dispositivo.
 */
userSchema.methods.addPushSubscription = function (subscription) {
  if (!subscription?.endpoint) {
    throw new Error('Subscription push inválida.')
  }

  if (!subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error('Chaves da subscription push são obrigatórias.')
  }

  if (!Array.isArray(this.pushSubscriptions)) {
    this.pushSubscriptions = []
  }

  const existingSubscription = this.pushSubscriptions.find(
    (item) => item.endpoint === subscription.endpoint,
  )

  if (existingSubscription) {
    existingSubscription.expirationTime = subscription.expirationTime ?? null

    existingSubscription.keys = {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    }

    existingSubscription.lastUsedAt = new Date()
  } else {
    this.pushSubscriptions.push({
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime ?? null,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      createdAt: new Date(),
      lastUsedAt: new Date(),
    })
  }

  return this.save()
}

/**
 * Remove uma subscription específica pelo endpoint.
 */
userSchema.methods.removePushSubscription = function (endpoint) {
  if (!endpoint) {
    return this
  }

  this.pushSubscriptions = (this.pushSubscriptions || []).filter(
    (subscription) => subscription.endpoint !== endpoint,
  )

  return this.save()
}

/**
 * Atualiza a data de utilização de uma subscription.
 */
userSchema.methods.touchPushSubscription = function (endpoint) {
  if (!endpoint) {
    return this
  }

  const subscription = this.pushSubscriptions?.find(
    (item) => item.endpoint === endpoint,
  )

  if (subscription) {
    subscription.lastUsedAt = new Date()
  }

  return this.save()
}

/**
 * Retorna todas as subscriptions válidas.
 */
userSchema.methods.getPushSubscriptions = function () {
  return (this.pushSubscriptions || []).filter(
    (subscription) =>
      subscription?.endpoint &&
      subscription?.keys?.p256dh &&
      subscription?.keys?.auth,
  )
}

/*
=========================================
MÉTODOS DE COMISSÃO
=========================================
*/

/**
 * Calcula o valor da comissão para uma venda.
 */
userSchema.methods.calculateCommission = function (
  saleAmount,
  type = 'seller',
) {
  let percentage

  if (type === 'seller') {
    percentage = this.commissionPercentage || 3
  } else if (type === 'capturer') {
    percentage = this.capturerCommissionPercentage || 1
  } else {
    percentage = 0
  }

  return {
    percentage,
    amount: (saleAmount * percentage) / 100,
  }
}

/**
 * Atualiza estatísticas após uma venda.
 */
userSchema.methods.updateStatsAfterSale = async function (saleAmount) {
  this.stats.deals = (this.stats.deals || 0) + 1
  this.stats.revenue = (this.stats.revenue || 0) + saleAmount

  this.performance.points = (this.performance.points || 0) + 10

  const newLevel = Math.floor((this.performance.points || 0) / 100) + 1

  if (newLevel > (this.performance.level || 1)) {
    this.performance.level = newLevel
  }

  if (this.leadCounters) {
    this.leadCounters.convertedLeads =
      (this.leadCounters.convertedLeads || 0) + 1
  }

  await this.save()

  return this
}

/**
 * Busca percentual de comissão.
 */
userSchema.methods.getCommissionPercentage = function () {
  return this.commissionPercentage || this.settings?.commissionPercentage || 3
}

/**
 * Busca percentual de comissão de captador.
 */
userSchema.methods.getCapturerCommissionPercentage = function () {
  return this.capturerCommissionPercentage || 1
}

/*
=========================================
MÉTODOS DE DISTRIBUIÇÃO
=========================================
*/

/**
 * Incrementa contador de leads.
 */
userSchema.methods.incrementLeadCounter = async function (type = 'assigned') {
  if (!this.leadCounters) {
    this.leadCounters = {}
  }

  const now = new Date()

  switch (type) {
    case 'assigned':
      this.leadCounters.totalAssigned =
        (this.leadCounters.totalAssigned || 0) + 1

      this.leadCounters.activeLeads = (this.leadCounters.activeLeads || 0) + 1

      this.leadCounters.lastLeadReceivedAt = now
      this.leadCounters.lastActivityAt = now
      break

    case 'converted':
      this.leadCounters.convertedLeads =
        (this.leadCounters.convertedLeads || 0) + 1

      this.leadCounters.activeLeads = Math.max(
        0,
        (this.leadCounters.activeLeads || 0) - 1,
      )
      break

    case 'lost':
      this.leadCounters.lostLeads = (this.leadCounters.lostLeads || 0) + 1

      this.leadCounters.activeLeads = Math.max(
        0,
        (this.leadCounters.activeLeads || 0) - 1,
      )
      break

    case 'remove':
      this.leadCounters.activeLeads = Math.max(
        0,
        (this.leadCounters.activeLeads || 0) - 1,
      )
      break

    default:
      break
  }

  this.leadCounters.leadQueuePosition =
    (this.leadCounters.leadQueuePosition || 0) + 1

  return this.save()
}

/**
 * Decrementa contador de leads.
 */
userSchema.methods.decrementLeadCounter = async function (type = 'remove') {
  if (!this.leadCounters) {
    this.leadCounters = {}
  }

  switch (type) {
    case 'remove':
      this.leadCounters.activeLeads = Math.max(
        0,
        (this.leadCounters.activeLeads || 0) - 1,
      )
      break

    case 'converted':
      this.leadCounters.convertedLeads =
        (this.leadCounters.convertedLeads || 0) + 1

      this.leadCounters.activeLeads = Math.max(
        0,
        (this.leadCounters.activeLeads || 0) - 1,
      )
      break

    case 'lost':
      this.leadCounters.lostLeads = (this.leadCounters.lostLeads || 0) + 1

      this.leadCounters.activeLeads = Math.max(
        0,
        (this.leadCounters.activeLeads || 0) - 1,
      )
      break

    default:
      break
  }

  return this.save()
}

/**
 * Verifica se o corretor pode receber mais leads.
 */
userSchema.methods.canAcceptMoreLeads = function () {
  const activeLeads = this.leadCounters?.activeLeads || 0
  const maxLeads = this.brokerSettings?.maxActiveLeads || 50

  return activeLeads < maxLeads
}

/**
 * Verifica especialização por região.
 */
userSchema.methods.isSpecializedInRegion = function (region) {
  if (!region) {
    return false
  }

  return this.brokerSettings?.specializedRegions?.includes(region) || false
}

/**
 * Verifica especialização por tipo.
 */
userSchema.methods.isSpecializedInType = function (type) {
  if (!type) {
    return false
  }

  return this.brokerSettings?.specializedTypes?.includes(type) || false
}

/**
 * Calcula score de match com um lead.
 */
userSchema.methods.calculateMatchScore = function (lead) {
  let score = 0

  if (lead.region && this.isSpecializedInRegion(lead.region)) {
    score += 40
  }

  if (lead.property?.type && this.isSpecializedInType(lead.property.type)) {
    score += 30
  }

  if (this.canAcceptMoreLeads()) {
    score += 20
  }

  score += Math.min(this.brokerSettings?.priority || 0, 10)

  return Math.min(score, 100)
}

/**
 * Reseta contadores.
 */
userSchema.methods.resetLeadCounters = async function () {
  this.leadCounters = {
    totalAssigned: 0,
    activeLeads: 0,
    convertedLeads: 0,
    lostLeads: 0,
    lastLeadReceivedAt: null,
    leadQueuePosition: 0,
    averageResponseTime: 0,
    lastActivityAt: null,
  }

  return this.save()
}

/*
=========================================
STATIC METHODS
=========================================
*/

/**
 * Busca corretores disponíveis.
 */
userSchema.statics.findAvailableBrokers = function (options = {}) {
  const { region, type, limit = 10, exclude = [], minPriority = 0 } = options

  const query = {
    role: 'broker',
    isActive: true,
    'brokerSettings.isActive': true,
    _id: {
      $nin: exclude,
    },
  }

  if (minPriority > 0) {
    query['brokerSettings.priority'] = {
      $gte: minPriority,
    }
  }

  if (region) {
    query['brokerSettings.specializedRegions'] = region
  }

  if (type) {
    query['brokerSettings.specializedTypes'] = type
  }

  return this.find(query)
    .sort({
      'leadCounters.activeLeads': 1,
      'brokerSettings.priority': -1,
      'leadCounters.leadQueuePosition': 1,
    })
    .limit(limit)
}

/**
 * Busca melhor corretor para um lead.
 */
userSchema.statics.findBestBrokerForLead = async function (lead, options = {}) {
  const { region, type, exclude = [] } = options

  const brokers = await this.findAvailableBrokers({
    region,
    type,
    exclude,
    limit: 10,
  })

  if (brokers.length === 0) {
    return null
  }

  const scoredBrokers = brokers.map((broker) => ({
    broker,
    score: broker.calculateMatchScore(lead),
    activeLeads: broker.leadCounters?.activeLeads || 0,
    queuePosition: broker.leadCounters?.leadQueuePosition || 0,
  }))

  scoredBrokers.sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score
    }

    if (a.activeLeads !== b.activeLeads) {
      return a.activeLeads - b.activeLeads
    }

    return a.queuePosition - b.queuePosition
  })

  return scoredBrokers[0]?.broker || null
}

/**
 * Estatísticas de distribuição.
 */
userSchema.statics.getDistributionStats = async function () {
  const stats = await this.aggregate([
    {
      $match: {
        role: 'broker',
        isActive: true,
      },
    },

    {
      $group: {
        _id: null,

        totalBrokers: {
          $sum: 1,
        },

        activeBrokers: {
          $sum: {
            $cond: [
              {
                $eq: ['$brokerSettings.isActive', true],
              },
              1,
              0,
            ],
          },
        },

        totalActiveLeads: {
          $sum: '$leadCounters.activeLeads',
        },

        totalAssignedLeads: {
          $sum: '$leadCounters.totalAssigned',
        },

        totalConvertedLeads: {
          $sum: '$leadCounters.convertedLeads',
        },

        avgActiveLeads: {
          $avg: '$leadCounters.activeLeads',
        },

        maxActiveLeads: {
          $max: '$leadCounters.activeLeads',
        },

        minActiveLeads: {
          $min: '$leadCounters.activeLeads',
        },
      },
    },
  ])

  return (
    stats[0] || {
      totalBrokers: 0,
      activeBrokers: 0,
      totalActiveLeads: 0,
      totalAssignedLeads: 0,
      totalConvertedLeads: 0,
      avgActiveLeads: 0,
      maxActiveLeads: 0,
      minActiveLeads: 0,
    }
  )
}

/**
 * Busca corretores com mais leads.
 */
userSchema.statics.findTopBrokers = async function (limit = 10) {
  return this.find({
    role: 'broker',
    isActive: true,
  })
    .sort({
      'leadCounters.totalAssigned': -1,
      'leadCounters.convertedLeads': -1,
    })
    .limit(limit)
    .select('name email leadCounters stats')
}

/*
=========================================
JSON
=========================================
*/

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,

  transform(doc, ret) {
    /*
    =====================================
    CAMPOS SENSÍVEIS
    =====================================
    */

    delete ret.password
    delete ret.resetPasswordToken
    delete ret.resetPasswordExpire

    /*
    =====================================
    PUSH SUBSCRIPTIONS
    =====================================

    Nunca enviar endpoint/chaves VAPID
    para o frontend através do User.
    */

    delete ret.pushSubscriptions

    /*
    =====================================
    VIRTUAIS
    =====================================
    */

    ret.isAvailableForLeads = doc.isAvailableForLeads

    ret.occupationRate = doc.occupationRate

    return ret
  },
})

export default mongoose.model('User', userSchema)
