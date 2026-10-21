import { notifyUsers } from '../service/notifications/notificationService.js'
import {
  createPublicProposalLink,
  getPublicProposalContext,
  submitPublicProposal,
  revokePublicProposalLink,
} from '../service/publicProposalService.js'

const respondError = (res, error) => res.status(error?.statusCode || 500).json({
  success: false,
  message: error?.message || 'Erro interno do servidor.',
})

export const createLink = async (req, res) => {
  try {
    const result = await createPublicProposalLink({
      leadId: req.body?.leadId,
      propertyId: req.body?.propertyId,
      user: req.user,
    })
    return res.status(201).json({ success: true, message: 'Link público criado. Copie e compartilhe com o cliente.', data: result })
  } catch (error) { return respondError(res, error) }
}

export const getContext = async (req, res) => {
  try {
    const data = await getPublicProposalContext({ token: req.params.token })
    return res.json({ success: true, data })
  } catch (error) { return respondError(res, error) }
}

export const submit = async (req, res) => {
  try {
    const proposal = await submitPublicProposal({ token: req.params.token, data: req.body })
    try {
      await notifyUsers([proposal.broker?._id || proposal.broker], {
        type: 'proposal.public_submitted',
        title: 'Nova proposta recebida do cliente',
        message: `Uma proposta pública para ${proposal.property?.name || 'um imóvel'} está aguardando sua análise.`,
        link: `/proposals/${proposal._id}`,
        entityType: 'Proposal', entityId: proposal._id,
        priority: 'high', dedupeKey: `proposal-public-submitted:${proposal._id}`,
      })
    } catch (error) { console.error('[PublicProposalController] Falha ao notificar corretor:', error.message) }
    return res.status(201).json({
      success: true,
      message: 'Proposta recebida! O corretor responsável fará a análise inicial.',
      data: { proposalId: proposal._id, proposalNumber: proposal.proposalNumber || null },
    })
  } catch (error) { return respondError(res, error) }
}

export const revokeLink = async (req, res) => {
  try {
    const result = await revokePublicProposalLink({ linkId: req.params.linkId, user: req.user })
    return res.json({ success: true, message: 'Link revogado.', data: result })
  } catch (error) { return respondError(res, error) }
}
