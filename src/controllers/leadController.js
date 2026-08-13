import fs from 'fs'
import csv from 'csv-parser'
import Lead from '../models/Lead.js'

import * as leadService from '../service/leadService.js'

import { createBrokerHotsiteLead } from '../service/leadService.js'

import { getUserById } from '../service/users/userService.js'

import { sendEmail } from '../service/email/sendEmails.js'

import { leadAssignedTemplate } from '../utils/emailTemplates.js'

// ======================================================
// CREATE BROKER HOTSITE LEAD
// ======================================================

export const createBrokerHotsiteLeadController = async (req, res) => {
  try {
    const lead = await createBrokerHotsiteLead(req.body)

    return res.status(201).json({
      success: true,

      message: 'Seu interesse foi enviado com sucesso.',

      data: lead,
    })
  } catch (error) {
    console.error('Erro ao criar lead do hotsite:', error)

    return res.status(400).json({
      success: false,

      message: error?.message || 'Não foi possível enviar seu interesse.',
    })
  }
}

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
  }
}

export const publicCreateLead = async (req, res) => {
  try {
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

export const assignLeads = async (req, res) => {
  try {
    let { leadIds, leadId, userId } = req.body

    /*
    ======================================
    NORMALIZA LEAD ÚNICO
    ======================================
    */

    if (leadId) {
      leadIds = [leadId]
    }

    /*
    ======================================
    VALIDAÇÃO
    ======================================
    */

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        message: 'Informe um ou mais leads.',
      })
    }

    if (!userId) {
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
  }
}
