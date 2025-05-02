// server/routes/task-routes.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getAvailableRequests,
  getAssignedRequests,
  getSubmittedRequests,
  getSentBackRequests,
  getNewRequestsSince,
  getStatusChangesSince,
  claimRequest,
  updateRequestStatus,
  addComment,
  updateRequestData,
  getServiceDetails
} from '../controllers/task-controller.js';

const router = express.Router();

// TASK ROUTES - all need authentication
router.get('/available/:userId', authenticateToken, getAvailableRequests);
router.get('/assigned/:userId', authenticateToken, getAssignedRequests);
router.get('/submitted/:userId', authenticateToken, getSubmittedRequests);
router.get('/sent-back/:userId', authenticateToken, getSentBackRequests);
router.get('/new-since/:timestamp', authenticateToken, getNewRequestsSince);
router.get('/status-changes/:timestamp', authenticateToken, getStatusChangesSince);

// Task actions
router.post('/claim/:requestId', authenticateToken, claimRequest);
router.put('/status/:requestId', authenticateToken, updateRequestStatus);
router.post('/comment/:requestId', authenticateToken, addComment);
router.put('/data/:requestId', authenticateToken, updateRequestData);

// Service-specific detail endpoints
router.get('/details/call-history/:requestId', authenticateToken, (req, res) => 
  getServiceDetails(req, res, 'call_history'));
router.get('/details/momo-transaction/:requestId', authenticateToken, (req, res) => 
  getServiceDetails(req, res, 'momo_transaction'));
router.get('/details/money-refund/:requestId', authenticateToken, (req, res) => 
  getServiceDetails(req, res, 'money_refund'));
router.get('/details/serial-number/:requestId', authenticateToken, (req, res) => 
  getServiceDetails(req, res, 'serial_number'));
router.get('/details/stolen-phone/:requestId', authenticateToken, (req, res) => 
  getServiceDetails(req, res, 'stolen_phone'));
router.get('/details/unblock-call/:requestId', authenticateToken, (req, res) => 
  getServiceDetails(req, res, 'unblock_call'));
router.get('/details/unblock-momo/:requestId', authenticateToken, (req, res) => 
  getServiceDetails(req, res, 'unblock_momo'));
router.get('/details/backoffice-appointment/:requestId', authenticateToken, (req, res) => 
  getServiceDetails(req, res, 'backoffice_appointment'));

export default router;