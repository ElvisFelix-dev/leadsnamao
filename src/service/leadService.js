import Lead from '../models/Lead.js'

// Função central para salvar lead normalizado
export const createLeadFromSource = async (data, source = 'manual') => {
  const { name, email, phone, property, region, notes, assignedTo } = data

  return await Lead.create({
    name,
    email,
    phone,
    property: property || null,
    region: region || 'central',
    notes: notes || '',
    createdBy: data.createdBy || null,
    assignedTo: assignedTo || null,
    source, // 👈 identifica origem do lead
  })
}
