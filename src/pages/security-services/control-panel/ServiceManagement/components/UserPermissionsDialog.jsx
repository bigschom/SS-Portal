import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/config/supabase';

export const UserPermissionsDialog = ({ service, isOpen, onClose }) => {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch all active users
        const { data: allUsers, error: usersError } = await supabase
          .from('users')
          .select('id, fullname, username, role')
          .eq('status', 'active')
          .order('fullname');

        if (usersError) throw usersError;

        // Fetch users who have permission for this service
        const { data: permissions, error: permError } = await supabase
          .from('user_service_permissions')
          .select('user_id')
          .eq('service_type', service.service_type)
          .eq('can_view', true);

        if (permError) throw permError;

        setUsers(allUsers || []);
        setSelectedUsers(permissions?.map(p => p.user_id) || []);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch users",
        });
      }
    };

    if (isOpen && service) {
      fetchUsers();
    }
  }, [isOpen, service]);

  const toggleUserPermission = async (userId, checked) => {
    setLoading(true);
    try {
      if (checked) {
        // Grant permission
        const { error } = await supabase
          .from('user_service_permissions')
          .insert({
            user_id: userId,
            service_type: service.service_type,
            can_view: true,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
        setSelectedUsers(prev => [...prev, userId]);
      } else {
        // Remove permission
        const { error } = await supabase
          .from('user_service_permissions')
          .delete()
          .match({ 
            user_id: userId,
            service_type: service.service_type 
          });

        if (error) throw error;
        setSelectedUsers(prev => prev.filter(id => id !== userId));
      }

      toast({
        title: "Success",
        description: "User permissions updated successfully",
      });
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update permissions",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Manage User Access - {service?.service_type.replace(/_/g, ' ')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">Has Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.fullname}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.username}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => 
                          toggleUserPermission(user.id, checked)
                        }
                        disabled={loading}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
