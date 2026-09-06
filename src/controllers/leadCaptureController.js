// src/controllers/leadCaptureController.js
import {
  captureLead,
  captureSiteLead,
  captureBrokerHotsiteLead,
  capturePropertyLead,
} from '../service/leadCaptureService.js'
import { autoDistributeLead } from '../service/leadDistributionService.js'
import Property from '../models/Property.js'
import Lead from '../models/Lead.js'
import { LEAD_SOURCE_TYPE } from '../constants/leadSourceType.js'

/* ============================================================
   HELPER: NORMALIZAR REGIÃO
============================================================ */

function normalizeRegion(region) {
  if (!region) return 'central'

  const regionMap = {
    'zona oeste': 'zona_oeste',
    zona_oeste: 'zona_oeste',
    'zona leste': 'zona_leste',
    zona_leste: 'zona_leste',
    'zona sul': 'zona_sul',
    zona_sul: 'zona_sul',
    'zona norte': 'zona_norte',
    zona_norte: 'zona_norte',
    centro: 'central',
    central: 'central',
    abc: 'abc',
    'grande sp': 'grande_sp',
    grande_sp: 'grande_sp',
    interior: 'interior',
    litoral: 'litoral',
  }

  const normalized = region.toLowerCase().trim()
  const mapped = regionMap[normalized] || normalized

  const validRegions = [
    'central',
    'zona_oeste',
    'zona_leste',
    'zona_sul',
    'zona_norte',
    'abc',
    'grande_sp',
    'interior',
    'litoral',
  ]

  if (validRegions.includes(mapped)) {
    return mapped
  }

  console.warn(
    `⚠️ Região não reconhecida: "${region}", usando "central" como fallback`,
  )
  return 'central'
}

/* ============================================================
   HELPER: TENTAR DISTRIBUIR LEAD
============================================================ */

async function tryDistributeLead(lead, options = {}) {
  const { propertyId, region, createdBy } = options

  try {
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

export async function createLead(req, res) {
  try {
    const leadData = {
      ...req.body,
      region: normalizeRegion(req.body.region || 'central'),
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      referrer:
        req.body.referrer || req.headers.referer || req.headers.referrer || '',
    }

    const result = await captureLead(leadData)

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

export async function createPropertyPageLead(req, res) {
  try {
    const { propertyId } = req.params

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'ID do imóvel não informado.',
      })
    }

    // 1. BUSCAR O IMÓVEL
    const property = await Property.findById(propertyId)

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Imóvel não encontrado.',
      })
    }

    // 2. NORMALIZAR A REGIÃO
    const propertyRegion = property.location?.region || 'central'
    const normalizedRegion = normalizeRegion(propertyRegion)

    console.log(`📊 Lead da página do imóvel: ${property.name}`)
    console.log(`📍 Região: ${normalizedRegion}`)
    console.log(`🔄 Lead será distribuído pela fila round-robin`)

    // 3. PREPARAR OS DADOS DO LEAD USANDO A CONSTANTE
    const leadData = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      message: req.body.message || '',
      region: normalizedRegion,
      source: req.body.source || 'public',
      // 🔥 USAR A CONSTANTE IMPORTADA
      sourceType: LEAD_SOURCE_TYPE.PROPERTY_PAGE,
      property: propertyId,
      assignedTo: null,
      awaitingAssignment: true,
      isDistributed: false,
      'distribution.method': 'manual',
      'distribution.status': 'pending',
      'distribution.attempts': 0,
      'distribution.region': normalizedRegion,
      'distribution.isAutoDistributed': false,
      'distribution.distributedAt': null,
      landingPage: req.body.landingPage || '',
      referrer: req.body.referrer || '',
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    }

    // 4. CRIAR O LEAD
    const lead = new Lead(leadData)
    await lead.save()

    console.log(`✅ Lead criado: ${lead.name}`)
    console.log(`   sourceType: ${lead.sourceType}`)

    // 5. TENTAR DISTRIBUIR AUTOMATICAMENTE
    console.log('🔄 Distribuindo lead pela fila round-robin...')

    const distribution = await autoDistributeLead({
      leadId: lead._id,
      region: normalizedRegion,
      propertyId,
      createdBy: null,
    })

    if (distribution.success && distribution.assignedTo) {
      const assignedId = distribution.assignedTo._id || distribution.assignedTo
      lead.assignedTo = assignedId
      lead.isDistributed = true
      lead.awaitingAssignment = false
      lead.distribution.method = distribution.matchMethod || 'round_robin'
      lead.distribution.status = 'success'
      lead.distribution.isAutoDistributed = true
      lead.distribution.distributedAt = new Date()
      await lead.save()
      console.log(`✅ Lead distribuído para: ${distribution.assignedTo.name}`)
    } else {
      console.log(`⏳ Lead em fila de espera: ${distribution.message}`)
    }

    // 6. INCREMENTAR CONTATO NO IMÓVEL
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

    // 7. BUSCAR O LEAD ATUALIZADO
    const populatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'name email phone')
      .populate('property', 'name type')

    return res.status(201).json({
      success: true,
      message: populatedLead?.assignedTo
        ? `Solicitação recebida e encaminhada para ${populatedLead.assignedTo.name}`
        : 'Solicitação recebida, aguardando distribuição.',
      data: {
        lead: populatedLead,
        property: {
          id: property._id,
          name: property.name,
          type: property.type,
        },
        assignedTo: populatedLead?.assignedTo || null,
        distribution: {
          success: !!populatedLead?.assignedTo,
          assignedTo: populatedLead?.assignedTo || null,
          method: populatedLead?.distribution?.method || null,
          inQueue:
            !populatedLead?.assignedTo && populatedLead?.awaitingAssignment,
          message: populatedLead?.assignedTo
            ? `Atribuído ao corretor ${populatedLead.assignedTo.name}`
            : 'Aguardando distribuição',
        },
      },
    })
  } catch (error) {
    console.error('❌ Erro ao criar lead da página do imóvel:', error)

    return res.status(error.statusCode || 400).json({
      success: false,
      message:
        error.message ||
        'Não foi possível enviar sua solicitação sobre o imóvel.',
    })
  }
}

