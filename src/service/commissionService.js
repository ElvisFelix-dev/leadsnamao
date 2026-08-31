import mongoose from 'mongoose'

import Commission from '../models/Commission.js'
import Sale from '../models/Sale.js'

/**
 * Serviço de Comissão Integrado
 *
 * Responsável por:
 * - Gerar comissão a partir de venda
 * - Atualizar comissão existente
 * - Consultar comissões
 * - Resumo financeiro do corretor
 * - Aprovar comissão
 * - Marcar comissão como paga
 * - Cancelar comissão
 * - Backfill
 */
class CommissionService {
  // =========================================================
  // HELPERS
  // =========================================================

  /**
   * Retorna um número quando o valor foi realmente informado.
   *
   * Diferente de `||`, preserva corretamente o valor 0.
   */
  static getNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === '') {
      return fallback
    }

    const number = Number(value)

    return Number.isFinite(number) ? number : fallback
  }

  /**
   * Obtém configuração da comissão.
   *
   * A ordem de prioridade é:
   *
   * 1. Configuração enviada pelo frontend
   * 2. Configuração existente na Sale
   * 3. Valor padrão
   */
  static resolvePercentage(config, configKey, saleValue, fallback) {
    if (
      config &&
      config[configKey] !== undefined &&
      config[configKey] !== null &&
      config[configKey] !== ''
    ) {
      return this.getNumber(config[configKey], fallback)
    }

    if (saleValue !== undefined && saleValue !== null && saleValue !== '') {
      return this.getNumber(saleValue, fallback)
    }

    return fallback
  }

  /**
   * Valida e normaliza a distribuição.
   *
   * A distribuição precisa totalizar exatamente 100%.
   */
  static normalizeDistribution({
    sellerPercentage,
    capturerPercentage,
    companyPercentage,
    hasCapturer,
  }) {
    let seller = this.getNumber(sellerPercentage)
    let capturer = this.getNumber(capturerPercentage)
    const company = this.getNumber(companyPercentage)

    // -------------------------------------------------------
    // Sem captador
    // -------------------------------------------------------
    //
    // Se não existe captador, qualquer percentual destinado
    // a ele é redistribuído para o vendedor.
    //
    if (!hasCapturer) {
      seller += capturer
      capturer = 0
    }

    // -------------------------------------------------------
    // Validação dos valores
    // -------------------------------------------------------

    if (seller < 0 || capturer < 0 || company < 0) {
      throw new Error('Os percentuais da distribuição não podem ser negativos.')
    }

    if (seller > 100 || capturer > 100 || company > 100) {
      throw new Error(
        'Os percentuais da distribuição não podem ultrapassar 100%.',
      )
    }

    const total = seller + capturer + company

    // -------------------------------------------------------
    // Tolerância para casas decimais
    // -------------------------------------------------------

    const normalizedTotal = Number(total.toFixed(6))

    if (Math.abs(normalizedTotal - 100) > 0.000001) {
      throw new Error(
        `A distribuição da comissão deve totalizar 100%. Atualmente: ${normalizedTotal}%.`,
      )
    }

    return {
      sellerPercentage: seller,
      capturerPercentage: capturer,
      companyPercentage: company,
      totalPercentage: normalizedTotal,
    }
  }

  /**
   * Calcula os valores financeiros da comissão.
   */
  static calculateAmounts({
    saleAmount,
    totalPercentage,
    sellerPercentage,
    capturerPercentage,
    companyPercentage,
  }) {
    const amount = this.getNumber(saleAmount)
    const totalPercent = this.getNumber(totalPercentage)

    const totalAmount = amount * (totalPercent / 100)

    const sellerAmount = totalAmount * (this.getNumber(sellerPercentage) / 100)

    const capturerAmount =
      totalAmount * (this.getNumber(capturerPercentage) / 100)

    const companyAmount =
      totalAmount * (this.getNumber(companyPercentage) / 100)

    return {
      totalAmount,
      sellerAmount,
      capturerAmount,
      companyAmount,
    }
  }

  // =========================================================
  // CRIAR COMISSÃO A PARTIR DA VENDA
  // =========================================================

  static async createFromSale(saleId, userId, config = {}) {
    const session = await mongoose.startSession()

    session.startTransaction()

    try {
      const sale = await Sale.findById(saleId)
        .populate('lead property sellerBroker acquisitionBroker')
        .session(session)

      if (!sale) {
        throw new Error('Venda não encontrada')
      }

      // -----------------------------------------------------
      // Venda precisa estar concluída
      // -----------------------------------------------------

      if (sale.status !== 'completed') {
        throw new Error('Venda não está concluída')
      }

      // -----------------------------------------------------
      // Verifica comissão existente
      // -----------------------------------------------------

      const existing = await Commission.findOne({
        sale: saleId,
      }).session(session)

      if (existing) {
        const updated = await this.updateCommission(
          existing._id,
          sale,
          userId,
          config,
          session,
        )

        await session.commitTransaction()
        session.endSession()

        return updated
      }

      // -----------------------------------------------------
      // Captador
      // -----------------------------------------------------

      const hasCapturer =
        sale.acquisitionBroker !== null && sale.acquisitionBroker !== undefined

      // -----------------------------------------------------
      // Percentual total da comissão
      // -----------------------------------------------------

      const totalPercentage = this.resolvePercentage(
        config,
        'totalPercentage',
        sale.commission?.totalPercentage,
        5,
      )

      if (totalPercentage < 0) {
        throw new Error('O percentual total da comissão não pode ser negativo.')
      }

      // -----------------------------------------------------
      // Distribuição
      // -----------------------------------------------------

      const sellerPercentage = this.resolvePercentage(
        config,
        'sellerPercentage',
        sale.commission?.seller?.percentage,
        hasCapturer ? 60 : 100,
      )

      const capturerPercentage = hasCapturer
        ? this.resolvePercentage(
            config,
            'capturerPercentage',
            sale.commission?.acquisition?.percentage,
            30,
          )
        : 0

      const companyPercentage = this.resolvePercentage(
        config,
        'companyPercentage',
        sale.commission?.company?.percentage,
        hasCapturer ? 10 : 0,
      )

      const distribution = this.normalizeDistribution({
        sellerPercentage,
        capturerPercentage,
        companyPercentage,
        hasCapturer,
      })

      // -----------------------------------------------------
      // Valores
      // -----------------------------------------------------

      const amounts = this.calculateAmounts({
        saleAmount: sale.saleAmount,
        totalPercentage,
        sellerPercentage: distribution.sellerPercentage,
        capturerPercentage: distribution.capturerPercentage,
        companyPercentage: distribution.companyPercentage,
      })

      // -----------------------------------------------------
      // Criação
      // -----------------------------------------------------

      const commission = new Commission({
        sale: sale._id,

        lead: sale.lead?._id || sale.lead,

        property: sale.property?._id || sale.property,

        sellerBroker: sale.sellerBroker?._id || sale.sellerBroker,

        capturerBroker: hasCapturer
          ? sale.acquisitionBroker?._id || sale.acquisitionBroker
          : null,

        totalPercentage,

        totalAmount: amounts.totalAmount,

        distribution: {
          seller: {
            percentage: distribution.sellerPercentage,

            amount: amounts.sellerAmount,
          },

          capturer: {
            percentage: distribution.capturerPercentage,

            amount: amounts.capturerAmount,
          },

          company: {
            percentage: distribution.companyPercentage,

            amount: amounts.companyAmount,
          },
        },

        status: 'pending',

        createdBy: userId,

        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      await commission.save({
        session,
      })

      await session.commitTransaction()
      session.endSession()

      console.log(
        `✅ Comissão criada para venda ${sale.saleNumber}: R$ ${amounts.totalAmount.toFixed(2)}`,
      )

      console.log(
        `📊 Distribuição: Vendedor ${distribution.sellerPercentage}%, Captador ${distribution.capturerPercentage}%, Empresa ${distribution.companyPercentage}%`,
      )

      return commission
    } catch (error) {
      await session.abortTransaction()
      session.endSession()

      throw error
    }
  }

  // =========================================================
  // ATUALIZAR COMISSÃO
  // =========================================================

  static async updateCommission(
    commissionId,
    sale,
    userId,
    config = {},
    session,
  ) {
    const hasCapturer =
      sale.acquisitionBroker !== null && sale.acquisitionBroker !== undefined

    // -------------------------------------------------------
    // Percentual total
    // -------------------------------------------------------

    const totalPercentage = this.resolvePercentage(
      config,
      'totalPercentage',
      sale.commission?.totalPercentage,
      5,
    )

    if (totalPercentage < 0) {
      throw new Error('O percentual total da comissão não pode ser negativo.')
    }

    // -------------------------------------------------------
    // Distribuição
    // -------------------------------------------------------

    const sellerPercentage = this.resolvePercentage(
      config,
      'sellerPercentage',
      sale.commission?.seller?.percentage,
      hasCapturer ? 60 : 100,
    )

    const capturerPercentage = hasCapturer
      ? this.resolvePercentage(
          config,
          'capturerPercentage',
          sale.commission?.acquisition?.percentage,
          30,
        )
      : 0

    const companyPercentage = this.resolvePercentage(
      config,
      'companyPercentage',
      sale.commission?.company?.percentage,
      hasCapturer ? 10 : 0,
    )

    const distribution = this.normalizeDistribution({
      sellerPercentage,
      capturerPercentage,
      companyPercentage,
      hasCapturer,
    })

    // -------------------------------------------------------
    // Valores
    // -------------------------------------------------------

    const amounts = this.calculateAmounts({
      saleAmount: sale.saleAmount,
      totalPercentage,
      sellerPercentage: distribution.sellerPercentage,
      capturerPercentage: distribution.capturerPercentage,
      companyPercentage: distribution.companyPercentage,
    })

    // -------------------------------------------------------
    // Busca comissão
    // -------------------------------------------------------

    const commission = await Commission.findById(commissionId).session(session)

    if (!commission) {
      throw new Error('Comissão não encontrada')
    }

    // -------------------------------------------------------
    // Atualiza
    // -------------------------------------------------------

    commission.totalPercentage = totalPercentage

    commission.totalAmount = amounts.totalAmount

    commission.capturerBroker = hasCapturer
      ? sale.acquisitionBroker?._id || sale.acquisitionBroker
      : null

    commission.distribution.seller.percentage = distribution.sellerPercentage

    commission.distribution.seller.amount = amounts.sellerAmount

    commission.distribution.capturer.percentage =
      distribution.capturerPercentage

    commission.distribution.capturer.amount = amounts.capturerAmount

    commission.distribution.company.percentage = distribution.companyPercentage

    commission.distribution.company.amount = amounts.companyAmount

    await commission.save({
      session,
    })

    return commission
  }

  // =========================================================
  // BUSCAR POR CORRETOR
  // =========================================================

  static async getByBroker(brokerId, filters = {}) {
    const cleanFilters = {
      ...filters,
    }

    // Remove undefined para não gerar filtros inválidos
    Object.keys(cleanFilters).forEach((key) => {
      if (cleanFilters[key] === undefined || cleanFilters[key] === '') {
        delete cleanFilters[key]
      }
    })

    const query = {
      $or: [
        {
          sellerBroker: brokerId,
        },
        {
          capturerBroker: brokerId,
        },
      ],

      ...cleanFilters,
    }

    return Commission.find(query)
      .populate('sale', 'saleNumber saleAmount status saleDate')
      .populate('lead', 'name phone email')
      .populate('property', 'title code address')
      .populate('sellerBroker', 'name email avatar')
      .populate('capturerBroker', 'name email avatar')
      .sort({
        createdAt: -1,
      })
  }

  // =========================================================
  // RESUMO FINANCEIRO DO CORRETOR
  // =========================================================

  static async getSummary(brokerId) {
    const brokerObjectId = new mongoose.Types.ObjectId(brokerId)

    const statuses = ['pending', 'approved', 'paid']

    const summary = {}

    for (const status of statuses) {
      const result = await Commission.aggregate([
        {
          $match: {
            status,

            $or: [
              {
                sellerBroker: brokerObjectId,
              },
              {
                capturerBroker: brokerObjectId,
              },
            ],
          },
        },

        {
          $project: {
            amount: {
              $cond: [
                {
                  $eq: ['$sellerBroker', brokerObjectId],
                },

                '$distribution.seller.amount',

                '$distribution.capturer.amount',
              ],
            },
          },
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: '$amount',
            },

            count: {
              $sum: 1,
            },
          },
        },
      ])

      summary[status] = result[0] || {
        total: 0,
        count: 0,
      }
    }

    return summary
  }

  // =========================================================
  // APROVAR
  // =========================================================

  static async approve(commissionId, userId) {
    const commission = await Commission.findById(commissionId)

    if (!commission) {
      throw new Error('Comissão não encontrada')
    }

    return commission.approve(userId)
  }

  // =========================================================
  // MARCAR COMO PAGA
  // =========================================================

  static async markAsPaid(
    commissionId,
    userId,
    paymentMethod = 'bank_transfer',
  ) {
    const commission = await Commission.findById(commissionId)

    if (!commission) {
      throw new Error('Comissão não encontrada')
    }

    return commission.markAsPaid(userId, paymentMethod)
  }

  // =========================================================
  // CANCELAR
  // =========================================================

  static async cancel(commissionId, userId, reason = '') {
    const commission = await Commission.findById(commissionId)

    if (!commission) {
      throw new Error('Comissão não encontrada')
    }

    return commission.cancel(userId, reason)
  }

  // =========================================================
  // BACKFILL
  // =========================================================

  static async backfillCommissions(userId) {
    const sales = await Sale.find({
      status: 'completed',

      _id: {
        $nin: await Commission.distinct('sale'),
      },
    })

    const results = {
      total: sales.length,
      created: 0,
      failed: 0,
      errors: [],
    }

    for (const sale of sales) {
      try {
        await this.createFromSale(sale._id, userId)

        results.created++
      } catch (error) {
        results.failed++

        results.errors.push({
          saleId: sale._id,
          saleNumber: sale.saleNumber,
          error: error.message,
        })
      }
    }

    return results
  }
}

// =========================================================
// EXPORTS
// =========================================================

export default CommissionService

export const {
  createFromSale,
  getByBroker,
  getSummary,
  approve,
  markAsPaid,
  cancel,
  backfillCommissions,
} = CommissionService
