import { Router } from 'express'

import { protect } from '../middleware/authMiddleware.js'

import {
  createPropertyView,
  getPropertyViewDashboard,
  getPropertyViewTimeline,
  getLatestPropertyViews,
  getRecentPropertyVisitors,
  getPropertyViewStats,
  getTopViewedProperties,
  getViewsGrowth,
  getViewConversion,
  getInterestScore,
} from '../controllers/propertyViewController.js'

const router = Router()

/* ============================================================
   ROTAS PÚBLICAS
   Hotsite / Portal / Landing Page
============================================================ */

/**
 * Registrar visualização
 *
 * POST
 * /api/property-views/:propertyId/register
 */
router.post('/:propertyId/register', createPropertyView)

/* ============================================================
   ROTAS PROTEGIDAS
   CRM / Dashboard
============================================================ */

router.use(protect)

/* ============================================================
   Dashboard
============================================================ */

/**
 * Dashboard completo do imóvel
 *
 * GET
 * /api/property-views/:propertyId/dashboard
 */
router.get('/:propertyId/dashboard', getPropertyViewDashboard)

/**
 * Estatísticas rápidas
 *
 * GET
 * /api/property-views/:propertyId/stats
 */
router.get('/:propertyId/stats', getPropertyViewStats)

/* ============================================================
   Timeline
============================================================ */

/**
 * Timeline de acessos
 *
 * GET
 * /api/property-views/:propertyId/timeline?days=30
 */
router.get('/:propertyId/timeline', getPropertyViewTimeline)

/* ============================================================
   Visitantes
============================================================ */

/**
 * Últimos visitantes
 *
 * GET
 * /api/property-views/:propertyId/visitors
 */
router.get('/:propertyId/visitors', getRecentPropertyVisitors)

/**
 * Últimas visualizações
 *
 * GET
 * /api/property-views/:propertyId/latest
 */
router.get('/:propertyId/latest', getLatestPropertyViews)

/* ============================================================
   Analytics
============================================================ */

/**
 * Crescimento das visualizações
 *
 * GET
 * /api/property-views/:propertyId/growth
 */
router.get('/:propertyId/growth', getViewsGrowth)

/**
 * Conversão
 *
 * GET
 * /api/property-views/:propertyId/conversion
 */
router.get('/:propertyId/conversion', getViewConversion)

/**
 * Score de interesse
 *
 * GET
 * /api/property-views/:propertyId/score
 */
router.get('/:propertyId/score', getInterestScore)

/* ============================================================
   Ranking Geral
============================================================ */

/**
 * Imóveis mais visualizados
 *
 * GET
 * /api/property-views/top?limit=10
 */
router.get('/top', getTopViewedProperties)

export default router
