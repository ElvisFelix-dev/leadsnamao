import { createHash } from 'node:crypto'
import User from '../../models/User.js'
import Lead from '../../models/Lead.js'
import Visit from '../../models/Visit.js'

/*
====================================================
BUSCAR TODOS OS USUÁRIOS
====================================================
*/

export async function getAllUsers() {
  return User.find().select('-password').sort({ createdAt: -1 })
}

/*
====================================================
BUSCAR USUÁRIO POR ID
====================================================
*/

export async function getUserById(userId) {
  return User.findById(userId).select('-password')
}

/*
====================================================
BUSCAR DETALHES DO CORRETOR
ADMIN DASHBOARD
====================================================
*/

export async function getBrokerDetailsById(userId) {
  const broker = await User.findOne({
    _id: userId,
    role: 'broker',
  }).select('-password')

  if (!broker) {
    return null
  }

  /*
  =====================================
  MÉTRICAS REAIS
  =====================================
  */

  const totalLeads = await Lead.countDocuments({
    assignedTo: userId,
  })

  const totalVisits = await Visit.countDocuments({
    broker: userId,
  })

  const convertedLeads = await Lead.countDocuments({
    assignedTo: userId,
    status: 'convertido',
  })

  const lostLeads = await Lead.countDocuments({
    assignedTo: userId,
    status: 'perdido',
  })

  /*
  =====================================
  TAXA DE CONVERSÃO
  =====================================
  */

  const conversionRate =
    totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0

  /*
  =====================================
  RECEITA
  =====================================
  */

  const revenue = await Lead.aggregate([
    {
      $match: {
        assignedTo: broker._id,
        status: 'convertido',
      },
    },

    {
      $group: {
        _id: null,
        total: {
          $sum: '$proposalValue',
        },
      },
    },
  ])

  const totalRevenue = revenue[0]?.total || 0

  return {
    profile: {
      id: broker._id,

      name: broker.name,

      avatar: broker.avatar,

      coverImage: broker.coverImage,

      email: broker.email,

      phone: broker.phone,

      creci: broker.creci,

      company: broker.company,

      position: broker.position,
    },

    stats: {
      leads: totalLeads,

      visits: totalVisits,

      deals: convertedLeads,

      lostDeals: lostLeads,

      revenue: totalRevenue,

      conversionRate,
    },

    performance: {
      ...broker.performance,
    },

    settings: broker.settings,

    socials: broker.socials,

    availability: broker.availability,
  }
}

/*
====================================================
BUSCAR CORRETOR PELO SLUG
PERFIL PÚBLICO
====================================================
*/

export async function getBrokerBySlug(slug) {
  return User.findOne({
    slug,
    role: 'broker',
    isActive: true,
  }).select('-password')
}

/*
====================================================
BUSCAR PERFIL DO CORRETOR LOGADO
====================================================
*/

export async function getBrokerProfile(userId) {
  return User.findOne({
    _id: userId,
    role: 'broker',
    isActive: true,
  }).select('-password')
}

/*
====================================================
ATUALIZAR PERFIL
====================================================
*/

/*
====================================================
ATUALIZAR PERFIL
====================================================
*/

export async function updateUser(userId, data) {
  const user = await User.findById(userId)

  if (!user) {
    throw new Error('Usuário não encontrado')
  }

  const allowedFields = [
    'name',
    'phone',
    'bio',
    'website',

    'position',
    'company',
    'creci',
    'creciActive',
    'experienceYears',
    'signature',

    'specialties',
    'regions',
    'highlights',
    'languages',

    'workingHours',
    'availability',

    'address',
    'socials',
  ]

  allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      user[field] = data[field]
    }
  })

  await user.save()

  const updatedUser = user.toObject()

  delete updatedUser.password

  return updatedUser
}

/*
====================================================
ATUALIZAR CONFIGURAÇÕES
====================================================
*/

export async function updateUserSettings(userId, settings) {
  return User.findByIdAndUpdate(
    userId,
    {
      settings,
    },
    {
      new: true,
      runValidators: true,
    },
  ).select('-password')
}

/*
====================================================
ATUALIZAR PERFORMANCE
====================================================
*/

