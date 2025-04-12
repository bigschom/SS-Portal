// src/pages/security-services/control-panel/QueueManagement/api/queueService.js
import apiService from '../../../../../config/api-service';

// Fetch all service handlers
export const fetchHandlers = async () => {
  try {
    const response = await apiService.apiClient.get('/queue/handlers');
    return response.data;
  } catch (error) {
    console.error('Error fetching handlers:', error);
    throw error;
  }
};

// Fetch active users
export const fetchUsers = async () => {
  try {
    const response = await apiService.users.getAllActiveUsers();
    return response.users || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

// Fetch service requests with creator and assignee information
export const fetchRequests = async () => {
  try {
    const response = await apiService.apiClient.get('/queue/requests');
    return response.data;
  } catch (error) {
    console.error('Error fetching requests:', error);
    throw error;
  }
};

// Assign a handler to a service type
export const assignHandler = async (serviceType, userId) => {
  try {
    const response = await apiService.apiClient.post('/queue/handlers', {
      service_type: serviceType,
      user_id: userId
    });
    return response.data;
  } catch (error) {
    console.error('Error assigning handler:', error);
    throw error;
  }
};

// Remove a handler from a service type
export const removeHandler = async (id) => {
  try {
    const response = await apiService.apiClient.delete(`/queue/handlers/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error removing handler:', error);
    throw error;
  }
};

// Assign a request to a handler
export const assignRequestToHandler = async (requestId, userId) => {
  try {
    const response = await apiService.apiClient.put(`/queue/requests/${requestId}/assign`, {
      user_id: userId
    });
    return response.data;
  } catch (error) {
    console.error('Error assigning request:', error);
    throw error;
  }
};

// Mark a request as unable to handle
export const markRequestUnableToHandle = async (requestId) => {
  try {
    const response = await apiService.apiClient.put(`/queue/requests/${requestId}/unable-to-handle`);
    return response.data;
  } catch (error) {
    console.error('Error marking request:', error);
    throw error;
  }
};

// Mark a request as completed
export const markRequestCompleted = async (requestId) => {
  try {
    const response = await apiService.apiClient.put(`/queue/requests/${requestId}/complete`);
    return response.data;
  } catch (error) {
    console.error('Error completing request:', error);
    throw error;
  }
};

// Mark a request as under investigation
export const markRequestInvestigating = async (requestId) => {
  try {
    const response = await apiService.apiClient.put(`/queue/requests/${requestId}/investigate`);
    return response.data;
  } catch (error) {
    console.error('Error marking request for investigation:', error);
    throw error;
  }
};

// Send back a request
export const sendBackRequest = async (requestId) => {
  try {
    const response = await apiService.apiClient.put(`/queue/requests/${requestId}/send-back`);
    return response.data;
  } catch (error) {
    console.error('Error sending back request:', error);
    throw error;
  }
};
