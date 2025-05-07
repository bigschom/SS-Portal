import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Trash2,
  Search, 
  Loader2,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  XCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react'
import apiService from '../../config/api-service';
import { Button } from '../../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/card'
import { format, subMonths } from 'date-fns'
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
        {type === 'success' ? <CheckCircle className="w-5 h-5 text-white" /> : 
         type === 'error' ? <XCircle className="w-5 h-5 text-white" /> : 
         type === 'warning' ? <AlertCircle className="w-5 h-5 text-white" /> : 
         <AlertCircle className="w-5 h-5 text-white" />}
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

const DeleteInternshipChecks = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [pageLoading, setPageLoading] = useState(true)
  const [records, setRecords] = useState([])
  const [filteredRecords, setFilteredRecords] = useState([])
  const [selectedRecords, setSelectedRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshLoading, setRefreshLoading] = useState(false)
  const [deletionLoading, setDeletionLoading] = useState(false)
  const [error, setError] = useState(null)
  const [supervisors, setSupervisors] = useState([])
  const [citizenshipOptions, setCitizenshipOptions] = useState([])
  const [statusOptions, setStatusOptions] = useState(['Active', 'Expired', 'All'])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [toast, setToast] = useState(null)
  const [initialized, setInitialized] = useState(false)
  
  // Filter loading states
  const [departmentsLoading, setDepartmentsLoading] = useState(true)
  const [supervisorsLoading, setSupervisorsLoading] = useState(true)
  const [citizenshipLoading, setCitizenshipLoading] = useState(true)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [displayedRecords, setDisplayedRecords] = useState([])
  
  const [filters, setFilters] = useState({
    department_name: 'all',
    status: 'all',
    citizenship: 'all',
    supervisor: 'all',
    searchTerm: '',
    startDate: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })
  
  const [sortConfig, setSortConfig] = useState({
    key: 'date_start',
    direction: 'desc'
  })
  const [departments, setDepartments] = useState([])

  // Show toast notification
  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };
  
  // Initialize component
  useEffect(() => {
    const initializePage = async () => {
      try {

        await Promise.all([
          fetchDepartments(),
          fetchSupervisors(),
          fetchCitizenshipOptions()
        ]);
        await fetchRecords();
        setInitialized(true);
      } catch (error) {

        setError('Failed to initialize page. Please try again.')
        showToast('Failed to initialize page. Please try again.', 'error');
      } finally {
        setPageLoading(false)
      }
    }

    initializePage()
  }, [])

  // Fetch departments
  const fetchDepartments = async () => {
    setDepartmentsLoading(true);
    try {

      const depts = await apiService.internships.getDepartments();

      
      if (!depts || depts.length === 0) {

      }
      
      setDepartments(depts || []);
    } catch (error) {

      showToast('Failed to load departments. Some filters may not work correctly.', 'warning');
    } finally {
      setDepartmentsLoading(false);
    }
  };

  // Fetch supervisors for internship
  const fetchSupervisors = async () => {
    setSupervisorsLoading(true);
    try {

      const supervisorsList = await apiService.internships.getSupervisors();

      
      if (Array.isArray(supervisorsList)) {
        setSupervisors(supervisorsList);
      } else {
        setSupervisors([]);
      }
    } catch (error) {

      showToast('Failed to load supervisors. Some filters may not work correctly.', 'warning');
      setSupervisors([]);
    } finally {
      setSupervisorsLoading(false);
    }
  };

  // Fetch citizenship options for internship
  const fetchCitizenshipOptions = async () => {
    setCitizenshipLoading(true);
    try {

      const citizenshipsData = await apiService.internships.getCitizenshipOptions();

      
      if (Array.isArray(citizenshipsData)) {
        setCitizenshipOptions(citizenshipsData);
      } else {
        setCitizenshipOptions([]);
      }
    } catch (error) {

      showToast('Failed to load citizenship options. Some filters may not work correctly.', 'warning');
      setCitizenshipOptions([]);
    } finally {
      setCitizenshipLoading(false);
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchTerm, currentFilters) => {
      fetchRecords(searchTerm, currentFilters);
    }, 300),
    []
  );

  // Handle filter change
  const handleFilterChange = (field, value) => {
    setFilters(prev => {
      const updatedFilters = { ...prev, [field]: value };
      fetchRecords(updatedFilters.searchTerm, updatedFilters);
      return updatedFilters;
    });
  };

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig(prev => {
      const direction = prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc';
      return { key, direction };
    });
  };

  // Handle refresh action
  const handleRefresh = async () => {
    setRefreshLoading(true);
    try {
      await fetchRecords();
      showToast('Internship records refreshed successfully', 'success');
    } catch (error) {

      showToast('Failed to refresh records', 'error');
    } finally {
      setRefreshLoading(false);
    }
  };

  // Fetch Internship Records
