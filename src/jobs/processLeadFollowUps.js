import LeadFollowUp from '../models/LeadFollowUp.js'
import Lead from '../models/Lead.js'
import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'

import { sendWhatsAppMessage } from '../service/chatService.js'
import { autoDistributeLead } from '../service/leadDistributionService.js'

import { LEAD_STATUS } from '../constants/leadStatus.js'
import { LEAD_STAGES } from '../constants/leadStages.js'

// ============================================================
// CONFIGURAÇÕES
// ============================================================

const BATCH_SIZE = 20
const RETRY_DELAY_MS = 5 * 60 * 1000
const STALE_PROCESSING_MS = 30 * 60 * 1000

const TERMINAL_STATUSES = [LEAD_STATUS.CONVERTED, LEAD_STATUS.LOST]

const TERMINAL_STAGES = [LEAD_STAGES.WON, LEAD_STAGES.LOST]

const FOLLOW_UP_TIMEZONE =
  process.env.LEAD_FOLLOWUPS_TIMEZONE || 'America/Sao_Paulo'
const SEND_WINDOW_START_MINUTES = 9 * 60
const SEND_WINDOW_END_MINUTES = 18 * 60

const isWithinSendWindow = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: FOLLOW_UP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const hour = Number(parts.find((part) => part.type === 'hour')?.value)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value)
  const minuteOfDay = hour * 60 + minute

  return (
    minuteOfDay >= SEND_WINDOW_START_MINUTES &&
    minuteOfDay < SEND_WINDOW_END_MINUTES
  )
}

// Simulação ativada por padrão.
// Para um envio individual, configure DRY_RUN=false e TEST_ID com o ID do follow-up.
// Sem TEST_ID, envios reais exigem ALLOW_BULK_SEND=true.
const isDryRun = () =>
  String(process.env.LEAD_FOLLOWUPS_DRY_RUN || 'true')
    .trim()
    .toLowerCase() !== 'false'

// ============================================================
// CONTROLE DE EXECUÇÃO
// ============================================================

let isRunning = false

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

const toId = (value) => {
  if (!value) return null

  return String(value._id || value)
}

const isTerminalLead = (lead) =>
  TERMINAL_STATUSES.includes(lead.status) ||
  TERMINAL_STAGES.includes(lead.stage)

const cancelFollowUp = async (followUp, reason) => {
  return LeadFollowUp.updateOne(
    {
      _id: followUp._id,
      status: 'processing',
    },
    {
      $set: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: reason,
        processingAt: null,
        lastError: '',
      },
    },
  )
}

const releaseFollowUp = async (followUp, errorMessage = '') => {
  const nextAttempt = new Date(Date.now() + RETRY_DELAY_MS)

  return LeadFollowUp.updateOne(
    {
      _id: followUp._id,
      status: 'processing',
    },
    {
      $set: {
        status: 'pending',
        scheduledAt: nextAttempt,
        processingAt: null,
        lastError: errorMessage,
      },
    },
  )
}

const failFollowUp = async (followUp, error) => {
  const message = String(error?.message || error || 'Erro desconhecido')

  return LeadFollowUp.updateOne(
    {
      _id: followUp._id,
      status: 'processing',
    },
    {
      $set: {
        status: 'failed',
        processingAt: null,
        lastError: message,
      },
      $inc: {
        attempts: 1,
      },
    },
  )
}

// ============================================================
// RESERVAR FOLLOW-UP
// ============================================================

