// src/pages/security-services/task/components/tasks/StatusBadge/index.jsx
import React from 'react';
import { STATUS_CONFIG, REQUEST_STATUS } from '../../utils/taskConstants';

const StatusBadge = ({ status }) => {
  // Get config for the provided status, or fallback to NEW status
  const config = STATUS_CONFIG[status] || STATUS_CONFIG[REQUEST_STATUS.NEW];
  
  // Dynamically import the icon component
  const Icon = config.icon;
  
  return (
    <div 
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {Icon && <Icon className={`h-3.5 w-3.5 mr-1 ${config.iconColor}`} />}
      <span>{config.label}</span>
    </div>
  );
};

export default StatusBadge;