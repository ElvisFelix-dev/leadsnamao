import fs from 'fs'
import csv from 'csv-parser'
<<<<<<< HEAD
import Lead from '../models/Lead.js'

import * as leadService from '../service/leadService.js'
import { getUserById } from '../service/users/userService.js'

import { sendEmail } from '../service/email/sendEmails.js'

import { leadAssignedTemplate } from '../utils/emailTemplates.js'

// ======================================================
// CREATE
// ======================================================

export const createLead = async (req, res) => {
  try {
    const lead = await leadService.createLead({
      ...req.body,
      createdBy: req.user?._id || null,
    })

    return res.status(201).json(lead)
  } catch (error) {
    console.error('❌ Erro ao criar lead:', error)

    return res.status(500).json({
      message: 'Erro ao criar lead.',
      error: error.message,
    })
=======

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
>>>>>>> 32e8de98b92a233f54261a3612474c5a61832f64
  }
}

export const publicCreateLead = async (req, res) => {
  try {
<<<<<<< HEAD
    const lead = await leadService.publicCreateLead(req.body)

    return res.status(201).json(lead)
  } catch (error) {
    console.error('❌ Erro ao criar lead público:', error)

    return res.status(500).json({
      message: 'Erro ao criar lead.',
      error: error.message,
    })
  }
}

// ======================================================
// READ
// ======================================================

export const getLeads = async (req, res) => {
  try {
    const leads = await leadService.getLeads({
      userId: req.user._id,
      isAdmin: req.user.isAdmin,

      filters: {
        status: req.query.status,
        stage: req.query.stage,
        priority: req.query.priority,
        region: req.query.region,
        source: req.query.source,
      },
    })

    return res.json(leads)
  } catch (error) {
    console.error('❌ Erro ao listar leads:', error)

    return res.status(500).json({
      message: 'Erro ao listar leads.',
      error: error.message,
    })
  }
}

export const getLeadById = async (req, res) => {
  try {
    const lead = await leadService.getLeadById(req.params.id)

    return res.json(lead)
  } catch (error) {
    console.error('❌ Erro ao buscar lead:', error)

    return res.status(500).json({
      message: 'Erro ao buscar lead.',
      error: error.message,
    })
  }
}

// ======================================================
// UPDATE
// ======================================================

export const updateLead = async (req, res) => {
  try {
    const lead = await leadService.updateLead({
      leadId: req.params.id,
      userId: req.user._id,
      isAdmin: req.user.isAdmin,
      data: req.body,
    })

    console.log('UPDATE STAGE:', {
      leadId: req.params.id,
      body: req.body,
    })

    return res.json(lead)
  } catch (error) {
    console.error('❌ Erro ao atualizar lead:', error)
    console.error('ERRO AO ALTERAR STAGE:', error)

    return res.status(500).json({
      message: 'Erro ao atualizar lead.',
      error: error.message,
    })
  }
}

=======
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

/// Repassar leads para corretores (em lote ou único)
>>>>>>> 32e8de98b92a233f54261a3612474c5a61832f64
export const assignLeads = async (req, res) => {
  try {
    let { leadIds, leadId, userId } = req.body

<<<<<<< HEAD
    /*
    ======================================
    NORMALIZA LEAD ÚNICO
    ======================================
    */

=======
    console.log('📥 Body recebido:', req.body)
    console.log('👤 Usuário logado:', req.user)

    if (!req.user || !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: 'Somente admin pode atribuir leads' })
    }

    // Se veio leadId único, transforma em array
>>>>>>> 32e8de98b92a233f54261a3612474c5a61832f64
    if (leadId) {
      leadIds = [leadId]
    }

