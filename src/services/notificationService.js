// src/services/notificationService.js
import apiService from '../config/api-service';

/**
 * Service for handling various types of notifications
 * Currently supports SMS notifications with inactive implementation
 */
class NotificationService {
  /**
   * Send an SMS notification
   * @param {Object} params - SMS parameters
   * @param {string} params.to - Recipient phone number
   * @param {string} params.template - Template identifier
   * @param {Object} params.data - Template data
   * @returns {Promise<Object>} - Response from the SMS gateway
   */
  async sendSms(params) {
    // This implementation is inactive, will be activated later
    console.log('SMS notification would be sent:', params);
    return { success: true, message: 'SMS notification queued (INACTIVE)' };
    
    // Actual implementation to be activated later
    /*
    try {
      const response = await apiService.apiClient.post('/notifications/sms', params);
      return response.data;
    } catch (error) {
      console.error('SMS notification failed:', error);
      throw error;
    }
    */
  }

  /**
   * Get SMS message template for a specific notification type
   * @param {string} templateId - Template identifier
   * @param {Object} data - Data to be inserted into the template
   * @returns {string} - Formatted SMS message text
   */
  getSmsTemplate(templateId, data) {
    const templates = {
      request_confirmation: `Your service request has been submitted successfully. Reference number: ${data.referenceNumber}. Use this reference for any inquiries.`,
      request_completed: `Your service request ${data.referenceNumber} has been completed. ${data.responseMessage || ''}`,
      request_sent_back: `Your service request ${data.referenceNumber} requires additional information. Please check your account or contact customer service.`,
      status_change: `Your service request ${data.referenceNumber} status has been updated to: ${data.status}.`
    };

    return templates[templateId] || `Service update for request ${data.referenceNumber}`;
  }

  /**
   * Format phone number to ensure it's in the correct format for the SMS gateway
   * @param {string} phoneNumber - Phone number to format
   * @returns {string} - Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    // Remove any non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Ensure number has the right format (example for Rwanda)
    if (cleaned.length === 9 && cleaned.startsWith('7')) {
      return `+250${cleaned}`;
    } else if (cleaned.length === 10 && cleaned.startsWith('07')) {
      return `+25${cleaned}`;
    } else if (cleaned.length === 12 && cleaned.startsWith('250')) {
      return `+${cleaned}`;
    }
    
    // If already in international format, just ensure it has a plus
    if (cleaned.length > 10) {
      return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
    }
    
    // Return original number if we can't determine format
    return phoneNumber;
  }
}

export default new NotificationService();