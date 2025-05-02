// src/pages/security-services/task/components/RequestDialog.jsx
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { Button } from '../../../../components/ui/button';
import { Textarea } from '../../../../components/ui/textarea';
import { Input } from '../../../../components/ui/input';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Loader2,
  ArrowLeftRight,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import SendBackDialog from './SendBackDialog';
import ServiceDetails from './ServiceDetails';
import { formatDateTime } from '../utils/dateFormatter';

const RequestDialog = ({
  request,
  isOpen,
  onClose,
  onStatusChange,
  onSubmitResponse,
  onSendBackToRequestor,
  onSaveEdit,
  isLoading,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [response, setResponse] = useState('');
  const [sendBackDialogOpen, setSendBackDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRequest, setEditedRequest] = useState(null);

  // Guard against null/undefined request
  if (!request) {
    return null;
  }

  // Determine if the user is the one who created this request
  const isRequestor = currentUser?.id === request?.created_by?.id;
  
  // Determine if the user is the one assigned to this request
  const isAssignee = currentUser?.id === request?.assigned_to?.id;
  
  // Check if the request has been sent back
  const isSentBack = request.status === 'sent_back';
  
  // Get the send back reason, safely handling null/undefined values
  const sendBackReason = request.request_comments && Array.isArray(request.request_comments) 
    ? request.request_comments.find(comment => comment && comment.is_send_back_reason)?.comment 
    : null;

  // Format and prepare arrays safely for rendering
  const safeComments = Array.isArray(request.request_comments) ? request.request_comments : [];
  const safeHistory = Array.isArray(request.request_history) ? request.request_history : [];
  
  // Handle starting to edit the request
  const handleEditStart = () => {
    setIsEditing(true);
    setEditedRequest({
      full_names: request.full_names || '',
      primary_contact: request.primary_contact || '',
      secondary_contact: request.secondary_contact || '',
      details: request.details || ''
    });
  };
  
  // Handle canceling edit mode
  const handleEditCancel = () => {
    setIsEditing(false);
    setEditedRequest(null);
  };
  
  // Handle saving edited request
  const handleEditSave = () => {
    if (editedRequest && onSaveEdit) {
      onSaveEdit(request.id, editedRequest);
    }
  };
  
  // Handle input changes in edit mode
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedRequest(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle send back dialog
  const handleSendBack = (reason) => {
    if (onSendBackToRequestor) {
      onSendBackToRequestor(request.id, reason);
    }
    setSendBackDialogOpen(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl h-auto max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-xl font-semibold">
                Request #{request.reference_number}
              </DialogTitle>
              <StatusBadge status={request.status} />
            </div>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="px-6 pt-2 border-b">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="comments">
                Comments {safeComments.filter(c => c && !c.is_send_back_reason).length > 0 ? 
                  `(${safeComments.filter(c => c && !c.is_send_back_reason).length})` : ''}
              </TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            
            {/* Details Tab */}
            <TabsContent value="details" className="flex-1 p-6 overflow-y-auto">
              {isSentBack && sendBackReason && (
                <div className="mb-6 p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-900/50 rounded-md">
                  <div className="flex space-x-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                    <h3 className="font-medium text-yellow-800 dark:text-yellow-500">This request was sent back for correction</h3>
                  </div>
                  <p className="text-yellow-700 dark:text-yellow-400 ml-7">{sendBackReason}</p>
                </div>
              )}
              
              {isEditing ? (
                // Edit mode
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Full Name</label>
                    <Input 
                      name="full_names"
                      value={editedRequest.full_names}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Primary Contact</label>
                    <Input 
                      name="primary_contact"
                      value={editedRequest.primary_contact}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Secondary Contact</label>
                    <Input 
                      name="secondary_contact"
                      value={editedRequest.secondary_contact || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Details</label>
                    <Textarea 
                      name="details"
                      value={editedRequest.details || ''}
                      onChange={handleInputChange}
                      rows={4}
                    />
                  </div>
                </div>
              ) : (
                // View mode
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Requestor</h3>
                      <p className="mt-1">{request.full_names}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Submitted By</h3>
                      <p className="mt-1">{request.created_by?.fullname || 'N/A'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Service Type</h3>
                      <p className="mt-1 capitalize">{request.service_type?.replace(/_/g, ' ') || 'Unknown'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Date Submitted</h3>
                      <p className="mt-1">{formatDateTime(request.created_at)}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Primary Contact</h3>
                      <p className="mt-1">{request.primary_contact || 'N/A'}</p>
                    </div>
                    {request.secondary_contact && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Secondary Contact</h3>
                        <p className="mt-1">{request.secondary_contact}</p>
                      </div>
                    )}
                    {request.id_passport && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">ID/Passport</h3>
                        <p className="mt-1">{request.id_passport}</p>
                      </div>
                    )}
                  </div>
                  
                  {request.details && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Details</h3>
                      <p className="mt-1 whitespace-pre-wrap">{request.details}</p>
                    </div>
                  )}
                  
                  {/* Service-specific details */}
                  <ServiceDetails request={request} />
                </div>
              )}
            </TabsContent>
            
            {/* Comments Tab */}
            <TabsContent value="comments" className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-4">
                {safeComments.filter(comment => comment && !comment.is_send_back_reason).length > 0 ? (
                  safeComments
                    .filter(comment => comment && !comment.is_send_back_reason)
                    .map((comment, index) => (
                      <div key={comment.id || index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">
                            {comment.created_by === currentUser?.id ? 'You' : 'Agent'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDateTime(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.comment}</p>
                      </div>
                    ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-6">No comments yet</p>
                )}
                
                {(isAssignee || isRequestor) && request.status !== 'completed' && (
                  <div className="mt-6">
                    <Textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder="Add a comment or response..."
                      rows={4}
                    />
                    <Button 
                      className="mt-2"
                      onClick={() => {
                        if (response.trim() && onSubmitResponse) {
                          onSubmitResponse(request.id, response);
                          setResponse('');
                        }
                      }}
                      disabled={!response.trim() || isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Response'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* History Tab */}
            <TabsContent value="history" className="flex-1 p-6 overflow-y-auto">
              {safeHistory.length > 0 ? (
                <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-6">
                  {safeHistory.map((historyItem, index) => (
                    <li key={historyItem.id || index} className="ml-6">
                      <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full -left-3 ring-8 ring-white dark:ring-gray-900">
                        {historyItem.action === 'status_change' ? (
                          <ArrowLeftRight className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        ) : historyItem.action === 'comment_added' ? (
                          <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                        ) : (
                          <Clock className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                        )}
                      </span>
                      <div className="ml-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {historyItem.details}
                        </h3>
                        <time className="block mb-2 text-xs font-normal leading-none text-gray-500 dark:text-gray-400">
                          {formatDateTime(historyItem.created_at)}
                        </time>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-6">No history available</p>
              )}
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="px-6 py-4 border-t">
            {isEditing ? (
              // Edit mode buttons
              <>
                <Button variant="outline" onClick={handleEditCancel}>
                  Cancel
                </Button>
                <Button onClick={handleEditSave} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </>
            ) : (
              // View mode buttons
              <>
                {/* Close button always shown */}
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                
                {/* Conditionally show other action buttons */}
                {isRequestor && isSentBack && (
                  <Button onClick={handleEditStart}>
                    Edit Request
                  </Button>
                )}
                
                {isAssignee && !['completed', 'sent_back'].includes(request.status) && (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => setSendBackDialogOpen(true)}
                      className="bg-yellow-50 text-yellow-600 hover:bg-yellow-100 hover:text-yellow-700 border-yellow-200"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Send Back
                    </Button>
                    <Button 
                      onClick={() => onStatusChange(request.id, 'completed')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark Complete
                    </Button>
                  </>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Send Back Dialog */}
      {sendBackDialogOpen && (
        <SendBackDialog
          isOpen={sendBackDialogOpen}
          onClose={() => setSendBackDialogOpen(false)}
          onSendBack={handleSendBack}
          isLoading={isLoading}
        />
      )}
    </>
  );
};

export default RequestDialog;