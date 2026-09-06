// src/service/lead/leadDistributionService.js
import mongoose from 'mongoose'
import Lead from '../models/Lead.js'
import User from '../models/User.js'
import Property from '../models/Property.js'
import AppError from '../utils/AppError.js'

/* ============================================================
   CONFIGURAÇÕES
============================================================ */

const DISTRIBUTION_CONFIG = {
  maxAttempts: 5,
  maxLeadsPerBroker: 50,
  regionPriorities: {
    central: 1,
    zona_sul: 2,
    zona_norte: 3,
    zona_leste: 4,
    zona_oeste: 5,
    abc: 6,
    grande_sp: 7,
    interior: 8,
    litoral: 9,
  },
}

/* ============================================================
   FUNÇÃO PRINCIPAL - DISTRIBUIR LEAD
============================================================ */

export async function autoDistributeLead(leadData) {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const { leadId, propertyId, region, type, createdBy } = leadData

    // 1. Buscar o lead
    const lead = await Lead.findById(leadId).session(session)

    if (!lead) {
      throw new AppError('Lead não encontrado.', 404)
    }

    // Verificar se o lead já foi distribuído
    if (lead.isDistributed || lead.assignedTo) {
      console.log(`⚠️ Lead ${leadId} já foi distribuído.`)
      await session.abortTransaction()
      return {
        success: false,
        message: 'Lead já distribuído.',
        lead,
        assignedTo: lead.assignedTo,
      }
    }

    // 2. Buscar propriedade (se existir)
    let leadRegion = region
    let leadType = type

    if (propertyId) {
      const property = await Property.findById(propertyId).session(session)
      if (property) {
        leadRegion = property.location?.region || leadRegion
        leadType = property.type || leadType
      }
    }

    // 3. Encontrar o melhor corretor
    const assignedBroker = await findBestBroker({
      region: leadRegion,
      type: leadType,
      leadId,
      session,
    })

    if (!assignedBroker) {
      console.log('⚠️ Nenhum corretor disponível para distribuição.')
      await session.abortTransaction()

      // Colocar em fila de espera
      await Lead.findByIdAndUpdate(leadId, {
        $set: {
          awaitingAssignment: true,
          'distribution.status': 'queue',
          'distribution.attempts': 1,
          'distribution.lastAttemptAt': new Date(),
          'distribution.isAutoDistributed': false,
        },
      }).session(session)

      return {
        success: false,
        message: 'Nenhum corretor disponível. Lead em fila de espera.',
        lead,
        assignedTo: null,
        inQueue: true,
      }
    }

    // 4. Atribuir o lead ao corretor
    await assignLeadToBroker({
      leadId,
      brokerId: assignedBroker._id,
      session,
      method: assignedBroker.matchMethod,
    })

    // 5. Atualizar o lead
    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      {
        $set: {
          assignedTo: assignedBroker._id,
          isDistributed: true,
          distributedAt: new Date(),
          awaitingAssignment: false,
          assignmentType: assignedBroker.matchMethod,
          assignedAt: new Date(),
          'distribution.method': assignedBroker.matchMethod,
          'distribution.status': 'success',
          'distribution.isAutoDistributed': true,
          'distribution.distributedAt': new Date(),
          'distribution.matchScore': assignedBroker.matchScore || 0,
          'distribution.region': leadRegion,
        },
        $inc: { 'distribution.attempts': 1 },
      },
      { new: true, session },
    ).populate('assignedTo', 'name email phone')

    await session.commitTransaction()

    console.log(`✅ Lead ${leadId} distribuído para ${assignedBroker.name}`)

    // Registrar no histórico de atribuição
    await addAssignmentHistory({
      leadId,
      brokerId: assignedBroker._id,
      userId: createdBy,
      method: assignedBroker.matchMethod,
      region: leadRegion,
      matchScore: assignedBroker.matchScore || 0,
    })

    return {
      success: true,
      message: 'Lead distribuído com sucesso.',
      lead: updatedLead,
      assignedTo: updatedLead.assignedTo,
      broker: assignedBroker,
      matchMethod: assignedBroker.matchMethod,
    }
  } catch (error) {
    await session.abortTransaction()
    console.error('❌ Erro na distribuição automática:', error)
    throw error
  } finally {
    session.endSession()
  }
}

/* ============================================================
   ENCONTRAR MELHOR CORRETOR
============================================================ */

// src/service/lead/leadDistributionService.js - CORRIGIDO

