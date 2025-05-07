
import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "../../../../components/ui/dialog";
import { Button } from '../../../../components/ui/button';
import { Textarea } from '../../../../components/ui/textarea';
import { Separator } from '../../../../components/ui/separator';
import { 
  User, 
  Phone,
  Calendar,
  Mail,
  CheckCircle2, 
  Clock, 
  MessageSquare,
  RotateCcw,
  Edit,
  AlertTriangle,
  AlertCircle,
  Loader2,
  RefreshCcw,
  Send,
  X,
  FileText,
  HistoryIcon,
  MessageCircle,
  Info
} from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import useRequestComments from '../hooks/useRequestComments';
import useRequests from '../hooks/useRequests';
import ResponseView from './ResponseView';
import StatusBadge from './StatusBadge';
import { calculateTimeRemaining } from '../utils/helpers';
import { REQUEST_STATUS, STATUS_CONFIG } from '../utils/constants';
import taskService from '../../../../services/task-service';
import { showNotification } from '../utils/notifications';
import { format } from 'date-fns';

// Detail Item Component for Request Information
const DetailItem = ({ label, value, icon: Icon }) => (
  <div className="flex items-start space-x-2 mb-2">
    {Icon && <Icon className="w-4 h-4 mt-1 text-muted-foreground" />}
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value || 'N/A'}</p>
    </div>
  </div>
);

