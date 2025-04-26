// src/pages/security-services/control-panel/QueueManagement/index.jsx


import React, { 
  useState, 
  useMemo, 
  useCallback
} from 'react';
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from '../../../../components/ui/tabs';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { 
  RefreshCw, 
  Loader2, 
  BarChart,
  Clock,
  CheckCircle2,
  Activity,
  Search,
  UserPlus
} from 'lucide-react';
import { useQueueData } from './hooks/useQueueData';
import { useToast } from '../../../../components/ui/use-toast';
import ErrorBoundary from '../../../../components/common/ErrorBoundary';
import AddServiceButton from './components/AddServiceButton';
import HandlersTable from './components/HandlersTable';
import RequestsTable from './components/RequestsTable';
import { addNewServiceType } from './api/queueService';





// Request tabs for mapping
const REQUEST_TABS = ['new', 'unhandled', 'pending', 'investigating', 'completed', 'sent_back'];

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex justify-center items-center p-8">
    <Loader2 className="w-6 h-6 animate-spin text-[#0A2647]" />
  </div>
);

// Memoized statistics card
const StatCard = React.memo(({ title, value, icon, variant = 'default' }) => {
  const variantStyles = {
    default: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    highlight: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'
  };

  return (
    <div className={`rounded-lg p-4 border ${variantStyles[variant]}`}>
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
        </div>
        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
          {icon}
        </div>
      </div>
    </div>
  );
});

const QueueManagement = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingService, setIsAddingService] = useState(false);

  // Optimized queue data hook
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
    statistics,
    fetchData
  } = useQueueData(toast);

  // Memoized request counts
  const requestCounts = useMemo(() => ({
    new: newRequests.length,
    unhandled: unhandledRequests.length,
    pending: pendingRequests.length,
    investigating: investigatingRequests.length,
    completed: completedRequests.length,
    sentBack: sentBackRequests.length
  }), [
    newRequests, 
    unhandledRequests, 
    pendingRequests, 
    investigatingRequests, 
    completedRequests, 
    sentBackRequests
  ]);

  // Optimized refresh handler
  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Add service handler
  const handleAddService = useCallback(async (serviceName) => {
    setIsAddingService(true);
    try {
      // Call API to add new service type
      await addNewServiceType(serviceName);
      
      toast({
        title: 'Service Added',
        description: `New service "${serviceName}" created successfully`,
        variant: 'success'
      });
      
      // Refresh data to include new service
      fetchData(true);
    } catch (error) {
      console.error('Service addition error:', error);
      
      toast({
        title: 'Error',
        description: 'Failed to add service. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsAddingService(false);
    }
  }, [toast, fetchData]);

  // Render loading state
  if (loading && handlers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingFallback />
      </div>
    );
  }

  // Tab configuration with icons and labels
  const tabConfigurations = [
    { 
      value: 'dashboard', 
      icon: <BarChart />, 
      label: 'Dashboard' 
    },
    { 
      value: 'handlers', 
      icon: <UserPlus />, 
      label: 'Handlers' 
    },
    { 
      value: 'new', 
      icon: <Clock className="text-blue-500" />, 
      label: `New (${requestCounts.new})` 
    },
    { 
      value: 'unhandled', 
      icon: <Search className="text-yellow-500" />, 
      label: `Unhandled (${requestCounts.unhandled})` 
    },
    { 
      value: 'pending', 
      icon: <Clock className="text-orange-500" />, 
      label: `Pending (${requestCounts.pending})` 
    },
    { 
      value: 'investigating', 
      icon: <Search className="text-purple-500" />, 
      label: `Investigating (${requestCounts.investigating})` 
    },
    { 
      value: 'completed', 
      icon: <CheckCircle2 className="text-green-500" />, 
      label: `Completed (${requestCounts.completed})` 
    },
    { 
      value: 'sent_back', 
      icon: <RefreshCw className="text-red-500" />, 
      label: `Sent Back (${requestCounts.sentBack})` 
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Queue Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage service handlers and requests
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <AddServiceButton 
            onAddService={handleAddService} 
            isSubmitting={isAddingService}
          />
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-8 bg-gray-100 dark:bg-gray-800">
          {tabConfigurations.map((tab) => (
            <TabsTrigger 
              key={tab.value} 
              value={tab.value}
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 flex items-center justify-center gap-2"
            >
              {tab.icon}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-4">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard 
              title="Total Requests" 
              value={statistics.totalRequests}
              icon={<Activity className="h-5 w-5 text-blue-500" />}
            />
            <StatCard 
              title="Pending Requests" 
              value={statistics.pendingRequests}
              icon={<Clock className="h-5 w-5 text-yellow-500" />}
            />
            <StatCard 
              title="Completed Requests" 
              value={statistics.completedRequests}
              icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
            />
            <StatCard 
              title="Avg. Resolution Time" 
              value={`${statistics.averageResolutionTime} hrs`}
              icon={<Clock className="h-5 w-5 text-purple-500" />}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Recent Requests */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Requests
                </h3>
              </div>
              <ErrorBoundary>
                <RequestsTable 
                  requests={[...newRequests, ...pendingRequests]
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 5)
                  }
                  compact={true}
                />
              </ErrorBoundary>
            </div>

            {/* Handlers Overview */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Handlers Overview
                </h3>
              </div>
              <ErrorBoundary>
                <HandlersTable 
                  handlers={handlers}
                  users={users}
                  compact={true}
                />
              </ErrorBoundary>
            </div>
          </div>
        </TabsContent>

        {/* Handlers Tab */}
        <TabsContent value="handlers" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <div className="w-1/3 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input 
                placeholder="Search handlers..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10"
              />
            </div>
          </div>
          <ErrorBoundary>
            <HandlersTable 
              handlers={handlers}
              users={users}
              searchTerm={searchTerm}
              onRefresh={handleRefresh}
            />
          </ErrorBoundary>
        </TabsContent>

        {/* Request Tabs */}
        {REQUEST_TABS.map((tabKey) => (
          <TabsContent key={tabKey} value={tabKey} className="mt-4">
            <ErrorBoundary>
              <RequestsTable 
                requests={
                  {
                    new: newRequests,
                    unhandled: unhandledRequests,
                    pending: pendingRequests,
                    investigating: investigatingRequests,
                    completed: completedRequests,
                    sent_back: sentBackRequests
                  }[tabKey]
                }
                status={tabKey}
                onRefresh={handleRefresh}
              />
            </ErrorBoundary>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default React.memo(QueueManagement);
