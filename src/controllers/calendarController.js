import {
  createCalendarEvent,
  getCalendarEvents,
  getCalendarEventById,
  updateCalendarEvent,
  deleteCalendarEvent,
  getCalendarByPeriod,
  getCalendarByDay,
  getUpcomingCalendarEvents,
  getCalendarMetrics,
} from '../service/calendarService.js'

import { confirmVisitService } from '../service/visit/confirmVisitService.js'
import { completeVisitService } from '../service/visit/completeVisitService.js'
import { cancelVisitService } from '../service/visit/cancelVisitService.js'

// ============================================================
// HELPERS
// ============================================================

const getErrorStatus = (error) => {
  const message = error?.message || ''

  // ============================================
  // NOT FOUND
  // ============================================

  if (
    [
      'Compromisso não encontrado.',
      'Lead não encontrado.',
      'Imóvel não encontrado.',
      'Corretor não encontrado.',
    ].includes(message)
  ) {
    return 404
  }

  // ============================================
  // CONFLITO DE AGENDA
  // ============================================

  if (
    message.toLowerCase().includes('conflito de agenda') ||
    message.toLowerCase().includes('já existe o compromisso')
  ) {
    return 409
  }

  // ============================================
  // NÃO AUTORIZADO
  // ============================================

  if (
    message.includes('não possui acesso') ||
    message.includes('não possui permissão')
  ) {
    return 403
  }

  // ============================================
  // PADRÃO
  // ============================================

  return 400
}

const sendError = (res, error, fallbackMessage) => {
  const statusCode = getErrorStatus(error)

  console.error(`[CALENDAR ${statusCode}]`, error)

  return res.status(statusCode).json({
    success: false,
    message: error?.message || fallbackMessage,
  })
}

// ============================================================
// CREATE
// POST /api/calendar
// ============================================================

export const createCalendarEventController = async (req, res) => {
  try {
    const event = await createCalendarEvent({
      body: req.body,
      user: req.user,
    })

    return res.status(201).json({
      success: true,
      message: 'Compromisso criado com sucesso.',
      data: event,
    })
  } catch (error) {
    return sendError(res, error, 'Não foi possível criar o compromisso.')
  }
}

// ============================================================
// LIST
// GET /api/calendar
// ============================================================

export const getCalendarEventsController = async (req, res) => {
  try {
    const result = await getCalendarEvents({
      user: req.user,
      query: req.query,
    })

    return res.status(200).json({
      success: true,
      data: result.events,
      pagination: result.pagination,
    })
  } catch (error) {
    return sendError(res, error, 'Não foi possível carregar a agenda.')
  }
}

// ============================================================
// GET BY ID
// GET /api/calendar/:id
// ============================================================

export const getCalendarEventByIdController = async (req, res) => {
  try {
    const { id } = req.params

    const event = await getCalendarEventById({
      id,
      user: req.user,
    })

    return res.status(200).json({
      success: true,
      data: event,
    })
  } catch (error) {
    return sendError(res, error, 'Não foi possível encontrar o compromisso.')
  }
}

// ============================================================
// UPDATE
// PATCH /api/calendar/:id
// ============================================================

export const updateCalendarEventController = async (req, res) => {
  try {
    const { id } = req.params

    const event = await updateCalendarEvent({
      id,
      body: req.body,
      user: req.user,
    })

    return res.status(200).json({
      success: true,
      message: 'Compromisso atualizado com sucesso.',
      data: event,
    })
  } catch (error) {
    return sendError(res, error, 'Não foi possível atualizar o compromisso.')
  }
}

// ============================================================
// DELETE
// DELETE /api/calendar/:id
// ============================================================

export const deleteCalendarEventController = async (req, res) => {
  try {
    const { id } = req.params

    const result = await deleteCalendarEvent({
      id,
      user: req.user,
    })

    return res.status(200).json({
      success: true,
      message: 'Compromisso excluído com sucesso.',
      data: result,
    })
  } catch (error) {
    return sendError(res, error, 'Não foi possível excluir o compromisso.')
  }
}

