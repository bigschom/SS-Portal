// src/utils/notificationUtils.js

/**
 * Formats notification data based on type and parameters
 * @param {string} type - The notification type (newRequest, statusChange, etc)
 * @param {Object} params - Parameters specific to the notification type
 * @returns {Object} - Formatted notification data with title, body, etc.
 */
export const formatNotification = (type, params = {}) => {
  switch (type) {
    case 'newRequest':
      return {
        title: 'New Service Request',
        body: `${params.referenceNumber}: ${params.serviceType} request from ${params.customerName}`,
        tag: `new-request-${params.referenceNumber}`,
        requireInteraction: true
      };
    
    case 'statusChange':
      return {
        title: 'Request Status Updated',
        body: `Request ${params.referenceNumber} status changed to ${params.status}`,
        tag: `status-change-${params.referenceNumber}`,
        requireInteraction: false
      };
      
    case 'assignment':
      return {
        title: 'Request Assigned',
        body: `Request ${params.referenceNumber} has been assigned to you`,
        tag: `assignment-${params.referenceNumber}`,
        requireInteraction: true
      };
      
    case 'comment':
      return {
        title: 'New Comment',
        body: `${params.author} commented on request ${params.referenceNumber}`,
        tag: `comment-${params.referenceNumber}`,
        requireInteraction: false
      };
      
    case 'reminder':
      return {
        title: 'Request Reminder',
        body: `Reminder: Request ${params.referenceNumber} requires attention`,
        tag: `reminder-${params.referenceNumber}`,
        requireInteraction: true
      };
      
    default:
      return {
        title: 'Notification',
        body: 'You have a new notification',
        tag: `generic-${Date.now()}`,
        requireInteraction: false
      };
  }
};

/**
 * Shows a browser notification with proper error handling and fallbacks
 * @param {string} title - Notification title
 * @param {Object} options - Notification options (body, tag, etc.)
 * @returns {boolean} - Whether the notification was successfully shown
 */
export const showNotification = (title, options = {}) => {
  // Check if browser notifications are supported
  if (!('Notification' in window)) {
    console.warn('Browser notifications not supported');
    return false;
  }
  
  // Check if we have permission
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return false;
  }
  
  try {
    // Merge with default options
    const notificationOptions = {
      icon: '/favicon.ico', // Default icon
      badge: '/notification-badge.png', // Small badge icon for mobile
      silent: false, // Play sound by default
      requireInteraction: false, // Auto-dismiss by default
      ...options,
      // Make sure we have a tag to identify this notification
      tag: options.tag || `notification-${Date.now()}`
    };
    
    // Create and show the notification
    const notification = new Notification(title, notificationOptions);
    
    // Add click handler if provided
    if (typeof options.onClick === 'function') {
      notification.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent default behavior
        notification.close(); // Close the notification
        options.onClick(event); // Call the handler
      });
    } else {
      // Default click behavior - focus on the app
      notification.addEventListener('click', () => {
        window.focus();
        notification.close();
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error showing notification:', error);
    return false;
  }
};

/**
 * Requests notification permission with proper UI guidance
 * @returns {Promise<boolean>} - Whether permission was granted
 */
export const requestNotificationPermission = async () => {
  // Check if browser notifications are supported
  if (!('Notification' in window)) {
    console.warn('Browser notifications not supported');
    return false;
  }
  
  // Return true if already granted
  if (Notification.permission === 'granted') {
    return true;
  }
  
  // Return false if already denied (we can't ask again)
  if (Notification.permission === 'denied') {
    return false;
  }
  
  // Ask for permission
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};