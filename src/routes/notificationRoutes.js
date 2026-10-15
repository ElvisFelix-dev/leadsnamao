import express from 'express'
import { protect } from '../middleware/authMiddleware.js'
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  removeNotification,
} from '../controllers/notificationController.js'

const router = express.Router()
router.use(protect)

router.get('/unread-count', getUnreadNotificationCount)
router.get('/', getNotifications)
router.patch('/read-all', markAllNotificationsAsRead)
router.patch('/:id/read', markNotificationAsRead)
router.delete('/:id', removeNotification)

export default router
