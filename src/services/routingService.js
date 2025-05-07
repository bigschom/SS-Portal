// src/services/routingService.js
import apiClient from '../config/api-service';

/**
 * Service for managing queue routing rules
 */
const routingService = {
  /**
   * Fetch all queue routing rules
   * @returns {Promise<Array>} Array of routing rules
   */
  getRoutingRules: async () => {
    try {
      const response = await apiClient.get('/security-services/routing-rules');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching routing rules:', error);
      throw error;
    }
  },

  /**
   * Get routing rule for a specific service type
   * @param {string} serviceType - The service type
   * @returns {Promise<Object>} The routing rule
   */
  getRoutingRuleByServiceType: async (serviceType) => {
    try {
      const response = await apiClient.get(`/security-services/routing-rules/${serviceType}`);
      return response.data || null;
    } catch (error) {
      console.error(`Error fetching routing rule for ${serviceType}:`, error);
      throw error;
    }
  },

  /**
   * Create or update a routing rule
   * @param {Object} rule - The routing rule to save
   * @returns {Promise<Object>} The saved routing rule
   */
  saveRoutingRule: async (rule) => {
    try {
      if (!rule.service_type) {
        throw new Error('Service type is required');
      }

      const response = await apiClient.post('/security-services/routing-rules', rule);
      return response.data;
    } catch (error) {
      console.error('Error saving routing rule:', error);
      throw error;
    }
  },

  /**
   * Delete a routing rule
   * @param {string} serviceType - The service type
   * @returns {Promise<Object>} Response from the server
   */
  deleteRoutingRule: async (serviceType) => {
    try {
      const response = await apiClient.delete(`/security-services/routing-rules/${serviceType}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting routing rule for ${serviceType}:`, error);
      throw error;
    }
  },

  /**
   * Get next available agent for a service type
   * @param {string} serviceType - The service type
   * @returns {Promise<Object>} The next available agent or null if none available
   */
  getNextAvailableAgent: async (serviceType) => {
    try {
      const response = await apiClient.get(`/security-services/routing-rules/${serviceType}/next-agent`);
      return response.data || null;
    } catch (error) {
      console.error(`Error getting next available agent for ${serviceType}:`, error);
      throw error;
    }
  },

  /**
   * Check if auto-assign is enabled for a service type
   * @param {string} serviceType - The service type
   * @returns {Promise<boolean>} True if auto-assign is enabled
   */
  isAutoAssignEnabled: async (serviceType) => {
    try {
      const rule = await routingService.getRoutingRuleByServiceType(serviceType);
      return rule && rule.is_active && rule.auto_assign;
    } catch (error) {
      console.error(`Error checking auto-assign for ${serviceType}:`, error);
      return false;
    }
  },

  /**
   * Get all users assigned to a service type
   * @param {string} serviceType - The service type
   * @returns {Promise<Array>} Array of user IDs
   */
  getAssignedUsers: async (serviceType) => {
    try {
      const rule = await routingService.getRoutingRuleByServiceType(serviceType);
      return rule && rule.assigned_users ? rule.assigned_users : [];
    } catch (error) {
      console.error(`Error getting assigned users for ${serviceType}:`, error);
      return [];
    }
  },

  /**
   * Check if a user is assigned to a service type
   * @param {number} userId - The user ID
   * @param {string} serviceType - The service type
   * @returns {Promise<boolean>} True if user is assigned
   */
  isUserAssigned: async (userId, serviceType) => {
    try {
      const assignedUsers = await routingService.getAssignedUsers(serviceType);
      return assignedUsers.includes(userId);
    } catch (error) {
      console.error(`Error checking if user ${userId} is assigned to ${serviceType}:`, error);
      return false;
    }
  }
};

export default routingService;