import asyncHandler from '../middleware/asyncHandler.js'

import * as propertyService from '../service/property/propertyService.js'

/* ============================================================
   CREATE
============================================================ */

export const createProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.createProperty(req.body, req.user._id)

  res.status(201).json({
    success: true,
    message: 'Imóvel cadastrado com sucesso.',
    data: property,
  })
})

/* ============================================================
   GET ALL
============================================================ */

export const getProperties = asyncHandler(async (req, res) => {
  const result = await propertyService.getAllProperties(req.query)

  res.json({
    success: true,
    ...result,
  })
})

/* ============================================================
   GET BY ID
============================================================ */

export const getProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.getPropertyById(req.params.id)

  res.json({
    success: true,
    data: property,
  })
})

/* ============================================================
   GET BY ID — CRM
============================================================ */

export const getPropertyCRM = asyncHandler(async (req, res) => {
  const property = await propertyService.getPropertyCRMById(req.params.id)

  res.json({
    success: true,
    data: property,
  })
})

/* ============================================================
   GET BY SLUG
============================================================ */

export const getPropertyBySlug = asyncHandler(async (req, res) => {
  const property = await propertyService.getPropertyBySlug(req.params.slug)

  res.json({
    success: true,
    data: property,
  })
})

/* ============================================================
   GET BY CODE
============================================================ */

export const getPropertyByCode = asyncHandler(async (req, res) => {
  const property = await propertyService.getPropertyByCode(req.params.code)

  res.json({
    success: true,
    data: property,
  })
})

/* ============================================================
   UPDATE
============================================================ */

export const updateProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.updateProperty(
    req.params.id,
    req.body,
    req.user._id,
  )

  res.json({
    success: true,
    message: 'Imóvel atualizado com sucesso.',
    data: property,
  })
})

/* ============================================================
   DELETE (SOFT DELETE)
============================================================ */

export const deleteProperty = asyncHandler(async (req, res) => {
  await propertyService.deleteProperty(req.params.id, req.user._id)

  res.json({
    success: true,
    message: 'Imóvel removido com sucesso.',
  })
})

/* ============================================================
   RESTORE
============================================================ */

export const restoreProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.restoreProperty(
    req.params.id,
    req.user._id,
  )

  res.json({
    success: true,
    message: 'Imóvel restaurado com sucesso.',
    data: property,
  })
})

/* ============================================================
   PUBLICAR
============================================================ */

export const publishProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.publishProperty(
    req.params.id,
    req.user._id,
  )

  res.json({
    success: true,
    message: 'Imóvel publicado com sucesso.',
    data: property,
  })
})

/* ============================================================
   DESPUBLICAR
============================================================ */

export const unpublishProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.unpublishProperty(
    req.params.id,
    req.user._id,
  )

  res.json({
    success: true,
    message: 'Imóvel despublicado com sucesso.',
    data: property,
  })
})

/* ============================================================
   ARQUIVAR
============================================================ */

export const archiveProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.archiveProperty(
    req.params.id,
    req.user._id,
  )

  res.json({
    success: true,
    message: 'Imóvel arquivado com sucesso.',
    data: property,
  })
})

/* ============================================================
   REATIVAR
============================================================ */

export const activateProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.activateProperty(
    req.params.id,
    req.user._id,
  )

  res.json({
    success: true,
    message: 'Imóvel reativado com sucesso.',
    data: property,
  })
})

/* ============================================================
   DESTACAR / REMOVER DESTAQUE
============================================================ */

export const toggleFeatured = asyncHandler(async (req, res) => {
  const property = await propertyService.toggleFeatured(
    req.params.id,
    req.user._id,
  )

  res.json({
    success: true,
    message: property.featured
      ? 'Imóvel destacado com sucesso.'
      : 'Imóvel removido dos destaques.',
    data: property,
  })
})

/* ============================================================
   ATRIBUIR CORRETOR
============================================================ */

