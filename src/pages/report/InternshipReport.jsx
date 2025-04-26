import { useState, useEffect, useRef } from 'react'
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
  AlertCircle,
  BarChart2,
  PieChartIcon,
  Calendar
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card'
import { useAuth } from '../../hooks/useAuth';
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
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

const COLORS = ['#0A2647', '#144272', '#205295', '#2C74B3', '#427D9D']

const InternshipReport = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [pageLoading, setPageLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  const [filters, setFilters] = useState({
    dateRange: 'all',
    startDate: null,
    endDate: null,
    department: 'all',
    status: 'all' // 'all', 'active', or 'expired'
  })

  // States for data
  const [loading, setLoading] = useState(true)
  const [departments, setDepartments] = useState([])
  const [stats, setStats] = useState({
    totalInternships: 0,
    activeInternships: 0,
    expiredInternships: 0
  })
  const [statusDistribution, setStatusDistribution] = useState([])
  const [rawData, setRawData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [departmentDistribution, setDepartmentDistribution] = useState([])
  const [monthlyBreakdown, setMonthlyBreakdown] = useState([])
  const [exportLoading, setExportLoading] = useState(false)

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
          fetchDepartments()
        ])
      } catch (error) {
        console.error('Error initializing page:', error)
      } finally {
        setPageLoading(false)
      }
    }

    initializePage()
  }, [initialized, filters])

  const fetchDepartments = async () => {
    try {
      // Get departments from constants
      const deptData = apiService.backgroundChecks.getDepartments();
      setDepartments(deptData || []);
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      // Prepare API filters - Specifically for internships
      const apiFilters = { 
        role_type: 'Internship' // Only get internships
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
      
      if (filters.status !== 'all') {
        apiFilters.status = filters.status;
      }
      
      // Get internships using the background checks API
      let internships = await apiService.backgroundChecks.getAllBackgroundChecks(apiFilters);
      
      if (internships.error) {
        throw new Error(internships.error);
      }
      
      // Make sure we only have internships
      internships = internships.filter(item => item.role_type === 'Internship');
      
      // Apply client-side filtering for active/expired status if needed
      if (filters.status === 'active' || filters.status === 'expired') {
        const currentDate = new Date();
        internships = internships.filter(internship => {
          const endDate = new Date(internship.date_end);
          return filters.status === 'active' ? 
            endDate >= currentDate : 
            endDate < currentDate;
        });
      }
      
      setRawData(internships);
      setFilteredData(internships);
      
      // Process internship data for stats and charts
      processInternshipData(internships);
      
      // Process monthly data
      processMonthlyData(internships);
      
      // Process department distribution
      processDepartmentDistribution(internships);
      
      // Process monthly breakdown
      processMonthlyBreakdown(internships);
      
    } catch (error) {
      console.error('Error fetching internship data:', error)
    } finally {
      setLoading(false)
    }
  }

  const processInternshipData = (data) => {
    const currentDate = new Date()
    const totalInternships = data.length
    const activeInternships = data.filter(intern => new Date(intern.date_end) >= currentDate).length
    const expiredInternships = totalInternships - activeInternships

    setStats({
      totalInternships,
      activeInternships,
      expiredInternships
    })

    const statusData = [
      { name: 'Active', value: activeInternships, percentage: totalInternships ? ((activeInternships/totalInternships) * 100).toFixed(1) : 0 },
      { name: 'Expired', value: expiredInternships, percentage: totalInternships ? ((expiredInternships/totalInternships) * 100).toFixed(1) : 0 }
    ]
    setStatusDistribution(statusData)
  }
  
  const processMonthlyData = (data) => {
    // Group data by month based on start date
    const monthlyGroups = data.reduce((acc, item) => {
      const date = new Date(item.date_start);
      if (!date || isNaN(date.getTime())) return acc;
      
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      
      if (!acc[monthYear]) {
        acc[monthYear] = {
          name: monthYear,
          total: 0,
          active: 0,
          expired: 0
        };
      }
      
      acc[monthYear].total += 1;
      
      const currentDate = new Date();
      const endDate = new Date(item.date_end);
      if (endDate >= currentDate) {
        acc[monthYear].active += 1;
      } else {
        acc[monthYear].expired += 1;
      }
      
      return acc;
    }, {});
    
    // Convert to array and sort by date
    const monthlyArray = Object.values(monthlyGroups).sort((a, b) => {
      const [aMonth, aYear] = a.name.split(' ');
      const [bMonth, bYear] = b.name.split(' ');
      
      const aDate = new Date(`${aMonth} 1, ${aYear}`);
      const bDate = new Date(`${bMonth} 1, ${bYear}`);
      
      return aDate - bDate;
    });
    
    setMonthlyData(monthlyArray);
  }
  
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
  
  const processMonthlyBreakdown = (data) => {
    // Group by month based on start date
    const monthlyData = data.reduce((acc, item) => {
      const date = new Date(item.date_start);
      if (!date || isNaN(date.getTime())) return acc;
      
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      
      if (!acc[monthYear]) {
        acc[monthYear] = {
          month: monthYear,
          total: 0,
          active: 0,
          expired: 0
        };
      }
      
      acc[monthYear].total += 1;
      
      const currentDate = new Date();
      const endDate = new Date(item.date_end);
      if (endDate >= currentDate) {
        acc[monthYear].active += 1;
      } else {
        acc[monthYear].expired += 1;
      }
      
      return acc;
    }, {});
    
    // Convert to array and calculate active rate
    const result = Object.values(monthlyData).map(month => ({
      ...month,
      activeRate: month.total > 0 ? ((month.active / month.total) * 100).toFixed(1) : '0'
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

  const exportToExcel = async () => {
    try {
      setExportLoading(true);
      
      // Format the data according to the specified format
      const exportData = filteredData.map((record, index) => {
        // Find department name if it's not directly available
        const deptName = record.department_name || 
          (record.department_id ? departments.find(d => d.id === record.department_id)?.name : '') || 
          'Unknown';
          
        return {
          'No.': index + 1,
          'Names': record.full_names,
          'Department': deptName,
          'Role': record.role || '',
          'Start Date': record.date_start ? format(new Date(record.date_start), 'yyyy-MM-dd') : '',
          'End Date': record.date_end ? format(new Date(record.date_end), 'yyyy-MM-dd') : '',
          'Status': new Date(record.date_end) >= new Date() ? 'Active' : 'Expired',
          'From Company': record.from_company || '',
          'Contact Number': record.contact_number || ''
        };
      });

      // Create a workbook with multiple sheets
      const workbook = XLSX.utils.book_new();
      
      // Main data sheet with the formatted data
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Internships");
      
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
      let fileName = `internship-report_${new Date().toISOString().split('T')[0]}`;
      
      // Add filter info to filename
      if (filters.startDate && filters.endDate) {
        fileName += `_${format(filters.startDate, 'yyyy-MM-dd')}_to_${format(filters.endDate, 'yyyy-MM-dd')}`;
      }
      
      if (filters.department !== 'all') {
        const deptName = departments.find(d => d.id === parseInt(filters.department))?.name || filters.department;
        fileName += `_dept-${deptName}`;
      }
      
      if (filters.status !== 'all') {
        fileName += `_${filters.status}`;
      }
      
      fileName += '.xlsx';
      
      // Write the file
      XLSX.writeFile(workbook, fileName);
      
      // Log the export activity
      if (apiService.activityLog && typeof apiService.activityLog.logActivity === 'function') {
        await apiService.activityLog.logActivity({
          userId: user.id,
          description: `Exported internship report with filters: ${JSON.stringify(filters)}`,
          type: 'export'
        });
      }
      
    } catch (error) {
      console.error('Error exporting to Excel:', error)
    } finally {
      setExportLoading(false);
    }
  }

  const renderInternshipStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
          <CardTitle className="text-sm font-medium">Total Internships</CardTitle>
          <Users className="h-4 w-4 text-[#0A2647]" />
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{stats.totalInternships}</div>
          <p className="text-xs text-muted-foreground mt-2">
            Total internships processed
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
          <CardTitle className="text-sm font-medium">Active</CardTitle>
          <Clock className="h-4 w-4 text-[#0A2647]" />
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{stats.activeInternships}</div>
          <p className="text-xs text-muted-foreground mt-2">
            Currently active internships
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
          <CardTitle className="text-sm font-medium">Expired</CardTitle>
          <AlertCircle className="h-4 w-4 text-[#0A2647]" />
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{stats.expiredInternships}</div>
          <p className="text-xs text-muted-foreground mt-2">
            Completed internships
          </p>
        </CardContent>
      </Card>
    </div>
  )

  const renderPieChart = () => (
    <Card className="col-span-1 md:col-span-2 border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
      <CardHeader className="bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
        <CardTitle className="flex items-center text-lg font-medium">
          <BarChart2 className="w-4 h-4 mr-2 text-[#0A2647]" />
          Monthly Trend
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={monthlyData}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
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
              <Area type="monotone" dataKey="active" stackId="1" stroke="#0A2647" fill="#0A2647" name="Active" />
              <Area type="monotone" dataKey="expired" stackId="1" stroke="#144272" fill="#144272" name="Expired" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )

  const renderStatusDistributionChart = () => (
    <Card className="col-span-1 md:col-span-1 border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
      <CardHeader className="bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
        <CardTitle className="flex items-center text-lg font-medium">
          <PieChartIcon className="w-4 h-4 mr-2 text-[#0A2647]" />
          Internship Status Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={100}
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
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
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
                  Total Internships
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Expired
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Active Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
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
                      {month.active}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {month.expired}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mr-2">
                          <div 
                            className="bg-[#0A2647] h-2.5 rounded-full" 
                            style={{ width: `${month.activeRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-300">
                          {month.activeRate}%
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
              Internship Report
            </h1>
            <Button
              onClick={exportToExcel}
              disabled={exportLoading}
              className="bg-[#0A2647]/90 text-white flex items-center space-x-2"
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
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={() => {
                      setFilters({
                        dateRange: 'all',
                        startDate: null,
                        endDate: null,
                        department: 'all',
                        status: 'all'
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
          {renderInternshipStats()}

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {renderStatusDistributionChart()}
            {renderDepartmentDistribution()}
          </div>

          {/* Monthly Trend */}
          {renderPieChart()}
          
          {/* Monthly Breakdown */}
          {renderMonthlyBreakdown()}
        </div>
      </div>
    </div>
  )
}

export default InternshipReport