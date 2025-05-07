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
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import taskService from '../../../../services/task-service';
import { REQUEST_STATUS } from '../utils/constants';
import { showNotification } from '../utils/notifications';

/**
 * Dialog for marking a request as unable to handle
 */
const UnableToHandleDialog = ({ 
  open, 
  onOpenChange 
}) => {
  const { 
    user, 
    selectedRequest,
    commentText, 
    setCommentText,
    setRequestLoading,
    setError,
    setSuccess,
    notificationsEnabled,
    clearDialogStates,
    fetchRequests
  } = useTaskContext();
  
  // Handle submit
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
      onOpenChange(false);
      clearDialogStates(); 
      setSuccess('Request marked as unable to handle');
    } catch (err) {
      console.error('Error in handleMarkAsUnhandled:', err);
      setError('Failed to mark request as unhandled. Please try again.');
    } finally {
      setRequestLoading(selectedRequest?.id, false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            Unable to Handle Request
          </AlertDialogTitle>
          <AlertDialogDescription>
            Please explain why you are unable to handle this request.
            This information will be recorded and visible to administrators.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Explain why this request cannot be handled..."
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
            onClick={handleMarkAsUnhandled}
            disabled={!commentText.trim() || (selectedRequest && selectedRequest.id ? selectedRequest.isActionLoading : false)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {selectedRequest && selectedRequest.id && selectedRequest.isActionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Mark as Unable to Handle
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UnableToHandleDialog;