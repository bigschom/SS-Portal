// src/pages/security-services/control-panel/QueueManagement/index.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Input } from '../../../../components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../components/ui/tabs';
import { useToast } from '../../../../components/ui/use-toast';
import { 
  Search, 
  AlertTriangle,
  Clock,
  CheckCircle2,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../../../hooks/useAuth';
import { useQueueData } from './hooks/useQueueData';
import { HandlersTable } from './components/HandlersTable';
import { RequestsTable } from './components/RequestsTable';
import ErrorBoundary from '../../../../components/common/ErrorBoundary';

const QueueManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('handlers');
  const [pageLoading, setPageLoading] = useState(true);
  
  // Custom hook for fetching and managing queue data
  const { 
    loading, 
    handlers, 
    users, 
    newRequests, 
    unhandledRequests, 
    pendingRequests, 
    investigatingRequests, 
    completedRequests, 
    sentBackRequests, 
    fetchData 
  } = useQueueData(toast);

  // Check access permission
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        navigate('/login');
        return;
      }
      
      if (!['admin', 'manager'].includes(user.role)) {
        navigate('/dashboard');
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You don't have permission to access this page",
        });
        return;
      }
      
      setPageLoading(false);
    };

    checkAccess();
  }, [user, navigate, toast]);

  useEffect(() => {
    if (!pageLoading) {
      fetchData();
    }
  }, [pageLoading, fetchData]);

  if (pageLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A2647] dark:text-white" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Queue Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage service handlers and requests
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-7 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <TabsTrigger 
            value="handlers" 
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
          >
            Service Handlers
          </TabsTrigger>
          <TabsTrigger 
            value="new" 
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
          >
            New ({newRequests.length})
          </TabsTrigger>
          <TabsTrigger 
            value="unhandled" 
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
          >
            Unhandled ({unhandledRequests.length})
          </TabsTrigger>
          <TabsTrigger 
            value="pending" 
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
          >
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger 
            value="investigating" 
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
          >
            Investigating ({investigatingRequests.length})
          </TabsTrigger>
          <TabsTrigger 
            value="completed" 
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
          >
            Completed ({completedRequests.length})
          </TabsTrigger>
          <TabsTrigger 
            value="sent_back" 
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
          >
            Sent Back ({sentBackRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* Service Handlers Tab */}
        <TabsContent value="handlers" className="mt-4">
          <ErrorBoundary onReset={fetchData}>
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardHeader className="bg-white dark:bg-gray-800 rounded-t-lg">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-gray-900 dark:text-white">Service Handlers</CardTitle>
                  <div className="w-[300px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <Input
                        placeholder="Search handlers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <HandlersTable 
                  handlers={handlers}
                  users={users}
                  searchTerm={searchTerm}
                  onRefresh={fetchData}
                />
              </CardContent>
            </Card>
          </ErrorBoundary>
        </TabsContent>

        {/* New Requests Tab */}
        <TabsContent value="new" className="mt-4">
          <ErrorBoundary onReset={fetchData}>
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardHeader className="bg-white dark:bg-gray-800 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <Clock className="h-5 w-5 text-[#0A2647] dark:text-white" />
                  New Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <RequestsTable 
                  requests={newRequests}
                  status="new"
                  onRefresh={fetchData}
                />
              </CardContent>
            </Card>
          </ErrorBoundary>
        </TabsContent>

        {/* Unhandled Requests Tab */}
        <TabsContent value="unhandled" className="mt-4">
          <ErrorBoundary onReset={fetchData}>
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardHeader className="bg-white dark:bg-gray-800 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Unhandled Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <RequestsTable 
                  requests={unhandledRequests}
                  status="unable_to_handle"
                  onRefresh={fetchData}
                />
              </CardContent>
            </Card>
          </ErrorBoundary>
        </TabsContent>

        {/* Pending Requests Tab */}
        <TabsContent value="pending" className="mt-4">
          <ErrorBoundary onReset={fetchData}>
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardHeader className="bg-white dark:bg-gray-800 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <Clock className="h-5 w-5 text-[#0A2647] dark:text-white" />
                  Pending Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <RequestsTable 
                  requests={pendingRequests}
                  status="in_progress"
                  onRefresh={fetchData}
                />
              </CardContent>
            </Card>
          </ErrorBoundary>
        </TabsContent>

        {/* Investigating Requests Tab */}
        <TabsContent value="investigating" className="mt-4">
          <ErrorBoundary onReset={fetchData}>
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardHeader className="bg-white dark:bg-gray-800 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <Search className="h-5 w-5 text-[#0A2647] dark:text-white" />
                  Under Investigation
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <RequestsTable 
                  requests={investigatingRequests}
                  status="pending_investigation"
                  onRefresh={fetchData}
                />
              </CardContent>
            </Card>
          </ErrorBoundary>
        </TabsContent>

        {/* Completed Requests Tab */}
        <TabsContent value="completed" className="mt-4">
          <ErrorBoundary onReset={fetchData}>
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardHeader className="bg-white dark:bg-gray-800 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Completed Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <RequestsTable 
                  requests={completedRequests}
                  status="completed"
                  onRefresh={fetchData}
                />
              </CardContent>
            </Card>
          </ErrorBoundary>
        </TabsContent>

        {/* Sent Back Requests Tab */}
        <TabsContent value="sent_back" className="mt-4">
          <ErrorBoundary onReset={fetchData}>
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardHeader className="bg-white dark:bg-gray-800 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <RotateCcw className="h-5 w-5 text-orange-500" />
                  Sent Back Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <RequestsTable 
                  requests={sentBackRequests}
                  status="sent_back"
                  onRefresh={fetchData}
                />
              </CardContent>
            </Card>
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QueueManagement;