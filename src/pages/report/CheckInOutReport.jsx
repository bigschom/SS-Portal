import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { supabase } from '../../config/supabase';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const CheckInOutReport = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('3months');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [visitorStats, setVisitorStats] = useState([]);
  const [departmentStats, setDepartmentStats] = useState([]);
  const [timeStats, setTimeStats] = useState([]);
  const [allVisitorData, setAllVisitorData] = useState([]);
  const chartRef = useRef(null);

  useEffect(() => {
    fetchReportData();
  }, [dateRange, customStartDate, customEndDate]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      let startDate = new Date();
      let query = supabase.from('visitors').select('*');

      // Handle date range selection
      switch (dateRange) {
        case '3months':
          startDate.setMonth(startDate.getMonth() - 3);
          query = query.gte('check_in_time', startDate.toISOString());
          break;
        case '6months':
          startDate.setMonth(startDate.getMonth() - 6);
          query = query.gte('check_in_time', startDate.toISOString());
          break;
        case '1year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          query = query.gte('check_in_time', startDate.toISOString());
          break;
        case 'custom':
          if (customStartDate && customEndDate) {
            query = query
              .gte('check_in_time', new Date(customStartDate).toISOString())
              .lte('check_in_time', new Date(customEndDate).toISOString());
          }
          break;
        case 'all':
          // No date filtering for all data
          break;
      }

      const { data: visitors } = await query.order('check_in_time', { ascending: true });

      if (!visitors) return;

      setAllVisitorData(visitors); // Store all visitor data for Excel export
      processVisitorData(visitors);

    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

const processVisitorData = (visitors) => {
  // Daily/Monthly visitor count
  const visitorCount = visitors.reduce((acc, visitor) => {
    const date = new Date(visitor.check_in_time).toLocaleDateString();
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  setVisitorStats(Object.entries(visitorCount).map(([date, count]) => ({
    date,
    count
  })));

  // Department distribution - Changed from purpose to department
  const deptCount = visitors.reduce((acc, visitor) => {
    const department = visitor.department || 'Unspecified';
    acc[department] = (acc[department] || 0) + 1;
    return acc;
  }, {});

  setDepartmentStats(Object.entries(deptCount)
    .map(([name, value]) => ({
      name,
      value
    }))
    .sort((a, b) => b.value - a.value) // Sort by value in descending order
  );

  // Time of day statistics
  const timeCount = visitors.reduce((acc, visitor) => {
    const hour = new Date(visitor.check_in_time).getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {});

  setTimeStats(Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    visits: timeCount[i] || 0
  })));
};

  const exportToExcel = () => {
  // Prepare data for Excel export with all columns
  const excelData = allVisitorData.map(visitor => ({
    'Full Name': visitor.full_name,
    'ID Number': visitor.is_passport ? '-' : visitor.identity_number,
    'Passport Number': visitor.is_passport ? visitor.passport_number : '-',
    'Phone Number': visitor.phone_number,
    'Gender': visitor.gender || '-',
    'Nationality': visitor.nationality || '-',
    'Department': visitor.department,
    'Visitor Card': visitor.visitor_card,
    'Purpose': visitor.purpose,
    'Items Carried': visitor.items || '-',
    'Has Laptop': visitor.has_laptop ? 'Yes' : 'No',
    'Laptop Brand': visitor.laptop_brand || '-',
    'Laptop Serial': visitor.laptop_serial || '-',
    'Check In Time': new Date(visitor.check_in_time).toLocaleString(),
    'Check Out Time': visitor.check_out_time ? new Date(visitor.check_out_time).toLocaleString() : 'Not checked out',
    'Checked In By': visitor.check_in_by,
    'Checked Out By': visitor.check_out_by || '-',
    'Status': visitor.status,
    'Created At': new Date(visitor.created_at).toLocaleString(),
    'Updated At': new Date(visitor.updated_at).toLocaleString()
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);
  
  // Add column widths
  const colWidths = [
    { wch: 20 }, // Full Name
    { wch: 15 }, // ID Number
    { wch: 15 }, // Passport Number
    { wch: 15 }, // Phone Number
    { wch: 10 }, // Gender
    { wch: 15 }, // Nationality
    { wch: 20 }, // Department
    { wch: 12 }, // Visitor Card
    { wch: 30 }, // Purpose
    { wch: 30 }, // Items
    { wch: 10 }, // Has Laptop
    { wch: 15 }, // Laptop Brand
    { wch: 15 }, // Laptop Serial
    { wch: 20 }, // Check In Time
    { wch: 20 }, // Check Out Time
    { wch: 15 }, // Checked In By
    { wch: 15 }, // Checked Out By
    { wch: 12 }, // Status
    { wch: 20 }, // Created At
    { wch: 20 }, // Updated At
  ];
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, "Visitor Data");
  XLSX.writeFile(wb, `visitor_report_${dateRange}.xlsx`);
};


return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Visitor Reports
            </h1>
            
            <div className="flex items-center space-x-4">
              {/* Date Range Selector */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="h-9 px-4 rounded-lg border border-gray-200 dark:border-gray-600
                         dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last Year</option>
                <option value="all">All Data</option>
                <option value="custom">Custom Date Range</option>
              </select>

              {/* Custom Date Range Picker */}
              {dateRange === 'custom' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-600
                             dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <span className="text-gray-600 dark:text-gray-300">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-600
                             dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              )}

              {/* Export Button */}
              <button
                onClick={exportToExcel}
                className="h-9 flex items-center px-4 whitespace-nowrap bg-black text-white rounded-lg
                         hover:bg-gray-800 transition-colors dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                <FileSpreadsheet size={16} className="mr-2" />
                Export
              </button>
            </div>
          </div>

          <div className="space-y-8">
            {/* Visitor Trend Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Visitor Trends
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visitorStats}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'currentColor' }} 
                      className="text-gray-600 dark:text-gray-300"
                    />
                    <YAxis 
                      tick={{ fill: 'currentColor' }} 
                      width={30}
                      className="text-gray-600 dark:text-gray-300"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--tooltip-bg)',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        color: 'var(--tooltip-text)'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="currentColor"
                      strokeWidth={2} 
                      dot={{ fill: 'currentColor' }}
                      name="Visitors"
                      className="text-black dark:text-white"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Department Distribution */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Visits by Department
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={departmentStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {departmentStats.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'var(--tooltip-bg)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          color: 'var(--tooltip-text)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Time Distribution */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Visits by Time of Day
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeStats}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                      <XAxis 
                        dataKey="hour" 
                        tick={{ fill: 'currentColor' }}
                        tickFormatter={(hour) => `${hour}:00`}
                        className="text-gray-600 dark:text-gray-300"
                      />
                      <YAxis 
                        tick={{ fill: 'currentColor' }} 
                        width={30}
                        className="text-gray-600 dark:text-gray-300"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--tooltip-bg)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          color: 'var(--tooltip-text)'
                        }}
                        labelFormatter={(hour) => `${hour}:00`}
                      />
                      <Bar 
                        dataKey="visits" 
                        className="fill-black dark:fill-white"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Variables for dark mode support */}
      <style jsx global>{`
        :root {
          --tooltip-bg: #fff;
          --tooltip-text: #000;
        }
        
        .dark {
          --tooltip-bg: #374151;
          --tooltip-text: #fff;
        }

        /* Chart specific dark mode adjustments */
        .recharts-cartesian-grid-horizontal line,
        .recharts-cartesian-grid-vertical line {
          stroke: #374151;
        }

        .dark .recharts-text {
          fill: #9CA3AF;
        }
      `}</style>
    </div>
  );
}

export default CheckInOutReport;