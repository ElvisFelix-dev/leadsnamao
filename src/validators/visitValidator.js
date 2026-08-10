import mongoose from 'mongoose'

export const validateObjectId = (id, field = 'ID') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error(`${field} inválido`)
    error.statusCode = 400
    throw error
  }
}

export const validateCreateVisit = (data = {}) => {
  const { lead, property, scheduledAt, address } = data

  if (!lead) {
    const error = new Error('Lead é obrigatório')
    error.statusCode = 400
    throw error
  }

  if (!property) {
    const error = new Error('Imóvel é obrigatório')
    error.statusCode = 400
    throw error
  }

  if (!scheduledAt) {
    const error = new Error('Data da visita é obrigatória')
    error.statusCode = 400
    throw error
  }

  if (!address || !address.trim()) {
    const error = new Error('Endereço é obrigatório')
    error.statusCode = 400
    throw error
  }

  validateObjectId(lead, 'Lead')
  validateObjectId(property, 'Imóvel')

  const date = new Date(scheduledAt)

  if (Number.isNaN(date.getTime())) {
    const error = new Error('Data da visita inválida')
    error.statusCode = 400
    throw error
  }
}

export const validateUpdateVisit = (data = {}) => {
  if (data.lead) {
    validateObjectId(data.lead, 'Lead')
  }

  if (data.property) {
    validateObjectId(data.property, 'Imóvel')
  }

  if (data.assignedTo) {
    validateObjectId(data.assignedTo, 'Corretor')
  }

  if (data.scheduledAt) {
    const date = new Date(data.scheduledAt)

    if (Number.isNaN(date.getTime())) {
      const error = new Error('Data da visita inválida')
      error.statusCode = 400
      throw error
    }
  }

  if (data.address !== undefined && !data.address.trim()) {
    const error = new Error('Endereço não pode ficar vazio')
    error.statusCode = 400
    throw error
  }
}
