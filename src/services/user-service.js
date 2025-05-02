// src/services/user-service.js
import apiClient from '../config/api-client.js';

// User related endpoints
const userService = {
  async getAllActiveUsers() {
    try {
      const response = await apiClient.get('/users/active');
      return response.data;
    } catch (error) {
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },

  async getAllUsers() {
    try {
      const response = await apiClient.get('/users');
      return response.data;
    } catch (error) {
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async getUserById(id) {
    try {
      const response = await apiClient.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async createUser(userData) {
    try {
      console.log('User service: Creating user with data:', userData);
      const response = await apiClient.post('/users', userData);
      console.log('User service: Create user response:', response.data);
      return response.data;
    } catch (error) {
      console.error('User service: Create user error:', error);
      if (error.response) {
        return error.response.data;
      }
      return { error: error.message };
    }
  },
  
  async updateUser(id, userData) {
    try {
      const response = await apiClient.put(`/users/${id}`, userData);
      return response.data;
    } catch (error) {
      if (error.response) {
        return error.response.data;
      }
      return { error: error.message };
    }
  },
  
  async resetPassword(id, data) {
    try {
      console.log('User service: Resetting password for user ID:', id, 'with data:', data);
      const response = await apiClient.post(`/users/${id}/reset-password`, data);
      console.log('User service: Reset password response:', response.data);
      return response.data;
    } catch (error) {
      console.error('User service: Reset password error:', error);
      if (error.response) {
        return error.response.data;
      }
      return { error: error.message };
    }
  },

  async updateTempPassword(userId, newPassword) {
    try {
      console.log('User service: Sending update temp password request for user ID:', userId, 'with new password length:', newPassword.length);
      const response = await apiClient.post('/auth/update-temp-password', { userId, newPassword });
      console.log('User service: Update temp password response:', response.data);
      return response.data;
    } catch (error) {
      console.error('User service: Update temp password error:', error);
      if (error.response) {
        return error.response.data;
      }
      return { error: error.message };
    }
  },
  
  async deleteUser(id) {
    try {
      const response = await apiClient.delete(`/users/${id}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        return error.response.data;
      }
      return { error: error.message };
    }
  },

  async checkUsernameAvailability(username) {
    try {
      const result = await apiClient.get(`/users/check-username/${username}`);
      return result.data;
    } catch (error) {
      return { available: false };
    }
  }
};

export default userService;