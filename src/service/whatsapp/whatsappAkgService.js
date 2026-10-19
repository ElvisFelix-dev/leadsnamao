// src/service/whatsapp/whatsappAkgService.js

import axios from 'axios'
import mongoose from 'mongoose'

import crypto from 'crypto'
import { Readable } from 'node:stream'
import { cloudinary } from '../../utils/upload.js'

import WhatsAppIntegration from '../../models/WhatsAppIntegration.js'

import WhatsAppContact from '../../models/WhatsAppContact.js'

import Conversation from '../../models/Conversation.js'
import Message from '../../models/Message.js'

import Lead from '../../models/Lead.js'
import LeadFollowUp from '../../models/LeadFollowUp.js'

import AppError from '../../utils/AppError.js'

import { normalizePhone } from '../../utils/phone.js'

import { getSocketIO } from '../../sockets/index.js'

import * as chatService from '../chatService.js'

import { LEAD_STATUS } from '../../constants/leadStatus.js'

import { LEAD_STAGES } from '../../constants/leadStages.js'

// ==========================================================

// CONFIGURAÇÕES

// ==========================================================

const REQUEST_TIMEOUT = 20000

const ALLOWED_MEDIA_TYPES = ['image', 'audio', 'video', 'file', 'gif']

const inferMediaType = ({
  providerType = '',
  mimeType = '',
  url = '',
  messageObject = {},
}) => {
  const type = String(providerType || '').toLowerCase()
  const mime = String(mimeType || '').toLowerCase()
  const keys = Object.keys(messageObject || {})
    .join(' ')
    .toLowerCase()
  const pathname = String(url || '')
    .split('?')[0]
    .toLowerCase()

  if (
    type.includes('audio') ||
    mime.startsWith('audio/') ||
    keys.includes('audiomessage') ||
    /\.(ogg|opus|mp3|m4a|aac|wav|webm)$/.test(pathname)
  )
    return 'audio'
  if (
    type.includes('video') ||
    mime.startsWith('video/') ||
    keys.includes('videomessage') ||
    /\.(mp4|mov|avi|mkv)$/.test(pathname)
  )
    return 'video'
  if (
    type.includes('image') ||
    mime.startsWith('image/') ||
    keys.includes('imagemessage') ||
    /\.(jpg|jpeg|png|gif|webp)$/.test(pathname)
  )
    return 'image'
  if (
    type.includes('document') ||
    type.includes('file') ||
    mime.startsWith('application/') ||
    keys.includes('documentmessage') ||
    /\.(pdf|docx?|xlsx?|pptx?|zip|csv|txt)$/.test(pathname)
  )
    return 'file'
  return 'text'
}

const mimeFromExtension = (filename = '') => {
  const ext = String(filename).split('?')[0].split('.').pop()?.toLowerCase()
  const types = {
    ogg: 'audio/ogg',
    opus: 'audio/opus',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    wav: 'audio/wav',
    webm: 'audio/webm',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
    csv: 'text/csv',
    zip: 'application/zip',
  }
  return types[ext] || 'application/octet-stream'
}

const uploadBufferToCloudinary = (buffer, { filename, mimeType }) =>
  new Promise((resolve, reject) => {
    const resourceType = mimeType.startsWith('image/')
      ? 'image'
      : mimeType.startsWith('audio/') || mimeType.startsWith('video/')
        ? 'video'
        : 'raw'
    const publicId = `crm/chat-media/inbound-${Date.now()}-${crypto.randomUUID()}`
    const upload = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        public_id: publicId,
        use_filename: false,
        overwrite: false,
        filename_override: filename || undefined,
      },
      (error, result) => {
        if (error) return reject(error)
        if (!result?.secure_url)
          return reject(
            new Error(
              'Cloudinary não retornou secure_url para a mídia recebida.',
            ),
          )
        resolve({
          url: result.secure_url,
          size: Number(result.bytes || buffer.length),
          mimeType,
        })
      },
    )
    Readable.from(buffer).pipe(upload)
  })

const persistInboundMedia = async ({
  integration,
  url,
  filename,
  mimeType,
}) => {
  const rawUrl = String(url || '').trim()
  if (!rawUrl) return null

  // URLs externas já hospedadas não precisam ser baixadas novamente.
  let parsedUrl
  try {
    parsedUrl = new URL(rawUrl, normalizeBaseUrl(integration.baseUrl))
  } catch {
    throw new Error('URL de mídia recebida da WA-AKG inválida.')
  }

  const waBase = normalizeBaseUrl(integration.baseUrl)
  const isProviderMedia =
    rawUrl.startsWith('/') || parsedUrl.origin === new URL(waBase).origin
  if (!isProviderMedia) {
    return {
      url: parsedUrl.toString(),
      name: filename || parsedUrl.pathname.split('/').pop() || 'anexo',
      size: 0,
      mimeType: mimeType || mimeFromExtension(parsedUrl.pathname),
    }
  }

  const safePath = parsedUrl.pathname
  if (!safePath.startsWith('/api/media/') || safePath.includes('..')) {
    throw new Error(
      'O caminho de mídia recebido não é uma rota /api/media/ válida da WA-AKG.',
    )
  }

  const response = await axios.get(`${waBase}${safePath}${parsedUrl.search}`, {
    responseType: 'arraybuffer',
    timeout: REQUEST_TIMEOUT,
    maxContentLength: 50 * 1024 * 1024,
    headers: { 'X-API-Key': integration.apiKey, Accept: '*/*' },
    validateStatus: (status) => status >= 200 && status < 300,
  })

  const buffer = Buffer.from(response.data)
  if (!buffer.length)
    throw new Error('A WA-AKG retornou um arquivo de mídia vazio.')

  const resolvedMime = String(
    mimeType ||
      response.headers?.['content-type'] ||
      mimeFromExtension(filename || safePath),
  )
    .split(';')[0]
    .toLowerCase()
  const resolvedName =
    filename || decodeURIComponent(safePath.split('/').pop() || 'anexo')
  const uploaded = await uploadBufferToCloudinary(buffer, {
    filename: resolvedName,
    mimeType: resolvedMime,
  })
  return { ...uploaded, name: resolvedName }
}

