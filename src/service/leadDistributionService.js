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

  try {
    const { leadId, propertyId, region, type, createdBy } = leadData

    // ============================================
    // 1. Validar leadId
    // ============================================

    if (!leadId) {
      throw new AppError('ID do lead é obrigatório para distribuição.', 400)
    }

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      throw new AppError('ID do lead inválido.', 400)
    }

    // ============================================
    // 2. Iniciar transação
    // ============================================

    session.startTransaction()

    // ============================================
    // 3. Buscar o lead
    // ============================================

    const lead = await Lead.findById(leadId).session(session)

    if (!lead) {
      throw new AppError('Lead não encontrado.', 404)
    }

    // ============================================
    // 4. Verificar se já foi distribuído
    // ============================================

    if (lead.isDistributed || lead.assignedTo) {
      console.log(`⚠️ Lead ${leadId} já foi distribuído.`)

      await session.abortTransaction()

      return {
        success: false,
        message: 'Lead já distribuído.',
        lead,
        assignedTo: lead.assignedTo || null,
        inQueue: false,
        matchMethod: null,
      }
    }

    // ============================================
    // 5. Determinar região e tipo
    // ============================================

    let leadRegion = region || lead.region || null
    let leadType = type || null

    // Se o próprio lead possui uma propriedade,
    // usamos ela caso propertyId não tenha sido enviado.
    const resolvedPropertyId = propertyId || lead.property || null

    if (resolvedPropertyId) {
      const property =
        await Property.findById(resolvedPropertyId).session(session)

      if (property) {
        leadRegion = property.location?.region || leadRegion

        leadType = property.type || leadType
      }
    }

    console.log(`📍 Região definida: ${leadRegion || 'não informada'}`)

    console.log(`🏠 Tipo definido: ${leadType || 'não informado'}`)

    // ============================================
    // 6. Encontrar o melhor corretor
    // ============================================

    const assignedBroker = await findBestBroker({
      region: leadRegion,
      type: leadType,
      session,
    })

    // ============================================
    // 7. Nenhum corretor disponível
    // ============================================

    if (!assignedBroker) {
      console.log('⚠️ Nenhum corretor disponível para distribuição.')

      /**
       * A transação atual não será utilizada
       * para colocar o lead na fila.
       */
      await session.abortTransaction()

      /**
       * Como a transação foi encerrada, fazemos
       * o update fora da sessão.
       */
      const queuedLead = await Lead.findByIdAndUpdate(
        leadId,
        {
          $set: {
            awaitingAssignment: true,

            'distribution.status': 'queue',

            'distribution.lastAttemptAt': new Date(),

            'distribution.isAutoDistributed': false,
          },

          $inc: {
            'distribution.attempts': 1,
          },
        },
        {
          new: true,
        },
      )

      console.log(`⏳ Lead ${leadId} colocado na fila de distribuição.`)

      return {
        success: false,

        message: 'Nenhum corretor disponível. Lead em fila de espera.',

        lead: queuedLead || lead,

        assignedTo: null,

        inQueue: true,

        matchMethod: null,
      }
    }

    // ============================================
    // 8. Atribuir lead ao corretor
    // ============================================

    await assignLeadToBroker({
      leadId,
      brokerId: assignedBroker._id,
      session,
      method: assignedBroker.matchMethod,
    })

    // ============================================
    // 9. Atualizar lead
    // ============================================

    const now = new Date()

    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      {
        $set: {
          assignedTo: assignedBroker._id,

          isDistributed: true,

          distributedAt: now,

          awaitingAssignment: false,

          assignmentType: assignedBroker.matchMethod,

          assignedAt: now,

          'distribution.method': assignedBroker.matchMethod,

          'distribution.status': 'success',

          'distribution.isAutoDistributed': true,

          'distribution.distributedAt': now,

          'distribution.matchScore': assignedBroker.matchScore || 0,

          'distribution.region': leadRegion || null,

          'distribution.lastAttemptAt': now,
        },

        $inc: {
          'distribution.attempts': 1,
        },
      },
      {
        new: true,
        session,
      },
    ).populate('assignedTo', 'name email phone position')

    // ============================================
    // 10. Validar atualização
    // ============================================

    if (!updatedLead) {
      throw new AppError(
        'Não foi possível atualizar o lead após a distribuição.',
        500,
      )
    }

    // ============================================
    // 11. Confirmar transação
    // ============================================

    await session.commitTransaction()

    console.log(`✅ Lead ${leadId} distribuído para ${assignedBroker.name}`)

    // ============================================
    // 12. Registrar histórico
    // ============================================

    try {
      await addAssignmentHistory({
        leadId,
        brokerId: assignedBroker._id,
        userId: createdBy,
        method: assignedBroker.matchMethod,
        region: leadRegion,
        matchScore: assignedBroker.matchScore || 0,
      })
    } catch (historyError) {
      /**
       * O lead já foi distribuído e a transação
       * já foi confirmada.
       *
       * Portanto, erro no histórico não desfaz
       * a distribuição.
       */
      console.error(
        `⚠️ Lead ${leadId} distribuído, mas houve erro ao registrar histórico:`,
        historyError.message,
      )
    }

    // ============================================
    // 13. Retorno
    // ============================================

    return {
      success: true,

      message: 'Lead distribuído com sucesso.',

      lead: updatedLead,

      assignedTo: updatedLead.assignedTo || null,

      broker: assignedBroker,

      matchMethod: assignedBroker.matchMethod,

      inQueue: false,
    }
  } catch (error) {
    // ============================================
    // Rollback
    // ============================================

    if (session.inTransaction()) {
      await session.abortTransaction()
    }

    console.error('❌ Erro na distribuição automática:', error)

    throw error
  } finally {
    // ============================================
    // Encerrar sessão
    // ============================================

    await session.endSession()
  }
}

