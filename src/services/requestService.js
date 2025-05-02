// src/services/requestService.js
import axios from 'axios';
import { toast } from 'react-toastify';

// Create API instance with base configuration
// Using window.ENV or import.meta.env for browser-compatible environment variables
const API_URL = window.ENV?.API_URL || import.meta.env?.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Error handling interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
    toast.error(message);
    return Promise.reject(error);
  }
);

export class RequestService {
  // Create a new service request
  static async createRequest(data, userId) {
    try {
      const reference = this.generateReference();
      
      const response = await api.post('/requests', {
        ...data,
        reference,
        created_by: userId,
        status: 'pending'
      });

      // Create history record
      await this.addHistory(response.data.id, userId, 'created', 'Request created');

      return { data: response.data, error: null };
    } catch (error) {
      console.error('Error creating request:', error);
      return { data: null, error };
    }
  }

  // Update a service request
  static async updateRequest(id, updates, userId) {
    try {
      const response = await api.put(`/requests/${id}`, updates);

      // Add history record
      await this.addHistory(id, userId, 'updated', 'Request updated');

      return { data: response.data, error: null };
    } catch (error) {
      console.error('Error updating request:', error);
      return { data: null, error };
    }
  }

  // Add a comment to a request
  static async addComment(requestId, userId, comment, isInternal = false) {
    try {
      const response = await api.post(`/requests/${requestId}/comments`, {
        user_id: userId,
        comment,
        is_internal: isInternal
      });

      return { data: response.data, error: null };
    } catch (error) {
      console.error('Error adding comment:', error);
      return { data: null, error };
    }
  }

  // Add an attachment to a request
  static async addAttachment(requestId, userId, file) {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      formData.append('requestId', requestId);

      const response = await api.post(`/requests/${requestId}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return { data: response.data, error: null };
    } catch (error) {
      console.error('Error adding attachment:', error);
      return { data: null, error };
    }
  }

  // Add a history record
  static async addHistory(requestId, userId, action, details) {
    try {
      const response = await api.post(`/requests/${requestId}/history`, {
        performed_by: userId,
        action,
        details
      });

      return { data: response.data, error: null };
    } catch (error) {
      console.error('Error adding history:', error);
      return { data: null, error };
    }
  }

  // Get request details with related data
  static async getRequest(id) {
    try {
      const response = await api.get(`/requests/${id}`);
      return { data: response.data, error: null };
    } catch (error) {
      console.error('Error getting request:', error);
      return { data: null, error };
    }
  }

  // Generate a unique reference number
  static generateReference() {
    const prefix = 'REQ';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // Get requests for a user
  static async getUserRequests(userId, { status, page = 1, limit = 10 } = {}) {
    try {
      const params = {
        created_by: userId,
        page,
        limit
      };

      if (status) {
        params.status = status;
      }

      const response = await api.get('/requests/user', { params });

      return { 
        data: response.data.requests, 
        count: response.data.count, 
        error: null 
      };
    } catch (error) {
      console.error('Error getting user requests:', error);
      return { data: null, count: 0, error };
    }
  }

  // Get assigned requests
  static async getAssignedRequests(userId, { status, page = 1, limit = 10 } = {}) {
    try {
      const params = {
        assigned_to: userId,
        page,
        limit
      };

      if (status) {
        params.status = status;
      }

      const response = await api.get('/requests/assigned', { params });

      return { 
        data: response.data.requests, 
        count: response.data.count, 
        error: null 
      };
    } catch (error) {
      console.error('Error getting assigned requests:', error);
      return { data: null, count: 0, error };
    }
  }

  // Get all requests (for admin)
  static async getAllRequests({ status, page = 1, limit = 10 } = {}) {
    try {
      const params = {
        page,
        limit
      };

      if (status) {
        params.status = status;
      }

      const response = await api.get('/requests', { params });

      return { 
        data: response.data.requests, 
        count: response.data.count, 
        error: null 
      };
    } catch (error) {
      console.error('Error getting all requests:', error);
      return { data: null, count: 0, error };
    }
  }

  // Claim a request (assign to current user)
  static async claimRequest(requestId, userId) {
    try {
      const response = await api.post(`/requests/${requestId}/claim`, {
        user_id: userId
      });

      // Add history record
      await this.addHistory(requestId, userId, 'assigned', 'Request claimed');

      return { data: response.data, error: null };
    } catch (error) {
      console.error('Error claiming request:', error);
      return { data: null, error };
    }
  }

  // Update request status
  static async updateStatus(requestId, status, userId, details = '') {
    try {
      const response = await api.patch(`/requests/${requestId}/status`, {
        status,
        updated_by: userId
      });

      // Add history record
      await this.addHistory(
        requestId, 
        userId, 
        'status_updated', 
        `Status changed to ${status}${details ? ': ' + details : ''}`
      );

      return { data: response.data, error: null };
    } catch (error) {
      console.error('Error updating status:', error);
      return { data: null, error };
    }
  }

  // Send back request to requestor
  static async sendBackToRequestor(requestId, userId, reason) {
    try {
      // Add comment with reason
      await this.addComment(requestId, userId, `SEND BACK REASON: ${reason}`, true);
      
      // Update status to sent back
      const response = await api.patch(`/requests/${requestId}/status`, {
        status: 'sent_back',
        updated_by: userId,
        assigned_to: null
      });

      // Add history record
      await this.addHistory(
        requestId, 
        userId, 
        'sent_back', 
        `Request sent back to requestor: ${reason}`
      );

      return { data: response.data, error: null };
    } catch (error) {
      console.error('Error sending back request:', error);
      return { data: null, error };
    }
  }
}

// Additional utility functions
export const getStatusBadgeColor = (status) => {
  const colors = {
    pending: 'yellow',
    assigned: 'blue',
    in_progress: 'indigo',
    completed: 'green',
    rejected: 'red',
    sent_back: 'amber'
  };
  return colors[status] || 'gray';
};

export const formatRequestReference = (reference) => {
  return reference.replace(/^REQ-/, '').replace(/-/g, ' ');
};

// Also export as a named constant for compatibility
export const requestService = RequestService;