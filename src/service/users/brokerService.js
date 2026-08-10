import User from '../../models/User.js'

// ==========================================
// Buscar corretor por ID
// ==========================================

const getBrokerById = async (id) => {
  const broker = await User.findOne({
    _id: id,
    isBroker: true,
  }).select('-password')

  if (!broker) {
    throw new Error('Corretor não encontrado')
  }

  return broker
}

// ==========================================
// Buscar corretor por slug
// ==========================================

const getBrokerBySlug = async (slug) => {
  const broker = await User.findOne({
    slug,
    isBroker: true,
  }).select('-password')

  if (!broker) {
    throw new Error('Corretor não encontrado')
  }

  return broker
}

// ==========================================
// Buscar corretor público
// ==========================================

const getPublicBroker = async (id) => {
  const broker = await User.findOne({
    _id: id,
    isBroker: true,
  }).select(`
    name
    position
    avatar
    phone
    email
    bio
    city
    state
    creci
    specialties
    experience
    instagram
    facebook
    linkedin
    website
  `)

  if (!broker) {
    throw new Error('Corretor não encontrado')
  }

  return broker
}

// ==========================================
// Buscar todos os corretores públicos
// ==========================================

const getPublicBrokers = async () => {
  const brokers = await User.find({
    isBroker: true,
  })
    .select(
      `
      name
      avatar
      bio
      city
      state
      creci
      specialties
      experience
      instagram
      facebook
      linkedin
      website
    `,
    )
    .sort({
      name: 1,
    })

  return brokers
}

export default {
  getBrokerById,
  getBrokerBySlug,
  getPublicBroker,
  getPublicBrokers,
}
