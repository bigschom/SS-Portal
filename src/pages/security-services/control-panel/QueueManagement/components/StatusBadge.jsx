// src/pages/security-services/control-panel/QueueManagement/components/StatusBadge.jsx
import React from 'react';
import { Clock, AlertTriangle, CheckCircle2, RotateCcw, Search } from 'lucide-react';

const StatusBadge = ({ status }) => {
  let badgeStyle = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  let icon = null;
  let label = "";

  switch (status) {
    case 'new':
      badgeStyle += " bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      icon = <Clock className="h-3 w-3 mr-1" />;
      label = "New";
      break;
    case 'unable_to_handle':
      badgeStyle += " bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
      icon = <AlertTriangle className="h-3 w-3 mr-1" />;
      label = "Unhandled";
      break;
    case 'in_progress':
      badgeStyle += " bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      icon = <Clock className="h-3 w-3 mr-1" />;
      label = "In Progress";
      break;
    case 'pending_investigation':
      badgeStyle += " bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
      icon = <Search className="h-3 w-3 mr-1" />;
      label = "Investigating";
      break;
    case 'completed':
      badgeStyle += " bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      icon = <CheckCircle2 className="h-3 w-3 mr-1" />;
      label = "Completed";
      break;
    case 'sent_back':
      badgeStyle += " bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
      icon = <RotateCcw className="h-3 w-3 mr-1" />;
      label = "Sent Back";
      break;
    default:
      badgeStyle += " bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
      label = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  return (
    <span className={badgeStyle}>
      {icon}
      {label}
    </span>
  );
};

export default StatusBadge;