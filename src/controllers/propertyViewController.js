import {
  registerView,
  dashboardStatistics,
  viewsTimeline,
  latestViews,
  recentVisitors,
  viewsGrowth,
  viewConversionRate,
  interestScore,
  topViewedProperties,
  countViews,
  countUniqueVisitors,
} from '../service/propertyViewService.js'

import { getVisitorInfo } from '../utils/visitorInfo.js'

/* ============================================================
   Registrar Visualização
============================================================ */

export async function createPropertyView(req, res) {
  try {
    const { propertyId } = req.params

    const { source, sessionId, visitorId, referrer, landingPage, campaign } =
      req.body

    const visitor = getVisitorInfo(req)

    const result = await registerView({
      propertyId,

      userId: req.user?._id || null,

      sessionId,

      visitorId,

      source,

      referrer,

      landingPage,

      campaign,

      visitor,
    })

    return res.status(201).json({
      success: true,

      data: result,
    })
  } catch (error) {
    console.error('Erro ao registrar visualização:', error)

    return res.status(400).json({
      success: false,

      message: error.message,
    })
  }
}

/* ============================================================
   Dashboard Completo
============================================================ */

export async function getPropertyViewDashboard(req, res) {
  try {
    const { propertyId } = req.params

    const data = await dashboardStatistics(propertyId)

    const growth = await viewsGrowth(propertyId)

    const conversion = await viewConversionRate(propertyId)

    const score = await interestScore(propertyId)

    return res.json({
      success: true,

      data: {
        ...data,

        growth,

        conversion,

        score,
      },
    })
  } catch (error) {
    console.error('Erro dashboard views:', error)

    return res.status(500).json({
      success: false,

      message: error.message,
    })
  }
}

/* ============================================================
   Timeline de Visualizações
============================================================ */

export async function getPropertyViewTimeline(req, res) {
  try {
    const { propertyId } = req.params

    const { days = 30 } = req.query

    const timeline = await viewsTimeline(
      propertyId,

      Number(days),
    )

    return res.json({
      success: true,

      data: timeline,
    })
  } catch (error) {
    console.error('Erro ao buscar timeline:', error)

    return res.status(500).json({
      success: false,

      message: error.message,
    })
  }
}

/* ============================================================
   Últimas Visualizações
============================================================ */

export async function getLatestPropertyViews(req, res) {
  try {
    const { propertyId } = req.params

    const { limit = 20 } = req.query

    const views = await latestViews(
      propertyId,

      Number(limit),
    )

    return res.json({
      success: true,

      data: views,
    })
  } catch (error) {
    console.error('Erro últimas visualizações:', error)

    return res.status(500).json({
      success: false,

      message: error.message,
    })
  }
}

/* ============================================================
   Visitantes Recentes
============================================================ */

export async function getRecentPropertyVisitors(req, res) {
  try {
    const { propertyId } = req.params

    const { limit = 20 } = req.query

    const visitors = await recentVisitors(
      propertyId,

      Number(limit),
    )

    return res.json({
      success: true,

      data: visitors,
    })
  } catch (error) {
    console.error('Erro visitantes recentes:', error)

    return res.status(500).json({
      success: false,

      message: error.message,
    })
  }
}

/* ============================================================
   Estatísticas Resumidas
============================================================ */

export async function getPropertyViewStats(req, res) {
  try {
    const { propertyId } = req.params

    const [total, unique] = await Promise.all([
      countViews(propertyId),

      countUniqueVisitors(propertyId),
    ])

    return res.json({
      success: true,

      data: {
        totalViews: total,

        uniqueVisitors: unique,

        average: unique > 0 ? Number((total / unique).toFixed(2)) : 0,
      },
    })
  } catch (error) {
    console.error('Erro stats views:', error)

    return res.status(500).json({
      success: false,

      message: error.message,
    })
  }
}

/* ============================================================
   Imóveis Mais Visualizados
============================================================ */

export async function getTopViewedProperties(req, res) {
  try {
    const { limit = 10 } = req.query

    const properties = await topViewedProperties(Number(limit))

    return res.json({
      success: true,

      data: properties,
    })
  } catch (error) {
    console.error('Erro ranking imóveis:', error)

    return res.status(500).json({
      success: false,

      message: error.message,
    })
  }
}

/* ============================================================
   Crescimento de Visualizações
============================================================ */

export async function getViewsGrowth(req, res) {
  try {
    const { propertyId } = req.params

    const growth = await viewsGrowth(propertyId)

    return res.json({
      success: true,

      data: growth,
    })
  } catch (error) {
    console.error('Erro crescimento views:', error)

    return res.status(500).json({
      success: false,

      message: error.message,
    })
  }
}

/* ============================================================
   Taxa de Conversão
============================================================ */

export async function getViewConversion(req, res) {
  try {
    const { propertyId } = req.params

    const conversion = await viewConversionRate(propertyId)

    return res.json({
      success: true,

      data: {
        conversion,

        percentage: `${conversion}%`,
      },
    })
  } catch (error) {
    console.error('Erro conversão views:', error)

    return res.status(500).json({
      success: false,

      message: error.message,
    })
  }
}

/* ============================================================
   Score de Interesse
============================================================ */

export async function getInterestScore(req, res) {
  try {
    const { propertyId } = req.params

    const score = await interestScore(propertyId)

    return res.json({
      success: true,

      data: score,
    })
  } catch (error) {
    console.error('Erro interest score:', error)

    return res.status(500).json({
      success: false,

      message: error.message,
    })
  }
}

/* ============================================================
   EXPORT CONTROLLER
============================================================ */

export default {
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
}
