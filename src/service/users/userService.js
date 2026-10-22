import { createHash } from 'node:crypto'
import User from '../../models/User.js'
import Lead from '../../models/Lead.js'
import Visit from '../../models/Visit.js'
import Sale from '../../models/Sale.js'
import Commission from '../../models/Commission.js'

import { addBrokerToChannel } from '../chatService.js'

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
  MÉTRICAS DE LEADS E VISITAS
  =====================================
  */

  const [totalLeads, totalVisits, convertedLeads, lostLeads] =
    await Promise.all([
      Lead.countDocuments({
        assignedTo: broker._id,
      }),

      Visit.countDocuments({
        broker: broker._id,
      }),

      Lead.countDocuments({
        assignedTo: broker._id,
        status: 'convertido',
      }),

      Lead.countDocuments({
        assignedTo: broker._id,
        status: 'perdido',
      }),
    ])

  /*
  =====================================
  VENDAS CONCLUÍDAS E RECEITA
  =====================================

  Mantém a mesma regra do dashboard do corretor:
  - vendedor: Sale.sellerBroker
  - venda concluída: status 'completed'
  - valor da venda: saleAmount
  */

  const completedSalesFilter = {
    sellerBroker: broker._id,
    status: 'completed',
  }

  const [completedSales, revenueResult, commissionResult] = await Promise.all([
    Sale.countDocuments(completedSalesFilter),

    Sale.aggregate([
      {
        $match: completedSalesFilter,
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $ifNull: ['$saleAmount', 0],
            },
          },
        },
      },
    ]),

    // Soma somente a parte da comissão que pertence ao corretor vendedor.
    // Não inclui a comissão total da imobiliária nem valores cancelados.
    Commission.aggregate([
      {
        $match: {
          sellerBroker: broker._id,
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: null,
          totalCommission: {
            $sum: {
              $ifNull: ['$distribution.seller.amount', 0],
            },
          },
        },
      },
    ]),
  ])

  const totalRevenue = revenueResult[0]?.total || 0
  const totalBrokerCommission = commissionResult[0]?.totalCommission || 0

  /*
  =====================================
  TAXA DE CONVERSÃO
  =====================================
  */

  // Taxa de conversão definida pelo negócio:
  // vendas concluídas / total de leads recebidos.
  const conversionRate =
    totalLeads > 0
      ? Number(((completedSales / totalLeads) * 100).toFixed(1))
      : 0

  // Progresso da meta mensal considera vendas concluídas no mês atual.
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const dealsThisMonth = await Sale.countDocuments({
    ...completedSalesFilter,
    createdAt: {
      $gte: monthStart,
      $lt: nextMonthStart,
    },
  })

  const monthlyGoal = Math.max(0, Number(broker.settings?.monthlyGoal) || 0)
  const goalProgress =
    monthlyGoal > 0
      ? Math.min(100, Number(((dealsThisMonth / monthlyGoal) * 100).toFixed(1)))
      : 0

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
      deals: completedSales,
      lostDeals: lostLeads,
      revenue: totalRevenue,
      comissaoTotal: totalBrokerCommission,
      conversionRate,
      dealsThisMonth,
      monthlyGoal,
      goalProgress,
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

  /*
  ==================================================
  ADICIONAR NOVO CORRETOR AO CANAL DOS CORRETORES
  ==================================================
  */

  if (user.role === 'broker' && user.isActive === true) {
    try {
      await addBrokerToChannel({
        brokerId: user._id,
      })
    } catch (error) {
      /*
      Não falhamos a criação do usuário caso exista
      algum problema no chat.

      O usuário já foi criado com sucesso.
      O problema de sincronização do canal pode
      ser corrigido posteriormente.
      */

      console.error(
        'Erro ao adicionar novo corretor ao Canal dos Corretores:',
        error,
      )
    }
  }

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

    // LEADS
    const leads = await Lead.countDocuments({
      assignedTo: brokerId,
      createdAt: {
        $gte: date,
        $lt: nextMonth,
      },
    })

    // VISITAS
    const visits = await Visit.countDocuments({
      broker: brokerId,
      createdAt: {
        $gte: date,
        $lt: nextMonth,
      },
    })

    // VENDAS CONCLUÍDAS — mesma regra do dashboard principal
    const deals = await Sale.countDocuments({
      sellerBroker: brokerId,
      status: 'completed',
      createdAt: {
        $gte: date,
        $lt: nextMonth,
      },
    })

    months.push({
      month: date
        .toLocaleString('pt-BR', { month: 'short' })
        .replace('.', '')
        .toUpperCase(),
      year: date.getFullYear(),
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