/* ============================================================
   CAPTURAR LEAD DO SITE
============================================================ */

export async function createSiteLead(req, res) {
  try {
    const leadData = {
      ...req.body,
      region: normalizeRegion(req.body.region || 'central'),
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      referrer:
        req.body.referrer || req.headers.referer || req.headers.referrer || '',
    }

    const result = await captureSiteLead(leadData)

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
      region: normalizeRegion(req.body.region || 'central'),
      brokerId,
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      referrer:
        req.body.referrer || req.headers.referer || req.headers.referrer || '',
    }

    const result = await captureBrokerHotsiteLead(leadData)

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
          method: isAssigned ? 'broker' : null,
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

export async function createPropertyLead(req, res) {
  try {
    const { propertyId } = req.params

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'ID do imóvel não informado.',
      })
    }

    // 1. BUSCAR O IMÓVEL
    const property = await Property.findById(propertyId)
      .populate('broker', 'name email phone')
      .populate('createdBy', 'name email phone')

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Imóvel não encontrado.',
      })
    }

    // 2. DETERMINAR O CORRETOR RESPONSÁVEL
    const assignedBroker = property.broker || property.createdBy

    // 3. NORMALIZAR A REGIÃO
    const propertyRegion = property.location?.region || 'central'
    const normalizedRegion = normalizeRegion(propertyRegion)

    console.log(`📊 Lead para imóvel: ${property.name}`)
    console.log(`📍 Região: ${normalizedRegion}`)
    console.log(`👤 Corretor responsável: ${assignedBroker?.name || 'Nenhum'}`)

    // 4. DETERMINAR O MÉTODO DE DISTRIBUIÇÃO
    // 🔥 VALORES PERMITIDOS: 'admin', 'automatic', 'broker', 'manual', 'round_robin', 'specialized'
    const distributionMethod = assignedBroker?._id ? 'broker' : 'manual'

    // 5. PREPARAR OS DADOS DO LEAD
    const leadData = {
      ...req.body,
      propertyId,
      assignedTo: assignedBroker?._id || null,
      awaitingAssignment: !assignedBroker?._id,
      isDistributed: !!assignedBroker?._id,
      region: normalizedRegion,
      sourceType: req.body.sourceType || 'property_page',
      'distribution.method': distributionMethod,
      'distribution.status': assignedBroker?._id ? 'success' : 'pending',
      'distribution.attempts': 0,
      'distribution.region': normalizedRegion,
      'distribution.isAutoDistributed': !!assignedBroker?._id,
      'distribution.distributedAt': assignedBroker?._id ? new Date() : null,
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      referrer:
        req.body.referrer || req.headers.referer || req.headers.referrer || '',
    }

    // 6. CAPTURAR O LEAD
    const savedLead = await capturePropertyLead(leadData)

    // 7. VERIFICAR SE O LEAD FOI SALVO
    let leadDoc

    if (savedLead && savedLead._id) {
      leadDoc = await Lead.findById(savedLead._id)
    } else if (savedLead && savedLead.id) {
      leadDoc = await Lead.findById(savedLead.id)
    } else if (savedLead && savedLead.lead && savedLead.lead._id) {
      leadDoc = await Lead.findById(savedLead.lead._id)
    }

    // FALLBACK: BUSCAR PELO EMAIL
    if (!leadDoc && req.body.email) {
      leadDoc = await Lead.findOne({
        email: req.body.email,
        property: propertyId,
      }).sort({ createdAt: -1 })
    }

    // FALLBACK FINAL: CRIAR MANUALMENTE
    if (!leadDoc) {
      console.log('⚠️ Lead não encontrado, criando manualmente...')

      leadDoc = new Lead({
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        region: normalizedRegion,
        source: 'public',
        sourceType: 'property_page',
        property: propertyId,
        assignedTo: assignedBroker?._id || null,
        awaitingAssignment: !assignedBroker?._id,
        isDistributed: !!assignedBroker?._id,
        notes: req.body.message || '',
        status: 'novo',
        stage: 'novo_lead',
        priority: 'media',
        'distribution.method': distributionMethod,
        'distribution.status': assignedBroker?._id ? 'success' : 'pending',
        'distribution.attempts': 0,
        'distribution.region': normalizedRegion,
        'distribution.isAutoDistributed': !!assignedBroker?._id,
        'distribution.distributedAt': assignedBroker?._id ? new Date() : null,
        landingPage: req.body.landingPage || '',
        referrer: req.body.referrer || '',
      })

      await leadDoc.save()
      console.log(`✅ Lead criado manualmente: ${leadDoc.name}`)
    }

    console.log(`📋 Lead após criação:`)
    console.log(`  Nome: ${leadDoc.name}`)
    console.log(`  assignedTo: ${leadDoc.assignedTo || 'null'}`)
    console.log(`  awaitingAssignment: ${leadDoc.awaitingAssignment}`)
    console.log(`  isDistributed: ${leadDoc.isDistributed}`)
    console.log(`  distribution.method: ${leadDoc.distribution?.method}`)

    // 8. SE TIVER CORRETOR, GARANTIR QUE O LEAD ESTÁ CORRETO
    if (assignedBroker?._id) {
      leadDoc.assignedTo = assignedBroker._id
      leadDoc.isDistributed = true
      leadDoc.awaitingAssignment = false
      leadDoc.distribution.method = 'broker'
      leadDoc.distribution.status = 'success'
      leadDoc.distribution.isAutoDistributed = true
      leadDoc.distribution.distributedAt = new Date()
      await leadDoc.save()
      console.log(`✅ Lead atribuído ao corretor: ${assignedBroker.name}`)
    } else {
      // 9. NÃO TEM CORRETOR, TENTAR DISTRIBUIR AUTOMATICAMENTE
      console.log('🔄 Lead sem corretor, tentando distribuição automática...')

      leadDoc.awaitingAssignment = true
      leadDoc.isDistributed = false
      leadDoc.distribution.method = 'manual'
      leadDoc.distribution.status = 'pending'
      leadDoc.distribution.attempts = 0
      await leadDoc.save()

      const distribution = await autoDistributeLead({
        leadId: leadDoc._id,
        region: normalizedRegion,
        propertyId,
        createdBy: req.user?._id || null,
      })

      if (distribution.success && distribution.assignedTo) {
        const assignedId =
          distribution.assignedTo._id || distribution.assignedTo
        leadDoc.assignedTo = assignedId
        leadDoc.isDistributed = true
        leadDoc.awaitingAssignment = false
        leadDoc.distribution.method = distribution.matchMethod || 'automatic'
        leadDoc.distribution.status = 'success'
        leadDoc.distribution.isAutoDistributed = true
        leadDoc.distribution.distributedAt = new Date()
        await leadDoc.save()
        console.log(`✅ Lead distribuído para: ${distribution.assignedTo.name}`)
      }
    }

    // 10. INCREMENTAR CONTATO NO IMÓVEL
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

    // 11. BUSCAR O LEAD ATUALIZADO
    const populatedLead = await Lead.findById(leadDoc._id)
      .populate('assignedTo', 'name email phone')
      .populate('property', 'name type')

    return res.status(201).json({
      success: true,
      message: populatedLead?.assignedTo
        ? `Solicitação recebida e encaminhada para ${populatedLead.assignedTo.name}`
        : 'Solicitação recebida, aguardando distribuição.',
      data: {
        lead: populatedLead,
        property: {
          id: property._id,
          name: property.name,
          type: property.type,
        },
        assignedTo: populatedLead?.assignedTo || null,
        distribution: {
          success: !!populatedLead?.assignedTo,
          assignedTo: populatedLead?.assignedTo || null,
          method: populatedLead?.distribution?.method || null,
          inQueue:
            !populatedLead?.assignedTo && populatedLead?.awaitingAssignment,
          message: populatedLead?.assignedTo
            ? `Atribuído ao corretor ${populatedLead.assignedTo.name}`
            : 'Aguardando distribuição',
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
