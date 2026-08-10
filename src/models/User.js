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
        name: String,

        level: {
          type: String,

          enum: ['Básico', 'Intermediário', 'Avançado', 'Fluente'],
        },
      },
    ],

    workingHours: {
      start: String,
      end: String,
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
      street: String,

      number: String,

      district: String,

      city: String,

      state: String,

      zipCode: String,
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

/*
=========================================
GERAR SLUG
=========================================
*/

userSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
    })
  }

  next()
})

userSchema.pre('save', async function (next) {
  if (this.isModified('name')) {
    let slug = slugify(this.name, {
      lower: true,
      strict: true,
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
  }

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

export default mongoose.model('User', userSchema)
