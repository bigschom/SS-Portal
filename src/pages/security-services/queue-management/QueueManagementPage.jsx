// src/pages/security-services/queue-management/QueueManagementPage.jsx
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { useToast } from '../../../components/ui/use-toast';
import { 
  Search, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Shuffle,
  UserPlus,
  Users,
  Settings,
  Save,
  Plus,
  Trash2
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Switch } from '../../../components/ui/switch';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Separator } from '../../../components/ui/separator';

import { SERVICE_LABELS, SERVICE_TYPES } from '../task/utils/taskConstants';
import apiClient from '../../../config/api-service';

const QueueManagementPage = () => {
  const { toast } = useToast();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [users, setUsers] = useState([]);
  const [serviceRules, setServiceRules] = useState({});
  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [savingRules, setSavingRules] = useState(false);
  const [newRule, setNewRule] = useState({
    service_type: '',
    assigned_users: [],
    is_active: true,
    auto_assign: false
  });
  const [currentUser, setCurrentUser] = useState(null);

  // Get current user from session storage
  useEffect(() => {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setCurrentUser({
          id: userData.id,
          fullname: userData.full_name || userData.username,
          username: userData.username,
          role: userData.role
        });
        
        // Redirect if not admin or supervisor
        if (!['admin', 'supervisor'].includes(userData.role)) {
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "You don't have permission to access this page"
          });
          
          // Redirect to home page or task page
          window.location.href = '/security-services/task';
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Please log in again"
        });
      }
    } else {
      // Handle missing user data
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to access this page"
      });
      
      // Redirect to login page
      window.location.href = '/login';
    }
  }, [toast]);

  // Fetch users from database
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Use the API client to fetch users from the database
      const response = await apiClient.get('/users');
      
      if (response && response.data) {
        setUsers(response.data);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch service routing rules
  const fetchServiceRules = async () => {
    try {
      setLoading(true);
      
      // Use the API client to fetch service routing rules
      const response = await apiClient.get('/security-services/routing-rules');
      
      if (response && response.data) {
        const rulesObj = {};
        
        // Convert array to object with service_type as key
        response.data.forEach(rule => {
          rulesObj[rule.service_type] = rule;
        });
        
        setServiceRules(rulesObj);
      } else {
        throw new Error('Failed to fetch routing rules');
      }
    } catch (error) {
      console.error('Error fetching routing rules:', error);
      setError('Failed to load routing rules. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initialize data
  useEffect(() => {
    if (currentUser?.id && ['admin', 'supervisor'].includes(currentUser?.role)) {
      fetchUsers();
      fetchServiceRules();
    }
  }, [currentUser]);

  // Save service routing rule
  const saveServiceRule = async (serviceType) => {
    if (!serviceType || !serviceRules[serviceType]) return;
    
    try {
      setSavingRules(true);
      
      const rule = serviceRules[serviceType];
      
      // Use the API client to save the routing rule
      const response = await apiClient.post('/security-services/routing-rules', rule);
      
      if (response && response.data) {
        setSuccess(`Routing rules for ${SERVICE_LABELS[serviceType]} updated successfully`);
        
        // Refresh routing rules
        await fetchServiceRules();
      } else {
        throw new Error('Failed to save routing rule');
      }
    } catch (error) {
      console.error('Error saving routing rule:', error);
      setError('Failed to save routing rule. Please try again.');
    } finally {
      setSavingRules(false);
    }
  };

  // Add new service routing rule
  const addServiceRule = async () => {
    if (!newRule.service_type) {
      setError('Please select a service type');
      return;
    }
    
    try {
      setSavingRules(true);
      
      // Use the API client to add a new routing rule
      const response = await apiClient.post('/security-services/routing-rules', newRule);
      
      if (response && response.data) {
        setSuccess(`Routing rule for ${SERVICE_LABELS[newRule.service_type]} added successfully`);
        
        // Reset new rule form
        setNewRule({
          service_type: '',
          assigned_users: [],
          is_active: true,
          auto_assign: false
        });
        
        // Refresh routing rules
        await fetchServiceRules();
      } else {
        throw new Error('Failed to add routing rule');
      }
    } catch (error) {
      console.error('Error adding routing rule:', error);
      setError('Failed to add routing rule. Please try again.');
    } finally {
      setSavingRules(false);
    }
  };

  // Delete service routing rule
  const deleteServiceRule = async (serviceType) => {
    if (!serviceType || !serviceRules[serviceType]) return;
    
    try {
      setSavingRules(true);
      
      // Use the API client to delete the routing rule
      const response = await apiClient.delete(`/security-services/routing-rules/${serviceType}`);
      
      if (response && response.status === 200) {
        setSuccess(`Routing rule for ${SERVICE_LABELS[serviceType]} deleted successfully`);
        
        // Refresh routing rules
        await fetchServiceRules();
      } else {
        throw new Error('Failed to delete routing rule');
      }
    } catch (error) {
      console.error('Error deleting routing rule:', error);
      setError('Failed to delete routing rule. Please try again.');
    } finally {
      setSavingRules(false);
    }
  };

  // Filter users based on search term
  const filteredUsers = searchTerm
    ? users.filter(user => 
        user.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : users;

  // Handle adding/removing user from rule
  const toggleUserInRule = (userId, serviceType) => {
    const updatedRules = { ...serviceRules };
    
    if (!updatedRules[serviceType]) {
      updatedRules[serviceType] = {
        service_type: serviceType,
        assigned_users: [],
        is_active: true,
        auto_assign: false
      };
    }
    
    const userIndex = updatedRules[serviceType].assigned_users.indexOf(userId);
    
    if (userIndex > -1) {
      // Remove user
      updatedRules[serviceType].assigned_users.splice(userIndex, 1);
    } else {
      // Add user
      updatedRules[serviceType].assigned_users.push(userId);
    }
    
    setServiceRules(updatedRules);
  };

  // Handle adding/removing user from new rule
  const toggleUserInNewRule = (userId) => {
    const updatedRule = { ...newRule };
    const userIndex = updatedRule.assigned_users.indexOf(userId);
    
    if (userIndex > -1) {
      // Remove user
      updatedRule.assigned_users.splice(userIndex, 1);
    } else {
      // Add user
      updatedRule.assigned_users.push(userId);
    }
    
    setNewRule(updatedRule);
  };

  // Check if user is assigned to a service
  const isUserAssigned = (userId, serviceType) => {
    if (!serviceRules[serviceType]) return false;
    return serviceRules[serviceType].assigned_users.includes(userId);
  };

  // Check if user is assigned to new rule
  const isUserAssignedToNewRule = (userId) => {
    return newRule.assigned_users.includes(userId);
  };

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    
    const parts = name.split(' ');
    
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Get role badge color
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'supervisor':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'support':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'security-guard':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Auto-dismiss messages after a delay
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  if (loading && !users.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading queue management data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Queue Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Configure request assignment and routing rules
            </p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-4 bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-400">
            <CheckCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Search Input */}
        <div className="relative mb-6">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, username, or role"
            className="pl-10"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="services">
            <Shuffle className="h-4 w-4 mr-2" />
            Service Routing
          </TabsTrigger>
          <TabsTrigger value="new-rule">
            <Plus className="h-4 w-4 mr-2" />
            Add New Rule
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                View and manage users who can handle security service requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned Services</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="flex items-center space-x-3">
                          <Avatar>
                            {user.avatar ? (
                              <AvatarImage src={user.avatar} alt={user.fullname} />
                            ) : (
                              <AvatarFallback>{getInitials(user.fullname)}</AvatarFallback>
                            )}
                          </Avatar>
                          <span className="font-medium">{user.fullname}</span>
                        </TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>
                          <Badge className={`${getRoleBadgeColor(user.role)} border`}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {Object.keys(serviceRules).filter(serviceType => 
                              serviceRules[serviceType].assigned_users.includes(user.id)
                            ).map(serviceType => (
                              <Badge key={serviceType} variant="outline" className="bg-gray-100 dark:bg-gray-800">
                                {SERVICE_LABELS[serviceType] || serviceType}
                              </Badge>
                            ))}
                            {Object.keys(serviceRules).filter(serviceType => 
                              serviceRules[serviceType].assigned_users.includes(user.id)
                            ).length === 0 && (
                              <span className="text-gray-500 text-sm">No services assigned</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Routing Tab */}
        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Service Routing Rules</CardTitle>
              <CardDescription>
                Configure which users can handle each type of security service request
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                  <div className="mb-4 sm:mb-0 flex-grow">
                    <Label htmlFor="service-select" className="mb-2 block">
                      Select Service Type
                    </Label>
                    <Select
                      value={selectedService || ''}
                      onValueChange={setSelectedService}
                    >
                      <SelectTrigger id="service-select">
                        <SelectValue placeholder="Select a service type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(SERVICE_TYPES).map((key) => (
                          <SelectItem key={key} value={SERVICE_TYPES[key]}>
                            {SERVICE_LABELS[SERVICE_TYPES[key]] || SERVICE_TYPES[key]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedService && serviceRules[selectedService] && (
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="rule-active"
                          checked={serviceRules[selectedService].is_active}
                          onCheckedChange={(checked) => {
                            const updatedRules = { ...serviceRules };
                            updatedRules[selectedService].is_active = checked;
                            setServiceRules(updatedRules);
                          }}
                        />
                        <Label htmlFor="rule-active">Active</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="auto-assign"
                          checked={serviceRules[selectedService].auto_assign}
                          onCheckedChange={(checked) => {
                            const updatedRules = { ...serviceRules };
                            updatedRules[selectedService].auto_assign = checked;
                            setServiceRules(updatedRules);
                          }}
                        />
                        <Label htmlFor="auto-assign">Auto-assign</Label>
                      </div>
                    </div>
                  )}
                </div>
                
                {selectedService && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">
                      Assign Users to {SERVICE_LABELS[selectedService] || selectedService}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            isUserAssigned(user.id, selectedService)
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                              {user.avatar ? (
                                <AvatarImage src={user.avatar} alt={user.fullname} />
                              ) : (
                                <AvatarFallback>{getInitials(user.fullname)}</AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.fullname}</p>
                              <p className="text-xs text-gray-500">{user.role}</p>
                            </div>
                          </div>
                          
                          <Switch
                            checked={isUserAssigned(user.id, selectedService)}
                            onCheckedChange={() => toggleUserInRule(user.id, selectedService)}
                          />
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <Button
                        variant="destructive"
                        onClick={() => deleteServiceRule(selectedService)}
                        disabled={savingRules || !serviceRules[selectedService]}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Rule
                      </Button>
                      
                      <Button
                        onClick={() => saveServiceRule(selectedService)}
                        disabled={savingRules}
                      >
                        {savingRules ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                )}
                
                {!selectedService && (
                  <div className="text-center py-10">
                    <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      Select a service type to configure routing rules
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add New Rule Tab */}
        <TabsContent value="new-rule">
          <Card>
            <CardHeader>
              <CardTitle>Add New Routing Rule</CardTitle>
              <CardDescription>
                Create a new routing rule for a service type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                  <div className="mb-4 sm:mb-0 flex-grow">
                    <Label htmlFor="new-service-select" className="mb-2 block">
                      Select Service Type
                    </Label>
                    <Select
                      value={newRule.service_type}
                      onValueChange={(value) => setNewRule({ ...newRule, service_type: value })}
                    >
                      <SelectTrigger id="new-service-select">
                        <SelectValue placeholder="Select a service type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(SERVICE_TYPES)
                          .filter(key => !serviceRules[SERVICE_TYPES[key]])
                          .map((key) => (
                            <SelectItem key={key} value={SERVICE_TYPES[key]}>
                              {SERVICE_LABELS[SERVICE_TYPES[key]] || SERVICE_TYPES[key]}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="new-rule-active"
                        checked={newRule.is_active}
                        onCheckedChange={(checked) => {
                          setNewRule({ ...newRule, is_active: checked });
                        }}
                      />
                      <Label htmlFor="new-rule-active">Active</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="new-auto-assign"
                        checked={newRule.auto_assign}
                        onCheckedChange={(checked) => {
                          setNewRule({ ...newRule, auto_assign: checked });
                        }}
                      />
                      <Label htmlFor="new-auto-assign">Auto-assign</Label>
                    </div>
                  </div>
                </div>
                
                {newRule.service_type && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">
                      Assign Users to {SERVICE_LABELS[newRule.service_type] || newRule.service_type}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            isUserAssignedToNewRule(user.id)
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                              {user.avatar ? (
                                <AvatarImage src={user.avatar} alt={user.fullname} />
                              ) : (
                                <AvatarFallback>{getInitials(user.fullname)}</AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.fullname}</p>
                              <p className="text-xs text-gray-500">{user.role}</p>
                            </div>
                          </div>
                          
                          <Switch
                            checked={isUserAssignedToNewRule(user.id)}
                            onCheckedChange={() => toggleUserInNewRule(user.id)}
                          />
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setNewRule({
                            service_type: '',
                            assigned_users: [],
                            is_active: true,
                            auto_assign: false
                          });
                        }}
                        disabled={savingRules}
                      >
                        Reset
                      </Button>
                      
                      <Button
                        onClick={addServiceRule}
                        disabled={savingRules || !newRule.service_type}
                      >
                        {savingRules ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Add Rule
                      </Button>
                    </div>
                  </div>
                )}
                
                {!newRule.service_type && (
                  <div className="text-center py-10">
                    <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      Select a service type to create a new routing rule
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QueueManagementPage;