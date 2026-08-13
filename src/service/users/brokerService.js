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
//
// Essa função será muito útil para o hotsite.
//
// Exemplo:
//
// /corretor/joao-silva
//
// slug:
// joao-silva
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
  //
  // IMPORTANTE:
  //
  // O hotsite mostra o catálogo público
  // da imobiliária.
  //
  // Não filtramos:
  //
  // broker
  // captation.broker
  //
  // Dessa forma, qualquer imóvel publicado
  // pode aparecer no hotsite.
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

  // ------------------------------------------
  // Retorno
  // ------------------------------------------

  return {
    broker,
    properties,
    totalProperties: properties.length,
  }
}

// ==========================================
// Buscar corretor responsável pelo lead
// ==========================================
//
// Essa função centraliza a regra de encontrar
// o corretor que deverá receber um lead.
//
// Atualmente aceitamos:
// - brokerId
// - brokerSlug
//
// Isso deixa o backend preparado para o
// formulário público do imóvel.
//
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
  // Se não encontrou, buscar por slug
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
  getPublicBrokers,
  getBrokerHotsite,
  getLeadBroker,
}
