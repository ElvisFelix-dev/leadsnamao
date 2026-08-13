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

/*
------------------------------------------------------------
LISTA DE IMÓVEIS
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
BUSCA POR CORRETOR
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
DASHBOARD
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
DETALHES COMPLETOS — CRM
------------------------------------------------------------

  Essa rota é protegida porque pode retornar informações
  internas do imóvel, como:

  - proprietário
  - telefone do proprietário
  - e-mail do proprietário
  - corretor de captação
  - percentual de captação
  - informações administrativas

  Não usar no site público ou hotsite.
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
MÉTRICAS
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