<<<<<<< HEAD
    /*
    ======================================
    VALIDAÇÃO
    ======================================
    */

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        message: 'Informe um ou mais leads.',
=======
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        message: 'leadIds deve ser um array não vazio ou leadId fornecido',
>>>>>>> 32e8de98b92a233f54261a3612474c5a61832f64
      })
    }

    if (!userId) {
<<<<<<< HEAD
      return res.status(400).json({
        message: 'userId é obrigatório.',
      })
    }

    /*
    ======================================
    BUSCA CORRETOR
    ======================================
    */

    const broker = await getUserById(userId)

    if (!broker) {
      return res.status(404).json({
        message: 'Corretor não encontrado.',
      })
    }

    /*
    ======================================
    BUSCA LEADS ANTES DA ALTERAÇÃO
    ======================================
    */

    const leads = await Lead.find({
      _id: {
        $in: leadIds,
      },
    })

    if (!leads.length) {
      return res.status(404).json({
        message: 'Nenhum lead encontrado.',
      })
    }

    /*
    ======================================
    ATRIBUI LEADS
    ======================================
    */

    const result = await leadService.assignLeads({
      leadIds,
      userId,
    })

    /*
    ======================================
    ENVIO DE EMAIL
    ======================================
    */

    let emailSent = false

    try {
      for (const lead of leads) {
        await sendEmail({
          to: broker.email,

          subject: '🎯 Novo lead atribuído - LeadsnaMão',

          htmlContent: leadAssignedTemplate({
            brokerName: broker.name,

            brokerPosition: broker.position || 'Corretor de imóveis',

            leadName: lead.name,

            leadEmail: lead.email,

            leadPhone: lead.phone,

            leadRegion: lead.region,

            leadSource: lead.source,

            leadId: lead._id,
          }),
        })
      }

      emailSent = true
    } catch (emailError) {
      console.error(
        '⚠️ Erro ao enviar email para corretor:',
        emailError.message,
      )
    }

    /*
    ======================================
    RESPOSTA
    ======================================
    */

    return res.json({
      success: true,

      message: 'Leads atribuídos com sucesso.',

      broker: {
        id: broker._id,

        name: broker.name,

        email: broker.email,

        position: broker.position || null,
      },

      totalLeads: leads.length,

      emailSent,

      ...result,
    })
  } catch (error) {
    console.error('❌ Erro ao atribuir leads:', error)

    return res.status(500).json({
      message: 'Erro ao atribuir leads.',

      error: error.message,
    })
  }
}
// ======================================================
// DELETE
// ======================================================

export const deleteLead = async (req, res) => {
  try {
    await leadService.deleteLead({
      leadId: req.params.id,
      userId: req.user._id,
      isAdmin: req.user.isAdmin,
    })

    return res.json({
      success: true,
      message: 'Lead removido com sucesso.',
    })
  } catch (error) {
    console.error('❌ Erro ao remover lead:', error)

    return res.status(500).json({
      message: 'Erro ao remover lead.',
      error: error.message,
    })
  }
}

// ======================================================
// PIPELINE
// ======================================================

export const changeLeadStage = async (req, res) => {
  try {
    const { stage } = req.body

    const lead = await leadService.changeLeadStage({
      leadId: req.params.id,
      stage,
      userId: req.user._id,
    })

    return res.json({
      success: true,
      message: 'Etapa do pipeline atualizada com sucesso.',
      data: lead,
    })
  } catch (error) {
    console.error('❌ Erro ao alterar etapa do lead:', error)

    return res.status(500).json({
      message: 'Erro ao alterar etapa do pipeline.',
      error: error.message,
    })
  }
}

// ======================================================
// PIPELINE
// ======================================================

export const getPipeline = async (req, res) => {
  try {
    const pipeline = await leadService.getPipeline({
      assignedTo: req.query.assignedTo,
      createdBy: req.query.createdBy,
      region: req.query.region,
      source: req.query.source,
      status: req.query.status,
    })

    return res.json({
      success: true,
      data: pipeline,
    })
  } catch (error) {
    console.error('❌ Erro ao carregar pipeline:', error)

    return res.status(500).json({
      message: 'Erro ao carregar pipeline.',
      error: error.message,
    })
  }
}

// ======================================================
// DASHBOARD
// ======================================================

export const getPipelineMetrics = async (req, res) => {
  try {
    const metrics = await leadService.getPipelineMetrics({
      assignedTo: req.query.assignedTo,
      createdBy: req.query.createdBy,
      region: req.query.region,
      source: req.query.source,
      status: req.query.status,
    })

    return res.json({
      success: true,
      data: metrics,
    })
  } catch (error) {
    console.error('❌ Erro ao carregar métricas:', error)

    return res.status(500).json({
      message: 'Erro ao carregar métricas.',
      error: error.message,
    })
  }
}

// ======================================================
// WEBHOOKS
// ======================================================

