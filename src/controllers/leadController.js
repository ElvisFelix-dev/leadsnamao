import fs from 'fs'

import csv from 'csv-parser'

import Lead from '../models/Lead.js'

import User from '../models/User.js'

import asyncHandler from '../middleware/asyncHandler.js'

import AppError from '../utils/AppError.js'

import * as leadService from '../service/leadService.js'

import {
  autoDistributeLead,
  processPendingLeads,
  reassignLead,
} from '../service/leadDistributionService.js'

import { createBrokerHotsiteLead } from '../service/leadService.js'

import { getUserById } from '../service/users/userService.js'

import { sendEmail } from '../service/email/sendEmails.js'

import { leadAssignedTemplate } from '../utils/emailTemplates.js'

// ======================================================
// HELPER — ENVIA E-MAIL DE NOVO LEAD
// ======================================================

const sendLeadAssignedEmail = async ({ lead, assignedTo }) => {
  if (!assignedTo?.email) {
    console.warn(
      '⚠️ E-mail não enviado: corretor não possui endereço de e-mail.',
    )

    return false
  }

  try {
    console.log('============================================')
    console.log('📧 ENVIANDO NOTIFICAÇÃO DE NOVO LEAD')
    console.log('Corretor:', assignedTo.name)
    console.log('E-mail:', assignedTo.email)
    console.log('Lead:', lead?._id)
    console.log('============================================')

    await sendEmail({
      to: assignedTo.email,
      subject: 'Novo lead atribuído - Leads Na Mão',
      htmlContent: leadAssignedTemplate({
        brokerName: assignedTo.name,
        brokerPosition: assignedTo.position || 'Corretor de imóveis',
        leadName: lead?.name || '',
        leadEmail: lead?.email || '',
        leadPhone: lead?.phone || '',
        leadRegion: lead?.region || '',
        leadSource: lead?.source || '',
        leadId: lead?._id,
      }),
    })

    console.log(`✅ E-mail de novo lead enviado para ${assignedTo.email}`)

    return true
  } catch (error) {
    console.error('============================================')
    console.error('❌ ERRO AO ENVIAR E-MAIL DO NOVO LEAD')
    console.error('Destinatário:', assignedTo.email)
    console.error('Mensagem:', error.message)
    console.error('Stack:', error.stack)
    console.error('============================================')

    return false
  }
}

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

export const createLead = asyncHandler(async (req, res) => {
  // ====================================================
  // 1. CRIAR O LEAD
  // ====================================================

  const lead = new Lead({
    ...req.body,

    // Campos necessários para distribuição
    awaitingAssignment: true,
    isDistributed: false,
    'distribution.status': 'pending',
    'distribution.attempts': 0,
  })

  await lead.save()

  // ====================================================
  // 2. DISTRIBUIR AUTOMATICAMENTE
  // ====================================================

  try {
    const distribution = await autoDistributeLead({
      leadId: lead._id,
      region: lead.region,
      createdBy: req.user?._id,
    })

    console.log('============================================')
    console.log('📌 DISTRIBUIÇÃO AUTOMÁTICA CONCLUÍDA')
    console.log('Lead:', distribution.lead?._id || lead._id)
    console.log('Corretor:', distribution.assignedTo?.name)
    console.log('E-mail:', distribution.assignedTo?.email)
    console.log('Método:', distribution.matchMethod)
    console.log('============================================')

    // ==================================================
    // 3. ENVIAR E-MAIL PARA O CORRETOR
    // ==================================================

    const emailSent = await sendLeadAssignedEmail({
      lead: distribution.lead || lead,
      assignedTo: distribution.assignedTo,
    })

    // ==================================================
    // 4. RESPOSTA
    // ==================================================

    return res.status(201).json({
      success: true,

      message: emailSent
        ? 'Lead criado, distribuído e notificado por e-mail.'
        : 'Lead criado e distribuído, mas o e-mail não pôde ser enviado.',

      data: {
        lead: distribution.lead || lead,
        assignedTo: distribution.assignedTo || null,
        distributionMethod: distribution.matchMethod || null,
        emailSent,
      },
    })
  } catch (error) {
    console.error('⚠️ Erro na distribuição automática do lead:', error.message)

    // O lead continua criado e poderá ser processado posteriormente
    return res.status(201).json({
      success: true,

      message: 'Lead criado, mas aguardando distribuição automática.',

      data: {
        lead,
        emailSent: false,
      },
    })
  }
})

