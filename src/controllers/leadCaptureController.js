// src/controllers/leadController.js
import {
  captureLead,
  captureSiteLead,
  captureBrokerHotsiteLead,
  capturePropertyLead,
} from '../service/leadCaptureService.js'
import { autoDistributeLead } from '../service/leadDistributionService.js'
import Property from '../models/Property.js'

/* ============================================================
   HELPER: TENTAR DISTRIBUIR LEAD
============================================================ */

/**
 * Tenta distribuir um lead automaticamente
 */
async function tryDistributeLead(lead, options = {}) {
  const { propertyId, region, createdBy } = options

  try {
    // Se o lead já tem assignedTo, não distribuir
    if (lead.assignedTo) {
      return {
        success: true,
        message: 'Lead já possui corretor atribuído.',
        assignedTo: lead.assignedTo,
      }
    }

    const result = await autoDistributeLead({
      leadId: lead._id,
      region: region || lead.region || 'central',
      propertyId,
      createdBy: createdBy || null,
    })

    return result
  } catch (error) {
    console.error('❌ Erro na distribuição automática:', error)
    return {
      success: false,
      message: 'Erro ao distribuir lead: ' + error.message,
    }
  }
}

/* ============================================================
   CAPTURAR LEAD - GENÉRICO
============================================================ */

/**
 * POST /api/lead-capture
 * Endpoint genérico para captura de leads
 */
export async function createLead(req, res) {
  try {
    const leadData = {
      ...req.body,
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      referrer:
        req.body.referrer || req.headers.referer || req.headers.referrer || '',
    }

    const result = await captureLead(leadData)

    // 🔥 TENTAR DISTRIBUIR AUTOMATICAMENTE
    const distribution = await tryDistributeLead(result, {
      region: result.region,
      createdBy: req.user?._id,
    })

    return res.status(201).json({
      success: true,
      message: distribution.success
        ? 'Lead criado e distribuído com sucesso.'
        : 'Lead criado, aguardando distribuição.',
      data: {
        lead: result,
        distribution: {
          success: distribution.success,
          assignedTo: distribution.assignedTo || null,
          method: distribution.matchMethod || null,
          inQueue: distribution.inQueue || false,
          message: distribution.message,
        },
      },
    })
  } catch (error) {
    console.error('❌ Erro ao capturar lead:', error)

    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Não foi possível criar o lead.',
    })
  }
}

/* ============================================================
   CAPTURAR LEAD DO SITE
============================================================ */

/**
 * POST /api/lead-capture/site
 * Lead vindo do site principal da imobiliária
 */
export async function createSiteLead(req, res) {
  try {
    const leadData = {
      ...req.body,
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      referrer:
        req.body.referrer || req.headers.referer || req.headers.referrer || '',
    }

    const result = await captureSiteLead(leadData)

    // 🔥 TENTAR DISTRIBUIR AUTOMATICAMENTE
    const distribution = await tryDistributeLead(result, {
      region: result.region || leadData.region || 'central',
      createdBy: req.user?._id,
    })

    return res.status(201).json({
      success: true,
      message: distribution.success
        ? 'Solicitação recebida e distribuída com sucesso.'
        : 'Solicitação recebida, aguardando distribuição.',
      data: {
        lead: result,
        distribution: {
          success: distribution.success,
          assignedTo: distribution.assignedTo || null,
          method: distribution.matchMethod || null,
          inQueue: distribution.inQueue || false,
          message: distribution.message,
        },
      },
    })
  } catch (error) {
    console.error('❌ Erro ao criar lead do site:', error)

    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Não foi possível enviar sua solicitação.',
    })
  }
}

/* ============================================================
   CAPTURAR LEAD DO HOTSITE DO CORRETOR
============================================================ */

/**
 * POST /api/lead-capture/broker/:brokerId
 * Lead originado diretamente pelo hotsite de um corretor
 */
export async function createBrokerLead(req, res) {
  try {
    const { brokerId } = req.params

    if (!brokerId) {
      return res.status(400).json({
        success: false,
        message: 'ID do corretor não informado.',
      })
    }

    const leadData = {
      ...req.body,
      brokerId,
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      referrer:
        req.body.referrer || req.headers.referer || req.headers.referrer || '',
    }

    const result = await captureBrokerHotsiteLead(leadData)

    // 🔥 LEADS DO HOTSITE JÁ VÊM COM ASSIGNEDTO = CORRETOR
    // Não precisa distribuir, mas atualizamos o status
    const isAssigned = !!result.assignedTo

    return res.status(201).json({
      success: true,
      message: isAssigned
        ? 'Solicitação enviada ao corretor com sucesso.'
        : 'Solicitação recebida, aguardando distribuição.',
      data: {
        lead: result,
        assignedTo: result.assignedTo || null,
        distribution: {
          success: isAssigned,
          assignedTo: result.assignedTo || null,
          method: isAssigned ? 'broker_hotsite' : null,
          message: isAssigned
            ? 'Atribuído ao corretor do hotsite'
            : 'Aguardando distribuição',
        },
      },
    })
  } catch (error) {
    console.error('❌ Erro ao criar lead do corretor:', error)

    return res.status(error.statusCode || 400).json({
      success: false,
      message:
        error.message || 'Não foi possível enviar sua solicitação ao corretor.',
    })
  }
}

