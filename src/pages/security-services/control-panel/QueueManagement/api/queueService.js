// src/pages/security-services/control-panel/QueueManagement/api/queueService.js
import apiService from '../../../../../config/api-service';

// Caching mechanism
const createCache = (maxAge = 5 * 60 * 1000) => {
  const cache = new Map();

  return {
    get(key) {
      const entry = cache.get(key);
      if (!entry) return null;
      
      // Check if cache is expired
      if (Date.now() - entry.timestamp > maxAge) {
        cache.delete(key);
        return null;
      }
      
      return entry.data;
    },
    set(key, data) {
      cache.set(key, {
        data,
        timestamp: Date.now()
      });
      return data;
    },
    clear(key) {
      if (key) {
        cache.delete(key);
      } else {
        cache.clear();
      }
    }
  };
};

// Create caches for different types of data
const handlersCache = createCache();
const usersCache = createCache();
const requestsCache = createCache();

// Throttle function to prevent excessive API calls
const throttle = (func, limit = 1000) => {
  let inProgress = false;
  let savedArgs = null;
  let savedThis = null;

  function wrapper() {
    if (inProgress) {
      savedArgs = arguments;
      savedThis = this;
      return;
    }

    func.apply(this, arguments);
    inProgress = true;

    setTimeout(() => {
      inProgress = false;
      if (savedArgs) {
        wrapper.apply(savedThis, savedArgs);
        savedArgs = null;
        savedThis = null;
      }
    }, limit);
  }

  return wrapper;
};

// Fetch all service handlers
export const fetchHandlers = throttle(async () => {
  // Check cache first
  const cachedHandlers = handlersCache.get('all');
  if (cachedHandlers) return cachedHandlers;

  try {
    console.log('Fetching queue handlers');
    
    // First try to use the queue service if available
    if (apiService.queue && typeof apiService.queue.getHandlers === 'function') {
      const result = await apiService.queue.getHandlers();
      console.log('Handlers fetched successfully:', result?.length);
      
      // Ensure we return an array and cache the result
      return handlersCache.set('all', Array.isArray(result) ? result : []);
    }
    
    // Fallback to using apiClient directly
    if (apiService.apiClient) {
      const response = await apiService.apiClient.get('/queue/handlers');
      console.log('Handlers fetched from API client:', response?.data?.length);
      
      // Ensure we return an array and cache the result
      return handlersCache.set('all', Array.isArray(response.data) ? response.data : []);
    }
    
    console.warn('Queue service not found, returning empty array');
    return [];
  } catch (error) {
    console.error('Error fetching handlers:', error);
    return [];
  }
});

