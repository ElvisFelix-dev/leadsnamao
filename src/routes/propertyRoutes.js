// propertyRoutes.js - ADICIONAR AS NOVAS ROTAS

import express from 'express'

import {
  createProperty,
  getProperties,
  getProperty,
  getPropertyCRM,
  getPropertyBySlug,
  getPropertyByCode,
  updateProperty,
  deleteProperty,
  restoreProperty,
  publishProperty,
  unpublishProperty,
  archiveProperty,
  activateProperty,
  toggleFeatured,
  assignBroker,
  duplicateProperty,
  incrementViews,
  incrementFavorites,
  incrementContacts,
  getFeaturedProperties,
  getLatestProperties,
  searchProperties,
  filterProperties,
  getBrokerProperties,
  getPropertiesByRegion,
  getPropertiesByPurpose,
  getPropertiesByType,
  getPropertyStatistics,
  getDashboardData,
  // 🔥 NOVOS IMPORTS
  getPropertyMetrics,
  getBatchPropertyMetrics,
  getPropertyTimeline,
  getPopularProperties,
  getPublicProperties,
  getMyBrokerProperties,
  getPropertyAdminSummary,
  getBrokerPropertiesWithMetrics,
} from '../controllers/propertyController.js'

import { protect, admin } from '../middleware/authMiddleware.js'

import validateRequest from '../middleware/validateRequest.js'

import {
  createPropertyValidator,
  propertyIdValidator,
  propertySlugValidator,
  propertyCodeValidator,
  searchPropertyValidator,
  filterPropertyValidator,
  paginationValidator,
  sortPropertyValidator,
  locationValidator,
  geoLocationValidator,
  featuresValidator,
  imagesValidator,
  peopleValidator,
  assignBrokerValidator,
  publishPropertyValidator,
  duplicatePropertyValidator,
} from '../validators/propertyValidator.js'

const router = express.Router()

/*
============================================================
PÚBLICO (NÃO AUTENTICADO)
============================================================
*/
// 🔥 ROTA PARA INCREMENTAR VISUALIZAÇÃO
router.post(
  '/:id/increment-view',
  propertyIdValidator,
  validateRequest,
  incrementViews,
)

// 🔥 ROTA PARA INCREMENTAR CONTATO
router.post(
  '/:id/increment-contact',
  propertyIdValidator,
  validateRequest,
  incrementContacts,
)

// 🔥 ROTA PARA INCREMENTAR FAVORITO
router.post(
  '/:id/increment-favorite',
  propertyIdValidator,
  validateRequest,
  incrementFavorites,
)

/*
------------------------------------------------------------
LISTA DE IMÓVEIS PARA SITE / HOTSITE
------------------------------------------------------------
*/

router.get(
  '/public',
  [paginationValidator, sortPropertyValidator],
  validateRequest,
  getPublicProperties,
)

/*
------------------------------------------------------------
IMÓVEIS MAIS POPULARES
------------------------------------------------------------
*/

router.get('/popular', getPopularProperties)

/*
------------------------------------------------------------
LISTA DE IMÓVEIS (EXISTENTE)
------------------------------------------------------------
*/

router.get(
  '/',
  [paginationValidator, sortPropertyValidator],
  validateRequest,
  getProperties,
)

/*
------------------------------------------------------------
IMÓVEIS EM DESTAQUE
------------------------------------------------------------
*/

router.get('/featured', getFeaturedProperties)

/*
------------------------------------------------------------
ÚLTIMOS IMÓVEIS
------------------------------------------------------------
*/

router.get('/latest', getLatestProperties)

/*
------------------------------------------------------------
BUSCA
------------------------------------------------------------
*/

router.get(
  '/search',
  searchPropertyValidator,
  validateRequest,
  searchProperties,
)

/*
------------------------------------------------------------
FILTROS
------------------------------------------------------------
*/

router.get(
  '/filter',
  [filterPropertyValidator, paginationValidator, sortPropertyValidator],
  validateRequest,
  filterProperties,
)

