import { useState, useEffect, useCallback, useRef } from 'react';
import { useTaskContext } from '../context/TaskContext';
import taskService from '../../../../services/task-service';
import { REQUEST_STATUS, TIMEOUT } from '../utils/constants';
import { hasRequestTimedOut } from '../utils/helpers';
import { showNotification } from '../utils/notifications';



/**
 * Hook for managing service requests
 */
const useRequests = () => {
  const { 
    user, 
    setError, 
    setLoading, 
    notificationsEnabled,
    showHandlersTab 
  } = useTaskContext();
  
  // Request states
  const [availableRequests, setAvailableRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [submittedRequests, setSubmittedRequests] = useState([]);
  const [sentBackRequests, setSentBackRequests] = useState([]);
  const [unhandledRequests, setUnhandledRequests] = useState([]);
  
  // Use a ref to prevent fetchRequests from causing infinite re-renders
  const dataInitialized = useRef(false);
  
  // Fetch all request types
  const fetchRequests = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Parallel fetch of different request types
      const [
        available,
        assigned,
        submitted,
        sentBack
      ] = await Promise.all([
        taskService.getAvailableRequests(user.id),
        taskService.getAssignedRequests(user.id),
        taskService.getSubmittedRequests(user.id),
        taskService.getSentBackRequests(user.id)
      ]);

      // Determine unhandled requests based on user role
      let unhandled = [];
      if (user.role === 'admin' || showHandlersTab) {
        unhandled = await taskService.getUnhandledRequests();
      }

      // Update state with fetched requests
      setAvailableRequests(available || []);
      setMyRequests(assigned || []);
      setSubmittedRequests(submitted || []);
      setSentBackRequests(sentBack || []);
      setUnhandledRequests(unhandled || []);

    } catch (error) {
      console.error('Error in fetchRequests:', error);
      setError('Failed to load requests. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, setError, setLoading, showHandlersTab]);

  // Check and auto-return timed out requests
  const checkTimeouts = useCallback(async () => {
    if (!myRequests.length) return;
    
    const requests = [...myRequests];
    
    for (const request of requests) {
      if (hasRequestTimedOut(request)) {
        try {
          // Call backend to auto-return the request
          await taskService.autoReturnRequest(request.id);

          // Show notification if enabled
          if (notificationsEnabled) {
            showNotification(
              'Request Auto-Returned', 
              `Request ${request.reference_number} has been auto-returned to the queue`,
              `auto-returned-${request.reference_number}`
            );
          }

          // Refresh requests after auto-return
          fetchRequests();
        } catch (err) {
          console.error('Error in auto-return:', err);
        }
      }
    }
  }, [myRequests, fetchRequests, notificationsEnabled]);

  // Initialize data once
  useEffect(() => {
    if (!user || dataInitialized.current) return;
    
    const initializeData = async () => {
      try {
        await fetchRequests();
        dataInitialized.current = true;
      } catch (err) {
        console.error('Error in initializeData:', err);
        setError('Failed to initialize data. Please try again.');
      }
    };

    initializeData();
  }, [user, fetchRequests, setError]);

  // Set up periodic refresh intervals
  useEffect(() => {
    if (!user) return;
    
    const refreshInterval = setInterval(() => {
      fetchRequests();
    }, 30000); // 30 seconds instead of 10 to reduce load
    
    const timeoutInterval = setInterval(() => {
      checkTimeouts();
    }, 30000); // 30 seconds instead of 10 to reduce load

    // Cleanup intervals on unmount
    return () => {
      clearInterval(refreshInterval);
      clearInterval(timeoutInterval);
    };
  }, [user, fetchRequests, checkTimeouts]);

  return {
    // Requests data
    availableRequests,
    myRequests,
    submittedRequests,
    sentBackRequests,
    unhandledRequests,
    
    // Functions
    fetchRequests
  };
};

export default useRequests;