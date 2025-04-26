// src/pages/security-services/control-panel/QueueManagement/components/HandlersTable.jsx
import React, { 
  useState, 
  useMemo, 
  useCallback 
} from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../../../../components/ui/table';
import { Button } from '../../../../../components/ui/button';
import { 
  Trash2, 
  UserPlus, 
  BarChart, 
  Clock 
} from 'lucide-react';
import { useToast } from '../../../../../components/ui/use-toast';
import { 
  assignHandler, 
  removeHandler,
  fetchActiveRequestsByServiceType 
} from '../api/queueService';
import AssignHandlerModal from './AssignHandlerModal';

// Utility function for formatting service type
const formatServiceType = (serviceType) => 
  serviceType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

const HandlersTable = ({ 
  handlers, 
  users, 
  searchTerm = '', 
  onRefresh,
  compact = false 
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [serviceStats, setServiceStats] = useState({});

  // Memoized handlers filtering
  const filteredHandlers = useMemo(() => {
    const searchTermLower = searchTerm.toLowerCase();
    return handlers.filter(handler => {
      const serviceName = handler.service_type?.toLowerCase() || '';
      const userName = handler.user?.fullname?.toLowerCase() || '';
      return serviceName.includes(searchTermLower) || 
             userName.includes(searchTermLower);
    });
  }, [handlers, searchTerm]);

  // Grouped handlers by service type
  const handlersByService = useMemo(() => {
    return filteredHandlers.reduce((acc, handler) => {
      if (!acc[handler.service_type]) {
        acc[handler.service_type] = [];
      }
      acc[handler.service_type].push(handler);
      return acc;
    }, {});
  }, [filteredHandlers]);

  // Fetch active requests for a service type
  const fetchServiceStats = useCallback(async (serviceType) => {
    try {
      const activeRequests = await fetchActiveRequestsByServiceType(serviceType);
      setServiceStats(prev => ({
        ...prev,
        [serviceType]: {
          activeRequests,
          totalHandlers: handlersByService[serviceType]?.length || 0
        }
      }));
    } catch (error) {
      console.error(`Failed to fetch stats for ${serviceType}:`, error);
    }
  }, [handlersByService]);

  // Open assign handler modal
  const handleAddHandler = useCallback((serviceType) => {
    setSelectedService(serviceType);
    setShowAssignModal(true);
  }, []);

  // Assign handlers
  const handleAssignHandlers = useCallback(async (userIds) => {
    setIsSubmitting(true);
    try {
      for (const userId of userIds) {
        await assignHandler(selectedService, userId);
      }
      
      toast({
        title: "Handlers Assigned",
        description: `${userIds.length} handler(s) added to ${formatServiceType(selectedService)}`
      });
      
      onRefresh();
      setShowAssignModal(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Assignment Failed",
        description: error.message || "Failed to assign handlers"
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedService, onRefresh, toast]);

  // Remove handler
  const handleRemoveHandler = useCallback(async (handlerId) => {
    setIsSubmitting(true);
    try {
      await removeHandler(handlerId);
      
      toast({
        title: "Handler Removed",
        description: "Handler has been successfully removed"
      });
      
      onRefresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Removal Failed",
        description: error.message || "Failed to remove handler"
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [onRefresh, toast]);

  // Render service stats
  const renderServiceStats = useCallback((serviceType) => {
    const stats = serviceStats[serviceType] || {};
    
    // Trigger stat fetch if not already fetched
    if (!stats.activeRequests) {
      fetchServiceStats(serviceType);
    }

    return {
      totalHandlers: stats.totalHandlers || handlersByService[serviceType]?.length || 0,
      activeRequests: stats.activeRequests || '-'
    };
  }, [serviceStats, handlersByService, fetchServiceStats]);

  return (
    <>
      <div className="rounded-md border border-gray-200 dark:border-gray-700">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-gray-800">
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Handlers</TableHead>
              <TableHead>Total Handlers</TableHead>
              <TableHead>Active Requests</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(handlersByService).map(([serviceType, serviceHandlers]) => {
              const stats = renderServiceStats(serviceType);
              
              return (
                <TableRow 
                  key={serviceType}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <TableCell className="font-medium">
                    {formatServiceType(serviceType)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {serviceHandlers.map(handler => (
                        <div 
                          key={handler.id}
                          className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1"
                        >
                          <span className="text-sm">
                            {handler.user?.fullname || 'Unknown'}
                          </span>
                          <button
                            onClick={() => handleRemoveHandler(handler.id)}
                            disabled={isSubmitting}
                            className="text-red-500 hover:text-red-700 dark:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{stats.totalHandlers}</span>
                      <BarChart className="h-4 w-4 text-blue-500" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{stats.activeRequests}</span>
                      <Clock className="h-4 w-4 text-orange-500" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddHandler(serviceType)}
                      disabled={isSubmitting}
                      className="text-[#0A2647] border-[#0A2647] dark:text-white dark:border-white"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Handlers
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {Object.keys(handlersByService).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {searchTerm 
                    ? 'No matching handlers found' 
                    : 'No handlers assigned yet'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AssignHandlerModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onAssign={handleAssignHandlers}
        users={users}
        service={selectedService}
        isSubmitting={isSubmitting}
      />
    </>
  );
};

export default HandlersTable;