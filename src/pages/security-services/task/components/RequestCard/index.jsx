// src/pages/security-services/task/components/tasks/RequestCard/index.jsx
import React from 'react';
import { Card, CardContent } from '../../../../../components/ui/card';
import { MessageSquare, Calendar, User, Loader2 } from 'lucide-react';
import StatusBadge from '../StatusBadge';
import { format } from 'date-fns';
import { STATUS_CONFIG } from '../../utils/taskConstants';
import { cn } from "../../../../../lib/utils";

const RequestCard = ({ request, onClick, loading = false }) => {
  if (!request) return null;
  
  const isCompleted = request.status === 'completed';
  const isAssigned = request.assigned_to && request.status !== 'new';
  const config = STATUS_CONFIG[request.status] || STATUS_CONFIG.new;
  
  // Format the service type for display
  const formattedServiceType = request.service_type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
  
  // Format date to be more readable
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-lg transition-all duration-200",
        `border-l-4 ${config.border}`,
        "dark:bg-gray-800/50",
        isCompleted && "bg-green-50"
      )}
      onClick={loading ? undefined : onClick}
    >
      <CardContent className="p-6 relative">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center rounded-md z-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {/* Header with Service Type and Status */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-medium dark:text-gray-100">
              {formattedServiceType}
            </h3>
            <p className="text-sm text-muted-foreground">
              {request.reference_number}
            </p>
          </div>
          <StatusBadge status={request.status} />
        </div>

        {/* Customer Information */}
        <div className="space-y-2">
          <div className="flex flex-col">
            <span className="text-sm font-medium dark:text-gray-300">
              {request.full_names}
            </span>
            <span className="text-sm text-muted-foreground">
              {request.primary_contact}
            </span>
          </div>

          {/* Assignment Information */}
          {isAssigned && request.assigned_to && (
            <div className="mt-2 flex items-center text-sm text-muted-foreground">
              <User className="h-4 w-4 mr-1" />
              <span>Assigned to: {request.assigned_to.fullname || 'Unknown'}</span>
            </div>
          )}

          {/* Meta Information */}
          <div className="flex justify-between items-center pt-2 mt-2 border-t dark:border-gray-700">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {formatDate(request.created_at)}
              </span>
            </div>

            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span>{request.request_comments?.length || 0}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RequestCard;