import Lead from '../models/Lead.js'

// Criar novo lead
export const createLead = async (req, res) => {
  try {
    const { name, email, phone, property, notes, assignedTo } = req.body

    const lead = await Lead.create({
      name,
      email,
      phone,
      property,
      notes,
      createdBy: req.user?._id || null, // null se vier do hotsite
      assignedTo: assignedTo || null,
    })

    res.status(201).json(lead)
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao criar lead', error: error.message })
  }
}

// Listar leads (admin vê todos, corretor só vê os dele)
export const getLeads = async (req, res) => {
  try {
    const filter = {}

    // Admin vê todos, corretor só os leads atribuídos ou criados por ele
    if (!req.user.isAdmin) {
      filter.createdBy = req.user._id
    }

    // Busca leads e popula referências
    const leads = await Lead.find(filter)
      .populate('property', 'name price address')
      .populate('createdBy', 'name email')
      .lean() // transforma em objeto plano para adicionar campos

    // Adiciona link do WhatsApp
    const leadsWithLinks = leads.map((lead) => ({
      ...lead,
      whatsappLink: `https://wa.me/${lead.phone.replace(/\D/g, '')}?text=Olá%20${encodeURIComponent(
        lead.name,
      )},%20vi%20seu%20interesse%20no%20imóvel%20${encodeURIComponent(
        lead.property?.name || '',
      )}`,
    }))

    res.json(leadsWithLinks)
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao listar leads', error: error.message })
  }
}

// Atualizar lead
export const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)

    if (!lead) return res.status(404).json({ message: 'Lead não encontrado' })

    // Permite atualizar somente se for admin ou o dono do lead
    if (
      !req.user.isAdmin &&
      lead.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Sem permissão' })
    }

    const { name, email, phone, status, notes } = req.body

    lead.name = name || lead.name
    lead.email = email || lead.email
    lead.phone = phone || lead.phone
    lead.status = status || lead.status
    lead.notes = notes || lead.notes

    await lead.save()
    res.json(lead)
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao atualizar lead', error: error.message })
  }
}

// Repassar leads para corretores (em lote)
export const assignLeads = async (req, res) => {
  try {
    const { leadIds, userId } = req.body

    if (!req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: 'Somente admin pode atribuir leads' })
    }

    if (!leadIds || !userId) {
      return res
        .status(400)
        .json({ message: 'leadIds e userId são obrigatórios' })
    }

    const result = await Lead.updateMany(
      { _id: { $in: leadIds } },
      { $set: { assignedTo: userId } },
    )

    res.json({
      message: `Leads atribuídos com sucesso`,
      modifiedCount: result.modifiedCount,
    })
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao atribuir leads', error: error.message })
  }
}

// Deletar lead
export const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)

    if (!lead) return res.status(404).json({ message: 'Lead não encontrado' })

    if (
      !req.user.isAdmin &&
      lead.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Sem permissão' })
    }

    await lead.deleteOne()
    res.json({ message: 'Lead removido com sucesso' })
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao deletar lead', error: error.message })
  }
}
