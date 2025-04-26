// src/pages/security-services/task/context/TaskContext.jsx
import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import apiService from '../../../../config/api-service';
import { REQUEST_STATUS } from '../utils/taskConstants';

// Create a mock implementation of the tasks API for fallback
const mockTasks = {
  getAvailableRequests: async (userId) => {
    console.log('Using mock getAvailableRequests for user:', userId);
    return [];
  },
  getAssignedRequests: async (userId, status = null) => {
    console.log('Using mock getAssignedRequests for user:', userId, 'status:', status);
    return [];
  },
  getSubmittedRequests: async (userId) => {
    console.log('Using mock getSubmittedRequests for user:', userId);
    return [];
  },
  getSentBackRequests: async (userId) => {
    console.log('Using mock getSentBackRequests for user:', userId);
    return [];
  },
  claimRequest: async (requestId, userId) => {
    console.log('Using mock claimRequest:', requestId, 'for user:', userId);
    return { success: true };
  },
  updateRequestStatus: async (requestId, status, userId, additionalData = {}) => {
    console.log('Using mock updateRequestStatus:', requestId, status, userId, additionalData);
    return { success: true };
  },
  addComment: async (requestId, userId, comment, isSendBackReason = false) => {
    console.log('Using mock addComment:', requestId, userId, comment, isSendBackReason);
    return { success: true };
  },
  updateRequestData: async (requestId, data) => {
    console.log('Using mock updateRequestData:', requestId, data);
    return { success: true };
  }
};

const TaskContext = createContext(null);

const initialState = {
  requests: {
    available: [],
    assigned: [],
    submitted: [],
    sentBack: [],
    completed: []
  },
  loading: true,
  polling: false,
  error: null,
  success: null
};

const taskReducer = (state, action) => {
  switch (action.type) {
    case 'SET_REQUESTS':
      return {
        ...state,
        requests: action.payload
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    case 'SET_POLLING':
      return {
        ...state,
        polling: action.payload
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
  const { user } = useAuth();
  const lastFetchTimeRef = useRef(Date.now());
  const fetchThrottleMs = 5000; // Minimum time between fetches (5 seconds)

  // Explicitly check if the API methods exist and use mocks if they don't
  const getTaskService = () => {
    // Check if apiService.tasks exists and has the required methods
    if (apiService && apiService.tasks && typeof apiService.tasks.getAvailableRequests === 'function') {
      console.log('Using real API service tasks methods');
      return apiService.tasks;
    }
    
    // If apiService.tasks doesn't exist or doesn't have the required methods, use mockTasks
    console.log('Using mock tasks service methods');
    return mockTasks;
  };

  const fetchRequests = useCallback(async (force = false) => {
    if (!user) return;

    // Throttle fetches unless forced
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current < fetchThrottleMs) {
      console.log('Throttling fetch requests - too soon since last fetch');
      return;
    }
    
    lastFetchTimeRef.current = now;
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Get the appropriate task service
      const tasks = getTaskService();
      
      // Fetch all request types in parallel
      const [available, assigned, submitted, sentBack, completed] = await Promise.all([
        // Available requests
        tasks.getAvailableRequests(user.id),
        
        // Assigned requests
        tasks.getAssignedRequests(user.id),
        
        // Submitted requests
        tasks.getSubmittedRequests(user.id),
        
        // Sent back requests
        tasks.getSentBackRequests(user.id),
        
        // Completed requests (subset of assigned)
        tasks.getAssignedRequests(user.id, REQUEST_STATUS.COMPLETED)
      ]);

      dispatch({
        type: 'SET_REQUESTS',
        payload: {
          available: available || [],
          assigned: assigned?.filter(req => 
            req.status !== REQUEST_STATUS.COMPLETED) || [],
          submitted: submitted || [],
          sentBack: sentBack || [],
          completed: completed || []
        }
      });
    } catch (error) {
      console.error('Error in fetchRequests:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load requests. Please try again.' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user]);

  const claimRequest = useCallback(async (requestId) => {
    if (!user || !requestId) return false;
    
    try {
      const tasks = getTaskService();
      await tasks.claimRequest(requestId, user.id);
      await fetchRequests(true);
      return true;
    } catch (error) {
      console.error('Error claiming request:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to claim request. Please try again.' });
      return false;
    }
  }, [user, fetchRequests]);

  const updateRequestStatus = useCallback(async (requestId, status, additionalData = {}) => {
    if (!user || !requestId) return false;
    
    try {
      const tasks = getTaskService();
      await tasks.updateRequestStatus(requestId, status, user.id, additionalData);
      await fetchRequests(true);
      return true;
    } catch (error) {
      console.error('Error updating request status:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update request status. Please try again.' });
      return false;
    }
  }, [user, fetchRequests]);

  const addComment = useCallback(async (requestId, comment, isSendBackReason = false) => {
    if (!user || !requestId || !comment) return false;
    
    try {
      const tasks = getTaskService();
      await tasks.addComment(requestId, user.id, comment, isSendBackReason);
      await fetchRequests(true);
      return true;
    } catch (error) {
      console.error('Error adding comment:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add comment. Please try again.' });
      return false;
    }
  }, [user, fetchRequests]);

  const updateRequest = useCallback(async (requestId, data) => {
    if (!user || !requestId) return false;
    
    try {
      const tasks = getTaskService();
      await tasks.updateRequestData(requestId, data);
      await fetchRequests(true);
      return true;
    } catch (error) {
      console.error('Error updating request:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update request. Please try again.' });
      return false;
    }
  }, [user, fetchRequests]);

  const setError = useCallback((message) => {
    dispatch({ type: 'SET_ERROR', payload: message });
  }, []);

  const setSuccess = useCallback((message) => {
    dispatch({ type: 'SET_SUCCESS', payload: message });
  }, []);

  const clearMessages = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  }, []);

  // Setup polling for real-time updates (replacement for Supabase subscription)
  useEffect(() => {
    let pollingInterval;
    
    const startPolling = () => {
      // Poll every 30 seconds instead of 10 seconds
      pollingInterval = setInterval(() => {
        if (!state.loading && user && document.visibilityState === 'visible') {
          dispatch({ type: 'SET_POLLING', payload: true });
          fetchRequests().finally(() => {
            dispatch({ type: 'SET_POLLING', payload: false });
          });
        }
      }, 30000); // 30 seconds
    };
    
    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Fetch immediately when tab becomes visible
        fetchRequests(true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    startPolling();
    
    // Fetch initial data
    if (user) {
      fetchRequests(true);
    }
    
    return () => {
      clearInterval(pollingInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchRequests, user, state.loading]);

  // Auto-dismiss notifications
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => clearMessages(), 10000);
      return () => clearTimeout(timer);
    }
  }, [state.error, clearMessages]);

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => clearMessages(), 5000);
      return () => clearTimeout(timer);
    }
  }, [state.success, clearMessages]);

  const value = {
    ...state,
    fetchRequests: (force) => fetchRequests(force),
    claimRequest,
    updateRequestStatus,
    addComment,
    updateRequest,
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
