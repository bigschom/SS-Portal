// src/pages/AuditLogs.jsx
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Filter, 
  Download, 
  Loader2, 
  Search,
  Calendar,
  User,
  AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthProvider';
import useRoleCheck from '../hooks/useRoleCheck';

const AuditLogs = () => {
  const { user } = useAuth();
  const roleCheck = useRoleCheck();
  
  // State for logs and filtering
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    username: '',
    activityType: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    logsPerPage: 10,
    totalLogs: 0
  });
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch logs with filtering
  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const result = await apiService.auditLogs.getLogs({
        ...filters,
        page: pagination.currentPage,
        limit: pagination.logsPerPage
      });

      setLogs(result.logs);
      setPagination(prev => ({
        ...prev,
        totalLogs: result.total
      }));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      // Show error toast
      window.toastService?.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  // Initial load and filter changes
  useEffect(() => {
    // Ensure user has permissions
    if (!roleCheck.canViewAllIncidents()) {
      navigate('/dashboard');
      return;
    }

    fetchAuditLogs();
  }, [filters, pagination.currentPage]);

  // Export logs to Excel
  const exportLogsToExcel = async () => {
    try {
      setExportLoading(true);
      
      // Fetch all logs for export
      const result = await apiService.auditLogs.getAllLogs(filters);
      
      // Transform logs for export
      const exportData = result.logs.map(log => ({
        'Timestamp': new Date(log.timestamp).toLocaleString(),
        'Username': log.username,
        'Activity Type': log.activityType,
        'Description': log.description,
        'IP Address': log.ipAddress || 'N/A'
      }));
      
      // Create workbook
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
      
      // Generate filename
      const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Trigger download
      XLSX.writeFile(wb, filename);

      // Log export activity
      await apiService.activityLog.logActivity({
        userId: user.id,
        description: 'Exported audit logs',
        type: 'system_log'
      });
      
      // Show success toast
      window.toastService?.success('Audit logs exported successfully');
    } catch (error) {
      console.error('Error exporting logs:', error);
      window.toastService?.error('Failed to export audit logs');
    } finally {
      setExportLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    // Reset to first page when filters change
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      username: '',
      activityType: ''
    });
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Render pagination controls
  const renderPagination = () => {
    const totalPages = Math.ceil(
      pagination.totalLogs / pagination.logsPerPage
    );

    return (
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-600">
          Showing {(pagination.currentPage - 1) * pagination.logsPerPage + 1} to{' '}
          {Math.min(
            pagination.currentPage * pagination.logsPerPage, 
            pagination.totalLogs
          )} of {pagination.totalLogs} logs
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setPagination(prev => ({ 
              ...prev, 
              currentPage: Math.max(1, prev.currentPage - 1) 
            }))}
            disabled={pagination.currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPagination(prev => ({ 
              ...prev, 
              currentPage: Math.min(
                totalPages, 
                prev.currentPage + 1
              ) 
            }))}
            disabled={pagination.currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  // Predefined activity types
  const activityTypes = [
    { value: '', label: 'All Types' },
    { value: 'user_management', label: 'User Management' },
    { value: 'login', label: 'Login Activity' },
    { value: 'password_change', label: 'Password Changes' },
    { value: 'system_config', label: 'System Configuration' },
    { value: 'security_incident', label: 'Security Incidents' }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <FileText className="mr-3 text-[#0A2647]" />
          Audit Logs
        </h1>
        <button
          onClick={exportLogsToExcel}
          disabled={exportLoading || loading}
          className="flex items-center px-4 py-2 bg-[#0A2647] text-white rounded-lg 
          hover:bg-[#0A2647]/90 disabled:opacity-50"
        >
          {exportLoading ? (
            <Loader2 className="mr-2 animate-spin" />
          ) : (
            <Download className="mr-2" />
          )}
          Export Logs
        </button>
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6 p-6">
        <div className="grid md:grid-cols-4 gap-4">
          {/* Date Range Filters */}
          <div>
            <label className="block mb-2 flex items-center">
              <Calendar className="mr-2 text-[#0A2647]" />
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block mb-2 flex items-center">
              <Calendar className="mr-2 text-[#0A2647]" />
              End Date
            </label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {/* Username Filter */}
          <div>
            <label className="block mb-2 flex items-center">
              <User className="mr-2 text-[#0A2647]" />
              Username
            </label>
            <input
              type="text"
              name="username"
              value={filters.username}
              onChange={handleFilterChange}
              placeholder="Filter by username"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {/* Activity Type Filter */}
          <div>
            <label className="block mb-2 flex items-center">
              <Filter className="mr-2 text-[#0A2647]" />
              Activity Type
            </label>
            <select
              name="activityType"
              value={filters.activityType}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {activityTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Actions */}
        <div className="flex justify-end mt-4 space-x-4">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-[#0A2647] h-8 w-8" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <AlertTriangle className="h-12 w-12 mb-4" />
            <p>No audit logs found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Activity Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {logs.map((log, index) => (
                    <tr 
                      key={log.id || index}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {log.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {log.activityType}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {log.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {log.ipAddress || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;