/* ============================================================
   CAPTURAR LEAD RELACIONADO A UM IMÓVEL 🔥 CORRIGIDO
============================================================ */

/**
 * POST /api/lead-capture/property/:propertyId
 * Lead vindo da página de um imóvel específico
 */
export async function createPropertyLead(req, res) {
  try {
    const { propertyId } = req.params

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'ID do imóvel não informado.',
      })
    }

    // 🔥 1. BUSCAR O IMÓVEL PARA OBTER O CORRETOR
    const property = await Property.findById(propertyId)
      .populate('broker', 'name email phone')
      .populate('createdBy', 'name email phone')

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Imóvel não encontrado.',
      })
    }

    // 🔥 2. DETERMINAR O CORRETOR RESPONSÁVEL
    // Prioridade: broker > createdBy
    const assignedBroker = property.broker || property.createdBy

    console.log(`📊 Lead para imóvel: ${property.name}`)
    console.log(`👤 Corretor responsável: ${assignedBroker?.name || 'Nenhum'}`)

    // 🔥 3. PREPARAR OS DADOS DO LEAD
    const leadData = {
      ...req.body,
      propertyId,
      // 🔥 SE TIVER CORRETOR, JÁ ATRIBUIR
      assignedTo: assignedBroker?._id || null,
      // 🔥 SE TIVER CORRETOR, NÃO AGUARDA DISTRIBUIÇÃO
      awaitingAssignment: !assignedBroker?._id,
      isDistributed: !!assignedBroker?._id,
      region: property.location?.region || req.body.region || 'central',
      sourceType: req.body.sourceType || 'property_page',
      // 🔥 ADICIONAR DADOS DO IMÓVEL
      propertyData: {
        id: property._id,
        name: property.name,
        type: property.type,
        region: property.location?.region,
      },
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      referrer:
        req.body.referrer || req.headers.referer || req.headers.referrer || '',
    }

    // 🔥 4. CAPTURAR O LEAD
    const result = await capturePropertyLead(leadData)

    // 🔥 5. SE NÃO TIVER CORRETOR, TENTAR DISTRIBUIR
    let distribution = null

    if (!assignedBroker?._id) {
      distribution = await tryDistributeLead(result, {
        region: property.location?.region || 'central',
        propertyId,
        createdBy: req.user?._id,
      })

      // 🔥 ATUALIZAR O LEAD COM O RESULTADO DA DISTRIBUIÇÃO
      if (distribution.success && distribution.assignedTo) {
        result.assignedTo = distribution.assignedTo
        result.isDistributed = true
        result.awaitingAssignment = false
        await result.save()
      }
    } else {
      // 🔥 LEAD JÁ ATRIBUIDO AO CORRETOR DO IMÓVEL
      distribution = {
        success: true,
        assignedTo: assignedBroker,
        matchMethod: 'property_broker',
        message: `Atribuído ao corretor do imóvel: ${assignedBroker.name}`,
      }
    }

    // 🔥 6. INCREMENTAR CONTATO NO IMÓVEL
    try {
      await Property.findByIdAndUpdate(propertyId, {
        $inc: {
          'statistics.contacts': 1,
          totalContacts: 1,
        },
        $set: {
          'statistics.lastContactAt': new Date(),
        },
      })
      console.log(`✅ Contato incrementado para o imóvel ${property.name}`)
    } catch (error) {
      console.warn('⚠️ Erro ao incrementar contato do imóvel:', error)
    }

    // 🔥 7. BUSCAR O LEAD ATUALIZADO COM POPULATE
    const populatedLead = await result.populate(
      'assignedTo',
      'name email phone',
    )

    return res.status(201).json({
      success: true,
      message: distribution.success
        ? `Solicitação recebida${distribution.assignedTo ? ` e encaminhada para ${distribution.assignedTo.name}` : ''}`
        : 'Solicitação recebida, aguardando distribuição.',
      data: {
        lead: populatedLead,
        property: {
          id: property._id,
          name: property.name,
          type: property.type,
        },
        assignedTo: populatedLead.assignedTo || null,
        distribution: {
          success: distribution.success,
          assignedTo: distribution.assignedTo || null,
          method: distribution.matchMethod || null,
          inQueue: distribution.inQueue || false,
          message: distribution.message,
        },
      },
    })
  } catch (error) {
    console.error('❌ Erro ao criar lead do imóvel:', error)

    return res.status(error.statusCode || 400).json({
      success: false,
      message:
        error.message ||
        'Não foi possível enviar sua solicitação sobre o imóvel.',
    })
  }
}

/* ============================================================
   EXPORT DEFAULT
============================================================ */

export default {
  createLead,
  createSiteLead,
  createBrokerLead,
  createPropertyLead,
}
