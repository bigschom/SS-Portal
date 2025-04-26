// src/pages/security-services/task/components/RequestDialog/index.jsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../../components/ui/dialog';
import { Button } from '../../../../../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../../components/ui/tabs';
import { Textarea } from '../../../../../components/ui/textarea';
import { Badge } from '../../../../../components/ui/badge';
import { formatDate, formatServiceType } from '../../../../../utils/helpers';
import { STATUS_CONFIG, REQUEST_STATUS } from '../../utils/taskConstants';
import { Loader2, Copy, AlertTriangle } from 'lucide-react';

// Import any icons you need for status display
import * as Icons from 'lucide-react';

const RequestDialog = ({ 
  request, 
  isOpen, 
  onClose, 
  onStatusChange,
  onSubmitResponse,
  onSendBackToRequestor,
  onSaveEdit,
  loading = false,
  currentUserId
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [response, setResponse] = useState('');
  const [sendBackReason, setSendBackReason] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState({});

  // Safely get status config
  const statusConfig = request?.status ? STATUS_CONFIG[request.status] || STATUS_CONFIG.new : STATUS_CONFIG.new;
  
  // Get the icon component dynamically
  const StatusIcon = statusConfig?.icon ? Icons[statusConfig.icon] || Icons.CircleDot : Icons.CircleDot;

  // Initialize edit data when entering edit mode
  useEffect(() => {
    if (editMode && request) {
      setEditedData({
        full_names: request.full_names || '',
        primary_contact: request.primary_contact || '',
        secondary_contact: request.secondary_contact || '',
        details: request.details || ''
      });
    }
  }, [editMode, request]);

  // Reset form state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('details');
      setResponse('');
      setSendBackReason('');
      setEditMode(false);
    }
  }, [isOpen]);

  // Handle copying reference number
  const handleCopyReference = () => {
    if (request?.reference_number) {
      navigator.clipboard.writeText(request.reference_number)
        .then(() => {
          // You could add a toast notification here
          console.log('Reference number copied to clipboard');
        })
        .catch(err => {
          console.error('Failed to copy:', err);
        });
    }
  };

  // Handle saving edited data
  const handleSaveEdit = () => {
    onSaveEdit(editedData);
  };

  // If no request, don't render the dialog
  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl">
              Request Details
            </DialogTitle>
            <div className="flex items-center gap-2">
              <div 
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
              >
                <StatusIcon className={`h-3.5 w-3.5 ${statusConfig.iconColor}`} />
                {statusConfig.label}
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={handleCopyReference}
              >
                <Copy className="h-3.5 w-3.5" />
                {request.reference_number || 'N/A'}
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comments">
              Comments ({Array.isArray(request.request_comments) ? request.request_comments.filter(Boolean).length : 0})
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            {request.assigned_to?.id === currentUserId && (
              <TabsTrigger value="actions">Actions</TabsTrigger>
            )}
          </TabsList>
          
          {/* Details Tab - Premium Glass Morphism Style */}
          <TabsContent value="details" className="space-y-4">
            {editMode ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Customer Name</label>
                    <Textarea 
                      value={editedData.full_names || ''} 
                      onChange={(e) => setEditedData({...editedData, full_names: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Primary Contact</label>
                    <Textarea 
                      value={editedData.primary_contact || ''} 
                      onChange={(e) => setEditedData({...editedData, primary_contact: e.target.value})} 
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Secondary Contact</label>
                  <Textarea 
                    value={editedData.secondary_contact || ''} 
                    onChange={(e) => setEditedData({...editedData, secondary_contact: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Details</label>
                  <Textarea 
                    value={editedData.details || ''} 
                    onChange={(e) => setEditedData({...editedData, details: e.target.value})} 
                    rows={4}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                  <Button 
                    onClick={handleSaveEdit}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-6 shadow-lg">
                <h1 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <span className="bg-blue-500 w-3 h-3 rounded-full mr-2"></span>
                  {formatServiceType(request.service_type || '')}
                </h1>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Customer Information */}
                  <div className="bg-white bg-opacity-70 backdrop-blur-sm rounded-xl shadow-md p-5 border border-gray-200">
                    <h2 className="text-lg font-semibold text-blue-700 mb-4">Customer Information</h2>
                    
                    <div className="space-y-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500">ID/Passport</span>
                        <span className="text-lg font-semibold">{request.id_passport || 'N/A'}</span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500">Full Name</span>
                        <span className="text-lg font-semibold">{request.full_names || 'N/A'}</span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500">Primary Contact</span>
                        <span className="text-lg font-semibold">{request.primary_contact || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Service Details - Dynamic height */}
                  <div className="bg-white bg-opacity-70 backdrop-blur-sm rounded-xl shadow-md p-5 border border-gray-200 flex flex-col">
                    <h2 className="text-lg font-semibold text-blue-700 mb-4">Service Details</h2>
                    
                    <div className="space-y-4 flex-grow">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500">Phone Number</span>
                        <span className="text-lg font-semibold">{request.phone_number || 'N/A'}</span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500">Phone Brand</span>
                        <span className="text-lg font-semibold">{request.phone_brand || 'N/A'}</span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500">Period</span>
                        <span className="text-lg font-semibold">
                          {formatDate(request.start_date)} - {formatDate(request.end_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Request Information */}
                  <div className="bg-white bg-opacity-70 backdrop-blur-sm rounded-xl shadow-md p-5 border border-gray-200">
                    <h2 className="text-lg font-semibold text-blue-700 mb-4">Request Information</h2>
                    
                    <div className="space-y-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500">Created By</span>
                        <span className="text-lg font-semibold">{request.created_by?.fullname || 'N/A'}</span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500">Assigned To</span>
                        <span className="text-lg font-semibold">{request.assigned_to?.fullname || 'N/A'}</span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500">Created At</span>
                        <span className="text-lg font-semibold">{formatDate(request.created_at) || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Additional Details - Dynamic height */}
                  <div className="bg-white bg-opacity-70 backdrop-blur-sm rounded-xl shadow-md p-5 border border-gray-200 flex flex-col">
                    <h2 className="text-lg font-semibold text-blue-700 mb-4">Additional Details</h2>
                    
                    <div className="p-4 bg-gray-50 bg-opacity-70 rounded-lg flex-grow overflow-auto">
                      <p className="text-gray-800 whitespace-pre-wrap">{request.details || 'No additional details provided'}</p>
                    </div>
                  </div>
                </div>
                
                {request.assigned_to?.id === currentUserId && (
                  <div className="flex justify-end mt-4">
                    <Button variant="outline" onClick={() => setEditMode(true)}>
                      Edit Details
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          {/* Comments Tab */}
          <TabsContent value="comments" className="space-y-4">
            <div className="max-h-60 overflow-y-auto border rounded-md p-3">
              {Array.isArray(request.request_comments) && request.request_comments.length > 0 ? (
                request.request_comments
                  .filter(comment => comment !== null) // Filter out null comments
                  .map((comment, index) => (
                    <div key={index} className="mb-2 border-l-2 border-gray-200 pl-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">
                          {comment?.created_by?.fullname || 'Unknown User'}
                        </span> - {formatDate(comment?.created_at) || 'N/A'}
                      </p>
                      <p className="text-sm">{comment?.comment || ''}</p>
                      {comment?.is_send_back_reason && (
                        <Badge variant="outline" className="mt-1 bg-amber-50 text-amber-700 border-amber-300">
                          Send Back Reason
                        </Badge>
                      )}
                    </div>
                  ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-3">No comments yet</p>
              )}
            </div>
          </TabsContent>
          
          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="max-h-60 overflow-y-auto border rounded-md p-3">
              {Array.isArray(request.request_history) && request.request_history.length > 0 ? (
                request.request_history
                  .filter(history => history !== null)
                  .map((history, index) => (
                    <div key={index} className="mb-2 border-l-2 border-gray-200 pl-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(history?.created_at) || 'N/A'}
                      </p>
                      <p className="text-sm">{history?.details || 'Action performed'}</p>
                    </div>
                  ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-3">No history available</p>
              )}
            </div>
          </TabsContent>
          
          {/* Actions Tab - Only visible if assigned to current user */}
          {request.assigned_to?.id === currentUserId && (
            <TabsContent value="actions" className="space-y-4">
              {/* Action buttons section */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Update Status</h3>
                <div className="flex flex-wrap gap-2">
                  {request.status !== REQUEST_STATUS.COMPLETED && (
                    <Button 
                      size="sm" 
                      onClick={() => onStatusChange(REQUEST_STATUS.COMPLETED)}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Mark as Completed
                    </Button>
                  )}
                  
                  {request.status !== REQUEST_STATUS.PENDING_INVESTIGATION && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onStatusChange(REQUEST_STATUS.PENDING_INVESTIGATION)}
                      disabled={loading}
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Mark as Investigating
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Provide response section */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Provide Response</h3>
                <Textarea 
                  placeholder="Enter your response..." 
                  rows={4}
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                />
                <Button 
                  className="w-full"
                  onClick={() => onSubmitResponse(response)}
                  disabled={!response.trim() || loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Response & Complete
                </Button>
              </div>
              
              {/* Send back section */}
              <div className="space-y-2 mt-6 border-t pt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-medium">Send Back to Requestor</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  If this request needs correction or more information, you can send it back to the requestor.
                </p>
                <Textarea 
                  placeholder="Reason for sending back..." 
                  rows={3}
                  value={sendBackReason}
                  onChange={(e) => setSendBackReason(e.target.value)}
                />
                <Button 
                  variant="outline"
                  className="w-full border-amber-500 text-amber-600 hover:bg-amber-50"
                  onClick={() => onSendBackToRequestor(sendBackReason)}
                  disabled={!sendBackReason.trim() || loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Back to Requestor
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestDialog;