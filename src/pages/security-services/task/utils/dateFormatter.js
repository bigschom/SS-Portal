// src/pages/security-services/task/utils/dateFormatter.js

/**
 * Formats a date string into a human-readable format
 * @param {string} dateString - The date string to format
 * @returns {string} - The formatted date string
 */
export const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      // Format the date
      const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      
      return date.toLocaleString(undefined, options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Error formatting date';
    }
  };
  
  /**
   * Formats a date string into a short date format (without time)
   * @param {string} dateString - The date string to format
   * @returns {string} - The formatted date string
   */
  export const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      // Format the date
      const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      };
      
      return date.toLocaleDateString(undefined, options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Error formatting date';
    }
  };
  
  /**
   * Formats a time string (or date string) to show only the time
   * @param {string} timeString - The time string to format
   * @returns {string} - The formatted time string
   */
  export const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    
    try {
      const date = new Date(timeString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid time';
      }
      
      // Format the time
      const options = {
        hour: '2-digit',
        minute: '2-digit'
      };
      
      return date.toLocaleTimeString(undefined, options);
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Error formatting time';
    }
  };
  
  /**
   * Returns a relative time string (e.g. "5 minutes ago")
   * @param {string} dateString - The date string to format
   * @returns {string} - The relative time string
   */
  export const getRelativeTime = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      const now = new Date();
      const diffMs = now - date;
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);
      
      if (diffSec < 60) {
        return 'Just now';
      } else if (diffMin < 60) {
        return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
      } else if (diffHour < 24) {
        return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
      } else if (diffDay < 7) {
        return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
      } else {
        return formatDate(dateString);
      }
    } catch (error) {
      console.error('Error calculating relative time:', error);
      return 'Error calculating time';
    }
  };