// src/services/task-service.js

import apiClient from '../config/api-client.js';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

// Method to get current user ID from session storage
const getCurrentUserId = () => {
  const userStr = sessionStorage.getItem('user');
  if (userStr) {
    try {
      const userData = JSON.parse(userStr);
      return userData.id;
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
  }
  return null;
};

// Task service to handle all task-related API calls
const taskService = {
  // Cache for task data
  _cache: {
    availableTasks: null,
    assignedTasks: null,
    completedTasks: null,
    submittedTasks: null,
    sentBackTasks: null,
    unhandledTasks: null,
    taskDetails: {},
    lastFetch: 0
  },

  // Get all available tasks for a user
  getAvailableRequests: async (userId = null) => {
    try {
      // Check cache first
      const now = Date.now();
      if (taskService._cache.availableTasks && 
          now - taskService._cache.lastFetch < CACHE_TTL) {
        console.log('Returning cached available requests');
        return taskService._cache.availableTasks;
      }

      // Use provided userId or get from session
      const targetUserId = userId || getCurrentUserId();
      if (!targetUserId) {
        console.warn('No userId provided or found in session for available requests');
        return { error: 'User ID is required' };
      }

      // Make the API request
      console.log('Making API request for available requests');
      const response = await apiClient.get(`/tasks/available/${targetUserId}`);
      
      // Update cache
      taskService._cache.availableTasks = response.data;
      taskService._cache.lastFetch = now;
      
      return response.data;
    } catch (error) {
      console.error('Error fetching available requests:', error);
      
      // Detailed error logging
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        return { error: error.response.data.message || 'Error fetching available requests' };
      } else if (error.request) {
        console.error('No response received:', error.request);
        return { error: 'Server did not respond. Please try again later.' };
      } else {
        console.error('Error setting up request:', error.message);
        return { error: error.message || 'An unknown error occurred' };
      }
    }
  },

  // Get assigned tasks for a user
  getAssignedRequests: async (userId = null) => {
    try {
      // Check cache first
      const now = Date.now();
      if (taskService._cache.assignedTasks && 
          now - taskService._cache.lastFetch < CACHE_TTL) {
        console.log('Returning cached assigned requests');
        return taskService._cache.assignedTasks;
      }

      // Use provided userId or get from session
      const targetUserId = userId || getCurrentUserId();
      if (!targetUserId) {
        console.warn('No userId provided or found in session for assigned requests');
        return { error: 'User ID is required' };
      }

      // Make the API request
      console.log('Making API request for assigned requests');
      const response = await apiClient.get(`/tasks/assigned/${targetUserId}`);
      
      // Update cache
      taskService._cache.assignedTasks = response.data;
      taskService._cache.lastFetch = now;
      
      return response.data;
    } catch (error) {
      console.error('Error fetching assigned requests:', error);
      
      // Detailed error logging
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        return { error: error.response.data.message || 'Error fetching assigned requests' };
      } else if (error.request) {
        console.error('No response received:', error.request);
        return { error: 'Server did not respond. Please try again later.' };
      } else {
        console.error('Error setting up request:', error.message);
        return { error: error.message || 'An unknown error occurred' };
      }
    }
  },

  // Get submitted tasks for a user
  getSubmittedRequests: async (userId = null) => {
    try {
      // Check cache first
      const now = Date.now();
      if (taskService._cache.submittedTasks && 
          now - taskService._cache.lastFetch < CACHE_TTL) {
        console.log('Returning cached submitted requests');
        return taskService._cache.submittedTasks;
      }

      // Use provided userId or get from session
      const targetUserId = userId || getCurrentUserId();
      if (!targetUserId) {
        console.warn('No userId provided or found in session for submitted requests');
        return { error: 'User ID is required' };
      }

      // Make the API request
      console.log('Making API request for submitted requests');
      const response = await apiClient.get(`/tasks/submitted/${targetUserId}`);
      
      // Update cache
      taskService._cache.submittedTasks = response.data;
      taskService._cache.lastFetch = now;
      
      return response.data;
    } catch (error) {
      console.error('Error fetching submitted requests:', error);
      
      // Detailed error logging
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        return { error: error.response.data.message || 'Error fetching submitted requests' };
      } else if (error.request) {
        console.error('No response received:', error.request);
        return { error: 'Server did not respond. Please try again later.' };
      } else {
        console.error('Error setting up request:', error.message);
        return { error: error.message || 'An unknown error occurred' };
      }
    }
  },

  // Get sent back tasks for a user
  getSentBackRequests: async (userId = null) => {
    try {
      // Check cache first
      const now = Date.now();
      if (taskService._cache.sentBackTasks && 
          now - taskService._cache.lastFetch < CACHE_TTL) {
        console.log('Returning cached sent back requests');
        return taskService._cache.sentBackTasks;
      }

      // Use provided userId or get from session
      const targetUserId = userId || getCurrentUserId();
      if (!targetUserId) {
        console.warn('No userId provided or found in session for sent back requests');
        return { error: 'User ID is required' };
      }

      // Make the API request
      console.log('Making API request for sent back requests');
      const response = await apiClient.get(`/tasks/sent-back/${targetUserId}`);
      
      // Update cache
      taskService._cache.sentBackTasks = response.data;
      taskService._cache.lastFetch = now;
      
      return response.data;
    } catch (error) {
      console.error('Error fetching sent back requests:', error);
      
      // Detailed error logging
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        return { error: error.response.data.message || 'Error fetching sent back requests' };
      } else if (error.request) {
        console.error('No response received:', error.request);
        return { error: 'Server did not respond. Please try again later.' };
      } else {
        console.error('Error setting up request:', error.message);
        return { error: error.message || 'An unknown error occurred' };
      }
    }
  },

  // Get all unhandled tasks
  getUnhandledRequests: async () => {
    try {
      // Check cache first
      const now = Date.now();
      if (taskService._cache.unhandledTasks && 
          now - taskService._cache.lastFetch < CACHE_TTL) {
        console.log('Returning cached unhandled requests');
        return taskService._cache.unhandledTasks;
      }

      // Make the API request
      console.log('Making API request for unhandled requests');
      const response = await apiClient.get('/tasks/unhandled');
      
      // Update cache
      taskService._cache.unhandledTasks = response.data;
      taskService._cache.lastFetch = now;
      
      return response.data;
    } catch (error) {
      console.error('Error fetching unhandled requests:', error);
      
      // Detailed error logging
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        return { error: error.response.data.message || 'Error fetching unhandled requests' };
      } else if (error.request) {
        console.error('No response received:', error.request);
        return { error: 'Server did not respond. Please try again later.' };
      } else {
        console.error('Error setting up request:', error.message);
        return { error: error.message || 'An unknown error occurred' };
      }
    }
  },

  // Get completed tasks for a user
  getCompletedRequests: async (userId = null) => {
    try {
      // Check cache first
      const now = Date.now();
      if (taskService._cache.completedTasks && 
          now - taskService._cache.lastFetch < CACHE_TTL) {
        console.log('Returning cached completed requests');
        return taskService._cache.completedTasks;
      }

      // Use provided userId or get from session
      const targetUserId = userId || getCurrentUserId();
      if (!targetUserId) {
        console.warn('No userId provided or found in session for completed requests');
        return { error: 'User ID is required' };
      }

      // Make the API request
      console.log('Making API request for completed requests');
      const response = await apiClient.get(`/tasks/completed/${targetUserId}`);
      
      // Update cache
      taskService._cache.completedTasks = response.data;
      taskService._cache.lastFetch = now;
      
      return response.data;
    } catch (error) {
      console.error('Error fetching completed requests:', error);
      
      // Detailed error logging
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        return { error: error.response.data.message || 'Error fetching completed requests' };
      } else if (error.request) {
        console.error('No response received:', error.request);
        return { error: 'Server did not respond. Please try again later.' };
      } else {
        console.error('Error setting up request:', error.message);
        return { error: error.message || 'An unknown error occurred' };
      }
    }
  },

  // Get details for a specific task
  getRequestDetails: async (requestId) => {
    try {
      // Check cache first
      const now = Date.now();
      if (taskService._cache.taskDetails[requestId] && 
          now - taskService._cache.taskDetails[requestId].timestamp < CACHE_TTL) {
        console.log(`Returning cached details for request ${requestId}`);
        return taskService._cache.taskDetails[requestId].data;
      }

      if (!requestId) {
        console.warn('No requestId provided');
        return { error: 'Request ID is required' };
      }

      // Make the API request
      console.log(`Making API request for request details ${requestId}`);
      const response = await apiClient.get(`/tasks/${requestId}`);
      
      // Update cache
      taskService._cache.taskDetails[requestId] = {
        data: response.data,
        timestamp: now
      };
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching request details for ${requestId}:`, error);
      
      // Detailed error logging
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        return { error: error.response.data.message || 'Error fetching request details' };
      } else if (error.request) {
        console.error('No response received:', error.request);
        return { error: 'Server did not respond. Please try again later.' };
      } else {
        console.error('Error setting up request:', error.message);
        return { error: error.message || 'An unknown error occurred' };
      }
    }
  },

  // Assign a task to a user
  assignRequest: async (requestId, userId, assignedById) => {
    try {
      if (!requestId || !userId) {
        console.warn('Missing requestId or userId for task assignment');
        return { error: 'Request ID and User ID are required' };
      }

      // Make the API request
      console.log(`Assigning request ${requestId} to user ${userId}`);
      const response = await apiClient.post('/tasks/assign', {
        requestId,
        userId,
        assignedById: assignedById || getCurrentUserId()
      });
      
      // Invalidate cache after assignment
      taskService.invalidateCache();
      
      return response.data;
    } catch (error) {
      console.error(`Error assigning request ${requestId} to user ${userId}:`, error);
      
      // Detailed error logging
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        return { error: error.response.data.message || 'Error assigning request' };
      } else if (error.request) {
        console.error('No response received:', error.request);
        return { error: 'Server did not respond. Please try again later.' };
      } else {
        console.error('Error setting up request:', error.message);
        return { error: error.message || 'An unknown error occurred' };
      }
    }
  },

  // Auto-return a timed out request
  autoReturnRequest: async (requestId) => {
    try {
      if (!requestId) {
        console.warn('Missing requestId for auto-return');
        return { error: 'Request ID is required' };
      }

      // Make the API request
      console.log(`Auto-returning request ${requestId}`);
      const response = await apiClient.post('/tasks/auto-return', {
        requestId,
        userId: getCurrentUserId()
      });
      
      // Invalidate cache after auto-return
      taskService.invalidateCache();
      
      return response.data;
    } catch (error) {
      console.error(`Error auto-returning request ${requestId}:`, error);
      
      // Detailed error logging
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        return { error: error.response.data.message || 'Error auto-returning request' };
      } else if (error.request) {
        console.error('No response received:', error.request);
        return { error: 'Server did not respond. Please try again later.' };
      } else {
        console.error('Error setting up request:', error.message);
        return { error: error.message || 'An unknown error occurred' };
      }
    }
  },



  // Add a comment to a task
// Add a comment to a task
addComment: async (requestId, userId, comment, isSystem = false, isResponse = false, isSendBackReason = false) => {
  try {
    if (!requestId || !comment) {
      console.warn('Missing requestId or comment for adding comment');
      return { error: 'Request ID and comment are required' };
    }

    // Make the API request - use the correct endpoint with requestId in the URL
    console.log(`Adding comment to request ${requestId}`);
    const response = await apiClient.post(`/tasks/comment/${requestId}`, {
      userId,
      comment,
      isSystem,
      isResponse,
      isSendBackReason
    });
    
    // Invalidate specific task cache after adding comment
    if (taskService._cache.taskDetails[requestId]) {
      delete taskService._cache.taskDetails[requestId];
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error adding comment to request ${requestId}:`, error);
    
    // Detailed error logging
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      return { error: error.response.data.message || 'Error adding comment' };
    } else if (error.request) {
      console.error('No response received:', error.request);
      return { error: 'Server did not respond. Please try again later.' };
    } else {
      console.error('Error setting up request:', error.message);
      return { error: error.message || 'An unknown error occurred' };
    }
  }
},