const claimNextFollowUp = async () => {
  const now = new Date()

  if (!isWithinSendWindow(now)) {
    console.log(
      `[LeadFollowUp] Fora da janela de envio (09:00–18:00, ${FOLLOW_UP_TIMEZONE}). A fila será mantida para a próxima execução dentro da janela.`,
    )
    return null
  }
  const dryRun = isDryRun()
  const testFollowUpId = String(process.env.LEAD_FOLLOWUPS_TEST_ID || '').trim()

  let filter = {
    status: 'pending',
    scheduledAt: { $lte: now },
  }

  if (!dryRun && testFollowUpId) {
    // Modo de teste individual: só permite reservar exatamente o ID indicado.
    // Também aceita 'simulated' para reprocessar o follow-up que foi simulado
    // anteriormente. Nunca amplia a consulta para outros registros.
    if (!/^[a-f\d]{24}$/i.test(testFollowUpId)) {
      console.error(
        '[LeadFollowUp] TEST_ID inválido. Informe o ObjectId de 24 caracteres hexadecimais.',
      )
      return null
    }

    filter = {
      _id: testFollowUpId,
      status: { $in: ['pending', 'simulated'] },
      scheduledAt: { $lte: now },
    }
  } else if (!dryRun) {
    const allowBulkSend =
      String(process.env.LEAD_FOLLOWUPS_ALLOW_BULK_SEND || '')
        .trim()
        .toLowerCase() === 'true'

    if (!allowBulkSend) {
      console.warn(
        '[LeadFollowUp] Envio real bloqueado. Para um teste isolado, defina ' +
          'LEAD_FOLLOWUPS_TEST_ID com o ID de um único follow-up; ' +
          'para autorizar a fila inteira, defina LEAD_FOLLOWUPS_ALLOW_BULK_SEND=true.',
      )
      return null
    }
  }

  const candidate = await LeadFollowUp.findOne(filter)
    .sort({
      scheduledAt: 1,
      createdAt: 1,
    })
    .select('_id status scheduledAt step')
    .lean()

  // Não tenta acessar candidate._id quando nenhum registro é encontrado.
  if (!candidate) {
    if (!dryRun && testFollowUpId) {
      const diagnostic = await LeadFollowUp.findById(testFollowUpId)
        .select('_id status scheduledAt step')
        .lean()

      console.warn('[LeadFollowUp] Diagnóstico do teste individual:', {
        configuredId: testFollowUpId,
        recordFound: Boolean(diagnostic),
        recordStatus: diagnostic?.status ?? null,
        scheduledAt: diagnostic?.scheduledAt ?? null,
        step: diagnostic?.step ?? null,
        currentTime: now,
        eligibleStatuses: ['pending', 'simulated'],
        reason: !diagnostic
          ? 'Follow-up não encontrado.'
          : !['pending', 'simulated'].includes(diagnostic.status)
            ? 'Status não elegível para envio individual.'
            : diagnostic.scheduledAt > now
              ? 'Follow-up ainda não chegou ao horário agendado.'
              : 'Follow-up não está elegível; confira o registro.',
      })
    }

    return null
  }

  // Reserva condicional para evitar que dois ciclos processem
  // simultaneamente o mesmo follow-up.
  const eligibleStatuses =
    !dryRun && testFollowUpId ? ['pending', 'simulated'] : ['pending']

  const claimedFollowUp = await LeadFollowUp.findOneAndUpdate(
    {
      _id: candidate._id,
      status: { $in: eligibleStatuses },
      scheduledAt: { $lte: now },
    },
    {
      $set: {
        status: 'processing',
        processingAt: now,
      },
    },
    {
      new: true,
    },
  )

  // Outro processo pode ter reservado o registro entre as consultas.
  if (!claimedFollowUp) {
    console.warn(
      '[LeadFollowUp] O registro não pôde ser reservado; ' +
        'pode ter sido processado por outra execução.',
      {
        followUpId: String(candidate._id),
      },
    )

    return null
  }

  return claimedFollowUp
}

// ============================================================
// REGISTROS PRESOS EM PROCESSING
// ============================================================

// Um registro antigo pode ter sido enviado ao WhatsApp antes
// de uma falha no banco. Não o devolvemos automaticamente
// para pending, pois isso pode duplicar uma mensagem real.

const reportStaleProcessing = async () => {
  const cutoff = new Date(Date.now() - STALE_PROCESSING_MS)

  const staleCount = await LeadFollowUp.countDocuments({
    status: 'processing',
    processingAt: { $lte: cutoff },
  })

  if (staleCount > 0) {
    console.warn(
      `[LeadFollowUp] ${staleCount} registro(s) em processing há mais de 30 minutos. Verifique antes de reprocessar para evitar mensagens duplicadas.`,
    )
  }
}

// ============================================================
// VALIDAR LEAD, CONVERSA E INTEGRAÇÃO
// ============================================================

