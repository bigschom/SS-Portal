import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/config/supabase';

const AddServiceDialog = ({ isOpen, onClose, onServiceAdded }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    service_type: '',
    name: '',
    description: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Insert new service
      const { data, error } = await supabase
        .from('services')
        .insert({
          service_type: formData.service_type.toLowerCase().replace(/\s+/g, '_'),
          name: formData.name,
          description: formData.description,
          is_visible: true
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service added successfully",
      });

      onServiceAdded(data);
      onClose();
    } catch (error) {
      console.error('Error adding service:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add service",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>Add New Service</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Service Name</label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter service name"
              className="mt-1"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Service Type</label>
            <Input
              name="service_type"
              value={formData.service_type}
              onChange={handleChange}
              placeholder="Enter service type (e.g., call_history)"
              className="mt-1"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter service description"
              className="mt-1"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddServiceDialog;
