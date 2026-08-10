import mongoose from 'mongoose'

import Visit from '../../models/Visit.js'
import Lead from '../../models/Lead.js'

export const confirmVisitService = async ({ id, user }) => {
  // ======================================
  // Validação
  // ======================================

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Visita inválida.')
  }

  // ======================================
  // Buscar visita
  // ======================================

  const visit = await Visit.findById(id)

  if (!visit) {
    throw new Error('Visita não encontrada.')
  }

  console.log('========== CONFIRM VISIT ==========')
  console.log('ID:', visit._id)
  console.log('STATUS:', visit.status)
  console.log('BROKER:', visit.broker)
  console.log('LEAD:', visit.lead)
  console.log('DATE:', visit.date)
  console.log('===================================')

  // ======================================
  // Administrador
  // ======================================

  const isAdmin = user?.role === 'admin' || user?.isAdmin === true

  // ======================================
  // Permissão
  // ======================================

  if (!isAdmin) {
    if (!visit.broker) {
      throw new Error('Esta visita não possui um corretor responsável.')
    }

    if (visit.broker.toString() !== user._id.toString()) {
      throw new Error('Você não possui permissão para confirmar esta visita.')
    }
  }

  // ======================================
  // Status atual
  // ======================================

  if (visit.status === 'concluida') {
    throw new Error('A visita já foi concluída.')
  }

  if (visit.status === 'realizada') {
    throw new Error('A visita já foi concluída.')
  }

  if (visit.status === 'completed') {
    throw new Error('A visita já foi concluída.')
  }

  if (visit.status === 'cancelada') {
    throw new Error('A visita foi cancelada.')
  }

  if (visit.status === 'confirmada') {
    throw new Error('A visita já está confirmada.')
  }

  // ======================================
  // Confirmar visita
  // ======================================

  visit.status = 'confirmada'

  visit.confirmedAt = new Date()

  await visit.save()

  // ======================================
  // Atualizar Lead
  // ======================================

  if (visit.lead) {
    await Lead.updateOne(
      {
        _id: visit.lead,
      },
      {
        $set: {
          lastContactAt: new Date(),
        },
      },
    )
  }

  // ======================================
  // Retorno
  // ======================================

  return await Visit.findById(visit._id)
    .populate(
      'lead',
      `
        name
        phone
        email
        region
        stage
        status
        priority
      `,
    )
    .populate(
      'property',
      `
        name
        code
        address
        images
      `,
    )
    .populate(
      'broker',
      `
        name
        email
        avatar
        phone
      `,
    )
    .populate(
      'createdBy',
      `
        name
        email
        avatar
      `,
    )
}