// ==========================================================

// HELPERS

// ==========================================================

const normalizeBaseUrl = (url) => {
  // As rotas abaixo já incluem /api; aceite URL-base com ou sem esse sufixo.

  return String(url || '')
    .trim()

    .replace(/\/+$/, '')

    .replace(/\/api$/i, '')
}

const normalizeId = (value) => {
  if (!value) return null

  if (typeof value === 'object' && value._id) {
    return String(value._id)
  }

  return String(value)
}

const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'Erro inesperado na comunicação com o WA-AKG.'
  )
}

const validateHttpsUrl = (url) => {
  let parsedUrl

  try {
    parsedUrl = new URL(String(url || '').trim())
  } catch {
    throw new AppError('A URL da mídia é inválida.', 400)
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new AppError(
      'A mídia precisa estar disponível por uma URL HTTPS.',

      400,
    )
  }

  return parsedUrl.toString()
}

const toJid = (phone) => {
  const value = String(phone || '').trim()

  if (!value) {
    throw new AppError('O telefone do contato é obrigatório.', 400)
  }

  if (value.includes('@s.whatsapp.net')) {
    return value
  }

  if (value.includes('@g.us')) {
    return value
  }

  const normalized = normalizePhone(value)

  if (!normalized) {
    throw new AppError('Não foi possível normalizar o telefone.', 400)
  }

  const digits = String(normalized).replace(/\D/g, '')

  if (!digits) {
    throw new AppError('O telefone informado é inválido.', 400)
  }

  return `${digits}@s.whatsapp.net`
}

const getIntegrationWithSecrets = async (integrationId = null) => {
  let integration = null

  if (integrationId) {
    const normalizedId = String(integrationId).trim()

    if (!mongoose.Types.ObjectId.isValid(normalizedId)) {
      throw new AppError('ID da integração WhatsApp inválido.', 400)
    }

    integration = await WhatsAppIntegration.findOne({
      _id: normalizedId,
      enabled: true,
    })
      .select('+apiKey +webhookSecret')
      .lean()
  } else {
    // Não selecionar silenciosamente uma sessão quando há várias integrações.
    const integrations = await WhatsAppIntegration.find({ enabled: true })
      .select('+apiKey +webhookSecret')
      .sort({ createdAt: -1 })
      .limit(2)
      .lean()

    if (integrations.length > 1) {
      throw new AppError(
        'Há mais de uma integração WhatsApp ativa. Informe integrationId para escolher a sessão correta.',
        400,
      )
    }

    integration = integrations[0] || null
  }

  if (!integration) {
    throw new AppError('Integração WhatsApp não encontrada ou desativada.', 404)
  }

  if (!integration.baseUrl || !integration.sessionId) {
    throw new AppError(
      'A integração não possui baseUrl ou sessionId configurado.',
      400,
    )
  }

  return integration
}

const getRequestHeaders = (integration) => {
  const headers = {
    'Content-Type': 'application/json',

    Accept: 'application/json',
  }

  if (integration.apiKey) {
    headers['X-API-Key'] = integration.apiKey
  }

  return headers
}

const updateIntegrationStatus = async (integrationId, status) => {
  try {
    await WhatsAppIntegration.findByIdAndUpdate(integrationId, {
      status,
    })
  } catch (error) {
    console.error(
      '[WA-AKG] Erro ao atualizar status da integração:',

      error.message,
    )
  }
}

const requestProvider = async ({
  integration,

  method = 'POST',

  path,

  data,
}) => {
  const baseUrl = normalizeBaseUrl(integration.baseUrl)

  if (!baseUrl) {
    throw new AppError('A URL base da integração não está configurada.', 400)
  }

  try {
    return await axios({
      method,

      url: `${baseUrl}${path}`,

      data,

      headers: getRequestHeaders(integration),

      timeout: REQUEST_TIMEOUT,
    })
  } catch (error) {
    const message = getErrorMessage(error)

    console.error('[WA-AKG] Erro na requisição:', {
      method,

      path,

      status: error?.response?.status,

      message,
    })

    throw new AppError(
      `Falha na comunicação com o WhatsApp: ${message}`,

      error?.response?.status >= 400 && error?.response?.status < 600
        ? error.response.status
        : 502,
    )
  }
}

// ==========================================================

// CONTATOS WHATSAPP

// ==========================================================

export const upsertWhatsAppContact = async ({
  integrationId,

  remoteJid,

  leadId,

  name = '',

  isGroup = false,

  metadata = {},
}) => {
  if (!integrationId || !remoteJid || !leadId) {
    throw new AppError(
      'integrationId, remoteJid e leadId são obrigatórios.',

      400,
    )
  }

  const normalizedJid = String(remoteJid).trim()

  const phone = normalizedJid.includes('@')
    ? normalizedJid.split('@')[0]
    : normalizedJid

  const phoneNormalized = normalizePhone(phone)

  const contact = await WhatsAppContact.findOneAndUpdate(
    {
      integration: integrationId,

      remoteJid: normalizedJid,
    },

    {
      $set: {
        lead: leadId,

        phone,

        phoneNormalized,

        name: name || undefined,

        isGroup,

        lastMessageAt: new Date(),

        isActive: true,

        metadata,
      },
    },

    {
      new: true,

      upsert: true,

      setDefaultsOnInsert: true,

      runValidators: true,
    },
  )

  return contact
}

// ==========================================================

// CONVERSAS WHATSAPP

// ==========================================================