// Fetch active users
export const fetchUsers = throttle(async () => {
  // Check cache first
  const cachedUsers = usersCache.get('all');
  if (cachedUsers) return cachedUsers;

  try {
    console.log('Fetching active users');
    
    let users = [];
    
    // First try to use the users service if available
    if (apiService.users && typeof apiService.users.getAllActiveUsers === 'function') {
      const response = await apiService.users.getAllActiveUsers();
      users = response.users || response || [];
    } 
    // Fallback to using all users if active users fails
    else if (apiService.users && typeof apiService.users.getAllUsers === 'function') {
      const response = await apiService.users.getAllUsers();
      users = response.users || response || [];
    }
    // Fallback to using apiClient directly
    else if (apiService.apiClient) {
      const response = await apiService.apiClient.get('/users/active');
      users = response.data || [];
    }
    
    console.log('Users fetched successfully:', users?.length);
    
    // Ensure we return an array and cache the result
    return usersCache.set('all', Array.isArray(users) ? users : []);
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
});

// Fetch handlers by service type
export const fetchHandlersByServiceType = throttle(async (serviceType) => {
  // Create a unique cache key for the service type
  const cacheKey = `handlers_${serviceType}`;
  
  // Check cache first
  const cachedHandlers = handlersCache.get(cacheKey);
  if (cachedHandlers) return cachedHandlers;

  try {
    console.log('Fetching handlers for service type:', serviceType);
    
    // First try to use the queue service if available
    if (apiService.queue && typeof apiService.queue.getHandlersByServiceType === 'function') {
      const result = await apiService.queue.getHandlersByServiceType(serviceType);
      
      // Cache and return the result
      return handlersCache.set(cacheKey, Array.isArray(result) ? result : []);
    }
    
    // Fallback to using apiClient directly
    if (apiService.apiClient) {
      const response = await apiService.apiClient.get(`/queue/handlers/by-service/${serviceType}`);
      
      // Ensure we return an array and cache the result
      return handlersCache.set(cacheKey, Array.isArray(response.data) ? response.data : []);
    }
    
    console.warn('Queue service not found, returning empty array');
    return [];
  } catch (error) {
    console.error(`Error fetching handlers for service type ${serviceType}:`, error);
    return [];
  }
});

// Fetch active requests count by service type
export const fetchActiveRequestsByServiceType = throttle(async (serviceType) => {
  try {
    console.log('Fetching active requests count for service type:', serviceType);
    
    // First try to use the queue service if available
    if (apiService.queue && typeof apiService.queue.getActiveRequestsCountByServiceType === 'function') {
      return await apiService.queue.getActiveRequestsCountByServiceType(serviceType);
    }
    
    // Fallback: manually count from all requests
    const allRequests = await fetchRequests();
    const activeStatuses = ['new', 'in_progress', 'pending_investigation'];
    
    const activeRequests = allRequests.filter(
      req => req.service_type === serviceType && activeStatuses.includes(req.status)
    );
    
    return activeRequests.length;
  } catch (error) {
    console.error(`Error fetching active requests for service type ${serviceType}:`, error);
    return 0;
  }
});

// Fetch service requests
export const fetchRequests = throttle(async () => {
  // Check cache first
  const cachedRequests = requestsCache.get('all');
  if (cachedRequests) return cachedRequests;

  try {
    console.log('Fetching all requests');
    
    // First try to use the queue service if available
    if (apiService.queue && typeof apiService.queue.getRequests === 'function') {
      const result = await apiService.queue.getRequests();
      console.log('Requests fetched successfully:', result?.length);
      
      // Ensure we return an array and cache the result
      return requestsCache.set('all', Array.isArray(result) ? result : []);
    }
    
    // Fallback to using apiClient directly
    if (apiService.apiClient) {
      const response = await apiService.apiClient.get('/queue/requests');
      console.log('Requests fetched from API client:', response?.data?.length);
      
      // Ensure we return an array and cache the result
      return requestsCache.set('all', Array.isArray(response.data) ? response.data : []);
    }
    
    console.warn('Queue service not found, returning empty array');
    return [];
  } catch (error) {
    console.error('Error fetching requests:', error);
    return [];
  }
});

// Add a new service type
export const addNewServiceType = async (serviceType) => {
  try {
    console.log('Adding new service type:', serviceType);
    
    // Validate input
    if (!serviceType || typeof serviceType !== 'string') {
      throw new Error('Invalid service type');
    }

    // Normalize service type (replace spaces with underscores, lowercase)
    const normalizedServiceType = serviceType
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
    
    // First try to use the queue service if available
    if (apiService.queue && typeof apiService.queue.addNewServiceType === 'function') {
      return await apiService.queue.addNewServiceType(normalizedServiceType);
    }
    
    // Fallback to using apiClient directly
    if (apiService.apiClient) {
      const response = await apiService.apiClient.post('/queue/service-types', { 
        service_type: normalizedServiceType 
      });
      return response.data;
    }
    
    // Placeholder implementation if no API method is available
    return { 
      success: true,
      message: "Service type added successfully",
      service_type: normalizedServiceType
    };
  } catch (error) {
    console.error('Error adding service type:', error);
    
    // Return a standardized error response
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to add service type'
    };
  }
};

// Assign a handler to a service type
export const assignHandler = async (serviceType, userId) => {
  try {
    console.log('Assigning handler to service type:', serviceType, 'User ID:', userId);
    
    // Clear relevant caches
    handlersCache.clear();
    
    // First try to use the queue service if available
    if (apiService.queue && typeof apiService.queue.assignHandler === 'function') {
      return await apiService.queue.assignHandler(serviceType, userId);
    }
    
    // Fallback to using apiClient directly
    if (apiService.apiClient) {
      const response = await apiService.apiClient.post('/queue/handlers', {
        service_type: serviceType,
        user_id: userId
      });
      return response.data;
    }
    
    return { message: "Handler assigned successfully" };
  } catch (error) {
    console.error('Error assigning handler:', error);
    throw error;
  }
};

