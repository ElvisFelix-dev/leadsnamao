import { body, param, query } from 'express-validator'

import { PROPERTY_TYPE_LIST } from '../constants/propertyType.js'
import { PROPERTY_CATEGORY_LIST } from '../constants/propertyCategory.js'
import { PROPERTY_STATUS_LIST } from '../constants/propertyStatus.js'
import { PROPERTY_PURPOSE_LIST } from '../constants/propertyPurpose.js'
import { PROPERTY_REGION_LIST } from '../constants/propertyRegion.js'
import { PROPERTY_CONSTRUCTION_STATUS_LIST } from '../constants/propertyConstructionStatus.js'
import { PROPERTY_CONDITION_LIST } from '../constants/propertyCondition.js'
import { PROPERTY_FEATURES } from '../constants/propertyFeatures.js'

/* ============================================================
   HELPERS
============================================================ */

/**
 * Aceita:
 * - número
 * - string numérica
 * - string vazia
 * - null / undefined
 *
 * String vazia é considerada campo não preenchido.
 */

/* ============================================================
   CREATE PROPERTY
============================================================ */

export const createPropertyValidator = [
  /* ============================================================
     DADOS BÁSICOS
  ============================================================ */

  body('name')
    .trim()
    .notEmpty()
    .withMessage('O nome do imóvel é obrigatório.')
    .isLength({ min: 5, max: 150 })
    .withMessage('O nome deve possuir entre 5 e 150 caracteres.'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('A descrição deve possuir no máximo 5000 caracteres.'),

  body('shortDescription')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('A descrição curta deve possuir no máximo 500 caracteres.'),

  body('code')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Código do imóvel inválido.'),

  body('slug')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Slug inválido.'),

  body('type')
    .notEmpty()
    .withMessage('O tipo do imóvel é obrigatório.')
    .isIn(PROPERTY_TYPE_LIST)
    .withMessage('Tipo de imóvel inválido.'),

  body('category')
    .notEmpty()
    .withMessage('A categoria é obrigatória.')
    .isIn(PROPERTY_CATEGORY_LIST)
    .withMessage('Categoria inválida.'),

  body('purpose')
    .notEmpty()
    .withMessage('A finalidade é obrigatória.')
    .isIn(PROPERTY_PURPOSE_LIST)
    .withMessage('Finalidade inválida.'),

  body('status')
    .optional({ checkFalsy: true })
    .isIn(PROPERTY_STATUS_LIST)
    .withMessage('Status inválido.'),

  body('constructionStatus')
    .optional({ checkFalsy: true })
    .isIn(PROPERTY_CONSTRUCTION_STATUS_LIST)
    .withMessage('Status da construção inválido.'),

  body('condition')
    .optional({ checkFalsy: true })
    .isIn(PROPERTY_CONDITION_LIST)
    .withMessage('Condição do imóvel inválida.'),

  body('featured')
    .optional()
    .isBoolean()
    .withMessage('Featured deve ser verdadeiro ou falso.'),

  body('published')
    .optional()
    .isBoolean()
    .withMessage('Published deve ser verdadeiro ou falso.'),

  body('active')
    .optional()
    .isBoolean()
    .withMessage('Active deve ser verdadeiro ou falso.'),

  body('exclusive')
    .optional()
    .isBoolean()
    .withMessage('Exclusive deve ser verdadeiro ou falso.'),

  body('furnished')
    .optional()
    .isBoolean()
    .withMessage('Furnished deve ser verdadeiro ou falso.'),

  body('acceptsPets')
    .optional()
    .isBoolean()
    .withMessage('AcceptsPets deve ser verdadeiro ou falso.'),

  body('acceptsFinancing')
    .optional()
    .isBoolean()
    .withMessage('AcceptsFinancing deve ser verdadeiro ou falso.'),

  body('acceptsFGTS')
    .optional()
    .isBoolean()
    .withMessage('AcceptsFGTS deve ser verdadeiro ou falso.'),

  /* ============================================================
     PREÇOS
  ============================================================ */

  body('prices.salePrice')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Preço de venda inválido.'),

  body('prices.rentPrice')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Preço de aluguel inválido.'),

  body('prices.condominium')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Valor do condomínio inválido.'),

  body('prices.condominiumFee')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Valor do condomínio inválido.'),

  body('prices.iptu')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Valor do IPTU inválido.'),

  body('prices.otherFees')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Outras taxas inválidas.'),

  body('prices.salePrice').custom((value, { req }) => {
    if (req.body.purpose === 'venda' && (!value || Number(value) <= 0)) {
      throw new Error('Preço de venda é obrigatório para imóveis à venda.')
    }

    return true
  }),

  body('prices.rentPrice').custom((value, { req }) => {
    if (req.body.purpose === 'aluguel' && (!value || Number(value) <= 0)) {
      throw new Error('Preço de aluguel é obrigatório.')
    }

    return true
  }),

  body('prices').custom((value, { req }) => {
    if (req.body.purpose === 'venda_aluguel') {
      if (
        Number(req.body.prices?.salePrice || 0) <= 0 ||
        Number(req.body.prices?.rentPrice || 0) <= 0
      ) {
        throw new Error('Informe o preço de venda e aluguel.')
      }
    }

    return true
  }),

  /* ============================================================
     ÁREAS
  ============================================================ */

  body('area.total')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Área total inválida.'),

  body('area.built')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Área construída inválida.'),

  body('area.private')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Área privativa inválida.'),

  body('area.land')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Área do terreno inválida.'),

  body('area.frontage')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Frente do terreno inválida.'),

  body('area.background')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Fundo do terreno inválido.'),

  /* ============================================================
     CÔMODOS
  ============================================================ */

  body('bedrooms')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Quantidade de quartos inválida.'),

  body('suites')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Quantidade de suítes inválida.'),

  body('bathrooms')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Quantidade de banheiros inválida.'),

  body('parkingSpaces')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Quantidade de vagas inválida.'),

  body('floors')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Quantidade de andares inválida.'),

  body('floor')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Andar inválido.'),

  body('elevators')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Quantidade de elevadores inválida.'),

  body('age')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Idade do imóvel inválida.'),
]

/* ============================================================
   LOCATION
============================================================ */

export const locationValidator = [
  body('location.zipCode')
    .optional()
    .trim()
    .matches(/^\d{5}-?\d{3}$/)
    .withMessage('CEP inválido.'),

  body('location.street')
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage('Rua deve possuir no máximo 150 caracteres.'),

  body('location.number')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Número inválido.'),

  body('location.complement')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Complemento muito grande.'),

  body('location.district')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Bairro inválido.'),

  body('location.city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Cidade inválida.'),

  body('location.state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('Estado deve utilizar a sigla com 2 caracteres.'),

  body('location.region')
    .optional({ checkFalsy: true })
    .isIn(PROPERTY_REGION_LIST)
    .withMessage('Região inválida.'),

  body('location.latitude')
    .optional({ checkFalsy: true })
    .isFloat({
      min: -90,
      max: 90,
    })
    .withMessage('Latitude inválida.'),

  body('location.longitude')
    .optional({ checkFalsy: true })
    .isFloat({
      min: -180,
      max: 180,
    })
    .withMessage('Longitude inválida.'),
]

/* ============================================================
   GEOJSON
============================================================ */

export const geoLocationValidator = [
  body('location.coordinates.type')
    .optional({ checkFalsy: true })
    .equals('Point')
    .withMessage('Tipo de coordenada deve ser Point.'),

  body('location.coordinates.coordinates')
    .optional()
    .isArray({
      min: 2,
      max: 2,
    })
    .withMessage('Coordenadas devem possuir longitude e latitude.'),

  body('location.coordinates.coordinates.*')
    .optional({ checkFalsy: true })
    .isFloat()
    .withMessage('Coordenada deve ser numérica.'),

  body('location.coordinates.coordinates').custom((value) => {
    if (!value) return true

    const [lng, lat] = value

    if (lng < -180 || lng > 180) {
      throw new Error('Longitude inválida.')
    }

    if (lat < -90 || lat > 90) {
      throw new Error('Latitude inválida.')
    }

    return true
  }),
]

/* ============================================================
   FEATURES
============================================================ */

export const featuresValidator = [
  body('features')
    .optional()
    .isArray({
      max: 100,
    })
    .withMessage('Características devem ser um array.'),

  body('features.*')
    .optional()
    .isIn(PROPERTY_FEATURES)
    .withMessage('Característica inválida.'),
]

/* ============================================================
   IMAGENS
============================================================ */

export const imagesValidator = [
  body('images')
    .optional()
    .isArray({ max: 20 })
    .withMessage('O imóvel pode possuir no máximo 20 imagens.'),

  body('images.*.url')
    .optional()
    .isURL()
    .withMessage('URL da imagem inválida.'),

  body('images.*.public_id')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Public ID da imagem obrigatório.'),

  body('images.*.isCover')
    .optional()
    .isBoolean()
    .withMessage('isCover deve ser verdadeiro ou falso.'),

  body('images.*.order')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Order deve ser um número válido.'),

  body('images.*.title')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Título da imagem inválido.'),

  body('images.*.alt')
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage('Texto alternativo inválido.'),

  body('images.*.width')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Largura inválida.'),

  body('images.*.height')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Altura inválida.'),

  body('images.*.size')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Tamanho da imagem inválido.'),

  body('images.*.format').optional().trim(),

  body('images.*.blurHash').optional().trim(),
]

/* ============================================================
   BROKER / OWNER / CAPTATION
============================================================ */

export const peopleValidator = [
  /* ============================================================
     CORRETOR RESPONSÁVEL
  ============================================================ */

  body('broker')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Broker inválido.'),

  /* ============================================================
     PROPRIETÁRIO

     Estrutura do model:

     owner: {
       name,
       phone,
       email,
       document
     }
  ============================================================ */

  body('owner')
    .optional()
    .isObject()
    .withMessage('Dados do proprietário inválidos.'),

  body('owner.name')
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage('Nome do proprietário inválido.'),

  body('owner.phone')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Telefone do proprietário inválido.'),

  body('owner.email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('E-mail do proprietário inválido.'),

  body('owner.document')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Documento do proprietário inválido.'),

  /* ============================================================
     CAPTAÇÃO

     Estrutura do model:

     captation: {
       broker: ObjectId,
       percentage: Number
     }
  ============================================================ */

  body('captation')
    .optional()
    .isObject()
    .withMessage('Dados de captação inválidos.'),

  body('captation.broker')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Corretor de captação inválido.'),

  body('captation.percentage')
    .optional({ checkFalsy: true })
    .isFloat({
      min: 0,
      max: 100,
    })
    .withMessage('Percentual de captação inválido.'),
]

/* ============================================================
   ID
============================================================ */

export const propertyIdValidator = [
  param('id')
    .notEmpty()
    .withMessage('ID do imóvel é obrigatório.')
    .isMongoId()
    .withMessage('ID do imóvel inválido.'),
]

/* ============================================================
   SLUG
============================================================ */

export const propertySlugValidator = [
  param('slug').trim().notEmpty().withMessage('Slug obrigatório.'),
]

/* ============================================================
   CODE
============================================================ */

export const propertyCodeValidator = [
  param('code').trim().notEmpty().withMessage('Código do imóvel obrigatório.'),
]

/* ============================================================
   SEARCH
============================================================ */

export const searchPropertyValidator = [
  query('q')
    .optional()
    .trim()
    .isLength({
      min: 2,
      max: 100,
    })
    .withMessage('Busca deve possuir entre 2 e 100 caracteres.'),
]

/* ============================================================
   FILTER
============================================================ */

export const filterPropertyValidator = [
  query('type')
    .optional()
    .isIn(PROPERTY_TYPE_LIST)
    .withMessage('Tipo inválido.'),

  query('category')
    .optional()
    .isIn(PROPERTY_CATEGORY_LIST)
    .withMessage('Categoria inválida.'),

  query('purpose')
    .optional()
    .isIn(PROPERTY_PURPOSE_LIST)
    .withMessage('Finalidade inválida.'),

  query('status')
    .optional()
    .isIn(PROPERTY_STATUS_LIST)
    .withMessage('Status inválido.'),

  query('region')
    .optional()
    .isIn(PROPERTY_REGION_LIST)
    .withMessage('Região inválida.'),

  query('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Cidade inválida.'),

  query('district')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Bairro inválido.'),

  query('featured').optional().isBoolean(),

  query('published').optional().isBoolean(),

  query('active').optional().isBoolean(),

  query('broker').optional().isMongoId().withMessage('Broker inválido.'),

  query('minPrice')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Preço mínimo inválido.'),

  query('maxPrice')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Preço máximo inválido.'),

  query('minArea')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Área mínima inválida.'),

  query('maxArea')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Área máxima inválida.'),

  query('bedrooms')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Quantidade de quartos inválida.'),

  query('bathrooms')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Quantidade de banheiros inválida.'),

  query('parkingSpaces')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Quantidade de vagas inválida.'),
]

/* ============================================================
   PAGINATION
============================================================ */

export const paginationValidator = [
  query('page')
    .optional()
    .toInt()
    .isInt({ min: 1 })
    .withMessage('Página inválida.'),

  query('limit')
    .optional()
    .toInt()
    .isInt({
      min: 1,
      max: 100,
    })
    .withMessage('Limite deve estar entre 1 e 100.'),
]

/* ============================================================
   SORT
============================================================ */

export const sortPropertyValidator = [
  query('sort')
    .optional()
    .isIn([
      'createdAt',
      '-createdAt',
      'updatedAt',
      '-updatedAt',
      'name',
      '-name',
      'prices.salePrice',
      '-prices.salePrice',
      'bedrooms',
      '-bedrooms',
      'area.total',
      '-area.total',
      'views',
      '-views',
      'featured',
      '-featured',
    ])
    .withMessage('Ordenação inválida.'),
]

/* ============================================================
   ASSIGN BROKER
============================================================ */

export const assignBrokerValidator = [
  body('brokerId')
    .notEmpty()
    .withMessage('Broker é obrigatório.')
    .isMongoId()
    .withMessage('Broker inválido.'),
]

/* ============================================================
   PUBLISH
============================================================ */

export const publishPropertyValidator = [
  param('id').isMongoId().withMessage('ID do imóvel inválido.'),
]

/* ============================================================
   DUPLICATE
============================================================ */

export const duplicatePropertyValidator = [
  param('id').isMongoId().withMessage('ID do imóvel inválido.'),
]

/* ============================================================
   COVER IMAGE
============================================================ */

export const coverImageValidator = [
  body('public_id')
    .trim()
    .notEmpty()
    .withMessage('Public ID da imagem é obrigatório.'),
]

/* ============================================================
   DELETE IMAGE
============================================================ */

export const deleteImageValidator = [
  body('public_id')
    .trim()
    .notEmpty()
    .withMessage('Public ID da imagem é obrigatório.'),
]

/* ============================================================
   REORDER IMAGES
============================================================ */

export const reorderImagesValidator = [
  body('images')
    .isArray({
      min: 1,
    })
    .withMessage('Informe as imagens.'),

  body('images.*.public_id').notEmpty().withMessage('Public ID obrigatório.'),

  body('images.*.order')
    .isInt({
      min: 0,
    })
    .withMessage('Ordem inválida.'),
]

/* ============================================================
   VIDEO
============================================================ */

export const propertyVideoValidator = [
  body('video.url').optional().isURL().withMessage('URL do vídeo inválida.'),

  body('video.provider')
    .optional()
    .isIn(['youtube', 'vimeo', 'drive', 'outro'])
    .withMessage('Provider inválido.'),

  body('video.title')
    .optional()
    .trim()
    .isLength({
      max: 120,
    })
    .withMessage('Título inválido.'),
]

/* ============================================================
   TOUR VIRTUAL
============================================================ */

export const virtualTourValidator = [
  body('virtualTour')
    .optional()
    .isURL()
    .withMessage('Link do Tour Virtual inválido.'),
]

/* ============================================================
   DOCUMENTOS
============================================================ */

export const propertyDocumentsValidator = [
  body('documents').optional().isArray({
    max: 30,
  }),

  body('documents.*.name').optional().trim().isLength({
    max: 150,
  }),

  body('documents.*.url').optional().isURL(),

  body('documents.*.public_id').optional().trim(),
]

/* ============================================================
   SEO
============================================================ */

export const seoValidator = [
  body('seo.title')
    .optional()
    .trim()
    .isLength({
      max: 70,
    })
    .withMessage('SEO Title inválido.'),

  body('seo.description')
    .optional()
    .trim()
    .isLength({
      max: 170,
    })
    .withMessage('SEO Description inválida.'),

  body('seo.keywords').optional().isArray({
    max: 30,
  }),

  body('seo.canonical').optional().isURL().withMessage('Canonical inválido.'),
]

/* ============================================================
   HOTSITE
============================================================ */

export const hotsiteValidator = [
  body('hotsite.enabled').optional().isBoolean(),

  body('hotsite.slug').optional().trim().isLength({
    min: 3,
    max: 80,
  }),

  body('hotsite.theme').optional().trim(),

  body('hotsite.customDomain').optional().trim(),
]

/* ============================================================
   QR CODE
============================================================ */

export const qrCodeValidator = [
  body('qrCode').optional().isURL().withMessage('QR Code inválido.'),
]

/* ============================================================
   SHARE
============================================================ */

export const shareValidator = [
  body('platform')
    .optional()
    .isIn(['whatsapp', 'facebook', 'instagram', 'email', 'copiar'])
    .withMessage('Plataforma inválida.'),
]

/* ============================================================
   FAVORITES
============================================================ */

export const favoriteValidator = [
  param('id').isMongoId().withMessage('ID do imóvel inválido.'),
]

/* ============================================================
   VISIT
============================================================ */

export const visitValidator = [
  body('date').notEmpty().isISO8601().withMessage('Data inválida.'),

  body('broker').notEmpty().isMongoId().withMessage('Broker inválido.'),

  body('lead').optional().isMongoId().withMessage('Lead inválido.'),

  body('notes').optional().trim().isLength({
    max: 1000,
  }),
]

/* ============================================================
   RESERVE
============================================================ */

export const reserveValidator = [
  body('lead').notEmpty().isMongoId().withMessage('Lead inválido.'),

  body('expiresAt').notEmpty().isISO8601().withMessage('Data inválida.'),
]

/* ============================================================
   PUBLISH
============================================================ */

export const publishValidator = [
  param('id').isMongoId().withMessage('ID inválido.'),
]

/* ============================================================
   ARCHIVE
============================================================ */

export const archiveValidator = [
  param('id').isMongoId().withMessage('ID inválido.'),
]

/* ============================================================
   DUPLICATE
============================================================ */

export const duplicateValidator = [
  param('id').isMongoId().withMessage('ID inválido.'),
]

/* ============================================================
   UPDATE STATUS
============================================================ */

export const updateStatusValidator = [
  param('id').isMongoId(),

  body('status').isIn(PROPERTY_STATUS_LIST).withMessage('Status inválido.'),
]

/* ============================================================
   UPDATE PRICE
============================================================ */

export const updatePriceValidator = [
  param('id').isMongoId(),

  body('prices.salePrice').optional({ checkFalsy: true }).isFloat({
    min: 0,
  }),

  body('prices.rentPrice').optional({ checkFalsy: true }).isFloat({
    min: 0,
  }),
]

/* ============================================================
   UPDATE LOCATION
============================================================ */

export const updateLocationValidator = [
  param('id').isMongoId(),

  ...locationValidator,

  ...geoLocationValidator,
]
