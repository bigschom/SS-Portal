// src/services/queue-service.js
import apiClient from '../config/api-client.js';

// Queue management related endpoints
const queueService = {
  async getHandlers() {
    try {
      const response = await apiClient.get('/queue/handlers');
      return response.data;
    } catch (error) {
      console.error('Queue service: Error fetching handlers:', error);
      return [];
    }
  },
  
  async getRequests() {
    try {
      const response = await apiClient.get('/queue/requests');
      return response.data;
    } catch (error) {
      console.error('Queue service: Error fetching requests:', error);
      return [];
    }
  },
  
  async assignHandler(serviceType, userId) {
    try {
      const response = await apiClient.post('/queue/handlers', {
        service_type: serviceType,
        user_id: userId
      });
      return response.data;
    } catch (error) {
      console.error('Queue service: Error assigning handler:', error);
      throw error;
    }
  },
  
  async removeHandler(id) {
    try {
      const response = await apiClient.delete(`/queue/handlers/${id}`);
      return response.data;
    } catch (error) {
      console.error('Queue service: Error removing handler:', error);
      throw error;
    }
  },
  
  async assignRequestToHandler(requestId, userId) {
    try {
      const response = await apiClient.put(`/queue/requests/${requestId}/assign`, {
        user_id: userId
      });
      return response.data;
    } catch (error) {
      console.error('Queue service: Error assigning request:', error);
      throw error;
    }
  },
  
  async markRequestUnableToHandle(requestId) {
    try {
      const response = await apiClient.put(`/queue/requests/${requestId}/unable-to-handle`);
      return response.data;
    } catch (error) {
      console.error('Queue service: Error marking request:', error);
      throw error;
    }
  },
  
  async markRequestCompleted(requestId) {
    try {
      const response = await apiClient.put(`/queue/requests/${requestId}/complete`);
      return response.data;
    } catch (error) {
      console.error('Queue service: Error completing request:', error);
      throw error;
    }
  },
  
  async markRequestInvestigating(requestId) {
    try {
      const response = await apiClient.put(`/queue/requests/${requestId}/investigate`);
      return response.data;
    } catch (error) {
      console.error('Queue service: Error marking request for investigation:', error);
      throw error;
    }
  },
  
  async sendBackRequest(requestId) {
    try {
      const response = await apiClient.put(`/queue/requests/${requestId}/send-back`);
      return response.data;
    } catch (error) {
      console.error('Queue service: Error sending back request:', error);
      throw error;
    }
  },

  async getHandlersByServiceType(serviceType) {
    try {
      const response = await apiClient.get(`/queue/handlers/by-service/${serviceType}`);
      return response.data;
    } catch (error) {
      console.error(`Queue service: Error fetching handlers for service type ${serviceType}:`, error);
      return [];
    }
  }
};

export default queueService;