import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { 
  Search, 
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
  PieChart as PieChartIcon
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
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts'
import * as XLSX from 'xlsx'

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
    roleType: 'all',
    citizenship: 'all'
  })

  // States for data
  const [loading, setLoading] = useState(true)
  const [departments, setDepartments] = useState([])
  const [roles, setRoles] = useState([])
  const [citizenships, setCitizenships] = useState([])
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
  const [monthlyData, setMonthlyData] = useState([])
  const [departmentDistribution, setDepartmentDistribution] = useState([])

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
          fetchDepartmentsAndRoles(),
          fetchCitizenships()
        ])
      } catch (error) {
        console.error('Error initializing page:', error)
      } finally {
        setPageLoading(false)
      }
    }

    initializePage()
  }, [initialized, filters])

  const fetchCitizenships = async () => {
    try {
      const citizenshipData = await apiService.backgroundChecks.getCitizenships();
      
      if (citizenshipData.error) {
        throw new Error(citizenshipData.error);
      }
      
      setCitizenships(citizenshipData || []);
    } catch (error) {
      console.error('Error fetching citizenships:', error)
    }
  }

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
      // Get all background checks
      const backgroundChecks = await apiService.backgroundChecks.getAllBackgroundChecks();
      
      if (backgroundChecks.error) {
        throw new Error(backgroundChecks.error);
      }
      
      // Apply filters
      let filteredData = backgroundChecks;
      
      // Apply date range filter
      if (filters.startDate) {
        filteredData = filteredData.filter(item => 
          new Date(item.submitted_date) >= filters.startDate
        );
      }
      
      if (filters.endDate) {
        filteredData = filteredData.filter(item => 
          new Date(item.submitted_date) <= filters.endDate
        );
      }
      
      // Apply department filter
      if (filters.department !== 'all') {
        filteredData = filteredData.filter(item => 
          item.department_id === parseInt(filters.department)
        );
      }
      
      // Apply citizenship filter
      if (filters.citizenship !== 'all') {
        filteredData = filteredData.filter(item => 
          item.citizenship === filters.citizenship
        );
      }
      
      // Separate internship and non-internship data
      const internshipData = filteredData.filter(item => item.role_type === 'Internship');
      const nonInternshipData = filteredData.filter(item => item.role_type !== 'Internship');
      
      if (filters.roleType === 'Internship') {
        processInternshipData(internshipData);
      } else {
        // If 'all' is selected, only show non-internship data
        // If specific role type is selected, filter accordingly
        const roleFilteredData = filters.roleType === 'all' 
          ? nonInternshipData
          : nonInternshipData.filter(item => item.role_type === filters.roleType);
        
        processBackgroundCheckData(roleFilteredData);
      }
      
      setRawData(filteredData);
      
      // Process monthly data
      processMonthlyData(filteredData);
      
      // Process department distribution
      processDepartmentDistribution(filteredData);
      
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
      const deptName = dept ? dept.name : 'Unknown';
      
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
        percentage: ((dept.value / data.length) * 100).toFixed(1)
      }))
      .sort((a, b) => b.value - a.value);
    
    setDepartmentDistribution(deptArray);
  }

  const exportToExcel = async () => {
    try {
      // Use raw data for export
      const exportData = rawData.map(record => {
        // Find department name from departments list
        const department = departments.find(dept => dept.id === record.department_id);
        
        return {
          'Department': department ? department.name : record.department_name || 'Unknown',
          'Role Type': record.role_type || 'Unknown',
          'Full Name': record.full_names,
          'Status': record.status,
          'Citizenship': record.citizenship,
          'Date Submitted': record.submitted_date ? new Date(record.submitted_date).toLocaleDateString() : 'N/A',
          'Company': record.from_company || 'N/A',
          'Working With': record.work_with || 'N/A',
          'Start Date': record.date_start ? new Date(record.date_start).toLocaleDateString() : 'N/A',
          'End Date': record.date_end ? new Date(record.date_end).toLocaleDateString() : 'N/A'
        };
      });

      // Create a workbook with multiple sheets
      const workbook = XLSX.utils.book_new();
      
      // Main data sheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Background Checks");
      
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
      
      // Write the file
      XLSX.writeFile(workbook, `background-checks-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error)
    }
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
              className="bg-[#0A2647] hover:bg-[#0A2647]/90 text-white flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
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
  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Citizenship
                    </label>
                    <select
                      value={filters.citizenship}
                      onChange={(e) => setFilters(prev => ({ ...prev, citizenship: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="all">All Citizenships</option>
                      {citizenships.map((citizenship, index) => (
                        <option key={index} value={citizenship}>
                          {citizenship}
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
                        roleType: 'all',
                        citizenship: 'all'
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
  
            {/* Raw Data Table */}
            <Card className="mt-6 border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
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
                          Full Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Role Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Citizenship
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {loading ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-4 text-center">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0A2647]" />
                          </td>
                        </tr>
                      ) : rawData.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                            No records found
                          </td>
                        </tr>
                      ) : (
                        rawData.slice(0, 10).map((record, index) => {
                          // Find department name from departments list
                          const department = departments.find(dept => dept.id === record.department_id);
                          
                          return (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                {record.full_names}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                {department ? department.name : record.department_name || 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                {record.role_type}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                  ${record.role_type === 'Internship'
                                    ? (new Date(record.date_end) >= new Date()
                                      ? 'bg-[#0A2647]/10 text-[#0A2647] dark:bg-[#0A2647]/30 dark:text-[#0A2647]'
                                      : 'bg-[#144272]/10 text-[#144272] dark:bg-[#144272]/30 dark:text-[#144272]')
                                    : (record.status === 'Pending'
                                      ? 'bg-[#0A2647]/10 text-[#0A2647] dark:bg-[#0A2647]/30 dark:text-[#0A2647]'
                                      : 'bg-[#144272]/10 text-[#144272] dark:bg-[#144272]/30 dark:text-[#144272]')
                                  }`}>
                                  {record.role_type === 'Internship'
                                    ? (new Date(record.date_end) >= new Date() ? 'Active' : 'Expired')
                                    : record.status
                                  }
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                {record.citizenship}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                {record.role_type === 'Internship'
                                  ? `${new Date(record.date_start).toLocaleDateString()} - ${new Date(record.date_end).toLocaleDateString()}`
                                  : record.submitted_date
                                    ? new Date(record.submitted_date).toLocaleDateString()
                                    : 'N/A'
                                }
                              </td>
                            </tr>
                          );
                        })
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
          </div>
        </div>
      </div>
    )
  }
  
  export default BackgroundCheckReport