export const assignBroker = asyncHandler(async (req, res) => {
  const { brokerId } = req.body

  const property = await propertyService.assignBroker(
    req.params.id,
    brokerId,
    req.user._id,
  )

  res.json({
    success: true,
    message: 'Corretor atribuído com sucesso.',
    data: property,
  })
})

/* ============================================================
   DUPLICAR IMÓVEL
============================================================ */

export const duplicateProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.duplicateProperty(
    req.params.id,
    req.user._id,
  )

  res.status(201).json({
    success: true,
    message: 'Imóvel duplicado com sucesso.',
    data: property,
  })
})

/* ============================================================
   VISUALIZAÇÕES
============================================================ */

export const incrementViews = asyncHandler(async (req, res) => {
  const views = await propertyService.incrementViews(req.params.id)

  res.json({
    success: true,
    views,
  })
})

/* ============================================================
   FAVORITOS
============================================================ */

export const incrementFavorites = asyncHandler(async (req, res) => {
  const favorites = await propertyService.incrementFavorites(req.params.id)

  res.json({
    success: true,
    favorites,
  })
})

/* ============================================================
   CONTATOS
============================================================ */

export const incrementContacts = asyncHandler(async (req, res) => {
  const contacts = await propertyService.incrementContacts(req.params.id)

  res.json({
    success: true,
    contacts,
  })
})

/* ============================================================
   FEATURED
============================================================ */

export const getFeaturedProperties = asyncHandler(async (req, res) => {
  const { limit } = req.query

  const properties = await propertyService.getFeaturedProperties(limit)

  res.json({
    success: true,
    data: properties,
  })
})

/* ============================================================
   LATEST
============================================================ */

export const getLatestProperties = asyncHandler(async (req, res) => {
  const { limit } = req.query

  const properties = await propertyService.getLatestProperties(limit)

  res.json({
    success: true,
    data: properties,
  })
})

/* ============================================================
   SEARCH
============================================================ */

export const searchProperties = asyncHandler(async (req, res) => {
  const { q } = req.query

  const result = await propertyService.searchProperties(q, req.query)

  res.json({
    success: true,
    ...result,
  })
})

/* ============================================================
   FILTER
============================================================ */

export const filterProperties = asyncHandler(async (req, res) => {
  const properties = await propertyService.filterProperties(req.query)

  res.json({
    success: true,
    total: properties.length,
    data: properties,
  })
})

/* ============================================================
   BY BROKER
============================================================ */

export const getBrokerProperties = asyncHandler(async (req, res) => {
  const properties = await propertyService.getBrokerProperties(
    req.params.brokerId,
  )

  res.json({
    success: true,
    total: properties.length,
    data: properties,
  })
})

/* ============================================================
   BY REGION
============================================================ */

export const getPropertiesByRegion = asyncHandler(async (req, res) => {
  const properties = await propertyService.getPropertiesByRegion(
    req.params.region,
  )

  res.json({
    success: true,
    total: properties.length,
    data: properties,
  })
})

/* ============================================================
   BY PURPOSE
============================================================ */

export const getPropertiesByPurpose = asyncHandler(async (req, res) => {
  const properties = await propertyService.getPropertiesByPurpose(
    req.params.purpose,
  )

  res.json({
    success: true,
    total: properties.length,
    data: properties,
  })
})

/* ============================================================
   BY TYPE
============================================================ */

export const getPropertiesByType = asyncHandler(async (req, res) => {
  const properties = await propertyService.getPropertiesByType(req.params.type)

  res.json({
    success: true,
    total: properties.length,
    data: properties,
  })
})

/* ============================================================
   STATISTICS
============================================================ */

export const getPropertyStatistics = asyncHandler(async (req, res) => {
  const statistics = await propertyService.getPropertyStatistics()

  res.json({
    success: true,
    data: statistics,
  })
})

/* ============================================================
   DASHBOARD
============================================================ */

export const getDashboardData = asyncHandler(async (req, res) => {
  const dashboard = await propertyService.getDashboardData()

  res.json({
    success: true,
    data: dashboard,
  })
})
