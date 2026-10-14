import mongoose from 'mongoose'
import Lead from '../models/Lead.js'
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
  const integrationId = String(req.query.integrationId || '').trim()

  if (!integrationId) {
    throw new AppError('Informe o ID da integração WhatsApp.', 400)
  }

  const result = await whatsappService.getQrCode(integrationId)

  res.status(200).json({
    success: true,
    data: result,
  })
})

export const receiveWebhook = asyncHandler(async (req, res) => {
  console.info('[WA-AKG] Requisição de webhook recebida:', {
    method: req.method,
    path: req.originalUrl,
    contentType: req.headers['content-type'] || null,
    rawBodyBytes: Buffer.isBuffer(req.rawBody) ? req.rawBody.length : 0,
    hasSignature: Boolean(req.headers['x-webhook-signature']),
  })

  const result = await whatsappService.handleWebhook({
    rawBody: req.rawBody,
    body: req.body,
    signature: req.headers['x-webhook-signature'],
    io: req.app.get('io'),
  })

  console.info('[WA-AKG] Webhook processado:', {
    event: result?.event || null,
    success: result?.success ?? false,
    ignored: result?.ignored ?? false,
    duplicate: result?.duplicate ?? false,
    reason: result?.reason || null,
    conversationId: result?.conversationId || null,
  })

  res.status(200).json({
    success: true,
    message: 'Webhook recebido com sucesso.',
    data: result,
  })
})

export const updateWebhookSecret = asyncHandler(async (req, res) => {
  const { integrationId } = req.params
  const { webhookSecret } = req.body

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

export const prepareLeadConversation = asyncHandler(async (req, res) => {
  const { leadId } = req.params

  if (!mongoose.Types.ObjectId.isValid(String(leadId))) {
    throw new AppError('ID do lead inválido.', 400)
  }

  const userId = String(req.user?._id || req.user?.id || '')

  if (!userId) {
    throw new AppError('Usuário não autenticado.', 401)
  }

  const isAdmin = req.user?.isAdmin === true || req.user?.role === 'admin'

  const lead = await Lead.findOne({
    _id: leadId,
    isDeleted: { $ne: true },
  }).select('_id name phone phoneNormalized assignedTo')

  if (!lead) {
    throw new AppError('Lead não encontrado.', 404)
  }

  // Um corretor só pode abrir a conversa de um lead
  // atribuído a ele. Administradores podem acessar todos.
  if (!isAdmin && String(lead.assignedTo || '') !== userId) {
    throw new AppError('Você não tem permissão para acessar este lead.', 403)
  }

  const conversation = await whatsappService.prepareLeadWhatsAppConversation({
    lead,
  })

  return res.status(200).json({
    success: true,
    message: 'Conversa WhatsApp preparada com sucesso.',
    data: conversation,
  })
})
