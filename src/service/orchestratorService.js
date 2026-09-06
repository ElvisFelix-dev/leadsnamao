// services/orchestratorService.js
import mongoose from 'mongoose'
import Proposal, { PROPOSAL_STATUS } from '../models/Proposal.js'
import Sale, { SALE_STATUS, SALE_POPULATE } from '../models/Sale.js'
import Opportunity, { OPPORTUNITY_STATUS } from '../models/Opportunity.js'
import Commission from '../models/Commission.js'
import CommissionService from './commissionService.js'
import User from '../models/User.js'

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const createError = (message, statusCode = 400) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

/*
|--------------------------------------------------------------------------
| ORCHESTRATOR SERVICE
|--------------------------------------------------------------------------
*/

class OrchestratorService {
  /**
   * =========================================================
   * APROVAR PROPOSTA (FLUXO COMPLETO)
   * =========================================================
   */
  async processProposalApproval(proposalId, userId) {
    console.log('🔍 [Service] proposalId:', proposalId)
    console.log('🔍 [Service] userId:', userId)

    // 🔥 VALIDAR E CONVERTER IDs
    let proposalObjectId
    let userObjectId

    try {
      proposalObjectId = new mongoose.Types.ObjectId(proposalId)
      userObjectId = new mongoose.Types.ObjectId(userId)
    } catch (error) {
      console.error('❌ Erro ao converter IDs:', error)
      throw createError('IDs inválidos. Verifique o formato dos IDs.', 400)
    }

    console.log('✅ [Service] IDs convertidos com sucesso:')
    console.log('  📝 proposalObjectId:', proposalObjectId)
    console.log('  👤 userObjectId:', userObjectId)

    const session = await mongoose.startSession()

    try {
      let result = null

      await session.withTransaction(async () => {
        // 1. Buscar proposta
        const proposal =
          await Proposal.findById(proposalObjectId).session(session)

        if (!proposal) {
          throw createError('Proposta não encontrada', 404)
        }

        console.log('✅ [Service] Proposta encontrada:')
        console.log('  📝 ID:', proposal._id)
        console.log('  📊 Status:', proposal.status)
        console.log('  🎯 Opportunity:', proposal.opportunity)

        if (proposal.isDeleted) {
          throw createError('Esta proposta foi removida')
        }

        if (proposal.status !== PROPOSAL_STATUS.PENDING) {
          throw createError(
            `Somente propostas aguardando aprovação podem ser aprovadas. Status atual: ${proposal.status}`,
          )
        }

        // 2. Buscar usuário
        const user = await User.findById(userObjectId).session(session)

        if (!user) {
          console.error('❌ Usuário não encontrado:', userId)
          throw createError('Usuário não encontrado.', 404)
        }

        console.log('✅ [Service] Usuário encontrado:')
        console.log('  👤 ID:', user._id)
        console.log('  👤 Nome:', user.name)
        console.log('  👤 Email:', user.email)

        // 3. Aprovar proposta
        proposal.status = PROPOSAL_STATUS.ACCEPTED
        proposal.approvedBy = user._id
        proposal.approvedAt = new Date()

        proposal.history.push({
          action: 'approved',
          performedBy: user._id,
          previousStatus: PROPOSAL_STATUS.PENDING,
          newStatus: PROPOSAL_STATUS.ACCEPTED,
          comment: 'Proposta aprovada pelo administrador',
          performedAt: new Date(),
        })

        await proposal.save({ session })
        console.log('✅ [Service] Proposta aprovada com sucesso')

        // 🔥 FORÇAR RECARREGAMENTO DA PROPOSTA
        const refreshedProposal = await Proposal.findById(proposal._id).session(
          session,
        )
        console.log(
          '✅ [Service] Proposta recarregada:',
          refreshedProposal.status,
        )

        // 4. Criar venda
        console.log('🔍 [Service] Criando venda...')

        const SaleService = (await import('./saleService.js')).default

        // 🔥 CORRIGIDO: Distribuição deve somar 100%
        // sellerPercentage: 70% + companyPercentage: 30% = 100%
        const saleData = {
          notes: `Venda gerada automaticamente pela aprovação da proposta ${proposal._id}`,
          commission: {
            totalPercentage: 5,
            sellerPercentage: 70,
            acquisitionPercentage: 0,
            companyPercentage: 30,
            ignorePropertyCaptation: true,
          },
        }

        const sale = await SaleService.createSaleFromProposal({
          proposalId: refreshedProposal._id,
          user,
          data: saleData,
        })

        console.log('✅ [Service] Venda criada:')
        console.log('  🏷️ ID:', sale._id)
        console.log('  📝 Número:', sale.saleNumber)
        console.log('  💰 Valor:', sale.saleAmount)

        // 🔥 Concluir a venda automaticamente
        console.log('🔍 [Service] Concluindo venda...')
        const completedSale = await SaleService.completeSale({
          saleId: sale._id,
          user,
          notes: 'Venda concluída automaticamente após aprovação da proposta',
        })
        console.log('✅ [Service] Venda concluída:', completedSale.status)

        // 5. Atualizar oportunidade
        await Opportunity.findByIdAndUpdate(
          proposal.opportunity,
          {
            status: OPPORTUNITY_STATUS.WON,
            sale: completedSale._id,
            wonAt: new Date(),
          },
          { session },
        )
        console.log('✅ [Service] Oportunidade atualizada para WON')

        // 6. Garantir que comissão foi gerada (agora a venda está COMPLETED)
        console.log('🔍 [Service] Verificando comissão...')

        let commission = await Commission.findOne({
          sale: completedSale._id,
        }).session(session)

        if (!commission) {
          console.log('🔍 [Service] Gerando comissão...')
          commission = await CommissionService.createFromSale(
            completedSale._id,
            user._id,
          )
          console.log('✅ [Service] Comissão gerada:', commission._id)
          console.log(`📊 Distribuição: Vendedor 70%, Captador 0%, Empresa 30%`)
        } else {
          console.log('✅ [Service] Comissão já existente:', commission._id)
        }

        // 7. Buscar dados completos
        const finalProposal = await Proposal.findById(proposal._id)
          .populate('lead property broker opportunity')
          .session(session)

        const finalSale = await Sale.findById(completedSale._id)
          .populate(SALE_POPULATE)
          .session(session)

        const finalCommission = await Commission.findById(commission._id)
          .populate('sellerBroker capturerBroker lead property')
          .session(session)

        result = {
          proposal: finalProposal,
          sale: finalSale,
          commission: finalCommission,
        }
      })

      console.log('✅ [Service] Fluxo concluído com sucesso!')
      return result
    } catch (error) {
      console.error('❌ Erro no processProposalApproval:', error.message)
      throw error
    } finally {
      await session.endSession()
    }
  }