// Update task status
updateRequestStatus: async (requestId, status, userId, details = null) => {
  try {
    if (!requestId || !status) {
      console.warn('Missing requestId or status for task update');
      return { error: 'Request ID and status are required' };
    }

    // Make the API request - use the correct endpoint with requestId in the URL
    console.log(`Updating request ${requestId} status to ${status}`);
    const response = await apiClient.put(`/tasks/status/${requestId}`, {
      status,
      userId,
      details
    });
    
    // Invalidate cache after status update
    taskService.invalidateCache();
    
    return response.data;
  } catch (error) {
    console.error(`Error updating request ${requestId} status:`, error);
    
    // Detailed error logging
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      return { error: error.response.data.message || 'Error updating request status' };
    } else if (error.request) {
      console.error('No response received:', error.request);
      return { error: 'Server did not respond. Please try again later.' };
    } else {
      console.error('Error setting up request:', error.message);
      return { error: error.message || 'An unknown error occurred' };
    }
  }
},


  // Get all user staff members
  getStaffMembers: async () => {
    try {
      // Make the API request
      console.log('Fetching staff members');
      const response = await apiClient.get('/users/staff');
      return response.data;
    } catch (error) {
      console.error('Error fetching staff members:', error);
      
      // Detailed error logging
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        return { error: error.response.data.message || 'Error fetching staff members' };
      } else if (error.request) {
        console.error('No response received:', error.request);
        return { error: 'Server did not respond. Please try again later.' };
      } else {
        console.error('Error setting up request:', error.message);
        return { error: error.message || 'An unknown error occurred' };
      }
    }
  },

  // Get all task statuses
  getTaskStatuses: async () => {
    try {
      // Make the API request
      console.log('Fetching task statuses');
      const response = await apiClient.get('/tasks/statuses');
      return response.data;
    } catch (error) {
      console.error('Error fetching task statuses:', error);
      
      // Detailed error logging
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        return { error: error.response.data.message || 'Error fetching task statuses' };
      } else if (error.request) {
        console.error('No response received:', error.request);
        return { error: 'Server did not respond. Please try again later.' };
      } else {
        console.error('Error setting up request:', error.message);
        return { error: error.message || 'An unknown error occurred' };
      }
    }
  },

