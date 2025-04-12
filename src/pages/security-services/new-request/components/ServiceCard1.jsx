import React from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronRight, 
  Smartphone, 
  PhoneCall, 
  ShieldIcon, 
  ClockIcon,
  CreditCardIcon,
  RefreshCcwIcon,
  LockIcon,
  UsersIcon,
  CalendarIcon,
  WifiIcon,
  FileTextIcon
} from 'lucide-react';

const ServiceCard = ({ service, onSelect }) => {
  // Get icon based on service type
  const getIcon = () => {
    const iconProps = { className: "h-8 w-8" };

    switch (service.value) {
      case 'request_serial_number':
        return <Smartphone {...iconProps} className="text-blue-500" />;
      case 'check_stolen_phone':
        return <ShieldIcon {...iconProps} className="text-red-500" />;
      case 'call_history':
        return <ClockIcon {...iconProps} className="text-purple-500" />;
      case 'unblock_call':
        return <PhoneCall {...iconProps} className="text-green-500" />;
      case 'momo_transaction':
        return <CreditCardIcon {...iconProps} className="text-orange-500" />;
      case 'unblock_momo':
        return <LockIcon {...iconProps} className="text-indigo-500" />;
      case 'money_refund':
        return <RefreshCcwIcon {...iconProps} className="text-amber-500" />;
      case 'agent_commission':
        return <UsersIcon {...iconProps} className="text-teal-500" />;
      case 'backoffice_appointment':
        return <CalendarIcon {...iconProps} className="text-pink-500" />;
      case 'internet_issue':
        return <WifiIcon {...iconProps} className="text-cyan-500" />;
      case 'request_followup':
        return <FileTextIcon {...iconProps} className="text-gray-500" />;
      default:
        return service.icon || <Smartphone {...iconProps} className="text-gray-500" />;
    }
  };

  // Get category label based on service type
  const getCategoryLabel = () => {
    if (['request_serial_number', 'check_stolen_phone', 'call_history', 'unblock_call'].includes(service.value)) {
      return "SIM Card & Phone";
    }
    if (['momo_transaction', 'unblock_momo', 'money_refund'].includes(service.value)) {
      return "MoMo Services";
    }
    if (['agent_commission', 'backoffice_appointment', 'internet_issue', 'request_followup'].includes(service.value)) {
      return "Other Services";
    }
    return service.categoryLabel || "Service";
  };


  return (
          <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg border border-gray-200 dark:border-gray-700"
      onClick={onSelect}
    >


      
      <div className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            {getIcon()}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{service.name}</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{service.description}</p>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
            {getCategoryLabel()}
          </span>
          <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
      </div>
    </motion.div>
  );
};

export default ServiceCard;