const getLeadAndConversation = async (followUp) => {
  const lead = await Lead.findById(followUp.lead)
    .select(
      'name phone phoneNormalized status stage assignedTo createdBy stageHistory lastContactAt followUpAutomation sourceType isDistributed property region isTestLead whatsappConsent isDeleted',
    )
    .populate('assignedTo', '_id name role isAdmin')
    .lean()

  if (!lead) {
    return {
      reason: 'Lead inexistente ou excluído.',
    }
  }

  if (lead.isDeleted || lead.isTestLead === true) {
    return {
      reason: 'Lead excluído ou identificado como teste; envio bloqueado.',
    }
  }

  if (
    lead.whatsappConsent?.status !== 'granted' ||
    lead.whatsappConsent?.revokedAt
  ) {
    return { reason: 'Sem consentimento válido para contato por WhatsApp.' }
  }

  if (isTerminalLead(lead)) {
    return {
      reason: 'Lead convertido ou perdido; follow-up cancelado.',
    }
  }

  const conversation = await Conversation.findOne({
    channel: 'whatsapp',
    lead: lead._id,
    whatsappIntegration: followUp.integration,
    isActive: true,
  })
    .populate('whatsappContact')
    .populate('whatsappIntegration')
    .populate('assignedTo', '_id name role isAdmin')
    .lean()

  if (!conversation) {
    return {
      error:
        'Não foi encontrada uma conversa WhatsApp ativa para este lead e integração.',
    }
  }

  const contact = conversation.whatsappContact
  const integration = conversation.whatsappIntegration

  if (!contact || contact.isActive === false) {
    return {
      error: 'Contato WhatsApp ausente ou inativo.',
    }
  }

  if (!integration || integration.enabled !== true) {
    return {
      error: 'Integração WhatsApp desativada ou inexistente.',
    }
  }

  if (integration.status !== 'connected') {
    return {
      error: 'A integração WhatsApp não está conectada.',
    }
  }

  const sender = conversation.assignedTo || lead.assignedTo || null

  return {
    lead,
    conversation,
    sender,
  }
}

// ============================================================
// VERIFICAR RESPOSTA DO LEAD
// ============================================================

const hasLeadReplied = async (followUp, conversation) => {
  const inboundReply = await Message.exists({
    conversation: conversation._id,
    direction: 'inbound',
    senderType: 'whatsapp_contact',
    isDeleted: { $ne: true },
    createdAt: {
      $gte: followUp.createdAt,
    },
  })

  return Boolean(inboundReply)
}

// ============================================================
// CANCELAR SEQUÊNCIA E TRATAR RESPOSTA
// ============================================================

const handleLeadReply = async (lead, reason) => {
  const now = new Date()

  // Apenas uma execução pode efetuar a transição.
  const updatedLead = await Lead.findOneAndUpdate(
    {
      _id: lead._id,
      'followUpAutomation.status': 'active',
    },
    {
      $set: {
        'followUpAutomation.status': 'replied',
        'followUpAutomation.repliedAt': now,
      },
    },
    {
      new: true,
    },
  )

  await LeadFollowUp.updateMany(
    {
      lead: lead._id,
      status: {
        $in: ['pending', 'processing', 'simulated', 'failed'],
      },
    },
    {
      $set: {
        status: 'cancelled',
        cancelledAt: now,
        cancelReason: reason,
        processingAt: null,
      },
    },
  )

  if (!updatedLead) {
    return {
      distributed: false,
      alreadyHandled: true,
    }
  }

  // Fallback: se o agendador detectar a resposta antes do webhook
  // executar essa transição, qualifica apenas etapas iniciais.
  const earlyStages = [LEAD_STAGES.NEW, LEAD_STAGES.FIRST_CONTACT]
  if (earlyStages.includes(updatedLead.stage)) {
    const previousStage = updatedLead.stage
    updatedLead.stage = LEAD_STAGES.QUALIFIED
    updatedLead.status = LEAD_STATUS.IN_PROGRESS
    updatedLead.lastContactAt = now

    const changedBy =
      updatedLead.assignedTo?._id ||
      updatedLead.assignedTo ||
      updatedLead.createdBy ||
      null
    if (changedBy) {
      updatedLead.stageHistory = updatedLead.stageHistory || []
      updatedLead.stageHistory.push({
        from: previousStage,
        to: LEAD_STAGES.QUALIFIED,
        stage: LEAD_STAGES.QUALIFIED,
        changedBy,
        reason: 'Lead respondeu pelo WhatsApp.',
        changedAt: now,
      })
    }

    await updatedLead.save()
  }

  // Preserva leads já atribuídos e leads do hotsite.
  if (
    updatedLead.assignedTo ||
    updatedLead.isDistributed ||
    updatedLead.sourceType === 'broker_hotsite'
  ) {
    return {
      distributed: false,
      alreadyHandled: false,
    }
  }

  try {
    const distributionResult = await autoDistributeLead({
      leadId: updatedLead._id,
      propertyId: updatedLead.property || null,
      region: updatedLead.region || null,
      createdBy: null,
    })

    return {
      distributed: Boolean(distributionResult?.success),
      distributionResult,
    }
  } catch (error) {
    console.error(
      `[LeadFollowUp] Resposta registrada, mas a distribuição falhou para ${lead._id}:`,
      error.message,
    )

    return {
      distributed: false,
      distributionError: error.message,
    }
  }
}

