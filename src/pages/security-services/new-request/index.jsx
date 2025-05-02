import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../components/ui/use-toast';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

import { FormProvider } from './context/FormContext';

// Import all service request components
import SerialNumberRequest from './components/SerialNumberRequest';
import StolenPhoneCheck from './components/StolenPhoneCheck';
import CallHistoryRequest from './components/CallHistoryRequest';
import UnblockCallRequest from './components/UnblockCallRequest';
import UnblockMomoRequest from './components/UnblockMomoRequest';
import MoneyRefundRequest from './components/MoneyRefundRequest';
import MomoTransactionRequest from './components/MomoTransactionRequest';
import BackofficeAppointment from './components/BackofficeAppointment';
import OtherRequest from './components/OtherRequest';

// Simplified service card component
const SimpleServiceCard = ({ service, onSelect }) => {
  return (
    <div 
      onClick={() => onSelect(service)}
      className={`
        bg-white dark:bg-gray-800 
        shadow-lg rounded-xl 
        p-6 cursor-pointer 
        transform transition-all duration-300
        h-full flex items-center justify-center
        border-2 border-transparent
        hover:border-[#0A2647] hover:shadow-xl
        ${service.isActive ? "" : "opacity-60"}
      `}
    >
      <h3 className="text-xl font-semibold text-center text-gray-900 dark:text-white">
        {service.name}
      </h3>
    </div>
  );
};

// Hardcoded services data with active status
const SERVICES_DATA = [
  {
    id: 1,
    service_type: 'backoffice_appointment',
    name: 'Backoffice Appointment',
    isActive: true
  },
  {
    id: 2,
    service_type: 'call_history_request',
    name: 'Call History Request',
    isActive: true
  },
  {
    id: 3,
    service_type: 'unblock_momo_request',
    name: 'MoMo Acc Unblock Request',
    isActive: true
  },
  {
    id: 4,
    service_type: 'momo_transaction_request',
    name: 'MoMo Transaction Request',
    isActive: true
  },
  {
    id: 5,
    service_type: 'money_refund_request',
    name: 'MoMo Reversal Request',
    isActive: true
  },
  {
    id: 6,
    service_type: 'request_serial_number',
    name: 'Request Serial Number',
    isActive: true
  },
  {
    id: 7,
    service_type: 'unblock_call_request',
    name: 'SIM Card Unblock',
    isActive: true
  },

  {
    id: 8,
    service_type: 'stolen_phone_check',
    name: 'Stolen Phone Check',
    isActive: true
  },

  {
    id: 9,
    service_type: 'other_requests',
    name: 'Other Requests',
    isActive: true
  }






];

// Get service status from localStorage or use defaults
const getServicesWithStatus = () => {
  try {
    const savedStatus = localStorage.getItem('serviceStatus');
    if (savedStatus) {
      const statusMap = JSON.parse(savedStatus);
      
      // Apply saved status to services
      return SERVICES_DATA.map(service => ({
        ...service,
        isActive: statusMap[service.id] !== undefined ? statusMap[service.id] : service.isActive
      }));
    }
  } catch (error) {
    console.error('Error loading service status:', error);
  }
  
  return SERVICES_DATA;
};

const SecurityServices = () => {
  // UI state
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [services, setServices] = useState(getServicesWithStatus());
  
  // Hooks
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Simulate loading on component mount
  useEffect(() => {
    // Simulate brief loading for UX consistency
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle service selection
  const handleServiceSelect = useCallback((service) => {
    // Check if service is active
    if (!service.isActive) {
      toast({
        variant: "destructive",
        title: "Service Unavailable",
        description: `${service.name} is currently unavailable. Please try again later.`
      });
      return;
    }
    
    setSelectedService(service);
    setShowForm(true);
  }, [toast]);

  // Handle back button press
  const handleBack = useCallback(() => {
    setSelectedService(null);
    setShowForm(false);
  }, []);
  
  // Render appropriate service component
  const renderServiceComponent = useCallback(() => {
    if (!selectedService) return null;
    
    const props = {
      onBack: handleBack,
      serviceId: selectedService.id,
      serviceType: selectedService.service_type
    };
    
    switch (selectedService.service_type) {
      
      case 'backoffice_appointment':
        return <BackofficeAppointment {...props} />;
        case 'request_serial_number':
        return <SerialNumberRequest {...props} />;
      case 'stolen_phone_check':
        return <StolenPhoneCheck {...props} />;
      case 'call_history_request':
        return <CallHistoryRequest {...props} />;
      case 'unblock_call_request':
        return <UnblockCallRequest {...props} />;
      case 'unblock_momo_request':
        return <UnblockMomoRequest {...props} />;
      case 'money_refund_request':
        return <MoneyRefundRequest {...props} />;
      case 'momo_transaction_request':
        return <MomoTransactionRequest {...props} />;
      case 'other_requests':
        return <OtherRequest {...props} />;

      default:
        return (
          <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
            <Alert className="max-w-lg">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This service form is not yet implemented. Please check back later.
              </AlertDescription>
            </Alert>
          </div>
        );
    }
  }, [selectedService, handleBack]);
  
  // Show loading spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A2647] dark:text-white" />
      </div>
    );
  }
  
  // Main UI
  return (
    <FormProvider>
      {!showForm ? (
        <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 flex items-start justify-center pt-24">
          <div className="container max-w-6xl mx-auto px-4 -mt-16"> <br></br> <br></br>
            <AnimatePresence>
              <motion.div
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {services.map((service, index) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      transition: { delay: index * 0.1 }
                    }}
                    whileHover={{ 
                      scale: 1.05,
                      transition: { duration: 0.2 }
                    }}
                    className="h-32 md:h-40" // Increased height for cards
                  >
                    <SimpleServiceCard
                      service={service}
                      onSelect={handleServiceSelect}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {renderServiceComponent()}
        </AnimatePresence>
      )}
    </FormProvider>
  );
};

export default SecurityServices;