// ======================================================
// PUBLIC CREATE LEAD
// ======================================================

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
    const { id } = req.params
    const { body } = req
    const { _id: userId, isAdmin } = req.user

    console.log('🔄 Iniciando atualização de lead:', {
      leadId: id,
      userId,
      isAdmin,
      body,
      timestamp: new Date().toISOString(),
    })

    if (!body || Object.keys(body).length === 0) {
      console.warn('⚠️ Nenhum dado fornecido para atualização')

      return res.status(400).json({
        success: false,
        message: 'Nenhum dado fornecido para atualização.',
      })
    }

    const lead = await leadService.updateLead({
      leadId: id,
      userId,
      isAdmin,
      data: body,
    })

    console.log('✅ Lead atualizado com sucesso:', {
      leadId: lead._id,
      name: lead.name,
      status: lead.status,
      stage: lead.stage,
      updatedFields: Object.keys(body).join(', '),
      timestamp: new Date().toISOString(),
    })

    return res.status(200).json({
      success: true,
      message: 'Lead atualizado com sucesso.',
      data: lead,
    })
  } catch (error) {
    console.error('❌ Erro ao atualizar lead:', {
      leadId: req.params.id,
      error: error.message,
      stack: error.stack,
      body: req.body,
      timestamp: new Date().toISOString(),
    })

    if (error.message === 'Lead não encontrado.') {
      return res.status(404).json({
        success: false,
        message: 'Lead não encontrado.',
        error: error.message,
      })
    }

    if (error.message === 'Sem permissão para atualizar este lead.') {
      return res.status(403).json({
        success: false,
        message: 'Sem permissão para atualizar este lead.',
        error: error.message,
      })
    }

    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar lead.',
      error: error.message,
    })
  }
}

// ======================================================
// ASSIGN LEADS
// ======================================================

export const assignLeads = async (req, res) => {
  try {
    let { leadIds, leadId, userId } = req.body

    // ======================================
    // NORMALIZA LEAD ÚNICO
    // ======================================

    if (leadId) {
      leadIds = [leadId]
    }

    // ======================================
    // VALIDAÇÃO
    // ======================================

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

    // ======================================
    // BUSCA CORRETOR
    // ======================================

    const broker = await getUserById(userId)

    if (!broker) {
      return res.status(404).json({
        message: 'Corretor não encontrado.',
      })
    }

    // ======================================
    // BUSCA LEADS ANTES DA ALTERAÇÃO
    // ======================================

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

    // ======================================
    // ATRIBUI LEADS
    // ======================================

    const result = await leadService.assignLeads({
      leadIds,
      userId,
    })

    // ======================================
    // ENVIO DE EMAIL
    // ======================================

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

    // ======================================
    // RESPOSTA
    // ======================================

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
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo enviado.',
      })
    }

    const rows = []

    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject)
    })

    // Remove o arquivo temporário
    fs.unlink(req.file.path, () => {})

    const result = await leadService.importLeadsFromCSV(rows)

    return res.json({
      success: true,
      message: `${result.success} leads importados com sucesso.`,
      total: result.total,
      failed: result.failed,
      errors: result.errors.slice(0, 20),
    })
  } catch (error) {
    console.error('❌ Erro CSV:', error)

    return res.status(500).json({
      success: false,
      message: 'Erro ao importar CSV.',
      error: error.message,
    })
  }
}

// ======================================================
// DISTRIBUIÇÃO AUTOMÁTICA
// ======================================================

/**
 * POST /api/leads/auto-distribute
 * Distribui um lead automaticamente
 */

