import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Search, 
  Download,
  Loader2,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react'
import apiService from '../../config/api-service';
import { Button } from '../../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { format, subMonths } from 'date-fns'
import * as XLSX from 'xlsx'
import { useAuth } from '../../hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog"
import { Alert, AlertDescription } from "../../components/ui/alert"
import debounce from 'lodash/debounce'

const AllBackgroundChecks = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [pageLoading, setPageLoading] = useState(true)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [error, setError] = useState(null)
  const [requesters, setRequesters] = useState([])
  const [citizenshipOptions, setCitizenshipOptions] = useState([])
  const [statusOptions, setStatusOptions] = useState([])
  const [showAlertDialog, setShowAlertDialog] = useState(false)
  const [alertDialogMessage, setAlertDialogMessage] = useState('')
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState('error')
  const [alertConfirmAction, setAlertConfirmAction] = useState(null)
  const [initialized, setInitialized] = useState(false)
  
  // Add filter loading states to show when each filter is being loaded
  const [departmentsLoading, setDepartmentsLoading] = useState(true)
  const [rolesLoading, setRolesLoading] = useState(true)
  const [requestersLoading, setRequestersLoading] = useState(true)
  const [citizenshipLoading, setCitizenshipLoading] = useState(true)
  const [statusLoading, setStatusLoading] = useState(true)
  
  const [filters, setFilters] = useState({
    role_type: 'all',
    department_name: 'all',
    status: 'all',
    citizenship: 'all',
    requestedBy: 'all',
    searchTerm: '',
    startDate: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })
  
  const [sortConfig, setSortConfig] = useState({
    key: 'submitted_date',
    direction: 'desc'
  })
  const [departments, setDepartments] = useState([])
  const [roles, setRoles] = useState([])
  
  // Initialize component
  useEffect(() => {
    const initializePage = async () => {
      try {
        await Promise.all([
          fetchDepartmentsAndRoles(),
          fetchRequesters(),
          fetchCitizenshipOptions(),
          fetchStatusOptions()
        ]);
        await fetchRecords();
        setInitialized(true);
      } catch (error) {
        console.error('Error initializing page:', error)
        setError('Failed to initialize page. Please try again.')
      } finally {
        setPageLoading(false)
      }
    }

    initializePage()
  }, [])

  // Effect for filter changes
  useEffect(() => {
    if (!initialized) return;
    
    const applyFilters = async () => {
      await fetchRecords();
    };
    
    applyFilters();
  }, [
    initialized,
    filters.role_type,
    filters.department_name,
    filters.status,
    filters.citizenship,
    filters.requestedBy,
    filters.startDate,
    filters.endDate,
    sortConfig
  ]);

  // Separate effect for search term with debounce
  useEffect(() => {
    if (!initialized) return;
    
    if (!filters.searchTerm) {
      fetchRecords();
    }
  }, [filters.role_type, filters.department_name, filters.status, filters.citizenship, 
      filters.requestedBy, filters.startDate, filters.endDate, sortConfig, initialized]);
  
  // Handle real-time search
  const debouncedSearch = useCallback(
    debounce((searchValue, currentFilters) => {
      fetchRecords(searchValue, currentFilters);
    }, 300),
    []
  );

  const fetchRecords = async (searchTerm = filters.searchTerm, currentFilters = filters) => {
    setLoading(true);
    setError(null);
    try {
      // Get all background checks
      const allRequests = await apiService.backgroundChecks.getAllBackgroundChecks();
      
      if (allRequests.error) {
        throw new Error(allRequests.error);
      }
      
      // Apply filters manually (in a real app, this would be done server-side)
      let filteredData = allRequests;
      
      // Apply date range filter
      if (currentFilters.startDate) {
        filteredData = filteredData.filter(item => 
          new Date(item.submitted_date) >= new Date(currentFilters.startDate)
        );
      }
      
      if (currentFilters.endDate) {
        filteredData = filteredData.filter(item => 
          new Date(item.submitted_date) <= new Date(currentFilters.endDate)
        );
      }
      
      // Apply role_type filter
      if (currentFilters.role_type !== 'all') {
        filteredData = filteredData.filter(item => 
          item.role_type === currentFilters.role_type
        );
      }
      
      // Apply department_name filter
      if (currentFilters.department_name !== 'all') {
        filteredData = filteredData.filter(item => 
          item.department_name === currentFilters.department_name
        );
      }
      
      // Apply status filter
      if (currentFilters.status !== 'all') {
        filteredData = filteredData.filter(item => 
          item.status === currentFilters.status
        );
      }
      
      // Apply citizenship filter
      if (currentFilters.citizenship !== 'all') {
        filteredData = filteredData.filter(item => 
          item.citizenship === currentFilters.citizenship
        );
      }
      
      // Apply requested by filter
      if (currentFilters.requestedBy !== 'all') {
        filteredData = filteredData.filter(item => 
          item.requested_by === currentFilters.requestedBy
        );
      }
      
      // Apply search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredData = filteredData.filter(item => 
          (item.full_names && item.full_names.toLowerCase().includes(term)) ||
          (item.citizenship && item.citizenship.toLowerCase().includes(term)) ||
          (item.department_name && item.department_name.toLowerCase().includes(term))
        );
      }
      
      // Apply sorting
      filteredData.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        // Handle date fields
        if (['submitted_date', 'created_at', 'updated_at'].includes(sortConfig.key)) {
          aValue = aValue ? new Date(aValue).getTime() : 0;
          bValue = bValue ? new Date(bValue).getTime() : 0;
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
      
      console.log('Filtered data:', filteredData.length, 'records');
      setRecords(filteredData);
    } catch (error) {
      console.error('Error fetching records:', error);
      setError('Failed to load background check records');
    } finally {
      setLoading(false);
    }
  };
  
  // Improve the filter change handlers
  const handleFilterChange = (name, value) => {
    console.log(`Changing filter ${name} to:`, value);
    
    // Update the filters state
    setFilters(prev => {
      const newFilters = { ...prev, [name]: value };
      console.log("New filters state:", newFilters);
      return newFilters;
    });
  };

  // Show error alert
  const showErrorAlert = (message) => {
    setAlertMessage(message);
    setAlertType('error');
    setShowAlert(true);
    setAlertConfirmAction(null);

    // Automatically remove alert after 3 seconds
    setTimeout(() => {
      setShowAlert(false);
    }, 3000);
  };
  
