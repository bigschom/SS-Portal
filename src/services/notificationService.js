// src/services/notificationService.js

import apiClient from '../config/api-service';

/**
 * Comprehensive Notification Service
 * Handles various notification-related operations including:
 * - SMS notifications
 * - User notifications management
 * - Desktop notification initialization
 */
class NotificationService {
  /**
   * SMS Notification Methods
   * ----------------------
   */

  /**
   * Send an SMS notification
   * @param {Object} params - SMS parameters
   * @param {string} params.to - Recipient phone number
   * @param {string} params.template - Template identifier
   * @param {Object} params.data - Template data for the message
   * @returns {Promise<Object>} - Response from the SMS gateway
   */
  async sendSms(params) {
    try {
      // Format phone number and generate message from template
      const formattedParams = {
        ...params,
        to: this.formatPhoneNumber(params.to),
        message: this.getSmsTemplate(params.template, params.data)
      };

      // Send SMS via API (uncomment when actual implementation is ready)
      const response = await apiClient.post('/notifications/sms', formattedParams);
      return response.data;
    } catch (error) {
      console.error('SMS notification failed:', error);
      throw error;
    }
  }

  /**
   * Generate SMS message template based on notification type
   * @param {string} templateId - Predefined template identifier
   * @param {Object} data - Dynamic data to populate the template
   * @returns {string} - Formatted SMS message text
   */
  getSmsTemplate(templateId, data) {
    // Predefined message templates for different notification types
    const templates = {
      request_confirmation: `Your service request has been submitted successfully. Reference number: ${data.referenceNumber}. Use this reference for any inquiries.`,
      request_completed: `Your service request ${data.referenceNumber} has been completed. ${data.responseMessage || ''}`,
      request_sent_back: `Your service request ${data.referenceNumber} requires additional information. Please check your account or contact customer service.`,
      status_change: `Your service request ${data.referenceNumber} status has been updated to: ${data.status}.`
    };

    // Return template or a generic message if template not found
    return templates[templateId] || `Service update for request ${data.referenceNumber}`;
  }

  /**
   * Format phone number to ensure correct international format
   * Specifically designed for Rwandan phone number format
   * @param {string} phoneNumber - Raw phone number input
   * @returns {string} - Standardized international phone number
   */
  formatPhoneNumber(phoneNumber) {
    // Remove non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Rwanda-specific phone number formatting rules
    if (cleaned.length === 9 && cleaned.startsWith('7')) {
      return `+250${cleaned}`;
    } else if (cleaned.length === 10 && cleaned.startsWith('07')) {
      return `+25${cleaned}`;
    } else if (cleaned.length === 12 && cleaned.startsWith('250')) {
      return `+${cleaned}`;
    }
    
    // Ensure international format for longer numbers
    if (cleaned.length > 10) {
      return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
    }
    
    // Fallback to original number if format can't be determined
    return phoneNumber;
  }

  /**
   * User Notification Management Methods
   * -----------------------------------
   */

