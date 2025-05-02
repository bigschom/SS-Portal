// src/services/notification-service.js
import apiClient from '../config/api-client.js';

// Notifications related endpoints
const notificationService = {
  /**
   * Get notification settings for a user
   * @param {string|number} userId - The user ID
   * @returns {Promise<Object>} - User notification settings
   */
  getUserNotificationSettings: async (userId) => {
    try {
      const response = await apiClient.get(`/notifications/settings/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Notification service: Error fetching notification settings:', error);
      // Return default settings if API call fails
      return {
        browserEnabled: true,
        smsEnabled: false,
        emailEnabled: true
      };
    }
  },
  
  /**
   * Update notification settings for a user
   * @param {string|number} userId - The user ID
   * @param {Object} settings - The notification settings to update
   * @returns {Promise<Object>} - Result of the update operation
   */
  updateNotificationSettings: async (userId, settings) => {
    try {
      const response = await apiClient.put(`/notifications/settings/${userId}`, settings);
      return response.data;
    } catch (error) {
      console.error('Notification service: Error updating notification settings:', error);
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

export default notificationService;