/* ============================================================
   ENCONTRAR MELHOR CORRETOR
============================================================ */

async function findBestBroker({ region, type, session }) {
  console.log(
    `🔍 Buscando corretor para região: ${
      region || 'não informada'
    }, tipo: ${type || 'não informado'}`,
  )

  // ============================================
  // Buscar corretores ativos
  // ============================================

  let brokers = await User.find({
    role: 'broker',
    isActive: true,
    'brokerSettings.isActive': true,
  })
    .select('_id name email phone position brokerSettings leadCounters')
    .session(session)
    .lean()

  console.log(`📊 Total de corretores encontrados: ${brokers.length}`)

  // ============================================
  // Fallback
  // ============================================

  if (brokers.length === 0) {
    console.log('⚠️ Nenhum corretor encontrado com brokerSettings.isActive.')

    brokers = await User.find({
      role: 'broker',
      isActive: true,
    })
      .select('_id name email phone position brokerSettings leadCounters')
      .session(session)
      .lean()

    console.log(`📊 Corretores encontrados no fallback: ${brokers.length}`)
  }

  if (brokers.length === 0) {
    console.log('⚠️ Nenhum corretor ativo encontrado.')

    return null
  }

  return selectBestBroker(brokers, region)
}

/* ============================================================
   SELECIONAR MELHOR CORRETOR
============================================================ */

async function selectBestBroker(brokers, region) {
  // ============================================
  // 1. Filtrar capacidade
  // ============================================

  const availableBrokers = brokers.filter((broker) => {
    const activeLeads = broker.leadCounters?.activeLeads || 0

    const maxLeads =
      broker.brokerSettings?.maxActiveLeads ||
      DISTRIBUTION_CONFIG.maxLeadsPerBroker

    return activeLeads < maxLeads
  })

  if (availableBrokers.length === 0) {
    console.log('⚠️ Todos os corretores estão com capacidade máxima.')

    return null
  }

  console.log(
    `✅ ${availableBrokers.length} corretores com capacidade disponível.`,
  )

  // ============================================
  // 2. Prioridade por região
  // ============================================

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

  // ============================================
  // 3. Round-robin
  // ============================================

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

  // ============================================
  // 4. Menor número de leads
  // ============================================

  const brokerWithLeastLeads = getBrokerWithLeastLeads(availableBrokers)

  console.log(`🎯 Corretor com menos leads: ${brokerWithLeastLeads.name}`)

  return {
    ...brokerWithLeastLeads,

    matchMethod: 'automatic',

    matchScore: 30,
  }
}

/* ============================================================
   HELPER - CORRETOR COM MENOS LEADS
============================================================ */

function getBrokerWithLeastLeads(brokers) {
  return brokers.reduce((min, broker) => {
    const currentLeads = broker.leadCounters?.activeLeads || 0

    const minLeads = min.leadCounters?.activeLeads || 0

    return currentLeads < minLeads ? broker : min
  })
}

/* ============================================================
   HELPER - ROUND ROBIN
============================================================ */

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
  if (!leadId || !brokerId) {
    throw new AppError('Lead e corretor são obrigatórios para atribuição.', 400)
  }

  // ============================================
  // Verificar corretor
  // ============================================

  const broker = await User.findOne({
    _id: brokerId,
    role: 'broker',
    isActive: true,
  })
    .session(session)
    .lean()

  if (!broker) {
    throw new AppError('Corretor não encontrado ou inativo.', 404)
  }

  // ============================================
  // Atualizar métricas do corretor
  // ============================================

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
    {
      session,
    },
  )

  console.log(
    `👤 Lead ${leadId} atribuído ao corretor ${brokerId} via ${method}`,
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
  if (!leadId || !brokerId) {
    console.error(
      '❌ Não foi possível registrar histórico: leadId ou brokerId ausente.',
    )

    return
  }

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
}

/* ============================================================
   PROCESSAR LEADS PENDENTES
============================================================ */

