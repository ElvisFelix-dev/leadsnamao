<<<<<<< HEAD
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
=======
import Property from '../models/Property.js'
import { getCoordinatesFromAddress } from '../utils/geocode.js'

// Criar imóvel (apenas admin)
// Criar imóvel (apenas admin ou corretor)
export const createProperty = async (req, res) => {
  try {
    const data = { ...req.body }

    // 🔑 Vincula ao usuário logado
    data.createdBy = req.user._id
    data.brokerId = req.user._id // ← necessário porque o schema exige

    // 📸 Pegar URLs das imagens enviadas
    if (req.files?.length > 0) {
      data.images = req.files.map((file) => file.path) // Cloudinary retorna a URL em file.path
    }

    // 📍 Buscar coordenadas pelo endereço
    const coords = await getCoordinatesFromAddress(data.address)
    if (coords) {
      data.location = coords
    }

    const property = new Property(data)
    const createdProperty = await property.save()

    res.status(201).json(createdProperty)
  } catch (error) {
    console.error('❌ Erro ao criar imóvel:', error.message) // log mais claro
    res
      .status(500)
      .json({ message: 'Erro ao criar imóvel', error: error.message })
  }
}

// Listar todos imóveis com filtros
export const getProperties = async (req, res) => {
  try {
    const { region, bedrooms, parking } = req.query

    const filter = {}

    if (region) filter.region = region
    if (bedrooms) filter.bedrooms = { $gte: Number(bedrooms) } // >= qtd
    if (parking) filter.parking = { $gte: Number(parking) } // >= qtd

    const properties = await Property.find(filter)

    res.status(200).json(properties)
  } catch (error) {
    console.error('❌ Erro ao buscar imóveis:', error)
    res.status(500).json({ message: 'Erro ao buscar imóveis' })
  }
}

// Listar imóvel por ID
export const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
    if (!property)
      return res.status(404).json({ message: 'Imóvel não encontrado' })
    res.json(property)
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar imóvel', error })
  }
}

// Atualizar imóvel (apenas admin)
export const updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
    if (!property)
      return res.status(404).json({ message: 'Imóvel não encontrado' })

    // Atualiza campos
    Object.assign(property, req.body)

    // Atualiza imagens se enviadas
    if (req.files) {
      property.images = req.files.map((file) => file.path)
    }

    const updatedProperty = await property.save()
    res.json(updatedProperty)
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar imóvel', error })
  }
}

// Deletar imóvel (apenas admin)
export const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.id)

    if (!property) {
      return res.status(404).json({ message: 'Imóvel não encontrado' })
    }

    res.json({ message: 'Imóvel deletado com sucesso!' })
  } catch (error) {
    console.error('❌ Erro ao deletar:', error)
    res
      .status(500)
      .json({ message: 'Erro ao deletar imóvel', error: error.message })
  }
}

export const getRandomImages = async (req, res) => {
  try {
    // Retorna 5 imagens aleatórias (ajuste o número se quiser mais)
    const properties = await Property.aggregate([
      { $sample: { size: 5 } }, // pega aleatoriamente
      { $project: { images: 1, name: 1 } }, // pega apenas images e nome
    ])

    // Pega a primeira imagem de cada imóvel
    const images = properties.map((p) => ({
      title: p.name,
      img: p.images[0],
      id: p._id,
    }))

    res.json(images)
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar imagens', error })
  }
}

export const shareProperty = async (req, res) => {
  try {
    const { id } = req.params // id do imóvel

    // pega o número do corretor logado
    const phoneNumber = req.user.phone

    if (!phoneNumber) {
      return res.status(400).json({
        message: 'Seu perfil não possui número de WhatsApp cadastrado',
      })
    }

    const property = await Property.findById(id)

    if (!property) {
      return res.status(404).json({ message: 'Imóvel não encontrado' })
    }

    // 📄 Monta mensagem do imóvel
    const message = `
🏠 *${property.name}*
📍 Endereço: ${property.address}
📌 Região: ${property.region}
🛏️ Quartos: ${property.bedrooms}
🚗 Vagas: ${property.parking}
💰 Preço: R$ ${property.price.toLocaleString('pt-BR')}
ℹ️ Descrição: ${property.description}
    `

    // 📲 Gera link de compartilhamento no WhatsApp
    const whatsappLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
      message,
    )}`

    res.json({ whatsappLink })
  } catch (error) {
    console.error('❌ Erro ao gerar link do WhatsApp:', error)
    res.status(500).json({ message: 'Erro ao compartilhar imóvel' })
  }
}
>>>>>>> 32e8de98b92a233f54261a3612474c5a61832f64
