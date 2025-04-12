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
  BadgeCheck,
  AlertCircle,
  BarChart2,
  PieChart as PieChartIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../../components/ui/card'
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
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

const COLORS = ['#0A2647', '#144272', '#205295', '#2C74B3', '#427D9D']

const BackgroundCheckReport = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [pageLoading, setPageLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  const [filters, setFilters] = useState({
    dateRange: 'all',
    startDate: null,
    endDate: null,
    department: 'all',
    roleType: 'all'
  })

  // States for data
  const [loading, setLoading] = useState(true)
  const [departments, setDepartments] = useState([])
  const [roles, setRoles] = useState([])
  const [stats, setStats] = useState({
    totalChecks: 0,
    pendingChecks: 0,
    closedChecks: 0,
    totalInternships: 0,
    activeInternships: 0,
    expiredInternships: 0
  })
  const [statusDistribution, setStatusDistribution] = useState([])
  const [internshipStatusDistribution, setInternshipStatusDistribution] = useState([])
  const [rawData, setRawData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [departmentDistribution, setDepartmentDistribution] = useState([])
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [displayedRecords, setDisplayedRecords] = useState([])
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

  // Effect for pagination
  useEffect(() => {
    if (filteredData.length === 0) {
      setDisplayedRecords([]);
      setTotalPages(1);
      return;
    }
    
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    setTotalPages(totalPages);
    
    // Adjust current page if it's now out of bounds
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
    setDisplayedRecords(filteredData.slice(startIndex, endIndex));
  }, [filteredData, currentPage, itemsPerPage]);

  const fetchDepartmentsAndRoles = async () => {
    try {
      // Get departments from constants
      const deptData = apiService.backgroundChecks.getDepartments();
      setDepartments(deptData || []);
      
      // Get role types from constants
      const roleTypes = apiService.backgroundChecks.getRoleTypes();
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

  const fetchData = async () => {
    setLoading(true)
    try {
      // Prepare API filters
      const apiFilters = {};
      
      if (filters.startDate) {
        apiFilters.startDate = format(filters.startDate, 'yyyy-MM-dd');
      }
      
      if (filters.endDate) {
        apiFilters.endDate = format(filters.endDate, 'yyyy-MM-dd');
      }
      
      if (filters.department !== 'all') {
        apiFilters.department_id = filters.department;
      }
      
      if (filters.roleType !== 'all') {
        apiFilters.role_type = filters.roleType;
      }
      
      
      // Get background checks directly with server-side filtering
      const backgroundChecks = await apiService.backgroundChecks.getAllBackgroundChecks(apiFilters);
      
      if (backgroundChecks.error) {
        throw new Error(backgroundChecks.error);
      }
      
      setRawData(backgroundChecks);
      setFilteredData(backgroundChecks);
      setCurrentPage(1); // Reset to first page when data changes
      
      // Separate internship and non-internship data
      const internshipData = backgroundChecks.filter(item => item.role_type === 'Internship');
      const nonInternshipData = backgroundChecks.filter(item => item.role_type !== 'Internship');
      
      if (filters.roleType === 'Internship') {
        processInternshipData(internshipData);
      } else {
        processBackgroundCheckData(nonInternshipData);
      }
      
      // Process monthly data
      processMonthlyData(backgroundChecks);
      
      // Process department distribution
      processDepartmentDistribution(backgroundChecks);
      
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const processInternshipData = (data) => {
    const currentDate = new Date()
    const totalInternships = data.length
    const activeInternships = data.filter(intern => new Date(intern.date_end) >= currentDate).length
    const expiredInternships = totalInternships - activeInternships

    setStats(prev => ({
      ...prev,
      totalInternships,
      activeInternships,
      expiredInternships
    }))

    const statusData = [
      { name: 'Active', value: activeInternships, percentage: totalInternships ? ((activeInternships/totalInternships) * 100).toFixed(1) : 0 },
      { name: 'Expired', value: expiredInternships, percentage: totalInternships ? ((expiredInternships/totalInternships) * 100).toFixed(1) : 0 }
    ]
    setInternshipStatusDistribution(statusData)
  }
  
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
          closed: 0,
          active: 0,
          expired: 0
        };
      }
      
      acc[monthYear].total += 1;
      
      if (item.role_type === 'Internship') {
        const currentDate = new Date();
        const endDate = new Date(item.date_end);
        if (endDate >= currentDate) {
          acc[monthYear].active += 1;
        } else {
          acc[monthYear].expired += 1;
        }
      } else {
        if (item.status === 'Pending') {
          acc[monthYear].pending += 1;
        } else if (item.status === 'Closed') {
          acc[monthYear].closed += 1;
        }
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
      
      // Include additional sheets with stats
      // Status distribution sheet
      const statusData = filters.roleType === 'Internship' 
        ? internshipStatusDistribution 
        : statusDistribution;
      const statusWorksheet = XLSX.utils.json_to_sheet(statusData);
      XLSX.utils.book_append_sheet(workbook, statusWorksheet, "Status Distribution");
      
      // Department distribution sheet
      const deptWorksheet = XLSX.utils.json_to_sheet(departmentDistribution);
      XLSX.utils.book_append_sheet(workbook, deptWorksheet, "Department Distribution");
      
      // Monthly data sheet
      const monthlyWorksheet = XLSX.utils.json_to_sheet(monthlyData);
      XLSX.utils.book_append_sheet(workbook, monthlyWorksheet, "Monthly Data");
      
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
      
      if (filters.roleType !== 'all') {
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

  // Pagination handlers
  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1); // Reset to first page when changing items per page
  }
  
  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  }

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
            {filters.roleType === 'Internship' ? (
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
                <Area type="monotone" dataKey="active" stackId="1" stroke="#0A2647" fill="#0A2647" />
                <Area type="monotone" dataKey="expired" stackId="1" stroke="#144272" fill="#144272" />
              </AreaChart>
            ) : (
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
            )}
          </ResponsiveContainer>
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
              Background Check Analysis
            </h1>
            <Button
              onClick={exportToExcel}
              disabled={exportLoading}
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
                      value={filters.roleType}
                      onChange={(e) => setFilters(prev => ({ ...prev, roleType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="all">All Roles</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.name}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
  
                </div>
                
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={() => {
                      setFilters({
                        dateRange: 'all',
                        startDate: null,
                        endDate: null,
                        department: 'all',
                        roleType: 'all'
                      });
                    }}
                    variant="outline"
                    className="flex items-center space-x-2 mr-2"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    <span>Reset Filters</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
  
            {/* Stats Cards */}
            {filters.roleType === 'Internship' ? renderInternshipStats() : renderBackgroundCheckStats()}
  
            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {filters.roleType === 'Internship' 
                ? renderPieChart(internshipStatusDistribution, 'Internship Status Distribution')
                : renderPieChart(statusDistribution, 'Background Check Status Distribution')
              }
              {renderDepartmentDistribution()}
            </div>
  
            {/* Monthly Trend */}
            {renderMonthlyTrend()}
  
            {/* Raw Data Table with Pagination */}
            <Card className="mt-6 border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
              <CardHeader className="bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
                <CardTitle className="flex items-center text-lg font-medium">
                  Raw Data
                </CardTitle>
                <CardDescription>
                  {filteredData.length} records found
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[5%]">
                          No.
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Full Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Submitted Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Feedback Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {loading ? (
                        <tr>
                          <td colSpan="8" className="px-6 py-4 text-center">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0A2647]" />
                          </td>
                        </tr>
                      ) : displayedRecords.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                            No records found
                          </td>
                        </tr>
                      ) : (
                        displayedRecords.map((record, index) => {
                          // Calculate the actual index across all pages
                          const actualIndex = (currentPage - 1) * itemsPerPage + index + 1;
                          
                          // Find department name from departments list if department_id is available
                          const department = record.department_id ? 
                            departments.find(dept => dept.id === record.department_id) : null;
                          
                          // Determine the feedback date - only show when status is 'Closed'
                          const feedbackDate = record.status === 'Closed' ? 
                            (record.updated_at ? format(new Date(record.updated_at), 'MMM d, yyyy') : 'N/A') : 
                            '';
                            
                          return (
                            <tr key={record.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                {actualIndex}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                {record.full_names}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                {department ? department.name : record.department_name || 'Unknown'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                {record.role || 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                {record.role_type}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-gray-800 dark:text-gray-200">
                              {record.status}
                            </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                {record.submitted_date ? format(new Date(record.submitted_date), 'MMM d, yyyy') : 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                {feedbackDate}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              
              {/* Pagination Footer */}
              <CardFooter className="bg-gray-50 dark:bg-gray-700 py-4 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Rows per page:
                    </span>
                    <select
                      value={itemsPerPage}
                      onChange={handleItemsPerPageChange}
                      className="border border-gray-200 rounded px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    >
                      {[5, 10, 20, 50, 100].map(value => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-sm text-gray-700 dark:text-gray-300 mr-4">
                      {filteredData.length === 0 ? '0 of 0' : 
                        `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, filteredData.length)} of ${filteredData.length}`}
                    </span>
                    
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(1)}
                        disabled={currentPage === 1 || filteredData.length === 0}
                        className="h-8 w-8 p-0 flex items-center justify-center border-gray-200 dark:border-gray-600"
                      >
                        <span className="sr-only">First page</span>
                        <ChevronLeft className="h-4 w-4" />
                        <ChevronLeft className="h-4 w-4 -ml-2" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1 || filteredData.length === 0}
                        className="h-8 w-8 p-0 flex items-center justify-center border-gray-200 dark:border-gray-600"
                      >
                        <span className="sr-only">Previous page</span>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      {/* Page number buttons */}
                      <div className="flex space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          // Display pages adjacent to the current page
                          let pageToShow;
                          
                          if (totalPages <= 5) {
                            // If we have 5 or fewer pages, show all
                            pageToShow = i + 1;
                          } else if (currentPage <= 3) {
                            // If near the start, show the first 5 pages
                            pageToShow = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            // If near the end, show the last 5 pages
                            pageToShow = totalPages - 4 + i;
                          } else {
                            // Otherwise show 2 pages before and 2 after current page
                            pageToShow = currentPage - 2 + i;
                          }
                          
                          // Only render if pageToShow is a valid page number
                          if (pageToShow > 0 && pageToShow <= totalPages) {
                            return (
                              <Button
                                key={pageToShow}
                                variant={currentPage === pageToShow ? "default" : "outline"}
                                size="sm"
                                onClick={() => goToPage(pageToShow)}
                                className={`h-8 w-8 p-0 flex items-center justify-center ${
                                  currentPage === pageToShow ? 
                                    'bg-[#0A2647] text-white dark:bg-white dark:text-[#0A2647]' : 
                                    'border-gray-200 dark:border-gray-600'
                                }`}
                              >
                                {pageToShow}
                              </Button>
                            );
                          }
                          return null;
                        })}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages || filteredData.length === 0}
                        className="h-8 w-8 p-0 flex items-center justify-center border-gray-200 dark:border-gray-600"
                      >
                        <span className="sr-only">Next page</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage === totalPages || filteredData.length === 0}
                        className="h-8 w-8 p-0 flex items-center justify-center border-gray-200 dark:border-gray-600"
                      >
                        <span className="sr-only">Last page</span>
                        <ChevronRight className="h-4 w-4" />
                        <ChevronRight className="h-4 w-4 -ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    )
  }
  
  export default BackgroundCheckReport