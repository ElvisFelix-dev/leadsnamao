import mongoose from 'mongoose'

import Visit from '../../models/Visit.js'
import Lead from '../../models/Lead.js'

export const cancelVisitService = async ({ id, body = {}, user }) => {
  const { reason = '' } = body

  // ======================================
  // VALIDAÇÃO
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

  if (!visit) {
    throw new Error('Visita não encontrada.')
  }

  // ======================================
  // PERMISSÃO
  // ======================================

  if (!isAdmin) {
    const brokerId = visit.broker?.toString()
    const userId = user?._id?.toString()

    if (!brokerId || brokerId !== userId) {
      throw new Error('Você não possui permissão para cancelar esta visita.')
    }
  }

  // ======================================
  // REGRAS
  // ======================================

  // Seu Visit utiliza "concluida"
  if (visit.status === 'concluida') {
    throw new Error('Não é possível cancelar uma visita já concluída.')
  }

  if (visit.status === 'cancelada') {
    throw new Error('Esta visita já foi cancelada.')
  }

  // ======================================
  // ATUALIZAR VISITA
  // ======================================

  visit.status = 'cancelada'

  // Esses campos somente serão persistidos
  // se existirem no schema.
  if ('cancelReason' in visit) {
    visit.cancelReason = reason
  }

  if ('cancelledAt' in visit) {
    visit.cancelledAt = new Date()
  }

  await visit.save()

  // ======================================
  // ATUALIZAR LEAD
  // ======================================

  if (visit.lead) {
    const lead = await Lead.findById(visit.lead)

    if (lead) {
      lead.stage = 'qualificado'

      // Somente atualiza se o campo existir
      // no documento/schema.
      if ('visitDate' in lead) {
        lead.visitDate = null
      }

      if ('lastContactAt' in lead) {
        lead.lastContactAt = new Date()
      }

      await lead.save()
    }
  }

  // ======================================
  // RETORNO
  // ======================================

  const updatedVisit = await Visit.findById(visit._id)
    // ====================================
    // LEAD
    // ====================================
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
      `,
    })

    // ====================================
    // IMÓVEL
    // ====================================
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
      `,
    })

    // ====================================
    // CORRETOR
    // ====================================
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

    // ====================================
    // CRIADO POR
    // ====================================
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

  return updatedVisit
}
