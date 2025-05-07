import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RotateCcw,
  Search
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../../components/ui/tooltip';

/**
 * Status badge component using colored icons without backgrounds
 */
const StatusBadge = ({ status, showLabel = false }) => {
  // Select the appropriate icon and color based on status
  const getStatusIcon = () => {
    switch(status) {
      case 'new':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'in_progress':
        return <Search className="w-5 h-5 text-yellow-500" />;
      case 'pending_investigation':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'sent_back':
        return <RotateCcw className="w-5 h-5 text-red-500" />;
      case 'unable_to_handle':
        return <AlertTriangle className="w-5 h-5 text-gray-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500" />;
    }
  };
  
  // Get the label for the status
  const getStatusLabel = () => {
    switch(status) {
      case 'new':
        return 'New';
      case 'in_progress':
        return 'In Progress';
      case 'pending_investigation':
        return 'Pending Investigation';
      case 'completed':
        return 'Completed';
      case 'sent_back':
        return 'Sent Back';
      case 'unable_to_handle':
        return 'Unable to Handle';
      default:
        return 'Unknown';
    }
  };
  
  // Get tooltip description
  const getTooltipDescription = () => {
    switch(status) {
      case 'new':
        return 'This request is newly created and waiting to be assigned';
      case 'in_progress':
        return 'This request is currently being processed by a handler';
      case 'pending_investigation':
        return 'This request requires additional investigation before it can be completed';
      case 'completed':
        return 'This request has been successfully completed';
      case 'sent_back':
        return 'This request has been sent back to the requestor for more information';
      case 'unable_to_handle':
        return 'This request cannot be handled at this time';
      default:
        return '';
    }
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center">
            {getStatusIcon()}
            {showLabel && <span className="ml-1 text-sm font-medium">{getStatusLabel()}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{getStatusLabel()}</p>
          <p className="text-xs text-muted-foreground">{getTooltipDescription()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default StatusBadge;