export const upsertWhatsAppConversation = async ({
  whatsappContactId,

  integrationId,

  leadId,

  assignedTo = null,

  name = '',
}) => {
  if (!whatsappContactId || !integrationId || !leadId) {
    throw new AppError(
      'Contato, integração e lead são obrigatórios para criar a conversa.',

      400,
    )
  }

  let conversation = await Conversation.findOne({
    channel: 'whatsapp',

    whatsappContact: whatsappContactId,

    isActive: true,
  })

  if (conversation) {
    conversation.whatsappIntegration = integrationId

    conversation.lead = leadId

    if (assignedTo) {
      conversation.assignedTo = assignedTo
    }

    if (!conversation.name && name) {
      conversation.name = name
    }

    await conversation.save()

    return conversation
  }

  conversation = await Conversation.create({
    participants: [],

    channel: 'whatsapp',

    type: 'direct',

    name: name || '',

    lastMessage: '',

    lastMessageAt: null,

    lastMessageFrom: null,

    unreadCounts: new Map(),

    isActive: true,

    whatsappContact: whatsappContactId,

    whatsappIntegration: integrationId,

    lead: leadId,

    assignedTo,

    metadata: {
      provider: 'wa-akg',
    },
  })

  return conversation
}

// ==========================================================

// INTEGRAÇÕES

// ==========================================================

export const createIntegration = async (payload = {}) => {
  const name = String(payload.name || '').trim()
  const baseUrlInput = String(payload.baseUrl || '').trim()
  const apiKey = String(payload.apiKey || '').trim()
  const sessionId = String(payload.sessionId || '').trim()
  const webhookSecret = String(payload.webhookSecret || '').trim()

  if (!name || !baseUrlInput || !apiKey || !sessionId) {
    throw new AppError(
      'Informe name, baseUrl, apiKey e sessionId para criar a integração.',
      400,
    )
  }

  let parsedBaseUrl
  try {
    parsedBaseUrl = new URL(baseUrlInput)
  } catch {
    throw new AppError('A URL base da integração é inválida.', 400)
  }

  const isLocalHttp =
    parsedBaseUrl.protocol === 'http:' &&
    ['localhost', '127.0.0.1'].includes(parsedBaseUrl.hostname)

  if (parsedBaseUrl.protocol !== 'https:' && !isLocalHttp) {
    throw new AppError(
      'A URL base deve utilizar HTTPS. HTTP só é permitido em localhost para desenvolvimento.',
      400,
    )
  }

  try {
    return await WhatsAppIntegration.create({
      name,
      baseUrl: normalizeBaseUrl(baseUrlInput),
      apiKey,
      sessionId,
      webhookSecret,
      provider: 'wa-akg',
      enabled: payload.enabled !== false,
    })
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError(
        'Já existe uma integração WA-AKG cadastrada com esse sessionId.',
        409,
      )
    }
    throw error
  }
}

export const listIntegrations = async () => {
  return WhatsAppIntegration.find()

    .select('-apiKey -webhookSecret')

    .sort({ createdAt: -1 })

    .lean()
}

// ==========================================================

// ENVIO DE TEXTO

// ==========================================================

export const sendTextMessage = async ({
  integrationId = null,

  phone,

  message,
}) => {
  const text = String(message || '').trim()

  if (!text) {
    throw new AppError('O conteúdo da mensagem é obrigatório.', 400)
  }

  const integration = await getIntegrationWithSecrets(integrationId)

  const jid = toJid(phone)

  try {
    const response = await requestProvider({
      integration,

      method: 'POST',

      path: `/api/messages/${encodeURIComponent(
        integration.sessionId,
      )}/${encodeURIComponent(jid)}/send`,

      data: {
        message: {
          text,
        },
      },
    })

    await updateIntegrationStatus(integration._id, 'connected')

    return {
      integrationId: integration._id,

      integrationName: integration.name,

      sessionId: integration.sessionId,

      phone,

      jid,

      providerResponse: response.data,
    }
  } catch (error) {
    await updateIntegrationStatus(integration._id, 'error')

    throw error
  }
}

// ==========================================================

// ENVIO DE IMAGENS, GIFS E ARQUIVOS

// ==========================================================

export const sendMediaMessage = async ({
  integrationId = null,

  phone,

  mediaUrl,

  mediaType = 'image',

  caption = '',

  fileName = '',

  mimeType = '',
}) => {
  const normalizedMediaType = String(mediaType || 'image')
    .trim()

    .toLowerCase()

  if (!ALLOWED_MEDIA_TYPES.includes(normalizedMediaType)) {
    throw new AppError(
      'Tipo de mídia inválido. Utilize image, audio, video, gif ou file.',

      400,
    )
  }

  const validatedUrl = validateHttpsUrl(mediaUrl)

  const normalizedCaption = String(caption || '').trim()

  const integration = await getIntegrationWithSecrets(integrationId)

  const jid = toJid(phone)

  let mediaPayload

  if (normalizedMediaType === 'image' || normalizedMediaType === 'gif') {
    // GIFs continuam usando o payload de imagem para preservar o fluxo atual.
    mediaPayload = {
      image: { url: validatedUrl },
      ...(normalizedCaption ? { caption: normalizedCaption } : {}),
    }
  } else if (normalizedMediaType === 'audio') {
    // Solicita ao WA-AKG que envie o áudio como mensagem de voz (PTT).
    // IMPORTANTE: ptt não converte o arquivo. O mimetype informado deve
    // corresponder ao conteúdo real disponibilizado em mediaUrl.
    const normalizedMimeType = String(mimeType || '')
      .trim()
      .toLowerCase()

    mediaPayload = {
      audio: {
        url: validatedUrl,
        ...(normalizedMimeType ? { mimetype: normalizedMimeType } : {}),
        ptt: true,
      },
    }
  } else if (normalizedMediaType === 'video') {
    mediaPayload = {
      video: { url: validatedUrl },
      ...(normalizedCaption ? { caption: normalizedCaption } : {}),
    }
  } else {
    // Documento/arquivo: mantém o payload existente para PDFs e outros anexos.
    mediaPayload = {
      document: {
        url: validatedUrl,
        ...(fileName ? { fileName: String(fileName).trim() } : {}),
        ...(mimeType ? { mimetype: String(mimeType).trim() } : {}),
      },
      ...(normalizedCaption ? { caption: normalizedCaption } : {}),
    }
  }

  try {
    const response = await requestProvider({
      integration,

      method: 'POST',

      path: `/api/messages/${encodeURIComponent(
        integration.sessionId,
      )}/${encodeURIComponent(jid)}/send`,

      data: {
        message: mediaPayload,
      },
    })

    await updateIntegrationStatus(integration._id, 'connected')

    return {
      integrationId: integration._id,

      integrationName: integration.name,

      sessionId: integration.sessionId,

      phone,

      jid,

      mediaType: normalizedMediaType,

      mediaUrl: validatedUrl,

      providerResponse: response.data,
    }
  } catch (error) {
    await updateIntegrationStatus(integration._id, 'error')

    throw error
  }
}