// ============================================================
// CONCLUIR SEQUÊNCIA NO D10
// ============================================================

const completeSequenceIfD10 = async (leadId, step) => {
  if (step !== 'D10') {
    return
  }

  const result = await Lead.updateOne(
    {
      _id: leadId,
      'followUpAutomation.status': 'active',
    },
    {
      $set: {
        'followUpAutomation.status': 'completed',
        'followUpAutomation.completedAt': new Date(),
      },
    },
  )

  if (result.modifiedCount > 0) {
    console.log(
      `[LeadFollowUp] Sequência D10 concluída para ${leadId}; manter para acompanhamento administrativo.`,
    )
  }
}

// ============================================================
// PROCESSAR UM FOLLOW-UP
// ============================================================

const processOneFollowUp = async (followUp) => {
  let sendAttemptStarted = false

  try {
    const result = await getLeadAndConversation(followUp)

    if (result.reason) {
      await cancelFollowUp(followUp, result.reason)

      return {
        status: 'cancelled',
        reason: result.reason,
      }
    }

    if (result.error) {
      await releaseFollowUp(followUp, result.error)

      return {
        status: 'pending',
        reason: result.error,
      }
    }

    const { lead, conversation, sender } = result

    // Confirma se o registro continua reservado.
    const currentFollowUp = await LeadFollowUp.findOne({
      _id: followUp._id,
      status: 'processing',
    })
      .select('_id')
      .lean()

    if (!currentFollowUp) {
      return {
        status: 'cancelled',
        reason: 'O registro deixou de estar em processamento.',
      }
    }

    // Não envia se o cliente respondeu.
    const replied = await hasLeadReplied(followUp, conversation)

    if (replied) {
      const reason = 'O lead respondeu durante a sequência de follow-up.'

      const replyResult = await handleLeadReply(lead, reason)

      await cancelFollowUp(followUp, reason)

      return {
        status: 'cancelled',
        reason,
        distributed: replyResult.distributed,
      }
    }

    const message = String(followUp.message || '').trim()

    if (!message) {
      const error = new Error('O texto do follow-up está vazio.')

      await failFollowUp(followUp, error)

      return {
        status: 'failed',
        reason: error.message,
      }
    }

    // --------------------------------------------------------
    // MODO DE SIMULAÇÃO
    // --------------------------------------------------------

    if (isDryRun()) {
      console.log('[LeadFollowUp][SIMULAÇÃO]', {
        followUpId: toId(followUp._id),
        leadId: toId(lead._id),
        leadName: lead.name,
        step: followUp.step,
        scheduledAt: followUp.scheduledAt,
        conversationId: toId(conversation._id),
        integrationId: toId(followUp.integration),
        message,
      })

      const updateResult = await LeadFollowUp.updateOne(
        {
          _id: followUp._id,
          status: 'processing',
        },
        {
          $set: {
            status: 'simulated',
            processingAt: null,
            lastError: '',
          },
        },
      )

      if (updateResult.modifiedCount === 0) {
        throw new Error('Não foi possível registrar a simulação do follow-up.')
      }

      // Uma simulação nunca conclui definitivamente o D10.
      return {
        status: 'simulated',
      }
    }

    // --------------------------------------------------------
    // ENVIO REAL
    // --------------------------------------------------------

    if (!sender?._id) {
      const errorMessage =
        'Envio real bloqueado: não há corretor responsável para autorizar o envio pelo chat.'

      await releaseFollowUp(followUp, errorMessage)

      return {
        status: 'pending',
        reason: errorMessage,
      }
    }

    // Impede que uma resposta registrada antes do envio passe
    // despercebida durante o processamento.
    const repliedBeforeSend = await hasLeadReplied(followUp, conversation)

    if (repliedBeforeSend) {
      const reason = 'O lead respondeu antes do envio do follow-up.'

      const replyResult = await handleLeadReply(lead, reason)

      await cancelFollowUp(followUp, reason)

      return {
        status: 'cancelled',
        reason,
        distributed: replyResult.distributed,
      }
    }

    // Se o serviço lançar erro após o início do envio, não
    // presumimos que a mensagem deixou de ser enviada.
    sendAttemptStarted = true

    const sendResult = await sendWhatsAppMessage({
      conversationId: toId(conversation._id),
      senderId: toId(sender._id),
      content: message,
      type: 'text',
      attachment: null,
      replyTo: null,
      mentions: [],
    })

    // O serviço deve rejeitar a Promise quando o envio falhar.
    // Confirme seu contrato antes de habilitar produção.
    const updateResult = await LeadFollowUp.updateOne(
      {
        _id: followUp._id,
        status: 'processing',
      },
      {
        $set: {
          status: 'sent',
          sentAt: new Date(),
          processingAt: null,
          lastError: '',
        },
        $inc: {
          attempts: 1,
        },
      },
    )

    if (updateResult.modifiedCount === 0) {
      console.error(
        '[LeadFollowUp] ATENÇÃO: o envio retornou, mas o status não foi atualizado. Verifique o WhatsApp antes de reprocessar.',
        {
          followUpId: toId(followUp._id),
          leadId: toId(lead._id),
        },
      )

      return {
        status: 'failed',
        reason:
          'Envio retornou, mas o estado não foi atualizado. Revisão manual necessária.',
      }
    }

    console.log('[LeadFollowUp] Mensagem enviada:', {
      followUpId: toId(followUp._id),
      leadId: toId(lead._id),
      step: followUp.step,
      providerResult: sendResult ? 'retornado' : 'sem retorno',
    })

    await completeSequenceIfD10(lead._id, followUp.step)

    return {
      status: 'sent',
    }
  } catch (error) {
    console.error('[LeadFollowUp] Erro ao processar acompanhamento:', {
      followUpId: toId(followUp._id),
      message: error.message,
      sendAttemptStarted,
    })

    // Se o envio já começou, não liberamos automaticamente
    // o registro: o provedor pode ter aceitado a mensagem.
    if (sendAttemptStarted && !isDryRun()) {
      try {
        await LeadFollowUp.updateOne(
          {
            _id: followUp._id,
            status: 'processing',
          },
          {
            $set: {
              lastError: `Resultado do envio incerto; revisão manual necessária: ${error.message}`,
            },
          },
        )
      } catch (updateError) {
        console.error(
          '[LeadFollowUp] Não foi possível registrar a incerteza do envio:',
          updateError.message,
        )
      }

      return {
        status: 'failed',
        reason:
          'Resultado do envio incerto; verifique a conversa antes de tentar novamente.',
      }
    }

    try {
      await failFollowUp(followUp, error)
    } catch (updateError) {
      console.error(
        '[LeadFollowUp] Falha ao atualizar estado:',
        updateError.message,
      )
    }

    return {
      status: 'failed',
      reason: error.message,
    }
  }
}

