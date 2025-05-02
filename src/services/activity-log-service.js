// src/services/activity-log-service.js
import apiClient from '../config/api-client.js';

/**
 * Service for logging user activities in the system
 */
const activityLogService = {
  /**
   * Log an activity
   * @param {Object} activityData - The activity data to log
   * @param {string|number} activityData.userId - The user ID
   * @param {string} activityData.description - Description of the activity
   * @param {string} activityData.type - Type of activity (create, update, delete, view, etc.)
   * @param {string|number|null} activityData.recordId - Optional ID of the record being acted upon
   * @returns {Promise<Object>} - Result of the logging operation
   */
  async logActivity(activityData) {
    try {
      console.log('Logging activity:', activityData);
      
      // Validate required fields
      if (!activityData.userId || !activityData.description || !activityData.type) {
        console.warn('Activity Log: Missing required fields in activity data');
        return { success: false, error: 'Missing required fields' };
      }
      
      const response = await apiClient.post('/activity-log', activityData);
      return response.data;
    } catch (error) {
      console.error('Activity Log: Error logging activity:', error);
      
      // Don't fail the main operation if logging fails
      if (error.response) {
        return { success: false, error: error.response.data.error };
      }
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Log a create activity
   * @param {string|number} userId - The user ID
   * @param {string} entityType - Type of entity being created (user, background check, etc.)
   * @param {string} entityName - Name or identifier of the entity
   * @param {string|number|null} recordId - Optional ID of the created record
   * @returns {Promise<Object>} - Result of the logging operation
   */
  async logCreate(userId, entityType, entityName, recordId = null) {
    return this.logActivity({
      userId,
      description: `Created ${entityType}: ${entityName}`,
      type: 'create',
      recordId
    });
  },
  
  /**
   * Log an update activity
   * @param {string|number} userId - The user ID
   * @param {string} entityType - Type of entity being updated
   * @param {string} entityName - Name or identifier of the entity
   * @param {string|number|null} recordId - Optional ID of the updated record
   * @returns {Promise<Object>} - Result of the logging operation
   */
  async logUpdate(userId, entityType, entityName, recordId = null) {
    return this.logActivity({
      userId,
      description: `Updated ${entityType}: ${entityName}`,
      type: 'update',
      recordId
    });
  },
  
  /**
   * Log a delete activity
   * @param {string|number} userId - The user ID
   * @param {string} entityType - Type of entity being deleted
   * @param {string} entityName - Name or identifier of the entity
   * @param {string|number|null} recordId - Optional ID of the deleted record
   * @returns {Promise<Object>} - Result of the logging operation
   */
  async logDelete(userId, entityType, entityName, recordId = null) {
    return this.logActivity({
      userId,
      description: `Deleted ${entityType}: ${entityName}`,
      type: 'delete',
      recordId
    });
  },
  
  /**
   * Log a view activity
   * @param {string|number} userId - The user ID
   * @param {string} entityType - Type of entity being viewed
   * @param {string} entityName - Name or identifier of the entity
   * @param {string|number|null} recordId - Optional ID of the viewed record
   * @returns {Promise<Object>} - Result of the logging operation
   */
  async logView(userId, entityType, entityName, recordId = null) {
    return this.logActivity({
      userId,
      description: `Viewed ${entityType}: ${entityName}`,
      type: 'view',
      recordId
    });
  },
  
  /**
   * Log a custom activity
   * @param {string|number} userId - The user ID
   * @param {string} description - Custom description
   * @param {string} type - Custom activity type
   * @param {string|number|null} recordId - Optional ID of the record
   * @returns {Promise<Object>} - Result of the logging operation
   */
  async logCustom(userId, description, type, recordId = null) {
    return this.logActivity({
      userId,
      description,
      type,
      recordId
    });
  }
};

export default activityLogService;