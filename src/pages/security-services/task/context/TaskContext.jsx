// src/pages/security-services/task/context/TaskContext.jsx
import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import apiClient from '../../../../config/api-service';
import { REQUEST_STATUS } from '../utils/taskConstants';

const TaskContext = createContext(null);

const initialState = {
  requests: {
    available: [],
    assigned: [],
    submitted: [],
    sentBack: []
  },
  loading: true,
  error: null,
  success: null,
  actionLoading: {}
};

// Helper function to ensure arrays
const ensureArray = (data) => {
  if (Array.isArray(data)) return data;
  return [];
};

const taskReducer = (state, action) => {
  switch (action.type) {
    case 'SET_REQUESTS':
      return {
        ...state,
        requests: {
          available: ensureArray(action.payload.available),
          assigned: ensureArray(action.payload.assigned),
          submitted: ensureArray(action.payload.submitted),
          sentBack: ensureArray(action.payload.sentBack)
        }
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    case 'SET_ACTION_LOADING':
      return {
        ...state,
        actionLoading: {
          ...state.actionLoading,
          [action.payload.id]: action.payload.status
        }
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        success: null
      };
    case 'SET_SUCCESS':
      return {
        ...state,
        success: action.payload,
        error: null
      };
    case 'CLEAR_MESSAGES':
      return {
        ...state,
        error: null,
        success: null
      };
    default:
      return state;
  }
};

export const TaskProvider = ({ children }) => {
  const [state, dispatch] = useReducer(taskReducer, initialState);

  const fetchRequests = useCallback(async (userId) => {
    if (!userId) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Fetch all request types in parallel
      const [available, assigned, submitted, sentBack] = await Promise.all([
        apiClient.tasks.getAvailableRequests(userId),
        apiClient.tasks.getAssignedRequests(userId),
        apiClient.tasks.getSubmittedRequests(userId),
        apiClient.tasks.getSentBackRequests(userId)
      ]);
      
      dispatch({
        type: 'SET_REQUESTS',
        payload: {
          available, 
          assigned, 
          submitted, 
          sentBack
        }
      });
    } catch (error) {
      console.error('Error in fetchRequests:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load requests. Please try again.' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const assignRequest = useCallback(async (request, userId) => {
    dispatch({ 
      type: 'SET_ACTION_LOADING', 
      payload: { id: request.id, status: true } 
    });
    try {
      const result = await apiClient.tasks.claimRequest(request.id, userId);
      
      if (result && result.error) {
        throw new Error(result.error);
      }
      
      await fetchRequests(userId);
      dispatch({ type: 'SET_SUCCESS', payload: 'Request assigned successfully' });
      
      return result;
    } catch (error) {
      console.error('Error in assignRequest:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to assign request. Please try again.' });
      throw error;
    } finally {
      dispatch({ 
        type: 'SET_ACTION_LOADING', 
        payload: { id: request.id, status: false } 
      });
    }
  }, [fetchRequests]);

  const updateStatus = useCallback(async (requestId, status, userId) => {
    dispatch({ 
      type: 'SET_ACTION_LOADING', 
      payload: { id: requestId, status: true } 
    });
    try {
      const result = await apiClient.tasks.updateRequestStatus(requestId, status, userId);
      
      if (result && result.error) {
        throw new Error(result.error);
      }
      
      await fetchRequests(userId);
      dispatch({ type: 'SET_SUCCESS', payload: `Request ${status.replace('_', ' ')}` });
      
      return result;
    } catch (error) {
      console.error('Error in updateStatus:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update status. Please try again.' });
      throw error;
    } finally {
      dispatch({ 
        type: 'SET_ACTION_LOADING', 
        payload: { id: requestId, status: false } 
      });
    }
  }, [fetchRequests]);

  const submitResponse = useCallback(async (requestId, response, userId) => {
    dispatch({ 
      type: 'SET_ACTION_LOADING', 
      payload: { id: requestId, status: true } 
    });
    try {
      // First add the comment
      const commentResult = await apiClient.tasks.addComment(requestId, userId, response);
      
      if (commentResult && commentResult.error) {
        throw new Error(commentResult.error);
      }
      
      // Then update the status to completed
      const result = await apiClient.tasks.updateRequestStatus(requestId, 'completed', userId);
      
      if (result && result.error) {
        throw new Error(result.error);
      }
      
      await fetchRequests(userId);
      dispatch({ type: 'SET_SUCCESS', payload: 'Request completed successfully' });
      
      return result;
    } catch (error) {
      console.error('Error in submitResponse:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to submit response. Please try again.' });
      throw error;
    } finally {
      dispatch({ 
        type: 'SET_ACTION_LOADING', 
        payload: { id: requestId, status: false } 
      });
    }
  }, [fetchRequests]);

  const sendBackToRequestor = useCallback(async (requestId, comment, userId) => {
    dispatch({ 
      type: 'SET_ACTION_LOADING', 
      payload: { id: requestId, status: true } 
    });
    try {
      // Add the comment with send back reason flag
      const commentResult = await apiClient.tasks.addComment(requestId, userId, comment, true);
      
      if (commentResult && commentResult.error) {
        throw new Error(commentResult.error);
      }
      
      // Update the status to sent_back and clear assigned_to
      const result = await apiClient.tasks.updateRequestStatus(
        requestId, 
        'sent_back', 
        userId,
        { assigned_to: null }
      );
      
      if (result && result.error) {
        throw new Error(result.error);
      }
      
      await fetchRequests(userId);
      dispatch({ type: 'SET_SUCCESS', payload: 'Request sent back for correction' });
      
      return result;
    } catch (error) {
      console.error('Error in sendBackToRequestor:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to send request back. Please try again.' });
      throw error;
    } finally {
      dispatch({ 
        type: 'SET_ACTION_LOADING', 
        payload: { id: requestId, status: false } 
      });
    }
  }, [fetchRequests]);

  const saveEditedRequest = useCallback(async (requestId, editedData, userId) => {
    dispatch({ 
      type: 'SET_ACTION_LOADING', 
      payload: { id: requestId, status: true } 
    });
    try {
      const result = await apiClient.tasks.updateRequestData(requestId, {
        ...editedData,
        updated_by: userId,
        status: 'new'
      });
      
      if (result && result.error) {
        throw new Error(result.error);
      }
      
      await fetchRequests(userId);
      dispatch({ type: 'SET_SUCCESS', payload: 'Request updated successfully' });
      
      return result;
    } catch (error) {
      console.error('Error in saveEditedRequest:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to save changes. Please try again.' });
      throw error;
    } finally {
      dispatch({ 
        type: 'SET_ACTION_LOADING', 
        payload: { id: requestId, status: false } 
      });
    }
  }, [fetchRequests]);

  const autoReturnTask = useCallback(async (request, userId) => {
    try {
      if (request && request.status === REQUEST_STATUS.IN_PROGRESS && request.updated_at) {
        const assignedTime = new Date(request.updated_at).getTime();
        const currentTime = new Date().getTime();
        
        // 30 minutes in milliseconds
        if (currentTime - assignedTime > 30 * 60 * 1000) {
          await apiClient.tasks.updateRequestStatus(
            request.id,
            'new',
            userId,
            {
              assigned_to: null,
              details: 'Request automatically returned due to inactivity'
            }
          );
          await fetchRequests(userId);
        }
      }
    } catch (error) {
      console.error('Error in autoReturnTask:', error);
    }
  }, [fetchRequests]);

  const checkTimeouts = useCallback(async (userId) => {
    const { assigned } = state.requests;
    if (Array.isArray(assigned)) {
      for (const request of assigned) {
        await autoReturnTask(request, userId);
      }
    }
  }, [state.requests, autoReturnTask]);

  // Set up auto-refresh interval to check for timeouts
  useEffect(() => {
    let interval;
    const userStr = sessionStorage.getItem('user');
    let userId = null;
    
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        userId = userData.id;
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    if (userId && Array.isArray(state.requests.assigned) && state.requests.assigned.length > 0) {
      interval = setInterval(() => {
        checkTimeouts(userId);
      }, 60000); // Check every minute
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.requests.assigned, checkTimeouts]);

  const setError = useCallback((message) => {
    dispatch({ type: 'SET_ERROR', payload: message });
  }, []);

  const setSuccess = useCallback((message) => {
    dispatch({ type: 'SET_SUCCESS', payload: message });
  }, []);

  const clearMessages = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  }, []);

  // Auto-dismiss messages after a delay
  useEffect(() => {
    let timer;
    if (state.success) {
      timer = setTimeout(() => clearMessages(), 5000);
    } else if (state.error) {
      timer = setTimeout(() => clearMessages(), 10000);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [state.success, state.error, clearMessages]);

  const value = {
    ...state,
    fetchRequests,
    assignRequest,
    updateStatus,
    submitResponse,
    sendBackToRequestor,
    saveEditedRequest,
    setError,
    setSuccess,
    clearMessages
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

export const useTask = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
};