// Get comments for a request
getRequestComments: async (requestId) => {
  try {
    if (!requestId) {
      console.warn('Missing requestId for fetching comments');
      return [];
    }

    // Make the API request
    console.log(`Fetching comments for request ${requestId}`);
    const response = await apiClient.get(`/tasks/comments/${requestId}`);
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching comments for request ${requestId}:`, error);
    
    // Detailed error logging
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      return [];
    } else if (error.request) {
      console.error('No response received:', error.request);
      return [];
    } else {
      console.error('Error setting up request:', error.message);
      return [];
    }
  }
},


// Claim a request (self-assign)
claimRequest: async (requestId, userId = null) => {
  try {
    if (!requestId) {
      console.warn('Missing requestId for claiming request');
      return { error: 'Request ID is required' };
    }

    // Use provided userId or get from session
    const targetUserId = userId || getCurrentUserId();
    if (!targetUserId) {
      console.warn('No userId provided or found in session for claiming request');
      return { error: 'User ID is required' };
    }

    // Make the API request with the correct endpoint
    console.log(`Claiming request ${requestId} for user ${targetUserId}`);
    const response = await apiClient.post(`/tasks/claim/${requestId}`, {
      userId: targetUserId
    });
    
    // Invalidate cache after claiming
    taskService.invalidateCache();
    
    return response.data;
  } catch (error) {
    console.error(`Error claiming request ${requestId}:`, error);
    
    // Detailed error logging
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      return { error: error.response.data.message || 'Error claiming request' };
    } else if (error.request) {
      console.error('No response received:', error.request);
      return { error: 'Server did not respond. Please try again later.' };
    } else {
      console.error('Error setting up request:', error.message);
      return { error: error.message || 'An unknown error occurred' };
    }
  }
},

// Get service details for a specific request
// Add this to your task-service.js if it doesn't exist or update it if it does
getServiceDetails: async (requestId, serviceType) => {
  try {
    // Check cache first
    const cacheKey = `${serviceType}_${requestId}`;
    const now = Date.now();
    if (taskService._cache[cacheKey] && 
        now - taskService._cache[cacheKey].timestamp < CACHE_TTL) {
      console.log(`Returning cached ${serviceType} details for request ${requestId}`);
      return taskService._cache[cacheKey].data;
    }

    if (!requestId || !serviceType) {
      console.warn('Missing requestId or serviceType for service details');
      return { error: 'Request ID and service type are required' };
    }

    // Make the API request
    console.log(`Fetching ${serviceType} details for request ${requestId}`);
    const response = await apiClient.get(`/tasks/details/${serviceType}/${requestId}`);
    
    // Update cache
    taskService._cache[cacheKey] = {
      data: response.data,
      timestamp: now
    };
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${serviceType} details:`, error);
    
    // Detailed error logging
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      return { error: error.response.data.message || `Error fetching ${serviceType} details` };
    } else if (error.request) {
      console.error('No response received:', error.request);
      return { error: 'Server did not respond. Please try again later.' };
    } else {
      console.error('Error setting up request:', error.message);
      return { error: error.message || 'An unknown error occurred' };
    }
  }
},