// Tab component
const Tab = ({ isActive, onClick, icon: Icon, label }) => (
  <button
    className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-all ${
      isActive
        ? 'border-primary text-primary font-medium'
        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
    }`}
    onClick={onClick}
  >
    {Icon && <Icon className="w-4 h-4" />}
    {label}
  </button>
);

/**
 * Main dialog for viewing and managing a request
 */
const RequestDialog = () => {
  const { 
    user,
    selectedRequest,
    isDialogOpen,
    setIsDialogOpen,
    commentText,
    setCommentText,
    responseText,
    setResponseText,
    editPermission,
    timeLeftInMinutes,
    setTimeLeftInMinutes,
    toggleDialog,
    setRequestLoading,
    notificationsEnabled,
    setError,
    setSuccess,
    // fetchRequests,
    clearDialogStates,
    showHandlersTab,
    setSelectedRequest 
  } = useTaskContext();
  
  const { requestComments, fetchRequestComments, addComment } = useRequestComments();

const [serviceDetailsLoading, setServiceDetailsLoading] = useState(false);

  const { fetchRequests } = useRequests(); 

  // State for tracking which tab is active
  const [activeTab, setActiveTab] = useState('details');
  
  // State for backoffice comment
  const [backofficeComment, setBackofficeComment] = useState('');
  
  // Fetch comments and calculate time left when the dialog opens

  // Automatically assign to current user when viewing available requests
  useEffect(() => {
    const assignAvailableRequest = async () => {
      // Check if it's an available request and not created by current user
      if (
        selectedRequest && 
        selectedRequest.status === REQUEST_STATUS.NEW &&
        selectedRequest.created_by?.id !== user?.id &&
        !selectedRequest.assigned_to &&
        // Check user role is not security guard
        user?.role !== 'security_guard'
      ) {
        await handleAssignToSelf();
      }
    };
    
    if (isDialogOpen && selectedRequest) {
      assignAvailableRequest();
      
      // Automatically focus on response textarea if it's a request the user can handle
      if (
        selectedRequest.status === REQUEST_STATUS.NEW || 
        selectedRequest.status === REQUEST_STATUS.IN_PROGRESS ||
        selectedRequest.status === REQUEST_STATUS.PENDING_INVESTIGATION
      ) {
        setTimeout(() => {
          if (activeTab === 'response') {
            const responseTextarea = document.querySelector('textarea[placeholder="Enter your response..."]');
            if (responseTextarea) {
              responseTextarea.focus();
            }
          }
        }, 500); // Short delay to ensure the DOM is ready
      }
    }
  }, [isDialogOpen, selectedRequest, activeTab]);
  
  // Handle assigning request to self
  const handleAssignToSelf = async () => {
    if (!selectedRequest || !user) return;

    setRequestLoading(selectedRequest.id, true);
    try {
      // Use task service instead of direct database call
      await taskService.claimRequest(selectedRequest.id, user.id);

      if (notificationsEnabled) {
        showNotification('Request Assigned', 
          `You have been assigned request: ${selectedRequest.reference_number}`,
          `assigned-${selectedRequest.reference_number}`
        );
      }

      await fetchRequests();
      // Fetch comments again to include the new assignment comment
      await fetchRequestComments(selectedRequest.id);
    } catch (err) {
      console.error('Error in handleAssignToSelf:', err);
      setError('Failed to assign request. Please try again.');
    } finally {
      setRequestLoading(selectedRequest.id, false);
    }
  };
  
  // Handle status change
  const handleStatusChange = async (status) => {
    if (!selectedRequest || !user) return;

    setRequestLoading(selectedRequest.id, true);
    try {
      const previousStatus = selectedRequest.status;
      
      // Use task service instead of direct database call
      await taskService.updateRequestStatus(
        selectedRequest.id, 
        status, 
        user.id, 
        `Status changed from ${previousStatus} to ${status}`
      );

      if (notificationsEnabled) {
        showNotification(
          'Status Changed', 
          `Request ${selectedRequest.reference_number} status changed to ${STATUS_CONFIG[status].label}`,
          `status-change-${selectedRequest.reference_number}`
        );
      }

      await fetchRequests();
      setIsDialogOpen(false);
      clearDialogStates();
      setSuccess(`Request ${STATUS_CONFIG[status].label.toLowerCase()}`);
    } catch (err) {
      console.error('Error in handleStatusChange:', err);
      setError('Failed to update status. Please try again.');
    } finally {
      setRequestLoading(selectedRequest.id, false);
    }
  };
  
  // Handle submit response
  const handleSubmitResponse = async () => {
    if (!selectedRequest || !user || !responseText.trim()) return;

    setRequestLoading(selectedRequest.id, true);
    try {
      // Add the response comment
      await taskService.addComment(
        selectedRequest.id,
        user.id,
        responseText,
        false,
        true
      );

      // Update status to completed
      await taskService.updateRequestStatus(
        selectedRequest.id,
        REQUEST_STATUS.COMPLETED,
        user.id,
        `Request completed by ${user.fullname}`
      );

      if (notificationsEnabled) {
        showNotification(
          'Request Completed', 
          `Request ${selectedRequest.reference_number} has been completed`,
          `completed-${selectedRequest.reference_number}`
        );
        
        // Notify the creator
        if (selectedRequest.created_by && selectedRequest.created_by.id !== user.id) {
          showNotification(
            'Request Completed', 
            `Your request ${selectedRequest.reference_number} has been completed`,
            `completed-to-creator-${selectedRequest.reference_number}`
          );
        }
      }

      await fetchRequests();
      setIsDialogOpen(false);
      clearDialogStates();
      setSuccess('Request completed successfully');
    } catch (err) {
      console.error('Error in handleSubmitResponse:', err);
      setError('Failed to submit response. Please try again.');
    } finally {
      setRequestLoading(selectedRequest.id, false);
    }
  };
  
  // Handle mark as unhandled
  const handleMarkAsUnhandled = async () => {
    if (!selectedRequest || !user || !commentText.trim()) return;

    setRequestLoading(selectedRequest.id, true);
    try {
      // Update request status
      await taskService.updateRequestStatus(
        selectedRequest.id,
        REQUEST_STATUS.UNABLE_TO_HANDLE,
        user.id,
        `Request marked as unable to handle by ${user.fullname}`,
        null // Set assigned_to to null
      );

      // Add comment explaining why it can't be handled
      await taskService.addComment(
        selectedRequest.id,
        user.id,
        `UNABLE TO HANDLE: ${commentText}`,
        true, // is system message
        false, // not a response
        false // not a send back reason
      );

      if (notificationsEnabled) {
        showNotification(
          'Request Unable to Handle', 
          `Request ${selectedRequest.reference_number} was marked as unable to handle`,
          `unhandled-${selectedRequest.reference_number}`
        );
        
        // Notify the creator
        if (selectedRequest.created_by && selectedRequest.created_by.id !== user.id) {
          showNotification(
            'Request Unable to Handle', 
            `Your request ${selectedRequest.reference_number} was marked as unable to handle`,
            `unhandled-to-creator-${selectedRequest.reference_number}`
          );
        }
      }

      await fetchRequests();
      setIsDialogOpen(false);
      clearDialogStates();
      setSuccess('Request marked as unable to handle');
    } catch (err) {
      console.error('Error in handleMarkAsUnhandled:', err);
      setError('Failed to mark request as unhandled. Please try again.');
    } finally {
      setRequestLoading(selectedRequest.id, false);
    }
  };
  
  // Handle send back to requestor
  const handleSendBackToRequestor = async () => {
    if (!selectedRequest || !user || !commentText.trim()) return;

    setRequestLoading(selectedRequest.id, true);
    try {
      // Update request status with last_assigned_to field
      const updateData = {
        status: REQUEST_STATUS.SENT_BACK,
        userId: user.id,
        details: `Request sent back by ${user.fullname}. Reason: ${commentText}`,
        assigned_to: null,
        last_assigned_to: selectedRequest.assigned_to?.id
      };
      
      await taskService.updateRequestStatus(
        selectedRequest.id,
        REQUEST_STATUS.SENT_BACK,
        user.id,
        `Request sent back by ${user.fullname}. Reason: ${commentText}`,
        null // Set assigned_to to null
      );

      // Add send back reason as a comment
      await taskService.addComment(
        selectedRequest.id,
        user.id,
        `SEND BACK REASON: ${commentText}`,
        true, // is system message
        false, // not a response
        true // is a send back reason
      );
      
      // Show notification if enabled
      if (notificationsEnabled) {
        showNotification(
          'Request Sent Back', 
          `Request ${selectedRequest.reference_number} was sent back for corrections`,
          `sent-back-${selectedRequest.reference_number}`
        );
        
        // Notify the creator
        if (selectedRequest.created_by && selectedRequest.created_by.id !== user.id) {
          showNotification(
            'Request Sent Back', 
            `Your request ${selectedRequest.reference_number} was sent back for corrections`,
            `sent-back-to-creator-${selectedRequest.reference_number}`
          );
        }
      }

      setCommentText('');
      await fetchRequests();
      setIsDialogOpen(false);
      clearDialogStates();
      setSuccess('Request sent back for correction');
    } catch (err) {
      console.error('Error in handleSendBackToRequestor:', err);
      setError('Failed to send request back. Please try again.');
    } finally {
      setRequestLoading(selectedRequest.id, false);
    }
  };
  
  // Handle resend after correction (for sent back requests)
  const handleResendRequest = async () => {
    if (!selectedRequest || !user) return;
    
    // Only the creator can resend a sent back request
    if (selectedRequest.created_by?.id !== user.id) {
      setError('Only the request creator can resend this request');
      return;
    }

    setRequestLoading(selectedRequest.id, true);
    try {
      // Use the previously assigned user if available
      const assigned_to = selectedRequest.last_assigned_to || null;
      
      // Update request status
      await taskService.updateRequestStatus(
        selectedRequest.id,
        REQUEST_STATUS.IN_PROGRESS,
        user.id,
        `Request resubmitted after corrections by ${user.fullname}`,
        assigned_to
      );

      // Add system comment
      await taskService.addComment(
        selectedRequest.id,
        user.id,
        `Request resubmitted after corrections by ${user.fullname}`,
        true // is system message
      );

      if (notificationsEnabled) {
        // Notify the assignee if there is one
        if (assigned_to) {
          showNotification(
            'Request Resubmitted', 
            `Request ${selectedRequest.reference_number} has been resubmitted after corrections`,
            `resubmitted-${selectedRequest.reference_number}`
          );
        }
      }

      await fetchRequests();
      setIsDialogOpen(false);
      clearDialogStates();
      setSuccess('Request resubmitted successfully');
    } catch (err) {
      console.error('Error in handleResendRequest:', err);
      setError('Failed to resend request. Please try again.');
    } finally {
      setRequestLoading(selectedRequest.id, false);
    }
  };

  // Handle reclaiming unhandled requests
  const handleReclaimUnhandledRequest = async () => {
    if (!selectedRequest || !user) return;

    setRequestLoading(selectedRequest.id, true);
    try {
      // Update request status and assign to current user
      await taskService.updateRequestStatus(
        selectedRequest.id,
        REQUEST_STATUS.IN_PROGRESS,
        user.id,
        `Request reclaimed by ${user.fullname}`,
        user.id
      );

      // Add system comment
      await taskService.addComment(
        selectedRequest.id,
        user.id,
        `Request reclaimed and assigned to ${user.fullname}`,
        true // is system message
      );

      if (notificationsEnabled) {
        showNotification(
          'Request Reclaimed', 
          `You have reclaimed request: ${selectedRequest.reference_number}`,
          `reclaimed-${selectedRequest.reference_number}`
        );
      }

      await fetchRequests();
      // Fetch comments again
      await fetchRequestComments(selectedRequest.id);
      setSuccess('Request reclaimed successfully');
    } catch (err) {
      console.error('Error in handleReclaimUnhandledRequest:', err);
      setError('Failed to reclaim request. Please try again.');
    } finally {
      setRequestLoading(selectedRequest.id, false);
    }
  };
  
  // Handle adding a backoffice comment
  const handleAddBackofficeComment = async () => {
    if (!selectedRequest || !user || !backofficeComment.trim()) return;
    
    setRequestLoading(selectedRequest.id, true);
    try {
      // Add backoffice comment
      await taskService.addComment(
        selectedRequest.id,
        user.id,
        backofficeComment,
        false, // not system message
        false, // not a response
        false, // not a send back reason
        true // is a backoffice comment
      );
      
      // Clear the input field
      setBackofficeComment('');
      
      // Refresh comments
      await fetchRequestComments(selectedRequest.id);
      
      setSuccess('Backoffice comment added successfully');
    } catch (err) {
      console.error('Error adding backoffice comment:', err);
      setError('Failed to add backoffice comment. Please try again.');
    } finally {
      setRequestLoading(selectedRequest.id, false);
    }
  };
  
  // Allow commenting only for assigned user or creator
  const canComment = selectedRequest && (
    (selectedRequest.assigned_to?.id === user?.id) || 
    (selectedRequest.created_by?.id === user?.id)
  );
  
  // Check if user can handle this request (not the creator and not a security guard)
  const canHandle = selectedRequest && 
                  selectedRequest.assigned_to?.id === user?.id && 
                  selectedRequest.created_by?.id !== user?.id &&
                  user?.role !== 'security_guard' &&
                  (selectedRequest.status === REQUEST_STATUS.IN_PROGRESS ||
                   selectedRequest.status === REQUEST_STATUS.NEW ||
                   selectedRequest.status === REQUEST_STATUS.PENDING_INVESTIGATION);
  
  // Check if current user is the requestor
  const isRequestor = selectedRequest && selectedRequest.created_by?.id === user?.id;
  
  // Find the "send back" comment if request status is "sent_back"
  const sentBackComment = selectedRequest?.status === REQUEST_STATUS.SENT_BACK && 
    requestComments.find(comment => 
      comment.is_system && comment.comment?.startsWith('SEND BACK REASON:')
    );
  
  // Find the "unable to handle" comment if request status is "unable_to_handle"
  const unableToHandleComment = selectedRequest?.status === REQUEST_STATUS.UNABLE_TO_HANDLE && 
    requestComments.find(comment => 
      comment.is_system && comment.comment?.startsWith('UNABLE TO HANDLE:')
    );
  
  if (!selectedRequest) return null;
  
  // Determine if current user can resend this request
  const canResend = selectedRequest.created_by?.id === user?.id && 
                   selectedRequest.status === REQUEST_STATUS.SENT_BACK;
  
  // Check if this is a request_serial_number request and get related data
  const isSerialNumberRequest = selectedRequest.service_type === 'request_serial_number';
  const phoneData = selectedRequest.request_phone_numbers?.[0] || null;
  
  // Filter comments by type
  const regularComments = requestComments.filter(comment => 
    !comment.is_system && !comment.is_response && !comment.is_backoffice_comment
  );
  
  const systemComments = requestComments.filter(comment => 
    comment.is_system
  );
  
  const responseComments = requestComments.filter(comment => 
    comment.is_response
  );

  const backofficeComments = requestComments.filter(comment => 
    comment.is_backoffice_comment
  );






// Function to fetch service-specific details
// Function to fetch service-specific details
const fetchServiceDetails = useCallback(async () => {
  if (!selectedRequest?.id || !selectedRequest?.service_type) return;
  
  setServiceDetailsLoading(true);
  try {
    // Create a mapping between database service types and API endpoint formats
    const serviceTypeMap = {
      'request_serial_number': 'serial-number',
      'unblock_call_request': 'unblock-call',
      'stolen_phone_check': 'stolen-phone',  // Make sure this mapping is correct
      'call_history_request': 'call-history',
      'momo_transaction_request': 'momo-transaction',
      'money_refund_request': 'money-refund',
      'unblock_momo_request': 'unblock-momo',
      'backoffice_appointment': 'backoffice-appointment'
    };
    
    // Get the correct endpoint format
    const endpointType = serviceTypeMap[selectedRequest.service_type] || 
                        selectedRequest.service_type.replace('request_', '').replace(/_/g, '-');
    
    console.log(`Fetching service details for ${endpointType}, request ID: ${selectedRequest.id}`);
    
    // Make the API call
    const serviceDetails = await taskService.getServiceDetails(
      selectedRequest.id, 
      endpointType
    );
    
    if (serviceDetails) {
      // Update the selected request with the service details
      // Use a property name that matches what your rendering code expects
      const dataPropertyMap = {
        'serial-number': 'request_phone_numbers',
        'unblock-call': 'unblock_call_data',
        'stolen-phone': 'stolen_phone_data',
        'call-history': 'call_history_data',
        'momo-transaction': 'momo_transaction_data',
        'money-refund': 'money_refund_data',
        'unblock-momo': 'unblock_momo_data',
        'backoffice-appointment': 'backoffice_appointment'
      };
      
      const propertyName = dataPropertyMap[endpointType];
      if (propertyName) {
        setSelectedRequest(prev => ({
          ...prev,
          [propertyName]: Array.isArray(serviceDetails) ? serviceDetails : [serviceDetails]
        }));
      } else {
        console.log(`No specific handler for service type: ${selectedRequest.service_type}`);
      }
    }
  } catch (err) {
    console.error('Error fetching service details:', err);
    setError(`Failed to load service details: ${err.message}`);
  } finally {
    setServiceDetailsLoading(false);
  }
}, [selectedRequest?.id, selectedRequest?.service_type, setSelectedRequest, setError]);



// Update your useEffect to call fetchServiceDetails with proper dependencies
useEffect(() => {
  if (isDialogOpen && selectedRequest?.id) {
    // Only fetch comments and service details when the dialog first opens
    // or when the selected request changes
    fetchRequestComments(selectedRequest.id);
    fetchServiceDetails();
    
    // Calculate time remaining for in-progress requests
    if (selectedRequest.status === REQUEST_STATUS.IN_PROGRESS) {
      const timeLeft = calculateTimeRemaining(selectedRequest.updated_at);
      setTimeLeftInMinutes(timeLeft);
    } else {
      setTimeLeftInMinutes(null);
    }
    
    // Automatically set active tab to 'response' for new requests that aren't created by current user
    if (selectedRequest.status === REQUEST_STATUS.NEW && 
        selectedRequest.created_by?.id !== user?.id) {
      setActiveTab('response');
    }
  }
}, [isDialogOpen, selectedRequest?.id, fetchRequestComments, fetchServiceDetails, setTimeLeftInMinutes, user?.id]);


  
  
  
  // Determine which tab content to render
  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Customer Information */}
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
                <h3 className="font-semibold text-lg mb-4">Customer Information</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2">
                    <div className="text-sm text-muted-foreground">ID/Passport:</div>
                    <div className="text-sm font-medium">{selectedRequest.id_passport}</div>
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="text-sm text-muted-foreground">Full Name:</div>
                    <div className="text-sm font-medium">{selectedRequest.full_names}</div>
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="text-sm text-muted-foreground">Primary Contact:</div>
                    <div className="text-sm font-medium">{selectedRequest.primary_contact}</div>
                  </div>
                  {selectedRequest.secondary_contact && (
                    <div className="grid grid-cols-2">
                      <div className="text-sm text-muted-foreground">Secondary Contact:</div>
                      <div className="text-sm font-medium">{selectedRequest.secondary_contact}</div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Request Information */}
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
                <h3 className="font-semibold text-lg mb-4">Request Information</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2">
                    <div className="text-sm text-muted-foreground">Created By:</div>
                    <div className="text-sm font-medium">{selectedRequest.created_by?.fullname || 'N/A'}</div>
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="text-sm text-muted-foreground">Assigned To:</div>
                    <div className="text-sm font-medium">{selectedRequest.assigned_to?.fullname || 'Unassigned'}</div>
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="text-sm text-muted-foreground">Created At:</div>
                    <div className="text-sm font-medium">{format(new Date(selectedRequest.created_at), 'MMM d, yyyy, h:mm:ss a')}</div>
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="text-sm text-muted-foreground">Status:</div>
                    <div className="text-sm font-medium flex items-center">
                      <StatusBadge status={selectedRequest.status} showLabel={true} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column */}
            <div className="space-y-6">
{/* Service Details */}
<div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
  <h3 className="font-semibold text-lg mb-4">Service Details - {selectedRequest.service_type.replace(/_/g, ' ')}</h3>
  
  {serviceDetailsLoading ? (
    <div className="flex justify-center py-4">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  ) : (
    (() => {
      switch (selectedRequest.service_type) {
        case 'request_serial_number':
          const phoneData = selectedRequest.request_phone_numbers?.[0] || null;
          return phoneData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Phone Number:</div>
                <div className="text-sm font-medium">{phoneData.phone_number || 'N/A'}</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Phone Brand:</div>
                <div className="text-sm font-medium">{phoneData.phone_brand || 'N/A'}</div>
              </div>
              {phoneData.start_date && (
                <div className="grid grid-cols-2">
                  <div className="text-sm text-muted-foreground">Start Period:</div>
                  <div className="text-sm font-medium">{format(new Date(phoneData.start_date), 'MMM d, yyyy')}</div>
                </div>
              )}
              {phoneData.end_date && (
                <div className="grid grid-cols-2">
                  <div className="text-sm text-muted-foreground">End Period:</div>
                  <div className="text-sm font-medium">{format(new Date(phoneData.end_date), 'MMM d, yyyy')}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No phone data available</div>
          );
          
        case 'stolen_phone_check':
          const stolenPhoneData = selectedRequest.stolen_phone_data?.[0] || null;
          return stolenPhoneData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">IMEI Number:</div>
                <div className="text-sm font-medium">{stolenPhoneData.imei_number || 'N/A'}</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Created At:</div>
                <div className="text-sm font-medium">
                  {stolenPhoneData.created_at ? format(new Date(stolenPhoneData.created_at), 'MMM d, yyyy') : 'N/A'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No stolen phone data available</div>
          );
          
        case 'call_history_request':
          const callHistoryData = selectedRequest.call_history_data?.[0] || null;
          return callHistoryData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Phone Number:</div>
                <div className="text-sm font-medium">{callHistoryData.phone_number || 'N/A'}</div>
              </div>
              {callHistoryData.start_date && (
                <div className="grid grid-cols-2">
                  <div className="text-sm text-muted-foreground">Start Date:</div>
                  <div className="text-sm font-medium">{format(new Date(callHistoryData.start_date), 'MMM d, yyyy')}</div>
                </div>
              )}
              {callHistoryData.end_date && (
                <div className="grid grid-cols-2">
                  <div className="text-sm text-muted-foreground">End Date:</div>
                  <div className="text-sm font-medium">{format(new Date(callHistoryData.end_date), 'MMM d, yyyy')}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No call history data available</div>
          );
          
        case 'momo_transaction_request':
          const momoData = selectedRequest.momo_transaction_data?.[0] || null;
          return momoData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Phone Number:</div>
                <div className="text-sm font-medium">{momoData.phone_number || 'N/A'}</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Transaction ID:</div>
                <div className="text-sm font-medium">{momoData.transaction_id || 'N/A'}</div>
              </div>
              {momoData.transaction_date && (
                <div className="grid grid-cols-2">
                  <div className="text-sm text-muted-foreground">Transaction Date:</div>
                  <div className="text-sm font-medium">{format(new Date(momoData.transaction_date), 'MMM d, yyyy')}</div>
                </div>
              )}
              {momoData.amount && (
                <div className="grid grid-cols-2">
                  <div className="text-sm text-muted-foreground">Amount:</div>
                  <div className="text-sm font-medium">{momoData.amount}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No MoMo transaction data available</div>
          );
          
        case 'money_refund_request':
          const refundData = selectedRequest.money_refund_data?.[0] || null;
          return refundData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Phone Number:</div>
                <div className="text-sm font-medium">{refundData.phone_number || 'N/A'}</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Transaction ID:</div>
                <div className="text-sm font-medium">{refundData.transaction_id || 'N/A'}</div>
              </div>
              {refundData.amount && (
                <div className="grid grid-cols-2">
                  <div className="text-sm text-muted-foreground">Amount:</div>
                  <div className="text-sm font-medium">{refundData.amount}</div>
                </div>
              )}
              {refundData.reason && (
                <div className="grid grid-cols-2">
                  <div className="text-sm text-muted-foreground">Reason:</div>
                  <div className="text-sm font-medium">{refundData.reason}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No refund data available</div>
          );
          
        case 'unblock_call_request':
          const unblockCallData = selectedRequest.unblock_call_data?.[0] || null;
          return unblockCallData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Phone Number:</div>
                <div className="text-sm font-medium">{unblockCallData.phone_number || 'N/A'}</div>
              </div>
              {unblockCallData.block_reason && (
                <div className="grid grid-cols-2">
                  <div className="text-sm text-muted-foreground">Block Reason:</div>
                  <div className="text-sm font-medium">{unblockCallData.block_reason}</div>
                </div>
              )}
              {unblockCallData.block_date && (
                <div className="grid grid-cols-2">
                  <div className="text-sm text-muted-foreground">Block Date:</div>
                  <div className="text-sm font-medium">{format(new Date(unblockCallData.block_date), 'MMM d, yyyy')}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No unblock call data available</div>
          );
          
        case 'unblock_momo_request':
          const unblockMomoData = selectedRequest.unblock_momo_data?.[0] || null;
          return unblockMomoData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Phone Number:</div>
                <div className="text-sm font-medium">{unblockMomoData.phone_number || 'N/A'}</div>
              </div>
              {unblockMomoData.block_reason && (
                <div className="grid grid-cols-2">
                  <div className="text-sm text-muted-foreground">Block Reason:</div>
                  <div className="text-sm font-medium">{unblockMomoData.block_reason}</div>
                </div>
              )}
              {unblockMomoData.block_date && (
                <div className="grid grid-cols-2">
                  <div className="text-sm text-muted-foreground">Block Date:</div>
                  <div className="text-sm font-medium">{format(new Date(unblockMomoData.block_date), 'MMM d, yyyy')}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No unblock MoMo data available</div>
          );
          
        case 'backoffice_appointment':
          const appointmentData = selectedRequest.backoffice_appointment;
          return appointmentData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Appointment Date:</div>
                <div className="text-sm font-medium">
                  {appointmentData.appointment_date ? format(new Date(appointmentData.appointment_date), 'MMM d, yyyy h:mm a') : 'N/A'}
                </div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Backoffice User:</div>
                <div className="text-sm font-medium">{appointmentData.backoffice_user?.fullname || 'N/A'}</div>
              </div>
              {appointmentData.status && (
                <div className="grid grid-cols-2">
                  <div className="text-sm text-muted-foreground">Status:</div>
                  <div className="text-sm font-medium">{appointmentData.status}</div>
                </div>
              )}
              {appointmentData.notes && (
                <div className="grid grid-cols-2">
                  <div className="text-sm text-muted-foreground">Notes:</div>
                  <div className="text-sm font-medium">{appointmentData.notes}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No appointment data available</div>
          );
          
        default:
          return (
            <div className="text-sm text-muted-foreground">
              {selectedRequest.details ? (
                <div className="whitespace-pre-wrap">{selectedRequest.details}</div>
              ) : (
                'No specific service details available'
              )}
            </div>
          );
      }
    })()
  )}
</div>


              
              {/* Additional Details */}
              {selectedRequest.details && (
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
                  <h3 className="font-semibold text-lg mb-4">Additional Details:</h3>
                  <p className="text-sm whitespace-pre-wrap">{selectedRequest.details}</p>
                </div>
              )}
              
              {/* Send Back Reason */}
              {sentBackComment && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-md">
                  <h3 className="font-semibold text-lg mb-2 text-red-700 dark:text-red-400 flex items-center">
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Sent Back for Correction
                  </h3>
                  <p className="text-sm whitespace-pre-wrap mb-4">{sentBackComment.comment.replace('SEND BACK REASON:', '').trim()}</p>
                  
                  {canResend && (
                    <Button 
                      className="w-full"
                      onClick={handleResendRequest}
                      disabled={selectedRequest.isActionLoading}
                    >
                      {selectedRequest.isActionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Resend Request
                    </Button>
                  )}
                </div>
              )}
              
              {/* Unable to handle info */}
              {unableToHandleComment && (
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4 rounded-md">
                  <h3 className="font-semibold text-lg mb-2 text-gray-700 dark:text-gray-300 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Unable to Handle
                  </h3>
                  <p className="text-sm whitespace-pre-wrap mb-4">{unableToHandleComment.comment.replace('UNABLE TO HANDLE:', '').trim()}</p>
                  
                  {(user?.role === 'admin' || showHandlersTab) && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleReclaimUnhandledRequest}
                      disabled={selectedRequest.isActionLoading}
                    >
                      {selectedRequest.isActionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCcw className="w-4 h-4 mr-2" />
                      )}
                      Reclaim Request
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      
      case 'response':
        return (
          <div>
            {/* Only show response textarea for handlers, not for requestors */}
            {canHandle ? (
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-4 rounded-md mb-4">
                <h3 className="font-semibold text-lg mb-3">Official Response</h3>
                <Textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Enter your response..."
                  className="min-h-[150px] w-full border-2 rounded-md p-2"
                />
                <p className="text-xs text-blue-600 mt-2">
                  This is your official response that will be sent to the requestor.
                </p>
                
                {/* Action buttons in response tab for handlers only */}
                <div className="flex flex-wrap gap-2 mt-4 justify-end">
                  <Button
                    className="bg-yellow-500 hover:bg-yellow-600 text-white flex items-center"
                    onClick={() => handleStatusChange(REQUEST_STATUS.PENDING_INVESTIGATION)}
                    disabled={selectedRequest.isActionLoading}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Mark as Pending
                  </Button>
                  
                  <Button
                    className="bg-red-500 hover:bg-red-600 text-white flex items-center"
                    onClick={() => {
                      if (!commentText.trim()) {
                        setError('Please add a comment explaining why you cannot handle this request');
                        return;
                      }
                      handleMarkAsUnhandled();
                    }}
                    disabled={selectedRequest.isActionLoading}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Unable to Handle
                  </Button>
                  
                  <Button
                    className="bg-orange-500 hover:bg-orange-600 text-white flex items-center"
                    onClick={() => {
                      if (!commentText.trim()) {
                        setError('Please add a comment explaining why you need to send this request back');
                        return;
                      }
                      handleSendBackToRequestor();
                    }}
                    disabled={selectedRequest.isActionLoading}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Send Back to Requestor
                  </Button>
                  
                  <Button
                    className="bg-green-500 hover:bg-green-600 text-white flex items-center"
                    onClick={() => {
                      if (!responseText.trim()) {
                        setError('Please add a response before completing');
                        return;
                      }
                      handleSubmitResponse();
                    }}
                    disabled={selectedRequest.isActionLoading}
                  >
                    {selectedRequest.isActionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Complete & Submit
                  </Button>
                </div>
              </div>
            ) : (
              /* For requestors or when viewing others' requests, show response if it exists */
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md mb-4">
                <h3 className="font-semibold text-lg mb-3">Response</h3>
                {responseComments.length > 0 ? (
                  <div className="space-y-4">
                    {responseComments.map(comment => (
                      <ResponseView key={comment.id} comment={comment} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No response has been submitted for this request yet.</p>
                )}
              </div>
            )}
            
            {/* Add Feedback - for everyone who can comment */}
            {canComment && (
              <div className="mt-6 border-t pt-3">
                <h3 className="font-semibold text-lg mb-3">Add Feedback</h3>
                <div className="flex gap-2">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add your feedback..."
                    className="min-h-[100px]"
                  />
                  <Button
                    type="button"
                    onClick={() => addComment(commentText)}
                    disabled={!commentText.trim() || selectedRequest.isActionLoading}
                    className="mt-auto"
                  >
                    {selectedRequest.isActionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MessageSquare className="w-4 h-4 mr-2" />
                    )}
                    Add Feedback
                  </Button>
                </div>
              </div>
            )}
            
            {/* Regular Comments */}
            {regularComments.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-3">Feedback History</h3>
                <div className="space-y-4 border rounded-md p-4 max-h-[300px] overflow-y-auto">
                  {regularComments.map(comment => (
                    <ResponseView key={comment.id} comment={comment} />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      
      case 'history':
        return (
          <div className="space-y-6">
            {/* Feedback history section */}
            {regularComments.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Feedback History</h3>
                <div className="border rounded-md p-4 max-h-[200px] overflow-y-auto bg-gray-50 dark:bg-gray-900">
                  {regularComments.map(comment => (
                    <ResponseView key={comment.id} comment={comment} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Request timeline section */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Request Timeline</h3>
              <div className="border rounded-md p-4 max-h-[300px] overflow-y-auto bg-gray-50 dark:bg-gray-900">
                {systemComments.length > 0 ? (
                  <div className="space-y-4">
                    {systemComments.map(comment => (
                      <ResponseView key={comment.id} comment={comment} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No history available for this request.</p>
                )}
              </div>
            </div>
            
            {/* Response history section */}
            {responseComments.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Response History</h3>
                <div className="border rounded-md p-4 max-h-[200px] overflow-y-auto bg-gray-50 dark:bg-gray-900">
                  {responseComments.map(comment => (
                    <ResponseView key={comment.id} comment={comment} />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      
      case 'backoffice':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-3">Backoffice Comments</h3>
            
            {/* Backoffice chat section */}
            <div className="border rounded-md p-4 max-h-[400px] overflow-y-auto bg-gray-50 dark:bg-gray-900">
              {backofficeComments.length > 0 ? (
                <div className="space-y-4">
                  {backofficeComments.map(comment => (
                    <ResponseView key={comment.id} comment={comment} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No backoffice comments available for this request.</p>
              )}
            </div>
            
            {/* Add backoffice comment - for admin and backoffice users */}
            {(user?.role === 'admin' || user?.role === 'backoffice') && (
              <div className="mt-4">
                <Textarea
                  value={backofficeComment}
                  onChange={(e) => setBackofficeComment(e.target.value)}
                  placeholder="Add backoffice comment..."
                  className="min-h-[100px]"
                />
                <Button
                  className="mt-2 w-full"
                  variant="outline"
                  onClick={handleAddBackofficeComment}
                  disabled={!backofficeComment.trim() || selectedRequest.isActionLoading}
                >
                  {selectedRequest.isActionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <MessageCircle className="w-4 h-4 mr-2" />
                  )}
                  Add Backoffice Comment
                </Button>
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <div className="p-4 text-center">
            <p>Select a tab to view content</p>
          </div>
        );
    }
  };
                   
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              Request Details - {selectedRequest.reference_number}
            </DialogTitle>
            <div className="flex items-center">
              <StatusBadge status={selectedRequest.status} showLabel={true} />
            </div>
          </div>
        </DialogHeader>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6">
          <div className="flex space-x-2 overflow-x-auto">
            <Tab
              isActive={activeTab === 'details'}
              onClick={() => setActiveTab('details')}
              icon={FileText}
              label="Details"
            />
            <Tab
              isActive={activeTab === 'response'}
              onClick={() => setActiveTab('response')}
              icon={MessageSquare}
              label="Response"
            />
            <Tab
              isActive={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
              icon={HistoryIcon}
              label="History"
            />
            <Tab
              isActive={activeTab === 'backoffice'}
              onClick={() => setActiveTab('backoffice')}
              icon={Info}
              label="Backoffice Comments"
            />
          </div>
        </div>
        
        <div className="p-6">
          {/* Tab Content */}
          {renderTabContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RequestDialog;