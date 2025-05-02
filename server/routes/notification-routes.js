// server/routes/notification-routes.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getUserNotificationSettings,
  updateNotificationSettings
} from '../controllers/notification-controller.js';

const router = express.Router();

// Notification routes - all require authentication
router.get('/settings/:userId', authenticateToken, getUserNotificationSettings);
router.put('/settings/:userId', authenticateToken, updateNotificationSettings);

export default router;