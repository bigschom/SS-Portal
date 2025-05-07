// src/services/internship-service.js
import apiClient from '../config/api-client.js';
import { getActiveDepartments } from '../constants/departments.js';

class InternshipService {
  // Get all internships with optional filtering
  async getAllInternships(filters = {}) {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      // Handle status filter (default to 'all' if not specified)
      if (filters.status) {
        queryParams.append('status', filters.status.toLowerCase());
      } else {
        queryParams.append('status', 'all');
      }
      
      // Add date filters if provided
      if (filters.startDate) {
        queryParams.append('startDate', filters.startDate);
      }
      
      if (filters.endDate) {
        queryParams.append('endDate', filters.endDate);
      }
      
      // Add department filter if provided and not 'all'
      if (filters.department && filters.department !== 'all') {
        queryParams.append('department', filters.department);
      }
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const url = `/internships${queryString}`;
      
    
      
      const response = await apiClient.get(url);

      
      // Ensure we return an array of internships
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && typeof response.data === 'object') {
        // Handle various possible response formats
        if (response.data.data && Array.isArray(response.data.data)) {
          return response.data.data;
        } else if (response.data.rows && Array.isArray(response.data.rows)) {
          return response.data.rows;
        } else if (response.data.internships && Array.isArray(response.data.internships)) {
          return response.data.internships;
        } else {
          // Try to extract any array from response
          const possibleArrays = Object.values(response.data)
            .filter(val => Array.isArray(val));
          
          if (possibleArrays.length > 0) {
            // Return the longest array found
            return possibleArrays.reduce((a, b) => a.length > b.length ? a : b, []);
          }
        }
      }
      
