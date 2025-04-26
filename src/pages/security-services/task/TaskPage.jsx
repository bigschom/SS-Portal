// src/pages/security-services/task/TaskPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Search, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { useNotifications } from '../../../hooks/useNotifications';
import { useServiceNotifications } from '../../../hooks/useServiceNotifications';

// Import context
import { TaskProvider, useTask } from './context/TaskContext';

// Import components
import RequestCard from './components/RequestCard';
import RequestDialog from './components/RequestDialog';

// Import constants
import { REQUEST_STATUS } from './utils/taskConstants';

const TasksContent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Use the task context
  const { 
    requests, 
    loading, 
    polling,
    error, 
    success, 
    fetchRequests,
    claimRequest,
    updateRequestStatus,
    addComment,
    updateRequest,
    setError,
    setSuccess,
    clearMessages
  } = useTask();
  
  // Use the notifications hooks
  const { notificationsEnabled } = useNotifications();
  useServiceNotifications();

  // States
  const [activeTab, setActiveTab] = useState('available');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  // Create a ref to track initialization - properly defined in component body
  const hasInitializedRef = React.useRef(false);

  // Use URL parameters to handle request references
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refNumber = params.get('ref');
    
    if (refNumber && requests.available.length > 0) {
      const foundRequest = [
        ...requests.available,
        ...requests.assigned,
        ...requests.submitted,
        ...requests.sentBack
      ].find(req => req.reference_number === refNumber);
      
      if (foundRequest) {
        setSelectedRequest(foundRequest);
        setIsDialogOpen(true);
      }
    }
  }, [requests]);

  // Fetch initial data - FIXED VERSION with proper hook rules
  useEffect(() => {
    if (user && !hasInitializedRef.current) {
      // Set a small delay to avoid startup congestion
      const timer = setTimeout(() => {
        try {
          fetchRequests(true); // Force initial fetch
          hasInitializedRef.current = true;
        } catch (error) {
          console.error("Error fetching initial data:", error);
        }
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [user, fetchRequests]);

  // Auto-check for timed-out requests (those in progress for more than 30 minutes)
  useEffect(() => {
    // Track running timeouts to clean them up
    const timeouts = [];
    
    const checkTimeouts = async () => {
      const activeRequests = [...requests.assigned];
      const currentTime = Date.now();
      
      for (const request of activeRequests) {
        if (request.status === REQUEST_STATUS.IN_PROGRESS) {
          const assignedTime = new Date(request.updated_at).getTime();
          
          // Check if it's been more than 30 minutes
          if (currentTime - assignedTime > 30 * 60 * 1000) {
            try {
              const success = await updateRequestStatus(request.id, REQUEST_STATUS.NEW, {
                assigned_to: null,
                details: `Request automatically returned to available queue after 30 minutes of inactivity.`
              });
              
              if (success && notificationsEnabled) {
                new Notification('Request Auto-Returned', {
                  body: `Request ${request.reference_number} has been auto-returned to the queue`,
                  icon: '/favicon.ico',
                });
              }
            } catch (err) {
              console.error('Error in auto-return:', err);
            }
          }
        }
      }
    };

    // Check every 5 minutes instead of every minute to reduce load
    const interval = setInterval(checkTimeouts, 5 * 60 * 1000);
    
    // Clean up interval on unmount
    return () => {
      clearInterval(interval);
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [requests.assigned, updateRequestStatus, notificationsEnabled]);

  // Handle request click
  const handleRequestClick = async (request) => {
    try {
      setSelectedRequest(request);
      setIsDialogOpen(true);
      setActionLoading(prev => ({ ...prev, [request.id]: true }));

      // Automatically claim new requests
      if (request.status === REQUEST_STATUS.NEW && request.created_by?.id !== user?.id) {
        await claimRequest(request.id);
        
        if (notificationsEnabled) {
          new Notification('Request Assigned', {
            body: `You have been assigned request: ${request.reference_number}`,
            icon: '/favicon.ico',
          });
        }
      }
    } catch (err) {
      console.error('Error in handleRequestClick:', err);
      setError('Failed to handle request. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [request.id]: false }));
    }
  };

  // Handle status change
  const handleStatusChange = async (status) => {
    if (!selectedRequest || !user) return;

    setActionLoading(prev => ({ ...prev, [selectedRequest.id]: true }));
    try {
      const success = await updateRequestStatus(selectedRequest.id, status, {
        details: `Status changed to ${status}`
      });

      if (success) {
        if (notificationsEnabled && status === REQUEST_STATUS.COMPLETED) {
          new Notification('Request Status Updated', {
            body: `Request ${selectedRequest.reference_number} has been completed`,
            icon: '/favicon.ico',
          });
        }

        setIsDialogOpen(false);
        setSelectedRequest(null);
        setSuccess(`Request status updated to ${status.replace(/_/g, ' ')}`);
      }
    } catch (err) {
      console.error('Error in handleStatusChange:', err);
      setError('Failed to update status. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [selectedRequest.id]: false }));
    }
  };

  // Handle submit response
  const handleSubmitResponse = async (response) => {
    if (!selectedRequest || !user || !response.trim()) return;

    setActionLoading(prev => ({ ...prev, [selectedRequest.id]: true }));
    try {
      // Add the response comment
      await addComment(selectedRequest.id, response);
      
      // Update status to completed
      await updateRequestStatus(selectedRequest.id, REQUEST_STATUS.COMPLETED);

      if (notificationsEnabled) {
        new Notification('Request Completed', {
          body: `Request ${selectedRequest.reference_number} has been completed with response`,
          icon: '/favicon.ico',
        });
      }

      setIsDialogOpen(false);
      setSelectedRequest(null);
      setSuccess('Request completed successfully');
    } catch (err) {
      console.error('Error in handleSubmitResponse:', err);
      setError('Failed to submit response. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [selectedRequest.id]: false }));
    }
  };

  // Handle send back to requestor
  const handleSendBackToRequestor = async (comment) => {
    if (!selectedRequest || !user) return;

    setActionLoading(prev => ({ ...prev, [selectedRequest.id]: true }));
    try {
      // Add send back comment
      await addComment(selectedRequest.id, `SEND BACK REASON: ${comment}`, true);
      
      // Update status to sent back
      await updateRequestStatus(selectedRequest.id, REQUEST_STATUS.SENT_BACK, {
        assigned_to: null
      });

      if (notificationsEnabled) {
        new Notification('Request Sent Back', {
          body: `Request ${selectedRequest.reference_number} has been sent back for correction`,
          icon: '/favicon.ico',
        });
      }

      setIsDialogOpen(false);
      setSelectedRequest(null);
      setSuccess('Request sent back for correction');
    } catch (err) {
      console.error('Error in handleSendBackToRequestor:', err);
      setError('Failed to send request back. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [selectedRequest.id]: false }));
    }
  };

  // Handle save edit
  const handleSaveEdit = async (editedData) => {
    setActionLoading(prev => ({ ...prev, [selectedRequest.id]: true }));
    try {
      await updateRequest(selectedRequest.id, editedData);
      setIsDialogOpen(false);
      setSelectedRequest(null);
      setSuccess('Request updated successfully');
    } catch (err) {
      console.error('Error in handleSaveEdit:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [selectedRequest.id]: false }));
    }
  };

  // Filter requests - memoized to prevent re-calculation on every render
  const filteredRequests = useCallback((requestList) => {
    if (!requestList) return [];
    
    // Skip filtering if search term is empty
    if (!searchTerm.trim()) return requestList;
    
    return requestList.filter(request => 
      request.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.service_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.full_names?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.primary_contact?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-center">
        <div className="w-full max-w-[90%]">
          <div className="flex flex-col space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Service Requests
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage and track service requests
              </p>
            </div>

            {/* Alerts */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert variant="success" className="bg-green-50 border-green-200 text-green-800">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Search Input */}
            <div className="w-full">
              <div className="relative">
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by reference, name, or service type"
                  className="pl-10"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Loading indicator for background polling */}
            {polling && (
              <div className="flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="available">
                  Available Requests ({filteredRequests(requests.available).length})
                </TabsTrigger>
                <TabsTrigger value="my_requests">
                  My Requests ({filteredRequests(requests.assigned).length})
                </TabsTrigger>
                <TabsTrigger value="submitted_requests">
                  My Submitted Requests ({filteredRequests(requests.submitted).length})
                </TabsTrigger>
                <TabsTrigger value="sent_back">
                  Sent Back to Me ({filteredRequests(requests.sentBack).length})
                </TabsTrigger>
              </TabsList>

              {/* Available Requests */}
              <TabsContent value="available" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRequests(requests.available).map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      onClick={() => handleRequestClick(request)}
                      loading={actionLoading[request.id]}
                    />
                  ))}
                </div>
                {filteredRequests(requests.available).length === 0 && (
                  <Card>
                    <CardContent className="p-6 text-center text-gray-500 dark:text-gray-400">
                      No available requests found
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* My Requests */}
              <TabsContent value="my_requests" className="mt-6">
                <div className="space-y-6">
                  {/* Active Requests */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Active Requests</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredRequests(requests.assigned).map((request) => (
                        <RequestCard
                          key={request.id}
                          request={request}
                          onClick={() => handleRequestClick(request)}
                          loading={actionLoading[request.id]}
                        />
                      ))}
                    </div>
                    {filteredRequests(requests.assigned).length === 0 && (
                      <Card>
                        <CardContent className="p-6 text-center text-gray-500 dark:text-gray-400">
                          No active requests found
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Completed Requests */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Completed Requests</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredRequests(requests.completed).map((request) => (
                        <RequestCard
                          key={request.id}
                          request={request}
                          onClick={() => handleRequestClick(request)}
                          loading={actionLoading[request.id]}
                        />
                      ))}
                    </div>
                    {filteredRequests(requests.completed).length === 0 && (
                      <Card>
                        <CardContent className="p-6 text-center text-gray-500 dark:text-gray-400">
                          No completed requests found
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* My Submitted Requests */}
              <TabsContent value="submitted_requests" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRequests(requests.submitted).map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      onClick={() => handleRequestClick(request)}
                      loading={actionLoading[request.id]}
                      />
                    ))}
                  </div>
                  {filteredRequests(requests.submitted).length === 0 && (
                    <Card>
                      <CardContent className="p-6 text-center text-gray-500 dark:text-gray-400">
                        No submitted requests found
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
   
                {/* Sent Back Requests */}
                <TabsContent value="sent_back" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredRequests(requests.sentBack).map((request) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        onClick={() => handleRequestClick(request)}
                        loading={actionLoading[request.id]}
                      />
                    ))}
                  </div>
                  {filteredRequests(requests.sentBack).length === 0 && (
                    <Card>
                      <CardContent className="p-6 text-center text-gray-500 dark:text-gray-400">
                        No requests sent back for correction
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
   
        {/* Request Dialog */}
        {selectedRequest && (
          <RequestDialog
            request={selectedRequest}
            isOpen={isDialogOpen}
            onClose={() => {
              setIsDialogOpen(false);
              setSelectedRequest(null);
            }}
            onStatusChange={handleStatusChange}
            onSubmitResponse={handleSubmitResponse}
            onSendBackToRequestor={handleSendBackToRequestor}
            onSaveEdit={handleSaveEdit}
            loading={actionLoading[selectedRequest.id]}
            currentUserId={user?.id}
          />
        )}
      </div>
    );
   };
   
   const TasksPage = () => {
    return (
      <TaskProvider>
        <TasksContent />
      </TaskProvider>
    );
   };
   
   export default TasksPage;