import mongoose from 'mongoose'

import Visit from '../../models/Visit.js'
import Lead from '../../models/Lead.js'

export const deleteVisitService = async ({ id, user }) => {
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

  // ======================================
  // Verificar administrador
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
      throw new Error('Você não possui permissão para excluir esta visita.')
    }
  }

  // ======================================
  // Não permitir excluir visita concluída
  // ======================================

  if (
    visit.status === 'concluida' ||
    visit.status === 'realizada' ||
    visit.status === 'completed'
  ) {
    throw new Error('Não é permitido excluir uma visita concluída.')
  }

  // ======================================
  // Buscar Lead
  // ======================================

  const lead = await Lead.findById(visit.lead)

  // ======================================
  // Atualizar Lead
  // ======================================

  if (lead) {
    const update = {
      $set: {
        lastContactAt: new Date(),
      },
    }

    // ====================================
    // Verificar se a visita é a visita
    // atualmente vinculada ao Lead
    // ====================================

    const leadVisitDate = lead.visitDate
      ? new Date(lead.visitDate).getTime()
      : null

    const visitDate = visit.date ? new Date(visit.date).getTime() : null

    if (leadVisitDate && visitDate && leadVisitDate === visitDate) {
      // Remove visitDate sem passar
      // pela validação completa do Lead.
      update.$unset = {
        visitDate: '',
      }

      // Se o Lead estava aguardando uma visita,
      // volta para qualificado.
      if (lead.stage === 'visita_agendada') {
        update.$set.stage = 'qualificado'
      }
    }

    // ====================================
    // Atualizar somente os campos necessários
    // ====================================

    await Lead.updateOne({ _id: lead._id }, update)
  }

  // ======================================
  // Excluir visita
  // ======================================

  await visit.deleteOne()

  // ======================================
  // Retorno
  // ======================================

  return {
    success: true,
    message: 'Visita excluída com sucesso.',
  }
}
