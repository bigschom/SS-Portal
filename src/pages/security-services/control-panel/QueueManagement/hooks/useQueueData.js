// src/hooks/useQueueData.js
import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchHandlers, fetchUsers, fetchRequests } from '../api/queueService';

// Create a custom error handler
const handleFetchError = (error, toast, context) => {
  console.error(`Data fetch error for ${context}:`, error);
  
  if (toast) {
    toast({
      variant: 'destructive',
      title: 'Data Fetch Error',
      description: `Failed to fetch ${context}. Please check your connection.`
    });
  }
  
  // Return an empty array to prevent breaking the application
  return [];
};

export const useQueueData = (toast, refreshInterval = 300000) => {
  const [state, setState] = useState({
    loading: true,
    handlers: [],
    users: [],
    newRequests: [],
    unhandledRequests: [],
    pendingRequests: [],
    investigatingRequests: [],
    completedRequests: [],
    sentBackRequests: [],
    statistics: {
      totalRequests: 0,
      pendingRequests: 0,
      completedRequests: 0,
      averageResolutionTime: 0
    }
  });

  const lastFetchTime = useRef(0);
  const isMounted = useRef(true);

  // Calculate average resolution time
  const calculateAverageResolutionTime = useCallback((requests) => {
    if (!requests || !Array.isArray(requests)) return 0;
    
    const completedRequests = requests.filter(r => r && r.status === 'completed');
    if (completedRequests.length === 0) return 0;

    const totalResolutionTime = completedRequests.reduce((total, request) => {
      const createdAt = new Date(request.created_at);
      const completedAt = new Date(request.completed_at || Date.now());
      return total + (completedAt - createdAt) / (1000 * 60 * 60); // Convert to hours
    }, 0);

    return Math.round(totalResolutionTime / completedRequests.length);
  }, []);

  // Fetch data with comprehensive error handling
  const fetchData = useCallback(async (force = false) => {
    const now = Date.now();
    
    // Prevent too frequent requests
    if (!force && now - lastFetchTime.current < 5000) {
      console.log('Skipping fetch: Too recent');
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true }));

      // Parallel data fetching with error handling
      let handlerData = [], userData = [], requestData = [];
      
      try {
        [handlerData, userData, requestData] = await Promise.all([
          (typeof fetchHandlers === 'function' ? fetchHandlers() : Promise.resolve([]))
            .catch(error => handleFetchError(error, toast, 'handlers')),
          (typeof fetchUsers === 'function' ? fetchUsers() : Promise.resolve([]))
            .catch(error => handleFetchError(error, toast, 'users')),
          (typeof fetchRequests === 'function' ? fetchRequests() : Promise.resolve([]))
            .catch(error => handleFetchError(error, toast, 'requests'))
        ]);
      } catch (promiseError) {
        console.error('Error in Promise.all:', promiseError);
        // Continue with default empty arrays
      }

      if (!isMounted.current) return;

      // Ensure all data is defined and is an array
      handlerData = Array.isArray(handlerData) ? handlerData : [];
      userData = Array.isArray(userData) ? userData : [];
      requestData = Array.isArray(requestData) ? requestData : [];

      // Categorize requests with fallback to empty array
      const categorizeRequests = (status) => {
        if (!requestData || !Array.isArray(requestData)) {
          return [];
        }
        return requestData.filter(r => r && typeof r === 'object' && r.status === status);
      };

      const newRequests = categorizeRequests('new');
      const unhandledRequests = categorizeRequests('unable_to_handle');
      const pendingRequests = categorizeRequests('in_progress');
      const investigatingRequests = categorizeRequests('pending_investigation');
      const completedRequests = categorizeRequests('completed');
      const sentBackRequests = categorizeRequests('sent_back');

      // Update state with fallback to empty arrays
      setState({
        loading: false,
        handlers: handlerData,
        users: userData,
        newRequests,
        unhandledRequests,
        pendingRequests,
        investigatingRequests,
        completedRequests,
        sentBackRequests,
        statistics: {
          totalRequests: requestData.length,
          pendingRequests: pendingRequests.length,
          completedRequests: completedRequests.length,
          averageResolutionTime: calculateAverageResolutionTime(requestData)
        }
      });

      lastFetchTime.current = now;
    } catch (error) {
      console.error('Comprehensive data fetch error:', error);
      
      if (isMounted.current) {
        setState(prev => ({ 
          ...prev, 
          loading: false,
          handlers: [],
          users: [],
          newRequests: [],
          unhandledRequests: [],
          pendingRequests: [],
          investigatingRequests: [],
          completedRequests: [],
          sentBackRequests: [],
          statistics: {
            totalRequests: 0,
            pendingRequests: 0,
            completedRequests: 0,
            averageResolutionTime: 0
          }
        }));
        
        if (toast) {
          toast({
            variant: 'destructive',
            title: 'Sync Error',
            description: 'Failed to refresh data. Please check your connection.'
          });
        }
      }
    }
  }, [toast, calculateAverageResolutionTime]);

  // Setup periodic refresh
  useEffect(() => {
    isMounted.current = true;
    
    // Initial fetch
    fetchData(true);

    // Periodic refresh
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    }, refreshInterval);

    // Visibility change listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      isMounted.current = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData, refreshInterval]);

  return {
    ...state,
    fetchData
  };
};