      // If we can't extract meaningful data, return empty array
      return [];
    } catch (error) {

      return { error: error.response?.data?.error || error.message };
    }
  }

  // Create a new internship
  async createInternship(internshipData) {
    try {
      // Format dates properly for the API
      const formatDate = (dateString) => {
        if (!dateString) return null;
        try {
          return new Date(dateString).toISOString().split('T')[0];
        } catch (e) {
    
          return null;
        }
      };
      
      // Process the data
      const processedData = { ...internshipData };
      
      // Ensure status is 'Active' unless specified
      if (!processedData.status) {
        processedData.status = 'Active';
      }
      
      // Format date fields
      const dateFields = ['date_start', 'date_end', 'passport_expiry_date'];
      dateFields.forEach(field => {
        if (field in processedData) {
          processedData[field] = formatDate(processedData[field]);
        }
      });
      
      // Ensure department_id is numeric
      if (processedData.department_id && typeof processedData.department_id === 'string') {
        processedData.department_id = parseInt(processedData.department_id, 10);
      }
      
      const response = await apiClient.post('/internships', processedData);
      return response.data;
    } catch (error) {

      return { error: error.response?.data?.error || error.message };
    }
  }

  // Get internship by ID
  async getInternshipById(id) {
    try {
      if (!id) throw new Error('Internship ID is required');
      
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) throw new Error('Invalid ID format');
      
      const response = await apiClient.get(`/internships/${numericId}`);
      return response.data;
    } catch (error) {

      return { error: error.response?.data?.error || error.message };
    }
  }

  // Update an existing internship
  async updateInternship(id, internshipData) {
    try {
      if (!id) throw new Error('Internship ID is required');
      
      // Format dates properly for the API
      const formatDate = (dateString) => {
        if (!dateString) return null;
        try {
          return new Date(dateString).toISOString().split('T')[0];
        } catch (e) {
   
          return null;
        }
      };
      
      // Process the data
      const processedData = { ...internshipData };
      
      // Format date fields
      const dateFields = ['date_start', 'date_end', 'passport_expiry_date'];
      dateFields.forEach(field => {
        if (field in processedData) {
          processedData[field] = formatDate(processedData[field]);
        }
      });
      
      // Ensure department_id is numeric
      if (processedData.department_id && typeof processedData.department_id === 'string') {
        processedData.department_id = parseInt(processedData.department_id, 10);
      }
      
      // Calculate status based on end date if not provided
      if (!processedData.status && processedData.date_end) {
        const endDate = new Date(processedData.date_end);
        const currentDate = new Date();
        processedData.status = endDate >= currentDate ? 'Active' : 'Expired';
      }
      
      const response = await apiClient.put(`/internships/${id}`, processedData);
      return response.data;
    } catch (error) {

      return { error: error.response?.data?.error || error.message };
    }
  }

  // Delete an internship
  async deleteInternship(id) {
    try {
      if (!id) throw new Error('Internship ID is required');
      
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) throw new Error('Invalid ID format');
      
      const response = await apiClient.delete(`/internships/${numericId}`);
      return response.data;
    } catch (error) {

      return { error: error.response?.data?.error || error.message };
    }
  }

  // Check for duplicate ID
  async checkDuplicateId(idNumber) {
    try {
      if (!idNumber) return { exists: false };
      
      const encodedId = encodeURIComponent(idNumber.trim());
      // Try the standard endpoint first
      try {
        const response = await apiClient.get(`/internships/check-duplicate-id?idNumber=${encodedId}`);
        return response.data;
      } catch (error) {
        // If endpoint not found, try alternative endpoint
        try {
          const response = await apiClient.get(`/check-duplicate-id?idNumber=${encodedId}`);
          return response.data;
        } catch (altError) {
          // Manual check as last resort
     
          const allInternships = await this.getAllInternships();
          if (Array.isArray(allInternships)) {
            const exists = allInternships.some(
              intern => intern.id_passport_number === idNumber.trim()
            );
            return { exists };
          }
          return { exists: false };
        }
      }
    } catch (error) {

      return { error: error.response?.data?.error || error.message, exists: false };
    }
  }

  // Get citizenship options - fallback to manual extraction if API fails
  async getCitizenshipOptions() {
    try {
      // First try the dedicated endpoint
      try {
        const response = await apiClient.get('/internships/citizenship-options');
        return response.data;
      } catch (endpointError) {
  
      }
      
      // Fallback: extract from existing internships
      const allInternships = await this.getAllInternships({ status: 'all' });
      
      if (Array.isArray(allInternships)) {
        const uniqueOptions = [...new Set(
          allInternships
            .map(item => item.citizenship)
            .filter(citizenship => citizenship && citizenship.trim() !== '')
        )].sort();
        
        return uniqueOptions;
      }
      
      return [];
    } catch (error) {

      return [];
    }
  }

  // Get supervisor options (from work_with field)
  async getSupervisors() {
    try {
      // First try the dedicated endpoint
      try {
        const response = await apiClient.get('/internships/supervisors');
        return response.data;
      } catch (endpointError) {

      }
      
      // Fallback: extract from existing internships
      const allInternships = await this.getAllInternships({ status: 'all' });
      
      if (Array.isArray(allInternships)) {
        const uniqueSupervisors = [...new Set(
          allInternships
            .map(item => item.work_with)
            .filter(supervisor => supervisor && supervisor.trim() !== '')
        )].sort();
        
        return uniqueSupervisors;
      }
      
      return [];
    } catch (error) {

      return [];
    }
  }

  // Get internship statistics
  async getInternshipStatistics() {
    try {
      // Try the dedicated endpoint
      try {
        const response = await apiClient.get('/internships/statistics');
        return response.data;
      } catch (endpointError) {
 
      }
      
      // Manual calculation as fallback
      const allInternships = await this.getAllInternships({ status: 'all' });
      
      if (!Array.isArray(allInternships)) {
        return { 
          statistics: { active_count: 0, expired_count: 0, total_count: 0, active_departments: 0 },
          departments: [] 
        };
      }
      
      const currentDate = new Date();
      
      // Count active and expired
      const active = allInternships.filter(intern => 
        new Date(intern.date_end) >= currentDate
      );
      
      const expired = allInternships.filter(intern => 
        new Date(intern.date_end) < currentDate
      );
      
      // Count unique departments
      const activeDepartments = [...new Set(
        active.map(intern => intern.department_id)
      )];
      
      // Department distribution
      const departmentCounts = active.reduce((counts, intern) => {
        const deptName = intern.department_name || 'Unknown';
        counts[deptName] = (counts[deptName] || 0) + 1;
        return counts;
      }, {});
      
      const departments = Object.entries(departmentCounts).map(([name, count]) => ({
        department_name: name,
        count
      })).sort((a, b) => b.count - a.count);
      
      return {
        statistics: {
          active_count: active.length,
          expired_count: expired.length,
          total_count: allInternships.length,
          active_departments: activeDepartments.length
        },
        departments
      };
    } catch (error) {

      return { 
        error: error.response?.data?.error || error.message,
        statistics: { active_count: 0, expired_count: 0, total_count: 0, active_departments: 0 },
        departments: []
      };
    }
  }

  // Fetch departments (using the imported constant instead of API call)
  getDepartments() {
    try {
      return getActiveDepartments();
    } catch (error) {

      return [];
    }
  }
}

export default new InternshipService();