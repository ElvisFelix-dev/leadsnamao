import crypto from 'crypto'
import mongoose from 'mongoose'
import Proposal, { PROPOSAL_STATUS } from '../models/Proposal.js'
import PublicProposalLink from '../models/PublicProposalLink.js'
import Lead from '../models/Lead.js'
import Property from '../models/Property.js'
import User from '../models/User.js'
import Opportunity, { OPPORTUNITY_STAGES, OPPORTUNITY_TYPES } from '../models/Opportunity.js'

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })
const validId = (id) => mongoose.Types.ObjectId.isValid(id)
const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex')
const normalizeMoney = (value, field) => {
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) throw fail(`O campo ${field} precisa ser um valor válido.`)
  return number
}
const addDays = (date, days) => new Date(date.getTime() + days * 86400000)

const assertCanManageLead = ({ user, lead }) => {
  if (!user?._id) throw fail('Usuário não autenticado.', 401)
  if (user.role === 'admin') return
  if (user.role !== 'broker') throw fail('Você não tem permissão para criar links de proposta.', 403)
  if (String(lead.assignedTo?._id || lead.assignedTo || '') !== String(user._id)) {
    throw fail('Você não é o corretor responsável por este lead.', 403)
  }
}

export const createPublicProposalLink = async ({ leadId, propertyId, user }) => {
  if (!validId(leadId) || !validId(propertyId)) throw fail('Lead ou imóvel inválido.')
  const [lead, property] = await Promise.all([
    Lead.findById(leadId),
    Property.findById(propertyId),
  ])
  if (!lead) throw fail('Lead não encontrado.', 404)
  if (!property || property.isDeleted || property.active === false || property.status !== 'disponivel') throw fail('Imóvel não encontrado ou indisponível.', 404)
  assertCanManageLead({ user, lead })

  const brokerId = user.role === 'admin' ? (lead.assignedTo?._id || lead.assignedTo) : user._id
  if (!brokerId) throw fail('Este lead ainda não possui corretor responsável.', 409)
  if (lead.assignedTo && String(lead.assignedTo?._id || lead.assignedTo) !== String(brokerId)) {
    throw fail('O link precisa pertencer ao corretor responsável pelo lead.', 403)
  }
  const broker = await User.findById(brokerId).select('_id role name email')
  if (!broker || broker.role !== 'broker') throw fail('Corretor responsável inválido.', 409)

  const rawToken = crypto.randomBytes(32).toString('base64url')
  const expiresAt = addDays(new Date(), 14)
  await PublicProposalLink.create({
    tokenHash: tokenHash(rawToken), lead: lead._id, property: property._id,
    broker: broker._id, createdBy: user._id, expiresAt,
  })
  return {
    token: rawToken,
    expiresAt,
    path: `/proposta-publica/${rawToken}`,
    lead: { _id: lead._id, name: lead.name },
    property: { _id: property._id, name: property.name, code: property.code },
  }
}

const getValidLink = async (token, session = null) => {
  if (typeof token !== 'string' || token.length < 30 || token.length > 200) {
    throw fail('Link de proposta inválido.', 404)
  }
  let query = PublicProposalLink.findOne({ tokenHash: tokenHash(token), revokedAt: null })
    .populate('lead', 'name email phone assignedTo stage status')
    .populate('property')
    .populate('broker', 'name email phone whatsapp role')
  if (session) query = query.session(session)
  const link = await query
  if (!link || link.usedAt || link.expiresAt <= new Date()) throw fail('Este link expirou ou já foi utilizado.', 410)
  if (!link.lead || !link.property || !link.broker) throw fail('Não foi possível validar os dados desta proposta.', 409)
  if (String(link.lead.assignedTo?._id || link.lead.assignedTo || '') !== String(link.broker._id)) {
    throw fail('O responsável por este lead mudou. Solicite um novo link ao corretor.', 409)
  }
  return link
}

export const getPublicProposalContext = async ({ token }) => {
  const link = await getValidLink(token)
  const property = link.property
  const price = property.purpose === 'aluguel'
    ? Number(property.prices?.rentPrice || 0)
    : Number(property.prices?.salePrice || 0)
  return {
    expiresAt: link.expiresAt,
    customer: { name: link.lead.name },
    property: {
      _id: property._id,
      name: property.name || property.title || 'Imóvel',
      code: property.code || '',
      slug: property.slug || '',
      coverImage: property.coverImage || '',
      purpose: property.purpose || 'venda',
      price,
      address: property.address || null,
    },
    broker: { name: link.broker.name, email: link.broker.email },
  }
}