/*
------------------------------------------------------------
BUSCA POR SLUG
------------------------------------------------------------
*/

router.get(
  '/slug/:slug',
  propertySlugValidator,
  validateRequest,
  getPropertyBySlug,
)

/*
------------------------------------------------------------
BUSCA POR CÓDIGO
------------------------------------------------------------
*/

router.get(
  '/code/:code',
  propertyCodeValidator,
  validateRequest,
  getPropertyByCode,
)

/*
------------------------------------------------------------
BUSCA POR REGIÃO
------------------------------------------------------------
*/

router.get('/region/:region', getPropertiesByRegion)

/*
------------------------------------------------------------
BUSCA POR FINALIDADE
------------------------------------------------------------
*/

router.get('/purpose/:purpose', getPropertiesByPurpose)

/*
------------------------------------------------------------
BUSCA POR TIPO
------------------------------------------------------------
*/

router.get('/type/:type', getPropertiesByType)

/*
------------------------------------------------------------
BUSCA POR CORRETOR (PÚBLICO - IMÓVEIS DISPONÍVEIS)
------------------------------------------------------------
*/

router.get('/broker/:brokerId', getBrokerProperties)

/*
============================================================
ADMIN / CRM
============================================================
*/

/*
------------------------------------------------------------
DASHBOARD ADMIN
------------------------------------------------------------
*/

router.get('/dashboard', protect, admin, getDashboardData)

/*
------------------------------------------------------------
ESTATÍSTICAS
------------------------------------------------------------
*/

router.get('/statistics', protect, admin, getPropertyStatistics)

/*
------------------------------------------------------------
RESUMO ADMINISTRATIVO (NOVO)
------------------------------------------------------------
*/

router.get('/admin/summary', protect, admin, getPropertyAdminSummary)

/*
------------------------------------------------------------
DETALHES COMPLETOS — CRM
------------------------------------------------------------
*/

router.get(
  '/:id/crm',
  protect,
  propertyIdValidator,
  validateRequest,
  getPropertyCRM,
)

/*
============================================================
CORRETOR AUTENTICADO
============================================================
*/

/*
------------------------------------------------------------
MEUS IMÓVEIS COM MÉTRICAS (NOVO)
------------------------------------------------------------
*/

router.get(
  '/broker/me',
  protect,
  [paginationValidator, sortPropertyValidator],
  validateRequest,
  getMyBrokerProperties,
)

/*
------------------------------------------------------------
IMÓVEIS DE UM CORRETOR COM MÉTRICAS (ADMIN)
------------------------------------------------------------
*/

router.get(
  '/broker/:brokerId/with-metrics',
  protect,
  admin,
  [paginationValidator, sortPropertyValidator],
  validateRequest,
  getBrokerPropertiesWithMetrics,
)

/*
============================================================
MÉTRICAS DO IMÓVEL
============================================================
*/

/*
------------------------------------------------------------
MÉTRICAS DO IMÓVEL (NOVO)
------------------------------------------------------------
*/

router.get(
  '/:id/metrics',
  protect,
  propertyIdValidator,
  validateRequest,
  getPropertyMetrics,
)

/*
------------------------------------------------------------
TIMELINE DE ENGAGEMENT (NOVO)
------------------------------------------------------------
*/

router.get(
  '/:id/timeline',
  protect,
  propertyIdValidator,
  validateRequest,
  getPropertyTimeline,
)

/*
============================================================
MÉTRICAS EM MASSA
============================================================
*/

/*
------------------------------------------------------------
MÉTRICAS EM MASSA (NOVO)
------------------------------------------------------------
*/

router.post('/metrics/batch', protect, validateRequest, getBatchPropertyMetrics)

/*
============================================================
DETALHE PÚBLICO
============================================================
*/

/*
------------------------------------------------------------
DETALHES DO IMÓVEL
------------------------------------------------------------

  IMPORTANTE:
  Essa rota precisa ficar depois de todas as rotas
  específicas acima para que /dashboard, /statistics,
  /:id/crm etc. não sejam interpretadas como um ID.
------------------------------------------------------------
*/

