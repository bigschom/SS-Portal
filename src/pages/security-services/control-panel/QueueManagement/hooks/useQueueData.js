// src/pages/security-services/control-panel/QueueManagement/hooks/useQueueData.js
import { useState, useCallback } from 'react';
import { fetchHandlers, fetchUsers, fetchRequests } from '../api/queueService';

export const useQueueData = (toast) => {
  const [loading, setLoading] = useState(true);
  const [handlers, setHandlers] = useState([]);
  const [users, setUsers] = useState([]);
  const [newRequests, setNewRequests] = useState([]);
  const [unhandledRequests, setUnhandledRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [investigatingRequests, setInvestigatingRequests] = useState([]);
  const [completedRequests, setCompletedRequests] = useState([]);
  const [sentBackRequests, setSentBackRequests] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [handlersData, usersData, requestsData] = await Promise.all([
        fetchHandlers(),
        fetchUsers(),
        fetchRequests()
      ]);

      // Process handlers data to include user information
      const handlersWithUsers = handlersData.map(handler => {
        const user = usersData.find(u => u.id === handler.user_id);
        return {
          ...handler,
          user: user || null
        };
      });

      setHandlers(handlersWithUsers);
      setUsers(usersData);

      // Sort requests by status
      setNewRequests(requestsData.filter(r => r.status === 'new'));
      setUnhandledRequests(requestsData.filter(r => r.status === 'unable_to_handle'));
      setPendingRequests(requestsData.filter(r => r.status === 'in_progress'));
      setInvestigatingRequests(requestsData.filter(r => r.status === 'pending_investigation'));
      setCompletedRequests(requestsData.filter(r => r.status === 'completed'));
      setSentBackRequests(requestsData.filter(r => r.status === 'sent_back'));

    } catch (error) {
      console.error('Error fetching queue data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch data. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    handlers,
    users,
    newRequests,
    unhandledRequests,
    pendingRequests,
    investigatingRequests,
    completedRequests,
    sentBackRequests,
    fetchData
  };
};