import asyncHandler from '../middleware/asyncHandler.js'

import brokerService from '../service/users/brokerService.js'

import ApiResponse from '../utils/ApiResponse.js'

// ==========================================
// Hotsite do corretor
// ==========================================
export const getBrokerHotsite = asyncHandler(async (req, res) => {
  const { slug } = req.params

  const hotsite = await brokerService.getBrokerHotsite(slug)

  res.json({
    success: true,
    data: hotsite,
  })
})

/*
======================================
    Buscar corretor por ID
======================================
*/

export const getBrokerById = asyncHandler(async (req, res) => {
  const broker = await brokerService.getBrokerById(req.params.id)

  return ApiResponse.success(res, broker, 'Corretor encontrado com sucesso.')
})

/*
======================================
    Buscar corretor pelo Slug
======================================
*/

export const getBrokerBySlug = asyncHandler(async (req, res) => {
  console.log('🔥 GET BROKER BY SLUG')
  console.log('SLUG:', req.params.slug)

  const broker = await brokerService.getBrokerBySlug(req.params.slug)

  return ApiResponse.success(res, broker, 'Corretor encontrado com sucesso.')
})

/*
======================================
    Dados públicos do corretor
======================================
*/

export const getPublicBrokerById = asyncHandler(async (req, res) => {
  const broker = await brokerService.getPublicBroker(req.params.id)

  return ApiResponse.success(
    res,
    broker,
    'Dados públicos carregados com sucesso.',
  )
})

export const getBrokers = async (req, res) => {
  try {
    const brokers = await brokerService.getBrokers()

    res.json(brokers)
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: error.message,
    })
  }
}

// ======================================
// LISTAR CORRETORES PÚBLICOS
// ======================================

export const getPublicBrokers = async (req, res) => {
  try {
    const brokers = await brokerService.getPublicBrokers()

    return res.status(200).json({
      success: true,
      brokers,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}