// ============================================================
// CALENDAR BY PERIOD
// GET /api/calendar/period
// ============================================================

export const getCalendarByPeriodController = async (req, res) => {
  try {
    const { start, end, broker, type, status } = req.query

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: 'As datas de início e término são obrigatórias.',
      })
    }

    const events = await getCalendarByPeriod({
      user: req.user,
      start,
      end,
      broker,
      type,
      status,
    })

    return res.status(200).json({
      success: true,
      data: events,
      meta: {
        start,
        end,
        total: events.length,
      },
    })
  } catch (error) {
    return sendError(
      res,
      error,
      'Não foi possível carregar o período da agenda.',
    )
  }
}

// ============================================================
// CALENDAR BY DAY
// GET /api/calendar/day
// ============================================================

export const getCalendarByDayController = async (req, res) => {
  try {
    const { date, broker } = req.query

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'A data é obrigatória.',
      })
    }

    const events = await getCalendarByDay({
      user: req.user,
      date,
      broker,
    })

    return res.status(200).json({
      success: true,
      data: events,
      meta: {
        date,
        total: events.length,
      },
    })
  } catch (error) {
    return sendError(res, error, 'Não foi possível carregar a agenda do dia.')
  }
}

// ============================================================
// UPCOMING
// GET /api/calendar/upcoming
// ============================================================

export const getUpcomingCalendarEventsController = async (req, res) => {
  try {
    const { limit = 10 } = req.query

    const events = await getUpcomingCalendarEvents({
      user: req.user,
      limit,
    })

    return res.status(200).json({
      success: true,
      data: events,
      meta: {
        total: events.length,
      },
    })
  } catch (error) {
    return sendError(
      res,
      error,
      'Não foi possível carregar os próximos compromissos.',
    )
  }
}

// ============================================================
// METRICS
// GET /api/calendar/metrics
// ============================================================

export const getCalendarMetricsController = async (req, res) => {
  try {
    const { start, end, broker } = req.query

    const metrics = await getCalendarMetrics({
      user: req.user,
      start,
      end,
      broker,
    })

    return res.status(200).json({
      success: true,
      data: metrics,
    })
  } catch (error) {
    return sendError(
      res,
      error,
      'Não foi possível carregar as métricas da agenda.',
    )
  }
}

// ============================================================
// CONFIRM
// PATCH /api/calendar/:id/confirm
// ============================================================

export const confirmCalendarEventController = async (req, res) => {
  try {
    const { id } = req.params

    const event = await confirmVisitService({
      id,
      user: req.user,
    })

    return res.status(200).json({
      success: true,
      message: 'Compromisso confirmado com sucesso.',
      data: event,
    })
  } catch (error) {
    return sendError(res, error, 'Não foi possível confirmar o compromisso.')
  }
}

// ============================================================
// COMPLETE
// PATCH /api/calendar/:id/complete
// ============================================================

export const completeCalendarEventController = async (req, res) => {
  try {
    const { id } = req.params

    const event = await completeVisitService({
      id,
      body: req.body,
      user: req.user,
    })

    return res.status(200).json({
      success: true,
      message: 'Compromisso concluído com sucesso.',
      data: event,
    })
  } catch (error) {
    return sendError(res, error, 'Não foi possível concluir o compromisso.')
  }
}

// ============================================================
// CANCEL
// PATCH /api/calendar/:id/cancel
// ============================================================

export const cancelCalendarEventController = async (req, res) => {
  try {
    const { id } = req.params

    const event = await cancelVisitService({
      id,
      body: req.body,
      user: req.user,
    })

    return res.status(200).json({
      success: true,
      message: 'Compromisso cancelado com sucesso.',
      data: event,
    })
  } catch (error) {
    return sendError(res, error, 'Não foi possível cancelar o compromisso.')
  }
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
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
}
