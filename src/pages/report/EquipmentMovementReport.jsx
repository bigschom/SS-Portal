
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Printer, 
  Download, 
  Calendar, 
  Loader2, 
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import apiService from '../../config/api-service';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const EquipmentMovementReport = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [movementType, setMovementType] = useState('');
  const [status, setStatus] = useState('');
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await apiService.equipmentMovement.getMovementStatistics();
      setStatistics(data);
      
      // Format monthly stats data for the chart
      if (data && data.monthlyStats) {
        setChartData(data.monthlyStats);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setError('Failed to load statistics data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const filters = {
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
        movementType: movementType || undefined,
        status: status || undefined
      };
      
      await apiService.equipmentMovement.generateReport(filters);
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (isLoading && !statistics) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A2647] dark:text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold mb-6">Equipment Movement Reports</h1>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6"
            >
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Total Movements</h3>
              <p className="text-3xl font-bold text-[#0A2647] dark:text-white">{statistics.totalCount}</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6"
            >
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Outgoing Items</h3>
              <div className="flex items-end">
                <p className="text-3xl font-bold text-[#0A2647] dark:text-white mr-2">{statistics.outgoingCount}</p>
                <div className="flex items-center text-orange-500 text-sm mb-1">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6"
            >
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Incoming Items</h3>
              <div className="flex items-end">
                <p className="text-3xl font-bold text-[#0A2647] dark:text-white mr-2">{statistics.incomingCount}</p>
                <div className="flex items-center text-blue-500 text-sm mb-1">
                  <ArrowDownRight className="w-4 h-4 mr-1" />
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6"
            >
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Pending Returns</h3>
              <p className="text-3xl font-bold text-[#0A2647] dark:text-white">{statistics.pendingReturnCount}</p>
            </motion.div>
          </div>
        )}

        {/* Chart Section */}
        {chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.4 } }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6"
          >
            <h2 className="text-xl font-semibold mb-4">Monthly Movement Trends</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      borderColor: '#ccc',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="outgoing" name="Outgoing" fill="#0A2647" />
                  <Bar dataKey="incoming" name="Incoming" fill="#90b8e0" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Common Items */}
        {statistics && statistics.commonItems && statistics.commonItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.5 } }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6"
          >
            <h2 className="text-xl font-semibold mb-4">Most Common Items</h2>
            <ul className="space-y-2">
              {statistics.commonItems.map((item, index) => (
                <li key={index} className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                  <span className="text-[#0A2647] dark:text-white font-semibold">
                    {item.count} {item.count === 1 ? 'time' : 'times'}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Generate Report Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.6 } }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6"
        >
          <h2 className="text-xl font-semibold mb-4">Generate Custom Report</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="startDate"
                  value={dateRange.startDate}
                  onChange={handleDateChange}
                  className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-200 dark:border-gray-700
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent"
                />
                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="endDate"
                  value={dateRange.endDate}
                  onChange={handleDateChange}
                  className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-200 dark:border-gray-700
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent"
                />
                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Movement Type
              </label>
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                        bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                        focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="out">Outgoing</option>
                <option value="in">Incoming</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                        bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                        focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="pending_return">Pending Return</option>
                <option value="returned">Returned</option>
                <option value="approved_non_return">Approved Non-Return</option>
              </select>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleGenerateReport}
              disabled={isLoading}
              className="px-4 py-2 bg-[#0A2647] dark:bg-white text-white dark:text-[#0A2647] rounded-lg
                       hover:bg-[#0A2647]/90 dark:hover:bg-gray-100 flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Generate PDF Report
            </button>
            
            <button
              onClick={() => window.print()}
              className="px-4 py-2 text-[#0A2647] dark:text-white border border-[#0A2647] dark:border-white rounded-lg
                       hover:bg-[#0A2647]/10 dark:hover:bg-white/10 flex items-center justify-center"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print This Page
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EquipmentMovementReport;