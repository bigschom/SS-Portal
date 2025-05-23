import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import {  
  RefreshCcw,
  Download,
  Filter,
  Users,
  Clock,
  Building2,
  Loader2,
  BadgeCheck,
  BarChart2,
  PieChartIcon,
  Calendar
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { useAuth } from '../../hooks/useAuth'
import apiService from '../../config/api-service'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

// Constants
const COLORS = ['#0A2647', '#144272', '#205295', '#2C74B3', '#427D9D']

const BackgroundCheckReport = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  // Loading states
  const [pageLoading, setPageLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)

  // Filter and data states
  const [filters, setFilters] = useState({
    dateRange: 'all',
    startDate: null,
    endDate: null,
    department: 'all',
    roleType: null
  })

  // Data states
  const [departments, setDepartments] = useState([])
  const [roles, setRoles] = useState([])
  const [stats, setStats] = useState({
    totalChecks: 0,
    pendingChecks: 0,
    closedChecks: 0
  })
  const [statusDistribution, setStatusDistribution] = useState([])
  const [rawData, setRawData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [departmentDistribution, setDepartmentDistribution] = useState([])
  const [monthlyBreakdown, setMonthlyBreakdown] = useState([])

  // Initialize component
  useEffect(() => {
    setInitialized(true)
  }, [user])

  // Fetch data when filters change
  useEffect(() => {
    if (!initialized) return;

    const initializePage = async () => {
      try {
        await Promise.all([
          fetchData(),
          fetchDepartmentsAndRoles()
        ])
      } catch (error) {
        console.error('Error initializing page:', error)
      } finally {
        setPageLoading(false)
      }
    }

    initializePage()
  }, [initialized, filters])

  // Fetch departments and roles
  const fetchDepartmentsAndRoles = async () => {
    try {
      // Get departments from constants
      const deptData = apiService.backgroundChecks.getDepartments();
      setDepartments(deptData || []);
      
      // Get role types from constants but filter out Internship
      const roleTypes = apiService.backgroundChecks.getRoleTypes()
        .filter(type => type !== 'Internship');
      
      const formattedRoles = roleTypes.map((type, index) => ({
        id: index + 1,
        name: type,
        type: type
      }));
      setRoles(formattedRoles || []);
    } catch (error) {
      console.error('Error fetching departments and roles:', error)
    }
  }

  // Fetch and process background check data
  const fetchData = async () => {
    setLoading(true)
    try {
      // Prepare API filters
      const apiFilters = {
        role_type: 'all' // Exclude internships by default
      };
      
      if (filters.startDate) {
        apiFilters.startDate = format(filters.startDate, 'yyyy-MM-dd');
      }
      
      if (filters.endDate) {
        apiFilters.endDate = format(filters.endDate, 'yyyy-MM-dd');
      }
      
      if (filters.department !== 'all') {
        apiFilters.department_id = filters.department;
      }
      
      if (filters.roleType) {
        apiFilters.role_type = filters.roleType;
      }
      
      // Get background checks directly with server-side filtering
      const backgroundChecks = await apiService.backgroundChecks.getAllBackgroundChecks(apiFilters);
      
      if (backgroundChecks.error) {
        throw new Error(backgroundChecks.error);
      }
      
      // Filter out internships
      const filteredChecks = backgroundChecks.filter(item => item.role_type !== 'Internship');
      
      setRawData(filteredChecks);
      setFilteredData(filteredChecks);
      
      // Process background check data
      processBackgroundCheckData(filteredChecks);
      processMonthlyData(filteredChecks);
      processDepartmentDistribution(filteredChecks);
      processMonthlyBreakdown(filteredChecks);
      
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Process background check statistics
  const processBackgroundCheckData = (data) => {
    const totalChecks = data.length
    const pendingChecks = data.filter(check => check.status === 'Pending').length
    const closedChecks = data.filter(check => check.status === 'Closed').length

    setStats(prev => ({ 
      ...prev,
      totalChecks,
      pendingChecks,
      closedChecks
    }))

    const statusData = [
      { name: 'Pending', value: pendingChecks, percentage: totalChecks ? ((pendingChecks/totalChecks) * 100).toFixed(1) : 0 },
      { name: 'Closed', value: closedChecks, percentage: totalChecks ? ((closedChecks/totalChecks) * 100).toFixed(1) : 0 }
    ]
    setStatusDistribution(statusData)
  }
  // Process monthly data
  const processMonthlyData = (data) => {
    // Group data by month
    const monthlyGroups = data.reduce((acc, item) => {
      const date = new Date(item.submitted_date || item.date_start);
      if (!date || isNaN(date.getTime())) return acc;
      
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      
      if (!acc[monthYear]) {
        acc[monthYear] = {
          name: monthYear,
          total: 0,
          pending: 0,
          closed: 0
        };
      }
      
      acc[monthYear].total += 1;
      
      if (item.status === 'Pending') {
        acc[monthYear].pending += 1;
      } else if (item.status === 'Closed') {
        acc[monthYear].closed += 1;
      }
      
      return acc;
    }, {});
    
    // Convert to array and sort by date
    const monthlyArray = Object.values(monthlyGroups).sort((a,b) => {
      const [aMonth, aYear] = a.name.split(' ');
      const [bMonth, bYear] = b.name.split(' ');
      
      const aDate = new Date(`${aMonth} 1, ${aYear}`);
      const bDate = new Date(`${bMonth} 1, ${bYear}`);
      
      return aDate - bDate;
    });
    
    setMonthlyData(monthlyArray);
  }
  
  // Process department distribution
  const processDepartmentDistribution = (data) => {
    // Group data by department
    const deptGroups = data.reduce((acc, item) => {
      const deptId = item.department_id;
      const dept = departments.find(d => d.id === deptId);
      const deptName = dept ? dept.name : item.department_name || 'Unknown';
      
      if (!acc[deptName]) {
        acc[deptName] = {
          name: deptName,
          value: 0
        };
      }
      
      acc[deptName].value += 1;
      
      return acc;
    }, {});
    
    // Convert to array, calculate percentages, and sort by value
    const deptArray = Object.values(deptGroups)
      .map(dept => ({
        ...dept,
        percentage: data.length ? ((dept.value / data.length) * 100).toFixed(1) : '0.0'
      }))
      .sort((a, b) => b.value - a.value);
    
    setDepartmentDistribution(deptArray);
  }
  
  // Process monthly breakdown
  const processMonthlyBreakdown = (data) => {
    // Group by month
    const monthlyData = data.reduce((acc, item) => {
      const date = new Date(item.submitted_date);
      if (!date || isNaN(date.getTime())) return acc;
      
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      
      if (!acc[monthYear]) {
        acc[monthYear] = {
          month: monthYear,
          total: 0,
          closed: 0,
          pending: 0
        };
      }
      
      acc[monthYear].total += 1;
      
      if (item.status === 'Closed') {
        acc[monthYear].closed += 1;
      } else {
        acc[monthYear].pending += 1;
      }
      
      return acc;
    }, {});
    
    // Convert to array and calculate completion rate
    const result = Object.values(monthlyData).map(month => ({
      ...month,
      completionRate: month.total > 0 ? ((month.closed / month.total) * 100).toFixed(1) : '0'
    })).sort((a, b) => {
      // Sort by date (most recent first)
      const [aMonth, aYear] = a.month.split(' ');
      const [bMonth, bYear] = b.month.split(' ');
      
      const aDate = new Date(`${aMonth} 1, ${aYear}`);
      const bDate = new Date(`${bMonth} 1, ${bYear}`);
      
      return bDate - aDate;
    });
    
    setMonthlyBreakdown(result);
  }

  // Export to Excel functionality
  const exportToExcel = async () => {
    try {
      setExportLoading(true);
      
      // Format the data according to the specified format
      const exportData = filteredData.map((record, index) => {
        // Determine feedback date - only show when status is 'Closed'
        const feedbackDate = record.status === 'Closed' ? 
          (record.updated_at ? format(new Date(record.updated_at), 'yyyy-MM-dd') : '') : 
          '';
        
        // Find department name if it's not directly available
        const deptName = record.department_name || 
          (record.department_id ? departments.find(d => d.id === record.department_id)?.name : '') || 
          'Unknown';
          
        return {
          'No.': index + 1,
          'Names': record.full_names,
          'Department': deptName,
          'Role': record.role || '',
          'Category': record.role_type,
          'Submitted date': record.submitted_date ? format(new Date(record.submitted_date), 'yyyy-MM-dd') : '',
          'Feedback date': feedbackDate,
          'Status': record.status
        };
      });

      // Create a workbook with multiple sheets
      const workbook = XLSX.utils.book_new();
      
      // Main data sheet with the formatted data
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Background Checks");
      
      // Status distribution sheet
      const statusWorksheet = XLSX.utils.json_to_sheet(statusDistribution);
      XLSX.utils.book_append_sheet(workbook, statusWorksheet, "Status Distribution");
      
      // Department distribution sheet
      const deptWorksheet = XLSX.utils.json_to_sheet(departmentDistribution);
      XLSX.utils.book_append_sheet(workbook, deptWorksheet, "Department Distribution");
      
      // Monthly data sheet
      const monthlyWorksheet = XLSX.utils.json_to_sheet(monthlyData);
      XLSX.utils.book_append_sheet(workbook, monthlyWorksheet, "Monthly Data");
      
      // Monthly breakdown sheet
      const monthlyBreakdownWorksheet = XLSX.utils.json_to_sheet(monthlyBreakdown);
      XLSX.utils.book_append_sheet(workbook, monthlyBreakdownWorksheet, "Monthly Breakdown");
      
      // Create filename that includes filter information
      let fileName = `background-checks_${new Date().toISOString().split('T')[0]}`;
      
      // Add filter info to filename
      if (filters.startDate && filters.endDate) {
        fileName += `_${format(filters.startDate, 'yyyy-MM-dd')}_to_${format(filters.endDate, 'yyyy-MM-dd')}`;
      }
      
      if (filters.department !== 'all') {
        const deptName = departments.find(d => d.id === parseInt(filters.department))?.name || filters.department;
        fileName += `_dept-${deptName}`;
      }
      
      if (filters.roleType) {
        fileName += `_role-${filters.roleType}`;
      }
      
      fileName += '.xlsx';
      
      // Write the file
      XLSX.writeFile(workbook, fileName);
      
      // Log the export activity
      if (apiService.activityLog && typeof apiService.activityLog.logActivity === 'function') {
        await apiService.activityLog.logActivity({
          userId: user.id,
          description: `Exported background checks report with filters: ${JSON.stringify(filters)}`,
          type: 'export'
        });
      }
      
    } catch (error) {
      console.error('Error exporting to Excel:', error)
    } finally {
      setExportLoading(false);
    }
  }
  // Render background check statistics cards
  const renderBackgroundCheckStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
          <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
          <Users className="h-4 w-4 text-[#0A2647]" />
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{stats.totalChecks}</div>
          <p className="text-xs text-muted-foreground mt-2">
            Total background checks processed
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
          <CardTitle className="text-sm font-medium">Pending</CardTitle>
          <Clock className="h-4 w-4 text-[#0A2647]" />
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{stats.pendingChecks}</div>
          <p className="text-xs text-muted-foreground mt-2">
            Pending background checks
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
          <CardTitle className="text-sm font-medium">Closed</CardTitle>
          <BadgeCheck className="h-4 w-4 text-[#0A2647]" />
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{stats.closedChecks}</div>
          <p className="text-xs text-muted-foreground mt-2">
            Completed background checks
          </p>
        </CardContent>
      </Card>
    </div>
  )

  // Render pie chart
  const renderPieChart = (data, title) => (
    <Card className="col-span-1 md:col-span-2 border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
      <CardHeader className="bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
        <CardTitle className="flex items-center text-lg font-medium">
          <PieChartIcon className="w-4 h-4 mr-2 text-[#0A2647]" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [`${value} (${data.find(item => item.name === name)?.percentage}%)`, name]}
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
                verticalAlign="middle" 
                align="right"
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
  )

  // Render department distribution
  const renderDepartmentDistribution = () => (
    <Card className="col-span-1 border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
      <CardHeader className="bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
        <CardTitle className="flex items-center text-lg font-medium">
          <Building2 className="w-4 h-4 mr-2 text-[#0A2647]" />
          Department Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-80 overflow-y-auto pr-2">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Count
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {departmentDistribution.map((dept, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      {dept.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">
                    {dept.value}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">
                    {dept.percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
  // Render monthly trend
  const renderMonthlyTrend = () => (
    <Card className="col-span-1 md:col-span-3 border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
      <CardHeader className="bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
        <CardTitle className="flex items-center text-lg font-medium">
          <BarChart2 className="w-4 h-4 mr-2 text-[#0A2647]" />
          Monthly Trend
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
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
              <Bar dataKey="pending" name="Pending" fill="#0A2647" />
              <Bar dataKey="closed" name="Closed" fill="#144272" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
  
  // Render monthly breakdown
  const renderMonthlyBreakdown = () => (
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
                  Total Checks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Closed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Pending
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Completion Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0A2647]" />
                  </td>
                </tr>
              ) : monthlyBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
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
                      {month.closed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {month.pending}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mr-2">
                          <div 
                            className="bg-[#0A2647] h-2.5 rounded-full" 
                            style={{ width: `${month.completionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-300">
                          {month.completionRate}%
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
  )

  // Render loading state
  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A2647]" />
      </div>
    )
  }

  // Main render method
  return (
    <div className="flex flex-col min-h-[calc(100vh-theme(spacing.16))]">
      <div className="flex-1 flex justify-center">
        <div className="w-full max-w-[80%] px-4 pb-8">
          <div className="flex justify-between items-center pt-2 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Background Check Analysis
            </h1>
            <Button
              onClick={exportToExcel}disabled={exportLoading}
              className="bg-[#0A2647] hover:bg-[#0A2647]/90 text-white flex items-center space-x-2"
            >
              {exportLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Export to Excel</span>
            </Button>
          </div>

          {/* Filters */}
          <Card className="mb-6 border-none shadow-md dark:bg-gray-800">
            <CardHeader className="bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
              <CardTitle className="flex items-center text-lg font-medium">
                <Filter className="w-4 h-4 mr-2 text-[#0A2647]" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date Range
                  </label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => {
                      const value = e.target.value;
                      let startDate = null;
                      let endDate = null;
                      
                      if (value === 'last30') {
                        startDate = new Date();
                        startDate.setDate(startDate.getDate() - 30);
                        endDate = new Date();
                      } else if (value === 'last90') {
                        startDate = new Date();
                        startDate.setDate(startDate.getDate() - 90);
                        endDate = new Date();
                      } else if (value === 'thisYear') {
                        startDate = new Date(new Date().getFullYear(), 0, 1);
                        endDate = new Date();
                      } else if (value === 'lastYear') {
                        startDate = new Date(new Date().getFullYear() - 1, 0, 1);
                        endDate = new Date(new Date().getFullYear() - 1, 11, 31);
                      }
                      
                      setFilters(prev => ({
                        ...prev,
                        dateRange: value,
                        startDate,
                        endDate
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="all">All Time</option>
                    <option value="last30">Last 30 Days</option>
                    <option value="last90">Last 90 Days</option>
                    <option value="thisYear">This Year</option>
                    <option value="lastYear">Last Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {filters.dateRange === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Start Date
                      </label>
                      <DatePicker
                        selected={filters.startDate}
                        onChange={(date) => setFilters(prev => ({ ...prev, startDate: date }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholderText="Select start date"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        End Date
                      </label>
                      <DatePicker
                        selected={filters.endDate}
                        onChange={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholderText="Select end date"
                        minDate={filters.startDate}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department
                  </label>
                  <select
                    value={filters.department}
                    onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="all">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role Type
                  </label>
                  <select
                    value={filters.roleType || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      roleType: e.target.value === '' ? null : e.target.value 
                    }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">All Role Types</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.name}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={() => {
                      setFilters({
                        dateRange: 'all',
                        startDate: null,
                        endDate: null,
                        department: 'all',
                        roleType: null
                      });
                    }}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    <span>Reset Filters</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          {renderBackgroundCheckStats()}

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {renderPieChart(statusDistribution, 'Background Check Status Distribution')}
            {renderDepartmentDistribution()}
          </div>

          {/* Monthly Trend */}
          {renderMonthlyTrend()}
          
          {/* Monthly Breakdown */}
          {renderMonthlyBreakdown()}
        </div>
      </div>
    </div>
  )
}

export default BackgroundCheckReport