// server/routes/background-routes.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getCitizenships,
  getRequesters,
  getAllDepartments,
  checkDuplicateId,
  createBackgroundCheck,
  getAllBackgroundChecks,
  getBackgroundCheckById,
  updateBackgroundCheck,
  deleteBackgroundCheck,
  getInternships
} from '../controllers/background-controller.js';

const router = express.Router();

// Get options for dropdowns
router.get('/citizenships', authenticateToken, getCitizenships);
router.get('/requesters', authenticateToken, getRequesters);
router.get('/departments', authenticateToken, getAllDepartments);

// Check for duplicate ID
router.get('/check-id/:idNumber', authenticateToken, checkDuplicateId);

// Background check CRUD operations
router.post('/', authenticateToken, createBackgroundCheck);
router.get('/', authenticateToken, getAllBackgroundChecks);
router.get('/:id', authenticateToken, getBackgroundCheckById);
router.put('/:id', authenticateToken, updateBackgroundCheck);
router.delete('/:id', authenticateToken, deleteBackgroundCheck);

// Get internships (special case)
router.get('/internships', authenticateToken, getInternships);

export default router;