// ==========================================================

// CONSULTA DE SEGREDOS

// ==========================================================

export const getIntegrationSecrets = async (integrationId) => {
  const integration = await WhatsAppIntegration.findById(integrationId).select(
    '+apiKey +webhookSecret',
  )

  if (!integration) {
    throw new AppError('Integração não encontrada.', 404)
  }

  return {
    apiKey: integration.apiKey,

    webhookSecret: integration.webhookSecret,
  }
}

// ==========================================================

// QR CODE / STATUS DA SESSÃO

// ==========================================================

export const getQrCode = async (integrationId) => {
  const normalizedIntegrationId =
    typeof integrationId === 'object' && integrationId !== null
      ? integrationId.integrationId
      : integrationId

  if (!normalizedIntegrationId) {
    throw new AppError('Informe o ID da integração WhatsApp.', 400)
  }

  const integration = await getIntegrationWithSecrets(
    String(normalizedIntegrationId).trim(),
  )

  const sessionPath = `/api/sessions/${encodeURIComponent(integration.sessionId)}`

  const sessionResponse = await requestProvider({
    integration,

    method: 'GET',

    path: sessionPath,
  })

  const session = sessionResponse.data?.data ?? sessionResponse.data ?? {}

  const providerStatus = String(session?.status || 'unknown')

  const normalizedStatus = providerStatus.toLowerCase()

  const isConnected = ['connected', 'open', 'online'].includes(normalizedStatus)

  const isDisconnected = [
    'disconnected',

    'close',

    'closed',

    'offline',

    'stopped',
  ].includes(normalizedStatus)

  if (isConnected) {
    await updateIntegrationStatus(integration._id, 'connected')

    return {
      integrationId: String(integration._id),

      integrationName: integration.name,

      sessionId: integration.sessionId,

      status: 'CONNECTED',

      qr: null,

      base64: null,

      me: session?.me || null,
    }
  }

  if (isDisconnected) {
    await updateIntegrationStatus(integration._id, 'disconnected')
  }

  try {
    const qrResponse = await requestProvider({
      integration,

      method: 'GET',

      path: `${sessionPath}/qr`,
    })

    const qrData = qrResponse.data?.data ?? qrResponse.data ?? {}

    const rawBase64 =
      qrData?.base64 || qrData?.qrCode || qrData?.qrcodeImage || null

    const base64 = rawBase64
      ? String(rawBase64).startsWith('data:')
        ? String(rawBase64)
        : `data:image/png;base64,${rawBase64}`
      : null

    return {
      integrationId: String(integration._id),

      integrationName: integration.name,

      sessionId: integration.sessionId,

      status: providerStatus.toUpperCase(),

      qr: qrData?.qr || qrData?.code || session?.qr || session?.qrcode || null,

      base64,

      me: session?.me || null,
    }
  } catch (error) {
    // A sessão pode estar inicializando; ausência temporária de QR não é fatal.

    if ([400, 404].includes(Number(error?.statusCode))) {
      return {
        integrationId: String(integration._id),

        integrationName: integration.name,

        sessionId: integration.sessionId,

        status: providerStatus.toUpperCase(),

        qr: null,

        base64: null,

        me: session?.me || null,
      }
    }

    throw error
  }
}

// ==========================================================

// ASSINATURA DO WEBHOOK

// ==========================================================

export const verifyWebhookSignature = ({ rawBody, signature, secret }) => {
  if (!rawBody || !signature || !secret) {
    return false
  }

  const receivedSignature = String(signature)
    .trim()

    .replace(/^sha256=/i, '')

  const expectedSignature = crypto

    .createHmac('sha256', secret)

    .update(rawBody)

    .digest('hex')

  try {
    const received = Buffer.from(receivedSignature, 'hex')

    const expected = Buffer.from(expectedSignature, 'hex')

    if (received.length === 0 || received.length !== expected.length) {
      return false
    }

    return crypto.timingSafeEqual(received, expected)
  } catch {
    return false
  }
}

// ==========================================================
// TRATAR RESPOSTA DO LEAD
// ==========================================================

