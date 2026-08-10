import mongoose from 'mongoose'

import Visit from '../../models/Visit.js'
import Lead from '../../models/Lead.js'
import Property from '../../models/Property.js'

import { VISIT_STATUS } from '../../constants/visitStatus.js'

export const createVisitService = async ({ body, user }) => {
  // =====================================
  // Dados recebidos
  // =====================================

  const {
    lead,
    property,
    broker: brokerFromBody,
    scheduledAt,
    date,
    notes = '',
    address = '',
  } = body

  // =====================================
  // Usuário atual
  // =====================================

  const isAdmin = user?.isAdmin === true || user?.role === 'admin'

  /*
   * Corretor:
   * utiliza obrigatoriamente o próprio usuário.
   *
   * Admin:
   * pode informar o corretor responsável no body.
   */

  const broker = isAdmin ? brokerFromBody || user._id : user._id

  // Aceita os dois formatos
  const visitDateValue = scheduledAt || date

  // =====================================
  // Validações básicas
  // =====================================

  if (!lead) {
    throw new Error('Lead é obrigatório.')
  }

  if (!property) {
    throw new Error('Imóvel é obrigatório.')
  }

  if (!visitDateValue) {
    throw new Error('Data da visita é obrigatória.')
  }

  // =====================================
  // Validar IDs
  // =====================================

  if (!mongoose.Types.ObjectId.isValid(lead)) {
    throw new Error('Lead inválido.')
  }

  if (!mongoose.Types.ObjectId.isValid(property)) {
    throw new Error('Imóvel inválido.')
  }

  if (!mongoose.Types.ObjectId.isValid(broker)) {
    throw new Error('Corretor inválido.')
  }

  // =====================================
  // Converter data
  // =====================================

  const visitDate = new Date(visitDateValue)

  if (Number.isNaN(visitDate.getTime())) {
    throw new Error('Data da visita inválida.')
  }

  // =====================================
  // Não permitir data passada
  // =====================================

  if (visitDate < new Date()) {
    throw new Error('Não é permitido agendar visitas em datas passadas.')
  }

  // =====================================
  // Buscar Lead, Imóvel e Corretor
  // =====================================

  const [leadExists, propertyExists, brokerExists] = await Promise.all([
    Lead.findById(lead),
    Property.findById(property),
    mongoose.model('User').findById(broker),
  ])

  // =====================================
  // Validar Lead
  // =====================================

  if (!leadExists) {
    throw new Error('Lead não encontrado.')
  }

  // =====================================
  // Validar Imóvel
  // =====================================

  if (!propertyExists) {
    throw new Error('Imóvel não encontrado.')
  }

  // =====================================
  // Validar Corretor
  // =====================================

  if (!brokerExists) {
    throw new Error('Corretor não encontrado.')
  }

  if (brokerExists.isActive === false) {
    throw new Error('O corretor selecionado está inativo.')
  }

  // =====================================
  // Verificar conflito de horário
  // =====================================

  const existingVisit = await Visit.findOne({
    broker,
    date: visitDate,
    status: {
      $ne: VISIT_STATUS.CANCELLED,
    },
  }).lean()

  if (existingVisit) {
    throw new Error('O corretor já possui uma visita nesse horário.')
  }

  // =====================================
  // Criar visita
  // =====================================

  const visit = await Visit.create({
    lead,
    property,
    broker,
    date: visitDate,

    address: address?.trim() || propertyExists.address || '',

    notes: notes?.trim() || '',

    createdBy: user._id,

    status: VISIT_STATUS.SCHEDULED,
  })

  // =====================================
  // Atualizar Lead
  // =====================================

  leadExists.visitDate = visitDate
  leadExists.stage = 'visita_agendada'

  await leadExists.save()

  // =====================================
  // Retornar visita completa
  // =====================================

  return await Visit.findById(visit._id)
    .populate('lead', 'name phone email region stage status priority')
    .populate('property', 'name code address price images location')
    .populate('broker', 'name email avatar phone')
    .populate('createdBy', 'name email avatar')
}
