// server/routes/queue-routes.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getHandlers,
  getRequests,
  assignHandler,
  removeHandler,
  assignRequestToHandler,
  markRequestUnableToHandle,
  markRequestCompleted,
  markRequestInvestigating,
  sendBackRequest,
  getHandlersByServiceType
} from '../controllers/queue-controller.js';

const router = express.Router();

// Queue management routes - all require authentication
router.get('/handlers', authenticateToken, getHandlers);
router.get('/handlers/by-service/:serviceType', authenticateToken, getHandlersByServiceType);
router.get('/requests', authenticateToken, getRequests);

router.post('/handlers', authenticateToken, assignHandler);
router.delete('/handlers/:id', authenticateToken, removeHandler);

router.put('/requests/:id/assign', authenticateToken, assignRequestToHandler);
router.put('/requests/:id/unable-to-handle', authenticateToken, markRequestUnableToHandle);
router.put('/requests/:id/complete', authenticateToken, markRequestCompleted);
router.put('/requests/:id/investigate', authenticateToken, markRequestInvestigating);
router.put('/requests/:id/send-back', authenticateToken, sendBackRequest);

export default router;