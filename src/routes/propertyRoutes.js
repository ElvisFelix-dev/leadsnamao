import express from 'express'

import {
  createProperty,
  getProperties,
  getProperty,
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
 PÚBLICO
============================================================
*/

// Lista imóveis

router.get(
  '/',
  [paginationValidator, sortPropertyValidator],
  validateRequest,
  getProperties,
)

// Imóveis em destaque

router.get('/featured', getFeaturedProperties)

// Últimos imóveis cadastrados

router.get('/latest', getLatestProperties)

// Busca

router.get(
  '/search',
  searchPropertyValidator,
  validateRequest,
  searchProperties,
)

// Filtros

router.get(
  '/filter',
  [filterPropertyValidator, paginationValidator, sortPropertyValidator],
  validateRequest,
  filterProperties,
)

// Busca por slug

router.get(
  '/slug/:slug',
  propertySlugValidator,
  validateRequest,
  getPropertyBySlug,
)

// Busca por código

router.get(
  '/code/:code',
  propertyCodeValidator,
  validateRequest,
  getPropertyByCode,
)

// Busca por região

router.get('/region/:region', getPropertiesByRegion)

// Busca por finalidade

router.get('/purpose/:purpose', getPropertiesByPurpose)

// Busca por tipo

router.get('/type/:type', getPropertiesByType)

// Busca por corretor

router.get('/broker/:brokerId', getBrokerProperties)

// Detalhes do imóvel

router.get('/:id', propertyIdValidator, validateRequest, getProperty)

/*
============================================================
 ADMIN DASHBOARD
============================================================
*/

router.get('/dashboard', protect, admin, getDashboardData)

router.get('/statistics', protect, admin, getPropertyStatistics)

/*
============================================================
 CRUD ADMIN
============================================================
*/

// Criar imóvel

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

// Atualizar imóvel

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

// Excluir imóvel

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

// Restaurar

router.patch(
  '/:id/restore',
  protect,
  admin,
  propertyIdValidator,
  validateRequest,
  restoreProperty,
)

// Publicar

router.patch(
  '/:id/publish',
  protect,
  admin,
  publishPropertyValidator,
  validateRequest,
  publishProperty,
)

// Remover publicação

router.patch(
  '/:id/unpublish',
  protect,
  admin,
  propertyIdValidator,
  validateRequest,
  unpublishProperty,
)

// Arquivar

router.patch(
  '/:id/archive',
  protect,
  admin,
  propertyIdValidator,
  validateRequest,
  archiveProperty,
)

// Ativar

router.patch(
  '/:id/activate',
  protect,
  admin,
  propertyIdValidator,
  validateRequest,
  activateProperty,
)

// Destacar imóvel

router.patch(
  '/:id/featured',
  protect,
  admin,
  propertyIdValidator,
  validateRequest,
  toggleFeatured,
)

// Alterar corretor responsável

router.patch(
  '/:id/broker',
  protect,
  admin,
  [propertyIdValidator, assignBrokerValidator],
  validateRequest,
  assignBroker,
)

// Duplicar imóvel

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
 MÉTRICAS
============================================================
*/

router.post('/:id/view', propertyIdValidator, validateRequest, incrementViews)

router.post(
  '/:id/favorite',
  propertyIdValidator,
  validateRequest,
  incrementFavorites,
)

router.post(
  '/:id/contact',
  propertyIdValidator,
  validateRequest,
  incrementContacts,
)

export default router
