import Visit from '../models/Visit.js'
import { VISIT_STATUS } from '../constants/visitStatus.js'
import {
  notifyManagers,
  notifyUsers,
} from '../service/notifications/notificationService.js'

let isRunning = false

export const processVisitReminders = async () => {
  if (isRunning) return { processed: 0, skipped: true }
  isRunning = true

  try {
    const now = new Date()
    const maxLookAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const visits = await Visit.find({
      date: { $gte: now, $lte: maxLookAhead },
      'reminder.enabled': { $ne: false },
      status: { $in: [VISIT_STATUS.SCHEDULED, VISIT_STATUS.CONFIRMED] },
    })
      .select('_id title date broker reminder status')
      .lean()

    let processed = 0
    for (const visit of visits) {
      const minutesBefore = Math.max(
        0,
        Number(visit.reminder?.minutesBefore ?? 30),
      )
      const remainingMs = new Date(visit.date).getTime() - now.getTime()
      if (remainingMs > minutesBefore * 60 * 1000) continue

      const visitDate = new Date(visit.date).toLocaleString('pt-BR')
      const dedupeKey = `visit-reminder:${visit._id}:${new Date(visit.date).toISOString()}`
      const notification = {
        type: 'visit.reminder',
        title: 'Lembrete de compromisso',
        message: `${visit.title || 'Compromisso'} começa às ${visitDate}.`,
        link: `/visits/${visit._id}`,
        entityType: 'Visit',
        entityId: visit._id,
        priority: 'high',
        dedupeKey,
      }

      await Promise.all([
        notifyUsers([visit.broker], notification),
        notifyManagers({
          ...notification,
          dedupeKey: `manager:${dedupeKey}`,
        }),
      ])
      processed += 1
    }

    return { processed, checked: visits.length }
  } catch (error) {
    console.error(
      '[VisitReminders] Erro ao processar lembretes:',
      error.message,
    )
    return { processed: 0, error: error.message }
  } finally {
    isRunning = false
  }
}

export default processVisitReminders