// For fetching requesters

const fetchRequesters = async () => {
  setRequestersLoading(true);
  try {
    // Use the existing getAllBackgroundChecks method to get all records
    const response = await apiService.backgroundChecks.getAllBackgroundChecks();
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    // Extract unique requesters from the response
    const uniqueRequesters = [...new Set(
      response
        .map(item => item.requested_by)
        .filter(requester => requester && requester.trim() !== '')
    )].sort();
      
    setRequesters(uniqueRequesters);
  } catch (error) {
    console.error('Error fetching requesters:', error);
    showErrorAlert('Failed to load requesters. Some filters may not work correctly.');
  } finally {
    setRequestersLoading(false);
  }
};

// For fetching citizenship options
const fetchCitizenshipOptions = async () => {
  setCitizenshipLoading(true);
  try {
    // Use the existing getAllBackgroundChecks method to get all records
    const response = await apiService.backgroundChecks.getAllBackgroundChecks();
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    // Extract unique citizenship options from the response
    const uniqueOptions = [...new Set(
      response
        .map(item => item.citizenship)
        .filter(citizenship => citizenship && citizenship.trim() !== '')
    )].sort();
      
    setCitizenshipOptions(uniqueOptions);
  } catch (error) {
    console.error('Error fetching citizenship options:', error);
    showErrorAlert('Failed to load citizenship options. Some filters may not work correctly.');
  } finally {
    setCitizenshipLoading(false);
  }
};

// For fetching status options
const fetchStatusOptions = async () => {
  setStatusLoading(true);
  try {
    // Use the existing getAllBackgroundChecks method to get all records
    const response = await apiService.backgroundChecks.getAllBackgroundChecks();
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    // Extract unique status options from the response
    const uniqueOptions = [...new Set(
      response
        .map(item => item.status)
        .filter(status => status && status.trim() !== '')
    )].sort();
    
    // If no statuses found, use default values
    if (uniqueOptions.length === 0) {
      setStatusOptions(['Pending', 'Approved', 'Rejected', 'Closed']);
    } else {
      setStatusOptions(uniqueOptions);
    }
  } catch (error) {
    console.error('Error fetching status options:', error);
    // Fallback to defaults if error occurs
    setStatusOptions(['Pending', 'Approved', 'Rejected', 'Closed']);
  } finally {
    setStatusLoading(false);
  }
};

