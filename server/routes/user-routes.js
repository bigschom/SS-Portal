// server/routes/user-routes.js
import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import {
  getAllActiveUsers,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  resetPassword,
  deleteUser
} from '../controllers/user-controller.js';

const router = express.Router();

// USER ROUTES - all routes need authentication
router.get('/active', authenticateToken, getAllActiveUsers);
router.get('/', authenticateToken, getAllUsers);
router.get('/:id', authenticateToken, getUserById);

// These operations require admin role
router.post('/', requireAdmin, createUser);
router.put('/:id', requireAdmin, updateUser);
router.post('/:id/reset-password', requireAdmin, resetPassword);
router.delete('/:id', requireAdmin, deleteUser);

export default router;