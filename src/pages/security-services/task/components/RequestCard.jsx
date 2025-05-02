// src/pages/security-services/task/components/RequestCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Clock, User, Phone, Calendar, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import StatusBadge from './StatusBadge';
import { SERVICE_LABELS } from '../utils/taskConstants';

const RequestCard = ({ 
  request, 
  onClick, 
  isLoading, 
  actionButton = null, 
  highlighted = false
}) => {
  const {
    reference_number,
    service_type,
    status,
    created_at,
    full_names,
    primary_contact,
    updated_at
  } = request;

  const formattedDate = new Date(created_at).toLocaleDateString();
  const timeAgo = formatDistanceToNow(new Date(updated_at || created_at), { addSuffix: true });
  const serviceLabel = SERVICE_LABELS[service_type] || service_type;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-sm 
                 border-l-4 ${highlighted ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700'} 
                 overflow-hidden cursor-pointer transition-all hover:shadow-md`}
      onClick={() => !isLoading && onClick && onClick(request)}
    >
      {/* Card Body */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {reference_number}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {serviceLabel}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center text-gray-700 dark:text-gray-300">
            <User className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
            <span className="truncate">{full_names}</span>
          </div>
          
          <div className="flex items-center text-gray-700 dark:text-gray-300">
            <Phone className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
            <span>{primary_contact}</span>
          </div>
          
          <div className="flex items-center text-gray-700 dark:text-gray-300">
            <Calendar className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
            <span>{formattedDate}</span>
          </div>
          
          <div className="flex items-center text-gray-700 dark:text-gray-300">
            <Clock className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
            <span className="text-xs">{timeAgo}</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      {actionButton && (
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
          {actionButton}
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </motion.div>
  );
};

export default RequestCard;