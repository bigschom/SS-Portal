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
import { motion, AnimatePresence } from 'framer-motion'

// Toast Notification Component
const Toast = ({ message, type = 'error', onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 50 }}
    className={`fixed bottom-4 right-4 z-50 flex items-center p-4 rounded-lg shadow-lg ${
      type === 'success' ? 'bg-[#0A2647]' : 
      type === 'error' ? 'bg-red-500' : 
      type === 'warning' ? 'bg-[#0A2647]' : 'bg-[#0A2647]'
    }`}
  >
    <div className="flex items-center">
      <div className="mr-3">
        {type === 'success' ? (
          <div className="w-5 h-5 text-white">✓</div>
        ) : (
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        )}
      </div>
      <div className="text-white font-medium mr-6">
        {message}
      </div>
      <button
        onClick={onClose}
        className="ml-auto bg-transparent text-white rounded-lg p-1.5 hover:bg-white/20"
      >
        <span className="sr-only">Close</span>
        <Clock className="w-4 h-4" />
      </button>
    </div>
  </motion.div>
);

// Constants
const COLORS = ['#0A2647', '#144272', '#205295', '#2C74B3', '#427D9D']

const InternshipReport = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  // Loading states
  const [pageLoading, setPageLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [toast, setToast] = useState(null)

  // Filter and data states
  const [filters, setFilters] = useState({
    dateRange: 'all',
    startDate: null,
    endDate: null,
    department: 'all',
    status: 'all'
  })

  // Data states
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

  // Initialize component
  useEffect(() => {
    setInitialized(true)
  }, [user])

  // Show toast notification
  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

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
        showToast('Failed to load internship data');
      } finally {
        setPageLoading(false)
      }
    }

    initializePage()
  }, [initialized, filters])

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      // Get departments from constants via service
      const deptData = apiService.internships.getDepartments();
      setDepartments(deptData || []);
    } catch (error) {
      console.error('Error fetching departments:', error)
      showToast('Failed to load departments');
    }
  }

  // Fetch and process internship data
  const fetchData = async () => {
    setLoading(true)
    try {
      // Prepare API filters
      const apiFilters = {
        status: filters.status !== 'all' ? filters.status : null
      };
      
      // Add debug logging
      console.log('Current filters:', filters);
      
      // Validate and format dates properly
      if (filters.startDate && filters.startDate instanceof Date && !isNaN(filters.startDate.getTime())) {
        const formattedStartDate = format(filters.startDate, 'yyyy-MM-dd');
        apiFilters.startDate = formattedStartDate;
        console.log('Using start date:', formattedStartDate);
      } else if (filters.startDate) {
        console.error('Invalid start date:', filters.startDate);
      }
      
      if (filters.endDate && filters.endDate instanceof Date && !isNaN(filters.endDate.getTime())) {
        const formattedEndDate = format(filters.endDate, 'yyyy-MM-dd');
        apiFilters.endDate = formattedEndDate;
        console.log('Using end date:', formattedEndDate);
      } else if (filters.endDate) {
        console.error('Invalid end date:', filters.endDate);
      }
      
      if (filters.department !== 'all') {
        apiFilters.department = filters.department;
      }
      
      console.log('API filters being sent:', apiFilters);
      
      // Get internships with filters
      const internships = await apiService.internships.getAllInternships(apiFilters);
      
      if (internships.error) {
        throw new Error(internships.error);
      }
      
      // Store raw and filtered data
      setRawData(internships);
      setFilteredData(internships);
      
      // Process the data for reports
      processInternshipData(internships);
      processMonthlyData(internships);
      processDepartmentDistribution(internships);
      processMonthlyBreakdown(internships);
      
    } catch (error) {
      console.error('Error fetching data:', error)
      showToast('Failed to load internship data');
    } finally {
      setLoading(false)
    }
  }

  // Process internship statistics
  const processInternshipData = (data) => {
    const currentDate = new Date();
    const totalInternships = data.length;
    const activeInternships = data.filter(item => new Date(item.date_end) >= currentDate).length;
    const expiredInternships = data.filter(item => new Date(item.date_end) < currentDate).length;

    setStats({
      totalInternships,
      activeInternships,
      expiredInternships
    });

    const statusData = [
      { name: 'Active', value: activeInternships, percentage: totalInternships ? ((activeInternships/totalInternships) * 100).toFixed(1) : 0 },
      { name: 'Expired', value: expiredInternships, percentage: totalInternships ? ((expiredInternships/totalInternships) * 100).toFixed(1) : 0 }
    ];
    
    setStatusDistribution(statusData);
  }

  // Process monthly data
  const processMonthlyData = (data) => {
    // Group data by month
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
      
      // Determine status based on end date
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
      const deptName = item.department_name || 'Unknown';
      
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
      
      // Determine status based on end date
      const currentDate = new Date();
      const endDate = new Date(item.date_end);
      
      if (endDate >= currentDate) {
        acc[monthYear].active += 1;
      } else {
        acc[monthYear].expired += 1;
      }
      
      return acc;
    }, {});
    
    // Convert to array and calculate completion rate
    const result = Object.values(monthlyData).map(month => ({
      ...month,
      completionRate: month.total > 0 ? ((month.active / month.total) * 100).toFixed(1) : '0'
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

  // Handle filter change
  const handleFilterChange = (field, value) => {
    let updatedFilters = { ...filters };
    
    if (field === 'dateRange') {
      updatedFilters.dateRange = value;
      
      // Set date range based on selection
      if (value === 'all') {
        updatedFilters.startDate = null;
        updatedFilters.endDate = null;
      } else if (value === 'last30') {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        updatedFilters.startDate = startDate;
        updatedFilters.endDate = endDate;
      } else if (value === 'last90') {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
        updatedFilters.startDate = startDate;
        updatedFilters.endDate = endDate;
      } else if (value === 'thisYear') {
        const endDate = new Date();
        const startDate = new Date(new Date().getFullYear(), 0, 1);
        updatedFilters.startDate = startDate;
        updatedFilters.endDate = endDate;
      } else if (value === 'lastYear') {
        const startDate = new Date(new Date().getFullYear() - 1, 0, 1);
        const endDate = new Date(new Date().getFullYear() - 1, 11, 31);
        updatedFilters.startDate = startDate;
        updatedFilters.endDate = endDate;
      }
      // For custom, we leave the dates as they are
    } else {
      // Normal filter update
      updatedFilters[field] = value;
      
      // If updating custom dates, change dateRange to custom
      if (field === 'startDate' || field === 'endDate') {
        updatedFilters.dateRange = 'custom';
      }
    }
    
    setFilters(updatedFilters);
  };

  // Export to Excel functionality
  const exportToExcel = async () => {
    try {
      setExportLoading(true);
      
      // Format the data for export
      const exportData = filteredData.map((record, index) => {
        // Determine status based on end date
        const currentDate = new Date();
        const endDate = new Date(record.date_end);
        const status = endDate >= currentDate ? 'Active' : 'Expired';
        
        return {
          'No.': index + 1,
          'Full Name': record.full_names,
          'Department': record.department_name || 'Unknown',
          'Citizenship': record.citizenship,
          'ID/Passport': record.id_passport_number,
          'Start Date': record.date_start ? format(new Date(record.date_start), 'yyyy-MM-dd') : 'N/A',
          'End Date': record.date_end ? format(new Date(record.date_end), 'yyyy-MM-dd') : 'N/A',
          'Supervisor': record.work_with || 'N/A',
          'Contact Number': record.contact_number || 'N/A',
          'Status': status,
          'Created By': record.created_by || 'N/A'
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
        fileName += `_status-${filters.status}`;
      }
      
      fileName += '.xlsx';
      
      // Write the file
      XLSX.writeFile(workbook, fileName);
      
      // Show success toast
      showToast('Report exported successfully', 'success');
      
      // Log the export activity if available
      if (apiService.activityLog && typeof apiService.activityLog.logActivity === 'function') {
        await apiService.activityLog.logActivity({
          userId: user.id,
          description: `Exported internship report with filters: ${JSON.stringify(filters)}`,
          type: 'export'
        });
      }
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      showToast('Failed to export report');
    } finally {
      setExportLoading(false);
    }
  };

  // Render internship statistics cards
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
            Total internships registered
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
          <BadgeCheck className="h-4 w-4 text-[#0A2647]" />
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
          {data.length > 0 ? (
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
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">No data available</p>
            </div>
          )}
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
          {departmentDistribution.length > 0 ? (
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
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">No data available</p>
            </div>
          )}
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
          {monthlyData.length > 0 ? (
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
                <Bar dataKey="active" name="Active" fill="#0A2647" />
                <Bar dataKey="expired" name="Expired" fill="#144272" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">No data available</p>
            </div>
          )}
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
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
      
      <div className="flex-1 flex justify-center">
        <div className="w-full max-w-[80%] px-4 pb-8">
          <div className="flex justify-between items-center pt-2 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Internship Analysis
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
                    onChange={(e) => handleFilterChange('dateRange', e.target.value)}
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
                        onChange={(date) => handleFilterChange('startDate', date)}
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
                        onChange={(date) => handleFilterChange('endDate', date)}
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
                    onChange={(e) => handleFilterChange('department', e.target.value)}
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
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Expired">Expired</option>
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
            {renderPieChart(statusDistribution, 'Internship Status Distribution')}
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

export default InternshipReport