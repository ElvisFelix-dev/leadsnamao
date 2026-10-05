import asyncHandler from '../middleware/asyncHandler.js'
import AppError from '../utils/AppError.js'
import * as whatsappService from '../service/whatsapp/whatsappAkgService.js'

export const createIntegration = asyncHandler(async (req, res) => {
  const { name, baseUrl, apiKey, sessionId, webhookSecret = '' } = req.body

  const integration = await whatsappService.createIntegration({
    name,
    baseUrl,
    apiKey,
    sessionId,
    webhookSecret,
  })

  res.status(201).json({
    success: true,
    data: {
      id: integration._id,
      name: integration.name,
      provider: integration.provider,
      baseUrl: integration.baseUrl,
      sessionId: integration.sessionId,
      enabled: integration.enabled,
      status: integration.status,
      createdAt: integration.createdAt,
    },
  })
})

export const listIntegrations = asyncHandler(async (req, res) => {
  const integrations = await whatsappService.listIntegrations()

  res.json({
    success: true,
    data: integrations,
  })
})

export const testSend = asyncHandler(async (req, res) => {
  const { integrationId = null, phone, message } = req.body

  if (!phone) {
    throw new AppError('Informe o telefone de destino.', 400)
  }

  const result = await whatsappService.sendTextMessage({
    integrationId,
    phone,
    message,
  })

  res.status(200).json({
    success: true,
    message: 'Mensagem enviada pelo WA-AKG com sucesso.',
    data: result,
  })
})

export const getQrCode = asyncHandler(async (req, res) => {
  const { integrationId = null } = req.query

  const result = await whatsappService.getQrCode({
    integrationId,
  })

  res.status(200).json({
    success: true,
    data: result,
  })
})

export const receiveWebhook = asyncHandler(async (req, res) => {
  const result = await whatsappService.handleWebhook({
    rawBody: req.rawBody,
    body: req.body,
    signature: req.headers['x-webhook-signature'],
  })

  res.status(200).json({
    success: true,
    message: 'Webhook recebido com sucesso.',
    data: result,
  })
})

export const updateWebhookSecret = asyncHandler(async (req, res) => {
  const { integrationId, webhookSecret } = req.body

  const result = await whatsappService.updateWebhookSecret({
    integrationId,
    webhookSecret,
  })

  res.status(200).json({
    success: true,
    message: 'Webhook secret atualizado com sucesso.',
    data: result,
  })
})
