// src/pages/security-services/service-management/ServiceManagementPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../../components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { Switch } from '../../../components/ui/switch';
import { Label } from '../../../components/ui/label';
import {
  Pencil,
  UserPlus,
  Users,
  Settings,
  Cog,
  BarChart,
  Phone,
  Repeat,
  CreditCard,
  Smartphone,
  Shield,
  Calendar,
  FileEdit,
  PlusCircle,
  UserMinus,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';

import { useToast } from '../../../components/ui/use-toast';
import apiService from '../../../config/api-service';
import { SERVICE_TYPES } from '../task/utils/taskConstants';

// Service type configuration with icons and labels
const SERVICE_CONFIG = {
  [SERVICE_TYPES.REQUEST_SERIAL_NUMBER]: {
    label: 'Serial Number Request',
    icon: Smartphone,
    description: 'Request for device IMEI information'
  },
  [SERVICE_TYPES.CHECK_STOLEN_PHONE]: {
    label: 'Stolen Phone Check',
    icon: Shield,
    description: 'Check if a phone is reported as stolen'
  },
  [SERVICE_TYPES.CALL_HISTORY]: {
    label: 'Call History Request',
    icon: Phone, 
    description: 'Request detailed call history records'
  },
  [SERVICE_TYPES.UNBLOCK_CALL]: {
    label: 'Unblock Call Request',
    icon: Phone,
    description: 'Request to unblock phone numbers'
  },
  [SERVICE_TYPES.UNBLOCK_MOMO]: {
    label: 'Unblock MoMo Request',
    icon: CreditCard,
    description: 'Request to unblock MoMo accounts'
  },
  [SERVICE_TYPES.MONEY_REFUND]: {
    label: 'Money Refund Request',
    icon: CreditCard,
    description: 'Request for MoMo transaction reversal'
  },
  [SERVICE_TYPES.MOMO_TRANSACTION]: {
    label: 'MoMo Transaction History',
    icon: Repeat,
    description: 'Request transaction details for MoMo accounts'
  },
  [SERVICE_TYPES.BACKOFFICE_APPOINTMENT]: {
    label: 'Backoffice Appointment',
    icon: Calendar,
    description: 'Schedule meetings with backoffice team'
  }
};

const ServiceManagementPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('service-handlers');
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [userAssignments, setUserAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [metrics, setMetrics] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0,
    userPerformance: []
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch users, services, and assignments in parallel
        const [usersData, servicesData, assignmentsData, metricsData] = await Promise.all([
          apiService.users.getAllUsers(),
          apiService.services.getAllServices(),
          apiService.services.getUserAssignments(),
          apiService.services.getServiceMetrics()
        ]);
        
        setUsers(usersData || []);
        setServices(servicesData || []);
        setUserAssignments(assignmentsData || []);
        setMetrics(metricsData || {
          totalRequests: 0,
          pendingRequests: 0,
          completedRequests: 0,
          userPerformance: []
        });
      } catch (error) {
        console.error('Error fetching service management data:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load service management data"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if a user is assigned to a service
  const isUserAssignedToService = (userId, serviceType) => {
    return userAssignments.some(
      assignment => assignment.user_id === userId && assignment.service_type === serviceType
    );
  };

  // Toggle user assignment to a service
  const toggleUserAssignment = async (userId, serviceType, isCurrentlyAssigned) => {
    try {
      if (isCurrentlyAssigned) {
        // Remove assignment
        await apiService.services.removeUserFromService(userId, serviceType);
        toast({
          title: "Success",
          description: "User removed from service successfully"
        });
      } else {
        // Add assignment
        await apiService.services.assignUserToService(userId, serviceType);
        toast({
          title: "Success",
          description: "User assigned to service successfully"
        });
      }
      
      // Refresh assignments
      const updatedAssignments = await apiService.services.getUserAssignments();
      setUserAssignments(updatedAssignments || []);
    } catch (error) {
      console.error('Error toggling user assignment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user assignment"
      });
    }
  };

  // Toggle service availability
  const toggleServiceAvailability = async (serviceType, isCurrentlyEnabled) => {
    try {
      await apiService.services.updateServiceStatus(serviceType, !isCurrentlyEnabled);
      
      // Refresh services
      const updatedServices = await apiService.services.getAllServices();
      setServices(updatedServices || []);
      
      toast({
        title: "Success",
        description: `Service ${isCurrentlyEnabled ? 'disabled' : 'enabled'} successfully`
      });
    } catch (error) {
      console.error('Error toggling service availability:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update service status"
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Service Management</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Configure service handlers and monitor performance
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-gray-100 dark:bg-gray-800">
          <TabsTrigger value="service-handlers" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Service Handlers</span>
          </TabsTrigger>
          <TabsTrigger value="service-status" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Service Status</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center space-x-2">
            <BarChart className="h-4 w-4" />
            <span>Performance</span>
          </TabsTrigger>
        </TabsList>

        {/* Service Handlers Tab */}
        <TabsContent value="service-handlers">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Users List */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Staff Members</CardTitle>
                <CardDescription>Manage service handlers</CardDescription>
                <div className="mt-2">
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-2">
                    {loading ? (
                      <div className="flex justify-center p-4">
                        <div className="animate-spin h-6 w-6 border-2 border-black dark:border-white border-t-transparent rounded-full" />
                      </div>
                    ) : filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className={`flex items-center p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer ${
                            selectedUser?.id === user.id
                              ? "bg-gray-100 dark:bg-gray-800"
                              : ""
                          }`}
                          onClick={() => setSelectedUser(user)}
                        >
                          <Avatar className="h-9 w-9 mr-3">
                            <AvatarImage src={user.avatar} alt={user.fullname} />
                            <AvatarFallback>
                              {user.fullname
                                ? user.fullname
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                : user.username?.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {user.fullname || user.username}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {user.email || `@${user.username}`}
                            </p>
                          </div>
                          <Badge variant="outline">{user.role}</Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                        No users found
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* User Service Assignments */}
            <Card className="md:col-span-2">
              {selectedUser ? (
                <>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{selectedUser.fullname || selectedUser.username}</CardTitle>
                        <CardDescription>
                          {selectedUser.role} · {selectedUser.email}
                        </CardDescription>
                      </div>
                      <Button variant="outline" size="sm">
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit User
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-3">Service Assignments</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {Object.entries(SERVICE_CONFIG).map(([serviceType, config]) => {
                            const isAssigned = isUserAssignedToService(selectedUser.id, serviceType);
                            const serviceStatus = services.find(s => s.service_type === serviceType);
                            const isEnabled = serviceStatus?.is_enabled || false;

                            return (
                              <div
                                key={serviceType}
                                className={`p-4 rounded-lg border ${
                                  isEnabled 
                                    ? (isAssigned 
                                      ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20" 
                                      : "border-gray-200 dark:border-gray-700")
                                    : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50 opacity-70"
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center">
                                    <div className={`p-2 rounded-lg ${
                                      isEnabled 
                                        ? (isAssigned 
                                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300")
                                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                                      }`}
                                    >
                                      {React.createElement(config.icon, { className: "h-5 w-5" })}
                                    </div>
                                    <div className="ml-3">
                                      <p className="text-sm font-medium">
                                        {config.label}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {config.description}
                                      </p>
                                    </div>
                                  </div>
                                  <div>
                                    <Button
                                      variant={isAssigned ? "destructive" : "outline"}
                                      size="sm"
                                      onClick={() => toggleUserAssignment(
                                        selectedUser.id,
                                        serviceType,
                                        isAssigned
                                      )}
                                      disabled={!isEnabled}
                                    >
                                      {isAssigned ? (
                                        <>
                                          <UserMinus className="h-4 w-4 mr-1" />
                                          <span>Remove</span>
                                        </>
                                      ) : (
                                        <>
                                          <UserPlus className="h-4 w-4 mr-1" />
                                          <span>Assign</span>
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                                {isAssigned && (
                                  <div className="mt-3 text-xs text-gray-600 dark:text-gray-300 pl-10">
                                    <span className="flex items-center">
                                      <UserCheck className="h-3 w-3 mr-1 text-green-600 dark:text-green-400" />
                                      Assigned since: {new Date().toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <Users className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                    Select a User
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
                    Choose a user from the list to view and manage their service assignments
                  </p>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Service Status Tab */}
        <TabsContent value="service-status">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Service Status Configuration</CardTitle>
                <CardDescription>Enable or disable security services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(SERVICE_CONFIG).map(([serviceType, config]) => {
                    const serviceData = services.find(s => s.service_type === serviceType);
                    const isEnabled = serviceData?.is_enabled || false;
                    const assignedUsers = userAssignments.filter(
                      a => a.service_type === serviceType
                    );

                    return (
                      <div
                        key={serviceType}
                        className={`p-4 rounded-lg border ${
                          isEnabled
                            ? "border-gray-200 dark:border-gray-700"
                            : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center">
                            <div className={`p-2 rounded-lg ${
                              isEnabled
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                            }`}>
                              {React.createElement(config.icon, { className: "h-5 w-5" })}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium">{config.label}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {assignedUsers.length} handler{assignedUsers.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`service-${serviceType}`}
                              checked={isEnabled}
                              onCheckedChange={() => toggleServiceAvailability(serviceType, isEnabled)}
                            />
                            <Label 
                              htmlFor={`service-${serviceType}`}
                              className={isEnabled ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}
                            >
                              {isEnabled ? "Active" : "Inactive"}
                            </Label>
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="text-xs text-gray-600 dark:text-gray-300">
                            {assignedUsers.length > 0 ? (
                              <div>
                                <p className="font-medium mb-1">Assigned handlers:</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {assignedUsers.map((assignment, index) => {
                                    const user = users.find(u => u.id === assignment.user_id);
                                    return user ? (
                                      <Badge 
                                        key={index} 
                                        variant="outline"
                                        className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                                      >
                                        {user.fullname || user.username}
                                      </Badge>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            ) : (
                              <p className="text-yellow-600 dark:text-yellow-400 flex items-center">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                No handlers assigned
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Requests Card */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Total Requests
                      </p>
                      <h3 className="text-2xl font-bold mt-1">{metrics.totalRequests}</h3>
                    </div>
                    <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                      <FileEdit className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pending Requests Card */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Pending Requests
                      </p>
                      <h3 className="text-2xl font-bold mt-1">{metrics.pendingRequests}</h3>
                    </div>
                    <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900/40 rounded-full flex items-center justify-center">
                      <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Completed Requests Card */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Completed Requests
                      </p>
                      <h3 className="text-2xl font-bold mt-1">{metrics.completedRequests}</h3>
                    </div>
                    <div className="h-12 w-12 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Details */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Service Performance</CardTitle>
                <CardDescription>Detailed metrics by service type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(SERVICE_CONFIG).map(([serviceType, config]) => {
                    // Get metrics for this service type
                    const serviceMetrics = metrics.servicePerformance?.find(
                      s => s.service_type === serviceType
                    ) || {
                      total: 0,
                      completed: 0,
                      avgResolutionTimeHours: 0
                    };
                    
                    const completionRate = serviceMetrics.total > 0
                      ? Math.round((serviceMetrics.completed / serviceMetrics.total) * 100)
                      : 0;
                    
                    return (
                      <div
                        key={serviceType}
                        className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center mb-3">
                          <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                            {React.createElement(config.icon, { className: "h-5 w-5" })}
                          </div>
                          <h4 className="ml-3 text-sm font-medium">{config.label}</h4>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                            <p className="text-lg font-bold">{serviceMetrics.total || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
                            <p className="text-lg font-bold">{serviceMetrics.completed || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Success Rate</p>
                            <p className="text-lg font-bold">{completionRate}%</p>
                          </div>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="mt-4">
                          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div
                              className="bg-blue-600 h-2.5 rounded-full"
                              style={{ width: `${completionRate}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                          <p className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Avg. resolution time: {serviceMetrics.avgResolutionTimeHours || 0} hours
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ServiceManagementPage;