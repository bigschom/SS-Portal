// src/config/api-service.js
import axios from 'axios';
import departments, { getActiveDepartments } from '../constants/departments.js';
import { ROLE_TYPES } from '../constants/roleTypes.js';

// Set base URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance with common configuration
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Important for cookie-based auth
});

// Add auth token if available
apiClient.interceptors.request.use(config => {
  // Try sessionStorage first since that's where we're storing the user now
  const user = sessionStorage.getItem('user');
  
  if (user) {
    try {
      const parsedUser = JSON.parse(user);
      if (parsedUser && parsedUser.token) {
        config.headers.Authorization = `Bearer ${parsedUser.token}`;
      }
    } catch (error) {
      console.error('Error parsing user from sessionStorage:', error);
    }
  }
  return config;
});

// Add response interceptor to handle token expiration
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Check if error is due to token expiration (401 Unauthorized or 403 Forbidden)
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.log('Token expired or unauthorized, redirecting to login');
      // Clear user data
      sessionStorage.removeItem('user');
      // Set flag for auto logout
      sessionStorage.setItem('userLoggedOut', 'true');
      
      // Show toast if available
      if (window.toastService) {
        window.toastService.error('Your session has expired. Please log in again.');
      }
      
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication related endpoints
const auth = {
  async login(username, password) {
    try {
      console.log('API service: Sending login request for user:', username);
      const response = await apiClient.post('/auth/login', { username, password });
      console.log('API service: Login response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API service: Login error:', error);
      if (error.response) {
        return error.response.data;
      }
      return { error: error.message };
    }
  },

  async updatePassword(userId, newPassword) {
    try {
      console.log('API service: Sending update password request for user ID:', userId, 'with new password length:', newPassword.length);
      const response = await apiClient.post('/auth/update-password', { userId, newPassword });
      console.log('API service: Update password response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API service: Update password error:', error);
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
  
  // Add a function to track user activity
  async trackActivity() {
    try {
      await apiClient.post('/auth/track-activity');
      return { success: true };
    } catch (error) {
      console.error('Error tracking activity:', error);
      return { success: false };
    }
  }
};

// User related endpoints
const users = {
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
      console.log('API service: Creating user with data:', userData);
      const response = await apiClient.post('/users', userData);
      console.log('API service: Create user response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API service: Create user error:', error);
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
      console.log('API service: Resetting password for user ID:', id, 'with data:', data);
      const response = await apiClient.post(`/users/${id}/reset-password`, data);
      console.log('API service: Reset password response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API service: Reset password error:', error);
      if (error.response) {
        return error.response.data;
      }
      return { error: error.message };
    }
  },

  async updateTempPassword(userId, newPassword) {
    try {
      console.log('API service: Sending update temp password request for user ID:', userId, 'with new password length:', newPassword.length);
      const response = await apiClient.post('/auth/update-temp-password', { userId, newPassword });
      console.log('API service: Update temp password response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API service: Update temp password error:', error);
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
  }
};

// Background checks related endpoints
const backgroundChecks = {
  getDepartments() {
    // Use the getActiveDepartments helper function from the departments module
    return getActiveDepartments();
  },
  
  getRoleTypes() {
    // Use the ROLE_TYPES from the constants file
    return ROLE_TYPES;
  },
  
  async checkDuplicateId(idNumber) {
    try {
      const response = await apiClient.get(`/background-checks/check-id/${idNumber}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async createBackgroundCheck(data) {
    try {
      const response = await apiClient.post('/background-checks', data);
      return response.data;
    } catch (error) {
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async getAllBackgroundChecks(filters = {}) {
    try {
      console.log('API service received filters:', filters);
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      // Add each filter to query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          queryParams.append(key, value);
        }
      });
      
      const queryString = queryParams.toString();
      const url = queryString ? `/background-checks?${queryString}` : '/background-checks';
      
      console.log('Making API request to:', url);
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error('API service error:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  }, 
  
  async getBackgroundCheckById(id) {
    try {
      const response = await apiClient.get(`/background-checks/${id}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async updateBackgroundCheck(id, data) {
    try {
      const response = await apiClient.put(`/background-checks/${id}`, data);
      return response.data;
    } catch (error) {
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async searchByIdPassport(idOrPassport) {
    try {
      // Make sure idOrPassport is treated as a string
      const searchQuery = String(idOrPassport).trim();
      const response = await apiClient.get(`/background-checks/search-by-id?query=${encodeURIComponent(searchQuery)}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async getInternships(filters = {}) {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await apiClient.get(`/background-checks/internships${queryString}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async deleteBackgroundCheck(id) {
    try {
      const response = await apiClient.delete(`/background-checks/${id}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async getRequesters() {
    try {
      const response = await apiClient.get('/background-checks/requesters');
      return response.data;
    } catch (error) {
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async getCitizenships() {
    try {
      const response = await apiClient.get('/background-checks/citizenships');
      return response.data;
    } catch (error) {
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  }
};

// Activity logging
const activityLog = {
  async logActivity(activityData) {
    try {
      const response = await apiClient.post('/activity-log', activityData);
      return response.data;
    } catch (error) {
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  }
};

// Stakeholder requests related endpoints
const stakeholderRequests = {
  async getRequestById(id) {
    try {
      // First try to get all requests
      const allRequests = await this.getAllRequests();
      
      if (allRequests.error) {
        return { error: allRequests.error };
      }
      
      // Find the request with the matching ID
      const request = allRequests.find(req => req.id === parseInt(id));
      
      if (!request) {
        return { error: 'Request not found' };
      }
      
      return request;
    } catch (error) {
      console.error('Error fetching request by ID:', error);
      return { error: error.message };
    }
  },

  async getAllRequests() {
    try {
      const response = await apiClient.get('/stakeholder-requests');
      return response.data;
    } catch (error) {
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async getOptions() {
    try {
      const response = await apiClient.get('/stakeholder-requests/options');
      return response.data;
    } catch (error) {
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async createRequest(data) {
    try {
      const response = await apiClient.post('/stakeholder-requests', data);
      return response.data;
    } catch (error) {
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async updateRequest(id, data) {
    try {
      const response = await apiClient.put(`/stakeholder-requests/${id}`, data);
      return response.data;
    } catch (error) {
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  }
};

export default {
  auth,
  users,
  backgroundChecks,
  activityLog,
  stakeholderRequests
};