// server/routes/stakeholder-routes.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getOptions,
  getAllRequests,
  createRequest,
  updateRequest,
  deleteRequest,
  deleteMultiple
} from '../controllers/stakeholder-controller.js';

const router = express.Router();

// Stakeholder request routes - all require authentication
router.get('/options', authenticateToken, getOptions);
router.get('/', authenticateToken, getAllRequests);
router.post('/', authenticateToken, createRequest);
router.put('/:id', authenticateToken, updateRequest);
router.delete('/:id', authenticateToken, deleteRequest);
router.post('/delete-multiple', authenticateToken, deleteMultiple);

export default router;