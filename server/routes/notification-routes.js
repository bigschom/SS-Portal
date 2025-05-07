// server/routes/notification-routes.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  registerDesktopDevice,
  unregisterDesktopDevice,
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  getNotificationCount
} from '../controllers/notification-controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get notifications for the current user
router.get('/', getUserNotifications);

// Get unread notification count
router.get('/count', getNotificationCount);

// Mark a notification as read
router.put('/:id/read', markNotificationAsRead);

// Mark all notifications as read
router.put('/mark-all-read', markAllNotificationsAsRead);

// Delete a notification
router.delete('/:id', deleteNotification);

// Register a desktop device for notifications
router.post('/register-device', registerDesktopDevice);

// Unregister a desktop device
router.delete('/unregister-device/:deviceToken', unregisterDesktopDevice);

// Get user notification preferences
router.get('/preferences', getUserNotificationPreferences);

// Update user notification preferences
router.put('/preferences', updateUserNotificationPreferences);

export default router;