router.get('/:id', propertyIdValidator, validateRequest, getProperty)

/*
============================================================
CRUD ADMIN
============================================================
*/

/*
------------------------------------------------------------
CRIAR IMÓVEL
------------------------------------------------------------
*/

router.post(
  '/',
  protect,
  admin,
  [
    createPropertyValidator,
    locationValidator,
    geoLocationValidator,
    featuresValidator,
    imagesValidator,
    peopleValidator,
  ],
  validateRequest,
  createProperty,
)

/*
------------------------------------------------------------
ATUALIZAR IMÓVEL
------------------------------------------------------------
*/

router.put(
  '/:id',
  protect,
  admin,
  [
    propertyIdValidator,
    locationValidator,
    geoLocationValidator,
    featuresValidator,
    imagesValidator,
    peopleValidator,
  ],
  validateRequest,
  updateProperty,
)

/*
------------------------------------------------------------
EXCLUIR IMÓVEL — SOFT DELETE
------------------------------------------------------------
*/

router.delete(
  '/:id',
  protect,
  admin,
  propertyIdValidator,
  validateRequest,
  deleteProperty,
)

/*
============================================================
AÇÕES ADMINISTRATIVAS
============================================================
*/

/*
------------------------------------------------------------
RESTAURAR
------------------------------------------------------------
*/

router.patch(
  '/:id/restore',
  protect,
  admin,
  propertyIdValidator,
  validateRequest,
  restoreProperty,
)

/*
------------------------------------------------------------
PUBLICAR
------------------------------------------------------------
*/

router.patch(
  '/:id/publish',
  protect,
  admin,
  publishPropertyValidator,
  validateRequest,
  publishProperty,
)

/*
------------------------------------------------------------
REMOVER PUBLICAÇÃO
------------------------------------------------------------
*/

router.patch(
  '/:id/unpublish',
  protect,
  admin,
  propertyIdValidator,
  validateRequest,
  unpublishProperty,
)

/*
------------------------------------------------------------
ARQUIVAR
------------------------------------------------------------
*/

router.patch(
  '/:id/archive',
  protect,
  admin,
  propertyIdValidator,
  validateRequest,
  archiveProperty,
)

/*
------------------------------------------------------------
REATIVAR
------------------------------------------------------------
*/

router.patch(
  '/:id/activate',
  protect,
  admin,
  propertyIdValidator,
  validateRequest,
  activateProperty,
)

/*
------------------------------------------------------------
DESTACAR / REMOVER DESTAQUE
------------------------------------------------------------
*/

router.patch(
  '/:id/featured',
  protect,
  admin,
  propertyIdValidator,
  validateRequest,
  toggleFeatured,
)

/*
------------------------------------------------------------
ALTERAR CORRETOR RESPONSÁVEL
------------------------------------------------------------
*/

router.patch(
  '/:id/broker',
  protect,
  admin,
  [propertyIdValidator, assignBrokerValidator],
  validateRequest,
  assignBroker,
)

/*
------------------------------------------------------------
DUPLICAR IMÓVEL
------------------------------------------------------------
*/

router.post(
  '/:id/duplicate',
  protect,
  admin,
  duplicatePropertyValidator,
  validateRequest,
  duplicateProperty,
)

/*
============================================================
MÉTRICAS PÚBLICAS (SEM AUTENTICAÇÃO)
============================================================
*/

/*
------------------------------------------------------------
VISUALIZAÇÕES
------------------------------------------------------------
*/

router.post('/:id/view', propertyIdValidator, validateRequest, incrementViews)

/*
------------------------------------------------------------
FAVORITOS
------------------------------------------------------------
*/

router.post(
  '/:id/favorite',
  propertyIdValidator,
  validateRequest,
  incrementFavorites,
)

/*
------------------------------------------------------------
CONTATOS
------------------------------------------------------------
*/

router.post(
  '/:id/contact',
  propertyIdValidator,
  validateRequest,
  incrementContacts,
)

export default router
