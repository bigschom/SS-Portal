// src/config/api-service.js
import axios from 'axios';
import departments, { getActiveDepartments } from '../constants/departments.js';
import { ROLE_TYPES } from '../constants/roleTypes.js';

// Set base URL from environment variable
let API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  // If no explicit API URL is provided, construct it dynamically
  const isDevelopment = import.meta.env.MODE === 'development';
  
  if (isDevelopment) {
    // In development, connect to the server on localhost or the current hostname
    // The backend should be running on port 5000
    const hostname = window.location.hostname;
    API_URL = `http://${hostname}:5000/api`;
    
    console.log('Development API URL:', API_URL);
  } else {
    // In production, default to relative path
    API_URL = '/api';
  }
}

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
      // Get the user from sessionStorage to ensure we have the latest token
      const userStr = sessionStorage.getItem('user');
      let token = null;
      
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          token = userData.token;
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
      
      // Get temp user if available
      const tempUserStr = sessionStorage.getItem('tempUser');
      if (!token && tempUserStr) {
        try {
          const tempUserData = JSON.parse(tempUserStr);
          token = tempUserData.token;
        } catch (e) {
          console.error('Error parsing temp user data:', e);
        }
      }
      
      console.log('API service: Sending update password request for user ID:', userId, 'with new password length:', newPassword.length);
      
      // Add token to headers if available
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await axios.post(
        `${API_URL}/auth/update-password`, 
        { userId, newPassword },
        { headers }
      );
      
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

// Update these methods in your api-service.js file
// in the backgroundChecks object

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
      console.log('API service: Creating background check with data:', JSON.stringify(data, null, 2));
      
      // Validate required fields to prevent database errors
      const requiredFields = ['full_names', 'citizenship', 'id_passport_number', 'department_id', 'role_type'];
      const missingFields = requiredFields.filter(field => !data[field]);
      
      if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        return { error: `Missing required fields: ${missingFields.join(', ')}` };
      }
      
      // Process date fields
      const processedData = { ...data };
      const dateFields = ['submitted_date', 'passport_expiry_date', 'date_start', 'date_end', 'closed_date'];
      
      dateFields.forEach(field => {
        if (field in processedData) {
          if (!processedData[field] || processedData[field] === '') {
            processedData[field] = null;
          } else {
            try {
              const date = new Date(processedData[field]);
              if (!isNaN(date.getTime())) {
                processedData[field] = date.toISOString().split('T')[0];
              } else {
                console.warn(`Invalid date detected for ${field}:`, processedData[field]);
                processedData[field] = null;
              }
            } catch (error) {
              console.error(`Error processing date for ${field}:`, error);
              processedData[field] = null;
            }
          }
        }
      });
      
      // Ensure numeric fields are properly formatted
      if (processedData.department_id && isNaN(parseInt(processedData.department_id))) {
        return { error: 'Department ID must be a number' };
      }
      
      // Make the API call
      const response = await apiClient.post('/background-checks', processedData);
      console.log('API service: Background check creation response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API service: Error creating background check:', error);
      console.error('API service: Error response:', error.response?.data);
      
      if (error.response) {
        return { error: error.response.data.error || 'Server error' };
      }
      return { error: error.message || 'Connection error' };
    }
  },
  
  async getAllBackgroundChecks(filters = {}) {
    try {
      console.log('API service received filters:', filters);
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      // Add each filter to query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== 'all') {
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
      console.log('API service: Fetching background check with ID:', id);
      const response = await apiClient.get(`/background-checks/${id}`);
      
      // Log received date fields for debugging
      if (response.data) {
        console.log('API service: Received date fields:', {
          submitted_date: response.data.submitted_date,
          passport_expiry_date: response.data.passport_expiry_date,
          date_start: response.data.date_start,
          date_end: response.data.date_end,
          closed_date: response.data.closed_date
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('API service: Error fetching background check:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async updateBackgroundCheck(id, data) {
    try {
      console.log('API service: Updating background check with ID:', id);
      console.log('API service: Update data before processing:', data);
      
      // Process date fields to ensure they are properly formatted
      const processedData = { ...data };
      const dateFields = ['submitted_date', 'passport_expiry_date', 'date_start', 'date_end', 'closed_date'];
      
      dateFields.forEach(field => {
        if (field in processedData) {
          if (!processedData[field] || processedData[field] === '') {
            // Convert empty strings or invalid dates to null
            processedData[field] = null;
          } else if (typeof processedData[field] === 'string') {
            // Ensure date strings are in YYYY-MM-DD format for PostgreSQL
            try {
              const date = new Date(processedData[field]);
              if (!isNaN(date.getTime())) {
                processedData[field] = date.toISOString().split('T')[0];
              } else {
                console.warn(`Invalid date detected for ${field}:`, processedData[field]);
                processedData[field] = null;
              }
            } catch (error) {
              console.error(`Error processing date for ${field}:`, error);
              processedData[field] = null;
            }
          }
        }
      });
      
      console.log('API service: Processed update data:', processedData);
      
      const response = await apiClient.put(`/background-checks/${id}`, processedData);
      return response.data;
    } catch (error) {
      console.error('API service: Error updating background check:', error);
      if (error.response) {
        return { error: error.response.data.error || 'Server error' };
      }
      return { error: error.message || 'Connection error' };
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
  async getOptions() {
    try {
      console.log('Fetching stakeholder request options');
      const response = await apiClient.get('/stakeholder-requests/options');
      return response.data;
    } catch (error) {
      console.error('API Error fetching options:', error);
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
      console.error('API Error fetching requests:', error);
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
      console.error('API Error creating request:', error);
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
      console.error('API Error updating request:', error);
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