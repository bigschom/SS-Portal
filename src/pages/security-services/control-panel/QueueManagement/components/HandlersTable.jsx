// src/pages/security-services/control-panel/QueueManagement/components/HandlersTable.jsx
import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../../../../components/ui/table';
import { Button } from '../../../../../components/ui/button';
import { Trash2, UserPlus } from 'lucide-react';
import { useToast } from '../../../../../components/ui/use-toast';
import { assignHandler, removeHandler } from '../api/queueService';
import AssignHandlerModal from './AssignHandlerModal';

export const HandlersTable = ({ handlers, users, searchTerm, onRefresh }) => {
  const { toast } = useToast();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter handlers based on search term
  const filteredHandlers = handlers.filter(handler => {
    const serviceName = handler.service_type?.toLowerCase() || '';
    const userName = handler.user?.fullname?.toLowerCase() || '';
    return serviceName.includes(searchTerm.toLowerCase()) || userName.includes(searchTerm.toLowerCase());
  });

  // Group handlers by service type
  const handlersByService = filteredHandlers.reduce((acc, handler) => {
    if (!acc[handler.service_type]) {
      acc[handler.service_type] = [];
    }
    acc[handler.service_type].push(handler);
    return acc;
  }, {});

  const handleAddHandler = (serviceType) => {
    setSelectedService(serviceType);
    setShowAssignModal(true);
  };
  
  const handleAssignHandler = async (serviceType, userId) => {
    try {
      setIsSubmitting(true);
      
      const result = await assignHandler(serviceType, userId);
      
      toast({
        title: "Success",
        description: result.message || "Handler assigned successfully",
      });
      
      onRefresh();
    } catch (error) {
      console.error('Error assigning handler:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to assign handler. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
      setShowAssignModal(false);
    }
  };
  
  const handleRemoveHandler = async (id) => {
    try {
      setIsSubmitting(true);
      
      const result = await removeHandler(id);
      
      toast({
        title: "Success",
        description: result.message || "Handler removed successfully",
      });
      
      onRefresh();
    } catch (error) {
      console.error('Error removing handler:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove handler. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="rounded-md border border-gray-200 dark:border-gray-700">
        <Table className="w-full">
          <TableHeader className="bg-gray-50 dark:bg-gray-800">
            <TableRow>
              <TableHead className="w-1/3 text-gray-900 dark:text-white">Service</TableHead>
              <TableHead className="w-1/3 text-gray-900 dark:text-white">Handlers</TableHead>
              <TableHead className="w-1/3 text-gray-900 dark:text-white text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(handlersByService).map(([serviceType, serviceHandlers]) => (
              <TableRow 
                key={serviceType}
                className="hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <TableCell className="font-medium text-gray-900 dark:text-white">
                  {serviceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {serviceHandlers.map(handler => (
                      <div 
                        key={handler.id}
                        className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1"
                      >
                        <span className="text-sm text-gray-900 dark:text-white">
                          {handler.user?.fullname || 'Unknown User'}
                        </span>
                        <button
                          onClick={() => handleRemoveHandler(handler.id)}
                          disabled={isSubmitting}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddHandler(serviceType)}
                    disabled={isSubmitting}
                    className="text-[#0A2647] border-[#0A2647] dark:text-white dark:border-white hover:bg-[#0A2647]/10 dark:hover:bg-white/10"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Handler
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {Object.keys(handlersByService).length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'No matching handlers found' : 'No handlers assigned yet'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AssignHandlerModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onAssign={(userId) => handleAssignHandler(selectedService, userId)}
        users={users}
        service={selectedService}
        isSubmitting={isSubmitting}
      />
    </>
  );
};