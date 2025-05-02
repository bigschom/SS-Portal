// src/services/security-service.js
import apiClient from '../config/api-client.js';

// Method to get current user ID from session storage
const getCurrentUserId = () => {
  const userStr = sessionStorage.getItem('user');
  if (userStr) {
    try {
      const userData = JSON.parse(userStr);
      return userData.id;
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
  }
  return null;
};

// Security services related endpoints
const securityService = {
  // Cache for service data
  _cache: {
    services: null,
    permissions: {},
    lastFetch: 0,
    cacheTTL: 5 * 60 * 1000 // 5 minutes cache TTL
  },
  
  async getAvailableServices() {
    try {
      // Check cache first
      const now = Date.now();
      if (this._cache.services && now - this._cache.lastFetch < this._cache.cacheTTL) {
        console.log('Returning cached security services');
        return this._cache.services;
      }
      
      console.log('Making API request for security services');
      const response = await apiClient.get('/security-services');
      
      // Update cache
      this._cache.services = response.data;
      this._cache.lastFetch = now;
      
      return response.data;
    } catch (error) {
      console.error('Error fetching services:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },

  async getUserServicePermissions(userId) {
    try {
      // Check cache first
      const now = Date.now();
      if (
        this._cache.permissions[userId] && 
        now - this._cache.permissions[userId].timestamp < this._cache.cacheTTL
      ) {
        console.log('Returning cached user permissions');
        return this._cache.permissions[userId].data;
      }
      
      console.log('Making API request for user permissions');
      const response = await apiClient.get(`/security-services/permissions/${userId}`);
      
      // Update cache
      this._cache.permissions[userId] = {
        data: response.data,
        timestamp: now
      };
      
      return response.data;
    } catch (error) {
      console.error('Error fetching permissions:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  // Method to manually invalidate cache if needed
  invalidateCache() {
    this._cache.services = null;
    this._cache.permissions = {};
    this._cache.lastFetch = 0;
  },
  
  async fetchBackofficeUsers() {
    try {
      console.log('Fetching backoffice users');
      
      const response = await apiClient.get('/security-services/backoffice-users');
      return response.data;
    } catch (error) {
      console.error('Error fetching backoffice users:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },

  async submitBackofficeAppointment(requestData, appointmentData) {
    try {
      console.log('Submitting backoffice appointment request:', { requestData, appointmentData });
      
      // Ensure userId is included
      const userId = getCurrentUserId();
      
      const payload = {
        request: requestData,
        appointments: appointmentData,
        userId: userId
      };
      
      if (!userId) {
        console.warn('No userId found for backoffice appointment request. This may cause an error.');
      }
      
      const response = await apiClient.post('/security-services/backoffice-appointments', payload);
      
      return response.data;
    } catch (error) {
      console.error('Error submitting backoffice appointment:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },

  submitCallHistoryRequest: async (requestData) => {
    try {
      console.log('Submitting call history request:', requestData);
      
      // Ensure userId is included
      if (!requestData.userId) {
        requestData.userId = getCurrentUserId();
        
        if (!requestData.userId) {
          console.warn('No userId found for call history request. This may cause an error.');
        }
      }
      
      const response = await apiClient.post('/security-services/call-history-request', requestData);
      
      return response.data;
    } catch (error) {
      console.error('Error submitting call history request:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },

  submitMomoTransactionRequest: async (requestData) => {
    try {
      console.log('Submitting MoMo transaction request:', requestData);
      
      // Ensure userId is included
      if (!requestData.userId) {
        requestData.userId = getCurrentUserId();
        
        if (!requestData.userId) {
          console.warn('No userId found for MoMo transaction request. This may cause an error.');
        }
      }
      
      const response = await apiClient.post('/security-services/momo-transaction-request', requestData);
      
      return response.data;
    } catch (error) {
      console.error('Error submitting MoMo transaction request:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },

  submitUnblockMomoRequest: async (requestData) => {
    try {
      console.log('Submitting unblock MoMo request:', requestData);
      
      // Ensure userId is included
      if (!requestData.userId) {
        requestData.userId = getCurrentUserId();
        
        if (!requestData.userId) {
          console.warn('No userId found for unblock MoMo request. This may cause an error.');
        }
      }
      
      const response = await apiClient.post('/security-services/unblock-momo-request', requestData);
      
      return response.data;
    } catch (error) {
      console.error('Error submitting unblock MoMo request:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },

  submitMoneyRefundRequest: async (requestData) => {
    try {
      console.log('Submitting money refund request:', requestData);
      
      // Ensure userId is included
      if (!requestData.userId) {
        requestData.userId = getCurrentUserId();
        
        if (!requestData.userId) {
          console.warn('No userId found for money refund request. This may cause an error.');
        }
      }
      
      const response = await apiClient.post('/security-services/money-refund-request', requestData);
      
      return response.data;
    } catch (error) {
      console.error('Error submitting money refund request:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },

  submitSerialNumberRequest: async (requestData) => {
    try {
      console.log('Submitting serial number request:', requestData);
      
      // Ensure userId is included
      if (!requestData.userId) {
        requestData.userId = getCurrentUserId();
        
        if (!requestData.userId) {
          console.warn('No userId found for serial number request. This may cause an error.');
        }
      }
      
      const response = await apiClient.post('/security-services/serial-number-request', requestData);
      
      return response.data;
    } catch (error) {
      console.error('Error submitting serial number request:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },

  submitStolenPhoneCheck: async (requestData) => {
    try {
      console.log('Submitting stolen phone check request:', requestData);
      
      // Ensure userId is included
      if (!requestData.userId) {
        requestData.userId = getCurrentUserId();
        
        if (!requestData.userId) {
          console.warn('No userId found for stolen phone check request. This may cause an error.');
        }
      }
      
      const response = await apiClient.post('/security-services/stolen-phone-check', requestData);
      
      return response.data;
    } catch (error) {
      console.error('Error submitting stolen phone check request:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },

  submitUnblockCallRequest: async (requestData) => {
    try {
      console.log('Submitting unblock call request:', requestData);
      
      // Ensure userId is included
      if (!requestData.userId) {
        requestData.userId = getCurrentUserId();
        
        if (!requestData.userId) {
          console.warn('No userId found for unblock call request. This may cause an error.');
        }
      }
      
      const response = await apiClient.post('/security-services/unblock-call-request', requestData);
      
      return response.data;
    } catch (error) {
      console.error('Error submitting unblock call request:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },

  submitOtherRequest: async (requestData) => {
    try {
      console.log('Submitting other request:', requestData);
      
      // Ensure userId is included
      if (!requestData.userId) {
        requestData.userId = getCurrentUserId();
        
        if (!requestData.userId) {
          console.warn('No userId found for other request. This may cause an error.');
        }
      }
      
      const response = await apiClient.post('/security-services/other-request', requestData);
      
      return response.data;
    } catch (error) {
      console.error('Error submitting other request:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  }
};

export default securityService;