  /**
   * Retrieve paginated notifications for the current user
   * @param {Object} options - Filtering and pagination options
   * @returns {Promise<Object>} Paginated notification results
   */
  async getNotifications(options = {}) {
    try {
      const { 
        page = 1, 
        pageSize = 10, 
        isRead, 
        relatedTo 
      } = options;
      
      const queryParams = new URLSearchParams();
      queryParams.append('page', page);
      queryParams.append('pageSize', pageSize);
      
      // Optional filtering parameters
      if (isRead !== undefined) {
        queryParams.append('isRead', isRead);
      }
      
      if (relatedTo) {
        queryParams.append('relatedTo', relatedTo);
      }
      
      const response = await apiClient.get(`/notifications?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  /**
   * Get total count of unread notifications
   * @returns {Promise<number>} Number of unread notifications
   */
  async getUnreadCount() {
    try {
      const response = await apiClient.get('/notifications/count');
      return response.data.count;
    } catch (error) {
      console.error('Error fetching notification count:', error);
      throw error;
    }
  }

  /**
   * Mark a specific notification as read
   * @param {number} notificationId - Unique identifier of the notification
   * @returns {Promise<Object>} Server response
   */
  async markAsRead(notificationId) {
    try {
      const response = await apiClient.put(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Desktop Notification Methods
   * --------------------------
   */

  /**
   * Initialize desktop notification service
   * Handles browser notification permission and device registration
   * @returns {Promise<boolean>} Success status of initialization
   */
  async initializeDesktopNotifications() {
    try {
      // Check browser notification support
      if (!('Notification' in window)) {
        console.log('This browser does not support desktop notifications');
        return false;
      }
      
      // Check existing notification permission
      if (Notification.permission === 'granted') {
        return await this.registerDesktopDevice();
      }
      
      // Request notification permission if not denied
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          return await this.registerDesktopDevice();
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error initializing desktop notifications:', error);
      return false;
    }
  }

  /**
   * Register current device for desktop notifications
   * @returns {Promise<boolean>} Registration success status
   */
  async registerDesktopDevice() {
    try {
      // Generate or retrieve existing device token
      let deviceToken = localStorage.getItem('notification_device_token');
      if (!deviceToken) {
        deviceToken = this.generateDeviceToken();
        localStorage.setItem('notification_device_token', deviceToken);
      }
      
      // Register device with server
      const deviceName = navigator.userAgent;
      await apiClient.post('/notifications/register-device', {
        deviceToken,
        deviceName
      });
      
      return true;
    } catch (error) {
      console.error('Error registering desktop device:', error);
      return false;
    }
  }

  /**
   * Generate a cryptographically secure unique device token
   * @returns {string} Unique device token
   */
  generateDeviceToken() {
    const randomBytes = new Uint8Array(16);
    window.crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Manage notification preferences
   * ------------------------------
   */

  /**
   * Retrieve user's current notification preferences
   * @returns {Promise<Array>} List of notification preferences
   */
  async getNotificationPreferences() {
    try {
      const response = await apiClient.get('/notifications/preferences');
      return response.data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update user's notification preferences
   * @param {Array} preferences - Updated notification preferences
   * @returns {Promise<Object>} Server response
   */
  async updateNotificationPreferences(preferences) {
    try {
      const response = await apiClient.put('/notifications/preferences', { preferences });
      return response.data;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Device Management Methods
   * -----------------------
   */

  /**
   * Unregister a desktop device from receiving notifications
   * @param {string} deviceToken - Token of the device to unregister
   * @returns {Promise<Object>} Server response
   */
  async unregisterDesktopDevice(deviceToken) {
    try {
      const response = await apiClient.delete(`/notifications/unregister-device/${deviceToken}`);
      
      // Remove the device token from local storage
      if (localStorage.getItem('notification_device_token') === deviceToken) {
        localStorage.removeItem('notification_device_token');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error unregistering desktop device:', error);
      throw error;
    }
  }

  /**
   * Utility Methods
   * --------------
   */

  /**
   * Trigger a custom desktop notification
   * @param {Object} options - Notification display options
   * @param {string} options.title - Notification title
   * @param {string} options.body - Notification message body
   * @param {string} [options.icon] - Optional icon URL
   * @returns {Notification|null} Created notification object or null
   */
  createDesktopNotification(options) {
    // Ensure browser supports notifications and permission is granted
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      console.warn('Desktop notifications not supported or permission denied');
      return null;
    }

    try {
      // Create and return the notification
      return new Notification(options.title, {
        body: options.body,
        icon: options.icon || undefined
      });
    } catch (error) {
      console.error('Error creating desktop notification:', error);
      return null;
    }
  }

  /**
   * Debug and Logging Method
   * Logs notification-related events for troubleshooting
   * @param {string} message - Log message
   * @param {Object} [additionalInfo] - Optional additional context
   */
  logNotificationEvent(message, additionalInfo = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      ...additionalInfo
    };

    // Log to console
    console.log('Notification Event:', logEntry);

    // Optional: Send to server-side logging if implemented
    // Uncomment and modify as needed
    // this.sendLogToServer(logEntry);
  }
}

// Export a singleton instance of the notification service
export default new NotificationService();