  /**
   * =========================================================
   * DASHBOARD DO CORRETOR
   * =========================================================
   */
  async getBrokerDashboard(brokerId) {
    const [opportunities, proposals, sales, commissions, pendingVGV] =
      await Promise.all([
        Opportunity.countDocuments({
          assignedTo: brokerId,
          status: OPPORTUNITY_STATUS.OPEN,
          isArchived: false,
        }),
        Proposal.countDocuments({
          broker: brokerId,
          status: PROPOSAL_STATUS.PENDING,
          isDeleted: false,
        }),
        Sale.countDocuments({
          sellerBroker: brokerId,
          status: { $in: [SALE_STATUS.PENDING, SALE_STATUS.CONTRACT] },
        }),
        Commission.aggregate([
          {
            $match: {
              $or: [{ sellerBroker: brokerId }, { capturerBroker: brokerId }],
            },
          },
          {
            $group: {
              _id: '$status',
              total: { $sum: '$distribution.seller.amount' },
              count: { $sum: 1 },
            },
          },
        ]),
        Sale.aggregate([
          {
            $match: {
              sellerBroker: brokerId,
              status: { $in: [SALE_STATUS.PENDING, SALE_STATUS.CONTRACT] },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$saleAmount' },
            },
          },
        ]),
      ])

    const commissionSummary = {
      pending: commissions.find((c) => c._id === 'pending') || {
        total: 0,
        count: 0,
      },
      approved: commissions.find((c) => c._id === 'approved') || {
        total: 0,
        count: 0,
      },
      paid: commissions.find((c) => c._id === 'paid') || { total: 0, count: 0 },
    }

    return {
      opportunities,
      proposals,
      sales,
      commissions: commissionSummary,
      pendingVGV: pendingVGV[0]?.total || 0,
      totalToReceive:
        commissionSummary.pending.total + commissionSummary.approved.total,
    }
  }

  /**
   * =========================================================
   * DASHBOARD DO ADMIN
   * =========================================================
   */
  async getAdminDashboard() {
    const [opportunities, proposals, sales, commissions, vgv, ranking] =
      await Promise.all([
        Opportunity.countDocuments({ isArchived: false }),
        Proposal.countDocuments({ isDeleted: false }),
        Sale.countDocuments(),
        Commission.countDocuments(),
        Sale.aggregate([
          {
            $match: { status: SALE_STATUS.COMPLETED },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$saleAmount' },
            },
          },
        ]),
        Sale.aggregate([
          {
            $match: { status: SALE_STATUS.COMPLETED },
          },
          {
            $group: {
              _id: '$sellerBroker',
              totalSales: { $sum: 1 },
              totalVGV: { $sum: '$saleAmount' },
              totalCommission: { $sum: '$commission.seller.amount' },
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'broker',
            },
          },
          {
            $unwind: {
              path: '$broker',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              brokerId: '$_id',
              brokerName: '$broker.name',
              totalSales: 1,
              totalVGV: 1,
              totalCommission: 1,
            },
          },
          {
            $sort: { totalVGV: -1 },
          },
          {
            $limit: 10,
          },
        ]),
      ])