export const submitPublicProposal = async ({ token, data = {} }) => {
  const session = await mongoose.startSession()
  try {
    let proposalId = null
    await session.withTransaction(async () => {
      const link = await getValidLink(token, session)
      const lead = await Lead.findById(link.lead._id).session(session)
      const property = await Property.findById(link.property._id).session(session)
      const broker = await User.findById(link.broker._id).session(session)
      if (!lead || !property || !broker) throw fail('Lead, imóvel ou corretor não encontrado.', 404)
      if (String(lead.assignedTo || '') !== String(broker._id)) throw fail('O responsável pelo lead mudou. Solicite um novo link.', 409)
      if (property.isDeleted || property.active === false || property.status !== 'disponivel') throw fail('O imóvel não está disponível.', 409)

      const propertyPrice = normalizeMoney(data.propertyPrice ?? (property.purpose === 'aluguel' ? property.prices?.rentPrice : property.prices?.salePrice) ?? 0, 'valor do imóvel')
      const proposalPrice = normalizeMoney(data.proposalPrice, 'valor da proposta')
      const downPayment = normalizeMoney(data.downPayment ?? 0, 'entrada')
      const financing = normalizeMoney(data.financing ?? 0, 'financiamento')
      const fgts = normalizeMoney(data.fgts ?? 0, 'FGTS')
      if (proposalPrice <= 0) throw fail('Informe um valor de proposta maior que zero.')
      if (downPayment + financing + fgts > proposalPrice) throw fail('Entrada, financiamento e FGTS não podem superar o valor da proposta.')
      const validityDays = Math.min(Math.max(parseInt(data.validityDays, 10) || 7, 1), 30)
      const paymentMethod = ['cash', 'financing', 'fgts', 'mixed'].includes(data.paymentMethod) ? data.paymentMethod : 'financing'
      const opportunity = await Opportunity.create([{
        title: `Proposta pública — ${lead.name} — ${property.name || property.code || property._id}`,
        description: 'Oportunidade criada automaticamente pelo envio de uma proposta pública.',
        lead: lead._id,
        property: property._id,
        assignedTo: broker._id,
        createdBy: broker._id,
        type: property.purpose === 'aluguel' ? OPPORTUNITY_TYPES.LOCACAO : OPPORTUNITY_TYPES.VENDA,
        stage: OPPORTUNITY_STAGES.PROPOSTA_SOLICITADA,
      }], { session })
      const opportunityDoc = opportunity[0]
      const now = new Date()
      const prop = await Proposal.create([{
        opportunity: opportunityDoc._id,
        lead: lead._id,
        property: property._id,
        broker: broker._id,
        createdBy: broker._id,
        status: PROPOSAL_STATUS.DRAFT,
        origin: 'public_link',
        brokerReviewStatus: 'pending',
        publicSubmittedAt: now,
        values: {
          propertyPrice,
          proposalPrice,
          downPayment,
          financing,
          fgts,
          balance: Math.max(proposalPrice - downPayment - financing - fgts, 0),
        },
        paymentMethod,
        installments: Math.max(parseInt(data.installments, 10) || 0, 0),
        installmentValue: normalizeMoney(data.installmentValue ?? 0, 'valor da parcela'),
        validityDays,
        expiresAt: addDays(now, validityDays),
        clientMessage: typeof data.clientMessage === 'string' ? data.clientMessage.trim().slice(0, 3000) : '',
        leadSnapshot: { name: lead.name, email: lead.email, phone: lead.phone, source: lead.source, stage: lead.stage },
        propertySnapshot: {
          code: property.code || '', title: property.name || property.title || '', slug: property.slug || '',
          status: property.status || '', price: propertyPrice,
          address: property.address || {},
        },
        history: [{
          action: 'public_submitted', performedBy: broker._id,
          previousStatus: null, newStatus: PROPOSAL_STATUS.DRAFT,
          comment: 'Proposta enviada pelo formulário público; aguardando análise do corretor.',
          metadata: { origin: 'public_link' }, performedAt: now,
        }],
      }], { session })
      proposalId = prop[0]._id
      link.usedAt = now
      await link.save({ session })
    })
    return await Proposal.findById(proposalId)
      .populate('lead', 'name email phone stage')
      .populate('property')
      .populate('broker', 'name email phone whatsapp avatar')
      .populate('opportunity')
  } finally {
    await session.endSession()
  }
}

export const revokePublicProposalLink = async ({ linkId, user }) => {
  if (!user?._id || user.role !== 'admin') throw fail('Somente o gestor pode revogar links por este endpoint.', 403)
  if (!validId(linkId)) throw fail('ID do link inválido.')
  const link = await PublicProposalLink.findById(linkId)
  if (!link) throw fail('Link não encontrado.', 404)
  link.revokedAt = new Date()
  await link.save()
  return { revoked: true }
}