// Handle comment reaction (like/dislike)
handleCommentReaction: async (commentId, userId, reactionType) => {
  try {
    if (!commentId || !userId || !reactionType) {
      console.warn('Missing required parameters for handling comment reaction');
      return { error: 'Comment ID, User ID, and reaction type are required' };
    }

    // Make the API request
    console.log(`Handling ${reactionType} reaction for comment ${commentId} by user ${userId}`);
    const response = await apiClient.post('/tasks/comment-reaction', {
      commentId,
      userId,
      reactionType
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error handling reaction for comment ${commentId}:`, error);
    
    // Detailed error logging
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      return { error: error.response.data.message || 'Error handling comment reaction' };
    } else if (error.request) {
      console.error('No response received:', error.request);
      return { error: 'Server did not respond. Please try again later.' };
    } else {
      console.error('Error setting up request:', error.message);
      return { error: error.message || 'An unknown error occurred' };
    }
  }
},


  // Method to manually invalidate cache if needed
  invalidateCache: () => {
    taskService._cache.availableTasks = null;
    taskService._cache.assignedTasks = null;
    taskService._cache.completedTasks = null;
    taskService._cache.submittedTasks = null;
    taskService._cache.sentBackTasks = null;
    taskService._cache.unhandledTasks = null;
    taskService._cache.taskDetails = {};
    taskService._cache.lastFetch = 0;
    console.log('Task service cache invalidated');
  }
};

export default taskService;