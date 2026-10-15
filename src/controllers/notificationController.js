import asyncHandler from '../middleware/asyncHandler.js'
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../service/notifications/notificationService.js'

const getUserId = (req) => String(req.user?._id || req.user?.id || '')

export const getNotifications = asyncHandler(async (req, res) => {
  const data = await listNotifications({
    userId: getUserId(req),
    page: req.query.page,
    limit: req.query.limit,
    unreadOnly: req.query.unreadOnly,
  })
  res.status(200).json({ success: true, data })
})

export const getUnreadNotificationCount = asyncHandler(async (req, res) => {
  const data = await listNotifications({
    userId: getUserId(req),
    page: 1,
    limit: 1,
  })
  res.status(200).json({ success: true, data: { unreadCount: data.unreadCount } })
})

export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const notification = await markNotificationRead({
    notificationId: req.params.id,
    userId: getUserId(req),
  })
  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notificação não encontrada.' })
  }
  return res.status(200).json({ success: true, data: notification })
})

export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const data = await markAllNotificationsRead(getUserId(req))
  res.status(200).json({ success: true, data })
})

export const removeNotification = asyncHandler(async (req, res) => {
  const notification = await deleteNotification({
    notificationId: req.params.id,
    userId: getUserId(req),
  })
  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notificação não encontrada.' })
  }
  return res.status(200).json({ success: true, message: 'Notificação removida.' })
})
