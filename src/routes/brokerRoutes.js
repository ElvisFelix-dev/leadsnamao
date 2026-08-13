import express from 'express'

import {
  getBrokers,
  getBrokerById,
  getBrokerBySlug,
  getPublicBrokerById,
  getPublicBrokers,
  getBrokerHotsite,
} from '../controllers/brokerController.js'

import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

// ==========================================
// HOTSITE DO CORRETOR
// ==========================================

router.get('/hotsite/:slug', getBrokerHotsite)

// ======================================
// ADMIN
// ======================================

router.get('/', protect, getBrokers)

// ======================================
// PÚBLICAS
// ======================================

// Lista de corretores para o site
router.get('/public', getPublicBrokers)

// Corretor específico
router.get('/public/:id', getPublicBrokerById)

// Corretor por slug
router.get('/slug/:slug', getBrokerBySlug)

// ======================================
// PROTEGIDA
// ======================================

router.get('/:id', protect, getBrokerById)

export default router
