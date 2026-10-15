import mongoose from 'mongoose'
import Notification from '../../models/Notification.js'
import User from '../../models/User.js'
import { getSocketIO } from '../../sockets/index.js'
import { sendPushToUser } from '../pushNotificationService.js'

const normalizeId = (value) => {
  if (!value) return null
  const id = value?._id || (typeof value?.toHexString === 'function' ? value : value?.id || value)
  return mongoose.Types.ObjectId.isValid(String(id)) ? String(id) : null
}

export const getManagerIds = async () => {
  const managers = await User.find({
    isActive: { $ne: false },
    $or: [{ role: 'admin' }, { isAdmin: true }],
  }).select('_id role isAdmin isActive').lean()

  if (!managers.length) {
    console.warn(
      '[NotificationService] Nenhum gestor elegível encontrado. Confira se ao menos um usuário possui role="admin" ou isAdmin=true e não está inativo.',
    )
  } else {
    console.info(`[NotificationService] Gestores elegíveis encontrados: ${managers.length}`)
  }

  return managers.map((user) => String(user._id))
}

export const createNotification = async ({
  recipientId,
  type,
  title,
  message,
  link = '/',
  entityType = '',
  entityId = null,
  priority = 'normal',
  metadata = {},
  dedupeKey,
  push = true,
}) => {
  const normalizedRecipientId = normalizeId(recipientId)
  if (!normalizedRecipientId) throw new Error('Destinatário da notificação inválido.')

  const notificationData = {
    recipient: normalizedRecipientId,
    type,
    title,
    message,
    link,
    entityType,
    entityId: normalizeId(entityId),
    priority,
    metadata,
    ...(dedupeKey ? { dedupeKey: String(dedupeKey) } : {}),
  }

  let notification
  let created = true

  if (dedupeKey) {
    notification = await Notification.findOne({
      recipient: normalizedRecipientId,
      dedupeKey: String(dedupeKey),
    })

    if (notification) {
      created = false
    } else {
      try {
        notification = await Notification.create(notificationData)
      } catch (error) {
        // Protege contra dois eventos concorrentes com a mesma chave.
        if (error?.code !== 11000) throw error
        notification = await Notification.findOne({
          recipient: normalizedRecipientId,
          dedupeKey: String(dedupeKey),
        })
        created = false
      }
    }
  } else {
    notification = await Notification.create(notificationData)
  }

  if (created && notification) {
    const payload = notification.toObject()
    const io = getSocketIO()

    if (io) io.to(`user_${normalizedRecipientId}`).emit('notification:new', payload)

    if (push) {
      try {
        await sendPushToUser(normalizedRecipientId, {
          title,
          body: message,
          url: link,
          tag: dedupeKey || `notification-${notification._id}`,
          data: {
            notificationId: String(notification._id),
            type,
            link,
          },
        })
      } catch (error) {
        // A falha no push não deve desfazer a notificação persistida no CRM.
        console.error('[NotificationService] Falha no push:', error.message)
      }
    }
  }

  return notification
}

export const notifyUsers = async (recipientIds = [], notification) => {
  const ids = [...new Set(recipientIds.map(normalizeId).filter(Boolean))]
  const results = await Promise.allSettled(
    ids.map((recipientId) =>
      createNotification({ ...notification, recipientId }),
    ),
  )

  const failed = results.filter((result) => result.status === 'rejected')
  if (failed.length) {
    console.error(
      `[NotificationService] ${failed.length} notificação(ões) não puderam ser criadas.`,
      failed.map((item) => item.reason?.message),
    )
  }

  return results
}

export const notifyManagers = async (notification) => {
  const managerIds = await getManagerIds()

  if (!managerIds.length) {
    console.warn(
      `[NotificationService] Notificação não gravada porque não há destinatários gestores. type=${notification?.type || 'unknown'} title=${notification?.title || 'sem título'}`,
    )
    return []
  }

  console.info(
    `[NotificationService] Criando notificação para ${managerIds.length} gestor(es). type=${notification?.type || 'unknown'}`,
  )
  return notifyUsers(managerIds, notification)
}

export const listNotifications = async ({ userId, page = 1, limit = 20, unreadOnly = false }) => {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1)
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20))
  const filter = { recipient: userId }
  if (unreadOnly === true || unreadOnly === 'true') filter.isRead = false

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: userId, isRead: false }),
  ])

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit),
    },
    unreadCount,
  }
}

export const markNotificationRead = async ({ notificationId, userId }) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) return null
  return Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true },
  )
}

export const markAllNotificationsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
  )
  return { modifiedCount: result.modifiedCount || 0 }
}

export const deleteNotification = async ({ notificationId, userId }) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) return null
  return Notification.findOneAndDelete({ _id: notificationId, recipient: userId })
}
