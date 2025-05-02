// src/pages/security-services/task/components/StatusBadge.jsx
import React from 'react';
import { STATUS_CONFIG } from '../utils/taskConstants';

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || {
    label: status,
    bg: 'bg-gray-50 dark:bg-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    iconColor: 'text-gray-600 dark:text-gray-400',
    Icon: null
  };

  const { label, bg, text, iconColor, icon: Icon } = config;

  return (
    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {Icon && <Icon className={`w-3.5 h-3.5 mr-1 ${iconColor}`} />}
      {label}
    </div>
  );
};

export default StatusBadge;