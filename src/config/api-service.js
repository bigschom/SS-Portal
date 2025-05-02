// src/config/api-service.js
import apiClient from './api-client.js';
import { requestCache } from '../utils/cache-utils.js';

// Import all service modules
import authService from '../services/auth-service.js';
import userService from '../services/user-service.js';
import backgroundService from '../services/background-service.js';
import stakeholderService from '../services/stakeholder-service.js';
import guardService from '../services/guard-service.js';
import securityService from '../services/security-service.js';
import queueService from '../services/queue-service.js';
import notificationService from '../services/notification-service.js';
import taskService from '../services/task-service.js';
import activityLogService from '../services/activity-log-service.js';

// Export all services as a single object
export default {
  auth: authService,
  users: userService,
  backgroundChecks: backgroundService,
  stakeholderRequests: stakeholderService,
  guardShifts: guardService,
  guardShiftReports: guardService,
  securityServices: securityService,
  queue: queueService,
  notifications: notificationService,
  tasks: taskService,
  activityLog: activityLogService,
  apiClient, 
  
  // Utility methods that might be useful across services
  utils: {
    // Clearing all caches
    clearCaches() {
      requestCache.clear();
      securityService.invalidateCache();
      console.log('All service caches cleared');
    }
  }
};