export const publicCreateLeadFromWebhook = async (req, res) => {
  try {
    const source = req.params.source

    // Validação do webhook do Meta
    if (req.method === 'GET') {
      const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN

      const mode = req.query['hub.mode']
      const token = req.query['hub.verify_token']
      const challenge = req.query['hub.challenge']

      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ Webhook Meta validado.')

        return res.status(200).send(challenge)
      }

      return res.sendStatus(403)
    }

    // Recebimento dos leads

    const body = req.body

    const leads = []

    // Meta Lead Ads

    if (body.entry) {
      body.entry.forEach((entry) => {
        entry.changes.forEach((change) => {
          if (change.field !== 'leadgen') return

          const fields = change.value.field_data || []

          leads.push({
            name: fields.find((f) => f.name === 'name')?.values?.[0] || '',

            email: fields.find((f) => f.name === 'email')?.values?.[0] || '',

            phone:
              fields.find((f) => f.name === 'phone_number')?.values?.[0] || '',

            region: fields.find((f) => f.name === 'region')?.values?.[0] || '',

            notes: `Lead importado via ${source}`,
          })
        })
      })
    }

    // Payload customizado

    if (body.custom_data) {
      leads.push({
        ...body.custom_data,
        notes: `Lead importado via ${source}`,
      })
    }

    if (!leads.length) {
      return res.status(400).json({
        message: 'Nenhum lead encontrado.',
      })
    }

    const created = await Promise.all(
      leads.map((lead) =>
        leadService.createLeadFromWebhook({
          data: lead,
          source,
        }),
      ),
    )

    return res.json({
      success: true,
      total: created.length,
      leads: created,
    })
  } catch (error) {
    console.error('❌ Erro webhook:', error)

    return res.status(500).json({
      message: 'Erro ao importar webhook.',
      error: error.message,
    })
  }
}

// ======================================================
// CSV
// ======================================================

export const importLeadsFromCSV = async (req, res) => {
  try {
    const rows = []

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', async () => {
        const result = await leadService.importLeadsFromCSV(rows)

        return res.json({
          success: true,
          message: 'Leads importados com sucesso.',
          total: result.total,
        })
      })
  } catch (error) {
    console.error('❌ Erro CSV:', error)

    return res.status(500).json({
      message: 'Erro ao importar CSV.',
      error: error.message,
    })
=======
      return res.status(400).json({ message: 'userId é obrigatório' })
    }

    // Atualiza os leads
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

  // === POST: recebendo leads ===
  if (req.method === 'POST') {
    try {
      const body = req.body
      const leadsToCreate = []

      // 🔹 Caso 1: Formato oficial do Meta
      if (body.entry) {
        body.entry.forEach((entry) => {
          entry.changes.forEach((change) => {
            if (change.field === 'leadgen') {
              const value = change.value
              const fieldData = value.field_data || []

              const leadData = {
                name:
                  fieldData.find((f) => f.name === 'name')?.values?.[0] || '',
                email:
                  fieldData.find((f) => f.name === 'email')?.values?.[0] || '',
                phone:
                  fieldData.find((f) => f.name === 'phone_number')
                    ?.values?.[0] || '',
                region:
                  fieldData.find((f) => f.name === 'region')?.values?.[0] || '', // ✅ adicionado
                createdBy: null,
                assignedTo: null,
                notes: `Lead importado via ${source}`,
              }

              leadsToCreate.push(leadData)
            }
          })
        })
      }

      // 🔹 Caso 2: Formato simplificado para testes
      if (body.custom_data) {
        const { name, email, phone, region } = body.custom_data
        leadsToCreate.push({
          name: name || '',
          email: email || '',
          phone: phone || '',
          region: region || '', // ✅ adicionado
          createdBy: null,
          assignedTo: null,
          notes: `Lead importado via ${source} (custom_data)`,
        })
      }

      if (leadsToCreate.length === 0) {
        return res.status(400).json({ message: 'Nenhum lead válido recebido' })
      }

      // Salva todos os leads
      const createdLeads = await Promise.all(
        leadsToCreate.map((lead) => Lead.create(lead)),
      )

      console.log(`✅ ${createdLeads.length} leads importados via ${source}`)
      return res.status(200).json({
        message: 'Leads importados',
        total: createdLeads.length,
        leads: createdLeads,
      })
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
>>>>>>> 32e8de98b92a233f54261a3612474c5a61832f64
  }
}