// For fetching departments and roles
const fetchDepartmentsAndRoles = async () => {
  setDepartmentsLoading(true);
  setRolesLoading(true);
  
  try {
    // Fetch departments using the existing getDepartments method
    const depts = await apiService.backgroundChecks.getDepartments();
    
    if (!depts || depts.length === 0) {
      console.warn('No departments found - this might be an error');
    }
    
    setDepartments(depts || []);
  } catch (error) {
    console.error('Error fetching departments:', error);
    showErrorAlert('Failed to load departments. Some filters may not work correctly.');
  } finally {
    setDepartmentsLoading(false);
  }
  
  try {
    // Fetch roles using the existing getRoleTypes method
    const rolesData = await apiService.backgroundChecks.getRoleTypes();
    
    if (!rolesData || rolesData.length === 0) {
      console.warn('No roles found - this might be an error');
      setRoles([]);
    } else {
      setRoles(rolesData || []);
    }
  } catch (error) {
    console.error('Error fetching roles:', error);
    showErrorAlert('Failed to load roles. Some filters may not work correctly.');
  } finally {
    setRolesLoading(false);
  }
};







  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }

  const exportToExcel = async () => {
    try {
      setExportLoading(true);
      setError(null);
      
      // Use API service for export
      const apiFilters = {
        role_type: filters.role_type !== 'all' ? filters.role_type : null,
        department_name: filters.department_name !== 'all' ? filters.department_name : null,
        status: filters.status !== 'all' ? filters.status : null,
        citizenship: filters.citizenship !== 'all' ? filters.citizenship : null,
        requestedBy: filters.requestedBy !== 'all' ? filters.requestedBy : null,
        searchTerm: filters.searchTerm || null,
        startDate: filters.startDate,
        endDate: filters.endDate
      };
      
      // Use current records for export if available, otherwise fetch
      let exportRecords = records;
      if (records.length === 0) {
        const response = await apiService.backgroundChecks.getAllBackgroundChecks(apiFilters);
        if (response.error) {
          throw new Error(response.error);
        }
        exportRecords = response;
      }

      const exportData = exportRecords.map(record => ({
        'Full Names': record.full_names,
        'Citizenship': record.citizenship,
        'Department': record.department_name,
        'Role': record.role_type,
        'Status': record.status,
        'Submitted Date': format(new Date(record.submitted_date), 'yyyy-MM-dd'),
        'Requested By': record.requested_by
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Background Checks');
      
      // Include date range in filename
      const fileName = `background_checks_${format(new Date(filters.startDate), 'yyyy-MM-dd')}_to_${format(new Date(filters.endDate), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      // Log the export activity if you have an activity log service
      if (apiService.activityLog && typeof apiService.activityLog.logActivity === 'function') {
        await apiService.activityLog.logActivity({
          userId: user.id,
          description: `Exported background checks data from ${filters.startDate} to ${filters.endDate}`,
          type: 'export'
        });
      }

    } catch (error) {
      console.error('Error exporting data:', error);
      setError('Failed to export data. Please try again.');
    } finally {
      setExportLoading(false);
    }
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A2647]" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-center">
        <div className="w-full max-w-[80%]">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              All Background Checks
            </h1>
            <Button
              onClick={exportToExcel}
              disabled={exportLoading || loading}
              className="bg-[#0A2647] hover:bg-[#0A2647]/90 text-white"
            >
              {exportLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export to Excel
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Show alerts for filter issues */}
          {showAlert && (
            <Alert variant={alertType === 'error' ? "destructive" : "default"} className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{alertMessage}</AlertDescription>
            </Alert>
          )}

          {/* Alert Dialog for confirmations or errors */}
          {showAlertDialog && (
            <AlertDialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Notification</AlertDialogTitle>
                  <AlertDialogDescription>
                    {alertDialogMessage}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction>OK</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Filters Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Search Names
                  </label>
                  <div className="relative">
                  <input
  type="text"
  value={filters.searchTerm}
  onChange={(e) => {
    const value = e.target.value;
    const updatedFilters = { ...filters, searchTerm: value };
    setFilters(updatedFilters);
    debouncedSearch(value, updatedFilters);
  }}
  placeholder="Search by name..."
  className="w-full px-3 py-2 pl-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700"
/>
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department
                  </label>
                  <div className="relative">
                    <select
                      value={filters.department_name}
                      onChange={(e) => handleFilterChange('department_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700"
                      disabled={departmentsLoading}
                    >
                      <option value="all">All Departments</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                      ))}
                    </select>
                    {departmentsLoading && (
                      <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-gray-400" />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role
                  </label>
                  <div className="relative">
                    <select
                      value={filters.role_type}
                      onChange={(e) => handleFilterChange('role_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700"
                      disabled={rolesLoading}
                    >
                      <option value="all">All Roles</option>
                      {roles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    {rolesLoading && (
                      <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-gray-400" />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <div className="relative">
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700"
                      disabled={statusLoading}
                    >
                      <option value="all">All Status</option>
                      {statusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    {statusLoading && (
                      <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-gray-400" />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Citizenship
                  </label>
                  <div className="relative">
                    <select
                      value={filters.citizenship}
                      onChange={(e) => handleFilterChange('citizenship', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700"
                      disabled={citizenshipLoading}
                    >
                      <option value="all">All Citizenship</option>
                      {citizenshipOptions.map(citizenship => (
                        <option key={citizenship} value={citizenship}>{citizenship}</option>
                      ))}
                    </select>
                    {citizenshipLoading && (
                      <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-gray-400" />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Requested By
                  </label>
                  <div className="relative">
                    <select
                      value={filters.requestedBy}
                      onChange={(e) => handleFilterChange('requestedBy', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700"
                      disabled={requestersLoading}
                    >
                      <option value="all">All Requesters</option>
                      {requesters.map(requester => (
                        <option key={requester} value={requester}>{requester}</option>
                      ))}
                    </select>
                    {requestersLoading && (
                      <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table Card */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {[
                        { key: 'full_names', label: 'Full Names', width: 'w-[20%]' },
                        { key: 'citizenship', label: 'Citizenship', width: 'w-[12%]' },
                        { key: 'department_name', label: 'Department', width: 'w-[15%]' },
                        { key: 'role_type', label: 'Role', width: 'w-[15%]' },
                        { key: 'status', label: 'Status', width: 'w-[10%]' },
                        { key: 'submitted_date', label: 'Submitted Date', width: 'w-[13%]' },
                        { key: 'requested_by', label: 'Requested By', width: 'w-[15%]' }
                      ].map(column => (
                        <th
                          key={column.key}
                          className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer ${column.width}`}
                          onClick={() => handleSort(column.key)}
                        >
                          <div className="flex items-center space-x-1">
                            <span>{column.label}</span>
                            <div className="flex flex-col">
                              <ChevronUp 
                                className={`w-4 h-4 ${
                                  sortConfig.key === column.key && sortConfig.direction === 'asc'
                                    ? 'text-[#0A2647]'
                                    : 'text-gray-400'
                                }`}
                              />
                              <ChevronDown 
                                className={`w-4 h-4 ${
                                  sortConfig.key === column.key && sortConfig.direction === 'desc'
                                    ? 'text-[#0A2647]'
                                    : 'text-gray-400'
                                }`}
                              />
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-4 text-center">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0A2647]" />
                        </td>
                      </tr>
                    ) : records.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                          No records found
                        </td>
                      </tr>
                    ) : (
                      records.map((record, index) => (
                        <tr 
                          key={index}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                          onClick={() => navigate(`/update-background-checks/${record.id}`)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">{record.full_names}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{record.citizenship}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{record.department_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{record.role_type}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              record.status === 'Pending'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : record.status === 'Approved'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : record.status === 'Rejected'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {record.submitted_date ? format(new Date(record.submitted_date), 'MMM d, yyyy') : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{record.requested_by || 'N/A'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default AllBackgroundChecks;