export async function updatePerformance(userId, performance) {
  return User.findByIdAndUpdate(
    userId,
    {
      performance,
    },
    {
      new: true,
      runValidators: true,
    },
  ).select('-password')
}

/*
====================================================
ATUALIZAR AVATAR
====================================================
*/

export async function updateAvatar(userId, avatar) {
  return User.findByIdAndUpdate(
    userId,
    {
      avatar,
    },
    {
      new: true,
    },
  ).select('-password')
}

/*
====================================================
ATUALIZAR CAPA
====================================================
*/

export async function updateCoverImage(userId, coverImage) {
  return User.findByIdAndUpdate(
    userId,
    {
      coverImage,
    },
    {
      new: true,
    },
  ).select('-password')
}

/*
====================================================
ATUALIZAR STATUS ONLINE
====================================================
*/

export async function updateOnlineStatus(userId, isOnline) {
  return User.findByIdAndUpdate(
    userId,
    {
      isOnline,
      lastSeen: new Date(),
    },
    {
      new: true,
    },
  ).select('-password')
}

/*
====================================================
LISTAR CORRETORES
====================================================
*/

export async function getBrokers() {
  const brokers = await User.find({
    role: 'broker',
    isActive: true,
  })
    .select(
      '_id name email avatar phone position company creci slug isActive role',
    )
    .sort({
      name: 1,
    })
    .lean()

  return brokers
}

/*
====================================================
RANKING DOS CORRETORES
====================================================
*/

export async function getBrokerRanking() {
  return User.find({
    role: 'broker',
    isActive: true,
  })
    .select('name slug avatar position company performance')
    .sort({
      'performance.points': -1,
    })
}

/*
====================================================
BUSCAR USUÁRIO PELO EMAIL
====================================================
*/

export async function findUserByEmail(email) {
  return User.findOne({
    email: email.toLowerCase().trim(),
  })
}

/*
====================================================
CRIAR USUÁRIO
====================================================
*/

export async function createUser(userData) {
  const user = new User({
    ...userData,
  })

  await user.save()

  return user
}

/*
====================================================
RESETAR SENHA
====================================================
*/

export async function resetUserPassword(token, password) {
  const hashedToken = createHash('sha256').update(token).digest('hex')

  const user = await User.findOne({
    resetPasswordToken: hashedToken,

    resetPasswordExpire: {
      $gt: Date.now(),
    },
  })

  if (!user) {
    throw new Error('Token inválido ou expirado')
  }

  user.password = password

  user.resetPasswordToken = undefined

  user.resetPasswordExpire = undefined

  await user.save()

  return user
}

/*
====================================================
BUSCAR USUÁRIO LOGADO
GET ME
====================================================
*/

export async function getMe(userId) {
  return User.findById(userId).select('-password')
}

export async function getBrokerMonthlyPerformance(brokerId) {
  const months = []

  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)

    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)

    /*
    ==============================
    LEADS
    ==============================
    */

    const leads = await Lead.countDocuments({
      assignedTo: brokerId,

      createdAt: {
        $gte: date,
        $lt: nextMonth,
      },
    })

    /*
    ==============================
    VISITAS
    ==============================
    */

    const visits = await Visit.countDocuments({
      broker: brokerId,

      createdAt: {
        $gte: date,
        $lt: nextMonth,
      },
    })

    /*
    ==============================
    NEGÓCIOS FECHADOS
    ==============================
    */

    const deals = await Lead.countDocuments({
      assignedTo: brokerId,

      status: 'convertido',

      closeDate: {
        $gte: date,
        $lt: nextMonth,
      },
    })

    months.push({
      month: date
        .toLocaleString('pt-BR', {
          month: 'short',
        })
        .replace('.', '')
        .toUpperCase(),

      leads,

      visits,

      deals,
    })
  }

  return months
}

/*
====================================================
ÚLTIMOS LEADS DO CORRETOR
====================================================
*/

export async function getBrokerLatestLeads(brokerId) {
  return Lead.find({
    assignedTo: brokerId,
  })
    .populate('property', 'title address price')
    .sort({
      createdAt: -1,
    })
    .limit(6)
}