const fetchRecords = async (searchTerm = filters.searchTerm, currentFilters = filters) => {
  setLoading(true);
  setError(null);
  try {
    // First try getting all records without filters

    const allRecords = await apiService.internships.getAllInternships({ status: 'all' });
    
    if (!Array.isArray(allRecords) || allRecords.length === 0) {

    } else {

    }
    
    // Prepare API filters
    const apiFilters = {
      status: currentFilters.status !== 'All' ? currentFilters.status.toLowerCase() : 'all',
      startDate: currentFilters.startDate,
      endDate: currentFilters.endDate,
      department: currentFilters.department_name !== 'all' ? currentFilters.department_name : null
    };
    

    
    // Get internships from the API with filters
    const filteredInternships = await apiService.internships.getAllInternships(apiFilters);
    

    
    // Ensure we have data to work with - either from filtered results or from all records
    let processedInternships = [];
    
    if (Array.isArray(filteredInternships) && filteredInternships.length > 0) {
      processedInternships = filteredInternships;

    } else if (Array.isArray(allRecords) && allRecords.length > 0) {
      processedInternships = allRecords;

    }
    
    // Apply client-side filtering
    let clientFilteredData = [...processedInternships];
    
    // Calculate status based on date_end for each record
    clientFilteredData = clientFilteredData.map(item => {
      const now = new Date();
      const endDate = item.date_end ? new Date(item.date_end) : null;
      
      return {
        ...item,
        status: endDate && endDate >= now ? 'Active' : 'Expired'
      };
    });

    if (currentFilters.startDate || currentFilters.endDate) {
 
      clientFilteredData = clientFilteredData.filter(item => {
        const internshipStartDate = item.date_start ? new Date(item.date_start) : null;
        const internshipEndDate = item.date_end ? new Date(item.date_end) : null;
        
        // Skip items without valid dates
        if (!internshipStartDate || !internshipEndDate) {
          return false;
        }
        
        // Convert filter dates to Date objects for comparison
        const filterStartDate = currentFilters.startDate ? new Date(currentFilters.startDate) : null;
        const filterEndDate = currentFilters.endDate ? new Date(currentFilters.endDate) : null;
        
        // Normalize dates to midnight for accurate comparison
        if (filterStartDate) {
          filterStartDate.setHours(0, 0, 0, 0);
        }
        if (filterEndDate) {
          filterEndDate.setHours(23, 59, 59, 999); // End of day
        }
        internshipStartDate.setHours(0, 0, 0, 0);
        internshipEndDate.setHours(0, 0, 0, 0);
        

        
        if (filterStartDate && filterEndDate) {
          // Check for any overlap between periods
          return internshipStartDate <= filterEndDate && internshipEndDate >= filterStartDate;
        } else if (filterStartDate) {
          // Internship must end on or after the start date
          return internshipEndDate >= filterStartDate;
        } else if (filterEndDate) {
          // Internship must start on or before the end date
          return internshipStartDate <= filterEndDate;
        }
        
        // No date filters applied
        return true;
      });
      

    }
    
    // Apply status filter client-side if needed
    if (currentFilters.status && currentFilters.status !== 'all' && currentFilters.status !== 'All') {
      clientFilteredData = clientFilteredData.filter(item => 
        item.status === currentFilters.status
      );
    }
    
    // Apply citizenship filter
    if (currentFilters.citizenship && currentFilters.citizenship !== 'all') {
      clientFilteredData = clientFilteredData.filter(item => 
        item.citizenship === currentFilters.citizenship
      );
    }
    
    // Apply supervisor filter
    if (currentFilters.supervisor && currentFilters.supervisor !== 'all') {
      clientFilteredData = clientFilteredData.filter(item => 
        item.work_with === currentFilters.supervisor
      );
    }
    
    // Apply search term filter
    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      clientFilteredData = clientFilteredData.filter(item => 
        (item.full_names && item.full_names.toLowerCase().includes(term)) ||
        (item.citizenship && item.citizenship.toLowerCase().includes(term)) ||
        (item.department_name && item.department_name.toLowerCase().includes(term)) ||
        (item.work_with && item.work_with.toLowerCase().includes(term)) ||
        (item.id_passport_number && item.id_passport_number.toLowerCase().includes(term))
      );
    }


    // Apply department filter client-side if needed
if (currentFilters.department_name && currentFilters.department_name !== 'all') {
  const deptId = parseInt(currentFilters.department_name, 10);
  
  clientFilteredData = clientFilteredData.filter(item => {
    // Check by both ID and name to be thorough
    return (
      // Match by ID (if the department_id exists and is numeric)
      (item.department_id && (parseInt(item.department_id, 10) === deptId)) ||
      // Match by name or partial name
      (item.department_name && 
       (item.department_name === currentFilters.department_name || 
        item.department_name.includes(currentFilters.department_name)))
    );
  });
  

}
    
    // Update states with the processed data
    setRecords(processedInternships);
    setFilteredRecords(clientFilteredData);
    setSelectedRecords([]); // Clear selection when refreshing data
    setCurrentPage(1); // Reset to first page
    
    if (clientFilteredData.length === 0 && processedInternships.length > 0) {
      // We have data but filters excluded everything
      showToast('No records match the selected filters', 'warning');
    }
  } catch (error) {

    setError('Failed to load internship records: ' + (error.message || ''));
    showToast('Failed to load internship records: ' + (error.message || ''), 'error');
    setFilteredRecords([]);
  } finally {
    setLoading(false);
  }
};

  // Record selection methods
  const toggleRecordSelection = (recordId) => {
    setSelectedRecords(prev => 
      prev.includes(recordId)
      ? prev.filter(id => id !== recordId)
      : [...prev, recordId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRecords.length === displayedRecords.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(displayedRecords.map(r => r.id));
    }
  };

  // Deletion handler
  const handleDelete = async () => {
    if (!user) {
      setDeleteError('User not authenticated');
      return;
    }

    if (selectedRecords.length === 0) {
      setDeleteError('No records selected for deletion');
      return;
    }

    setDeletionLoading(true);
    setDeleteError(null);

    try {
      // Perform bulk deletion of internship records
      let successCount = 0;
      let failedIds = [];

      for (const recordId of selectedRecords) {
        try {

          const result = await apiService.internships.deleteInternship(recordId);
          
          if (result && result.success) {
            successCount++;
          } else if (result && result.error) {
            failedIds.push({ id: recordId, error: result.error });
          } else {
            failedIds.push({ id: recordId, error: 'Unknown error' });
          }
        } catch (itemError) {

          failedIds.push({ id: recordId, error: itemError.message || 'Failed to delete' });
        }
      }

      // Refresh records after deletion
      await fetchRecords();

      // Show success toast with appropriate message
      if (successCount === selectedRecords.length) {
        showToast(`${successCount} internship record(s) deleted successfully`, 'success');
      } else if (successCount > 0) {
        showToast(`${successCount} of ${selectedRecords.length} internship records deleted successfully. ${failedIds.length} failed.`, 'warning');
      } else {
        showToast('Failed to delete any internship records', 'error');
      }

      // Close dialog and reset selection
      setShowConfirmDialog(false);
      setSelectedRecords([]);
    } catch (error) {

      setDeleteError(error.message || 'Failed to delete records');
      showToast('Failed to delete internship records', 'error');
    } finally {
      setDeletionLoading(false);
    }
  };

  // Pagination handlers
  const handleItemsPerPageChange = (e) => {
    const newItemsPerPage = parseInt(e.target.value);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };
  
  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Effect for pagination
  useEffect(() => {
    if (filteredRecords.length === 0) {
      setDisplayedRecords([]);
      setTotalPages(1);
      return;
    }
    
    const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
    setTotalPages(totalPages);
    
    // Adjust current page if it's now out of bounds
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredRecords.length);
    
    setDisplayedRecords(filteredRecords.slice(startIndex, endIndex));

  }, [filteredRecords, currentPage, itemsPerPage]);

  // Effect for sorting
  useEffect(() => {
    if (initialized && filteredRecords.length > 0) {
      // Apply the current sort configuration
      let sortedData = [...filteredRecords];
      
      sortedData.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        // Handle date fields
        if (['date_start', 'date_end', 'created_at', 'updated_at'].includes(sortConfig.key)) {
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
      
      setFilteredRecords(sortedData);

    }
  }, [sortConfig, initialized]);

  // Page loading check
  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A2647] dark:text-white" />
      </div>
    )
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
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Delete Internship Records
            </h1>
            <div className="flex space-x-3">
              <Button
                onClick={handleRefresh}
                disabled={refreshLoading || loading}
                className="bg-[#0A2647] hover:bg-[#0A2647]/90 dark:bg-white dark:text-[#0A2647] dark:hover:bg-gray-200 text-white"
              >
                {refreshLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </Button>
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={selectedRecords.length === 0 || deletionLoading}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {deletionLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete {selectedRecords.length} Record{selectedRecords.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>

          {/* Confirmation Dialog */}
          <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {selectedRecords.length} internship {selectedRecords.length !== 1 ? 'records' : 'record'}. 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {deleteError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{deleteError}</AlertDescription>
                </Alert>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  disabled={deletionLoading}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {deletionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Delete'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Filters Card */}
          <Card className="mb-6 dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center dark:text-white">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {/* Search Input */}
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
                      className="w-full px-3 py-2 pl-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* Department Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department
                  </label>
                  <div className="relative">
                    <select
                      value={filters.department_name}
                      onChange={(e) => handleFilterChange('department_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      disabled={departmentsLoading}
                    >
                      <option value="all">All Departments</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                    {departmentsLoading && (
                      <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <div className="relative">
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      
                      {statusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Citizenship Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Citizenship
                  </label>
                  <div className="relative">
                    <select
                      value={filters.citizenship}
                      onChange={(e) => handleFilterChange('citizenship', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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

                {/* Supervisor Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Supervisor
                  </label>
                  <div className="relative">
                    <select
                      value={filters.supervisor}
                      onChange={(e) => handleFilterChange('supervisor', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      disabled={supervisorsLoading}
                    >
                      <option value="all">All Supervisors</option>
                      {supervisors.map(supervisor => (
                        <option key={supervisor} value={supervisor}>{supervisor}</option>
                      ))}
                    </select>
                    {supervisorsLoading && (
                      <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table Card */}
          <Card className="dark:bg-gray-800">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {/* Checkbox for selecting all */}
                      <th className="px-4 py-3 w-[5%]">
                        <input
                          type="checkbox"
                          checked={
                            displayedRecords.length > 0 && 
                            selectedRecords.length === displayedRecords.length
                          }
                          onChange={toggleSelectAll}
                          className="form-checkbox h-4 w-4 text-[#0A2647] rounded"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[5%]">
                        No.
                      </th>
                      {[
                        { key: 'full_names', label: 'Full Names', width: 'w-[18%]' },
                        { key: 'citizenship', label: 'Citizenship', width: 'w-[10%]' },
                        { key: 'department_name', label: 'Department', width: 'w-[13%]' },
                        { key: 'date_start', label: 'Start Date', width: 'w-[10%]' },
                        { key: 'date_end', label: 'End Date', width: 'w-[10%]' },
                        { key: 'work_with', label: 'Supervisor', width: 'w-[12%]' },
                        { key: 'status', label: 'Status', width: 'w-[10%]' },
                        { key: 'id_passport_number', label: 'ID/Passport', width: 'w-[10%]' }
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
                                    ? 'text-[#0A2647] dark:text-white'
                                    : 'text-gray-400'
                                }`}
                              />
                              <ChevronDown 
                                className={`w-4 h-4 ${
                                  sortConfig.key === column.key && sortConfig.direction === 'desc'
                                    ? 'text-[#0A2647] dark:text-white'
                                    : 'text-gray-400'
                                }`}
                              />
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan="10" className="px-6 py-4 text-center">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0A2647] dark:text-white" />
                        </td>
                      </tr>
                    ) : displayedRecords.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                          No internship records found
                        </td>
                      </tr>
                    ) : (
                      displayedRecords.map((record, index) => {
                        // Calculate the actual index across all pages
                        const actualIndex = (currentPage - 1) * itemsPerPage + index + 1;
                        
                        return (
                          <tr 
                            key={record.id || index}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            {/* Checkbox for individual record */}
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedRecords.includes(record.id)}
                                onChange={() => toggleRecordSelection(record.id)}
                                className="form-checkbox h-4 w-4 text-[#0A2647] rounded"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">
                              {actualIndex}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">
                              {record.full_names}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">
                              {record.citizenship}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">
                              {record.department_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">
                              {record.date_start ? format(new Date(record.date_start), 'MMM d, yyyy') : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">
                              {record.date_end ? format(new Date(record.date_end), 'MMM d, yyyy') : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">
                              {record.work_with || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`
                                px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                ${record.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}
                              `}>
                                {record.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">
                              {record.id_passport_number || 'N/A'}
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
                    {filteredRecords.length === 0 ? '0 of 0' : 
                      `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, filteredRecords.length)} of ${filteredRecords.length}`}
                  </span>
                  
                  <div className="flex space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1 || filteredRecords.length === 0}
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
                      disabled={currentPage === 1 || filteredRecords.length === 0}
                      className="h-8 w-8 p-0 flex items-center justify-center border-gray-200 dark:border-gray-600"
                    >
                      <span className="sr-only">Previous page</span>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageToShow;
                        
                        if (totalPages <= 5) {
                          pageToShow = i + 1;
                        } else if (currentPage <= 3) {
                          pageToShow = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageToShow = totalPages - 4 + i;
                        } else {
                          pageToShow = currentPage - 2 + i;
                        }
                        
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
                      disabled={currentPage === totalPages || filteredRecords.length === 0}
                      className="h-8 w-8 p-0 flex items-center justify-center border-gray-200 dark:border-gray-600"
                    >
                      <span className="sr-only">Next page</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages || filteredRecords.length === 0}
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

export default DeleteInternshipChecks;