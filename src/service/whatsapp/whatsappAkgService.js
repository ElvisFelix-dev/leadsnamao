import axios from 'axios'
import crypto from 'crypto'

import WhatsAppIntegration from '../../models/WhatsAppIntegration.js'
import WhatsAppContact from '../../models/WhatsAppContact.js'
import Conversation from '../../models/Conversation.js'
import Lead from '../../models/Lead.js'
import AppError from '../../utils/AppError.js'

import { normalizePhone } from '../../utils/phone.js'

import * as chatService from '../chatService.js'

// ============================================================
// HELPERS
// ============================================================

const normalizeBaseUrl = (value) => String(value || '').replace(/\/+$/, '')

const toJid = (phone) => {
  const normalized = normalizePhone(phone)

  if (!normalized) {
    throw new AppError('Número de WhatsApp inválido.', 400)
  }

  return normalized.endsWith('@s.whatsapp.net')
    ? normalized
    : `${normalized}@s.whatsapp.net`
}

// ============================================================
// WHATSAPP CONTACT
// ============================================================

const upsertWhatsAppContact = async ({
  integrationId,
  remoteJid,
  name = '',
  isGroup = false,
  metadata = {},
}) => {
  if (!integrationId) {
    throw new Error('Integration ID é obrigatório para criar contato WhatsApp.')
  }

  if (!remoteJid) {
    throw new Error('remoteJid é obrigatório para criar contato WhatsApp.')
  }

  const phone = remoteJid.split('@')[0].replace(/\D/g, '')

  const contact = await WhatsAppContact.findOneAndUpdate(
    {
      integration: integrationId,
      remoteJid,
    },
    {
      $set: {
        phone,
        name: name?.trim() || '',
        isGroup: Boolean(isGroup),
        lastMessageAt: new Date(),
        isActive: true,
        metadata,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  )

  return contact
}

// ============================================================
// WHATSAPP CONVERSATION
// ============================================================

const upsertWhatsAppConversation = async ({
  whatsappContactId,
  contactName = '',
}) => {
  if (!whatsappContactId) {
    throw new Error('WhatsApp Contact ID é obrigatório para criar a conversa.')
  }

  let conversation = await Conversation.findOne({
    channel: 'whatsapp',
    whatsappContact: whatsappContactId,
    isActive: true,
  })

  if (conversation) {
    return conversation
  }

  conversation = await Conversation.create({
    // Conversas WhatsApp ainda não possuem corretor atribuído.
    // A distribuição será tratada posteriormente.
    participants: [],

    channel: 'whatsapp',

    type: 'direct',

    name: contactName?.trim() || 'Novo contato WhatsApp',

    avatar: '',

    lastMessage: '',

    lastMessageAt: new Date(),

    lastMessageFrom: null,

    unreadCounts: new Map(),

    isActive: true,

    isBrokerChannel: false,

    createdBy: null,

    whatsappContact: whatsappContactId,

    metadata: {
      provider: 'wa-akg',
    },
  })

  return conversation
}

// ============================================================
// INTEGRATION
// ============================================================

const getIntegrationWithSecrets = async (integrationId = null) => {
  const query = {
    enabled: true,
  }

  if (integrationId) {
    query._id = integrationId
  }

  const integration = await WhatsAppIntegration.findOne(query).select(
    '+apiKey +webhookSecret',
  )

  if (!integration) {
    throw new AppError(
      integrationId
        ? 'Integração WhatsApp não encontrada ou desativada.'
        : 'Nenhuma integração WhatsApp ativa foi configurada.',
      404,
    )
  }

  return integration
}

// ============================================================
// CREATE INTEGRATION
// ============================================================

export const createIntegration = async ({
  name,
  baseUrl,
  apiKey,
  sessionId,
  webhookSecret = '',
}) => {
  if (!name?.trim()) {
    throw new AppError('Nome da integração é obrigatório.', 400)
  }

  if (!baseUrl?.trim()) {
    throw new AppError('URL do WA-AKG é obrigatória.', 400)
  }

  if (!apiKey?.trim()) {
    throw new AppError('API Key do WA-AKG é obrigatória.', 400)
  }

  if (!sessionId?.trim()) {
    throw new AppError('Session ID do WA-AKG é obrigatório.', 400)
  }

  const integration = await WhatsAppIntegration.create({
    name: name.trim(),
    baseUrl: normalizeBaseUrl(baseUrl),
    apiKey: apiKey.trim(),
    sessionId: sessionId.trim(),
    webhookSecret: webhookSecret?.trim() || '',
  })

  return integration
}

// ============================================================
// LIST INTEGRATIONS
// ============================================================

export const listIntegrations = async () => {
  return WhatsAppIntegration.find()
    .select('-apiKey -webhookSecret')
    .sort({ createdAt: -1 })
    .lean()
}

// ============================================================
// SEND TEXT MESSAGE
// ============================================================

export const sendTextMessage = async ({
  integrationId = null,
  phone,
  message,
}) => {
  if (!message?.trim()) {
    throw new AppError('Mensagem é obrigatória.', 400)
  }

  const integration = await getIntegrationWithSecrets(integrationId)

  const jid = toJid(phone)

  const url = `${normalizeBaseUrl(
    integration.baseUrl,
  )}/api/messages/${encodeURIComponent(
    integration.sessionId,
  )}/${encodeURIComponent(jid)}/send`

  try {
    const response = await axios.post(
      url,
      {
        message: {
          text: message.trim(),
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': integration.apiKey,
        },
        timeout: 15000,
      },
    )

    await WhatsAppIntegration.updateOne(
      {
        _id: integration._id,
      },
      {
        $set: {
          status: 'connected',
          lastError: '',
          lastCheckedAt: new Date(),
        },
      },
    )

    return {
      integrationId: integration._id,

      integrationName: integration.name,

      sessionId: integration.sessionId,

      phone: normalizePhone(phone),

      jid,

      providerResponse: response.data,
    }
  } catch (error) {
    const status = error.response?.status || null

    const providerMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Erro desconhecido ao comunicar com o WA-AKG.'

    await WhatsAppIntegration.updateOne(
      {
        _id: integration._id,
      },
      {
        $set: {
          status: 'error',
          lastError: String(providerMessage).slice(0, 1000),
          lastCheckedAt: new Date(),
        },
      },
    )

    console.error('❌ Erro ao enviar mensagem pelo WA-AKG:', {
      integrationId: integration._id.toString(),

      sessionId: integration.sessionId,

      status,

      message: providerMessage,
    })

    throw new AppError(
      `WA-AKG não conseguiu enviar a mensagem${
        status ? ` (HTTP ${status})` : ''
      }: ${providerMessage}`,
      status && status >= 400 && status < 500 ? status : 502,
    )
  }
}

// ============================================================
// GET INTEGRATION SECRETS
// ============================================================

export const getIntegrationSecrets = async (integrationId) => {
  const integration = await WhatsAppIntegration.findById(integrationId).select(
    '+apiKey +webhookSecret',
  )

  if (!integration) {
    throw new AppError('Integração WhatsApp não encontrada.', 404)
  }

  return integration
}

// ============================================================
// GET QR CODE / SESSION
// ============================================================

export const getQrCode = async ({ integrationId = null }) => {
  const integration = await getIntegrationWithSecrets(integrationId)

  const url = `${normalizeBaseUrl(
    integration.baseUrl,
  )}/api/sessions/${encodeURIComponent(integration.sessionId)}`

  try {
    const response = await axios.get(url, {
      headers: {
        'X-API-Key': integration.apiKey,
      },
      timeout: 15000,
    })

    const session = response.data?.data

    return {
      integrationId: integration._id,

      integrationName: integration.name,

      sessionId: integration.sessionId,

      status: session?.status || null,

      qr: session?.qr || null,

      me: session?.me || null,
    }
  } catch (error) {
    const status = error.response?.status || null

    const providerMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Erro desconhecido ao obter os dados da sessão.'

    console.error('❌ Erro ao obter sessão do WA-AKG:', {
      integrationId: integration._id.toString(),

      sessionId: integration.sessionId,

      status,

      message: providerMessage,
    })

    throw new AppError(
      `WA-AKG não conseguiu obter a sessão${
        status ? ` (HTTP ${status})` : ''
      }: ${providerMessage}`,
      status && status >= 400 && status < 500 ? status : 502,
    )
  }
}

// ============================================================
// WEBHOOK SIGNATURE
// ============================================================

const verifyWebhookSignature = ({ rawBody, signature, secret }) => {
  if (!secret) {
    throw new AppError(
      'Webhook secret não configurado para esta integração.',
      500,
    )
  }

  if (!signature) {
    throw new AppError('Assinatura do webhook não informada.', 401)
  }

  const receivedSignature = String(signature).replace(/^sha256=/, '')

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  console.log('🔐 WEBHOOK SIGNATURE DEBUG')

  console.log('Received:', receivedSignature)

  console.log('Expected:', expectedSignature)

  console.log('Raw body:', rawBody.toString('utf8'))

  console.log('Raw body length:', rawBody.length)

  console.log('================================')

  const receivedBuffer = Buffer.from(receivedSignature, 'hex')

  const expectedBuffer = Buffer.from(expectedSignature, 'hex')

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    throw new AppError('Assinatura do webhook inválida.', 401)
  }

  return true
}

// ============================================================
// WEBHOOK
// ============================================================

export const handleWebhook = async ({ rawBody, body, signature }) => {
  if (!rawBody) {
    throw new AppError('Corpo bruto do webhook não disponível.', 400)
  }

  let payload = body

  if (!payload || Buffer.isBuffer(payload)) {
    try {
      payload = JSON.parse(rawBody.toString('utf8'))
    } catch {
      throw new AppError('Payload do webhook inválido.', 400)
    }
  }

  const sessionId = payload?.sessionId

  if (!sessionId) {
    throw new AppError('sessionId não informado no webhook.', 400)
  }

  const integration = await WhatsAppIntegration.findOne({
    sessionId,
    enabled: true,
  }).select('+webhookSecret')

  if (!integration) {
    throw new AppError(
      'Integração WhatsApp não encontrada para esta sessão.',
      404,
    )
  }

  // ==========================================================
  // HMAC
  // ==========================================================

  verifyWebhookSignature({
    rawBody,
    signature,
    secret: integration.webhookSecret,
  })

  console.log('')

  console.log('==========================================')

  console.log('📩 WEBHOOK WHATSAPP RECEBIDO')

  console.log('==========================================')

  console.log('Integração:', integration.name)

  console.log('Session ID:', sessionId)

  console.log('Evento:', payload.event)

  console.log('Timestamp:', payload.timestamp)

  console.log('==========================================')

  let contact = null
  let conversation = null
  let message = null

  // ==========================================================
  // MESSAGE RECEIVED
  // ==========================================================

  if (payload.event === 'message.received') {
    const data = payload.data || {}

    // ========================================================
    // REMOTE JID
    // ========================================================

    const remoteJid = data.key?.remoteJid || data.remoteJid || data.from || ''

    console.log('📱 Mensagem recebida')

    console.log('From:', data.from)

    console.log('Remote JID:', remoteJid)

    console.log('Nome:', data.pushName)

    console.log('Tipo:', data.type)

    console.log('Mensagem:', data.content)

    console.log('Grupo:', data.isGroup)

    // ========================================================
    // VALIDAR REMOTE JID
    // ========================================================

    if (!remoteJid) {
      console.warn('⚠️ Mensagem recebida sem remoteJid. Evento será ignorado.')
    } else {
      // ======================================================
      // NORMALIZAR TELEFONE
      // ======================================================

      const phone = normalizePhone(remoteJid.split('@')[0])

      console.log('')

      console.log('🔎 BUSCA DE LEAD')

      console.log('==========================================')

      console.log('Remote JID:', remoteJid)

      console.log('Telefone normalizado:', phone)

      console.log('==========================================')

      // ======================================================
      // BUSCAR LEAD
      // ======================================================

      const lead = phone ? await Lead.findByNormalizedPhone(phone) : null

      // ======================================================
      // PRIVACIDADE
      // ======================================================

      if (!lead) {
        console.log('')

        console.log('🔒 WHATSAPP IGNORADO')

        console.log('==========================================')

        console.log('Motivo: número não está vinculado a nenhum Lead.')

        console.log('Telefone:', phone || 'inválido')

        console.log('Remote JID:', remoteJid)

        console.log('Nome:', data.pushName || '')

        console.log('Nenhum WhatsAppContact foi criado.')

        console.log('Nenhuma Conversation foi criada.')

        console.log('Nenhuma Message foi criada.')

        console.log('==========================================')

        // IMPORTANTE:
        // O webhook retorna sucesso para o WA-AKG.
        // Assim o provedor não fica tentando reenviar
        // mensagens pessoais que o CRM decidiu ignorar.
      } else {
        // ====================================================
        // LEAD ENCONTRADO
        // ====================================================

        console.log('')

        console.log('✅ LEAD ENCONTRADO')

        console.log('==========================================')

        console.log('Lead ID:', lead._id.toString())

        console.log('Nome:', lead.name)

        console.log('Telefone:', lead.phone)

        console.log('Telefone normalizado:', lead.phoneNormalized)

        console.log('Assigned To:', lead.assignedTo || null)

        console.log('==========================================')

        // ====================================================
        // CONTATO
        // ====================================================

        contact = await upsertWhatsAppContact({
          integrationId: integration._id,

          remoteJid,

          name: data.pushName || lead.name || '',

          isGroup: Boolean(data.isGroup),

          metadata: {
            provider: 'wa-akg',

            chatType: data.chatType || '',

            leadId: lead._id.toString(),
          },
        })

        console.log('')

        console.log('👤 CONTATO WHATSAPP PERSISTIDO')

        console.log('==========================================')

        console.log('Contato ID:', contact._id.toString())

        console.log('Nome:', contact.name)

        console.log('Telefone:', contact.phone)

        console.log('Remote JID:', contact.remoteJid)

        console.log('Grupo:', contact.isGroup)

        console.log('Lead ID:', lead._id.toString())

        console.log('==========================================')

        // ====================================================
        // CONVERSATION
        // ====================================================

        conversation = await upsertWhatsAppConversation({
          whatsappContactId: contact._id,

          contactName: contact.name || lead.name || 'Lead WhatsApp',
        })

        console.log('')

        console.log('💬 CONVERSA WHATSAPP')

        console.log('==========================================')

        console.log('Conversation ID:', conversation._id.toString())

        console.log('Channel:', conversation.channel)

        console.log(
          'Contact ID:',
          conversation.whatsappContact?.toString() || null,
        )

        console.log('Participantes:', conversation.participants.length)

        console.log('Lead ID:', lead._id.toString())

        console.log('==========================================')

        // ====================================================
        // MESSAGE
        // ====================================================

        message = await chatService.receiveWhatsAppMessage({
          conversationId: conversation._id,

          whatsappContactId: contact._id,

          externalMessageId: data.key?.id || null,

          content: data.content || '',

          type:
            data.type === 'TEXT'
              ? 'text'
              : data.type === 'IMAGE'
                ? 'image'
                : data.type === 'FILE'
                  ? 'file'
                  : 'text',

          attachment: data.fileUrl
            ? {
                url: data.fileUrl,

                name: '',

                size: 0,

                mimeType: '',
              }
            : null,
        })

        // ====================================================
        // MESSAGE LOG
        // ====================================================

        console.log('')

        console.log('📝 MESSAGE WHATSAPP PERSISTIDA')

        console.log('==========================================')

        console.log('Message ID:', message._id.toString())

        console.log('Content:', message.content)

        console.log('Direction:', message.direction)

        console.log('Sender Type:', message.senderType)

        console.log(
          'WhatsApp Contact:',
          message.whatsappContact?._id?.toString?.() ||
            message.whatsappContact?.toString?.() ||
            null,
        )

        console.log('External ID:', message.externalMessageId)

        console.log('Status:', message.status)

        console.log('Lead ID:', lead._id.toString())

        console.log('==========================================')
      }
    }
  }

  // ==========================================================
  // MESSAGE SENT
  // ==========================================================

  if (payload.event === 'message.sent') {
    console.log('📤 Mensagem enviada')
  }

  // ==========================================================
  // CONNECTION UPDATE
  // ==========================================================

  if (payload.event === 'connection.update') {
    console.log('🔌 Atualização da conexão')
  }

  console.log('==========================================')

  console.log('')

  // ==========================================================
  // RESPONSE
  // ==========================================================

  return {
    received: true,

    event: payload.event,

    sessionId,

    integrationId: integration._id,

    contact: contact
      ? {
          id: contact._id,

          name: contact.name,

          phone: contact.phone,

          remoteJid: contact.remoteJid,

          isGroup: contact.isGroup,
        }
      : null,

    conversation: conversation
      ? {
          id: conversation._id,

          channel: conversation.channel,

          type: conversation.type,

          whatsappContact: conversation.whatsappContact,

          participants: conversation.participants,
        }
      : null,

    message: message
      ? {
          id: message._id,

          content: message.content,

          type: message.type,

          direction: message.direction,

          senderType: message.senderType,

          whatsappContact: message.whatsappContact,

          externalMessageId: message.externalMessageId,

          status: message.status,
        }
      : null,
  }
}

// ============================================================
// UPDATE WEBHOOK SECRET
// ============================================================

export const updateWebhookSecret = async ({ integrationId, webhookSecret }) => {
  if (!integrationId) {
    throw new AppError('ID da integração é obrigatório.', 400)
  }

  if (!webhookSecret?.trim()) {
    throw new AppError('Webhook secret é obrigatório.', 400)
  }

  const integration = await WhatsAppIntegration.findById(integrationId)

  if (!integration) {
    throw new AppError('Integração WhatsApp não encontrada.', 404)
  }

  integration.webhookSecret = webhookSecret.trim()

  await integration.save()

  console.log('🔐 Webhook secret atualizado:', {
    integrationId: integration._id.toString(),

    sessionId: integration.sessionId,
  })

  return {
    integrationId: integration._id,

    sessionId: integration.sessionId,

    updated: true,
  }
}
