import express from 'express'

import {
  getAdminDashboard,
  getBrokerDashboard,
} from '../controllers/dashboardController.js'

import { protect, admin } from '../middleware/authMiddleware.js'

const router = express.Router()

/*
====================================================
Dashboard Admin
====================================================
*/

router.get('/stats', protect, admin, getAdminDashboard)

/*
====================================================
Dashboard Corretor
====================================================
*/

router.get('/broker-dashboard', protect, getBrokerDashboard)

export default router
