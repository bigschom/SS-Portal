import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Loader2,
  Download,
  Filter,
  Search,
  Calendar,
  Building2,
  Users,
  Clock,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import Papa from 'papaparse';
import apiService from '../../config/api-service';
import { motion, AnimatePresence } from 'framer-motion';

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
        ) : type === 'error' ? (
          <AlertCircle className="w-5 h-5 text-white" />
        ) : (
          <AlertCircle className="w-5 h-5 text-white" />
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
        <XCircle className="w-4 h-4" />
      </button>
    </div>
  </motion.div>
);

const InternshipOverview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [internships, setInternships] = useState([]);
  const [filteredInternships, setFilteredInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'active',
    startDate: null,
    endDate: null,
    department: 'all',
    supervisor: 'all',
  });
  const [toast, setToast] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
 
  // Fetch internships on component mount and when filters change
  useEffect(() => {
    fetchInternships();
  }, [filters]);

  useEffect(() => {
    fetchDepartmentsAndSupervisors();
  }, []);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchDepartmentsAndSupervisors = async () => {
    try {
      // Get departments from constants via the service
      const depts = apiService.internships.getDepartments();
      setDepartments(depts || []);
      
      // Fetch all internships to extract unique supervisors
      const response = await apiService.internships.getAllInternships();
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Extract unique supervisors
      const uniqueSupervisors = [...new Set(
        response
          .map(item => item.work_with)
          .filter(supervisor => supervisor && supervisor.trim() !== '')
      )].sort();
      
      setSupervisors(uniqueSupervisors);
    } catch (error) {
      console.error('Error fetching departments and supervisors:', error);
      showToast('Failed to load filtering options.');
    }
  };

  const fetchInternships = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create filter object for API
      const apiFilters = {
        status: filters.status,
        startDate: filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : null,
        endDate: filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : null,
        department: filters.department !== 'all' ? filters.department : null
      };
      
      // Use the internship service
      const response = await apiService.internships.getAllInternships(apiFilters);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      let internsData = Array.isArray(response) ? response : [];
      
      // Filter by supervisor if specified
      if (filters.supervisor !== 'all') {
        internsData = internsData.filter(intern => 
          intern.work_with === filters.supervisor
        );
      }
      
      // Apply search filter if any
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        internsData = internsData.filter(intern => 
          intern.full_names.toLowerCase().includes(term) ||
          (intern.department_name && intern.department_name.toLowerCase().includes(term)) ||
          (intern.work_with && intern.work_with.toLowerCase().includes(term))
        );
      }
      
      setInternships(response);
      setFilteredInternships(internsData);
    } catch (error) {
      console.error('Error fetching internships:', error);
      setError('Failed to load internships. Please try again.');
      showToast('Failed to load internships. Please try again.');
      setFilteredInternships([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Handler for filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handler for search input
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Apply search filter immediately
    if (internships.length > 0) {
      let filtered = [...internships];
      
      if (value) {
        const term = value.toLowerCase();
        filtered = filtered.filter(intern => 
          intern.full_names.toLowerCase().includes(term) ||
          (intern.department_name && intern.department_name.toLowerCase().includes(term)) ||
          (intern.work_with && intern.work_with.toLowerCase().includes(term))
        );
      }
      
      // Apply other filters
      if (filters.supervisor !== 'all') {
        filtered = filtered.filter(intern => 
          intern.work_with === filters.supervisor
        );
      }
      
      setFilteredInternships(filtered);
    }
  };

  const handleExport = () => {
    try {
      const exportData = filteredInternships.map(intern => ({
        'Full Name': intern.full_names,
        'Department': intern.department_name || 'N/A',
        'Start Date': intern.date_start ? format(new Date(intern.date_start), 'MMM d, yyyy') : 'N/A',
        'End Date': intern.date_end ? format(new Date(intern.date_end), 'MMM d, yyyy') : 'N/A',
        'Supervisor': intern.work_with || 'N/A',
        'Contact Number': intern.contact_number || 'N/A',
        'Status': intern.status || (new Date(intern.date_end) >= new Date() ? 'Active' : 'Expired')
      }));
      
      const csv = Papa.unparse(exportData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // Create a filename based on current filters
      let fileName = `internships`;
      
      if (filters.status !== 'all') {
        fileName += `_${filters.status}`;
      }
      
      if (filters.startDate && filters.endDate) {
        fileName += `_${format(filters.startDate, 'yyyyMMdd')}_to_${format(filters.endDate, 'yyyyMMdd')}`;
      }
      
      link.setAttribute('download', `${fileName}.csv`);
      link.click();
      
      showToast('Export successful!', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export data. Please try again.');
    }
  };

  if (loading && internships.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A2647] dark:text-white" />
      </div>
    );
  }

  return (
    <div className="p-6">
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

      <div className="flex justify-center">
        <div className="w-full max-w-[90%]">
          <div className="flex flex-col space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Internship Overview
              </h1>
              <Button 
                className="bg-[#0A2647] hover:bg-[#0A2647]/90 dark:bg-white dark:text-[#0A2647] dark:hover:bg-gray-200"
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>

            {/* Filters */}
            <Card className="dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center text-lg font-medium dark:text-white">
                  <Filter className="w-5 h-5 mr-2" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="active">Active Only</option>
                      <option value="expired">Expired Only</option>
                      <option value="all">All Internships</option>
                    </select>
                  </div>

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
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Supervisor
                    </label>
                    <select
                      value={filters.supervisor}
                      onChange={(e) => handleFilterChange('supervisor', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="all">All Supervisors</option>
                      {supervisors.map(supervisor => (
                        <option key={supervisor} value={supervisor}>
                          {supervisor}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Search
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        placeholder="Search by name, department or supervisor"
                        className="w-full px-3 py-2 pl-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                      />
                      <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cards Grid */}
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center items-center h-48">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0A2647] dark:text-white" />
                </div>
              ) : filteredInternships.length === 0 ? (
                <Card className="dark:bg-gray-800">
                  <CardContent className="p-6 text-center text-gray-500 dark:text-gray-400">
                    No internships found matching your criteria
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredInternships.map((intern) => {
                    // Calculate status based on end date
                    const status = intern.status || (new Date(intern.date_end) >= new Date() ? 'Active' : 'Expired');
                    
                    return (
                      <Card 
                        key={intern.id}
                        className="dark:bg-gray-800 border-[#0A2647] dark:border-gray-700"
                      >
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="font-medium text-lg dark:text-white">{intern.full_names}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              status === 'Active' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {status}
                            </span>
                          </div>

                          <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-500 dark:text-gray-400">Department:</span>
                              <span className="ml-auto dark:text-white">{intern.department_name || 'N/A'}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-500 dark:text-gray-400">Start Date:</span>
                              <span className="ml-auto dark:text-white">
                                {intern.date_start ? format(new Date(intern.date_start), 'MMM d, yyyy') : 'N/A'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-500 dark:text-gray-400">End Date:</span>
                              <span className="ml-auto dark:text-white">
                                {intern.date_end ? format(new Date(intern.date_end), 'MMM d, yyyy') : 'N/A'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-500 dark:text-gray-400">Supervisor:</span>
                              <span className="ml-auto dark:text-white">{intern.work_with || 'N/A'}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-500 dark:text-gray-400">Contact:</span>
                              <span className="ml-auto dark:text-white">{intern.contact_number || 'N/A'}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InternshipOverview;