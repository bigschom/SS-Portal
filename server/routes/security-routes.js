// server/routes/security-routes.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getAvailableServices,
  getUserServicePermissions,
  getBackofficeUsers,
  submitBackofficeAppointment,
  submitCallHistoryRequest,
  submitMomoTransactionRequest,
  submitUnblockMomoRequest,
  submitMoneyRefundRequest,
  submitSerialNumberRequest,
  submitStolenPhoneCheck,
  submitUnblockCallRequest,
  submitOtherRequest
} from '../controllers/security-controller.js';

const router = express.Router();

// Security service routes - all require authentication
router.get('/', authenticateToken, getAvailableServices);
router.get('/permissions/:userId', authenticateToken, getUserServicePermissions);
router.get('/backoffice-users', authenticateToken, getBackofficeUsers);

// Security service submission endpoints
router.post('/backoffice-appointments', authenticateToken, submitBackofficeAppointment);
router.post('/call-history-request', authenticateToken, submitCallHistoryRequest);
router.post('/momo-transaction-request', authenticateToken, submitMomoTransactionRequest);
router.post('/unblock-momo-request', authenticateToken, submitUnblockMomoRequest);
router.post('/money-refund-request', authenticateToken, submitMoneyRefundRequest);
router.post('/serial-number-request', authenticateToken, submitSerialNumberRequest);
router.post('/stolen-phone-check', authenticateToken, submitStolenPhoneCheck);
router.post('/unblock-call-request', authenticateToken, submitUnblockCallRequest);
router.post('/other-request', authenticateToken, submitOtherRequest);

export default router;