async function findBestBroker({ region, type, leadId, session }) {
  console.log(`🔍 Buscando corretor para região: ${region}, tipo: ${type}`)

  // 🔥 CORRIGIDO: Buscar todos os corretores com role 'broker' e isActive: true
  const brokers = await User.find({
    role: 'broker',
    isActive: true, // Campo principal
    'brokerSettings.isActive': true, // Campo do brokerSettings
  })
    .select('_id name email brokerSettings leadCounters')
    .session(session)
    .lean()

  console.log(`📊 Total de corretores encontrados: ${brokers.length}`)

  if (brokers.length === 0) {
    console.log('⚠️ Nenhum corretor ativo encontrado.')
    // 🔥 TENTAR BUSCAR SEM O FILTRO brokerSettings
    const fallbackBrokers = await User.find({
      role: 'broker',
      isActive: true,
    })
      .select('_id name email brokerSettings leadCounters')
      .session(session)
      .lean()

    if (fallbackBrokers.length > 0) {
      console.log(
        `✅ Encontrados ${fallbackBrokers.length} corretores no fallback`,
      )
      // Usar os corretores encontrados no fallback
      return await selectBestBroker(fallbackBrokers, region)
    }

    return null
  }

  return await selectBestBroker(brokers, region)
}

// 🔥 NOVA FUNÇÃO PARA SELECIONAR O MELHOR CORRETOR
async function selectBestBroker(brokers, region) {
  // Filtrar corretores com capacidade disponível
  const availableBrokers = brokers.filter((broker) => {
    const activeLeads = broker.leadCounters?.activeLeads || 0
    const maxLeads = broker.brokerSettings?.maxActiveLeads || 50
    return activeLeads < maxLeads
  })

  if (availableBrokers.length === 0) {
    console.log('⚠️ Todos os corretores estão com capacidade máxima.')
    return null
  }

  console.log(
    `✅ ${availableBrokers.length} corretores com capacidade disponível.`,
  )

  // 1. PRIORIDADE: CORRETOR ESPECIALIZADO NA REGIÃO
  if (region) {
    const specializedBrokers = availableBrokers.filter((broker) => {
      const regions = broker.brokerSettings?.specializedRegions || []
      return regions.includes(region)
    })

    if (specializedBrokers.length > 0) {
      console.log(
        `🎯 Encontrados ${specializedBrokers.length} corretores especializados na região ${region}`,
      )
      const bestSpecialized = getBrokerWithLeastLeads(specializedBrokers)
      return {
        ...bestSpecialized,
        matchMethod: 'specialized',
        matchScore: 100,
      }
    }
  }

  // 2. SEGUNDA PRIORIDADE: ROUND-ROBIN (FILA)
  const roundRobinBroker = getNextInQueue(availableBrokers)

  if (roundRobinBroker) {
    console.log(
      `🎯 Corretor selecionado por round-robin: ${roundRobinBroker.name}`,
    )
    return {
      ...roundRobinBroker,
      matchMethod: 'round_robin',
      matchScore: 50,
    }
  }

  // 3. TERCEIRA PRIORIDADE: CORRETOR COM MENOS LEADS
  const brokerWithLeastLeads = getBrokerWithLeastLeads(availableBrokers)

  console.log(`🎯 Corretor com menos leads: ${brokerWithLeastLeads.name}`)
  return {
    ...brokerWithLeastLeads,
    matchMethod: 'automatic',
    matchScore: 30,
  }
}

/* ============================================================
   HELPERS
============================================================ */

function getBrokerWithLeastLeads(brokers) {
  return brokers.reduce((min, broker) => {
    const currentLeads = broker.leadCounters?.activeLeads || 0
    const minLeads = min.leadCounters?.activeLeads || 0
    return currentLeads < minLeads ? broker : min
  })
}

function getNextInQueue(brokers) {
  const sorted = [...brokers].sort((a, b) => {
    const posA = a.leadCounters?.leadQueuePosition || 0
    const posB = b.leadCounters?.leadQueuePosition || 0
    return posA - posB
  })
  return sorted[0] || null
}

/* ============================================================
   ATRIBUIR LEAD AO CORRETOR
============================================================ */

async function assignLeadToBroker({ leadId, brokerId, session, method }) {
  // Atualizar posição na fila do corretor
  const maxPosition = await User.findOne(
    { role: 'broker' },
    { 'leadCounters.leadQueuePosition': 1 },
  )
    .sort({ 'leadCounters.leadQueuePosition': -1 })
    .session(session)
    .lean()

  const nextPosition = (maxPosition?.leadCounters?.leadQueuePosition || 0) + 1

  await User.findByIdAndUpdate(
    brokerId,
    {
      $inc: {
        'leadCounters.totalAssigned': 1,
        'leadCounters.activeLeads': 1,
        'leadCounters.leadQueuePosition': 1,
      },
      $set: {
        'leadCounters.lastLeadReceivedAt': new Date(),
      },
    },
    { session },
  )
}

