import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../components/ui/use-toast';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { AlertCircle, Loader2 } from 'lucide-react';

import ServiceCard from './components/ServiceCard';
import { FormProvider } from './context/FormContext';
import apiService from '../../../config/api-service';

// Import all service request components
import SerialNumberRequest from './components/SerialNumberRequest';
import StolenPhoneCheck from './components/StolenPhoneCheck';
import CallHistoryRequest from './components/CallHistoryRequest';
import UnblockCallRequest from './components/UnblockCallRequest';
import UnblockMomoRequest from './components/UnblockMomoRequest';
import MoneyRefundRequest from './components/MoneyRefundRequest';
import MomoTransactionRequest from './components/MomoTransactionRequest';
import BackofficeAppointment from './components/BackofficeAppointment';

const SecurityServices = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [pageLoading, setPageLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState(null);
  
  const [selectedService, setSelectedService] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [services, setServices] = useState([]);
  const [permittedServices, setPermittedServices] = useState([]);
  
  // Use a ref to prevent unnecessary API calls
  const fetchedRef = useRef(false);

  // Fetch available services and permissions
  useEffect(() => {
    const fetchServices = async () => {
      // Prevent redundant fetches
      if (fetchedRef.current) return;
      
      try {
        if (!user) {
          setPageLoading(false);
          setServicesLoading(false);
          return;
        }
        
        setServicesLoading(true);
        fetchedRef.current = true;
        
        console.log('Fetching security services...');
        
        // Fetch available services
        const servicesResult = await apiService.securityServices.getAvailableServices();
        if (servicesResult.error) {
          throw new Error(servicesResult.error);
        }
        
        // Fetch user permissions
        const permissionsResult = await apiService.securityServices.getUserServicePermissions(user.id);
        if (permissionsResult.error) {
          throw new Error(permissionsResult.error);
        }
        
        const servicesData = servicesResult.services || [];
        const permittedTypes = permissionsResult.permissions || [];
        
        console.log('Services fetched:', servicesData.length);
        console.log('User permissions fetched:', permittedTypes.length);
        
        // Filter services based on user permissions
        const userServices = servicesData.filter(service => 
          permittedTypes.includes(service.service_type) || user.role === 'admin'
        );
        
        setServices(servicesData);
        setPermittedServices(userServices);
        
      } catch (error) {
        console.error('Error fetching services:', error);
        setServicesError(error);
        
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load available services. Please try again.",
        });
        
      } finally {
        setServicesLoading(false);
        setPageLoading(false);
      }
    };

    fetchServices();
    
    // Cleanup function
    return () => {
      fetchedRef.current = false;
    };
  }, [user, toast]);

  const handleServiceSelect = useCallback((service) => {
    setSelectedService(service);
    setShowForm(true);
  }, []);

  const handleBack = useCallback(() => {
    setShowForm(false);
    setSelectedService(null);
  }, []);

  // Function to render the appropriate service component
  const renderServiceComponent = useCallback(() => {
    if (!selectedService) return null;

    const props = {
      onBack: handleBack,
      serviceId: selectedService.id,
      serviceType: selectedService.service_type
    };

    switch (selectedService.service_type) {
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
      case 'backoffice_appointment':
        return <BackofficeAppointment {...props} />;
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

  // Filter services based on selected tab
  const filteredServices = useCallback(() => {
    if (activeTab === 'all') return permittedServices;
    
    if (activeTab === 'phone') {
      return permittedServices.filter(service => 
        ['request_serial_number', 'stolen_phone_check', 'call_history_request', 'unblock_call_request'].includes(service.service_type)
      );
    }
    
    if (activeTab === 'momo') {
      return permittedServices.filter(service => 
        ['momo_transaction_request', 'unblock_momo_request', 'money_refund_request'].includes(service.service_type)
      );
    }
    
    if (activeTab === 'other') {
      return permittedServices.filter(service => 
        ['backoffice_appointment'].includes(service.service_type)
      );
    }
    
    return [];
  }, [activeTab, permittedServices]);

  // Check if there are services in each category
  const hasPhoneServices = permittedServices.some(service => 
    ['request_serial_number', 'stolen_phone_check', 'call_history_request', 'unblock_call_request'].includes(service.service_type)
  );
  
  const hasMomoServices = permittedServices.some(service => 
    ['momo_transaction_request', 'unblock_momo_request', 'money_refund_request'].includes(service.service_type)
  );
  
  const hasOtherServices = permittedServices.some(service => 
    ['backoffice_appointment'].includes(service.service_type)
  );

  // Loading state
  if (pageLoading || servicesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A2647] dark:text-white" />
      </div>
    );
  }

  // Error state
  if (servicesError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load services. Please try again later.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <FormProvider>
      {!showForm ? (
        <div className="min-h-screen bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Security Services</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Select a service to submit a new request
                </p>
              </div>

              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4 rounded-lg bg-gray-100 dark:bg-gray-800">
                  <TabsTrigger 
                    value="all" 
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
                  >
                    All Services ({permittedServices.length})
                  </TabsTrigger>
                  {hasPhoneServices && (
                    <TabsTrigger 
                      value="phone" 
                      className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
                    >
                      SIM Card & Phone
                    </TabsTrigger>
                  )}
                  {hasMomoServices && (
                    <TabsTrigger 
                      value="momo" 
                      className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
                    >
                      MoMo Services
                    </TabsTrigger>
                  )}
                  {hasOtherServices && (
                    <TabsTrigger 
                      value="other" 
                      className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
                    >
                      Other Services
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                  {filteredServices().length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No services available in this category
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredServices().map((service) => (
                        <ServiceCard
                          key={service.id}
                          service={service}
                          onSelect={() => handleServiceSelect(service)}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>
        </div>
      ) : (
        // When showing a service form, just render it directly
        <AnimatePresence mode="wait">
          {renderServiceComponent()}
        </AnimatePresence>
      )}
    </FormProvider>
  );
};

export default SecurityServices;