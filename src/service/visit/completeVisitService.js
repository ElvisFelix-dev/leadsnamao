import mongoose from 'mongoose'

import Visit from '../../models/Visit.js'
import Lead from '../../models/Lead.js'

export const completeVisitService = async ({ id, body = {}, user }) => {
  const { result = '', notes = '' } = body

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
      throw new Error('Você não possui acesso a esta visita.')
    }
  }

  // ======================================
  // REGRAS
  // ======================================

  if (visit.status === 'concluida') {
    throw new Error('Esta visita já foi finalizada.')
  }

  if (visit.status === 'cancelada') {
    throw new Error('Não é possível concluir uma visita cancelada.')
  }

  // ======================================
  // ATUALIZAR VISITA
  // ======================================

  visit.status = 'realizada'

  visit.finishedAt = new Date()

  // Esses campos precisam existir no Visit.js
  // para serem persistidos no MongoDB.
  visit.result = result
  visit.notes = notes

  await visit.save()

  // ======================================
  // ATUALIZAR LEAD
  // ======================================

  if (visit.lead) {
    const lead = await Lead.findById(visit.lead)

    if (lead) {
      lead.lastContactAt = new Date()

      // ==================================
      // RESULTADO: INTERESSADO
      // ==================================

      switch (result) {
        case 'interessado':
          lead.stage = 'proposta_enviada'

          if ('proposalDate' in lead) {
            lead.proposalDate = new Date()
          }

          break

        // ==================================
        // RESULTADO: AGUARDANDO
        // ==================================

        case 'aguardando':
          lead.stage = 'negociacao'
          break

        // ==================================
        // RESULTADO: DESISTIU
        // ==================================

        case 'desistiu':
          lead.stage = 'perdido'

          // Seu Lead utiliza status próprios.
          // Mantendo o valor atual utilizado
          // pelo seu service.
          lead.status = 'lost'

          break

        // ==================================
        // RESULTADO: REAGENDAR
        // ==================================

        case 'reagendar':
          lead.stage = 'visita_agendada'
          break

        // ==================================
        // SEM RESULTADO
        // ==================================

        default:
          break
      }

      await lead.save()
    }
  }

  // ======================================
  // RETORNO COMPLETO
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
        notes
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
