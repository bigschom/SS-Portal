// src/pages/security-services/task/hooks/useTaskService.js
import { useState, useCallback, useEffect } from 'react';
import { useToast } from '../../../../components/ui/use-toast';
import apiClient from '../../../../config/api-service';

export const useTaskService = (userId) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [requests, setRequests] = useState({
    available: [],
    assigned: [],
    submitted: [],
    sentBack: []
  });

  // Handle API request with loading state and error handling
  const handleApiRequest = useCallback(async (requestId, apiCall, successMessage, errorMessage) => {
    setActionLoading(prev => ({ ...prev, [requestId]: true }));
    try {
      const result = await apiCall();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Refresh data
      await fetchRequests();
      
      // Show success toast
      if (successMessage) {
        toast({
          title: "Success",
          description: successMessage,
          variant: "success"
        });
      }
      
      return result;
    } catch (error) {
      console.error('API request error:', error);
      
      // Show error toast
      toast({
        title: "Error",
        description: errorMessage || error.message,
        variant: "destructive"
      });
      
      throw error;
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: false }));
    }
  }, [toast]);

  // Fetch all requests
  const fetchRequests = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Use Promise.all to make parallel requests
      const [available, assigned, submitted, sentBack] = await Promise.all([
        apiClient.tasks.getAvailableRequests(userId),
        apiClient.tasks.getAssignedRequests(userId),
        apiClient.tasks.getSubmittedRequests(userId),
        apiClient.tasks.getSentBackRequests(userId)
      ]);
      
      setRequests({
        available: available || [],
        assigned: assigned || [],
        submitted: submitted || [],
        sentBack: sentBack || []
      });
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "Failed to load requests. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  // Initialize data
  useEffect(() => {
    if (userId) {
      fetchRequests();
    }
  }, [userId, fetchRequests]);

  // Assign request
  const assignRequest = useCallback(async (request, userId) => {
    return handleApiRequest(
      request.id,
      () => apiClient.tasks.claimRequest(request.id, userId),
      "Request assigned successfully",
      "Failed to assign request"
    );
  }, [handleApiRequest]);

  // Update request status
  const updateStatus = useCallback(async (requestId, status, userId) => {
    return handleApiRequest(
      requestId,
      () => apiClient.tasks.updateRequestStatus(requestId, status, userId),
      `Request ${status.replace('_', ' ')}`,
      "Failed to update status"
    );
  }, [handleApiRequest]);

  // Submit response
  const submitResponse = useCallback(async (requestId, response, userId) => {
    return handleApiRequest(
      requestId,
      async () => {
        // First add the comment
        await apiClient.tasks.addComment(requestId, userId, response);
        
        // Then update status to completed
        return apiClient.tasks.updateRequestStatus(requestId, 'completed', userId);
      },
      "Response submitted successfully",
      "Failed to submit response"
    );
  }, [handleApiRequest]);

  // Send back to requestor
  const sendBackToRequestor = useCallback(async (requestId, comment, userId) => {
    return handleApiRequest(
      requestId,
      async () => {
        // Add send back reason comment
        await apiClient.tasks.addComment(requestId, userId, comment, true);
        
        // Update status to sent_back and clear assigned_to
        return apiClient.tasks.updateRequestStatus(
          requestId, 
          'sent_back', 
          userId,
          { assigned_to: null }
        );
      },
      "Request sent back for correction",
      "Failed to send request back"
    );
  }, [handleApiRequest]);

  // Save edited request
  const saveEditedRequest = useCallback(async (requestId, editedData, userId) => {
    return handleApiRequest(
      requestId,
      () => apiClient.tasks.updateRequestData(requestId, {
        ...editedData,
        updated_by: userId,
        status: 'new'
      }),
      "Request updated successfully",
      "Failed to save changes"
    );
  }, [handleApiRequest]);

  // Check for tasks that need to be auto-returned
  useEffect(() => {
    if (!userId) return;
    
    const checkTimeouts = async () => {
      const { assigned } = requests;
      for (const request of assigned) {
        if (request.status === 'in_progress') {
          const assignedTime = new Date(request.updated_at).getTime();
          const currentTime = new Date().getTime();
          
          // 30 minutes in milliseconds
          if (currentTime - assignedTime > 30 * 60 * 1000) {
            try {
              await apiClient.tasks.updateRequestStatus(
                request.id,
                'new',
                userId,
                {
                  assigned_to: null,
                  details: 'Request automatically returned due to inactivity'
                }
              );
              
              await fetchRequests();
              
              toast({
                title: "Task Auto-Returned",
                description: `Request ${request.reference_number} has been auto-returned to the queue`,
                variant: "info"
              });
            } catch (error) {
              console.error('Error in auto-return:', error);
            }
          }
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkTimeouts, 60000);
    
    // Initial check
    checkTimeouts();
    
    return () => clearInterval(interval);
  }, [requests, userId, fetchRequests, toast]);

  // Search and filter
  const filterRequests = useCallback((list, searchTerm) => {
    if (!searchTerm) return list;
    
    const term = searchTerm.toLowerCase();
    return list.filter(request => 
      request.reference_number?.toLowerCase().includes(term) ||
      request.service_type?.toLowerCase().includes(term) ||
      request.full_names?.toLowerCase().includes(term) ||
      request.primary_contact?.toLowerCase().includes(term)
    );
  }, []);

  return {
    loading,
    actionLoading,
    requests,
    fetchRequests,
    assignRequest,
    updateStatus,
    submitResponse,
    sendBackToRequestor,
    saveEditedRequest,
    filterRequests
  };
};