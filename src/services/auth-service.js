// src/services/auth-service.js
import apiClient from '../config/api-client.js';

const authService = {
  async login(username, password) {
    try {
      console.log('Auth service: Sending login request for user:', username);
      const response = await apiClient.post('/auth/login', { username, password });
      console.log('Auth service: Login response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Auth service: Login error:', error);
      if (error.response) {
        return error.response.data;
      }
      return { error: error.message };
    }
  },
 
  async updateTempPassword(userId, newPassword) {
    try {
      const response = await apiClient.post('/auth/update-temp-password', {
        userId,
        newPassword
      });
     
      console.log('Auth service: Update temp password response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Auth service: Update temp password error:', error);
      if (error.response) {
        return error.response.data;
      }
      return { error: error.message };
    }
  },
 
  async unlockAccount(userId) {
    try {
      const response = await apiClient.post('/auth/unlock-account', { userId });
      return response.data;
    } catch (error) {
      if (error.response) {
        return error.response.data;
      }
      return { error: error.message };
    }
  },
 
  async checkSession() {
    try {
      const response = await apiClient.get('/auth/check-session');
      return { valid: response.data.valid };
    } catch (error) {
      return { valid: false };
    }
  },
 
  async trackActivity() {
    try {
      const response = await apiClient.post('/auth/track-activity');
      return response.data;
    } catch (error) {
      console.error('Error tracking activity:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  async getCurrentActivity() {
    try {
      const response = await apiClient.get('/auth/current-activity');
      return response.data;
    } catch (error) {
      console.error('Error fetching current activity:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  async verifyPasswordStrength(password) {
    try {
      const response = await apiClient.post('/auth/password-strength', { password });
      return response.data;
    } catch (error) {
      console.error('Error checking password strength:', error);
      return {
        isStrong: false,
        error: error.message
      };
    }
  },
  
  async checkPasswordHistory(userId, newPassword) {
    try {
      // Get the token from the user in session storage or from the temp user
      const tempUser = JSON.parse(sessionStorage.getItem('tempUser'));
      const token = tempUser?.token;
      
      // Set the Authorization header with the token
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const response = await apiClient.post('/auth/verify-password-history', {
        userId,
        newPassword
      });
      
      return {
        isRepeatedPassword: !response.data.isUnique,
        ...response.data
      };
    } catch (error) {
      console.error('Auth service: Check password history error:', error);
      return { error: error.message, isRepeatedPassword: false };
    }
  },
  
  async updatePassword(userId, newPassword, currentPassword = null) {
    try {
      // Get the token from the temp user in session storage
      const tempUser = JSON.parse(sessionStorage.getItem('tempUser'));
      const token = tempUser?.token;
      
      // Set the Authorization header with the token
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Create payload with required fields
      const payload = {
        userId,
        newPassword
      };
      
      // Add current password if provided
      if (currentPassword) {
        payload.currentPassword = currentPassword;
      }
      
      const response = await apiClient.post('/auth/update-password', payload);
      
      console.log('Auth service: Update password response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Auth service: Update password error:', error);
      if (error.response) {
        return error.response.data;
      }
      return { error: error.message };
    }
  }
};

export default authService;