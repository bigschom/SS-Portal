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
  getUnhandledRequests,
  claimRequest,
  updateRequestStatus,
  autoReturnRequest,
  addComment,
  getRequestComments,
  handleCommentReaction,
  updateRequestData,
  updateServiceSpecificData,
  getServiceDetails
} from '../controllers/task-controller.js';

const router = express.Router();

// Request listings - all need authentication
router.get('/available/:userId', authenticateToken, getAvailableRequests);
router.get('/assigned/:userId', authenticateToken, getAssignedRequests);
router.get('/submitted/:userId', authenticateToken, getSubmittedRequests);
router.get('/sent-back/:userId', authenticateToken, getSentBackRequests);
router.get('/unhandled', authenticateToken, getUnhandledRequests);
router.get('/new-since/:timestamp', authenticateToken, getNewRequestsSince);
router.get('/status-changes/:timestamp', authenticateToken, getStatusChangesSince);

// Request actions
router.post('/claim/:requestId', authenticateToken, claimRequest);
router.put('/status/:requestId', authenticateToken, updateRequestStatus);
router.put('/auto-return/:requestId', authenticateToken, autoReturnRequest);
router.post('/comment/:requestId', authenticateToken, addComment);
router.get('/comments/:requestId', authenticateToken, getRequestComments);
router.post('/reaction/:commentId', authenticateToken, handleCommentReaction);
router.put('/data/:requestId', authenticateToken, updateRequestData);
router.put('/service-data/:requestId/:serviceType', authenticateToken, updateServiceSpecificData);

// Service-specific detail endpoints
router.get('/details/call-history/:requestId', authenticateToken, (req, res) => 
  getServiceDetails(req, res, 'call-history'));
router.get('/details/momo-transaction/:requestId', authenticateToken, (req, res) => 
  getServiceDetails(req, res, 'momo-transaction'));
router.get('/details/money-refund/:requestId', authenticateToken, (req, res) => 
  getServiceDetails(req, res, 'money-refund'));
router.get('/details/serial-number/:requestId', authenticateToken, (req, res) => 
  getServiceDetails(req, res, 'serial-number'));
router.get('/details/stolen-phone/:requestId', authenticateToken, (req, res) => 
  getServiceDetails(req, res, 'stolen-phone'));
router.get('/details/unblock-call/:requestId', authenticateToken, (req, res) => 
  getServiceDetails(req, res, 'unblock-call'));
router.get('/details/unblock-momo/:requestId', authenticateToken, (req, res) => 
  getServiceDetails(req, res, 'unblock-momo'));
router.get('/details/backoffice-appointment/:requestId', authenticateToken, (req, res) => 
  getServiceDetails(req, res, 'backoffice-appointment'));


export default router;