// src/pages/admin/ServiceManagement/components/UserAccessDialog.jsx
import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/AuthContext';

export const UserAccessDialog = ({ 
  service, 
  isOpen, 
  onClose 
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch users and current permissions
  useEffect(() => {
    const fetchData = async () => {
      setError('');
      try {
        // Fetch all active users
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, fullname, username, role')
          .order('fullname');

        if (usersError) throw usersError;

        // Fetch current permissions for this service
        const { data: permissionsData, error: permissionsError } = await supabase
          .from('user_service_permissions')
          .select('user_id')
          .eq('service_type', service.service_type)
          .eq('can_view', true);

        if (permissionsError) throw permissionsError;

        setUsers(usersData || []);
        setSelectedUsers((permissionsData || []).map(p => p.user_id));
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && service) {
      fetchData();
    }
  }, [isOpen, service]);

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      if (!service?.service_type) {
        throw new Error('Service type is required');
      }

      // Delete all existing permissions for this service
      await supabase
        .from('user_service_permissions')
        .delete()
        .eq('service_type', service.service_type);

      // Add new permissions if any users are selected
      if (selectedUsers.length > 0) {
        const newPermissions = selectedUsers.map(userId => ({
          service_type: service.service_type,
          user_id: userId,
          can_view: true
        }));

        const { error: insertError } = await supabase
          .from('user_service_permissions')
          .insert(newPermissions);

        if (insertError) throw insertError;
      }

      toast({
        title: "Success",
        description: "User access updated successfully",
        duration: 5000,
      });

      onClose();
    } catch (error) {
      console.error('Error saving permissions:', error);
      setError('Failed to update permissions');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update permissions",
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter(user =>
    user.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-[#F5EDE3]">
        <DialogHeader>
          <DialogTitle className="text-slate-800">
            Manage User Access - {service?.name}
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Select users who can access this service
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-slate-200"
            />
          </div>

          {/* Users List */}
          <ScrollArea className="h-[400px] border rounded-md bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-[#F5EDE3]">
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => {
                            setSelectedUsers(current =>
                              checked
                                ? [...current, user.id]
                                : current.filter(id => id !== user.id)
                            );
                          }}
                          disabled={saving}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{user.fullname}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                          {user.role}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Selected count */}
          <div className="text-sm text-slate-500">
            Selected users: {selectedUsers.length}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="bg-white hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-slate-800 hover:bg-slate-900 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserAccessDialog;
