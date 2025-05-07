// server/routes/internship-routes.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getAllInternships,
  getInternshipById,
  createInternship,
  updateInternship,
  deleteInternship,
  checkDuplicateId,
  getInternshipStatistics,
  getCitizenshipOptions,
  getSupervisors
} from '../controllers/internship-controller.js';

const router = express.Router();

// Main index route
router.get('/', authenticateToken, getAllInternships);

// Utility Routes - THESE MUST COME BEFORE THE :id ROUTE
router.get('/check-duplicate-id', authenticateToken, checkDuplicateId);
router.get('/statistics', authenticateToken, getInternshipStatistics);
router.get('/supervisors', authenticateToken, getSupervisors);
router.get('/citizenship-options', authenticateToken, getCitizenshipOptions);

// ID Route - this must come AFTER the specific utility routes
router.get('/:id', authenticateToken, getInternshipById);

// Other routes
router.post('/', authenticateToken, createInternship);
router.put('/:id', authenticateToken, updateInternship);
router.delete('/:id', authenticateToken, deleteInternship);

export default router;