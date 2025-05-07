// src/pages/security-services/dashboard/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Button } from '../../../components/ui/button';
import { Separator } from '../../../components/ui/separator';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  Users,
  Activity,
  RefreshCw,
  Calendar,
  Loader2,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  PhoneIncoming
} from 'lucide-react';
import apiClient from '../../../config/api-service';
import { format, sub } from 'date-fns';

// Colors for charts
const COLORS = [
  '#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#d4e3fc', // Blues
  '#1e3a8a', '#3451b2', '#4f6beb', '#818cf8', '#c4b5fd'  // Purples
];

const STATUS_COLORS = {
  'new': '#3b82f6', // Blue
  'in_progress': '#eab308', // Yellow
  'completed': '#22c55e', // Green
  'pending_investigation': '#a855f7', // Purple
  'unable_to_handle': '#ef4444', // Red
  'sent_back': '#f97316' // Orange
};

const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('week');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();

    // Refresh data every 5 minutes
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 300000);

    return () => clearInterval(interval);
  }, [dateRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      let startDate;

      switch (dateRange) {
        case 'day':
          startDate = sub(endDate, { days: 1 });
          break;
        case 'week':
          startDate = sub(endDate, { weeks: 1 });
          break;
        case 'month':
          startDate = sub(endDate, { months: 1 });
          break;
        case 'quarter':
          startDate = sub(endDate, { months: 3 });
          break;
        case 'year':
          startDate = sub(endDate, { years: 1 });
          break;
        default:
          startDate = sub(endDate, { weeks: 1 });
      }

      // Format dates for API
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // Fetch dashboard data from API
      const response = await apiClient.get('/security-services/dashboard', {
        params: {
          startDate: startDateStr,
          endDate: endDateStr
        }
      });

      setDashboardData(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
      
      // Set mock data for development if API fails
      setDashboardData(getMockDashboardData());
    } finally {
      setLoading(false);
    }
  };

  const getMockDashboardData = () => {
    // Mock data structure that mimics what we'd expect from the API
    return {
      summary: {
        total: 247,
        new: 38,
        inProgress: 42,
        completed: 145,
        pendingInvestigation: 12,
        unableToHandle: 5,
        sentBack: 5,
        percentChange: 12.5
      },
      byServiceType: [
        { name: 'Call History', value: 65 },
        { name: 'Money Refund', value: 55 },
        { name: 'MoMo Transaction', value: 40 },
        { name: 'Unblock MoMo', value: 30 },
        { name: 'Serial Number', value: 25 },
        { name: 'Stolen Phone', value: 15 },
        { name: 'Unblock Call', value: 12 },
        { name: 'Backoffice', value: 5 }
      ],
      byStatus: [
        { name: 'New', value: 38, color: STATUS_COLORS.new },
        { name: 'In Progress', value: 42, color: STATUS_COLORS.in_progress },
        { name: 'Completed', value: 145, color: STATUS_COLORS.completed },
        { name: 'Pending', value: 12, color: STATUS_COLORS.pending_investigation },
        { name: 'Unable to Handle', value: 5, color: STATUS_COLORS.unable_to_handle },
        { name: 'Sent Back', value: 5, color: STATUS_COLORS.sent_back }
      ],
      timeline: [
        { date: '2025-04-26', total: 12, new: 3, completed: 7 },
        { date: '2025-04-27', total: 15, new: 5, completed: 8 },
        { date: '2025-04-28', total: 20, new: 6, completed: 9 },
        { date: '2025-04-29', total: 18, new: 4, completed: 11 },
        { date: '2025-04-30', total: 22, new: 7, completed: 10 },
        { date: '2025-05-01', total: 25, new: 6, completed: 12 },
        { date: '2025-05-02', total: 21, new: 5, completed: 11 },
        { date: '2025-05-03', total: 19, new: 4, completed: 13 }
      ],
      topPerformers: [
        { name: 'Bigirimana', completed: 38, avg_time: 4.2 },
        { name: 'John Doe', completed: 27, avg_time: 5.1 },
        { name: 'Jane Smith', completed: 24, avg_time: 3.8 },
        { name: 'Alice Johnson', completed: 19, avg_time: 6.2 },
        { name: 'Bob Wilson', completed: 15, avg_time: 5.5 }
      ],
      responseTime: {
        average: 5.2,
        byServiceType: [
          { name: 'Serial Number', value: 2.3 },
          { name: 'Stolen Phone', value: 1.8 },
          { name: 'Call History', value: 6.4 },
          { name: 'Unblock Call', value: 3.2 },
          { name: 'Unblock MoMo', value: 4.1 },
          { name: 'Money Refund', value: 8.5 },
          { name: 'MoMo Transaction', value: 7.2 },
          { name: 'Backoffice', value: 12.5 }
        ]
      }
    };
  };

  // Render loading state
  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  const renderSummaryCard = (title, value, icon, color, percentChange = null) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <h3 className="text-3xl font-bold mt-2">{value}</h3>
            {percentChange !== null && (
              <div className={`flex items-center mt-2 ${percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {percentChange >= 0 ? (
                  <ArrowUp className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowDown className="w-4 h-4 mr-1" />
                )}
                <span className="text-sm font-medium">{Math.abs(percentChange)}% from previous {dateRange}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900/30`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Ensure we have data before rendering
  if (!dashboardData) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Security Services Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Real-time overview and analytics of security service requests
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="h-4 w-4" />
            <span>Range:</span>
          </div>
          
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 rounded-md text-sm px-2 py-1 bg-white dark:bg-gray-800"
          >
            <option value="day">24 Hours</option>
            <option value="week">1 Week</option>
            <option value="month">1 Month</option>
            <option value="quarter">3 Months</option>
            <option value="year">1 Year</option>
          </select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={loading}
            className="ml-2"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 p-4 rounded-lg mb-6">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">
            <Activity className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="service-types">
            <PhoneIncoming className="h-4 w-4 mr-2" />
            Service Types
          </TabsTrigger>
          <TabsTrigger value="performance">
            <Users className="h-4 w-4 mr-2" />
            Agent Performance
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {renderSummaryCard(
              "Total Requests",
              dashboardData.summary.total,
              <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
              "blue",
              dashboardData.summary.percentChange
            )}
            {renderSummaryCard(
              "New Requests",
              dashboardData.summary.new,
              <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
              "blue"
            )}
            {renderSummaryCard(
              "In Progress",
              dashboardData.summary.inProgress,
              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />,
              "yellow"
            )}
            {renderSummaryCard(
              "Completed",
              dashboardData.summary.completed,
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />,
              "green"
            )}
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Request Status Distribution</CardTitle>
                <CardDescription>
                  Current distribution of requests by status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardData.byStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {dashboardData.byStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} Requests`, 'Count']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Request Timeline</CardTitle>
                <CardDescription>
                  Daily requests over the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={dashboardData.timeline}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="date" tickFormatter={(date) => format(new Date(date), 'MMM dd')} />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => {
                          const formattedName = name === 'total' ? 'Total'
                            : name === 'new' ? 'New'
                            : name === 'completed' ? 'Completed'
                            : name;
                          return [value, formattedName];
                        }}
                        labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="total" stackId="1" stroke="#8884d8" fill="#8884d8" opacity={0.3} />
                      <Area type="monotone" dataKey="new" stackId="2" stroke="#3b82f6" fill="#3b82f6" opacity={0.5} />
                      <Area type="monotone" dataKey="completed" stackId="3" stroke="#22c55e" fill="#22c55e" opacity={0.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Additional Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderSummaryCard(
              "Pending Investigation",
              dashboardData.summary.pendingInvestigation,
              <AlertTriangle className="h-6 w-6 text-purple-600 dark:text-purple-400" />,
              "purple"
            )}
            {renderSummaryCard(
              "Unable to Handle",
              dashboardData.summary.unableToHandle,
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />,
              "red"
            )}
            {renderSummaryCard(
              "Sent Back",
              dashboardData.summary.sentBack,
              <RotateCcw className="h-6 w-6 text-orange-600 dark:text-orange-400" />,
              "orange"
            )}
          </div>
        </TabsContent>
        
        {/* Service Types Tab */}
        <TabsContent value="service-types">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Requests by Service Type</CardTitle>
                <CardDescription>
                  Distribution of requests across different service types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dashboardData.byServiceType}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        tick={{ fontSize: 12 }}
                        width={100}
                      />
                      <Tooltip formatter={(value) => [`${value} Requests`, 'Count']} />
                      <Legend />
                      <Bar dataKey="value" name="Requests" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Response Time by Service */}
            <Card>
              <CardHeader>
                <CardTitle>Average Response Time by Service</CardTitle>
                <CardDescription>
                  Average time (in hours) to complete requests by service type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dashboardData.responseTime.byServiceType}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        tick={{ fontSize: 12 }} 
                        width={100}
                      />
                      <Tooltip formatter={(value) => [`${value.toFixed(1)} hours`, 'Response Time']} />
                      <Legend />
                      <Bar dataKey="value" name="Hours" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 px-6 py-3">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Overall average response time: <span className="font-semibold">{dashboardData.responseTime.average.toFixed(1)} hours</span>
                  </span>
                </div>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        {/* Performance Tab */}
        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Agents</CardTitle>
                <CardDescription>
                  Agents with the most completed requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dashboardData.topPerformers}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => {
                        return name === 'completed' ? [`${value} Requests`, 'Completed'] : [`${value} hours`, 'Avg. Response Time'];
                      }} />
                      <Legend />
                      <Bar dataKey="completed" name="Completed Requests" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Response Time Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Agent Response Time</CardTitle>
                <CardDescription>
                  Average response time (in hours) by agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dashboardData.topPerformers}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value.toFixed(1)} hours`, 'Avg. Response Time']} />
                      <Legend />
                      <Bar dataKey="avg_time" name="Avg. Response Time (hours)" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Agent Performance Table */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Detailed Agent Performance</CardTitle>
              <CardDescription>
                Detailed performance metrics for all agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Agent</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Completed</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-400">In Progress</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Avg. Response (hours)</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.topPerformers.map((agent, index) => (
                      <tr 
                        key={index}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="py-3 px-4 font-medium">{agent.name}</td>
                        <td className="py-3 px-4 text-center">{agent.completed}</td>
                        <td className="py-3 px-4 text-center">{Math.floor(Math.random() * 10)}</td> {/* Mock data */}
                        <td className="py-3 px-4 text-center">{agent.avg_time.toFixed(1)}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            {agent.avg_time < 4 ? 'Excellent' : agent.avg_time < 6 ? 'Good' : 'Average'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardPage;