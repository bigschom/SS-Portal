import React from 'react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../../components/ui/alert-dialog";
import { Textarea } from '../../../../components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import taskService from '../../../../services/task-service';
import { REQUEST_STATUS } from '../utils/constants';
import { showNotification } from '../utils/notifications';

/**
 * Dialog for sending back a request to the requestor
 */
const SendBackDialog = ({ 
  open, 
  onOpenChange 
}) => {
  const { 
    user, 
    selectedRequest,
    sendBackReason, 
    setSendBackReason,
    setRequestLoading,
    setError,
    setSuccess,
    notificationsEnabled,
    clearDialogStates,
    fetchRequests
  } = useTaskContext();
  
  // Handle submit
  const handleSendBackToRequestor = async () => {
    if (!selectedRequest || !user || !sendBackReason.trim()) return;

    setRequestLoading(selectedRequest.id, true);
    try {
      // Update request status and store current assignee
      await taskService.updateRequestStatus(
        selectedRequest.id,
        REQUEST_STATUS.SENT_BACK,
        user.id,
        `Request sent back by ${user.fullname}. Reason: ${sendBackReason}`,
        null // Set assigned_to to null
      );

      // Add send back reason as a comment
      await taskService.addComment(
        selectedRequest.id,
        user.id,
        `SEND BACK REASON: ${sendBackReason}`,
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

      await fetchRequests();
      onOpenChange(false);
      clearDialogStates();
      setSuccess('Request sent back for correction');
    } catch (err) {
      console.error('Error in handleSendBackToRequestor:', err);
      setError('Failed to send request back. Please try again.');
    } finally {
      setRequestLoading(selectedRequest?.id, false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send Back Request</AlertDialogTitle>
          <AlertDialogDescription>
            Please provide a reason for sending this request back to the requestor.
            This reason will be visible to the requestor.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          <Textarea
            value={sendBackReason}
            onChange={(e) => setSendBackReason(e.target.value)}
            placeholder="Enter reason for sending back..."
            className="min-h-[100px]"
          />
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel 
            disabled={selectedRequest && selectedRequest.id ? selectedRequest.isActionLoading : false}
          >
            Cancel
          </AlertDialogCancel>
          
          <AlertDialogAction
            onClick={handleSendBackToRequestor}
            disabled={!sendBackReason.trim() || (selectedRequest && selectedRequest.id ? selectedRequest.isActionLoading : false)}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {selectedRequest && selectedRequest.id && selectedRequest.isActionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Send Back
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SendBackDialog;