export const autoDistribute = asyncHandler(async (req, res) => {
  const { leadId, propertyId, region, type } = req.body

  if (!leadId) {
    throw new AppError('ID do lead é obrigatório.', 400)
  }

  // ============================================
  // 1. DISTRIBUIÇÃO AUTOMÁTICA
  // ============================================

  const result = await autoDistributeLead({
    leadId,
    propertyId,
    region,
    type,
    createdBy: req.user._id,
  })

  console.log('============================================')
  console.log('📌 RESULTADO DA DISTRIBUIÇÃO AUTOMÁTICA')
  console.log('success:', result.success)
  console.log('message:', result.message)
  console.log('lead:', result.lead?._id)
  console.log('assignedTo:', result.assignedTo)
  console.log('assignedTo.email:', result.assignedTo?.email)
  console.log('============================================')

  // ============================================
  // 2. NOTIFICAÇÃO POR E-MAIL
  // ============================================

  const emailSent = await sendLeadAssignedEmail({
    lead: result.lead,
    assignedTo: result.assignedTo,
  })

  // ============================================
  // 3. RESPOSTA
  // ============================================

  return res.json({
    success: result.success,
    message: result.message,

    data: {
      lead: result.lead,
      assignedTo: result.assignedTo || null,
      matchMethod: result.matchMethod || null,
      inQueue: Boolean(result.inQueue),
      emailSent,
    },
  })
})

/**
 * POST /api/leads/process-pending
 * Processa leads pendentes (admin apenas)
 */

export const processPendingLeadsController = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin && req.user.role !== 'admin') {
    throw new AppError('Acesso negado. Apenas administradores.', 403)
  }

  const result = await processPendingLeads()

  res.json({
    success: result.success,

    message: `${result.distributed} leads distribuídos de ${result.totalProcessed}`,

    data: result,
  })
})

/**
 * POST /api/leads/:id/reassign
 * Reatribui um lead
 */

export const reassignLeadController = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { reason } = req.body

  if (!req.user.isAdmin && req.user.role !== 'admin') {
    throw new AppError('Acesso negado. Apenas administradores.', 403)
  }

  const result = await reassignLead(
    id,
    reason || 'Reatribuição manual',
    req.user._id,
  )

  res.json({
    success: result.success,
    message: 'Lead reatribuído com sucesso.',
    data: result,
  })
})

/**
 * GET /api/leads/distribution-stats
 * Estatísticas de distribuição
 */

export const getDistributionStats = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin && req.user.role !== 'admin') {
    throw new AppError('Acesso negado. Apenas administradores.', 403)
  }

  // Estatísticas por corretor
  const brokers = await User.find({
    role: 'broker',
    isDeleted: false,
  }).select('name email leadCounters brokerSettings')

  // Leads por status de distribuição
  const [pending, distributed, total] = await Promise.all([
    Lead.countDocuments({
      isDistributed: false,
      assignedTo: { $exists: false },
      isDeleted: false,
    }),

    Lead.countDocuments({
      isDistributed: true,
      isDeleted: false,
    }),

    Lead.countDocuments({
      isDeleted: false,
    }),
  ])

  // Leads por método de distribuição
  const distributionMethods = await Lead.aggregate([
    {
      $match: {
        isDeleted: false,
      },
    },

    {
      $group: {
        _id: '$distribution.method',
        count: { $sum: 1 },
      },
    },
  ])

  // Média de leads por corretor
  const totalLeads = await Lead.countDocuments({
    isDistributed: true,
    isDeleted: false,
  })

  const avgLeads =
    brokers.length > 0 ? Math.round(totalLeads / brokers.length) : 0

  // Leads em fila por região
  const queueByRegion = await Lead.aggregate([
    {
      $match: {
        isDeleted: false,
        isDistributed: false,
        assignedTo: { $exists: false },
      },
    },

    {
      $group: {
        _id: '$region',
        count: { $sum: 1 },
      },
    },

    {
      $sort: {
        count: -1,
      },
    },
  ])

  res.json({
    success: true,

    data: {
      summary: {
        total,
        pending,
        distributed,
        avgLeadsPerBroker: avgLeads,

        pendingPercentage: total > 0 ? Math.round((pending / total) * 100) : 0,
      },

      distributionMethods,

      queueByRegion,

      brokers: brokers.map((broker) => ({
        id: broker._id,
        name: broker.name,
        email: broker.email,

        activeLeads: broker.leadCounters?.activeLeads || 0,

        totalAssigned: broker.leadCounters?.totalAssigned || 0,

        queuePosition: broker.leadCounters?.leadQueuePosition || 0,

        lastLeadReceivedAt: broker.leadCounters?.lastLeadReceivedAt || null,

        specializedRegions: broker.brokerSettings?.specializedRegions || [],

        isActive: broker.brokerSettings?.isActive !== false,

        maxActiveLeads: broker.brokerSettings?.maxActiveLeads || 50,
      })),
    },
  })
})
