
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  BarChart2, 
  Download, 
  Calendar,
  Filter,
  RefreshCw,
  PieChartIcon,
  TrendingUp,
  FileText,
  Users,
  Clock,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { useAuth } from '../../hooks/useAuth'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts'
import * as XLSX from 'xlsx'
import apiService from '../../config/api-service'

const COLORS = ['#0A2647', '#144272', '#205295', '#2C74B3', '#427D9D', '#6096B4']

const StakeholderReport = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const chartsRef = useRef(null)
  
  const [pageLoading, setPageLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date()
  })
  const [selectedSender, setSelectedSender] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    answeredRequests: 0
  })
  const [timelineData, setTimelineData] = useState([])
  const [senderDistribution, setSenderDistribution] = useState([])
  const [statusDistribution, setStatusDistribution] = useState([])
  const [monthlyTrends, setMonthlyTrends] = useState([])
  const [filterOptions, setFilterOptions] = useState({
    senders: ['all'],
    subjects: ['all'],
    error: null,
    isLoading: false
  })
  const [rawData, setRawData] = useState([])
  const [monthlyBreakdown, setMonthlyBreakdown] = useState([])

  // Initialize data on component mount
  useEffect(() => {
    const initializePage = async () => {
      try {
        await Promise.all([
          fetchInitialData(),
          fetchFilterOptions()
        ])
      } catch (error) {
        console.error('Error initializing page:', error)
      } finally {
        setPageLoading(false)
      }
    }

    initializePage()
  }, [])
  
  // Update data when filters change
  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      fetchData()
    }
  }, [dateRange.startDate, dateRange.endDate, selectedSender, selectedStatus, selectedSubject])

  const fetchInitialData = async () => {
    const startDate = new Date(new Date().setMonth(new Date().getMonth() - 1))
    const endDate = new Date()
    await fetchDataForRange(startDate, endDate)
  }

  const fetchFilterOptions = async () => {
    console.log('Starting to fetch filter options...');
    setFilterOptions(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Use the API service to get options
      const options = await apiService.stakeholderRequests.getOptions();
      
      if (options.error) {
        throw new Error(options.error);
      }

      // Process options
      const uniqueSenders = ['all', ...(options.senders || [])];
      const uniqueSubjects = ['all', ...(options.subjects || [])];

      setFilterOptions({
        senders: uniqueSenders,
        subjects: uniqueSubjects,
        error: null,
        isLoading: false
      });

    } catch (error) {
      console.error('Failed to fetch filter options:', {
        error,
        stack: error.stack,
        message: error.message
      });

      setFilterOptions(prev => ({
        ...prev,
        error: 'Failed to load filter options. Please try again later.',
        isLoading: false
      }));
    }
  };

  const handleStartDateChange = (date) => {
    setDateRange({
      startDate: date,
      endDate: dateRange.endDate
    })
  }

  const handleEndDateChange = (date) => {
    setDateRange(prev => ({
      ...prev,
      endDate: date
    }))
  }

  const fetchDataForRange = async (startDate, endDate) => {
    setIsLoading(true)
    try {
      // Use the API service to get all stakeholder requests
      const allRequests = await apiService.stakeholderRequests.getAllRequests();
      
      if (allRequests.error) {
        throw new Error(allRequests.error);
      }
      
      // Filter the data based on date range and other filters
      let filteredData = allRequests.filter(request => {
        const requestDate = new Date(request.date_received);
        return requestDate >= startDate && requestDate <= endDate;
      });
      
      // Apply sender filter
      if (selectedSender !== 'all') {
        filteredData = filteredData.filter(request => request.sender === selectedSender);
      }
      
      // Apply status filter
      if (selectedStatus !== 'all') {
        filteredData = filteredData.filter(request => request.status === selectedStatus);
      }
      
      // Apply subject filter
      if (selectedSubject !== 'all') {
        filteredData = filteredData.filter(request => request.subject === selectedSubject);
      }

      setRawData(filteredData)
      processData(filteredData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchData = () => {
    if (dateRange.startDate && dateRange.endDate) {
      fetchDataForRange(dateRange.startDate, dateRange.endDate)
    }
  }

  const processData = (data) => {
    const total = data.length
    const pending = data.filter(r => r.status === 'Pending').length
    const answered = data.filter(r => r.status === 'Answered').length

    setStats({
      totalRequests: total,
      pendingRequests: pending,
      answeredRequests: answered
    })

    setSenderDistribution(processDistributionData(data, 'sender', total))
    
    const statusData = [
      { name: 'Pending', value: pending, percentage: total > 0 ? ((pending/total) * 100).toFixed(1) : '0' },
      { name: 'Answered', value: answered, percentage: total > 0 ? ((answered/total) * 100).toFixed(1) : '0' }
    ]
    setStatusDistribution(statusData)

    setTimelineData(processTimelineData(data))
    setMonthlyBreakdown(processMonthlyBreakdown(data))
  }

  const processTimelineData = (data) => {
    const grouped = data.reduce((acc, item) => {
      const date = new Date(item.date_received).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})

    return Object.entries(grouped)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }

  const processDistributionData = (data, key, total) => {
    if (total === 0) return [];
    
    const distribution = data.reduce((acc, item) => {
      const value = item[key] || 'Unknown';
      acc[value] = (acc[value] || 0) + 1
      return acc
    }, {})

    return Object.entries(distribution)
      .map(([name, value]) => ({
        name,
        value,
        percentage: ((value/total) * 100).toFixed(1)
      }))
      .sort((a, b) => b.value - a.value)
  }

  const processMonthlyBreakdown = (data) => {
    // Group by month
    const monthlyData = data.reduce((acc, item) => {
      const date = new Date(item.date_received);
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      
      if (!acc[monthYear]) {
        acc[monthYear] = {
          month: monthYear,
          total: 0,
          answered: 0,
          pending: 0
        };
      }
      
      acc[monthYear].total += 1;
      
      if (item.status === 'Answered') {
        acc[monthYear].answered += 1;
      } else {
        acc[monthYear].pending += 1;
      }
      
      return acc;
    }, {});
    
    // Convert to array and calculate response rate
    return Object.values(monthlyData).map(month => ({
      ...month,
      responseRate: month.total > 0 ? ((month.answered / month.total) * 100).toFixed(1) : '0'
    })).sort((a, b) => {
      // Sort by date (most recent first)
      const [aMonth, aYear] = a.month.split(' ');
      const [bMonth, bYear] = b.month.split(' ');
      
      const aDate = new Date(`${aMonth} 1, ${aYear}`);
      const bDate = new Date(`${bMonth} 1, ${bYear}`);
      
      return bDate - aDate;
    });
  };

  const exportToExcel = async () => {
    try {
      // Create workbook with multiple sheets
      const workbook = XLSX.utils.book_new();
      
      // Raw data sheet
      const worksheet = XLSX.utils.json_to_sheet(rawData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Raw Data");
      
      // Monthly breakdown sheet
      const monthlyWorksheet = XLSX.utils.json_to_sheet(monthlyBreakdown);
      XLSX.utils.book_append_sheet(workbook, monthlyWorksheet, "Monthly Breakdown");
      
      // Status distribution sheet
      const statusWorksheet = XLSX.utils.json_to_sheet(statusDistribution);
      XLSX.utils.book_append_sheet(workbook, statusWorksheet, "Status Distribution");
      
      // Sender distribution sheet
      const senderWorksheet = XLSX.utils.json_to_sheet(senderDistribution);
      XLSX.utils.book_append_sheet(workbook, senderWorksheet, "Sender Distribution");
      
      XLSX.writeFile(workbook, `stakeholder-data-${dateRange.startDate.toISOString().split('T')[0]}-to-${dateRange.endDate.toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  }

  const resetFilters = () => {
    setDateRange({
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date()
    });
    setSelectedSender('all');
    setSelectedStatus('all');
    setSelectedSubject('all');
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A2647]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-theme(spacing.16))]">
      <div className="flex-1 flex justify-center">
        <div className="w-full max-w-[80%] px-4 pb-8">
          <div className="flex justify-between items-center pt-2 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Stakeholder Analysis Report
            </h1>
            <Button
              onClick={exportToExcel}
              className="bg-[#0A2647] hover:bg-[#0A2647]/90 text-white flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export to Excel</span>
            </Button>
          </div>

          {/* Filters */}
          <Card className="mb-6 border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
            <CardHeader className="bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
              <CardTitle className="flex items-center text-lg font-medium">
                <Filter className="w-4 h-4 mr-2 text-[#0A2647]" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <div className="relative">
                    <DatePicker
                      selected={dateRange.startDate}
                      onChange={handleStartDateChange}
                      selectsStart
                      startDate={dateRange.startDate}
                      endDate={dateRange.endDate}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <div className="relative">
                    <DatePicker
                      selected={dateRange.endDate}
                      onChange={handleEndDateChange}
                      selectsEnd
                      startDate={dateRange.startDate}
                      endDate={dateRange.endDate}
                      minDate={dateRange.startDate}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sender
                  </label>
                  <select
                    value={selectedSender}
                    onChange={(e) => setSelectedSender(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    {filterOptions.senders.map((sender, index) => (
                      <option key={index} value={sender}>
                        {sender === 'all' ? 'All Senders' : sender}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Answered">Answered</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    {filterOptions.subjects.map((subject, index) => (
                      <option key={index} value={subject}>
                        {subject === 'all' ? 'All Subjects' : subject}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={resetFilters}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Reset Filters</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <FileText className="h-4 w-4 text-[#0A2647]" />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.totalRequests}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Total stakeholder requests received
                </p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-[#0A2647]" />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.pendingRequests}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Requests awaiting response
                </p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
                <CardTitle className="text-sm font-medium">Answered</CardTitle>
                <CheckCircle className="h-4 w-4 text-[#0A2647]" />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.answeredRequests}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Requests that have been answered
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6" ref={chartsRef}>
            {/* Status Distribution */}
            <Card className="col-span-1 md:col-span-1 border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
              <CardHeader className="bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
                <CardTitle className="flex items-center text-lg font-medium">
                  <PieChartIcon className="w-4 h-4 mr-2 text-[#0A2647]" />
                  Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => [`${value} (${statusDistribution.find(item => item.name === name)?.percentage}%)`, name]}
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          border: 'none',
                          padding: '8px 12px'
                        }}
                      />
                      <Legend 
                        layout="vertical" 
                        verticalAlign="bottom" 
                        align="center"
                        formatter={(value, entry) => (
                          <span style={{ color: entry.color, fontWeight: 'medium' }}>
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Sender Distribution */}
            <Card className="col-span-1 md:col-span-2 border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
              <CardHeader className="bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
                <CardTitle className="flex items-center text-lg font-medium">
                  <Users className="w-4 h-4 mr-2 text-[#0A2647]" />
                  Sender Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={senderDistribution.slice(0, 5)}
                      layout="vertical"
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip 
                        formatter={(value, name, props) => [`${value} (${props.payload.percentage}%)`, 'Requests']}
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          border: 'none',
                          padding: '8px 12px'
                        }}
                      />
                      <Bar dataKey="value" fill="#0A2647">
                        {senderDistribution.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {senderDistribution.length > 5 && (
                  <div className="text-center text-sm text-gray-500 mt-2">
                    Showing top 5 of {senderDistribution.length} senders
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trends */}
          <Card className="mb-6 border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
            <CardHeader className="bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
              <CardTitle className="flex items-center text-lg font-medium">
                <TrendingUp className="w-4 h-4 mr-2 text-[#0A2647]" />
                Monthly Trends
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={monthlyBreakdown}
                    margin={{
                      top: 10,
                      right: 30,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        border: 'none',
                        padding: '8px 12px'
                      }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="total" stackId="1" stroke="#0A2647" fill="#0A2647" name="Total" />
                    <Area type="monotone" dataKey="answered" stackId="2" stroke="#144272" fill="#144272" name="Answered" />
                    <Area type="monotone" dataKey="pending" stackId="2" stroke="#205295" fill="#205295" name="Pending" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Response Rate */}
          <Card className="mb-6 border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
            <CardHeader className="bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
              <CardTitle className="flex items-center text-lg font-medium">
                <BarChart2 className="w-4 h-4 mr-2 text-[#0A2647]" />
                Response Rate by Month
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyBreakdown}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} label={{ value: 'Response Rate (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'Response Rate']}
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        border: 'none',
                        padding: '8px 12px'
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="responseRate" stroke="#0A2647" activeDot={{ r: 8 }} name="Response Rate %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Raw Data Table */}
          <Card className="border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
            <CardHeader className="bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
              <CardTitle className="flex items-center text-lg font-medium">
                Raw Data
              </CardTitle>
              <CardDescription>
                {rawData.length} records found
                </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date Received
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Sender
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Response Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {isLoading ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-4 text-center">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0A2647]" />
                        </td>
                      </tr>
                    ) : rawData.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                          No records found
                        </td>
                      </tr>
                    ) : (
                      rawData.slice(0, 10).map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {new Date(record.date_received).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {record.sender}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {record.subject}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${record.status === 'Pending'
                                ? 'bg-[#0A2647]/10 text-[#0A2647] dark:bg-[#0A2647]/30 dark:text-blue-200'
                                : 'bg-[#144272]/10 text-[#144272] dark:bg-[#144272]/30 dark:text-green-200'
                              }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {record.response_date ? new Date(record.response_date).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                
                {rawData.length > 10 && (
                  <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Showing 10 of {rawData.length} records. Export to Excel to see all data.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Breakdown Table */}
          <Card className="mt-6 border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
            <CardHeader className="bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
              <CardTitle className="flex items-center text-lg font-medium">
                <Calendar className="w-4 h-4 mr-2 text-[#0A2647]" />
                Monthly Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Month
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Total Requests
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Answered
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Pending
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Response Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {isLoading ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-4 text-center">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0A2647]" />
                        </td>
                      </tr>
                    ) : monthlyBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                          No data available
                        </td>
                      </tr>
                    ) : (
                      monthlyBreakdown.map((month, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {month.month}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {month.total}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {month.answered}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {month.pending}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mr-2">
                                <div 
                                  className="bg-[#0A2647] h-2.5 rounded-full" 
                                  style={{ width: `${month.responseRate}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-500 dark:text-gray-300">
                                {month.responseRate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default StakeholderReport