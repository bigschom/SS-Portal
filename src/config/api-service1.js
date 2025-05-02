// src/config/api-service.js
import axios from 'axios';
import departments, { getActiveDepartments } from '../constants/departments.js';
import { ROLE_TYPES } from '../constants/roleTypes.js';
import { debounce, throttle } from '../utils/helpers.js';

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
  },

  /**
 * Delete multiple stakeholder requests at once
 * @param {Array} ids - Array of request IDs to delete
 * @param {number} userId - ID of the user performing the deletion
 * @returns {Promise<Object>} - Result of the deletion operation
 */
async deleteMultiple(ids, userId) {
  try {
    console.log('API service: Deleting multiple stakeholder requests:', ids);
    const response = await apiClient.post('/stakeholder-requests/delete-multiple', {
      ids: ids,
      deleted_by: userId
    });
    return response.data;
  } catch (error) {
    console.error('API Error deleting multiple requests:', error);
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
    console.log('API service: Deleting stakeholder request:', id);
    const response = await apiClient.delete(`/stakeholder-requests/${id}?deleted_by=${userId}`);
    return response.data;
  } catch (error) {
    console.error('API Error deleting request:', error);
    if (error.response) {
      return { error: error.response.data.error };
    }
    return { error: error.message };
  }
}
};

