// src/context/TaskContext.jsx
import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import apiService from '../config/api-service';
import { REQUEST_STATUS } from '../utils/constants';
import { debounce, throttle } from '../utils/helpers';

const TaskContext = createContext(null);

const initialState = {
  requests: {
    available: [],
    assigned: [],
    submitted: [],
    sentBack: [],
    completed: []
  },
  lastUpdated: {
    available: 0,
    assigned: 0,
    submitted: 0,
    sentBack: 0,
    completed: 0
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
        requests: action.payload,
        lastUpdated: Object.keys(action.payload).reduce((acc, key) => {
          acc[key] = Date.now();
          return acc;
        }, {...state.lastUpdated})
      };
    case 'UPDATE_REQUEST_CATEGORY':
      return {
        ...state,
        requests: {
          ...state.requests,
          [action.category]: action.payload
        },
        lastUpdated: {
          ...state.lastUpdated,
          [action.category]: Date.now()
        }
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
  
  // Refs for fetch control - defined at the component level, not inside hooks
  const lastFetchTimeRef = useRef({
    any: Date.now(),
    available: 0,
    assigned: 0,
    submitted: 0,
    sentBack: 0,
    completed: 0
  });
  
  const fetchInProgressRef = useRef({
    any: false,
    available: false,
    assigned: false,
    submitted: false,
    sentBack: false,
    completed: false
  });
  
  const abortControllersRef = useRef({
    available: null,
    assigned: null,
    submitted: null,
    sentBack: null,
    completed: null
  });
  
  // Ref to prevent the effect from running more than once - at component level
  const shouldSkipEffectRef = useRef(false);
  
  // Constants for fetch control
  const FETCH_THROTTLE_MS = 5000; // 5 seconds between fetch requests
  const BACKGROUND_FETCH_INTERVAL_MS = 120000; // 2 minutes between background fetches
  const STALE_DATA_MS = 300000; // 5 minutes before data is considered stale
  const PRIORITY_ORDER = ['available', 'assigned', 'submitted', 'sentBack', 'completed'];

  // Helper to check if data is stale
  const isDataStale = useCallback((category) => {
    const lastUpdate = state.lastUpdated[category] || 0;
    return Date.now() - lastUpdate > STALE_DATA_MS;
  }, [state.lastUpdated]);

  // Helper function to fetch a specific category of data
  const fetchCategoryData = useCallback(async (category, force = false) => {
    if (!user) return null;
    
    // Skip if fetch already in progress for this category and not forced
    if (fetchInProgressRef.current[category] && !force) {
      console.log(`Fetch already in progress for ${category}, skipping`);
      return null;
    }
    
    // Throttle fetches unless forced
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current[category] < FETCH_THROTTLE_MS) {
      console.log(`Throttling fetch for ${category} - too soon since last fetch`);
      return null;
    }
    
    // Update fetch tracking
    lastFetchTimeRef.current[category] = now;
    lastFetchTimeRef.current.any = now;
    fetchInProgressRef.current[category] = true;
    fetchInProgressRef.current.any = true;
    
    // Cancel any existing fetch for this category
    if (abortControllersRef.current[category]) {
      abortControllersRef.current[category].abort();
    }
    
    // Create new abort controller
    abortControllersRef.current[category] = new AbortController();
    const { signal } = abortControllersRef.current[category];
    
    try {
      let result;
      
      // Use the appropriate API method based on category
      switch (category) {
        case 'available':
          result = await apiService.tasks.getAvailableRequests(user.id);
          break;
        case 'assigned':
          result = await apiService.tasks.getAssignedRequests(user.id);
          break;
        case 'completed':
          result = await apiService.tasks.getAssignedRequests(user.id, REQUEST_STATUS.COMPLETED);
          break;
        case 'submitted':
          result = await apiService.tasks.getSubmittedRequests(user.id);
          break;
        case 'sentBack':
          result = await apiService.tasks.getSentBackRequests(user.id);
          break;
        default:
          console.warn(`Unknown category: ${category}`);
          return null;
      }
      
      // Update state if the request wasn't aborted
      if (!signal.aborted) {
        dispatch({
          type: 'UPDATE_REQUEST_CATEGORY',
          category,
          payload: result || []
        });
        return result;
      }
      
      return null;
    } catch (error) {
      // Only log error if not aborted
      if (error.name !== 'AbortError') {
        console.error(`Error fetching ${category} requests:`, error);
      }
      return null;
    } finally {
      // Reset fetch state if this is still the current fetch
      if (abortControllersRef.current[category]?.signal === signal || signal.aborted) {
        fetchInProgressRef.current[category] = false;
        
        // Check if all categories are done
        const anyInProgress = Object.values(fetchInProgressRef.current).some(Boolean);
        if (!anyInProgress || anyInProgress === false) {
          fetchInProgressRef.current.any = false;
        }
        
        if (signal.aborted) {
          abortControllersRef.current[category] = null;
        }
      }
    }
  }, [user]);

  // Main fetch function with sequential API calls and proper error handling
  const fetchRequests = useCallback(async (force = false) => {
    if (!user) return;
    
    // Skip if this is not forced and already in progress
    if (fetchInProgressRef.current.any && !force) {
      console.log('Fetch already in progress, skipping');
      return;
    }
    
    // Throttle fetches unless forced
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current.any < FETCH_THROTTLE_MS) {
      console.log('Throttling fetch requests - too soon since last fetch');
      return;
    }
    
    // Update tracking
    lastFetchTimeRef.current.any = now;
    fetchInProgressRef.current.any = true;
    
    // For initial or forced load, show loading
    if (force) {
      dispatch({ type: 'SET_LOADING', payload: true });
    } else {
      dispatch({ type: 'SET_POLLING', payload: true });
    }
    
    try {
      console.log('Using real API service tasks methods');
      
      // Use sequential calls with explicit try/catch blocks and delays between
      try {
        const available = await apiService.tasks.getAvailableRequests(user.id);
        dispatch({
          type: 'UPDATE_REQUEST_CATEGORY',
          category: 'available',
          payload: available || []
        });
      } catch (error) {
        console.error('Error fetching available requests:', error);
      }
      
      // Wait a bit before the next call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const assigned = await apiService.tasks.getAssignedRequests(user.id);
        dispatch({
          type: 'UPDATE_REQUEST_CATEGORY',
          category: 'assigned',
          payload: assigned?.filter(req => 
            req.status !== REQUEST_STATUS.COMPLETED) || []
        });
      } catch (error) {
        console.error('Error fetching assigned requests:', error);
      }
      
      // Wait a bit before the next call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const completed = await apiService.tasks.getAssignedRequests(user.id, REQUEST_STATUS.COMPLETED);
        dispatch({
          type: 'UPDATE_REQUEST_CATEGORY',
          category: 'completed',
          payload: completed || []
        });
      } catch (error) {
        console.error('Error fetching completed requests:', error);
      }
      
      // Wait a bit before the next call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const submitted = await apiService.tasks.getSubmittedRequests(user.id);
        dispatch({
          type: 'UPDATE_REQUEST_CATEGORY',
          category: 'submitted',
          payload: submitted || []
        });
      } catch (error) {
        console.error('Error fetching submitted requests:', error);
      }
      
      // Wait a bit before the next call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const sentBack = await apiService.tasks.getSentBackRequests(user.id);
        dispatch({
          type: 'UPDATE_REQUEST_CATEGORY',
          category: 'sentBack',
          payload: sentBack || []
        });
      } catch (error) {
        console.error('Error fetching sent back requests:', error);
      }
      
    } catch (error) {
      console.error('Error in fetchRequests:', error);
      if (force) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load requests. Please try again.' });
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_POLLING', payload: false });
      fetchInProgressRef.current.any = false;
    }
  }, [user]); // IMPORTANT: Remove dependencies that might cause re-renders

  // Function to claim a request
  const claimRequest = useCallback(async (requestId) => {
    if (!user || !requestId) return false;
    
    try {
      await apiService.tasks.claimRequest(requestId, user.id);
      
      // Only refresh the affected categories
      await Promise.all([
        fetchCategoryData('available', true),
        fetchCategoryData('assigned', true)
      ]);
      
      return true;
    } catch (error) {
      console.error('Error claiming request:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to claim request. Please try again.' });
      return false;
    }
  }, [user, fetchCategoryData]);

  // Function to update request status
  const updateRequestStatus = useCallback(async (requestId, status, additionalData = {}) => {
    if (!user || !requestId) return false;
    
    try {
      await apiService.tasks.updateRequestStatus(requestId, status, user.id, additionalData);
      
      // Determine which categories to refresh based on the new status
      const categoriesToRefresh = ['assigned']; // Always refresh assigned
      
      if (status === REQUEST_STATUS.COMPLETED) {
        categoriesToRefresh.push('completed');
      } else if (status === REQUEST_STATUS.NEW) {
        categoriesToRefresh.push('available');
      } else if (status === REQUEST_STATUS.SENT_BACK) {
        categoriesToRefresh.push('sentBack');
      }
      
      // Refresh only necessary categories
      await Promise.all(categoriesToRefresh.map(category => 
        fetchCategoryData(category, true)
      ));
      
      return true;
    } catch (error) {
      console.error('Error updating request status:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update request status. Please try again.' });
      return false;
    }
  }, [user, fetchCategoryData]);

  // Function to add a comment
  const addComment = useCallback(async (requestId, comment, isSendBackReason = false) => {
    if (!user || !requestId || !comment) return false;
    
    try {
      await apiService.tasks.addComment(requestId, user.id, comment, isSendBackReason);
      
      // Refresh only the categories that could be affected
      const categoriesToRefresh = isSendBackReason 
        ? ['assigned', 'sentBack']
        : ['assigned'];
        
      await Promise.all(categoriesToRefresh.map(category => 
        fetchCategoryData(category, true)
      ));
      
      return true;
    } catch (error) {
      console.error('Error adding comment:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add comment. Please try again.' });
      return false;
    }
  }, [user, fetchCategoryData]);

  // Function to update request data
  const updateRequest = useCallback(async (requestId, data) => {
    if (!user || !requestId) return false;
    
    try {
      await apiService.tasks.updateRequestData(requestId, { ...data, updated_by: user.id });
      
      // Determine which categories to refresh based on the updated data
      const categoriesToRefresh = [];
      
      // Always refresh assigned requests
      categoriesToRefresh.push('assigned');
      
      // If status changed, refresh the appropriate categories
      if (data.status) {
        if (data.status === REQUEST_STATUS.COMPLETED) {
          categoriesToRefresh.push('completed');
        } else if (data.status === REQUEST_STATUS.NEW) {
          categoriesToRefresh.push('available');
        } else if (data.status === REQUEST_STATUS.SENT_BACK) {
          categoriesToRefresh.push('sentBack');
        }
      }
      
      // If assigned_to changed, refresh available requests
      if ('assigned_to' in data && data.assigned_to === null) {
        categoriesToRefresh.push('available');
      }
      
      // Make sure categories are unique
      const uniqueCategories = [...new Set(categoriesToRefresh)];
      
      // Refresh only necessary categories
      await Promise.all(uniqueCategories.map(category => 
        fetchCategoryData(category, true)
      ));
      
      return true;
    } catch (error) {
      console.error('Error updating request:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update request. Please try again.' });
      return false;
    }
  }, [user, fetchCategoryData]);

  // Setup optimized polling for real-time updates - FIXED VERSION
  useEffect(() => {
    // Skip if we've already run this effect
    if (shouldSkipEffectRef.current) {
      return;
    }
    
    let pollingInterval;
    let isComponentMounted = true;
    
    if (user) {
      // Initial fetch with delay to prevent startup congestion
      const initialFetchTimeout = setTimeout(() => {
        if (isComponentMounted) {
          // Use a try/catch to prevent crashes
          try {
            fetchRequests(true);
          } catch (error) {
            console.error("Error in initial fetch:", error);
          }
        }
      }, 2000);
      
      // Set up more conservative polling interval (2 minutes)
      pollingInterval = setInterval(() => {
        if (document.visibilityState === 'visible' && isComponentMounted) {
          // Always check if we should skip to prevent loops
          if (!fetchInProgressRef.current.any) {
            try {
              console.log('Running scheduled polling');
              fetchRequests(false);
            } catch (error) {
              console.error("Error in polling interval:", error);
            }
          }
        }
      }, 120000); // 2 minutes
      
      // Define a properly debounced visibility handler
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && isComponentMounted) {
          if (!fetchInProgressRef.current.any) {
            setTimeout(() => {
              try {
                fetchRequests(false);
              } catch (error) {
                console.error("Error in visibility change handler:", error);
              }
            }, 3000); // Delay after tab becomes visible
          }
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Clean up
      return () => {
        isComponentMounted = false;
        clearTimeout(initialFetchTimeout);
        clearInterval(pollingInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        
        // Cancel any in-flight requests
        Object.values(abortControllersRef.current).forEach(controller => {
          if (controller) controller.abort();
        });
      };
    }
    
    // Mark this effect as completed to prevent re-running
    shouldSkipEffectRef.current = true;
    
  }, [user]); // IMPORTANT: Removed fetchRequests from dependencies

  // Helper functions for UI feedback
  const setError = useCallback((message) => {
    dispatch({ type: 'SET_ERROR', payload: message });
  }, []);

  const setSuccess = useCallback((message) => {
    dispatch({ type: 'SET_SUCCESS', payload: message });
  }, []);

  const clearMessages = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  }, []);

  // Smart auto-dismiss for messages based on length and importance
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => clearMessages(), 
        state.error.length > 50 ? 15000 : 10000); // Longer for detailed errors
      return () => clearTimeout(timer);
    }
  }, [state.error, clearMessages]);

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => clearMessages(), 5000);
      return () => clearTimeout(timer);
    }
  }, [state.success, clearMessages]);

  // Provide context value
  const value = {
    ...state,
    fetchRequests,
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

// Custom hook to use the task context
export const useTask = () => {
  const context = useContext(TaskContext);
  if (context === null) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
};