// controllers/orchestratorController.js
import orchestratorService from '../service/orchestratorService.js'

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const getUser = (req) => {
  return req.user
}

const sendSuccess = ({
  res,
  statusCode = 200,
  message = 'Operação realizada com sucesso.',
  data = null,
}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  })
}

const sendError = (res, error) => {
  const statusCode = error?.statusCode || 500

  return res.status(statusCode).json({
    success: false,
    message: error?.message || 'Erro interno do servidor.',
    ...(process.env.NODE_ENV !== 'production' && error?.stack
      ? {
          stack: error.stack,
        }
      : {}),
  })
}

/*
|--------------------------------------------------------------------------
| APROVAR PROPOSTA (FLUXO COMPLETO)
|--------------------------------------------------------------------------
| POST /api/orchestrator/proposals/:proposalId/approve
|
| Fluxo:
| 1. Aprova a proposta
| 2. Cria a venda automaticamente
| 3. Gera a comissão
| 4. Atualiza oportunidade para WON
| 5. Atualiza lead para FECHADO
| 6. Atualiza imóvel para VENDIDO
|
| Body (opcional):
| {
|   "comment": "Proposta aprovada pela diretoria"
| }
|--------------------------------------------------------------------------
*/

export const approveProposal = async (req, res) => {
  try {
    const { proposalId } = req.params
    const user = getUser(req)
    const { comment } = req.body || {}

    console.log('🔍 [Controller] proposalId:', proposalId)
    console.log('🔍 [Controller] user._id:', user._id)
    console.log('🔍 [Controller] comment:', comment)

    // 🔥 CORRIGIDO: Passar parâmetros separados, NÃO um objeto!
    const result = await orchestratorService.processProposalApproval(
      proposalId, // ← Primeiro parâmetro: string
      user._id, // ← Segundo parâmetro: ObjectId
    )

    return sendSuccess({
      res,
      statusCode: 200,
      message:
        'Proposta aprovada com sucesso! Venda e comissão geradas automaticamente.',
      data: result,
    })
  } catch (error) {
    console.error('❌ [Controller] Erro:', error)
    return sendError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| DASHBOARD DO CORRETOR
|--------------------------------------------------------------------------
| GET /api/orchestrator/dashboard/broker
|
| Retorna:
| - Total de oportunidades abertas
| - Total de propostas pendentes
| - Total de vendas ativas
| - Resumo de comissões (pendente, aprovado, pago)
| - VGV pendente
| - Total a receber
|--------------------------------------------------------------------------
*/

export const getBrokerDashboard = async (req, res) => {
  try {
    const user = getUser(req)

    const dashboard = await orchestratorService.getBrokerDashboard(user._id)

    return sendSuccess({
      res,
      statusCode: 200,
      message: 'Dashboard carregado com sucesso.',
      data: dashboard,
    })
  } catch (error) {
    return sendError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| DASHBOARD DO ADMIN
|--------------------------------------------------------------------------
| GET /api/orchestrator/dashboard/admin
|
| Retorna visão geral da imobiliária:
| - Total de oportunidades
| - Total de propostas
| - Total de vendas
| - Total de comissões
| - VGV total
| - Ranking de corretores
|
| Acesso restrito a administradores.
|--------------------------------------------------------------------------
*/

export const getAdminDashboard = async (req, res) => {
  try {
    const user = getUser(req)

    if (!user.isAdmin) {
      const error = new Error('Acesso negado. Somente administradores.')
      error.statusCode = 403
      throw error
    }

    const dashboard = await orchestratorService.getAdminDashboard()

    return sendSuccess({
      res,
      statusCode: 200,
      message: 'Dashboard administrativo carregado com sucesso.',
      data: dashboard,
    })
  } catch (error) {
    return sendError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| PIPELINE COMPLETO
|--------------------------------------------------------------------------
| GET /api/orchestrator/pipeline
|
| Retorna todas as etapas do funil:
| - Oportunidades por stage
| - Propostas por status
| - Vendas por status
| - Comissões por status
|--------------------------------------------------------------------------
*/

export const getPipeline = async (req, res) => {
  try {
    const user = getUser(req)

    const pipeline = await orchestratorService.getPipeline({
      userId: user._id,
      isAdmin: user.isAdmin || false,
    })

    return sendSuccess({
      res,
      statusCode: 200,
      message: 'Pipeline carregado com sucesso.',
      data: pipeline,
    })
  } catch (error) {
    return sendError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| RESUMO DE COMISSÕES DO CORRETOR
|--------------------------------------------------------------------------
| GET /api/orchestrator/commissions/summary
|
| Retorna resumo financeiro do corretor:
| - Comissões pendentes (total e quantidade)
| - Comissões aprovadas (total e quantidade)
| - Comissões pagas (total e quantidade)
|--------------------------------------------------------------------------
*/

export const getCommissionSummary = async (req, res) => {
  try {
    const user = getUser(req)

    const summary = await orchestratorService.getCommissionSummary(user._id)

    return sendSuccess({
      res,
      statusCode: 200,
      message: 'Resumo de comissões carregado com sucesso.',
      data: summary,
    })
  } catch (error) {
    return sendError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| LISTAR COMISSÕES DO CORRETOR
|--------------------------------------------------------------------------
| GET /api/orchestrator/commissions
|
| Query params:
| - status: pending, approved, paid (opcional)
| - page: 1 (padrão)
| - limit: 20 (padrão)
|
| Exemplo:
| GET /api/orchestrator/commissions?status=pending&page=1&limit=10
|--------------------------------------------------------------------------
*/

export const getCommissions = async (req, res) => {
  try {
    const user = getUser(req)
    const { status, page = 1, limit = 20 } = req.query

    const commissions = await orchestratorService.getCommissions({
      brokerId: user._id,
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    })

    return sendSuccess({
      res,
      statusCode: 200,
      message: 'Comissões carregadas com sucesso.',
      data: commissions,
    })
  } catch (error) {
    return sendError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| MÉTRICAS DE VENDAS
|--------------------------------------------------------------------------
| GET /api/orchestrator/metrics/sales
|
| Query params:
| - startDate: 2024-01-01 (opcional)
| - endDate: 2024-12-31 (opcional)
|
| Exemplo:
| GET /api/orchestrator/metrics/sales?startDate=2024-01-01&endDate=2024-12-31
|--------------------------------------------------------------------------
*/

export const getSalesMetrics = async (req, res) => {
  try {
    const user = getUser(req)
    const { startDate, endDate } = req.query

    const metrics = await orchestratorService.getSalesMetrics({
      userId: user._id,
      isAdmin: user.isAdmin || false,
      startDate,
      endDate,
    })

    return sendSuccess({
      res,
      statusCode: 200,
      message: 'Métricas de vendas carregadas com sucesso.',
      data: metrics,
    })
  } catch (error) {
    return sendError(res, error)
  }
}

/*
|--------------------------------------------------------------------------
| DEFAULT EXPORT
|--------------------------------------------------------------------------
*/

export default {
  approveProposal,
  getBrokerDashboard,
  getAdminDashboard,
  getPipeline,
  getCommissionSummary,
  getCommissions,
  getSalesMetrics,
}
