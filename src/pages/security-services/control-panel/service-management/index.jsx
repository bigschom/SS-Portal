import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../hooks/useAuth';
import { useToast } from '../../../../components/ui/use-toast';
import { Switch } from '../../../../components/ui/switch';
import { Button } from '../../../../components/ui/button';
import { Loader2, Save, ArrowLeft } from 'lucide-react';

// Use the same service data structure from the main component
const SERVICES_DATA = [
  {
    id: 1,
    service_type: 'request_serial_number',
    name: 'Request Serial Number',
    description: 'Request a new serial number',
    isActive: true
  },
  {
    id: 2,
    service_type: 'stolen_phone_check',
    name: 'Stolen Phone Check',
    description: 'Check if a phone is reported stolen',
    isActive: true
  },
  {
    id: 3,
    service_type: 'call_history_request',
    name: 'Call History Request',
    description: 'Request call history',
    isActive: true
  },
  {
    id: 4,
    service_type: 'unblock_call_request',
    name: 'Unblock Call Request',
    description: 'Request to unblock calls',
    isActive: true
  },
  {
    id: 5,
    service_type: 'unblock_momo_request',
    name: 'Unblock MoMo Request',
    description: 'Request to unblock MoMo account',
    isActive: true
  },
  {
    id: 6,
    service_type: 'money_refund_request',
    name: 'Money Refund Request',
    description: 'Request a money refund',
    isActive: true
  },
  {
    id: 7,
    service_type: 'momo_transaction_request',
    name: 'MoMo Transaction Request',
    description: 'Request MoMo transaction details',
    isActive: true
  },
  {
    id: 8,
    service_type: 'backoffice_appointment',
    name: 'Backoffice Appointment',
    description: 'Schedule a backoffice appointment',
    isActive: true
  }
];

const ServiceManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState([]);
  
  // Load saved service status on mount
  useEffect(() => {
    // Check if user is admin (add actual check based on your auth system)
    if (user?.role !== 'admin') {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to access this page."
      });
      navigate('/dashboard');
      return;
    }
    
    try {
      const savedStatus = localStorage.getItem('serviceStatus');
      
      if (savedStatus) {
        const statusMap = JSON.parse(savedStatus);
        
        // Apply saved status to services
        const servicesWithStatus = SERVICES_DATA.map(service => ({
          ...service,
          isActive: statusMap[service.id] !== undefined ? statusMap[service.id] : service.isActive
        }));
        
        setServices(servicesWithStatus);
      } else {
        setServices(SERVICES_DATA);
      }
    } catch (error) {
      console.error('Error loading service status:', error);
      setServices(SERVICES_DATA);
    }
    
    // Simulate loading
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, [navigate, toast, user]);
  
  // Handle toggle service status
  const handleToggleService = (id) => {
    setServices(prevServices => 
      prevServices.map(service => 
        service.id === id 
          ? { ...service, isActive: !service.isActive } 
          : service
      )
    );
  };
  
  // Save service status
  const handleSave = () => {
    setSaving(true);
    
    try {
      // Create a map of service IDs to status
      const statusMap = services.reduce((acc, service) => {
        acc[service.id] = service.isActive;
        return acc;
      }, {});
      
      // Save to localStorage
      localStorage.setItem('serviceStatus', JSON.stringify(statusMap));
      
      toast({
        title: "Success",
        description: "Service status saved successfully."
      });
    } catch (error) {
      console.error('Error saving service status:', error);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save service status."
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Go back to previous page
  const handleBack = () => {
    navigate(-1);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A2647] dark:text-white" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Service Control Panel
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Toggle services on or off to control their availability
            </p>
          </div>
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="bg-[#0A2647] hover:bg-[#0D3B66] text-white"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {services.map(service => (
              <li 
                key={service.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {service.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {service.description}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <span className={`mr-3 text-sm ${service.isActive ? 'text-green-500' : 'text-red-500'}`}>
                      {service.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <Switch
                      checked={service.isActive}
                      onCheckedChange={() => handleToggleService(service.id)}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ServiceManagement;