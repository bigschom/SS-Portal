import { REQUEST_STATUS, TIMEOUT } from './constants';

/**
 * Format a date for display
 * @param {string|Date} dateString - Date string or Date object
 * @param {boolean} includeTime - Whether to include time in the formatted string
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString, includeTime = true) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  const options = includeTime 
    ? { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    : { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
      };
    
  return date.toLocaleDateString(undefined, options);
};

/**
 * Check if a user can edit a specific request
 * @param {object} request - The request object
 * @param {object} user - The current user object
 * @returns {boolean} Whether the user can edit the request
 */
export const canEditRequest = (request, user) => {
  if (!request || !user) return false;
  
  // User can edit if:
  // 1. They created the request and it's sent back to them
  const isCreatorAndSentBack = request.created_by.id === user.id && 
                              request.status === REQUEST_STATUS.SENT_BACK;
  
  // 2. They created the request and it's still new
  const isCreatorAndNew = request.created_by.id === user.id && 
                         request.status === REQUEST_STATUS.NEW;
  
  // 3. They are an admin
  const isAdmin = user.role === 'admin';
  
  return isCreatorAndSentBack || isCreatorAndNew || isAdmin;
};

/**
 * Calculate time remaining before auto-return
 * @param {string} updatedAt - The timestamp when the request was last updated
 * @returns {number} Time remaining in minutes, or null if not applicable
 */
export const calculateTimeRemaining = (updatedAt) => {
  if (!updatedAt) return null;
  
  const updatedTime = new Date(updatedAt).getTime();
  const currentTime = Date.now();
  const timeElapsedMs = currentTime - updatedTime;
  const timeRemainingMs = Math.max(0, TIMEOUT.AUTO_RETURN_MS - timeElapsedMs);
  
  // Convert to minutes
  return Math.ceil(timeRemainingMs / (60 * 1000));
};

/**
 * Process comments to include reaction counts
 * @param {Array} comments - Array of comment objects
 * @param {string} userId - Current user's ID
 * @returns {Array} Processed comments with reaction counts
 */
export const processComments = (comments, userId) => {
  if (!comments || !Array.isArray(comments)) return [];
  
  return comments.map(comment => {
    const likes = comment.reactions?.filter(r => r.reaction_type === 'like').length || 0;
    const dislikes = comment.reactions?.filter(r => r.reaction_type === 'dislike').length || 0;
    const userReaction = comment.reactions?.find(r => r.user_id === userId)?.reaction_type || null;
    
    return {
      ...comment,
      likes,
      dislikes,
      userReaction
    };
  });
};

/**
 * Extract service-specific data from a request
 * @param {object} request - The request object
 * @returns {object} Service-specific data
 */
export const extractServiceData = (request) => {
  if (!request) return {};
  
  // Check which service-specific arrays are present
  const serviceData = {};
  
  if (request.request_phone_numbers?.length > 0) {
    serviceData.phoneNumbers = request.request_phone_numbers;
  }
  
  if (request.request_imei_numbers?.length > 0) {
    serviceData.imeiNumbers = request.request_imei_numbers;
  }
  
  if (request.request_call_history?.length > 0) {
    serviceData.callHistory = request.request_call_history;
  }
  
  if (request.request_blocked_numbers?.length > 0) {
    serviceData.blockedNumbers = request.request_blocked_numbers;
  }
  
  if (request.request_momo_numbers?.length > 0) {
    serviceData.momoNumbers = request.request_momo_numbers;
  }
  
  if (request.request_momo_transactions?.length > 0) {
    serviceData.momoTransactions = request.request_momo_transactions;
  }
  
  return serviceData;
};

/**
 * Check if a request has timed out
 * @param {object} request - The request object
 * @returns {boolean} Whether the request has timed out
 */
export const hasRequestTimedOut = (request) => {
  if (!request || request.status !== REQUEST_STATUS.IN_PROGRESS) return false;
  
  const updatedTime = new Date(request.updated_at).getTime();
  const currentTime = Date.now();
  const timeElapsedMs = currentTime - updatedTime;
  
  return timeElapsedMs > TIMEOUT.AUTO_RETURN_MS;
};
