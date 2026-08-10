import express from 'express'

import {
  createVisit,
  getVisits,
  getVisitById,
  updateVisit,
  deleteVisit,
  confirmVisit,
  completeVisit,
  cancelVisit,
  getTodayVisits,
  getUpcomingVisits,
} from '../controllers/visitController.js'

import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

/*
====================================================
Agenda
====================================================
*/

router.get('/today', protect, getTodayVisits)

router.get('/upcoming', protect, getUpcomingVisits)

/*
====================================================
CRUD
====================================================
*/

router.route('/').get(protect, getVisits).post(protect, createVisit)

router
  .route('/:id')
  .get(protect, getVisitById)
  .put(protect, updateVisit)
  .delete(protect, deleteVisit)

/*
====================================================
Ações
====================================================
*/

router.patch('/:id/confirm', protect, confirmVisit)

router.patch('/:id/complete', protect, completeVisit)

router.patch('/:id/cancel', protect, cancelVisit)

export default router
