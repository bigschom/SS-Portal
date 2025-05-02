// server/routes/guard-routes.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getAllReports,
  getReportById,
  getWeeklyStats,
  createReport,
  updateReport,
  deleteReport,
  getLocations,
  getShiftTypes
} from '../controllers/guard-controller.js';

const router = express.Router();

// Guard shift report routes - all require authentication
router.get('/', authenticateToken, getAllReports);
router.get('/stats/weekly', authenticateToken, getWeeklyStats);
router.get('/locations', authenticateToken, getLocations);
router.get('/shift-types', authenticateToken, getShiftTypes);
router.get('/:id', authenticateToken, getReportById);
router.post('/', authenticateToken, createReport);
router.put('/:id', authenticateToken, updateReport);
router.delete('/:id', authenticateToken, deleteReport);

// Add aliases for backward compatibility
router.get('/guard-shifts', authenticateToken, getAllReports);
router.get('/guard-shifts/stats/weekly', authenticateToken, getWeeklyStats);

export default router;