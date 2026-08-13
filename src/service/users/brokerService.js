import User from '../../models/User.js'
import Property from '../../models/Property.js'

// ==========================================
// CAMPOS PÚBLICOS DO CORRETOR
// ==========================================

const PUBLIC_BROKER_FIELDS = `
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
  experienceYears
  instagram
  facebook
  linkedin
  website
  socials
  company
  slug
`

// ==========================================
// Buscar corretor por ID
// ==========================================

const getBrokerById = async (id) => {
  const broker = await User.findOne({
    _id: id,
    isBroker: true,
  })
    .select('-password')
    .lean()

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
    isActive: true,
  })
    .select('-password')
    .lean()

  if (!broker) {
    throw new Error('Corretor não encontrado')
  }

  return broker
}

// ==========================================
// Buscar corretor público por ID
// ==========================================

const getPublicBroker = async (id) => {
  const broker = await User.findOne({
    _id: id,
    isBroker: true,
    isActive: true,
  })
    .select(PUBLIC_BROKER_FIELDS)
    .lean()

  if (!broker) {
    throw new Error('Corretor não encontrado')
  }

  return broker
}

// ==========================================
// Buscar corretor público por slug
// ==========================================

const getPublicBrokerBySlug = async (slug) => {
  const broker = await User.findOne({
    slug,
    isBroker: true,
    isActive: true,
  })
    .select(PUBLIC_BROKER_FIELDS)
    .lean()

  if (!broker) {
    throw new Error('Corretor não encontrado')
  }

  return broker
}

// ==========================================
// Buscar todos os corretores
// CRM
// ==========================================

const getBrokers = async () => {
  const brokers = await User.find({
    isBroker: true,
    isActive: true,
  })
    .select(
      `
      _id
      name
      email
      phone
      avatar
      coverImage
      position
      company
      creci
      creciActive
      slug
      isBroker
      isActive
    `,
    )
    .sort({
      name: 1,
    })
    .lean()

  return brokers
}

// ==========================================
// Buscar todos os corretores públicos
// ==========================================

const getPublicBrokers = async () => {
  const brokers = await User.find({
    isBroker: true,
    isActive: true,
  })
    .select(
      `
      name
      position
      avatar
      bio
      city
      state
      creci
      specialties
      experience
      experienceYears
      instagram
      facebook
      linkedin
      website
      socials
      company
      slug
    `,
    )
    .sort({
      name: 1,
    })
    .lean()

  return brokers
}

// ==========================================
// Buscar dados completos do hotsite
// ==========================================

const getBrokerHotsite = async (slug) => {
  // ------------------------------------------
  // Buscar corretor
  // ------------------------------------------

  const broker = await User.findOne({
    slug,
    isBroker: true,
    isActive: true,
  })
    .select(
      `
      name
      position
      avatar
      phone
      email
      bio
      creci
      creciActive
      specialties
      experience
      experienceYears
      regions
      languages
      highlights
      socials
      instagram
      facebook
      linkedin
      website
      company
      settings
      slug
    `,
    )
    .lean()

  if (!broker) {
    throw new Error('Corretor não encontrado')
  }

  // ------------------------------------------
  // Buscar imóveis públicos
  // ------------------------------------------

  const properties = await Property.find({
    active: true,
    published: true,
    isDeleted: false,
  })
    .select(
      `
      name
      slug
      code
      type
      category
      purpose
      status
      constructionStatus
      condition
      featured
      exclusive
      bedrooms
      suites
      bathrooms
      parkingSpaces
      floor
      floors
      furnished
      acceptsPets
      dimensions
      prices
      location
      features
      highlights
      images
      coverImage
      virtualTour
      floorPlan
      acceptsFinancing
      acceptsFGTS
      createdAt
      updatedAt
    `,
    )
    .sort({
      featured: -1,
      createdAt: -1,
    })
    .lean()

  return {
    broker,
    properties,
    totalProperties: properties.length,
  }
}

// ==========================================
// Buscar corretor responsável pelo lead
// ==========================================

const getLeadBroker = async ({ brokerId, brokerSlug }) => {
  let broker = null

  // ------------------------------------------
  // Buscar por ID
  // ------------------------------------------

  if (brokerId) {
    broker = await User.findOne({
      _id: brokerId,
      isBroker: true,
      isActive: true,
    })
      .select(
        `
        _id
        name
        position
        avatar
        phone
        email
        slug
      `,
      )
      .lean()
  }

  // ------------------------------------------
  // Buscar por slug
  // ------------------------------------------

  if (!broker && brokerSlug) {
    broker = await User.findOne({
      slug: brokerSlug,
      isBroker: true,
      isActive: true,
    })
      .select(
        `
        _id
        name
        position
        avatar
        phone
        email
        slug
      `,
      )
      .lean()
  }

  // ------------------------------------------
  // Corretor não encontrado
  // ------------------------------------------

  if (!broker) {
    throw new Error('Corretor responsável não encontrado')
  }

  return broker
}

// ==========================================
// Export
// ==========================================

export default {
  getBrokerById,
  getBrokerBySlug,
  getPublicBroker,
  getPublicBrokerBySlug,

  // CRM
  getBrokers,

  // Público
  getPublicBrokers,

  // Hotsite
  getBrokerHotsite,

  // Leads
  getLeadBroker,
}
