// src/utils/helpers.js
/**
 * Improved debounce function to limit how often a function is called
 * Waits until user stops triggering events before executing
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Whether to execute on the leading edge
 * @returns {Function} - Debounced function
 */
export const debounce = (func, wait, immediate = false) => {
    let timeout;
    let lastArgs;
    let lastThis;
    let result;
    
    // Function that actually executes the original function
    const later = () => {
      timeout = null;
      if (!immediate) {
        result = func.apply(lastThis, lastArgs);
        lastThis = lastArgs = null;
      }
    };
    
    // The debounced function that gets returned
    const debounced = function(...args) {
      lastThis = this;
      lastArgs = args;
      
      const callNow = immediate && !timeout;
      
      // Reset the timer for each call
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      
      if (callNow) {
        result = func.apply(this, args);
        lastThis = lastArgs = null;
      }
      
      return result;
    };
    
    // Add a method to cancel any pending execution
    debounced.cancel = () => {
      clearTimeout(timeout);
      timeout = null;
      lastThis = lastArgs = null;
    };
    
    return debounced;
  };
  
  /**
   * Improved throttle function to limit how often a function is called
   * Guarantees that function won't be called more than once in the specified interval
   * @param {Function} func - Function to throttle
   * @param {number} limit - Limit time in milliseconds
   * @param {Object} options - Options for controlling throttle behavior
   * @param {boolean} options.leading - Whether to execute on the leading edge
   * @param {boolean} options.trailing - Whether to execute on the trailing edge
   * @returns {Function} - Throttled function
   */
  export const throttle = (func, limit, { leading = true, trailing = true } = {}) => {
    let lastCall = 0;
    let timeout = null;
    let lastArgs = null;
    let lastThis = null;
    let result;
    
    // Function to execute the call
    const executeCall = () => {
      lastCall = Date.now();
      result = func.apply(lastThis, lastArgs);
      lastThis = lastArgs = null;
    };
    
    // Handle the trailing edge call
    const trailingEdge = () => {
      timeout = null;
      // Only execute if trailing edge is enabled and we have args
      if (trailing && lastArgs) {
        executeCall();
      }
      lastThis = lastArgs = null;
    };
    
    // The throttled function that gets returned
    const throttled = function(...args) {
      const now = Date.now();
      lastArgs = args;
      lastThis = this;
      
      // If it's been longer than the limit since last call
      if (lastCall === 0 || now - lastCall >= limit) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        
        // Execute immediately if leading edge is enabled
        if (leading) {
          executeCall();
        } else if (trailing) {
          // Otherwise schedule for trailing edge
          timeout = setTimeout(trailingEdge, limit);
        }
      } else if (!timeout && trailing) {
        // Schedule a trailing edge call
        const timeSinceLastCall = now - lastCall;
        const timeToNextCall = limit - timeSinceLastCall;
        timeout = setTimeout(trailingEdge, timeToNextCall);
      }
      
      return result;
    };
    
    // Add a method to cancel any pending execution
    throttled.cancel = () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      lastCall = 0;
      lastThis = lastArgs = null;
    };
    
    return throttled;
  };
  
  /**
   * Format a date string to a human-readable format
   * @param {string|Date} dateString - Date to format
   * @param {Object} options - Format options
   * @returns {string} - Formatted date string
   */
  export const formatDate = (dateString, options = {}) => {
    if (!dateString) return '';
    
    const defaultOptions = {
      day: 'numeric', 
      month: 'short', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    };
    
    const formatOptions = { ...defaultOptions, ...options };
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return new Intl.DateTimeFormat('en-US', formatOptions).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return String(dateString);
    }
  };
  
  /**
   * Format a service type string to a display-friendly format
   * @param {string} serviceType - Service type string (e.g., "request_serial_number")
   * @returns {string} - Formatted service type (e.g., "Request Serial Number")
   */
  export const formatServiceType = (serviceType) => {
    if (!serviceType) return '';
    return serviceType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };
  
  /**
   * Truncate a string to a specified length and add ellipsis if needed
   * @param {string} text - Text to truncate
   * @param {number} length - Maximum length
   * @returns {string} - Truncated text
   */
  export const truncateText = (text, length = 50) => {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  };
  
  /**
   * Get initials from a name
   * @param {string} name - Full name
   * @returns {string} - Initials
   */
  export const getInitials = (name) => {
    if (!name) return '';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  /**
   * Calculate time difference from now in a human-readable format
   * @param {string} dateString - Date string
   * @returns {string} - Human-readable time difference
   */
  export const timeFromNow = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);
    
    if (diffSeconds < 60) return 'just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} minutes ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} hours ago`;
    if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)} days ago`;
    if (diffSeconds < 2592000) return `${Math.floor(diffSeconds / 604800)} weeks ago`;
    
    return formatDate(dateString, { day: 'numeric', month: 'short', year: 'numeric' });
  };
  
  /**
   * Deep clone an object
   * @param {Object} obj - Object to clone
   * @returns {Object} - Cloned object
   */
  export const deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
  };
  
  /**
   * Check if a value is empty (null, undefined, empty string, empty array, or empty object)
   * @param {any} value - Value to check
   * @returns {boolean} - True if empty, false otherwise
   */
  export const isEmpty = (value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  };
  
  /**
   * Generate a unique ID
   * @returns {string} - Unique ID
   */
  export const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };