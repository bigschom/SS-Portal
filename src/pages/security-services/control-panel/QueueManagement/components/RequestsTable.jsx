// src/pages/security-services/control-panel/QueueManagement/components/RequestsTable.jsx
import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../../../../components/ui/table';
import { Button } from '../../../../../components/ui/button';
import { 
  MoreHorizontal, 
  RotateCcw, 
  CheckCircle, 
  Search,
  Trash2
} from 'lucide-react';
import { useToast } from '../../../../../components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../../../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../../../components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../../../../components/ui/select';
import StatusBadge from './StatusBadge';
import { 
  assignRequestToHandler, 
  markRequestUnableToHandle,
  markRequestCompleted,
  markRequestInvestigating,
  sendBackRequest 
} from '../api/queueService';

export const RequestsTable = ({ requests, status, onRefresh }) => {
  const { toast } = useToast();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedHandler, setSelectedHandler] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Format date for better display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Handle request assignment
  const handleAssignRequest = async () => {
    if (!selectedRequest || !selectedHandler) return;
    
    try {
      setIsSubmitting(true);
      
      const result = await assignRequestToHandler(selectedRequest.id, selectedHandler);
      
      toast({
        title: "Success",
        description: result.message || "Request assigned successfully",
      });
      
      onRefresh();
    } catch (error) {
      console.error('Error assigning request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to assign request. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
      setAssignDialogOpen(false);
      setSelectedRequest(null);
      setSelectedHandler(null);
    }
  };

  // Handle status change actions
  const handleStatusChange = async (requestId, action) => {
    try {
      setIsSubmitting(true);
      let result;
      
      switch (action) {
        case 'unable_to_handle':
          result = await markRequestUnableToHandle(requestId);
          break;
        case 'completed':
          result = await markRequestCompleted(requestId);
          break;
        case 'investigating':
          result = await markRequestInvestigating(requestId);
          break;
        case 'sent_back':
          result = await sendBackRequest(requestId);
          break;
        default:
          throw new Error('Invalid action');
      }
      
      toast({
        title: "Success",
        description: result.message || "Request status updated successfully",
      });
      
      onRefresh();
    } catch (error) {
      console.error('Error updating request status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update request status. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(requests.length / itemsPerPage);
  const paginatedRequests = requests.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <>
      <div className="rounded-md border border-gray-200 dark:border-gray-700">
        <Table className="w-full">
          <TableHeader className="bg-gray-50 dark:bg-gray-800">
            <TableRow>
              <TableHead className="w-[200px] text-gray-900 dark:text-white">Reference</TableHead>
              <TableHead className="w-[200px] text-gray-900 dark:text-white">Service Type</TableHead>
              <TableHead className="w-[200px] text-gray-900 dark:text-white">Created By</TableHead>
              <TableHead className="w-[200px] text-gray-900 dark:text-white">Date</TableHead>
              <TableHead className="w-[200px] text-gray-900 dark:text-white">Assigned To</TableHead>
              <TableHead className="w-[120px] text-gray-900 dark:text-white">Status</TableHead>
              <TableHead className="w-[100px] text-right text-gray-900 dark:text-white">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRequests.map((request) => (
              <TableRow 
                key={request.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <TableCell className="font-medium text-gray-900 dark:text-white">
                  {request.reference_number}
                </TableCell>
                <TableCell className="text-gray-700 dark:text-gray-300">
                  {request.service_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </TableCell>
                <TableCell className="text-gray-700 dark:text-gray-300">
                  {request.created_by?.fullname || 'Unknown'}
                </TableCell>
                <TableCell className="text-gray-700 dark:text-gray-300">
                  {formatDate(request.created_at)}
                </TableCell>
                <TableCell className="text-gray-700 dark:text-gray-300">
                  {request.assigned_to?.fullname || '-'}
                </TableCell>
                <TableCell>
                  <StatusBadge status={request.status} />
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                      {status === 'new' && (
                        <>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedRequest(request);
                              setAssignDialogOpen(true);
                            }}
                            className="cursor-pointer"
                          >
                            Assign to Handler
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(request.id, 'unable_to_handle')}
                            className="cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                            Mark as Unhandled
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      {status === 'in_progress' && (
                        <>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(request.id, 'completed')}
                            className="cursor-pointer"
                          >
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                            Mark as Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(request.id, 'investigating')}
                            className="cursor-pointer"
                          >
                            <Search className="h-4 w-4 mr-2 text-[#0A2647]" />
                            Move to Investigation
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(request.id, 'sent_back')}
                            className="cursor-pointer"
                          >
                            <RotateCcw className="h-4 w-4 mr-2 text-orange-500" />
                            Send Back
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      {status === 'pending_investigation' && (
                        <>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(request.id, 'completed')}
                            className="cursor-pointer"
                          >
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                            Mark as Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(request.id, 'sent_back')}
                            className="cursor-pointer"
                          >
                            <RotateCcw className="h-4 w-4 mr-2 text-orange-500" />
                            Send Back
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      {(status === 'unable_to_handle' || status === 'sent_back') && (
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedRequest(request);
                            setAssignDialogOpen(true);
                          }}
                          className="cursor-pointer"
                        >
                          Reassign to Handler
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            
            {paginatedRequests.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-gray-500 dark:text-gray-400">
                  No requests found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="text-[#0A2647] border-[#0A2647] dark:text-white dark:border-white"
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-[#0A2647] border-[#0A2647] dark:text-white dark:border-white"
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-[#0A2647] border-[#0A2647] dark:text-white dark:border-white"
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className="text-[#0A2647] border-[#0A2647] dark:text-white dark:border-white"
          >
            Last
          </Button>
        </div>
      )}

      {/* Assign Handler Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Request to Handler</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Request Reference
              </label>
              <p className="text-sm text-gray-900 dark:text-white font-medium">
                {selectedRequest?.reference_number}
              </p>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Service Type
              </label>
              <p className="text-sm text-gray-900 dark:text-white">
                {selectedRequest?.service_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select Handler
              </label>
              <Select onValueChange={setSelectedHandler}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a handler" />
                </SelectTrigger>
                <SelectContent>
                  {(status === 'new' || status === 'unable_to_handle' || status === 'sent_back') && (
                    /* Here you would map available handlers for this service type */
                    Array.isArray(selectedRequest?.handlers) && selectedRequest.handlers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.fullname}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignDialogOpen(false);
                setSelectedRequest(null);
                setSelectedHandler(null);
              }}
              className="text-gray-700 dark:text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignRequest}
              disabled={!selectedHandler || isSubmitting}
              className="bg-[#0A2647] text-white hover:bg-[#0A2647]/90 dark:bg-white dark:text-[#0A2647] dark:hover:bg-white/90"
            >
              {isSubmitting ? (
                <>Loading...</>
              ) : (
                <>Assign</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};