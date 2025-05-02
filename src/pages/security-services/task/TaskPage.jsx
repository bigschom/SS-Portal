// src/pages/security-services/task/TaskPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { useToast } from '../../../components/ui/use-toast';
import { 
  Search, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw
} from 'lucide-react';

// Import task-specific components
import RequestCard from './components/RequestCard';
import RequestDialog from './components/RequestDialog';
import { TaskProvider, useTask } from './context/TaskContext';

const TasksContent = () => {
  const { toast } = useToast();
  const { 
    requests,
    loading,
    actionLoading,
    error,
    success,
    fetchRequests,
    assignRequest,
    updateStatus,
    submitResponse,
    sendBackToRequestor,
    saveEditedRequest,
    setError,
    setSuccess,
    clearMessages
  } = useTask();
  
  // Local state
  const [activeTab, setActiveTab] = useState('available');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Get current user from session storage
  useEffect(() => {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setCurrentUser({
          id: userData.id,
          fullname: userData.full_name || userData.username,
          username: userData.username,
          role: userData.role
        });
      } catch (e) {
        console.error('Error parsing user data:', e);
        // Handle invalid user data
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Please log in again"
        });
      }
    } else {
      // Handle missing user data
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to access this page"
      });
    }
  }, [toast]);

  // Initialize data when user is loaded
  useEffect(() => {
    if (currentUser?.id) {
      fetchRequests(currentUser.id);
    }
  }, [fetchRequests, currentUser?.id]);

  // Manual refresh function
  const handleRefresh = async () => {
    if (!currentUser?.id) return;
    
    setIsRefreshing(true);
    try {
      await fetchRequests(currentUser.id);
      toast({
        title: "Refreshed",
        description: "Request list updated successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: "Could not refresh requests. Please try again."
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle request click
  const handleRequestClick = async (request) => {
    if (!currentUser?.id) return;
    
    try {
      setSelectedRequest(request);
      setIsDialogOpen(true);
      
      // If clicking an available request, assign it automatically
      if (request.status === 'new' && !request.assigned_to && 
          request.created_by?.id !== currentUser.id) {
        await assignRequest(request, currentUser.id);
      }
    } catch (error) {
      console.error('Error handling request click:', error);
    }
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedRequest(null);
  };

  // Handle status change
  const handleStatusChange = async (requestId, status) => {
    if (!currentUser?.id) return;
    
    try {
      await updateStatus(requestId, status, currentUser.id);
      setIsDialogOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error in handleStatusChange:', error);
    }
  };

  // Handle submit response
  const handleSubmitResponse = async (requestId, response) => {
    if (!currentUser?.id) return;
    
    try {
      await submitResponse(requestId, response, currentUser.id);
      setIsDialogOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error in handleSubmitResponse:', error);
    }
  };

  // Handle send back to requestor
  const handleSendBackToRequestor = async (requestId, comment) => {
    if (!currentUser?.id) return;
    
    try {
      await sendBackToRequestor(requestId, comment, currentUser.id);
      setIsDialogOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error in handleSendBackToRequestor:', error);
    }
  };

  // Handle save edit
  const handleSaveEdit = async (requestId, editedData) => {
    if (!currentUser?.id) return;
    
    try {
      await saveEditedRequest(requestId, editedData, currentUser.id);
      setIsDialogOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error in handleSaveEdit:', error);
    }
  };

  // Filter requests based on search term
  const filterRequests = useCallback((requestList) => {
    if (!searchTerm || !Array.isArray(requestList)) return requestList || [];
    
    const term = searchTerm.toLowerCase();
    return requestList.filter(request => 
      request.reference_number?.toLowerCase().includes(term) ||
      request.service_type?.toLowerCase().includes(term) ||
      request.full_names?.toLowerCase().includes(term) ||
      request.primary_contact?.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  // Ensure all request lists are arrays
  const ensureArray = (list) => Array.isArray(list) ? list : [];

  // Filtered request lists with array safety
  const filteredAvailable = filterRequests(ensureArray(requests.available));
  const filteredAssigned = filterRequests(ensureArray(requests.assigned));
  const filteredSubmitted = filterRequests(ensureArray(requests.submitted));
  const filteredSentBack = filterRequests(ensureArray(requests.sentBack));

  // Set up auto-refresh interval
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const interval = setInterval(() => {
      fetchRequests(currentUser.id);
    }, 300000); // Refresh every 5 minutes
    
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]); // Only depend on user ID changing

  if (loading && !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Request Management
            </h1>
            {/* Removed the description line */}
          </div>
          
          <div className="mt-4 sm:mt-0">
            {/* Removed "Logged in as" text */}
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing || !currentUser}
              className="flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-4 bg-green-50 border-green-200 text-green-800">
            <CheckCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Search Input */}
        <div className="relative mb-6">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by reference, name, service, or phone"
            className="pl-10"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="available">
            Available Requests ({filteredAvailable.length})
          </TabsTrigger>
          <TabsTrigger value="assigned">
            My Assigned ({filteredAssigned.length})
          </TabsTrigger>
          <TabsTrigger value="submitted">
            My Submitted ({filteredSubmitted.length})
          </TabsTrigger>
          <TabsTrigger value="sent_back">
            Sent Back ({filteredSentBack.length})
          </TabsTrigger>
        </TabsList>

        {/* Available Requests Tab */}
        <TabsContent value="available">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAvailable.length > 0 ? (
              filteredAvailable.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onClick={() => handleRequestClick(request)}
                  isLoading={actionLoading[request.id]}
                  // Removed actionButton prop with "Assign to me" button
                />
              ))
            ) : (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-6 text-center text-gray-500 dark:text-gray-400">
                    No available requests found
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        {/* My Assigned Requests Tab */}
        <TabsContent value="assigned">
          <div className="space-y-8">
            {/* Active Requests */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                Active Requests
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAssigned.filter(r => r.status !== 'completed').length > 0 ? (
                  filteredAssigned
                    .filter(r => r.status !== 'completed')
                    .map((request) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        onClick={() => handleRequestClick(request)}
                        isLoading={actionLoading[request.id]}
                        highlighted={true}
                      />
                    ))
                ) : (
                  <div className="col-span-full">
                    <Card>
                      <CardContent className="p-6 text-center text-gray-500 dark:text-gray-400">
                        No active requests found
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>

            {/* Completed Requests */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                Completed Requests
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAssigned.filter(r => r.status === 'completed').length > 0 ? (
                  filteredAssigned
                    .filter(r => r.status === 'completed')
                    .map((request) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        onClick={() => handleRequestClick(request)}
                        isLoading={actionLoading[request.id]}
                      />
                    ))
                ) : (
                  <div className="col-span-full">
                    <Card>
                      <CardContent className="p-6 text-center text-gray-500 dark:text-gray-400">
                        No completed requests found
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* My Submitted Requests Tab */}
        <TabsContent value="submitted">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubmitted.length > 0 ? (
              filteredSubmitted.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onClick={() => handleRequestClick(request)}
                  isLoading={actionLoading[request.id]}
                />
              ))
            ) : (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-6 text-center text-gray-500 dark:text-gray-400">
                    No submitted requests found
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Sent Back Requests Tab */}
        <TabsContent value="sent_back">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSentBack.length > 0 ? (
              filteredSentBack.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onClick={() => handleRequestClick(request)}
                  isLoading={actionLoading[request.id]}
                  actionButton={
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestClick(request);
                      }}
                    >
                      Edit Request
                    </Button>
                  }
                  highlighted={true}
                />
              ))
            ) : (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-6 text-center text-gray-500 dark:text-gray-400">
                    No requests sent back for correction
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Request Dialog */}
      {selectedRequest && (
        <RequestDialog
          request={selectedRequest}
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          onStatusChange={handleStatusChange}
          onSubmitResponse={handleSubmitResponse}
          onSendBackToRequestor={handleSendBackToRequestor}
          onSaveEdit={handleSaveEdit}
          isLoading={actionLoading[selectedRequest.id]}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

const TaskPage = () => {
  return (
    <TaskProvider>
      <TasksContent />
    </TaskProvider>
  );
};

export default TaskPage;