    return {
      summary: {
        opportunities,
        proposals,
        sales,
        commissions,
        totalVGV: vgv[0]?.total || 0,
      },
      ranking,
    }
  }

  /**
   * =========================================================
   * PIPELINE COMPLETO
   * =========================================================
   */
  async getPipeline(userId, isAdmin) {
    const filter = {}

    if (!isAdmin) {
      filter.assignedTo = userId
    }

    const [opportunities, proposals, sales, commissions] = await Promise.all([
      Opportunity.aggregate([
        {
          $match: {
            ...filter,
            isArchived: false,
            status: OPPORTUNITY_STATUS.OPEN,
          },
        },
        {
          $group: {
            _id: '$stage',
            count: { $sum: 1 },
            totalValue: { $sum: '$expectedClosingValue' },
          },
        },
      ]),
      Proposal.aggregate([
        {
          $match: {
            ...(isAdmin ? {} : { broker: userId }),
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$values.proposalPrice' },
          },
        },
      ]),
      Sale.aggregate([
        {
          $match: {
            ...(isAdmin ? {} : { sellerBroker: userId }),
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$saleAmount' },
            totalCommission: { $sum: '$commission.totalAmount' },
          },
        },
      ]),
      Commission.aggregate([
        {
          $match: {
            ...(isAdmin
              ? {}
              : {
                  $or: [{ sellerBroker: userId }, { capturerBroker: userId }],
                }),
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            total: { $sum: '$totalAmount' },
          },
        },
      ]),
    ])

    return {
      opportunities,
      proposals,
      sales,
      commissions,
    }
  }

  /**
   * =========================================================
   * RESUMO DE COMISSÕES
   * =========================================================
   */
  async getCommissionSummary(brokerId) {
    return CommissionService.getSummary(brokerId)
  }

  /**
   * =========================================================
   * LISTAR COMISSÕES
   * =========================================================
   */
  async getCommissions({ brokerId, status, page = 1, limit = 20 }) {
    const skip = (page - 1) * limit
    const filter = {
      $or: [{ sellerBroker: brokerId }, { capturerBroker: brokerId }],
    }

    if (status) {
      filter.status = status
    }

    const [commissions, total] = await Promise.all([
      Commission.find(filter)
        .populate('sale', 'saleNumber saleAmount status saleDate')
        .populate('lead', 'name phone email')
        .populate('property', 'title code')
        .populate('sellerBroker', 'name email avatar')
        .populate('capturerBroker', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Commission.countDocuments(filter),
    ])

    return {
      data: commissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * =========================================================
   * MÉTRICAS DE VENDAS
   * =========================================================
   */
  async getSalesMetrics({ userId, isAdmin, startDate, endDate }) {
    const match = {}

    if (!isAdmin) {
      match.sellerBroker = userId
    }

    if (startDate || endDate) {
      match.saleDate = {}

      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        match.saleDate.$gte = start
      }

      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        match.saleDate.$lte = end
      }
    }

    const [metrics, byStatus, byMonth] = await Promise.all([
      Sale.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalSales: { $sum: 1 },
            totalVGV: { $sum: '$saleAmount' },
            totalCommission: { $sum: '$commission.totalAmount' },
            avgSaleValue: { $avg: '$saleAmount' },
            completedSales: {
              $sum: {
                $cond: [{ $eq: ['$status', SALE_STATUS.COMPLETED] }, 1, 0],
              },
            },
          },
        },
      ]),
      Sale.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$saleAmount' },
          },
        },
      ]),
      Sale.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              year: { $year: '$saleDate' },
              month: { $month: '$saleDate' },
            },
            count: { $sum: 1 },
            totalValue: { $sum: '$saleAmount' },
          },
        },
        {
          $sort: {
            '_id.year': 1,
            '_id.month': 1,
          },
        },
      ]),
    ])

    return {
      summary: metrics[0] || {
        totalSales: 0,
        totalVGV: 0,
        totalCommission: 0,
        avgSaleValue: 0,
        completedSales: 0,
      },
      byStatus,
      byMonth,
    }
  }
}

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

export default new OrchestratorService()
