// src/pages/admin/ServiceManagement/index.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Search,
  Plus,
  Loader2,
  Trash2,
  Users
} from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/config/supabase';
import  AddServiceDialog  from './components/AddServiceDialog';
import { UserAccessDialog } from './components/UserAccessDialog';

const ServiceManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // States
  const [servicesList, setServicesList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch services from database
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('name');

        if (error) throw error;
        setServicesList(data || []);
      } catch (error) {
        console.error('Error fetching services:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch services",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  // Handle service deletion
  const handleDeleteService = async () => {
    if (!serviceToDelete) return;

    try {
      // First delete from user_service_permissions
      const { error: permissionsError } = await supabase
        .from('user_service_permissions')
        .delete()
        .eq('service_type', serviceToDelete.service_type);

      if (permissionsError) throw permissionsError;

      // Then delete the service
      const { error: serviceError } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceToDelete.id);

      if (serviceError) throw serviceError;

      setServicesList(prev => prev.filter(service => service.id !== serviceToDelete.id));
      
      toast({
        title: "Success",
        description: "Service deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting service:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete service",
      });
    } finally {
      setShowDeleteDialog(false);
      setServiceToDelete(null);
    }
  };

  // Handle new service added
  const handleServiceAdded = (newService) => {
    setServicesList(prev => [...prev, newService]);
    setShowAddDialog(false);
    toast({
      title: "Success",
      description: "New service added successfully",
    });
  };

  // Filter services based on search
  const filteredServices = servicesList.filter(service =>
    service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5EDE3]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="bg-[#F5EDE3] min-h-screen p-6">
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-slate-800 text-xl font-semibold">Service Management</h1>
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#F5EDE3] text-slate-600"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredServices.map((service) => (
          <div 
            key={service.id} 
            className="bg-white border border-slate-200 rounded-lg p-4 relative hover:shadow-md transition-shadow"
          >
            <div className="mb-4">
              <h2 className="text-slate-800 font-semibold">{service.name}</h2>
              <p className="text-slate-500 text-sm">{service.description}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedService(service);
                  setShowAccessDialog(true);
                }}
                className="text-slate-600 hover:bg-[#F5EDE3]"
              >
                <Users className="w-4 h-4 mr-2" />
                Manage
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setServiceToDelete(service);
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        {/* Add New Service Card */}
        <div 
          onClick={() => setShowAddDialog(true)}
          className="bg-white border border-slate-200 border-dashed rounded-lg p-4 flex items-center justify-center cursor-pointer hover:bg-[#F5EDE3] transition-colors"
        >
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-[#F5EDE3] flex items-center justify-center mx-auto mb-2">
              <Plus className="text-slate-500" />
            </div>
            <span className="text-sm text-slate-500">Add New Service</span>
          </div>
        </div>
      </div>

      {/* Add Service Dialog */}
      <AddServiceDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onServiceAdded={handleServiceAdded}
      />

      {/* User Access Dialog */}
      {selectedService && (
        <UserAccessDialog
          service={selectedService}
          isOpen={showAccessDialog}
          onClose={() => {
            setShowAccessDialog(false);
            setSelectedService(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{serviceToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setServiceToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteService} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ServiceManagement;
