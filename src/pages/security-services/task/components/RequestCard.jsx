import React from 'react';
import { Card, CardContent } from '../../../../components/ui/card';
import { MessageSquare, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { STATUS_CONFIG } from '../utils/constants';
import { cn } from "../../../../lib/utils";
import StatusBadge from './StatusBadge';

/**
 * Card component for displaying a service request
 */
const RequestCard = ({ request, onClick, loading = false }) => {
  if (!request) return null;
  
  const isCompleted = request.status === 'completed';
  const isAssigned = request.assigned_to && request.status !== 'new';
  const config = STATUS_CONFIG[request.status] || STATUS_CONFIG.new;
  
  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-lg transition-all duration-200",
        `border-l-4 ${config.border}`,
        "dark:bg-gray-800/50",
        isCompleted && "bg-green-50"
      )}
      onClick={() => onClick(request)}
    >
      <CardContent className="p-6">
        {/* Header with Service Type and Status */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-medium dark:text-gray-100">
              {request.service_type.replace(/_/g, ' ').toUpperCase()}
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
          {isAssigned && (
            <div className="mt-2 flex items-center text-sm text-muted-foreground">
              <User className="h-4 w-4 mr-1" />
              <span>Assigned to: {request.assigned_to.fullname}</span>
            </div>
          )}
          
          {/* Meta Information */}
          <div className="flex justify-between items-center pt-2 mt-2 border-t dark:border-gray-700">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
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