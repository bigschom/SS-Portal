// src/hooks/useQueueData.js
import { useState, useCallback, useEffect, useRef } from 'react';
import apiService from '../config/api-service';
import { debounce } from '../utils/helpers';

export const useQueueData = (toast) => {
  const [loading, setLoading] = useState(true);
  const [handlers, setHandlers] = useState([]);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [statistics, setStatistics] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0,
    averageResolutionTime: 0
  });

  // Track fetch state with refs
  const fetchInProgressRef = useRef(false);
  const lastFetchRef = useRef(0);
  const abortControllerRef = useRef(null);
  
  // Configuration constants
  const FETCH_THROTTLE_MS = 3000; // Minimum 3 seconds between fetches
  const DATA_CACHE_MS = 300000; // Cache data for 5 minutes (increased from 1 minute)
  const HANDLERS_CACHE_KEY = 'cachedHandlers';
  const USERS_CACHE_KEY = 'cachedUsers';

  // States for categorized requests
  const [newRequests, setNewRequests] = useState([]);
  const [unhandledRequests, setUnhandledRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [investigatingRequests, setInvestigatingRequests] = useState([]);
  const [completedRequests, setCompletedRequests] = useState([]);
  const [sentBackRequests, setSentBackRequests] = useState([]);

  // Create a helper for categorizing requests
  const categorizeRequests = useCallback((requestsData) => {
    // Make sure requestsData is an array
    if (!Array.isArray(requestsData)) {
      console.warn('requestsData is not an array:', requestsData);
      requestsData = [];
    }
    
    // Categorize by status using a single pass through the data
    const categorized = {
      new: [],
      unable_to_handle: [],
      in_progress: [],
      pending_investigation: [],
      completed: [],
      sent_back: []
    };
    
    let totalResolutionTime = 0;
    let countWithTimes = 0;
    
    // Single loop to categorize and calculate statistics
    requestsData.forEach(request => {
      const status = request.status || 'unknown';
      
      // Add to the appropriate category
      if (categorized[status]) {
        categorized[status].push(request);
      }
      
      // Calculate resolution time for completed requests
      if (status === 'completed' && request.created_at && request.updated_at) {
        const created = new Date(request.created_at).getTime();
        const completed = new Date(request.updated_at).getTime();
        
        // Only count valid timestamps (avoid negative times)
        if (completed > created) {
          const diffHours = (completed - created) / (1000 * 60 * 60);
          totalResolutionTime += diffHours;
          countWithTimes++;
        }
      }
    });
    
    // Update states in a batch to reduce renders
    setNewRequests(categorized.new);
    setUnhandledRequests(categorized.unable_to_handle);
    setPendingRequests(categorized.in_progress);
    setInvestigatingRequests(categorized.pending_investigation);
    setCompletedRequests(categorized.completed);
    setSentBackRequests(categorized.sent_back);
    
    // Calculate statistics
    const avgResolutionTime = countWithTimes > 0 
      ? (totalResolutionTime / countWithTimes).toFixed(1) 
      : 0;
    
    setStatistics({
      totalRequests: requestsData.length,
      pendingRequests: categorized.new.length + categorized.in_progress.length + categorized.pending_investigation.length,
      completedRequests: categorized.completed.length,
      averageResolutionTime: avgResolutionTime
    });
  }, []);

  // Optimized cache management
  const getCachedData = useCallback((key, maxAge) => {
    try {
      const cachedData = sessionStorage.getItem(key);
      const timestamp = parseInt(sessionStorage.getItem(`${key}_timestamp`) || '0', 10);
      
      if (cachedData && Date.now() - timestamp < maxAge) {
        return JSON.parse(cachedData);
      }
    } catch (error) {
      console.error(`Error retrieving cached data for ${key}:`, error);
      // Clear corrupted cache
      sessionStorage.removeItem(key);
      sessionStorage.removeItem(`${key}_timestamp`);
    }
    return null;
  }, []);

  const setCachedData = useCallback((key, data) => {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
      sessionStorage.setItem(`${key}_timestamp`, Date.now().toString());
    } catch (error) {
      console.error(`Error caching data for ${key}:`, error);
      // If storage is full, clear less important caches
      try {
        sessionStorage.removeItem(key);
        sessionStorage.removeItem(`${key}_timestamp`);
        sessionStorage.setItem(key, JSON.stringify(data));
        sessionStorage.setItem(`${key}_timestamp`, Date.now().toString());
      } catch (innerError) {
        console.error('Failed to store data even after cleanup:', innerError);
      }
    }
  }, []);

  // Unified fetch function with proper error handling, throttling and caching
  const fetchData = useCallback(async (force = false) => {
    // Cancel any in-progress fetch if we're forcing a new one
    if (force && abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Check if we should skip this fetch (throttling or already in progress)
    const now = Date.now();
    if (
      (!force && now - lastFetchRef.current < FETCH_THROTTLE_MS) || 
      (fetchInProgressRef.current && !force)
    ) {
      return;
    }
    
    // Set fetch state
    lastFetchRef.current = now;
    fetchInProgressRef.current = true;
    
    // Create a new AbortController for this fetch
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    
    try {
      setLoading(true);
      
      // Fetch data with prioritization and error isolation
      const results = await Promise.allSettled([
        // Try to get users from cache first
        Promise.resolve().then(async () => {
          const cachedUsers = getCachedData(USERS_CACHE_KEY, DATA_CACHE_MS);
          if (cachedUsers) {
            return cachedUsers;
          }
          
          try {
            const freshUsers = await apiService.users.getAllActiveUsers();
            setCachedData(USERS_CACHE_KEY, freshUsers);
            return freshUsers;
          } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
          }
        }),
        
        // Try to get handlers from cache first
        Promise.resolve().then(async () => {
          const cachedHandlers = getCachedData(HANDLERS_CACHE_KEY, DATA_CACHE_MS);
          if (cachedHandlers) {
            return cachedHandlers;
          }
          
          try {
            const freshHandlers = await apiService.queue.getHandlers();
            setCachedData(HANDLERS_CACHE_KEY, freshHandlers);
            return freshHandlers;
          } catch (error) {
            console.error('Error fetching handlers:', error);
            throw error;
          }
        }),
        
        // Always fetch fresh requests
        Promise.resolve().then(async () => {
          try {
            return await apiService.queue.getRequests();
          } catch (error) {
            console.error('Error fetching requests:', error);
            throw error;
          }
        })
      ]);
      
      // Process results - handling errors for each fetch type separately
      const [usersResult, handlersResult, requestsResult] = results;
      
      // Process users
      let usersData = [];
      if (usersResult.status === 'fulfilled') {
        usersData = usersResult.value || [];
        setUsers(usersData);
      } else {
        console.error('Failed to load users:', usersResult.reason);
        toast?.({
          variant: "warning",
          title: "Warning",
          description: "Failed to load users. Some features may be limited.",
        });
      }
      
      // Process handlers
      let handlersData = [];
      if (handlersResult.status === 'fulfilled') {
        handlersData = handlersResult.value || [];
        
        // Process handlers data to include user information
        const handlersWithUsers = handlersData.map(handler => {
          const user = usersData.find(u => u.id === handler.user_id);
          return {
            ...handler,
            user: user || null
          };
        });
        
        setHandlers(handlersWithUsers);
      } else {
        console.error('Failed to load handlers:', handlersResult.reason);
        toast?.({
          variant: "warning",
          title: "Warning",
          description: "Failed to load handlers. Some features may be limited.",
        });
      }
      
      // Process requests
      if (requestsResult.status === 'fulfilled') {
        const requestsData = requestsResult.value || [];
        setRequests(requestsData);
        categorizeRequests(requestsData);
      } else {
        console.error('Failed to load requests:', requestsResult.reason);
        toast?.({
          variant: "warning",
          title: "Warning",
          description: "Failed to load requests. Some features may be limited.",
        });
      }
    } catch (error) {
      // Only show error if not aborted
      if (error.name !== 'AbortError') {
        console.error('Error fetching queue data:', error);
        toast?.({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch data. Please try again.",
        });
      }
    } finally {
      // Reset state if this is still the current fetch
      if (abortControllerRef.current?.signal === signal || signal.aborted) {
        setLoading(false);
        fetchInProgressRef.current = false;
        
        if (signal.aborted) {
          abortControllerRef.current = null;
        }
      }
    }
  }, [toast, categorizeRequests, getCachedData, setCachedData]);

  // Create debounced version of fetchData
  const debouncedFetchData = useCallback(
    debounce((force = false) => {
      fetchData(force);
    }, 300), // 300ms debounce (reduced from 500ms)
    [fetchData]
  );

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  return {
    loading,
    handlers,
    users,
    requests,
    statistics,
    newRequests,
    unhandledRequests,
    pendingRequests,
    investigatingRequests,
    completedRequests,
    sentBackRequests,
    fetchData: debouncedFetchData
  };
};