// Remove a handler from a service type
export const removeHandler = async (id) => {
  try {
    console.log('Removing handler with ID:', id);
    
    // Clear relevant caches
    handlersCache.clear();
    
    // First try to use the queue service if available
    if (apiService.queue && typeof apiService.queue.removeHandler === 'function') {
      return await apiService.queue.removeHandler(id);
    }
    
    // Fallback to using apiClient directly
    if (apiService.apiClient) {
      const response = await apiService.apiClient.delete(`/queue/handlers/${id}`);
      return response.data;
    }
    
    return { message: "Handler removed successfully" };
  } catch (error) {
    console.error('Error removing handler:', error);
    throw error;
  }
};

// Assign a request to a handler
export const assignRequestToHandler = async (requestId, userId) => {
  try {
    console.log('Assigning request to handler:', requestId, 'User ID:', userId);
    
    // Clear request cache
    requestsCache.clear();
    
    // First try to use the queue service if available
    if (apiService.queue && typeof apiService.queue.assignRequestToHandler === 'function') {
      return await apiService.queue.assignRequestToHandler(requestId, userId);
    }
    
    // Fallback to using apiClient directly
    if (apiService.apiClient) {
      const response = await apiService.apiClient.put(`/queue/requests/${requestId}/assign`, {
        user_id: userId
      });
      return response.data;
    }
    
    return { message: "Request assigned successfully" };
  } catch (error) {
    console.error('Error assigning request:', error);
    throw error;
  }
};

// Mark request as unable to handle
export const markRequestUnableToHandle = async (requestId) => {
  try {
    console.log('Marking request as unable to handle:', requestId);
    
    // Clear request cache
    requestsCache.clear();
    
    // First try to use the queue service if available
    if (apiService.queue && typeof apiService.queue.markRequestUnableToHandle === 'function') {
      return await apiService.queue.markRequestUnableToHandle(requestId);
    }
    
    // Fallback to using apiClient directly
    if (apiService.apiClient) {
      const response = await apiService.apiClient.put(`/queue/requests/${requestId}/unable-to-handle`);
      return response.data;
    }
    
    return { message: "Request marked as unable to handle" };
  } catch (error) {
    console.error('Error marking request:', error);
    throw error;
  }
};

// Mark request as completed
export const markRequestCompleted = async (requestId) => {
  try {
    console.log('Marking request as completed:', requestId);
    
    // Clear request cache
    requestsCache.clear();
    
    // First try to use the queue service if available
    if (apiService.queue && typeof apiService.queue.markRequestCompleted === 'function') {
      return await apiService.queue.markRequestCompleted(requestId);
    }
    
    // Fallback to using apiClient directly
    if (apiService.apiClient) {
      const response = await apiService.apiClient.put(`/queue/requests/${requestId}/complete`);
      return response.data;
    }
    
    return { message: "Request marked as completed" };
  } catch (error) {
    console.error('Error completing request:', error);
    throw error;
  }
};

// Mark request as under investigation
export const markRequestInvestigating = async (requestId) => {
  try {
    console.log('Marking request for investigation:', requestId);
    
    // Clear request cache
    requestsCache.clear();
    
    // First try to use the queue service if available
    if (apiService.queue && typeof apiService.queue.markRequestInvestigating === 'function') {
      return await apiService.queue.markRequestInvestigating(requestId);
    }
    
    // Fallback to using apiClient directly
    if (apiService.apiClient) {
      const response = await apiService.apiClient.put(`/queue/requests/${requestId}/investigate`);
      return response.data;
    }
    
    return { message: "Request marked for investigation" };
  } catch (error) {
    console.error('Error marking request for investigation:', error);
    throw error;
  }
};

// Send back a request
export const sendBackRequest = async (requestId) => {
  try {
    console.log('Sending back request:', requestId);
    
    // Clear request cache
    requestsCache.clear();
    
    // First try to use the queue service if available
    if (apiService.queue && typeof apiService.queue.sendBackRequest === 'function') {
      return await apiService.queue.sendBackRequest(requestId);
    }
    // Fallback to using apiClient directly
    if (apiService.apiClient) {
      const response = await apiService.apiClient.put(`/queue/requests/${requestId}/send-back`);
      return response.data;
    }
    
    return { message: "Request sent back" };
  } catch (error) {
    console.error('Error sending back request:', error);
    throw error;
  }
};  




// Comprehensive export of all methods
export default {
  fetchHandlers,
  fetchUsers,
  fetchHandlersByServiceType,
  fetchActiveRequestsByServiceType,
  fetchRequests,
  addNewServiceType,
  assignHandler,
  removeHandler,
  assignRequestToHandler,
  markRequestUnableToHandle,
  markRequestCompleted,
  markRequestInvestigating,
  sendBackRequest
};