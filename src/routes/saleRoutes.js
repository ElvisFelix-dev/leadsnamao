import express from 'express'

import {
  createSaleFromProposalController,
  getSaleByIdController,
  getSalesController,
  updateSaleStatusController,
  completeSaleController,
  cancelSaleController,
  updateSalePaymentStatusController,
  getSaleMetricsController,
} from '../controllers/saleController.js'

import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

/*
|--------------------------------------------------------------------------
| AUTENTICAÇÃO
|--------------------------------------------------------------------------
|
| Todas as rotas do módulo de vendas exigem autenticação.
|
*/

router.use(protect)

/*
|--------------------------------------------------------------------------
| LISTAGEM DE VENDAS
|--------------------------------------------------------------------------
|
| GET /api/sales
|
| Query params:
|
| ?page=1
| ?limit=20
| ?search=VEN-000001
| ?status=pending
| ?paymentStatus=partial
| ?sellerBroker=ID
| ?acquisitionBroker=ID
| ?lead=ID
| ?property=ID
| ?startDate=2026-08-01
| ?endDate=2026-08-31
| ?sort=-createdAt
|
| ADMIN:
|   Pode visualizar todas as vendas.
|
| BROKER:
|   Visualiza somente suas próprias vendas.
|
*/

router.get('/', getSalesController)

/*
|--------------------------------------------------------------------------
| MÉTRICAS / DASHBOARD
|--------------------------------------------------------------------------
|
| GET /api/sales/metrics
|
| IMPORTANTE:
| Esta rota deve permanecer antes de /:saleId.
|
| Query params opcionais:
|
| ?startDate=2026-08-01
| ?endDate=2026-08-31
|
*/

router.get('/metrics', getSaleMetricsController)

/*
|--------------------------------------------------------------------------
| CRIAR VENDA A PARTIR DE PROPOSTA
|--------------------------------------------------------------------------
|
| POST /api/sales/from-proposal/:proposalId
|
| Exemplo:
|
| POST /api/sales/from-proposal/6a7fa92b92c810c748cd320f
|
| Regras:
|
| - Proposta precisa estar ACCEPTED.
| - Broker só pode converter sua própria proposta.
| - Admin pode converter qualquer proposta.
| - Uma proposta só pode gerar uma venda.
| - O imóvel é reservado após a criação da venda.
| - O Lead é levado para "negociacao".
|
| Body opcional:
|
| {
|   "commission": {
|     "totalPercentage": 5,
|     "sellerPercentage": 50,
|     "companyPercentage": 30
|   },
|   "saleNumber": "VEN-000001",
|   "status": "pending",
|   "paymentStatus": "pending",
|   "saleDate": "2026-08-26",
|   "notes": "Venda criada a partir da proposta aprovada."
| }
|
*/

router.post('/from-proposal/:proposalId', createSaleFromProposalController)

/*
|--------------------------------------------------------------------------
| DETALHES DA VENDA
|--------------------------------------------------------------------------
|
| GET /api/sales/:saleId
|
| Retorna a venda com os dados populados:
|
| - proposta
| - lead
| - imóvel
| - corretor vendedor
| - corretor captador
| - usuário criador
| - usuário atualizador
| - comissão do vendedor
| - comissão do captador
|
*/

router.get('/:saleId', getSaleByIdController)

/*
|--------------------------------------------------------------------------
| ALTERAR STATUS DA VENDA
|--------------------------------------------------------------------------
|
| PATCH /api/sales/:saleId/status
|
| Body:
|
| {
|   "status": "contract",
|   "notes": "Contrato enviado para assinatura."
| }
|
| Status disponíveis:
|
| pending
| contract
| completed
| cancelled
|
| Apenas ADMIN pode alterar o status.
|
| Regras importantes:
|
| - Venda CANCELLED não pode voltar.
| - Venda COMPLETED não pode voltar.
| - COMPLETED:
|     → registra completedAt
|     → imóvel vira SOLD
|     → imóvel fica inactive
|     → imóvel deixa de ser publicado
|     → Lead vira GANHO
|
*/

router.patch('/:saleId/status', updateSaleStatusController)

/*
|--------------------------------------------------------------------------
| CONCLUIR VENDA
|--------------------------------------------------------------------------
|
| PATCH /api/sales/:saleId/complete
|
| Body opcional:
|
| {
|   "notes": "Venda concluída e documentação finalizada."
| }
|
| Equivale a:
|
| status = completed
|
| E dispara:
|
| Sale:
|   → completed
|
| Property:
|   → sold
|   → active = false
|   → published = false
|
| Lead:
|   → ganho
|
| Apenas ADMIN pode concluir a venda.
|
*/

router.patch('/:saleId/complete', completeSaleController)

/*
|--------------------------------------------------------------------------
| CANCELAR VENDA
|--------------------------------------------------------------------------
|
| PATCH /api/sales/:saleId/cancel
|
| Body:
|
| {
|   "reason": "Cliente desistiu da negociação."
| }
|
| Regras:
|
| - Apenas ADMIN.
| - Venda completed não pode ser cancelada
|   por este fluxo.
| - Registra cancelledAt.
| - Registra cancellationReason.
| - Registra evento no histórico do Lead.
| - Libera o imóvel somente se não existir
|   outra venda ativa para o mesmo imóvel.
|
*/

router.patch('/:saleId/cancel', cancelSaleController)

/*
|--------------------------------------------------------------------------
| ALTERAR STATUS FINANCEIRO
|--------------------------------------------------------------------------
|
| PATCH /api/sales/:saleId/payment-status
|
| Body:
|
| {
|   "paymentStatus": "partial"
| }
|
| Status:
|
| pending
| partial
| paid
|
| Apenas ADMIN pode alterar.
|
*/

router.patch('/:saleId/payment-status', updateSalePaymentStatusController)

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

export default router
