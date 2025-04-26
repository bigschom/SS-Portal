// src/pages/security-services/control-panel/QueueManagement/components/AddServiceButtonComponent.jsx
import React, { useState } from 'react';
import { Button } from '../../../../../components/ui/button';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../../../components/ui/dialog';
import { Input } from '../../../../../components/ui/input';
import { Label } from '../../../../../components/ui/label';

const AddServiceButton = ({ onAddService }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!serviceName.trim()) return;
    
    setIsSubmitting(true);
    
    // Call the onAddService callback with the new service name
    onAddService(serviceName.trim().toLowerCase().replace(/\s+/g, '_'))
      .then(() => {
        setServiceName('');
        setShowDialog(false);
      })
      .catch(error => {
        console.error('Error adding service:', error);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <>
      <Button 
        onClick={() => setShowDialog(true)}
        className="bg-[#0A2647] text-white hover:bg-[#0A2647]/80 dark:bg-white dark:text-[#0A2647] dark:hover:bg-white/90"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add New Service
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Service</DialogTitle>
            <DialogDescription>
              Create a new service type to assign handlers to.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="service-name">Service Name</Label>
              <Input
                id="service-name"
                placeholder="Enter service name..."
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                This will be used as the service type identifier. Spaces will be converted to underscores.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="text-gray-700 dark:text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!serviceName.trim() || isSubmitting}
              className="bg-[#0A2647] text-white hover:bg-[#0A2647]/90 dark:bg-white dark:text-[#0A2647] dark:hover:bg-white/90"
            >
              {isSubmitting ? (
                <>Adding...</>
              ) : (
                <>Add Service</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddServiceButton;