import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Calendar,
  ShieldCheck,
  AlertTriangle,
  UserCircle,
  FileSpreadsheet
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { useAuth } from '../../hooks/useAuth';
import apiService from '../../config/api-service'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

const COLORS = ['#0A2647', '#144272', '#205295', '#2C74B3', '#427D9D', '#6096B4']

const GuardShiftReport1 = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [pageLoading, setPageLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // Helper function to get month dates
  const getMonthDates = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    };
  };

  // States
  const [filters, setFilters] = useState({
    dateRange: 'thisMonth',
    startDate: getMonthDates().startDate,
    endDate: getMonthDates().endDate,
    location: '',
    shiftType: '',
    hasIncident: ''
  })
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalReports: 0,
    incidentReports: 0,
    normalReports: 0,
    issuesReports: 0
  })
  const [securityTeamByMonth, setSecurityTeamByMonth] = useState([])
  const [monthlyBreakdown, setMonthlyBreakdown] = useState([])
  const [guardPerformanceData, setGuardPerformanceData] = useState([])
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
        await fetchData();
      } catch (error) {
        console.error('Error initializing page:', error);
      } finally {
        setPageLoading(false);
      }
    };
  
    initializePage();
  }, [
    initialized,
    filters.dateRange,
    filters.startDate, 
    filters.endDate,
    filters.location,
    filters.shiftType,
    filters.hasIncident
  ]);

  // Main data fetching function
  const fetchData = async () => {
    setLoading(true);
    try {
      // Format the filter parameters according to your API expectation
      const apiFilters = {
        // Make sure these match the exact parameter names expected by your API
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        shiftType: filters.shiftType || undefined,
        hasIncident: filters.hasIncident !== '' ? (filters.hasIncident === 'true') : undefined,
        location: filters.location || undefined,
        limit: 1000
      };
      
      // Remove any undefined values
      const cleanFilters = Object.fromEntries(
        Object.entries(apiFilters).filter(([_, v]) => v !== undefined)
      );
      
      console.log('Sending filters to API:', cleanFilters);
      
      // Call the API service with the clean filters
      const response = await apiService.guardShifts.getGuardShiftReports(cleanFilters);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Process the data for various analytics
      if (response.data && response.data.length > 0) {
        const reports = response.data;
        
        calculateStats(reports);
        processSecurityTeamByMonth(reports);
        processGuardPerformanceData(reports);
        processMonthlyBreakdown(reports);
      } else {
        // Set empty data when no results are returned
        setStats({
          totalReports: 0,
          incidentReports: 0,
          normalReports: 0,
          issuesReports: 0
        });
        setSecurityTeamByMonth([]);
        setGuardPerformanceData([]);
        setMonthlyBreakdown([]);
      }
    } catch (error) {
      console.error('Error fetching guard shift data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate basic stats
  const calculateStats = (reports) => {
    const totalReports = reports.length;
    const incidentReports = reports.filter(r => r.has_incident).length;
    
    // Calculate reports with issues
    const issuesReports = reports.filter(r => {
      // Check for utility issues
      const hasUtilityIssues = 
        r.electricity_status === 'issues' ||
        r.water_status === 'issues' ||
        r.office_status === 'issues' ||
        r.parking_status === 'issues';
      
      // Check for CCTV issues
      const hasCctvIssues = 
        r.cctv_status === 'partial-issue' ||
        r.cctv_status === 'not-working';
      
      return hasUtilityIssues || hasCctvIssues;
    }).length;
    
    const normalReports = totalReports - incidentReports - issuesReports;
    
    setStats({
      totalReports,
      incidentReports,
      normalReports,
      issuesReports
    });
  }

  // Process security team data by month
  const processSecurityTeamByMonth = (reports) => {
    // Group reports by month and count security team members
    const monthlyData = reports.reduce((acc, report) => {
      const date = new Date(report.created_at);
      const monthYear = format(date, 'MMM yyyy');
      
      if (!acc[monthYear]) {
        acc[monthYear] = {
          month: monthYear,
          teamMembers: {},
          totalPersonnel: 0
        };
      }
      
      // Process team members from the report
      if (report.team_members && Array.isArray(report.team_members)) {
        report.team_members.forEach(member => {
          if (member && member.name) {
            const memberKey = `${member.name}-${member.id || 'unknown'}`;
            if (!acc[monthYear].teamMembers[memberKey]) {
              acc[monthYear].teamMembers[memberKey] = {
                name: member.name,
                id: member.id || 'unknown',
                shifts: 0
              };
              // Count unique team members
              acc[monthYear].totalPersonnel++;
            }
            // Count shifts for this team member
            acc[monthYear].teamMembers[memberKey].shifts++;
          }
        });
      }
      
      return acc;
    }, {});
    
    // Convert to array and format for display
    const resultArray = Object.entries(monthlyData).map(([month, data]) => {
      // Convert team members object to array and sort by shifts
      const teamMembersList = Object.values(data.teamMembers)
        .sort((a, b) => b.shifts - a.shifts);
      
      return {
        month,
        totalPersonnel: data.totalPersonnel,
        teamMembers: teamMembersList,
        // Pick top team members for display in chart
        topMembers: teamMembersList.slice(0, 10).map(member => ({
          name: member.name,
          shifts: member.shifts
        }))
      };
    }).sort((a, b) => {
      // Sort by date (most recent months first)
      const [aMonth, aYear] = a.month.split(' ');
      const [bMonth, bYear] = b.month.split(' ');
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const aMonthIndex = monthNames.indexOf(aMonth);
      const bMonthIndex = monthNames.indexOf(bMonth);
      
      if (aYear !== bYear) {
        return parseInt(bYear) - parseInt(aYear); // Most recent year first
      }
      
      return bMonthIndex - aMonthIndex; // Most recent month first
    });
    
    setSecurityTeamByMonth(resultArray);
  };

  // Process guard performance data
  const processGuardPerformanceData = (reports) => {
    // Group by guard and calculate metrics
    const guardPerformance = reports.reduce((acc, report) => {
      const guardName = report.guard_name || report.submitted_by;
      
      if (!guardName) return acc;
      
      if (!acc[guardName]) {
        acc[guardName] = {
          name: guardName,
          reports: 0,
          incidents: 0,
          issues: 0
        };
      }
      
      acc[guardName].reports += 1;
      
      if (report.has_incident) {
        acc[guardName].incidents += 1;
      }
      
      // Check for utility or CCTV issues
      const hasUtilityIssues = 
        report.electricity_status === 'issues' ||
        report.water_status === 'issues' ||
        report.office_status === 'issues' ||
        report.parking_status === 'issues';
      
      const hasCctvIssues = 
        report.cctv_status === 'partial-issue' ||
        report.cctv_status === 'not-working';
      
      if (hasUtilityIssues || hasCctvIssues) {
        acc[guardName].issues += 1;
      }
      
      return acc;
    }, {});
    
    // Calculate performance score
    const guardsArray = Object.values(guardPerformance)
      .map(guard => {
        const incidentRate = guard.reports > 0 ? guard.incidents / guard.reports : 0;
        const issueRate = guard.reports > 0 ? guard.issues / guard.reports : 0;
        
        return {
          ...guard,
          incidentRate: (incidentRate * 100).toFixed(1),
          issueRate: (issueRate * 100).toFixed(1),
          // Performance score - higher is better
          score: 100 - ((incidentRate + issueRate) * 50).toFixed(1)
        };
      })
      .sort((a, b) => b.score - a.score) // Sort by score (highest first)
      .slice(0, 10); // Top 10 guards
    
    setGuardPerformanceData(guardsArray);
  };

  // Process monthly breakdown
  const processMonthlyBreakdown = (reports) => {
    // Group by month
    const monthlyData = reports.reduce((acc, report) => {
      const date = new Date(report.created_at);
      const monthYear = format(date, 'MMM yyyy');
      
      if (!acc[monthYear]) {
        acc[monthYear] = {
          month: monthYear,
          total: 0,
          incidents: 0,
          issues: 0,
          normal: 0,
          personnel: new Set() // Track unique security personnel
        };
      }
      
      acc[monthYear].total += 1;
      
      // Count unique security personnel
      if (report.team_members && Array.isArray(report.team_members)) {
        report.team_members.forEach(member => {
          if (member && member.name) {
            acc[monthYear].personnel.add(`${member.name}-${member.id || 'unknown'}`);
          }
        });
      }
      
      if (report.has_incident) {
        acc[monthYear].incidents += 1;
      }
      
      // Check for utility or CCTV issues
      const hasUtilityIssues = 
        report.electricity_status === 'issues' ||
        report.water_status === 'issues' ||
        report.office_status === 'issues' ||
        report.parking_status === 'issues';
      
      const hasCctvIssues = 
        report.cctv_status === 'partial-issue' ||
        report.cctv_status === 'not-working';
      
      if (hasUtilityIssues || hasCctvIssues) {
        acc[monthYear].issues += 1;
      } else if (!report.has_incident) {
        acc[monthYear].normal += 1;
      }
      
      return acc;
    }, {});
    
    // Convert to array and calculate performance rate
    const monthlyArray = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        total: data.total,
        incidents: data.incidents,
        issues: data.issues,
        normal: data.normal,
        personnel: data.personnel.size,
        normalRate: data.total > 0 ? ((data.normal / data.total) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => {
        // Sort by date (most recent months first)
        const [aMonth, aYear] = a.month.split(' ');
        const [bMonth, bYear] = b.month.split(' ');
        
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const aMonthIndex = monthNames.indexOf(aMonth);
        const bMonthIndex = monthNames.indexOf(bMonth);
        
        if (aYear !== bYear) {
          return parseInt(bYear) - parseInt(aYear); // Most recent year first
        }
        
        return bMonthIndex - aMonthIndex; // Most recent month first
      });
    
    setMonthlyBreakdown(monthlyArray);
  };

  // Export data to Excel
  const exportToExcel = async () => {
    try {
      setExportLoading(true);
      
      // Create workbook with multiple sheets
      const workbook = XLSX.utils.book_new();
      
      // Add security team by month sheet
      const securityTeamSheet = XLSX.utils.json_to_sheet(
        securityTeamByMonth.flatMap(month => 
          month.teamMembers.map(member => ({
            Month: month.month,
            'Security Team Member': member.name,
            'ID': member.id,
            'Shifts Worked': member.shifts
          }))
        )
      );
      XLSX.utils.book_append_sheet(workbook, securityTeamSheet, "Security Team By Month");
      
      // Add monthly breakdown sheet
      const monthlyBreakdownWorksheet = XLSX.utils.json_to_sheet(
        monthlyBreakdown.map(month => ({
          Month: month.month,
          'Total Reports': month.total,
          'Normal Reports': month.normal,
          'Incidents': month.incidents,
          'Issues': month.issues,
          'Security Personnel': month.personnel,
          'Normal Rate (%)': month.normalRate
        }))
      );
      XLSX.utils.book_append_sheet(workbook, monthlyBreakdownWorksheet, "Monthly Breakdown");
      
      // Add guard performance data sheet
      const performanceWorksheet = XLSX.utils.json_to_sheet(
        guardPerformanceData.map(guard => ({
          'Guard Name': guard.name,
          'Total Reports': guard.reports,
          'Incident Rate (%)': guard.incidentRate,
          'Issue Rate (%)': guard.issueRate,
          'Performance Score': guard.score
        }))
      );
      XLSX.utils.book_append_sheet(workbook, performanceWorksheet, "Guard Performance");
      
      // Create filename with date range
      const fileName = `security_team_analytics_${filters.startDate}_to_${filters.endDate}.xlsx`;
      
      // Export the file
      XLSX.writeFile(workbook, fileName);
      
      // Log activity
      try {
        await apiService.activityLog.logActivity({
          userId: user?.id,
          description: `Exported security team analytics report`,
          type: 'export'
        });
      } catch (logError) {
        console.error('Error logging activity:', logError);
      }
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const handleDateRangeChange = (value) => {
    let startDate = null;
    let endDate = new Date().toISOString().split('T')[0];
    
    if (value === 'thisMonth') {
      const today = new Date();
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate = format(startDate, 'yyyy-MM-dd');
    } else if (value === 'lastMonth') {
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      startDate = format(lastMonth, 'yyyy-MM-dd');
      
      const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      endDate = format(lastDayOfLastMonth, 'yyyy-MM-dd');
    } else if (value === 'last30') {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      startDate = format(date, 'yyyy-MM-dd');
    } else if (value === 'last90') {
      const date = new Date();
      date.setDate(date.getDate() - 90);
      startDate = format(date, 'yyyy-MM-dd');
    } else if (value === 'thisYear') {
      const date = new Date();
      startDate = new Date(date.getFullYear(), 0, 1);
      startDate = format(startDate, 'yyyy-MM-dd');
    } else if (value === 'lastYear') {
      const date = new Date();
      startDate = new Date(date.getFullYear() - 1, 0, 1);
      startDate = format(startDate, 'yyyy-MM-dd');
      
      const lastDayOfLastYear = new Date(date.getFullYear() - 1, 11, 31);
      endDate = format(lastDayOfLastYear, 'yyyy-MM-dd');
    }
    
    setFilters(prev => ({
      ...prev,
      dateRange: value,
      startDate,
      endDate
    }));
  };

  // Render functions
  const renderSecurityTeamByMonth = () => (
    <Card className="col-span-1 md:col-span-3 border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
      <CardHeader className="bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
        <CardTitle className="flex items-center text-lg font-medium">
          <Users className="w-4 h-4 mr-2 text-[#0A2647]" />
          Security Teams Worked by Month
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-8">
          {securityTeamByMonth.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0A2647]" />
              ) : (
                "No security team data available for the selected filters"
              )}
            </div>
          ) : (
            securityTeamByMonth.map((month, index) => (
              <div key={index} className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2 text-[#0A2647] dark:text-white">
                  {month.month} - Total Security Personnel: {month.totalPersonnel}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {month.totalPersonnel} security team members worked during this month
                </p>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={month.topMembers}
                      layout="vertical"
                      margin={{
                        top: 5,
                        right: 30,
                        left: 100,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        formatter={(value) => [`${value} shifts`, 'Security Team Shifts']}
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          border: 'none',
                          padding: '8px 12px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="shifts" name="Security Team Shifts" fill="#0A2647">
                        {month.topMembers.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left">Security Team</th>
                        <th className="px-4 py-2 text-left">ID</th>
                        <th className="px-4 py-2 text-center">Shifts Worked</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {month.teamMembers.map((member, memberIndex) => (
                        <tr key={memberIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-2">{member.name}</td>
                          <td className="px-4 py-2">{member.id}</td>
                          <td className="px-4 py-2 text-center">{member.shifts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
  
  const renderMonthlyBreakdown = () => (
    <Card className="col-span-1 md:col-span-3 border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
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
                  Total Reports
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Security Personnel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Normal Reports
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Incidents
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Issues
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Normal Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0A2647]" />
                  </td>
                </tr>
              ) : monthlyBreakdown.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
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
                      {month.personnel}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {month.normal}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {month.incidents}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {month.issues}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mr-2">
                          <div 
                            className="bg-[#0A2647] h-2.5 rounded-full" 
                            style={{ width: `${month.normalRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-300">
                          {month.normalRate}%
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
  );

  const renderGuardPerformance = () => (
    <Card className="col-span-1 md:col-span-3 border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
      <CardHeader className="bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
        <CardTitle className="flex items-center text-lg font-medium">
          <UserCircle className="w-4 h-4 mr-2 text-[#0A2647]" />
          Security Team Performance (Top 10)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Security Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Reports
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Incident Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Issue Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Performance Score
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
              ) : guardPerformanceData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No data available
                  </td>
                </tr>
              ) : (
                guardPerformanceData.map((guard, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {guard.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {guard.reports}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {guard.incidentRate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {guard.issueRate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mr-2">
                          <div 
                            className="bg-[#0A2647] h-2.5 rounded-full" 
                            style={{ width: `${guard.score}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-300">
                          {guard.score}
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
  );

  // Main render function
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
              Guard Shift Analytics Report
            </h1>
            <Button
              onClick={exportToExcel}
              disabled={exportLoading}
              className="bg-[#0A2647] hover:bg-[#0A2647]/90 text-white flex items-center space-x-2"
            >
              {exportLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              <span>Export Analytics</span>
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
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date Range
                  </label>
                  <select
  value={filters.dateRange}
  onChange={(e) => handleDateRangeChange(e.target.value)}
  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
>
  <option value="thisMonth">This Month</option>
  <option value="lastMonth">Last Month</option>
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
                      <input
                        type="date"
                        value={filters.startDate || ''}
                        onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={filters.endDate || ''}
                        onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location
                  </label>
                  <select
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">All Locations</option>
                    <option value="Nyarutarama HQ">Nyarutarama HQ</option>
                    <option value="Remera Switch">Remera Switch</option>
                    <option value="Kabuga SC">Kabuga Service Center</option>
                    <option value="Kimironko SC">Kimironko Service Center</option>
                    <option value="Giporoso SC">Giporoso Service Center</option>
                    <option value="Kisimenti SC">Kisimenti Service Center</option>
                    <option value="Kicukiro SC">Kicukiro Service Center</option>
                    <option value="KCM SC">KCM Service Center</option>
                    <option value="CHIC SC">CHIC Service Center</option>
                    <option value="Nyamirambo SC">Nyamirambo Service Center</option>
                    <option value="Nyabugogo SC">Nyabugogo Service Center</option>
                    <option value="Gisozi SC">Gisozi Service Center</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Shift Type
                  </label>
                  <select
                    value={filters.shiftType}
                    onChange={(e) => setFilters(prev => ({ ...prev, shiftType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">All Shifts</option>
                    <option value="day">Day Shift</option>
                    <option value="night">Night Shift</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Report Status
                  </label>
                  <select
                    value={filters.hasIncident}
                    onChange={(e) => setFilters(prev => ({ ...prev, hasIncident: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">All Reports</option>
                    <option value="true">With Incidents</option>
                    <option value="false">Without Incidents</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => {
                    const today = new Date();
                    const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                    setFilters({
                      dateRange: 'thisMonth',
                      startDate: startDate,
                      endDate: today.toISOString().split('T')[0],
                      location: '',
                      shiftType: '',
                      hasIncident: ''
                    });
                  }}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <RefreshCcw className="h-4 w-4" />
                  <span>Reset Filters</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
                <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                <Users className="h-4 w-4 text-[#0A2647]" />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.totalReports}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Total guard shift reports
                </p>
              </CardContent>
            </Card>
  
            <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
                <CardTitle className="text-sm font-medium">Normal Reports</CardTitle>
                <ShieldCheck className="h-4 w-4 text-[#0A2647]" />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.normalReports}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Reports with no incidents or issues
                </p>
              </CardContent>
            </Card>
  
            <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
                <CardTitle className="text-sm font-medium">Reports with Issues</CardTitle>
                <AlertCircle className="h-4 w-4 text-[#0A2647]" />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.issuesReports}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Reports with CCTV or utility issues
                </p>
              </CardContent>
            </Card>
  
            <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-[#0A2647]/5 dark:bg-[#0A2647]/20">
                <CardTitle className="text-sm font-medium">Incident Reports</CardTitle>
                <AlertTriangle className="h-4 w-4 text-[#0A2647]" />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.incidentReports}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Reports with security incidents
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main content: Security Teams Worked by Month */}
          <div className="grid grid-cols-1 gap-6 mb-6">
            {renderSecurityTeamByMonth()}
          </div>
          
          {/* Monthly Breakdown */}
          <div className="grid grid-cols-1 gap-6 mb-6">
            {renderMonthlyBreakdown()}
          </div>
          
          {/* Security Team Performance */}
          <div className="grid grid-cols-1 gap-6 mb-6">
            {renderGuardPerformance()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GuardShiftReport1;