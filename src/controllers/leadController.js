import Lead from '../models/Lead.js'

// Criar novo lead
export const createLead = async (req, res) => {
  try {
    const { name, email, phone, property, notes, region, assignedTo } = req.body

    const lead = await Lead.create({
      name,
      email,
      phone,
      property,
      region,
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

export const publicCreateLead = async (req, res) => {
  try {
    const { name, email, phone, property, notes, region, assignedTo } = req.body

    const lead = await Lead.create({
      name,
      email,
      phone,
      property,
      region,
      notes,
      createdBy: null, // null se vier do hotsite
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

    // Admin vê todos, corretor só os leads criados ou atribuídos a ele
    if (!req.user.isAdmin) {
      filter.$or = [{ createdBy: req.user._id }, { assignedTo: req.user._id }]
    }

    // Busca leads e popula referências
    const leads = await Lead.find(filter)
      .populate('property', 'name price address')
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .lean()

    // Adiciona link do WhatsApp em cada lead
    const leadsWithLinks = leads.map((lead) => ({
      ...lead,
      whatsappLink: lead.phone
        ? `https://wa.me/${lead.phone.replace(/\D/g, '')}?text=Olá%20${encodeURIComponent(
            lead.name,
          )},%20vi%20seu%20interesse%20no%20imóvel%20${encodeURIComponent(
            lead.property?.name || '',
          )}`
        : null,
    }))

    return res.json(leadsWithLinks) // 👉 retorna array direto
  } catch (error) {
    console.error('❌ Erro ao listar leads:', error)
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

    // Admin pode tudo
    if (!req.user.isAdmin) {
      // Corretores podem atualizar somente leads atribuídos a eles
      if (
        !lead.assignedTo ||
        lead.assignedTo.toString() !== req.user._id.toString()
      ) {
        return res
          .status(403)
          .json({ message: 'Sem permissão para atualizar este lead' })
      }
    }

    const { name, email, phone, status, notes } = req.body

    // Atualiza apenas os campos enviados
    if (name !== undefined) lead.name = name
    if (email !== undefined) lead.email = email
    if (phone !== undefined) lead.phone = phone
    if (status !== undefined) lead.status = status
    if (notes !== undefined) lead.notes = notes

    await lead.save()
    res.json(lead)
  } catch (error) {
    console.error('❌ Erro ao atualizar lead:', error)
    res
      .status(500)
      .json({ message: 'Erro ao atualizar lead', error: error.message })
  }
}

/// Repassar leads para corretores (em lote)
export const assignLeads = async (req, res) => {
  try {
    const { leadIds, userId } = req.body

    console.log('📥 Recebido:', { leadIds, userId })
    console.log('👤 Usuário logado:', req.user)

    if (!req.user || !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: 'Somente admin pode atribuir leads' })
    }

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res
        .status(400)
        .json({ message: 'leadIds deve ser um array não vazio' })
    }

    if (!userId) {
      return res.status(400).json({ message: 'userId é obrigatório' })
    }

    const result = await Lead.updateMany(
      { _id: { $in: leadIds } },
      { $set: { assignedTo: userId } },
    )

    return res.json({
      message: 'Leads atribuídos com sucesso',
      modifiedCount: result.modifiedCount,
    })
  } catch (error) {
    console.error('❌ Erro no assignLeads:', error)
    return res
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