export async function processPendingLeads() {
  /**
   * IMPORTANTE:
   *
   * Não abrimos uma transação aqui.
   *
   * autoDistributeLead() já possui sua própria
   * transação. Abrir outra transação aqui e chamar
   * autoDistributeLead() dentro dela poderia causar
   * conflitos entre sessões/transações.
   */

  try {
    const pendingLeads = await Lead.find({
      isDistributed: false,

      assignedTo: {
        $exists: false,
      },

      'distribution.attempts': {
        $lt: DISTRIBUTION_CONFIG.maxAttempts,
      },

      isDeleted: false,

      status: {
        $nin: ['convertido', 'perdido', 'arquivado'],
      },
    })
      .sort({
        priority: -1,
        createdAt: 1,
      })
      .limit(50)

    console.log(`📊 Processando ${pendingLeads.length} leads pendentes...`)

    const results = []

    for (const lead of pendingLeads) {
      try {
        let region = lead.region || null

        let type = null

        // ============================================
        // Buscar propriedade
        // ============================================

        if (lead.property) {
          const property = await Property.findById(lead.property)

          if (property) {
            region = property.location?.region || region

            type = property.type || null
          }
        }

        // ============================================
        // Distribuir
        // ============================================

        const result = await autoDistributeLead({
          leadId: lead._id,

          propertyId: lead.property || null,

          region,

          type,

          createdBy: null,
        })

        results.push({
          leadId: lead._id,

          success: result.success,

          assignedTo: result.assignedTo?._id || null,

          inQueue: result.inQueue || false,
        })
      } catch (error) {
        console.error(`❌ Erro ao distribuir lead ${lead._id}:`, error)

        // ============================================
        // Registrar erro
        // ============================================

        try {
          await Lead.findByIdAndUpdate(lead._id, {
            $inc: {
              'distribution.attempts': 1,
            },

            $set: {
              'distribution.lastAttemptAt': new Date(),

              'distribution.errorMessage': error.message,
            },
          })
        } catch (updateError) {
          console.error(
            `❌ Erro ao registrar falha do lead ${lead._id}:`,
            updateError.message,
          )
        }

        results.push({
          leadId: lead._id,

          success: false,

          error: error.message,
        })
      }
    }

    // ============================================
    // Estatísticas
    // ============================================

    const successCount = results.filter((result) => result.success).length

    const queueCount = results.filter((result) => result.inQueue).length

    const errorCount = results.filter(
      (result) => !result.success && !result.inQueue,
    ).length

    console.log(
      `✅ ${successCount}/${results.length} leads distribuídos com sucesso.`,
    )

    console.log(`⏳ ${queueCount} leads enviados para fila.`)

    console.log(`❌ ${errorCount} leads apresentaram erro.`)

    return {
      success: true,

      totalProcessed: pendingLeads.length,

      distributed: successCount,

      queued: queueCount,

      errors: errorCount,

      results,
    }
  } catch (error) {
    console.error('❌ Erro ao processar leads pendentes:', error)

    throw error
  }
}

/* ============================================================
   REATRIBUIR LEAD
============================================================ */

export async function reassignLead(leadId, reason, userId) {
  const session = await mongoose.startSession()

  try {
    // ============================================
    // Validar leadId
    // ============================================

    if (!leadId) {
      throw new AppError('ID do lead é obrigatório.', 400)
    }

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      throw new AppError('ID do lead inválido.', 400)
    }

    // ============================================
    // Iniciar transação
    // ============================================

    session.startTransaction()

    // ============================================
    // Buscar lead
    // ============================================

    const lead = await Lead.findById(leadId).session(session)

    if (!lead) {
      throw new AppError('Lead não encontrado.', 404)
    }

    // ============================================
    // Remover corretor anterior
    // ============================================

    const previousBroker = lead.assignedTo

    if (previousBroker) {
      await User.findByIdAndUpdate(
        previousBroker,
        {
          $inc: {
            'leadCounters.activeLeads': -1,
          },
        },
        {
          session,
        },
      )
    }

    // ============================================
    // Resetar lead
    // ============================================

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

    await lead.save({
      session,
    })

    // ============================================
    // Commit
    // ============================================

    await session.commitTransaction()

    console.log(
      `🔄 Lead ${leadId} preparado para nova distribuição. Motivo: ${
        reason || 'Reatribuição manual'
      }`,
    )

    /**
     * IMPORTANTE:
     *
     * A sessão anterior precisa ser encerrada
     * antes de iniciar a nova distribuição.
     */
    await session.endSession()

    // ============================================
    // Redistribuir
    // ============================================

    return await autoDistributeLead({
      leadId,

      propertyId: lead.property || null,

      region: lead.region || null,

      createdBy: userId || null,
    })
  } catch (error) {
    // ============================================
    // Rollback
    // ============================================

    if (session.inTransaction()) {
      await session.abortTransaction()
    }

    console.error('❌ Erro ao reatribuir lead:', error)

    throw error
  } finally {
    /**
     * Caso a sessão ainda esteja aberta,
     * garantimos o encerramento.
     */
    if (session) {
      try {
        await session.endSession()
      } catch (sessionError) {
        console.error(
          '⚠️ Erro ao encerrar sessão de reatribuição:',
          sessionError.message,
        )
      }
    }
  }
}
