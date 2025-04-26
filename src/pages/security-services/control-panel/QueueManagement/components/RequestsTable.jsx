// src/pages/security-services/control-panel/QueueManagement/components/RequestsTable.jsx
import React, { 
  useState, 
  useMemo, 
  useCallback 
} from 'react';
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
  Trash2,
  UserPlus
} from 'lucide-react';
import { useToast } from '../../../../../components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../../../components/ui/dropdown-menu';
import StatusBadge from './StatusBadge';
import { 
  assignRequestToHandler, 
  markRequestUnableToHandle,
  markRequestCompleted,
  markRequestInvestigating,
  sendBackRequest,
  fetchHandlersByServiceType
} from '../api/queueService';

// Memoized date formatter
const createDateFormatter = () => {
  const cache = new Map();
  return (dateString) => {
    if (cache.has(dateString)) return cache.get(dateString);
    
    try {
      const formattedDate = new Intl.DateTimeFormat('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateString));
      
      cache.set(dateString, formattedDate);
      return formattedDate;
    } catch {
      return 'Invalid Date';
    }
  };
};

const formatDate = createDateFormatter();

const RequestsTable = ({ 
  requests, 
  status, 
  onRefresh,
  compact = false 
}) => {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [availableHandlers, setAvailableHandlers] = useState([]);

  // Memoized pagination
  const { 
    paginatedRequests, 
    totalPages 
  } = useMemo(() => {
    const itemsPerPage = compact ? 5 : 10;
    const sortedRequests = [...requests].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );

    return {
      paginatedRequests: sortedRequests.slice(
        (page - 1) * itemsPerPage,
        page * itemsPerPage
      ),
      totalPages: Math.ceil(requests.length / itemsPerPage)
    };
  }, [requests, page, compact]);

  // Open assign handler modal
  const handleOpenAssignModal = useCallback(async (request) => {
    setIsSubmitting(true);
    try {
      const handlers = await fetchHandlersByServiceType(request.service_type);
      setAvailableHandlers(handlers);
      setSelectedRequest(request);
      setAssignModalOpen(true);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch available handlers'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [toast]);

  // Handle request actions
  const handleRequestAction = useCallback(async (action, requestId) => {
    setIsSubmitting(true);
    try {
      let result;
      switch (action) {
        case 'assign':
          result = await assignRequestToHandler(requestId, selectedRequest);
          break;
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
        title: 'Success',
        description: result.message || 'Action completed successfully'
      });

      // Close modal if assignment
      if (action === 'assign') {
        setAssignModalOpen(false);
        setSelectedRequest(null);
      }

      // Refresh data
      onRefresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to perform action'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [toast, onRefresh, selectedRequest]);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-gray-200 dark:border-gray-700">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-gray-800">
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Service Type</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRequests.map((request) => (
              <TableRow 
                key={request.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <TableCell>{request.reference_number}</TableCell>
                <TableCell>
                  {request.service_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </TableCell>
                <TableCell>{request.created_by?.fullname || 'Unknown'}</TableCell>
                <TableCell>{formatDate(request.created_at)}</TableCell>
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
                            onSelect={() => handleOpenAssignModal(request)}
                            className="cursor-pointer"
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign to Handler
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleRequestAction('unable_to_handle', request.id)}
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
                            onSelect={() => handleRequestAction('completed', request.id)}
                            className="cursor-pointer"
                          >
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                            Mark as Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleRequestAction('investigating', request.id)}
                            className="cursor-pointer"
                          >
                            <Search className="h-4 w-4 mr-2 text-[#0A2647]" />
                            Move to Investigation
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleRequestAction('sent_back', request.id)}
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
                            onSelect={() => handleRequestAction('completed', request.id)}
                            className="cursor-pointer"
                          >
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                            Mark as Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleRequestAction('sent_back', request.id)}
                            className="cursor-pointer"
                          >
                            <RotateCcw className="h-4 w-4 mr-2 text-orange-500" />
                            Send Back
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      {(status === 'unable_to_handle' || status === 'sent_back') && (
                        <DropdownMenuItem
                          onSelect={() => handleOpenAssignModal(request)}
                          className="cursor-pointer"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
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
                <TableCell colSpan={6} className="h-24 text-center">
                  No requests found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="self-center">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default RequestsTable;