import express from 'express'

import { getBrokerDashboard } from '../controllers/brokerDashboardController.js'

import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

/*
====================================================
Dashboard Corretor

GET /api/broker-dashboard

Protegido por JWT

====================================================
*/

router.get('/', protect, getBrokerDashboard)

export default router
