import { Router } from 'express'

import { protect } from '../middleware/authMiddleware.js'

import {
  createFavorite,
  deleteFavorite,
  togglePropertyFavorite,
  checkFavorite,
  checkUserFavorite,
  getMyFavorites,
  getUserFavoriteCount,
  getPropertyFavoriteCount,
  getFavoritesToday,
  getFavoritesThisWeek,
  getFavoritesThisMonth,
  getFavoriteStatistics,
  getFavoritesBySource,
  getFavoritesTimeline,
  getFavoriteDashboard,
  getTopFavoriteProperties,
  getLatestFavorites,
  getFavoriteUsers,
  cleanupInactiveFavorites,
} from '../controllers/propertyFavoriteController.js'

const router = Router()

/* ============================================================
   ROTAS PÚBLICAS
   Hotsite / Portal / Landing Page
   ============================================================ */

/**
 * Adicionar favorito
 *
 * POST
 * /api/property-favorites/:propertyId
 *
 * Body:
 * {
 *   visitorId,
 *   sessionId,
 *   source,
 *   referrer
 * }
 */
router.post('/:propertyId', createFavorite)

/**
 * Alternar favorito
 *
 * POST
 * /api/property-favorites/:propertyId/toggle
 */
router.post('/:propertyId/toggle', togglePropertyFavorite)

/**
 * Remover favorito
 *
 * DELETE
 * /api/property-favorites/:propertyId
 *
 * Body:
 * {
 *   visitorId
 * }
 */
router.delete('/:propertyId', deleteFavorite)

/**
 * Verificar se está favoritado
 *
 * GET
 * /api/property-favorites/:propertyId/check
 *
 * Query:
 * ?visitorId=xxxxx
 */
router.get('/:propertyId/check', checkFavorite)

/* ============================================================
   RANKING PÚBLICO
   ============================================================ */

/**
 * Imóveis mais favoritados
 *
 * GET
 * /api/property-favorites/top?limit=10
 *
 * Esta rota precisa ficar ANTES de
 * /:propertyId/:... para evitar conflitos.
 */
router.get('/top', getTopFavoriteProperties)

/* ============================================================
   ROTAS PROTEGIDAS
   CRM / Dashboard
   ============================================================ */

router.use(protect)

/* ============================================================
   FAVORITOS DO USUÁRIO
   ============================================================ */

/**
 * Meus favoritos
 *
 * GET
 * /api/property-favorites/me
 *
 * Query:
 * ?limit=50&skip=0
 */
router.get('/me', getMyFavorites)

/**
 * Quantidade de favoritos do usuário
 *
 * GET
 * /api/property-favorites/me/count
 */
router.get('/me/count', getUserFavoriteCount)

/**
 * Verificar favorito do usuário autenticado
 *
 * GET
 * /api/property-favorites/:propertyId/user-check
 */
router.get('/:propertyId/user-check', checkUserFavorite)

/* ============================================================
   CONTADORES
   ============================================================ */

/**
 * Total de favoritos do imóvel
 *
 * GET
 * /api/property-favorites/:propertyId/count
 */
router.get('/:propertyId/count', getPropertyFavoriteCount)

/**
 * Favoritos de hoje
 *
 * GET
 * /api/property-favorites/:propertyId/today
 */
router.get('/:propertyId/today', getFavoritesToday)

/**
 * Favoritos da semana
 *
 * GET
 * /api/property-favorites/:propertyId/week
 */
router.get('/:propertyId/week', getFavoritesThisWeek)

/**
 * Favoritos do mês
 *
 * GET
 * /api/property-favorites/:propertyId/month
 */
router.get('/:propertyId/month', getFavoritesThisMonth)

/* ============================================================
   ANALYTICS
   ============================================================ */

/**
 * Estatísticas dos favoritos
 *
 * GET
 * /api/property-favorites/:propertyId/statistics
 */
router.get('/:propertyId/statistics', getFavoriteStatistics)

/**
 * Favoritos por origem
 *
 * GET
 * /api/property-favorites/:propertyId/source
 */
router.get('/:propertyId/source', getFavoritesBySource)

/**
 * Timeline
 *
 * GET
 * /api/property-favorites/:propertyId/timeline?days=30
 */
router.get('/:propertyId/timeline', getFavoritesTimeline)

/* ============================================================
   DASHBOARD
   ============================================================ */

/**
 * Dashboard completo de favoritos
 *
 * GET
 * /api/property-favorites/:propertyId/dashboard
 */
router.get('/:propertyId/dashboard', getFavoriteDashboard)

/* ============================================================
   LISTAGENS
   ============================================================ */

/**
 * Últimos favoritos
 *
 * GET
 * /api/property-favorites/:propertyId/latest?limit=20
 */
router.get('/:propertyId/latest', getLatestFavorites)

/**
 * Usuários que favoritaram
 *
 * GET
 * /api/property-favorites/:propertyId/users?limit=50
 */
router.get('/:propertyId/users', getFavoriteUsers)

/* ============================================================
   MANUTENÇÃO
   ============================================================ */

/**
 * Limpar favoritos inativos antigos
 *
 * GET
 * /api/property-favorites/cleanup?days=90
 *
 * IMPORTANTE:
 * Esta rota deve ser usada apenas pelo CRM/admin.
 */
router.get('/cleanup', cleanupInactiveFavorites)

/* ============================================================
   EXPORT
   ============================================================ */

export default router
