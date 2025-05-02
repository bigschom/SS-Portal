// src/pages/security-services/new-request/components/ServiceCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

// Import the necessary icons
import { 
  Smartphone, 
  ShieldAlert, 
  Phone, 
  PhoneOff, 
  Wallet, 
  RotateCcw, 
  CreditCard, 
  Users, 
  Calendar, 
  Wifi, 
  PanelRightOpen 
} from 'lucide-react';

const ServiceCard = ({ service, onSelect }) => {
  // Function to get the appropriate icon for each service type
  const getServiceIcon = (serviceType) => {
    switch (serviceType) {
      case 'request_serial_number':
        return <Smartphone className="h-6 w-6 text-blue-500" />;
      case 'check_stolen_phone':
        return <ShieldAlert className="h-6 w-6 text-red-500" />;
      case 'call_history':
        return <Phone className="h-6 w-6 text-purple-500" />;
      case 'unblock_call':
        return <PhoneOff className="h-6 w-6 text-orange-500" />;
      case 'unblock_momo':
        return <Wallet className="h-6 w-6 text-blue-500" />;
      case 'money_refund':
        return <RotateCcw className="h-6 w-6 text-green-500" />;
      case 'momo_transaction':
        return <CreditCard className="h-6 w-6 text-blue-500" />;
      case 'agent_commission':
        return <Users className="h-6 w-6 text-indigo-500" />;
      case 'backoffice_appointment':
        return <Calendar className="h-6 w-6 text-pink-500" />;
      case 'internet_issue':
        return <Wifi className="h-6 w-6 text-yellow-500" />;
      case 'request_followup':
        return <PanelRightOpen className="h-6 w-6 text-gray-500" />;
      default:
        return <Smartphone className="h-6 w-6 text-gray-500" />;
    }
  };

  // Function to get category label
  const getCategoryLabel = (serviceType) => {
    if (['request_serial_number', 'check_stolen_phone', 'call_history', 'unblock_call'].includes(serviceType)) {
      return 'SIM Card & Phone';
    } else if (['momo_transaction', 'unblock_momo', 'money_refund'].includes(serviceType)) {
      return 'MoMo Services';
    } else {
      return 'Other Services';
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
      transition={{ duration: 0.2 }}
      onClick={onSelect}
      className="bg-white dark:bg-gray-800 cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-center space-x-3 mb-3">
          {getServiceIcon(service.service_type)}
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            {getCategoryLabel(service.service_type)}
          </span>
        </div>

        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
          {service.name}
        </h3>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {service.description}
        </p>
        
        <div className="flex justify-end items-center text-[#0A2647] dark:text-white font-medium text-sm">
          Request Service
          <ChevronRight className="h-4 w-4 ml-1" />
        </div>
      </div>
    </motion.div>
  );
};

export default ServiceCard;