import fs from 'fs'
import csv from 'csv-parser'

import Lead from '../models/Lead.js'
import { createLeadFromSource } from '../service/leadService.js'

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

// Receber leads externos (Meta, OLX, Zap)
export const publicCreateLeadFromWebhook = async (req, res) => {
  const source = req.params.source // 'meta', 'olx', 'zap', etc.

  // === Para Meta: validação do webhook ===
  if (req.method === 'GET') {
    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ Webhook do Meta verificado com sucesso!')
        return res.status(200).send(challenge)
      } else {
        console.log('❌ Token de verificação inválido')
        return res.sendStatus(403)
      }
    }
  }

  // === POST: recebendo leads do Meta ===
  if (req.method === 'POST') {
    try {
      const body = req.body

      // Segurança: garantir que seja do tipo leadgen
      if (!body.entry) return res.sendStatus(400)

      const leadsToCreate = []

      body.entry.forEach((entry) => {
        entry.changes.forEach((change) => {
          if (change.field === 'leadgen') {
            const value = change.value
            const fieldData = value.field_data || []

            // Mapeando os campos para o modelo Lead
            const leadData = {
              name: fieldData.find((f) => f.name === 'name')?.values?.[0] || '',
              email:
                fieldData.find((f) => f.name === 'email')?.values?.[0] || '',
              phone:
                fieldData.find((f) => f.name === 'phone_number')?.values?.[0] ||
                '',
              createdBy: null, // vem do Facebook, então sem usuário interno
              assignedTo: null, // opcional, você pode atribuir depois
              notes: `Lead importado via ${source}`,
            }

            leadsToCreate.push(leadData)
          }
        })
      })

      // Salva todos os leads
      const createdLeads = await Promise.all(
        leadsToCreate.map((lead) => Lead.create(lead)),
      )

      console.log(`✅ ${createdLeads.length} leads importados via ${source}`)
      return res
        .status(200)
        .json({ message: 'Leads importados', total: createdLeads.length })
    } catch (err) {
      console.error('❌ Erro ao receber leads do webhook:', err)
      return res
        .status(500)
        .json({ message: 'Erro ao processar leads', error: err.message })
    }
  }
}

export const importLeadsFromCSV = async (req, res) => {
  try {
    const results = []

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', async () => {
        const createdLeads = await Promise.all(
          results.map((lead) => createLeadFromSource(lead, 'csv')),
        )

        res.json({
          message: 'Leads importados com sucesso',
          total: createdLeads.length,
        })
      })
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao importar CSV', error: error.message })
  }
}
