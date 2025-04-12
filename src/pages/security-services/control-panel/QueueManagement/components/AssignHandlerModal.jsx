// src/pages/security-services/control-panel/QueueManagement/components/AssignHandlerModal.jsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../../../components/ui/dialog';
import { Button } from '../../../../../components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../../../../components/ui/select';

const AssignHandlerModal = ({ isOpen, onClose, onAssign, users, service, isSubmitting }) => {
  const [selectedUser, setSelectedUser] = useState(null);

  // Filter out users who may not be eligible for assignment (e.g., non-active users)
  const eligibleUsers = users.filter(user => user.status === 'active');
  
  const handleSubmit = () => {
    if (selectedUser) {
      onAssign(selectedUser);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Handler to Service</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Service Type
            </label>
            <p className="text-sm text-gray-900 dark:text-white">
              {service?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </p>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Handler
            </label>
            <Select onValueChange={setSelectedUser}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {eligibleUsers.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.fullname} ({user.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="text-gray-700 dark:text-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedUser || isSubmitting}
            className="bg-[#0A2647] text-white hover:bg-[#0A2647]/90 dark:bg-white dark:text-[#0A2647] dark:hover:bg-white/90"
          >
            {isSubmitting ? (
              <>Loading...</>
            ) : (
              <>Assign</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignHandlerModal;