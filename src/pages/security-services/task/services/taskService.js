// src/pages/security-services/task/services/taskService.js
import apiClient from '../../../../config/api-service';

// Helper function to format error messages
const formatError = (error) => {
  const message = error.response?.data?.message || error.message || 'An unknown error occurred';
  return { error: message };
};

// Helper function to ensure a value is an array
const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && value.data && Array.isArray(value.data)) return value.data;
  return [];
};

const taskService = {
  // Fetch all requests based on user ID and filters
  fetchRequests: async (userId) => {
    try {
      if (!userId) {
        return {
          available: [],
          assigned: [],
          submitted: [],
          sentBack: []
        };
      }
      
      // Fetch requests in parallel using the proper API endpoints
      const [availableResponse, assignedResponse, submittedResponse, sentBackResponse] = await Promise.all([
        // Available requests
        apiClient.tasks.getAvailableRequests(userId),
        
        // Assigned requests
        apiClient.tasks.getAssignedRequests(userId),
        
        // Submitted requests
        apiClient.tasks.getSubmittedRequests(userId),
        
        // Sent back requests
        apiClient.tasks.getSentBackRequests(userId)
      ]);

      return {
        available: ensureArray(availableResponse),
        assigned: ensureArray(assignedResponse),
        submitted: ensureArray(submittedResponse),
        sentBack: ensureArray(sentBackResponse)
      };
    } catch (error) {
      console.error('Error fetching requests:', error);
      return {
        available: [],
        assigned: [],
        submitted: [],
        sentBack: []
      };
    }
  },

  // Assign a request to a user
  assignRequest: async (requestId, userId) => {
    try {
      if (!requestId || !userId) {
        return { error: 'Request ID and User ID are required' };
      }
      
      // Use the API to claim the request
      const response = await apiClient.tasks.claimRequest(requestId, userId);
      
      if (!response || response.error) {
        throw new Error(response?.error || 'Failed to assign request');
      }
      
      return response;
    } catch (error) {
      console.error('Error assigning request:', error);
      return formatError(error);
    }
  },

  // Update request status
  updateStatus: async (requestId, status, userId, additionalData = {}) => {
    try {
      if (!requestId || !status || !userId) {
        return { error: 'Request ID, status, and User ID are required' };
      }
      
      // Use the API to update the status
      const response = await apiClient.tasks.updateRequestStatus(
        requestId, 
        status, 
        userId,
        additionalData
      );
      
      if (!response || response.error) {
        throw new Error(response?.error || 'Failed to update status');
      }
      
      return response;
    } catch (error) {
      console.error('Error updating status:', error);
      return formatError(error);
    }
  },

  // Submit response to a request
  submitResponse: async (requestId, response, userId) => {
    try {
      if (!requestId || !response || !userId) {
        return { error: 'Request ID, response, and User ID are required' };
      }
      
      // First add the comment
      const commentResponse = await apiClient.tasks.addComment(requestId, userId, response);
      
      if (!commentResponse || commentResponse.error) {
        throw new Error(commentResponse?.error || 'Failed to add comment');
      }
      
      // Then update the status to completed
      const statusResponse = await apiClient.tasks.updateRequestStatus(
        requestId, 
        'completed', 
        userId
      );
      
      if (!statusResponse || statusResponse.error) {
        throw new Error(statusResponse?.error || 'Failed to update status');
      }
      
      return statusResponse;
    } catch (error) {
      console.error('Error submitting response:', error);
      return formatError(error);
    }
  },

  // Send back request to requestor
  sendBackToRequestor: async (requestId, comment, userId) => {
    try {
      if (!requestId || !comment || !userId) {
        return { error: 'Request ID, comment, and User ID are required' };
      }
      
      // First add the send back reason comment
      const commentResponse = await apiClient.tasks.addComment(requestId, userId, comment, true);
      
      if (!commentResponse || commentResponse.error) {
        throw new Error(commentResponse?.error || 'Failed to add send back reason');
      }
      
      // Then update the status to sent_back
      const statusResponse = await apiClient.tasks.updateRequestStatus(
        requestId, 
        'sent_back', 
        userId, 
        { assigned_to: null }
      );
      
      if (!statusResponse || statusResponse.error) {
        throw new Error(statusResponse?.error || 'Failed to update status');
      }
      
      return statusResponse;
    } catch (error) {
      console.error('Error sending back request:', error);
      return formatError(error);
    }
  },

  // Save edited request
  saveEditedRequest: async (requestId, editedData, userId) => {
    try {
      if (!requestId || !editedData || !userId) {
        return { error: 'Request ID, edited data, and User ID are required' };
      }
      
      // Use the API to update request data
      const response = await apiClient.tasks.updateRequestData(requestId, {
        ...editedData,
        updated_by: userId
      });
      
      if (!response || response.error) {
        throw new Error(response?.error || 'Failed to save edited request');
      }
      
      return response;
    } catch (error) {
      console.error('Error saving edited request:', error);
      return formatError(error);
    }
  },

  // Auto-return tasks that have been inactive for too long
  autoReturnTask: async (requestId, userId) => {
    try {
      if (!requestId || !userId) {
        return { error: 'Request ID and User ID are required' };
      }
      
      // Return the task to the queue by setting assigned_to to null and status to new
      const response = await apiClient.tasks.updateRequestStatus(
        requestId,
        'new',
        userId,
        { 
          assigned_to: null,
          details: 'Request automatically returned to available queue due to inactivity.'
        }
      );
      
      if (!response || response.error) {
        throw new Error(response?.error || 'Failed to auto-return task');
      }
      
      return response;
    } catch (error) {
      console.error('Error auto-returning task:', error);
      return formatError(error);
    }
  }
};

export default taskService;