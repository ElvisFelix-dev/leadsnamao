import express from 'express'

import { protect } from '../middleware/authMiddleware.js'

import {
  createCalendarEventController,
  getCalendarEventsController,
  getCalendarEventByIdController,
  updateCalendarEventController,
  deleteCalendarEventController,
  getCalendarByPeriodController,
  getCalendarByDayController,
  getUpcomingCalendarEventsController,
  getCalendarMetricsController,
  confirmCalendarEventController,
  completeCalendarEventController,
  cancelCalendarEventController,
} from '../controllers/calendarController.js'

const router = express.Router()

// ============================================================
// MIDDLEWARE
// ============================================================

router.use(protect)

// ============================================================
// CREATE
// POST /api/calendar
// ============================================================

router.post('/', createCalendarEventController)

// ============================================================
// LIST
// GET /api/calendar
// ============================================================

router.get('/', getCalendarEventsController)

// ============================================================
// METRICS
// GET /api/calendar/metrics
// ============================================================

router.get('/metrics', getCalendarMetricsController)

// ============================================================
// UPCOMING
// GET /api/calendar/upcoming
// ============================================================

router.get('/upcoming', getUpcomingCalendarEventsController)

// ============================================================
// DAY
// GET /api/calendar/day
// ============================================================

router.get('/day', getCalendarByDayController)

// ============================================================
// PERIOD
// GET /api/calendar/period
// ============================================================

router.get('/period', getCalendarByPeriodController)

// ============================================================
// CONFIRM
// PATCH /api/calendar/:id/confirm
// ============================================================

router.patch('/:id/confirm', confirmCalendarEventController)

// ============================================================
// COMPLETE
// PATCH /api/calendar/:id/complete
// ============================================================

router.patch('/:id/complete', completeCalendarEventController)

// ============================================================
// CANCEL
// PATCH /api/calendar/:id/cancel
// ============================================================

router.patch('/:id/cancel', cancelCalendarEventController)

// ============================================================
// GET BY ID
// GET /api/calendar/:id
// ============================================================

router.get('/:id', getCalendarEventByIdController)

// ============================================================
// UPDATE
// PATCH /api/calendar/:id
// ============================================================

router.patch('/:id', updateCalendarEventController)

// ============================================================
// DELETE
// DELETE /api/calendar/:id
// ============================================================

router.delete('/:id', deleteCalendarEventController)

export default router
