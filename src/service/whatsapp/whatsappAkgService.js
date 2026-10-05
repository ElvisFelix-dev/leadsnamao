import axios from 'axios'
import crypto from 'crypto'
import WhatsAppIntegration from '../../models/WhatsAppIntegration.js'
import AppError from '../../utils/AppError.js'

const normalizeBaseUrl = (value) => String(value || '').replace(/\/+$/, '')

const normalizePhone = (value) => String(value || '').replace(/\D/g, '')

const toJid = (phone) => {
  const normalized = normalizePhone(phone)

  if (!normalized) {
    throw new AppError('Número de WhatsApp inválido.', 400)
  }

  return normalized.endsWith('@s.whatsapp.net')
    ? normalized
    : `${normalized}@s.whatsapp.net`
}

const getIntegrationWithSecrets = async (integrationId = null) => {
  const query = { enabled: true }

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

export const listIntegrations = async () => {
  return WhatsAppIntegration.find()
    .select('-apiKey -webhookSecret')
    .sort({ createdAt: -1 })
    .lean()
}

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
  const url = `${normalizeBaseUrl(integration.baseUrl)}/api/messages/${encodeURIComponent(integration.sessionId)}/${encodeURIComponent(jid)}/send`

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
      { _id: integration._id },
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
      { _id: integration._id },
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
      `WA-AKG não conseguiu enviar a mensagem${status ? ` (HTTP ${status})` : ''}: ${providerMessage}`,
      status && status >= 400 && status < 500 ? status : 502,
    )
  }
}

export const getIntegrationSecrets = async (integrationId) => {
  const integration = await WhatsAppIntegration.findById(integrationId).select(
    '+apiKey +webhookSecret',
  )

  if (!integration) {
    throw new AppError('Integração WhatsApp não encontrada.', 404)
  }

  return integration
}

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

/**
 * ============================================================
 * WEBHOOK WA-AKG
 * ============================================================
 */

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

  /*
   * Neste primeiro estágio NÃO vamos salvar
   * Conversation ou Message.
   *
   * Apenas confirmamos que o webhook chegou
   * corretamente e foi autenticado.
   */

  if (payload.event === 'message.received') {
    const data = payload.data || {}

    console.log('📱 Mensagem recebida')
    console.log('From:', data.from)
    console.log('Remote JID:', data.key?.remoteJid)
    console.log('Nome:', data.pushName)
    console.log('Tipo:', data.type)
    console.log('Mensagem:', data.content)
    console.log('Grupo:', data.isGroup)
  }

  if (payload.event === 'message.sent') {
    console.log('📤 Mensagem enviada')
  }

  if (payload.event === 'connection.update') {
    console.log('🔌 Atualização da conexão')
  }

  console.log('==========================================')
  console.log('')

  return {
    received: true,
    event: payload.event,
    sessionId,
    integrationId: integration._id,
  }
}

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
