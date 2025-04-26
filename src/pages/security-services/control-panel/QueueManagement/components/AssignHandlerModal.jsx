// src/pages/security-services/control-panel/QueueManagement/components/AssignHandlerModal.jsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../../../components/ui/dialog';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Checkbox } from '../../../../../components/ui/checkbox';
import { Search, UserCheck } from 'lucide-react';

const AssignHandlerModal = ({ isOpen, onClose, onAssign, users, service, isSubmitting }) => {
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  console.log('AssignHandlerModal received users:', users);
  console.log('User data structure sample:', users && users.length > 0 ? users[0] : 'No users');

  // Filter eligible users (assume all users are eligible if status is not provided)
  const eligibleUsers = users?.filter(user => user.status === undefined || user.status === 'active' || user.is_active === true) || [];
  console.log('Filtered eligible users:', eligibleUsers.length);
  
  // Filter users based on search term
        const filteredUsers = eligibleUsers.filter(user => {
    const fullname = (user.fullname || user.full_name || '')?.toLowerCase();
    const username = (user.username || '')?.toLowerCase();
    return fullname.includes(searchTerm.toLowerCase()) || username.includes(searchTerm.toLowerCase());
  });

  const handleUserToggle = (userId) => {
    setSelectedUserIds(prevIds => {
      if (prevIds.includes(userId)) {
        return prevIds.filter(id => id !== userId);
      } else {
        return [...prevIds, userId];
      }
    });
  };
  
  const handleSubmit = () => {
    if (selectedUserIds.length > 0) {
      onAssign(selectedUserIds);
      setSelectedUserIds([]);
      setSearchTerm('');
    }
  };

  const handleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(user => user.id));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {
      setSelectedUserIds([]);
      setSearchTerm('');
      onClose();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Handlers to Service</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            Select users to handle requests for this service.
          </DialogDescription>
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
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select Handlers
              </label>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleSelectAll}
                className="h-8 text-xs flex items-center text-[#0A2647] dark:text-blue-400"
              >
                <UserCheck className="h-3.5 w-3.5 mr-1" />
                {selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0 
                  ? 'Deselect All' 
                  : 'Select All'}
              </Button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="border rounded-md max-h-60 overflow-y-auto">
              {filteredUsers.length > 0 ? (
                <div className="p-1">
                  {filteredUsers.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
                    >
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={() => handleUserToggle(user.id)}
                      />
                      <label
                        htmlFor={`user-${user.id}`}
                        className="text-sm font-medium flex-grow cursor-pointer flex justify-between"
                      >
                        <span>{user.fullname || user.full_name}</span>
                        <span className="text-gray-500 text-xs">{user.username}</span>
                      </label>
                      {user.role && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {user.role}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No users found
                </div>
              )}
            </div>
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Selected handlers: {selectedUserIds.length}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedUserIds([]);
              setSearchTerm('');
              onClose();
            }}
            className="text-gray-700 dark:text-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedUserIds.length === 0 || isSubmitting}
            className="bg-[#0A2647] text-white hover:bg-[#0A2647]/90 dark:bg-white dark:text-[#0A2647] dark:hover:bg-white/90"
          >
            {isSubmitting ? (
              <>Loading...</>
            ) : (
              <>Assign {selectedUserIds.length > 0 ? `(${selectedUserIds.length})` : ''}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignHandlerModal;