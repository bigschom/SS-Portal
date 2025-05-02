// src/services/guard-service.js
import apiClient from '../config/api-client.js';

// Guard Shift reports API endpoints
const guardService = {
  async createShiftReport(data) {
    try {
      console.log('Guard service: Creating guard shift report with data:', data);
      
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
      console.log('Guard service: Create guard shift report response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Guard service: Create guard shift report error:', error);
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
      console.error('Guard service: Get guard shift reports error:', error);
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
      console.error('Guard service: Get guard shift stats error:', error);
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
      console.error('Guard service: Get all guard shift reports error:', error);
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
      console.error('Guard service: Get guard shift report error:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  },
  
  // Enhanced Guard Shift Reports API Methods - renamed for compatibility
  async getAllReports(filters = {}) {
    try {
      console.log('Guard service: Getting guard shift reports with filters:', filters);
      
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
      console.error('Guard service: Error fetching guard shift reports:', error);
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
      console.error('Guard service: Error fetching guard shift report by ID:', error);
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
      console.error('Guard service: Error fetching weekly guard shift stats:', error);
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
      console.error('Guard service: Error creating guard shift report:', error);
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
      console.error('Guard service: Error updating guard shift report:', error);
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
      console.error('Guard service: Error deleting guard shift report:', error);
      if (error.response) {
        return { error: error.response.data.error };
      }
      return { error: error.message };
    }
  }
};

export default guardService;