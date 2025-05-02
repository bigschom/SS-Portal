// server/routes/activity-log-routes.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { logActivity, getAllActivityLogs } from '../controllers/activity-log-controller.js';

const router = express.Router();

// Activity log routes - all need authentication
router.post('/', authenticateToken, logActivity);
router.get('/', authenticateToken, getAllActivityLogs);

export default router;