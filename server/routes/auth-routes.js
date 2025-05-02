// server/routes/auth-routes.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { 
  login, 
  checkSession, 
  updatePassword, 
  unlockAccount, 
  trackActivity,
  updateTempPassword,
  passwordStrength,
  getCurrentActivity,
  verifyPasswordHistory,
  checkUsernameAvailability
} from '../controllers/auth-controller.js';

const router = express.Router();

// AUTH ROUTES
router.post('/login', login);
router.get('/check-session', authenticateToken, checkSession);
router.post('/update-password', authenticateToken, updatePassword);
router.post('/unlock-account', authenticateToken, unlockAccount);
router.post('/track-activity', authenticateToken, trackActivity);
router.post('/update-temp-password', authenticateToken, updateTempPassword);
router.post('/password-strength', authenticateToken, passwordStrength);
router.get('/current-activity', authenticateToken, getCurrentActivity);
router.post('/verify-password-history', authenticateToken, verifyPasswordHistory);
router.get('/check-username/:username', authenticateToken, checkUsernameAvailability);

export default router;