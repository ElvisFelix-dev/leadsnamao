import mongoose from 'mongoose'

import Visit from '../../models/Visit.js'

export const getVisitByIdService = async ({ id, user }) => {
  // ======================================
  // VALIDAÇÃO DO ID
  // ======================================

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Visita inválida.')
  }

  // ======================================
  // IDENTIFICAR ADMIN
  // ======================================

  const isAdmin = user?.role === 'admin' || user?.isAdmin === true

  // ======================================
  // BUSCAR VISITA
  // ======================================

  const visit = await Visit.findById(id)
    // ======================================
    // LEAD
    // ======================================
    .populate({
      path: 'lead',
      select: `
        name
        phone
        email
        region
        stage
        status
        priority
        source
        sourceType
        notes
      `,
    })

    // ======================================
    // IMÓVEL
    // ======================================
    .populate({
      path: 'property',
      select: `
        name
        code
        address
        price
        images
        coverImage
        type
        category
        purpose
        bedrooms
        bathrooms
        suites
        parkingSpaces
        location
        status
        active
        published
      `,
    })

    // ======================================
    // CORRETOR
    // ======================================
    .populate({
      path: 'broker',
      select: `
        name
        email
        phone
        avatar
        creci
        position
      `,
    })

    // ======================================
    // CRIADO POR
    // ======================================
    .populate({
      path: 'createdBy',
      select: `
        name
        email
        avatar
        role
        isAdmin
      `,
    })

  // ======================================
  // VISITA NÃO ENCONTRADA
  // ======================================

  if (!visit) {
    throw new Error('Visita não encontrada.')
  }

  // ======================================
  // PERMISSÃO
  // ======================================

  if (!isAdmin) {
    const brokerId = visit.broker?._id?.toString()
    const userId = user?._id?.toString()

    if (!brokerId || brokerId !== userId) {
      throw new Error('Você não possui permissão para visualizar esta visita.')
    }
  }

  // ======================================
  // NORMALIZAÇÃO DO ENDEREÇO
  // ======================================

  const property = visit.property

  let propertyAddress = ''

  if (property?.location) {
    const {
      street,
      number,
      complement,
      district,
      neighborhood,
      city,
      state,
      zipCode,
    } = property.location

    propertyAddress = [
      street,
      number,
      complement,
      district || neighborhood,
      city,
      state,
      zipCode,
    ]
      .filter(Boolean)
      .join(', ')
  }

  // ======================================
  // IMAGEM PRINCIPAL
  // ======================================

  let propertyImage = property?.coverImage || ''

  if (!propertyImage && property?.images?.length) {
    const cover = property.images.find((image) => image?.isCover === true)

    propertyImage = cover?.url || property.images[0]?.url || ''
  }

  // ======================================
  // RETORNO
  // ======================================

  return {
    ...visit.toObject(),

    // ====================================
    // DATA PADRONIZADA
    // ====================================

    scheduledAt: visit.date,

    // ====================================
    // IMÓVEL
    // ====================================

    propertyInfo: property
      ? {
          id: property._id,
          name: property.name,
          code: property.code || '',
          type: property.type || '',
          category: property.category || '',
          purpose: property.purpose || '',
          bedrooms: property.bedrooms || 0,
          bathrooms: property.bathrooms || 0,
          suites: property.suites || 0,
          parkingSpaces: property.parkingSpaces || 0,
          image: propertyImage,
          address: propertyAddress || property.address || '',
          price: property.price || null,
          status: property.status || '',
          active: property.active,
          published: property.published,
        }
      : null,

    // ====================================
    // LEAD
    // ====================================

    leadInfo: visit.lead
      ? {
          id: visit.lead._id,
          name: visit.lead.name,
          phone: visit.lead.phone || '',
          email: visit.lead.email || '',
          region: visit.lead.region || '',
          stage: visit.lead.stage || '',
          status: visit.lead.status || '',
          priority: visit.lead.priority || '',
          source: visit.lead.source || '',
          sourceType: visit.lead.sourceType || '',
          notes: visit.lead.notes || '',
        }
      : null,

    // ====================================
    // CORRETOR
    // ====================================

    brokerInfo: visit.broker
      ? {
          id: visit.broker._id,
          name: visit.broker.name,
          email: visit.broker.email || '',
          phone: visit.broker.phone || '',
          avatar: visit.broker.avatar || '',
          creci: visit.broker.creci || '',
          position: visit.broker.position || '',
        }
      : null,

    // ====================================
    // CRIADO POR
    // ====================================

    createdByInfo: visit.createdBy
      ? {
          id: visit.createdBy._id,
          name: visit.createdBy.name,
          email: visit.createdBy.email || '',
          avatar: visit.createdBy.avatar || '',
          role: visit.createdBy.role || '',
          isAdmin: visit.createdBy.isAdmin === true,
        }
      : null,

    // ====================================
    // ADMIN
    // ====================================

    permissions: {
      isAdmin,
      canEdit: isAdmin,
      canDelete: isAdmin,
      canManage: isAdmin,
    },
  }
}