// Guard Shift reports API endpoints
const guardShifts = {
  async createShiftReport(data) {
    try {
      console.log('API service: Creating guard shift report with data:', data);
      
      // Process date fields
      const processedData = { ...data };
      const dateFields = ['shift_start_time', 'shift_end_time', 'incident_time'];
      
      dateFields.forEach(field => {
        if (field in processedData && processedData[field]) {
          try {
            const date = new Date(processedData[field]);
            if (!isNaN(date.getTime())) {
              processedData[field] = date.toISOString();
            }
          } catch (error) {
            console.error(`Error processing date for ${field}:`, error);
          }
        }
      });
      
      const response = await apiClient.post('/guard-shift-reports', processedData);
      console.log('API service: Create guard shift report response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API service: Create guard shift report error:', error);
      if (error.response) {
        return error.response.data;
      }
      return { error: error.message };
    }
  },
  
  async getGuardShiftReports(filters = {}) {
    try {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          queryParams.append(key, value);
        }
      });
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      const response = await apiClient.get(`/guard-shift-reports${queryString}`);
      return response.data;
    } catch (error) {
      console.error('API service: Get guard shift reports error:', error);
      if (error.response) {
        return { error: error.response.data.error, data: [], totalCount: 0 };
      }
      return { error: error.message, data: [], totalCount: 0 };
    }
  },
  
  async getGuardShiftStats(filters = {}) {
    try {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          queryParams.append(key, value);
        }
      });
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      const response = await apiClient.get(`/guard-shift-reports/stats/weekly${queryString}`);
      return response.data;
    } catch (error) {
      console.error('API service: Get guard shift stats error:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async getAllGuardShiftReports() {
    try {
      const response = await apiClient.get('/guard-shift-reports?limit=1000');
      return response.data;
    } catch (error) {
      console.error('API service: Get all guard shift reports error:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async getShiftReportById(id) {
    try {
      const response = await apiClient.get(`/guard-shift-reports/${id}`);
      return response.data;
    } catch (error) {
      console.error('API service: Get guard shift report error:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  }
};

// Guard Shift Reports API Methods
const guardShiftReports = {
  async getAllReports(filters = {}) {
    try {
      console.log('API service: Getting guard shift reports with filters:', filters);
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      // Add each filter to query params if not empty
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.shiftType) queryParams.append('shiftType', filters.shiftType);
      if (filters.hasIncident !== undefined && filters.hasIncident !== '')
        queryParams.append('hasIncident', filters.hasIncident);
      if (filters.guard) queryParams.append('guard', filters.guard);
      if (filters.location) queryParams.append('location', filters.location);
      if (filters.page) queryParams.append('page', filters.page);
      if (filters.limit) queryParams.append('limit', filters.limit);
      
      const queryString = queryParams.toString();
      const url = queryString ? `/guard-shift-reports?${queryString}` : '/guard-shift-reports';
      
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error('API service: Error fetching guard shift reports:', error);
      if (error.response) {
        return { error: error.response.data.error, data: [], count: 0 };
      }
      return { error: error.message, data: [], count: 0 };
    }
  },
  
  async getReportById(id) {
    try {
      const response = await apiClient.get(`/guard-shift-reports/${id}`);
      return response.data;
    } catch (error) {
      console.error('API service: Error fetching guard shift report by ID:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async getWeeklyStats() {
    try {
      const response = await apiClient.get('/guard-shift-reports/stats/weekly');
      return response.data;
    } catch (error) {
      console.error('API service: Error fetching weekly guard shift stats:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async createReport(reportData) {
    try {
      const response = await apiClient.post('/guard-shift-reports', reportData);
      return response.data;
    } catch (error) {
      console.error('API service: Error creating guard shift report:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async updateReport(id, reportData) {
    try {
      const response = await apiClient.put(`/guard-shift-reports/${id}`, reportData);
      return response.data;
    } catch (error) {
      console.error('API service: Error updating guard shift report:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async deleteReport(id) {
    try {
      const response = await apiClient.delete(`/guard-shift-reports/${id}`);
      return response.data;
    } catch (error) {
      console.error('API service: Error deleting guard shift report:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  }
};



// Security services related endpoints
const securityServices = {
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
  
  async submitSerialNumberRequest(requestData) {
    try {
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
  
  async submitStolenPhoneCheck(requestData) {
    try {
      const response = await apiClient.post('/security-services/stolen-phone-check', requestData);
      return response.data;
    } catch (error) {
      console.error('Error submitting stolen phone check:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async submitMomoTransactionRequest(requestData) {
    try {
      const response = await apiClient.post('/security-services/momo-transaction', requestData);
      return response.data;
    } catch (error) {
      console.error('Error submitting MoMo transaction request:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async submitMoneyRefundRequest(requestData) {
    try {
      const response = await apiClient.post('/security-services/money-refund', requestData);
      return response.data;
    } catch (error) {
      console.error('Error submitting money refund request:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async submitUnblockMomoRequest(requestData) {
    try {
      const response = await apiClient.post('/security-services/unblock-momo', requestData);
      return response.data;
    } catch (error) {
      console.error('Error submitting unblock MoMo request:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },

  async submitBackofficeAppointment(requestData, appointmentData) {
    try {
      console.log('Submitting backoffice appointment request:', { requestData, appointmentData });
      
      const response = await apiClient.post('/security-services/backoffice-appointments', {
        request: requestData,
        appointments: appointmentData
      });
      
      return response.data;
    } catch (error) {
      console.error('Error submitting backoffice appointment:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
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

  //New
  // Add to securityServices object in api-service.js
submitCallHistoryRequest: async (requestData) => {
  try {
    console.log('Submitting call history request:', requestData);
    
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

// Add to securityServices object in api-service.js
submitMomoTransactionRequest: async (requestData) => {
  try {
    console.log('Submitting MoMo transaction request:', requestData);
    
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

// Add to securityServices object in api-service.js
submitUnblockMomoRequest: async (requestData) => {
  try {
    console.log('Submitting unblock MoMo request:', requestData);
    
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

// Add to securityServices object in api-service.js
submitMoneyRefundRequest: async (requestData) => {
  try {
    console.log('Submitting money refund request:', requestData);
    
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

// Add to securityServices object in api-service.js
submitSerialNumberRequest: async (requestData) => {
  try {
    console.log('Submitting serial number request:', requestData);
    
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

// Add to securityServices object in api-service.js
submitStolenPhoneCheck: async (requestData) => {
  try {
    console.log('Submitting stolen phone check request:', requestData);
    
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

// Add to securityServices object in api-service.js
submitUnblockCallRequest: async (requestData) => {
  try {
    console.log('Submitting unblock call request:', requestData);
    
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
    
    const response = await apiClient.post('/security-services/other-request', requestData);
    
    return response.data;
  } catch (error) {
    console.error('Error submitting other request:', error);
    if (error.response) {
      return { error: error.response.data.error };
    }
    return { error: error.message };
  }
},
};

// Queue management related endpoints
const queue = {
  async getHandlers() {
    try {
      const response = await apiClient.get('/queue/handlers');
      return response.data;
    } catch (error) {
      console.error('Error fetching handlers:', error);
      return [];
    }
  },
  
  async getRequests() {
    try {
      const response = await apiClient.get('/queue/requests');
      return response.data;
    } catch (error) {
      console.error('Error fetching requests:', error);
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
      console.error('Error assigning handler:', error);
      throw error;
    }
  },
  
  async removeHandler(id) {
    try {
      const response = await apiClient.delete(`/queue/handlers/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error removing handler:', error);
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
      console.error('Error assigning request:', error);
      throw error;
    }
  },
  
  async markRequestUnableToHandle(requestId) {
    try {
      const response = await apiClient.put(`/queue/requests/${requestId}/unable-to-handle`);
      return response.data;
    } catch (error) {
      console.error('Error marking request:', error);
      throw error;
    }
  },
  
  async markRequestCompleted(requestId) {
    try {
      const response = await apiClient.put(`/queue/requests/${requestId}/complete`);
      return response.data;
    } catch (error) {
      console.error('Error completing request:', error);
      throw error;
    }
  },
  
  async markRequestInvestigating(requestId) {
    try {
      const response = await apiClient.put(`/queue/requests/${requestId}/investigate`);
      return response.data;
    } catch (error) {
      console.error('Error marking request for investigation:', error);
      throw error;
    }
  },
  
  async sendBackRequest(requestId) {
    try {
      const response = await apiClient.put(`/queue/requests/${requestId}/send-back`);
      return response.data;
    } catch (error) {
      console.error('Error sending back request:', error);
      throw error;
    }
  },

  async getHandlersByServiceType(serviceType) {
    try {
      const response = await apiClient.get(`/queue/handlers/by-service/${serviceType}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching handlers for service type ${serviceType}:`, error);
      return [];
    }
  }
};


// Notifications API Methods
const notifications = {
  getUserNotificationSettings: async (userId) => {
    try {
      const response = await apiClient.get(`/notifications/settings/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      return {
        browserEnabled: true,
        smsEnabled: false,
        emailEnabled: true
      };
    }
  },
  
  updateNotificationSettings: async (userId, settings) => {
    try {
      const response = await apiClient.put(`/notifications/settings/${userId}`, settings);
      return response.data;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      return { success: false, error: error.message };
    }
  }
  
  /* SMS service to be implemented later
  sendSmsNotification: async (phoneNumber, message) => {
    try {
      const response = await apiClient.post('/notifications/sms', {
        phoneNumber,
        message
      });
      return response.data;
    } catch (error) {
      console.error('Error sending SMS notification:', error);
      return { success: false, error: error.message };
    }
  }
  */
};



// Create a request queue manager with fixed recursion issue
const requestQueue = {
  queue: [],
  inProgress: new Map(),
  maxConcurrent: 3, // Maximum concurrent requests
  processingDelay: 300, // Delay between processing batches (ms)
  
  enqueue(key, promiseFactory) {
    return new Promise((resolve, reject) => {
      // If this exact request is already in progress, return that promise
      if (this.inProgress.has(key)) {
        return this.inProgress.get(key).then(resolve).catch(reject);
      }
      
      // Create the request promise - FIXED to prevent recursion
      const executeRequest = async () => {
        try {
          // Store the promise itself, not the function creating the promise
          const promise = promiseFactory();
          this.inProgress.set(key, promise);
          
          const result = await promise;
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        } finally {
          this.inProgress.delete(key);
          this.processQueue();
        }
      };
      
      // Add to queue if we're at max concurrent requests
      if (this.inProgress.size >= this.maxConcurrent) {
        this.queue.push({ key, execute: executeRequest, resolve, reject });
      } else {
        // Execute immediately if under the limit
        executeRequest();
      }
    });
  },
  
  processQueue() {
    if (this.queue.length === 0 || this.inProgress.size >= this.maxConcurrent) return;
    
    // Process next item in queue
    const nextItem = this.queue.shift();
    nextItem.execute();
    
    // Schedule next processing
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), this.processingDelay);
    }
  }
};

// Add a request cache to prevent duplicate requests
const requestCache = {
  cache: new Map(),
  ttl: 30000, // Default TTL: 30 seconds
  
  async get(key, promiseFactory, customTtl = null) {
    const now = Date.now();
    const cached = this.cache.get(key);
    
    // Return cached value if valid
    if (cached && now - cached.timestamp < (customTtl || this.ttl)) {
      return cached.data;
    }
    
    // Generate a cache key for the request queue
    const queueKey = `request_${key}`;
    
    // Execute request through the queue
    try {
      const data = await requestQueue.enqueue(queueKey, () => promiseFactory());
      
      // Cache the result
      this.cache.set(key, {
        data,
        timestamp: now
      });
      
      return data;
    } catch (error) {
      // If error, still cache error response but with shorter TTL
      if (error.response) {
        this.cache.set(key, {
          data: { error: error.response.data?.error || 'Request failed' },
          timestamp: now - (this.ttl - 5000) // Shorter TTL for errors
        });
      }
      throw error;
    }
  },
  
  invalidate(key) {
    this.cache.delete(key);
  },
  
  clear() {
    this.cache.clear();
  }
};


// Tasks API Methods
const tasks = {
  // Fetch available requests for a user
  getAvailableRequests: async (userId) => {
    try {
      if (!userId) return [];
      const response = await apiClient.get(`/tasks/available/${userId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching available requests:', error);
      return [];
    }
  },
  
  // Fetch assigned requests for a user
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
      console.error('Error fetching assigned requests:', error);
      return [];
    }
  },
  
  // Fetch submitted requests for a user
  getSubmittedRequests: async (userId) => {
    try {
      if (!userId) return [];
      
      const response = await apiClient.get(`/tasks/submitted/${userId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching submitted requests:', error);
      return [];
    }
  },
  
  // Fetch sent back requests for a user
  getSentBackRequests: async (userId) => {
    try {
      if (!userId) return [];
      
      const response = await apiClient.get(`/tasks/sent-back/${userId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching sent back requests:', error);
      return [];
    }
  },
  
  // Fetch new requests since a specific timestamp
  getNewRequestsSince: async (timestamp, userId) => {
    try {
      if (!timestamp || !userId) return [];
      
      const response = await apiClient.get(`/tasks/new-since/${timestamp}?userId=${userId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching new requests:', error);
      return [];
    }
  },
  
  // Fetch status changes since a specific timestamp
  getStatusChangesSince: async (timestamp, userId) => {
    try {
      if (!timestamp || !userId) return [];
      
      const response = await apiClient.get(`/tasks/status-changes/${timestamp}?userId=${userId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching status changes:', error);
      return [];
    }
  },
  
  // Claim a request
  claimRequest: async (requestId, userId) => {
    try {
      if (!requestId || !userId) {
        return { error: 'Request ID and User ID are required' };
      }
      
      console.log('Claiming request:', requestId, 'by user:', userId);
      const response = await apiClient.post(`/tasks/claim/${requestId}`, { userId });
      return response.data || { success: true };
    } catch (error) {
      console.error('Error claiming request:', error);
      if (error.response) {
        return { error: error.response.data.error || 'Failed to claim request' };
      }
      return { error: error.message || 'Failed to claim request' };
    }
  },
  
  // Update request status
  updateRequestStatus: async (requestId, status, userId, additionalData = {}) => {
    try {
      if (!requestId || !status || !userId) {
        return { error: 'Request ID, status, and User ID are required' };
      }
      
      console.log('Updating request status:', requestId, 'to', status);
      const response = await apiClient.put(`/tasks/status/${requestId}`, {
        status,
        userId,
        ...additionalData
      });
      return response.data || { success: true };
    } catch (error) {
      console.error('Error updating request status:', error);
      if (error.response) {
        return { error: error.response.data.error || 'Failed to update status' };
      }
      return { error: error.message || 'Failed to update status' };
    }
  },
  
  // Add a comment to a request
  addComment: async (requestId, userId, comment, isSendBackReason = false) => {
    try {
      if (!requestId || !userId || !comment) {
        return { error: 'Request ID, User ID, and comment are required' };
      }
      
      console.log('Adding comment to request:', requestId);
      const response = await apiClient.post(`/tasks/comment/${requestId}`, {
        userId,
        comment,
        isSendBackReason
      });
      return response.data || { success: true };
    } catch (error) {
      console.error('Error adding comment:', error);
      if (error.response) {
        return { error: error.response.data.error || 'Failed to add comment' };
      }
      return { error: error.message || 'Failed to add comment' };
    }
  },
  
  // Update request data
  updateRequestData: async (requestId, data) => {
    try {
      if (!requestId || !data) {
        return { error: 'Request ID and data are required' };
      }
      
      console.log('Updating request data:', requestId);
      const response = await apiClient.put(`/tasks/data/${requestId}`, data);
      return response.data || { success: true };
    } catch (error) {
      console.error('Error updating request data:', error);
      if (error.response) {
        return { error: error.response.data.error || 'Failed to update data' };
      }
      return { error: error.message || 'Failed to update data' };
    }
  },
  
  // Fetch service-specific details for a request
  getServiceDetails: async (requestId, serviceType) => {
    try {
      if (!requestId || !serviceType) {
        return null;
      }
      
      console.log('Fetching service details for request:', requestId, 'of type:', serviceType);
      
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
      console.error('Error fetching service details:', error);
      return null;
    }
  }
};



export default {
  auth,
  users,
  backgroundChecks,
  activityLog,
  stakeholderRequests,
  guardShifts,
  guardShiftReports,
  securityServices,
  queue,
  notifications,
  tasks,
  apiClient
};