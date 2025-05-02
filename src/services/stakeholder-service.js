// src/services/stakeholder-service.js
import apiClient from '../config/api-client.js';

// Stakeholder requests related endpoints
const stakeholderService = {
  async getOptions() {
    try {
      console.log('Fetching stakeholder request options');
      const response = await apiClient.get('/stakeholder-requests/options');
      return response.data;
    } catch (error) {
      console.error('Stakeholder service: Error fetching options:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async getAllRequests(filters = {}) {
    try {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== 'all') {
          queryParams.append(key, value);
        }
      });
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      const response = await apiClient.get(`/stakeholder-requests${queryString}`);
      return response.data;
    } catch (error) {
      console.error('Stakeholder service: Error fetching requests:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async createRequest(requestData) {
    try {
      const response = await apiClient.post('/stakeholder-requests', requestData);
      return response.data;
    } catch (error) {
      console.error('Stakeholder service: Error creating request:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async updateRequest(id, requestData) {
    try {
      const response = await apiClient.put(`/stakeholder-requests/${id}`, requestData);
      return response.data;
    } catch (error) {
      console.error('Stakeholder service: Error updating request:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },

  /**
   * Delete multiple stakeholder requests at once
   * @param {Array} ids - Array of request IDs to delete
   * @param {number} userId - ID of the user performing the deletion
   * @returns {Promise<Object>} - Result of the deletion operation
   */
  async deleteMultiple(ids, userId) {
    try {
      console.log('Stakeholder service: Deleting multiple stakeholder requests:', ids);
      const response = await apiClient.post('/stakeholder-requests/delete-multiple', {
        ids: ids,
        deleted_by: userId
      });
      return response.data;
    } catch (error) {
      console.error('Stakeholder service: Error deleting multiple requests:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },

  /**
   * Delete a single stakeholder request
   * @param {number} id - ID of the request to delete
   * @param {number} userId - ID of the user performing the deletion
   * @returns {Promise<Object>} - Result of the deletion operation
   */
  async deleteRequest(id, userId) {
    try {
      console.log('Stakeholder service: Deleting stakeholder request:', id);
      const response = await apiClient.delete(`/stakeholder-requests/${id}?deleted_by=${userId}`);
      return response.data;
    } catch (error) {
      console.error('Stakeholder service: Error deleting request:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  }
};

export default stakeholderService;