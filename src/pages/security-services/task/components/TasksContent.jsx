import React, { useEffect, useCallback, useState } from 'react';
import { Card, CardContent } from '../../../../components/ui/card';
import { Input } from '../../../../components/ui/input';
import { Alert, AlertDescription } from '../../../../components/ui/alert';
import { Button } from '../../../../components/ui/button';
import { 
  Search, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTaskContext } from '../context/TaskContext';
import useRequests from '../hooks/useRequests';
import { requestNotificationPermission } from '../utils/notifications';

// Import components
import RequestCard from './RequestCard';
import RequestDialog from './RequestDialog';
import SendBackDialog from './SendBackDialog';
import UnableToHandleDialog from './UnableToHandleDialog';
import EditDialog from './EditDialog';
import ViewResponsesDialog from './ViewResponsesDialog';

/**
 * Main component for the Tasks page
 */
const TasksContent = () => {
  const navigate = useNavigate();
  
  const { 
    user,
    loading,
    setLoading,
    pageLoading,
    setPageLoading,
    error,
    success,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    showHandlersTab,
    setShowHandlersTab,
    selectedRequest,
    isDialogOpen,
    showEditDialog,
    showSendBackDialog,
    showUnableToHandleDialog,
    viewResponsesOpen,
    toggleDialog,
    clearDialogStates,
    setNotificationsEnabled
  } = useTaskContext();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  // Get data from requests hook
  const { 
    availableRequests,
    myRequests,
    submittedRequests,
    sentBackRequests,
    unhandledRequests
  } = useRequests();
  
  // Request notification permission on component mount
  useEffect(() => {
    const setupNotifications = async () => {
      const { permission, supported } = await requestNotificationPermission();
      setNotificationsEnabled(permission === "granted" && supported !== false);
    };
    
    setupNotifications();
  }, [setNotificationsEnabled]);
  
  // Check user role to determine if they can see handlers tab
  useEffect(() => {
    if (user) {
      // Set showHandlersTab based on user role
      setShowHandlersTab(user.role === 'admin' || user.permissions?.includes('manage_handlers'));
      setPageLoading(false);
    }
  }, [user, setShowHandlersTab, setPageLoading]);

  // Reset pagination when tab or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);
  
  // Auto-dismiss success notification after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        clearDialogStates();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [success, clearDialogStates]);
  
  // Filter requests based on search term
  const filteredRequests = useCallback((requests) => {
    if (!requests) return [];
    
    return requests.filter(request => 
      request.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.service_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.full_names?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.primary_contact?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Get current requests for pagination
  const getCurrentRequests = useCallback((requests) => {
    const filtered = filteredRequests(requests);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filtered.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredRequests, currentPage, itemsPerPage]);

  // Handle clicking on a request card
  const handleRequestClick = (request) => {
    toggleDialog('main', true, request);
  };

  // Get total pages
  const getTotalPages = useCallback((requests) => {
    return Math.ceil(filteredRequests(requests).length / itemsPerPage);
  }, [filteredRequests, itemsPerPage]);

  // Get current active requests based on tab
  const getActiveRequests = useCallback(() => {
    switch (activeTab) {
      case 'available':
        return availableRequests;
      case 'my_requests':
        return myRequests;
      case 'submitted_requests':
        return submittedRequests;
      case 'sent_back':
        return sentBackRequests;
      case 'unhandled':
        return unhandledRequests;
      default:
        return [];
    }
  }, [activeTab, availableRequests, myRequests, submittedRequests, sentBackRequests, unhandledRequests]);

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Get proper requests for current tab
  const currentRequests = getCurrentRequests(getActiveRequests());
  const totalPages = getTotalPages(getActiveRequests());
  
  // Special handling for My Requests tab which has sections
  const renderMyRequestsContent = () => {
    const activeRequests = filteredRequests(myRequests.filter(r => r.status !== 'completed'));
    const completedRequests = filteredRequests(myRequests.filter(r => r.status === 'completed'));
    
    // Get current page items
    const currentActiveRequests = activeRequests.slice(
      (currentPage - 1) * itemsPerPage, 
      currentPage * itemsPerPage
    );
    
    const currentCompletedRequests = completedRequests.slice(
      (currentPage - 1) * itemsPerPage, 
      currentPage * itemsPerPage
    );
    
    // Calculate total pages across both active and completed
    const totalItems = activeRequests.length + completedRequests.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    return (
      <>
        <div className="space-y-6">
          {/* Active Requests */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Active Requests</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentActiveRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onClick={handleRequestClick}
                />
              ))}
              {activeRequests.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="p-6 text-center text-gray-500 dark:text-gray-400">
                    No active requests found
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Completed Requests */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Completed Requests</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentCompletedRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onClick={handleRequestClick}
                />
              ))}
              {completedRequests.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="p-6 text-center text-gray-500 dark:text-gray-400">
                    No completed requests found
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
        
        {/* Pagination for My Requests */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Service Requests
        </h1>
        <div className="flex items-end justify-between">
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage and track service requests
          </p>
          
          {/* Search Input */}
          <div className="w-full max-w-sm">
            <div className="relative">
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search requests..."
                className="pl-10"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="success" className="mb-6 bg-green-50 border-green-200 text-green-800">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        {/* Tab headers styled like table headers */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <button
            className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
              activeTab === 'available' 
                ? 'border-primary text-primary dark:border-primary dark:text-primary-foreground' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('available')}
          >
            Available ({filteredRequests(availableRequests).length})
          </button>
          
          <button
            className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
              activeTab === 'my_requests' 
                ? 'border-primary text-primary dark:border-primary dark:text-primary-foreground' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('my_requests')}
          >
            My Requests ({filteredRequests(myRequests).length})
          </button>
          
          <button
            className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
              activeTab === 'submitted_requests' 
                ? 'border-primary text-primary dark:border-primary dark:text-primary-foreground' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('submitted_requests')}
          >
            My Submitted ({filteredRequests(submittedRequests).length})
          </button>
          
          <button
            className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
              activeTab === 'sent_back' 
                ? 'border-primary text-primary dark:border-primary dark:text-primary-foreground' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('sent_back')}
          >
            Sent Back ({filteredRequests(sentBackRequests).length})
          </button>
          
          {showHandlersTab && (
            <button
              className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === 'unhandled' 
                  ? 'border-primary text-primary dark:border-primary dark:text-primary-foreground' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('unhandled')}
            >
              Unhandled ({filteredRequests(unhandledRequests).length})
            </button>
          )}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {/* Special case for My Requests tab which has sections */}
          {activeTab === 'my_requests' ? (
            renderMyRequestsContent()
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onClick={handleRequestClick}
                  />
                ))}
                {currentRequests.length === 0 && (
                  <Card className="col-span-full">
                    <CardContent className="p-6 text-center text-gray-500 dark:text-gray-400">
                      No {activeTab.replace('_', ' ')} requests found
                    </CardContent>
                  </Card>
                )}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {selectedRequest && (
        <>
          <RequestDialog />
          <SendBackDialog 
            open={showSendBackDialog} 
            onOpenChange={(open) => toggleDialog('sendBack', open)} 
          />
          <UnableToHandleDialog
            open={showUnableToHandleDialog}
            onOpenChange={(open) => toggleDialog('unableToHandle', open)}
          />
          <EditDialog 
            open={showEditDialog} 
            onOpenChange={(open) => toggleDialog('edit', open)} 
          />
          <ViewResponsesDialog 
            open={viewResponsesOpen} 
            onOpenChange={(open) => toggleDialog('viewResponses', open)} 
          />
        </>
      )}
    </div>
  );
};

export default TasksContent;