/* ============================================================
   ADICIONAR HISTÓRICO DE ATRIBUIÇÃO
============================================================ */

async function addAssignmentHistory({
  leadId,
  brokerId,
  userId,
  method,
  region,
  matchScore,
}) {
  try {
    await Lead.findByIdAndUpdate(leadId, {
      $push: {
        assignmentHistory: {
          to: brokerId,
          from: null,
          type: method,
          changedBy: userId || null,
          distributionMethod: method,
          region: region || '',
          matchScore: matchScore || 0,
          isAuto:
            method === 'automatic' ||
            method === 'round_robin' ||
            method === 'specialized',
          createdAt: new Date(),
        },
      },
    })
  } catch (error) {
    console.error('❌ Erro ao adicionar histórico:', error)
  }
}

/* ============================================================
   PROCESSAR LEADS PENDENTES
============================================================ */

export async function processPendingLeads() {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const pendingLeads = await Lead.find({
      isDistributed: false,
      assignedTo: { $exists: false },
      'distribution.attempts': { $lt: DISTRIBUTION_CONFIG.maxAttempts },
      isDeleted: false,
      status: { $nin: ['convertido', 'perdido', 'arquivado'] },
    })
      .sort({ priority: -1, createdAt: 1 })
      .limit(50)
      .session(session)

    console.log(`📊 Processando ${pendingLeads.length} leads pendentes...`)

    const results = []

    for (const lead of pendingLeads) {
      try {
        let region = lead.region || null
        let type = null

        if (lead.property) {
          const property = await Property.findById(lead.property).session(
            session,
          )
          if (property) {
            region = property.location?.region || region
            type = property.type || type
          }
        }

        const result = await autoDistributeLead({
          leadId: lead._id,
          propertyId: lead.property,
          region,
          type,
        })

        results.push({
          leadId: lead._id,
          success: result.success,
          assignedTo: result.assignedTo?._id || null,
        })
      } catch (error) {
        console.error(`❌ Erro ao distribuir lead ${lead._id}:`, error)

        await Lead.findByIdAndUpdate(
          lead._id,
          {
            $inc: { 'distribution.attempts': 1 },
            $set: {
              'distribution.lastAttemptAt': new Date(),
              'distribution.errorMessage': error.message,
            },
          },
          { session },
        )

        results.push({
          leadId: lead._id,
          success: false,
          error: error.message,
        })
      }
    }

    await session.commitTransaction()

    const successCount = results.filter((r) => r.success).length
    console.log(
      `✅ ${successCount}/${results.length} leads distribuídos com sucesso.`,
    )

    return {
      success: true,
      totalProcessed: pendingLeads.length,
      distributed: successCount,
      results,
    }
  } catch (error) {
    await session.abortTransaction()
    console.error('❌ Erro ao processar leads pendentes:', error)
    throw error
  } finally {
    session.endSession()
  }
}

/* ============================================================
   REATRIBUIR LEAD
============================================================ */

export async function reassignLead(leadId, reason, userId) {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const lead = await Lead.findById(leadId).session(session)

    if (!lead) {
      throw new AppError('Lead não encontrado.', 404)
    }

    // Remover corretor anterior
    const previousBroker = lead.assignedTo

    if (previousBroker) {
      await User.findByIdAndUpdate(
        previousBroker,
        {
          $inc: { 'leadCounters.activeLeads': -1 },
        },
        { session },
      )
    }

    // Resetar lead
    lead.assignedTo = null
    lead.isDistributed = false
    lead.distributedAt = null
    lead.awaitingAssignment = true
    lead.assignmentType = 'manual'
    lead.distribution.status = 'pending'
    lead.distribution.isAutoDistributed = false
    lead.distribution.attempts = (lead.distribution.attempts || 0) + 1
    lead.distribution.lastAttemptAt = new Date()
    lead.distribution.reason = reason || 'Reatribuição manual'

    await lead.save({ session })

    await session.commitTransaction()

    console.log(
      `🔄 Lead ${leadId} reatribuído. Motivo: ${reason || 'Reatribuição manual'}`,
    )

    // Tentar distribuir novamente
    return await autoDistributeLead({
      leadId,
      propertyId: lead.property,
      region: lead.region,
      createdBy: userId,
    })
  } catch (error) {
    await session.abortTransaction()
    console.error('❌ Erro ao reatribuir lead:', error)
    throw error
  } finally {
    session.endSession()
  }
}
