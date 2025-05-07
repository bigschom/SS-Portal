import React, { useEffect } from 'react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../../components/ui/alert-dialog";
import { useTaskContext } from '../context/TaskContext';
import ResponseView from './ResponseView';
import useRequestComments from '../hooks/useRequestComments';

/**
 * Dialog for viewing all responses to a request
 */
const ViewResponsesDialog = ({ 
  open, 
  onOpenChange 
}) => {
  const { selectedRequest } = useTaskContext();
  const { requestComments, fetchRequestComments } = useRequestComments();
  
  // Fetch comments when dialog opens
  useEffect(() => {
    if (open && selectedRequest?.id) {
      fetchRequestComments(selectedRequest.id);
    }
  }, [open, selectedRequest, fetchRequestComments]);
  
  // Filter comments to show only regular comments (not system or send back messages)
  const responses = requestComments.filter(comment => 
    !comment.send_back_reason && comment.created_by?.id
  );
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Request Responses</AlertDialogTitle>
          <AlertDialogDescription>
            {selectedRequest ? (
              <>
                <span className="font-medium">{selectedRequest.reference_number}</span> - 
                View all responses for this request.
              </>
            ) : (
              'View all responses for this request.'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4 space-y-4 max-h-[50vh] overflow-y-auto">
          {responses.length > 0 ? (
            responses.map(comment => (
              <ResponseView key={comment.id} comment={comment} />
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              No responses for this request yet.
            </div>
          )}
        </div>
        
        <AlertDialogFooter>
          <AlertDialogAction>
            Close
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ViewResponsesDialog;