const handleInboundLeadReply = async (lead) => {
  if (!lead?._id) return

  const now = new Date()
  const reason =
    'O lead respondeu pelo WhatsApp; sequência automática cancelada.'

  // Marca a automação como respondida sem sobrescrever outros estados.
  await Lead.updateOne(
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
  )

  // Cancela os próximos contatos da sequência. Registros já enviados
  // permanecem intactos para preservar o histórico.
  const cancellation = await LeadFollowUp.updateMany(
    {
      lead: lead._id,
      status: { $in: ['pending', 'processing', 'simulated', 'failed'] },
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

  // Só promove etapas iniciais. Nunca move para trás um lead que já avançou.
  const earlyStages = [LEAD_STAGES.NEW, LEAD_STAGES.FIRST_CONTACT]
  if (earlyStages.includes(lead.stage)) {
    const update = {
      $set: {
        stage: LEAD_STAGES.QUALIFIED,
        status: LEAD_STATUS.IN_PROGRESS,
        lastContactAt: now,
      },
    }

    const changedBy =
      normalizeId(lead.assignedTo) || normalizeId(lead.createdBy)
    if (changedBy) {
      update.$push = {
        stageHistory: {
          from: lead.stage,
          to: LEAD_STAGES.QUALIFIED,
          stage: LEAD_STAGES.QUALIFIED,
          changedBy,
          reason: 'Lead respondeu pelo WhatsApp.',
          changedAt: now,
        },
      }
    }

    const stageResult = await Lead.updateOne(
      {
        _id: lead._id,
        stage: { $in: earlyStages },
        isDeleted: { $ne: true },
      },
      update,
    )

    if (stageResult.modifiedCount > 0) {
      console.info('[WA-AKG] Lead promovido para Qualificado após resposta.', {
        leadId: String(lead._id),
        previousStage: lead.stage,
        stage: LEAD_STAGES.QUALIFIED,
      })
    }
  }

  if (cancellation.modifiedCount > 0) {
    console.info('[WA-AKG] Follow-ups cancelados após resposta do lead.', {
      leadId: String(lead._id),
      cancelledCount: cancellation.modifiedCount,
    })
  }
}

// ==========================================================

// WEBHOOK WA-AKG

// ==========================================================

export const handleWebhook = async ({
  rawBody,

  body,

  signature,

  io: requestIo = null,
}) => {
  let payload = body

  // --------------------------------------------------------

  // VALIDAÇÃO E LEITURA DO PAYLOAD

  // --------------------------------------------------------

  if (rawBody) {
    try {
      payload =
        typeof rawBody === 'string'
          ? JSON.parse(rawBody)
          : JSON.parse(rawBody.toString('utf8'))
    } catch {
      throw new AppError('Payload JSON do webhook inválido.', 400)
    }
  }

  if (!payload || typeof payload !== 'object') {
    throw new AppError('Payload do webhook inválido.', 400)
  }

  const sessionId =
    payload.sessionId || payload.session?.id || payload.data?.sessionId

  if (!sessionId) {
    console.error('[WA-AKG] Webhook recebido sem sessionId:', {
      payloadKeys: Object.keys(payload),

      dataKeys:
        payload.data && typeof payload.data === 'object'
          ? Object.keys(payload.data)
          : [],
    })

    throw new AppError('O webhook não informou o sessionId.', 400)
  }

  console.info('[WA-AKG] Diagnóstico da sessão:', {
    receivedSessionId: sessionId,

    payloadKeys: Object.keys(payload),

    dataKeys:
      payload.data && typeof payload.data === 'object'
        ? Object.keys(payload.data)
        : [],
  })

  // --------------------------------------------------------

  // TESTE DE WEBHOOK DA WA-AKG

  // --------------------------------------------------------

  // O teste automático da WA-AKG pode utilizar sessionId "test".

  // Reconhecemos esse evento antes da busca pela integração real.

  // Nenhum dado do CRM é criado ou alterado neste caminho.

  //

  // IMPORTANTE:

  // Esse retorno confirma apenas o recebimento do teste HTTP.

  // Ele não valida a assinatura HMAC do evento de teste.

  // Eventos de sessões reais continuam passando pela validação

  // da integração e pela verificação da assinatura.

  // --------------------------------------------------------

  if (String(sessionId).trim().toLowerCase() === 'test') {
    console.info('[WA-AKG] Teste de webhook recebido e reconhecido.')

    return {
      success: true,

      test: true,

      ignored: true,

      reason: 'Teste de webhook recebido. Nenhum dado foi alterado.',
    }
  }

  // --------------------------------------------------------

  // BUSCA DA INTEGRAÇÃO REAL

  // --------------------------------------------------------

  const integration = await WhatsAppIntegration.findOne({
    sessionId,

    enabled: true,
  }).select('+apiKey +webhookSecret')

  console.info('[WA-AKG] Resultado da busca:', {
    receivedSessionId: sessionId,

    integrationFound: Boolean(integration),

    integrationId: integration?._id ? String(integration._id) : null,
  })

  if (!integration) {
    throw new AppError(
      'Não existe integração ativa para esta sessão WhatsApp.',

      404,
    )
  }

  // --------------------------------------------------------

  // VALIDAÇÃO DA ASSINATURA HMAC

  // --------------------------------------------------------

  if (integration.webhookSecret) {
    const isValid = verifyWebhookSignature({
      rawBody,

      signature,

      secret: integration.webhookSecret,
    })

    if (!isValid) {
      throw new AppError('Assinatura do webhook inválida.', 401)
    }
  }

  const event = String(
    payload.event || payload.type || payload.data?.event || '',
  ).trim()

  const data =
    payload.data && typeof payload.data === 'object' ? payload.data : payload

  console.info('[WA-AKG] Webhook recebido:', {
    event,

    sessionId,
  })

  // --------------------------------------------------------

  // MENSAGEM RECEBIDA

  // --------------------------------------------------------

  if (event === 'message.received' || event === 'messages.upsert') {
    const key = data.key || data.message?.key || {}

    const remoteJid =
      key.remoteJid || data.remoteJid || data.from || data.chatId

    const externalMessageId = key.id || data.id || data.messageId || null

    const fromMe = key.fromMe === true || data.fromMe === true

    // Ignorar mensagens enviadas pela própria sessão.

    if (fromMe) {
      return {
        success: true,

        ignored: true,

        reason: 'Mensagem enviada pela própria sessão.',
      }
    }

    if (!remoteJid) {
      return {
        success: true,

        ignored: true,

        reason: 'Mensagem sem remoteJid.',
      }
    }

    // Não criar leads para mensagens de grupos.

    if (String(remoteJid).endsWith('@g.us')) {
      return {
        success: true,

        ignored: true,

        reason: 'Mensagem de grupo ignorada.',
      }
    }

    // ------------------------------------------------------

    // EXTRAIR E NORMALIZAR O TELEFONE

    // ------------------------------------------------------

    const phone = String(remoteJid).split('@')[0]

    const phoneNormalized = normalizePhone(phone)

    if (!phoneNormalized) {
      console.warn('[WA-AKG] Telefone inválido:', {
        remoteJid,
      })

      return {
        success: true,

        ignored: true,

        reason: 'Não foi possível normalizar o telefone.',
      }
    }

    // ------------------------------------------------------

    // BUSCAR LEAD EXISTENTE

    // ------------------------------------------------------

    let lead = await Lead.findOne({
      $or: [{ phoneNormalized }, { phone: phoneNormalized }, { phone }],

      isDeleted: { $ne: true },
    })

    let leadCreated = false

    if (!lead) {
      const contactName = String(
        data.pushName || data.notifyName || data.senderName || '',
      ).trim()

      const leadName = (
        contactName || `Contato WhatsApp ${phoneNormalized}`
      ).slice(0, 120)

      try {
        lead = await Lead.create({
          name: leadName,

          email: `whatsapp-${phoneNormalized}@leadsnamao.local`,

          phone,

          phoneNormalized,

          // Valores compatíveis com o schema atual.

          source: 'manual',

          sourceType: 'manual',

          region: 'central',

          // O lead será distribuído pelo fluxo existente.

          status: LEAD_STATUS.NEW,

          stage: LEAD_STAGES.NEW,

          notes: 'Lead criado automaticamente pelo WhatsApp.',
        })

        leadCreated = true

        console.info('[WA-AKG] Novo lead criado:', {
          leadId: String(lead._id),

          phoneNormalized,

          name: leadName,
        })
      } catch (error) {
        // Em caso de concorrência, tenta recuperar o lead.

        if (error.code === 11000) {
          lead = await Lead.findOne({
            $or: [{ phoneNormalized }, { phone: phoneNormalized }, { phone }],

            isDeleted: { $ne: true },
          })
        }

        if (!lead) {
          console.error('[WA-AKG] Erro ao criar lead:', {
            message: error.message,

            name: error.name,

            code: error.code,
          })

          throw error
        }
      }
    } else {
      console.info('[WA-AKG] Lead existente encontrado:', {
        leadId: String(lead._id),

        phoneNormalized,
      })
    }

    const leadId = lead._id

    // ------------------------------------------------------

    // CRIAR OU ATUALIZAR CONTATO DO WHATSAPP

    // ------------------------------------------------------

    const contact = await upsertWhatsAppContact({
      integrationId: integration._id,

      remoteJid,

      leadId,

      name:
        data.pushName || data.notifyName || data.senderName || lead.name || '',

      isGroup: false,

      metadata: {
        provider: 'wa-akg',
      },
    })

    // ------------------------------------------------------

    // CRIAR OU RECUPERAR CONVERSA

    // ------------------------------------------------------

    const conversation = await upsertWhatsAppConversation({
      whatsappContactId: contact._id,

      integrationId: integration._id,

      leadId,

      assignedTo: lead.assignedTo || null,

      name: contact.name || lead.name || '',
    })

    // ------------------------------------------------------

    // IDENTIFICAR CONTEÚDO E ANEXOS (texto, imagem, áudio, vídeo e documentos)
    // ------------------------------------------------------

    const messageObject = data.message?.message || data.message || data
    const normalizedProviderType = String(
      data.type ||
        data.messageType ||
        data.mediaType ||
        data.message?.type ||
        '',
    ).toLowerCase()

    const imageMessage =
      messageObject.imageMessage ||
      messageObject.image ||
      data.imageMessage ||
      null
    const audioMessage =
      messageObject.audioMessage ||
      messageObject.audio ||
      data.audioMessage ||
      null
    const videoMessage =
      messageObject.videoMessage ||
      messageObject.video ||
      data.videoMessage ||
      null
    const documentMessage =
      messageObject.documentMessage ||
      messageObject.document ||
      data.documentMessage ||
      null
    const stickerMessage =
      messageObject.stickerMessage ||
      messageObject.sticker ||
      data.stickerMessage ||
      null
    const mediaObjects = [
      imageMessage,
      audioMessage,
      videoMessage,
      documentMessage,
      stickerMessage,
      data.media,
      data.file,
      data.attachment,
    ].filter((item) => item && typeof item === 'object')

    let mimeType = String(
      data.mimeType ||
        data.mimetype ||
        data.media?.mimeType ||
        data.media?.mimetype ||
        data.file?.mimeType ||
        data.file?.mimetype ||
        data.attachment?.mimeType ||
        mediaObjects.find((item) => item.mimetype || item.mimeType)?.mimetype ||
        mediaObjects.find((item) => item.mimeType)?.mimeType ||
        '',
    ).toLowerCase()

    const attachmentUrl = String(
      data.fileUrl ||
        data.mediaUrl ||
        data.downloadUrl ||
        data.media?.downloadUrl ||
        data.media?.url ||
        data.file?.url ||
        data.attachment?.url ||
        data.message?.fileUrl ||
        data.message?.mediaUrl ||
        data.url ||
        imageMessage?.downloadUrl ||
        imageMessage?.url ||
        audioMessage?.downloadUrl ||
        audioMessage?.url ||
        videoMessage?.downloadUrl ||
        videoMessage?.url ||
        documentMessage?.downloadUrl ||
        documentMessage?.url ||
        stickerMessage?.downloadUrl ||
        stickerMessage?.url ||
        '',
    ).trim()

    let messageType = inferMediaType({
      providerType: normalizedProviderType,
      mimeType,
      url: attachmentUrl,
      messageObject: {
        ...(messageObject || {}),
        ...(imageMessage ? { imageMessage } : {}),
        ...(audioMessage ? { audioMessage } : {}),
        ...(videoMessage ? { videoMessage } : {}),
        ...(documentMessage ? { documentMessage } : {}),
        ...(stickerMessage ? { stickerMessage } : {}),
      },
    })
    if (stickerMessage && messageType === 'text') messageType = 'image'

    const attachmentName =
      String(
        data.fileName ||
          data.filename ||
          data.media?.fileName ||
          data.file?.name ||
          data.attachment?.name ||
          imageMessage?.fileName ||
          audioMessage?.fileName ||
          videoMessage?.fileName ||
          documentMessage?.fileName ||
          documentMessage?.title ||
          stickerMessage?.fileName ||
          (messageType === 'audio'
            ? 'audio.ogg'
            : messageType === 'video'
              ? 'video.mp4'
              : messageType === 'image'
                ? 'imagem'
                : ''),
      ).trim() ||
      (attachmentUrl
        ? decodeURIComponent(
            attachmentUrl.split('?')[0].split('/').pop() || 'anexo',
          )
        : '')

    const attachmentSize =
      Number(
        data.fileSize ||
          data.filesize ||
          data.media?.size ||
          data.file?.size ||
          data.attachment?.size ||
          imageMessage?.fileLength ||
          audioMessage?.fileLength ||
          videoMessage?.fileLength ||
          documentMessage?.fileLength ||
          0,
      ) || 0

    let attachment = null
    if (
      attachmentUrl &&
      ['image', 'audio', 'video', 'file'].includes(messageType)
    ) {
      try {
        const persisted = await persistInboundMedia({
          integration,
          url: attachmentUrl,
          filename: attachmentName,
          mimeType:
            mimeType || mimeFromExtension(attachmentName || attachmentUrl),
        })
        attachment = {
          url: persisted.url,
          name: persisted.name || attachmentName || 'anexo',
          size: Number(persisted.size || attachmentSize || 0),
          mimeType:
            persisted.mimeType ||
            mimeType ||
            mimeFromExtension(attachmentName || attachmentUrl),
        }
        mimeType = attachment.mimeType
      } catch (mediaError) {
        console.error('[WA-AKG] Não foi possível persistir a mídia recebida:', {
          externalMessageId,
          messageType,
          status: mediaError?.response?.status,
          message: mediaError?.message,
        })
        // Não inventa uma URL pública: mantém o caminho original para diagnóstico.
        attachment = {
          url: attachmentUrl.startsWith('/')
            ? `${normalizeBaseUrl(integration.baseUrl)}${attachmentUrl}`
            : attachmentUrl,
          name: attachmentName || 'anexo',
          size: attachmentSize,
          mimeType:
            mimeType || mimeFromExtension(attachmentName || attachmentUrl),
        }
      }
    }

    const content = String(
      data.content ||
        data.text ||
        imageMessage?.caption ||
        videoMessage?.caption ||
        documentMessage?.caption ||
        messageObject.conversation ||
        messageObject.extendedTextMessage?.text ||
        '',
    ).trim()

    if (
      ['image', 'audio', 'video', 'file'].includes(messageType) &&
      !attachmentUrl
    ) {
      console.warn(
        '[WA-AKG] Mídia recebida sem fileUrl/URL disponível no payload.',
        {
          messageType,
          providerType: normalizedProviderType || null,
          mimeType: mimeType || null,
          messageKeys: Object.keys(messageObject || {}),
          dataKeys: Object.keys(data || {}),
        },
      )
    }

    // ------------------------------------------------------

    // SALVAR MENSAGEM

    // ------------------------------------------------------

    const savedMessage = await chatService.receiveWhatsAppMessage({
      conversationId: conversation._id,

      whatsappContactId: contact._id,

      externalMessageId,

      content:
        content ||
        (messageType === 'image'
          ? 'Imagem recebida'
          : messageType === 'audio'
            ? 'Áudio recebido'
            : messageType === 'video'
              ? 'Vídeo recebido'
              : messageType === 'file'
                ? 'Arquivo recebido'
                : 'Mensagem recebida'),

      type: messageType,

      attachment,
    })

    if (savedMessage?.duplicate) {
      return {
        success: true,

        duplicate: true,

        leadId: String(leadId),

        leadCreated,

        conversationId: String(conversation._id),
      }
    }

    // Resposta inbound confirmada e persistida: interrompe a sequência
    // e qualifica o lead antes de notificar a interface.
    await handleInboundLeadReply(lead)

    // ------------------------------------------------------

    // ATUALIZAR ÚLTIMA MENSAGEM DO CONTATO

    // ------------------------------------------------------

    await WhatsAppContact.findByIdAndUpdate(contact._id, {
      lastMessageAt: new Date(),
    })

    // ------------------------------------------------------

    // NOTIFICAR FRONTEND VIA SOCKET.IO

    // ------------------------------------------------------

    // ------------------------------------------------------

    // NOTIFICAR FRONTEND VIA SOCKET.IO

    // ------------------------------------------------------

    const io = requestIo || getSocketIO()

    if (io) {
      const conversationId = String(conversation._id)

      const assignedTo = normalizeId(conversation.assignedTo)

      // O frontend espera receber a mensagem diretamente.

      // Normalizamos os IDs para evitar problemas com ObjectId.

      const messagePayload = {
        ...(typeof savedMessage.toObject === 'function'
          ? savedMessage.toObject()
          : savedMessage),

        conversation: conversationId,

        conversationId,
      }

      // Atualiza os clientes conectados à sala da conversa.

      io.to(conversationId).emit('new_message', messagePayload)

      // A sala individual do usuário usa o prefixo user_.

      if (assignedTo) {
        io.to(`user_${assignedTo}`).emit('new_message_notification', {
          conversationId,

          message: messagePayload,

          leadId: String(leadId),
        })
      }

      console.info('[WA-AKG] Eventos Socket.IO emitidos:', {
        conversationId,

        assignedTo,

        messageId: savedMessage?._id ? String(savedMessage._id) : null,

        conversationRoom: conversationId,

        userRoom: assignedTo ? `user_${assignedTo}` : null,
      })
    } else {
      console.warn('[WA-AKG] Socket.IO indisponível para emitir nova mensagem.')
    }

    console.info('[WA-AKG] Mensagem processada:', {
      event,

      leadId: String(leadId),

      leadCreated,

      conversationId: String(conversation._id),

      messageId: savedMessage?._id ? String(savedMessage._id) : null,
    })

    return {
      success: true,

      event,

      leadId: String(leadId),

      leadCreated,

      conversationId: String(conversation._id),

      messageId: savedMessage?._id ? String(savedMessage._id) : null,
    }
  }

  // --------------------------------------------------------

  // MENSAGEM ENVIADA

  // --------------------------------------------------------

  if (event === 'message.sent') {
    const key = data.key || data.message?.key || {}
    const externalMessageId =
      key.id || data.id || data.messageId || data.message?.id || null

    if (!externalMessageId) {
      console.warn('[WA-AKG] Evento message.sent sem identificador externo.', {
        sessionId,
        dataKeys: Object.keys(data || {}),
      })

      return {
        success: true,
        event,
        matched: false,
        reason: 'Evento sem externalMessageId.',
      }
    }

    // Localiza a mensagem já persistida pelo chatService.js.
    // Não cria um segundo registro nem altera o status para um estado anterior.
    const message = await Message.findOne({
      externalMessageId: String(externalMessageId),
      direction: 'outbound',
    })
      .select('_id conversation externalMessageId status')
      .populate({
        path: 'conversation',
        select: 'channel whatsappIntegration',
        populate: {
          path: 'whatsappIntegration',
          select: 'sessionId',
        },
      })
      .lean()

    if (!message) {
      // O webhook pode chegar antes da persistência local. Não reenviamos
      // a mensagem nem criamos um registro duplicado neste caminho.
      console.warn(
        '[WA-AKG] Confirmação recebida, mas a mensagem não foi localizada.',
        {
          externalMessageId: String(externalMessageId),
          sessionId,
        },
      )

      return {
        success: true,
        event,
        matched: false,
        externalMessageId: String(externalMessageId),
      }
    }

    const conversationSessionId =
      message.conversation?.whatsappIntegration?.sessionId

    if (
      message.conversation?.channel !== 'whatsapp' ||
      (conversationSessionId &&
        String(conversationSessionId) !== String(sessionId))
    ) {
      console.warn(
        '[WA-AKG] A confirmação não corresponde à integração da mensagem.',
        {
          externalMessageId: String(externalMessageId),
          messageId: String(message._id),
          webhookSessionId: String(sessionId),
          conversationSessionId: conversationSessionId
            ? String(conversationSessionId)
            : null,
        },
      )

      return {
        success: true,
        event,
        matched: false,
        reason: 'A sessão do webhook não corresponde à mensagem.',
        externalMessageId: String(externalMessageId),
      }
    }

    console.info(
      '[WA-AKG] Confirmação message.sent vinculada à mensagem existente.',
      {
        externalMessageId: String(externalMessageId),
        messageId: String(message._id),
        conversationId: message.conversation?._id
          ? String(message.conversation._id)
          : String(message.conversation),
        status: message.status,
      },
    )

    return {
      success: true,
      event,
      matched: true,
      externalMessageId: String(externalMessageId),
      messageId: String(message._id),
      status: message.status,
    }
  }

  // messages.update pode representar diferentes atualizações do provedor.
  // Não alteramos status sem confirmar o formato desse evento.
  if (event === 'messages.update') {
    return {
      success: true,
      event,
      ignored: true,
      reason: 'Evento messages.update sem mapeamento de status confirmado.',
    }
  }

  // --------------------------------------------------------
  // STATUS DA CONEXÃO

  // --------------------------------------------------------

  if (event === 'connection.update' || event === 'session.status') {
    const providerStatus =
      data.status || data.state || data.connection || 'unknown'

    const normalizedStatus = String(providerStatus).toLowerCase()

    const connected = ['connected', 'open', 'online'].includes(normalizedStatus)

    const disconnected = [
      'disconnected',

      'close',

      'closed',

      'offline',
    ].includes(normalizedStatus)

    if (connected) {
      await updateIntegrationStatus(integration._id, 'connected')
    } else if (disconnected) {
      await updateIntegrationStatus(integration._id, 'disconnected')
    }

    return {
      success: true,

      event,

      status: providerStatus,
    }
  }

  // --------------------------------------------------------

  // EVENTO NÃO TRATADO

  // --------------------------------------------------------

  return {
    success: true,

    ignored: true,

    event,

    reason: 'Evento do webhook não tratado por este serviço.',
  }
}

// ==========================================================

// ATUALIZAR SEGREDO DO WEBHOOK

// ==========================================================

export const updateWebhookSecret = async ({ integrationId, webhookSecret }) => {
  if (!integrationId || !webhookSecret) {
    throw new AppError('integrationId e webhookSecret são obrigatórios.', 400)
  }

  const integration = await WhatsAppIntegration.findByIdAndUpdate(
    integrationId,

    {
      webhookSecret: String(webhookSecret).trim(),
    },

    {
      new: true,

      runValidators: true,
    },
  ).select('-apiKey -webhookSecret')

  if (!integration) {
    throw new AppError('Integração não encontrada.', 404)
  }

  return integration
}

export const prepareLeadWhatsAppConversation = async ({
  lead,
  integrationId = null,
}) => {
  if (!lead?._id) {
    throw new AppError('Lead inválido.', 400)
  }

  const phone = normalizePhone(lead.phoneNormalized || lead.phone)

  if (!phone) {
    throw new AppError('Este lead não possui um telefone válido.', 400)
  }

  // Busca uma integração WhatsApp ativa.

  const integration = await getIntegrationWithSecrets(integrationId)

  const remoteJid = toJid(phone)

  // Cria ou recupera o contato vinculado ao lead.

  const contact = await upsertWhatsAppContact({
    integrationId: String(integration._id),

    remoteJid,

    leadId: String(lead._id),

    name: lead.name || '',

    isGroup: false,

    metadata: {
      source: 'leads-na-mao-crm',
    },
  })

  // Cria ou recupera a conversa vinculada ao contato e ao lead.

  const conversation = await upsertWhatsAppConversation({
    whatsappContactId: String(contact._id),

    integrationId: String(integration._id),

    leadId: String(lead._id),

    assignedTo: lead.assignedTo
      ? String(lead.assignedTo._id || lead.assignedTo)
      : null,

    name: lead.name || '',
  })

  return conversation
}

// ==========================================================

// EXPORT DEFAULT

// ==========================================================

export default {
  createIntegration,

  listIntegrations,

  sendTextMessage,

  sendMediaMessage,

  getIntegrationSecrets,

  getQrCode,

  verifyWebhookSignature,

  handleWebhook,

  updateWebhookSecret,

  upsertWhatsAppContact,

  upsertWhatsAppConversation,

  prepareLeadWhatsAppConversation,
}
