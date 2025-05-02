// src/services/background-service.js
import apiClient from '../config/api-client.js';
import departments, { getActiveDepartments } from '../constants/departments.js';
import { ROLE_TYPES } from '../constants/roleTypes.js';

const backgroundService = {
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
      console.log('Background service: Creating background check with data:', JSON.stringify(data, null, 2));
      
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
      console.log('Background service: Background check creation response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Background service: Error creating background check:', error);
      console.error('Background service: Error response:', error.response?.data);
      
      if (error.response) {
        return { error: error.response.data.error || 'Server error' };
      }
      return { error: error.message || 'Connection error' };
    }
  },
  
  async getAllBackgroundChecks(filters = {}) {
    try {
      console.log('Background service received filters:', filters);
      
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
      console.error('Background service error:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  }, 
  
  async getBackgroundCheckById(id) {
    try {
      console.log('Background service: Fetching background check with ID:', id);
      const response = await apiClient.get(`/background-checks/${id}`);
      
      // Log received date fields for debugging
      if (response.data) {
        console.log('Background service: Received date fields:', {
          submitted_date: response.data.submitted_date,
          passport_expiry_date: response.data.passport_expiry_date,
          date_start: response.data.date_start,
          date_end: response.data.date_end,
          closed_date: response.data.closed_date
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('Background service: Error fetching background check:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  async updateBackgroundCheck(id, data) {
    try {
      console.log('Background service: Updating background check with ID:', id);
      console.log('Background service: Update data before processing:', data);
      
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
      
      console.log('Background service: Processed update data:', processedData);
      
      const response = await apiClient.put(`/background-checks/${id}`, processedData);
      return response.data;
    } catch (error) {
      console.error('Background service: Error updating background check:', error);
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

export default backgroundService;