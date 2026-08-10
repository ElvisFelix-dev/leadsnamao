import mongoose from 'mongoose'

import Visit from '../../models/Visit.js'
import Lead from '../../models/Lead.js'
import Property from '../../models/Property.js'

export const updateVisitService = async ({ id, body = {}, user }) => {
  // ======================================
  // Dados recebidos
  // ======================================

  const { propertyId, property, scheduledAt, date, notes, status, address } =
    body

  // Aceita propertyId ou property
  const newPropertyId = propertyId || property

  // Aceita scheduledAt ou date
  const newDate = scheduledAt || date

  // ======================================
  // Validação do ID
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
      throw new Error('Você não possui permissão para editar esta visita.')
    }
  }

  // ======================================
  // Não permitir editar visita concluída
  // ======================================

  if (
    !isAdmin &&
    (visit.status === 'concluida' ||
      visit.status === 'realizada' ||
      visit.status === 'completed')
  ) {
    throw new Error('Não é possível editar uma visita concluída.')
  }

  // ======================================
  // Não permitir editar visita cancelada
  // ======================================

  if (!isAdmin && visit.status === 'cancelada') {
    throw new Error('Não é possível editar uma visita cancelada.')
  }

  // ======================================
  // Alterar imóvel
  // ======================================

  if (newPropertyId !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(newPropertyId)) {
      throw new Error('Imóvel inválido.')
    }

    const propertyExists = await Property.findById(newPropertyId)

    if (!propertyExists) {
      throw new Error('Imóvel não encontrado.')
    }

    visit.property = newPropertyId

    // Se não foi informado um endereço manual,
    // utiliza o endereço do imóvel.
    if (address === undefined) {
      visit.address = propertyExists.address || ''
    }
  }

  // ======================================
  // Alterar data
  // ======================================

  if (newDate !== undefined) {
    const parsedDate = new Date(newDate)

    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error('Data da visita inválida.')
    }

    // ====================================
    // Verificar conflito de horário
    // ====================================

    const conflictQuery = {
      _id: {
        $ne: visit._id,
      },

      broker: visit.broker,

      date: parsedDate,

      status: {
        $nin: ['cancelada', 'concluida', 'realizada', 'completed'],
      },
    }

    const conflictingVisit = await Visit.findOne(conflictQuery)

    if (conflictingVisit) {
      throw new Error('O corretor já possui outra visita nesse horário.')
    }

    visit.date = parsedDate

    // ====================================
    // Atualizar data da visita no Lead
    // ====================================

    await Lead.updateOne(
      {
        _id: visit.lead,
      },
      {
        $set: {
          visitDate: parsedDate,
          lastContactAt: new Date(),
        },
      },
    )
  }

  // ======================================
  // Alterar observações
  // ======================================

  if (notes !== undefined) {
    visit.notes = notes
  }

  // ======================================
  // Alterar endereço
  // ======================================

  if (address !== undefined) {
    visit.address = address
  }

  // ======================================
  // Alterar status
  // ======================================

  if (status !== undefined) {
    const allowedStatuses = ['agendada', 'confirmada', 'concluida', 'cancelada']

    if (!allowedStatuses.includes(status)) {
      throw new Error('Status de visita inválido.')
    }

    // Não permitir alterar manualmente
    // para concluída/cancelada através
    // da edição comum.
    if (status === 'concluida' || status === 'cancelada') {
      throw new Error(
        'Utilize a ação específica para concluir ou cancelar a visita.',
      )
    }

    visit.status = status
  }

  // ======================================
  // Salvar
  // ======================================

  await visit.save()

  // ======================================
  // Retornar visita completa
  // ======================================

  return await Visit.findById(visit._id)
    .populate('lead', 'name phone email region stage status priority')
    .populate('property', 'name code address images')
    .populate('broker', 'name email avatar phone')
    .populate('createdBy', 'name email avatar')
}
