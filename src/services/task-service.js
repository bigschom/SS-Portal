// src/services/task-service.js
import apiClient from '../config/api-client.js';

// Tasks related endpoints
const taskService = {
  /**
   * Fetch available requests for a user
   * @param {string|number} userId - The user ID
   * @returns {Promise<Array>} - Available requests
   */
  getAvailableRequests: async (userId) => {
    try {
      if (!userId) return [];
      const response = await apiClient.get(`/tasks/available/${userId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Task service: Error fetching available requests:', error);
      return [];
    }
  },
  
  /**
   * Fetch assigned requests for a user
   * @param {string|number} userId - The user ID
   * @param {string|null} status - Optional status filter
   * @returns {Promise<Array>} - Assigned requests
   */
  getAssignedRequests: async (userId, status = null) => {
    try {
      if (!userId) return [];
      
      let url = `/tasks/assigned/${userId}`;
      if (status) {
        url += `?status=${status}`;
      }
      
      const response = await apiClient.get(url);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Task service: Error fetching assigned requests:', error);
      return [];
    }
  },
  
  /**
   * Fetch submitted requests for a user
   * @param {string|number} userId - The user ID
   * @returns {Promise<Array>} - Submitted requests
   */
  getSubmittedRequests: async (userId) => {
    try {
      if (!userId) return [];
      
      const response = await apiClient.get(`/tasks/submitted/${userId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Task service: Error fetching submitted requests:', error);
      return [];
    }
  },
  
  /**
   * Fetch sent back requests for a user
   * @param {string|number} userId - The user ID
   * @returns {Promise<Array>} - Sent back requests
   */
  getSentBackRequests: async (userId) => {
    try {
      if (!userId) return [];
      
      const response = await apiClient.get(`/tasks/sent-back/${userId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Task service: Error fetching sent back requests:', error);
      return [];
    }
  },
  
  /**
   * Fetch new requests since a specific timestamp
   * @param {number} timestamp - Timestamp in milliseconds
   * @param {string|number} userId - The user ID
   * @returns {Promise<Array>} - New requests since timestamp
   */
  getNewRequestsSince: async (timestamp, userId) => {
    try {
      if (!timestamp || !userId) return [];
      
      const response = await apiClient.get(`/tasks/new-since/${timestamp}?userId=${userId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Task service: Error fetching new requests:', error);
      return [];
    }
  },
  
  /**
   * Fetch status changes since a specific timestamp
   * @param {number} timestamp - Timestamp in milliseconds
   * @param {string|number} userId - The user ID
   * @returns {Promise<Array>} - Status changes since timestamp
   */
  getStatusChangesSince: async (timestamp, userId) => {
    try {
      if (!timestamp || !userId) return [];
      
      const response = await apiClient.get(`/tasks/status-changes/${timestamp}?userId=${userId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Task service: Error fetching status changes:', error);
      return [];
    }
  },
  
  /**
   * Claim a request
   * @param {string|number} requestId - The request ID
   * @param {string|number} userId - The user ID
   * @returns {Promise<Object>} - Result of the claim operation
   */
  claimRequest: async (requestId, userId) => {
    try {
      if (!requestId || !userId) {
        return { error: 'Request ID and User ID are required' };
      }
      
      console.log('Task service: Claiming request:', requestId, 'by user:', userId);
      const response = await apiClient.post(`/tasks/claim/${requestId}`, { userId });
      return response.data || { success: true };
    } catch (error) {
      console.error('Task service: Error claiming request:', error);
      if (error.response) {
        return { error: error.response.data.error || 'Failed to claim request' };
      }
      return { error: error.message || 'Failed to claim request' };
    }
  },
  
  /**
   * Update request status
   * @param {string|number} requestId - The request ID
   * @param {string} status - The new status
   * @param {string|number} userId - The user ID
   * @param {Object} additionalData - Additional data for the update
   * @returns {Promise<Object>} - Result of the update operation
   */
  updateRequestStatus: async (requestId, status, userId, additionalData = {}) => {
    try {
      if (!requestId || !status || !userId) {
        return { error: 'Request ID, status, and User ID are required' };
      }
      
      console.log('Task service: Updating request status:', requestId, 'to', status);
      const response = await apiClient.put(`/tasks/status/${requestId}`, {
        status,
        userId,
        ...additionalData
      });
      return response.data || { success: true };
    } catch (error) {
      console.error('Task service: Error updating request status:', error);
      if (error.response) {
        return { error: error.response.data.error || 'Failed to update status' };
      }
      return { error: error.message || 'Failed to update status' };
    }
  },
  
  /**
   * Add a comment to a request
   * @param {string|number} requestId - The request ID
   * @param {string|number} userId - The user ID
   * @param {string} comment - The comment text
   * @param {boolean} isSendBackReason - Whether this is a send back reason
   * @returns {Promise<Object>} - Result of the comment operation
   */
  addComment: async (requestId, userId, comment, isSendBackReason = false) => {
    try {
      if (!requestId || !userId || !comment) {
        return { error: 'Request ID, User ID, and comment are required' };
      }
      
      console.log('Task service: Adding comment to request:', requestId);
      const response = await apiClient.post(`/tasks/comment/${requestId}`, {
        userId,
        comment,
        isSendBackReason
      });
      return response.data || { success: true };
    } catch (error) {
      console.error('Task service: Error adding comment:', error);
      if (error.response) {
        return { error: error.response.data.error || 'Failed to add comment' };
      }
      return { error: error.message || 'Failed to add comment' };
    }
  },
  
  /**
   * Update request data
   * @param {string|number} requestId - The request ID
   * @param {Object} data - The data to update
   * @returns {Promise<Object>} - Result of the update operation
   */
  updateRequestData: async (requestId, data) => {
    try {
      if (!requestId || !data) {
        return { error: 'Request ID and data are required' };
      }
      
      console.log('Task service: Updating request data:', requestId);
      const response = await apiClient.put(`/tasks/data/${requestId}`, data);
      return response.data || { success: true };
    } catch (error) {
      console.error('Task service: Error updating request data:', error);
      if (error.response) {
        return { error: error.response.data.error || 'Failed to update data' };
      }
      return { error: error.message || 'Failed to update data' };
    }
  },
  
  /**
   * Fetch service-specific details for a request
   * @param {string|number} requestId - The request ID
   * @param {string} serviceType - The service type
   * @returns {Promise<Object|null>} - Service details or null
   */
  getServiceDetails: async (requestId, serviceType) => {
    try {
      if (!requestId || !serviceType) {
        return null;
      }
      
      console.log('Task service: Fetching service details for request:', requestId, 'of type:', serviceType);
      
      // Use different endpoints depending on service type
      let endpoint;
      switch (serviceType) {
        case 'call_history_request':
          endpoint = `/tasks/details/call-history/${requestId}`;
          break;
        case 'momo_transaction_request':
          endpoint = `/tasks/details/momo-transaction/${requestId}`;
          break;
        case 'money_refund_request':
          endpoint = `/tasks/details/money-refund/${requestId}`;
          break;
        case 'serial_number_request':
          endpoint = `/tasks/details/serial-number/${requestId}`;
          break;
        case 'stolen_phone_check':
          endpoint = `/tasks/details/stolen-phone/${requestId}`;
          break;
        case 'unblock_call_request':
          endpoint = `/tasks/details/unblock-call/${requestId}`;
          break;
        case 'unblock_momo_request':
          endpoint = `/tasks/details/unblock-momo/${requestId}`;
          break;
        case 'backoffice_appointment':
          endpoint = `/tasks/details/backoffice-appointment/${requestId}`;
          break;
        default:
          return null;
      }
      
      const response = await apiClient.get(endpoint);
      return response.data || null;
    } catch (error) {
      console.error('Task service: Error fetching service details:', error);
      return null;
    }
  }
};

export default taskService;