// ============================================================
// EXECUÇÃO DO LOTE
// ============================================================

export const processLeadFollowUps = async () => {
  if (isRunning) {
    return {
      skipped: true,
      reason: 'Processamento já em andamento neste processo.',
    }
  }

  isRunning = true

  const summary = {
    processed: 0,
    simulated: 0,
    sent: 0,
    cancelled: 0,
    failed: 0,
    pending: 0,
  }

  try {
    if (mongooseReadyState() !== 1) {
      return {
        ...summary,
        skipped: true,
        reason: 'MongoDB indisponível.',
      }
    }

    await reportStaleProcessing()

    for (let index = 0; index < BATCH_SIZE; index += 1) {
      const followUp = await claimNextFollowUp()

      if (!followUp) {
        break
      }

      summary.processed += 1

      const result = await processOneFollowUp(followUp)

      if (result.status === 'simulated') {
        summary.simulated += 1
      } else if (result.status === 'sent') {
        summary.sent += 1
      } else if (result.status === 'cancelled') {
        summary.cancelled += 1
      } else if (result.status === 'failed') {
        summary.failed += 1
      } else if (result.status === 'pending') {
        summary.pending += 1
      }
    }

    if (summary.processed > 0) {
      console.log('[LeadFollowUp] Resumo:', summary)
    }

    return summary
  } finally {
    isRunning = false
  }
}

// Mantém a conexão sob responsabilidade do server.js.
function mongooseReadyState() {
  return LeadFollowUp.db.readyState
}

export default processLeadFollowUps
