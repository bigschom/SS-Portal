import { useState, useEffect, useCallback } from 'react'
import { 
  Search, 
  Loader2,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  XCircle,
  CheckCircle,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import apiService from '../../config/api-service';
import { Button } from '../../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
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
import { Checkbox } from "../../components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"

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

const DeleteStakeHRequests = () => {
  const { user } = useAuth()
  
  const [pageLoading, setPageLoading] = useState(true)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [senderOptions, setSenderOptions] = useState([])
  const [subjectOptions, setSubjectOptions] = useState([])
  const [statusOptions, setStatusOptions] = useState(['Pending', 'Answered'])
  const [answeredByOptions, setAnsweredByOptions] = useState([])
  const [showAlertDialog, setShowAlertDialog] = useState(false)
  const [alertDialogMessage, setAlertDialogMessage] = useState('')
  const [toast, setToast] = useState(null)
  const [alertConfirmAction, setAlertConfirmAction] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Add filter loading states
  const [sendersLoading, setSendersLoading] = useState(true)
  const [subjectsLoading, setSubjectsLoading] = useState(true)
  const [answeredByLoading, setAnsweredByLoading] = useState(true)
  
  // Set default status to 'Pending'
  const [filters, setFilters] = useState({
    sender: 'all',
    subject: 'all',
    status: 'Pending',
    answeredBy: 'all',
    searchTerm: '',
    startDate: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })
  
  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
    totalPages: 1
  })
  
  const [sortConfig, setSortConfig] = useState({
    key: 'date_received',
    direction: 'desc'
  })

  // Show toast notification
  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  // Initialize component
  useEffect(() => {
    const initializePage = async () => {
      try {
        await Promise.all([
          fetchOptions(),
          fetchUsers(),
          fetchRecords()
        ])
      } catch (error) {
        console.error('Error initializing page:', error)
        setError('Failed to initialize page. Please try again.')
        showToast('Failed to initialize page. Please try again.', 'error');
      } finally {
        setPageLoading(false)
      }
    }

    initializePage()
  }, [])

  // Additional useEffect for filters
  useEffect(() => {
    if (!filters.searchTerm) {
      fetchRecords()
    }
  }, [filters.sender, filters.subject, filters.status, filters.answeredBy, 
      filters.startDate, filters.endDate, sortConfig])
      
  // Additional useEffect for pagination
  useEffect(() => {
    fetchRecords();
  }, [pagination.currentPage, pagination.itemsPerPage])

  // Reset selection when records change
  useEffect(() => {
    setSelectedItems([])
    setSelectAll(false)
  }, [records])

  // Handle real-time search
  const debouncedSearch = useCallback(
    debounce((searchValue, currentFilters) => {
      fetchRecords(searchValue, currentFilters)
    }, 300),
    []
  )
  
  const fetchUsers = async () => {
    setAnsweredByLoading(true);
    try {
      const users = await apiService.users.getAllActiveUsers();
      
      if (users.error) {
        throw new Error(users.error);
      }
      
      setAnsweredByOptions(users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('Failed to load users. Some filters may not work correctly.', 'warning');
    } finally {
      setAnsweredByLoading(false);
    }
  }

  const fetchOptions = async () => {
    setSendersLoading(true);
    setSubjectsLoading(true);
    try {
      const options = await apiService.stakeholderRequests.getOptions();
      
      if (options.error) {
        throw new Error(options.error);
      }
      
      setSenderOptions(options.senders || []);
      setSubjectOptions(options.subjects || []);
    } catch (error) {
      console.error('Error fetching options:', error);
      showToast('Failed to load filter options. Some filters may not work correctly.', 'warning');
    } finally {
      setSendersLoading(false);
      setSubjectsLoading(false);
    }
  }

  const fetchRecords = async (searchTerm = filters.searchTerm, currentFilters = filters) => {
    setLoading(true);
    setError(null);
    try {
      // Get all stakeholder requests
      const allRequests = await apiService.stakeholderRequests.getAllRequests();
      
      if (allRequests.error) {
        throw new Error(allRequests.error);
      }
      
      // Apply filters manually (in a real app, this would be done server-side)
      let filteredData = allRequests;
      
      // Apply date range filter
      if (currentFilters.startDate) {
        filteredData = filteredData.filter(item => 
          new Date(item.date_received) >= new Date(currentFilters.startDate)
        );
      }
      
      if (currentFilters.endDate) {
        filteredData = filteredData.filter(item => 
          new Date(item.date_received) <= new Date(currentFilters.endDate)
        );
      }
      
      // Apply sender filter
      if (currentFilters.sender !== 'all') {
        filteredData = filteredData.filter(item => 
          item.sender === currentFilters.sender
        );
      }
      
      // Apply subject filter
      if (currentFilters.subject !== 'all') {
        filteredData = filteredData.filter(item => 
          item.subject === currentFilters.subject
        );
      }
      
      // Apply status filter
      if (currentFilters.status !== 'all') {
        filteredData = filteredData.filter(item => 
          item.status === currentFilters.status
        );
      }
      
      // Apply answered by filter
      if (currentFilters.answeredBy !== 'all') {
        filteredData = filteredData.filter(item => 
          item.answered_by === currentFilters.answeredBy
        );
      }
      
      // Apply search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredData = filteredData.filter(item => 
          item.reference_number.toLowerCase().includes(term) ||
          item.sender.toLowerCase().includes(term) ||
          item.subject.toLowerCase().includes(term)
        );
      }
      
      // Apply sorting
      filteredData.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        // Handle date fields
        if (['date_received', 'response_date', 'created_at', 'updated_at'].includes(sortConfig.key)) {
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
      
      // Update pagination details
      const totalItems = filteredData.length;
      const totalPages = Math.ceil(totalItems / pagination.itemsPerPage);
      
      // Make sure current page is valid
      let currentPage = pagination.currentPage;
      if (currentPage > totalPages && totalPages > 0) {
        currentPage = 1;
      }
      
      setPagination(prev => ({
        ...prev,
        totalItems,
        totalPages,
        currentPage
      }));
      
      // Apply pagination - only store all records for reference
      const allFilteredRecords = [...filteredData];
      
      // Calculate start and end indices for current page
      const startIndex = (currentPage - 1) * pagination.itemsPerPage;
      const endIndex = startIndex + pagination.itemsPerPage;
      
      // Slice the array to get only the items for the current page
      const paginatedData = allFilteredRecords.slice(startIndex, endIndex);
      
      setRecords(paginatedData);
    } catch (error) {
      console.error('Error fetching records:', error);
      setError('Failed to load stakeholder request records');
      showToast('Failed to load stakeholder request records', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedItems(records.map(r => r.id));
    } else {
      setSelectedItems([]);
    }
  }
  
  // Handle pagination change
  const handlePageChange = (newPage) => {
    // Make sure the new page is valid
    if (newPage < 1 || newPage > pagination.totalPages) {
      return;
    }
    
    setPagination(prev => ({
      ...prev,
      currentPage: newPage
    }));
    
    // Clear selections when changing page
    setSelectedItems([]);
    setSelectAll(false);
  }

  // Handle items per page change
  const handleItemsPerPageChange = (value) => {
    // Reset to first page when changing items per page
    setPagination(prev => ({
      ...prev,
      itemsPerPage: parseInt(value),
      currentPage: 1,
      totalPages: Math.ceil(prev.totalItems / parseInt(value))
    }));
  }

  const handleSelectItem = (id, checked) => {
    if (checked) {
      setSelectedItems(prev => [...prev, id]);
    } else {
      setSelectedItems(prev => prev.filter(itemId => itemId !== id));
    }
  }

  const confirmDelete = () => {
    if (selectedItems.length === 0) {
      showToast('Please select at least one record to delete', 'warning');
      return;
    }

    setAlertDialogMessage(`Are you sure you want to delete ${selectedItems.length} selected record(s)? This action cannot be undone.`);
    setAlertConfirmAction(() => deleteSelectedItems);
    setShowAlertDialog(true);
  }

  const deleteSelectedItems = async () => {
    setIsDeleting(true);
    try {
      // We'll need to create this deleteMultiple method in the API service
      const result = await apiService.stakeholderRequests.deleteMultiple(selectedItems, user.id);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Log activity
      await apiService.activityLog.logActivity({
        userId: user.id,
        description: `Deleted ${selectedItems.length} stakeholder request(s)`,
        type: 'delete'
      });
      
      showToast(`Successfully deleted ${selectedItems.length} record(s)`, 'success');
      
      // Refresh the records
      await fetchRecords();
      
      // Clear selections
      setSelectedItems([]);
      setSelectAll(false);
      
    } catch (error) {
      console.error('Error deleting records:', error);
      showToast('Failed to delete selected records', 'error');
    } finally {
      setIsDeleting(false);
      setShowAlertDialog(false);
    }
  }

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const { currentPage, totalPages } = pagination;
    const delta = 2; // Number of pages to show before and after current page
    const range = [];
    const rangeWithDots = [];
    let l;
    
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || 
        i === totalPages || 
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      } else if (i === currentPage - delta - 1 || i === currentPage + delta + 1) {
        range.push('...');
      }
    }
    
    for (const i of range) {
      if (l) {
        if (i === '...') {
          rangeWithDots.push('...');
        } else {
          if (l !== '...' && l + 1 !== i) {
            rangeWithDots.push('...');
          }
          rangeWithDots.push(i);
        }
      } else {
        rangeWithDots.push(i);
      }
      l = i;
    }
    
    return rangeWithDots;
  };

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
        <div className="w-full max-w-[80%]">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Delete Stakeholder Requests
            </h1>
            <div className="flex items-center space-x-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedItems.length} item(s) selected
              </div>
              <Button
                onClick={confirmDelete}
                disabled={isDeleting || selectedItems.length === 0}
                className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete Selected ({selectedItems.length})
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Alert Dialog for confirmations or errors */}
          {showAlertDialog && (
            <AlertDialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                  <AlertDialogDescription>{alertDialogMessage}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  {alertConfirmAction && (
                    <AlertDialogAction 
                      onClick={alertConfirmAction}
                      className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white"
                    >
                      Delete
                    </AlertDialogAction>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={filters.searchTerm}
                      onChange={(e) => {
                        const value = e.target.value;
                        const updatedFilters = { ...filters, searchTerm: value };
                        setFilters(updatedFilters);
                        debouncedSearch(value, updatedFilters);
                      }}
                      placeholder="Search by reference, sender..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
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
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sender
                  </label>
                  <div className="relative">
                    {sendersLoading && (
                      <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-gray-400" />
                    )}
                    <select
                      value={filters.sender}
                      onChange={(e) => setFilters(prev => ({ ...prev, sender: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      disabled={sendersLoading}
                    >
                      <option value="all">All Senders</option>
                      {senderOptions.map((sender, index) => (
                        <option key={index} value={sender}>{sender}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject
                  </label>
                  <div className="relative">
                    {subjectsLoading && (
                      <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-gray-400" />
                    )}
                    <select
                      value={filters.subject}
                      onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      disabled={subjectsLoading}
                    >
                      <option value="all">All Subjects</option>
                      {subjectOptions.map((subject, index) => (
                        <option key={index} value={subject}>{subject}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="all">All Status</option>
                    {statusOptions.map((status, index) => (
                      <option key={index} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Answered By
                  </label>
                  <div className="relative">
                    {answeredByLoading && (
                      <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-gray-400" />
                    )}
                    <select
                      value={filters.answeredBy}
                      onChange={(e) => setFilters(prev => ({ ...prev, answeredBy: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      disabled={answeredByLoading}
                    >
                      <option value="all">All Users</option>
                      {answeredByOptions.map((user) => (
                        <option key={user.id} value={user.username}>{user.full_name || user.username}</option>
                      ))}
                    </select>
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
                      <th className="px-4 py-3 text-left">
                        <div className="flex items-center">
                          <Checkbox 
                            checked={selectAll} 
                            onCheckedChange={handleSelectAll}
                            className="mr-2 data-[state=checked]:bg-[#0A2647] data-[state=checked]:border-[#0A2647]"
                          />
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Select All
                          </span>
                        </div>
                      </th>
                      {[
                        { key: 'reference_number', label: 'Reference Number', width: 'w-[15%]' },
                        { key: 'date_received', label: 'Date Received', width: 'w-[12%]' },
                        { key: 'sender', label: 'Sender', width: 'w-[15%]' },
                        { key: 'subject', label: 'Subject', width: 'w-[15%]' },
                        { key: 'status', label: 'Status', width: 'w-[10%]' },
                        { key: 'response_date', label: 'Response Date', width: 'w-[12%]' },
                        { key: 'answered_by', label: 'Answered By', width: 'w-[15%]' }
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
                        <td colSpan="8" className="px-6 py-4 text-center">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0A2647] dark:text-white" />
                        </td>
                      </tr>
                    ) : records.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                          No records found
                        </td>
                      </tr>
                    ) : (
                      records.map((record, index) => (
                        <tr 
                          key={index}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                            selectedItems.includes(record.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Checkbox 
                              checked={selectedItems.includes(record.id)}
                              onCheckedChange={(checked) => handleSelectItem(record.id, checked)}
                              className="data-[state=checked]:bg-[#0A2647] data-[state=checked]:border-[#0A2647]"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{record.reference_number}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">
                            {format(new Date(record.date_received), 'MMM d, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{record.sender}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{record.subject}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">
                            {record.status}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">
                            {record.response_date 
                              ? format(new Date(record.response_date), 'MMM d, yyyy')
                              : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{record.answered_by || 'N/A'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>

            {/* Pagination Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                {/* Items per page selector */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Rows per page:</span>
                  <select
                    value={pagination.itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(e.target.value)}
                    className="py-1 px-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    {[5, 10, 20, 50, 100].map(value => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Display info */}
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} to {
                    Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)
                  } of {pagination.totalItems} entries
                </div>
                
                {/* Page navigation */}
                <div className="flex items-center space-x-1">
                  <Button
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-[#0A2647] hover:text-white disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <span className="sr-only">First page</span>
                    <ChevronLeft className="h-4 w-4" />
                    <ChevronLeft className="h-4 w-4 -ml-2" />
                  </Button>
                  
                  <Button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-[#0A2647] hover:text-white disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <span className="sr-only">Previous page</span>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-3 py-1 text-gray-600 dark:text-gray-400">
                        ...
                      </span>
                    ) : (
                      <Button
                        key={`page-${page}`}
                        onClick={() => handlePageChange(page)}
                        variant={pagination.currentPage === page ? "default" : "outline"}
                        size="sm"
                        className={`h-8 w-8 p-0 flex items-center justify-center ${
                          pagination.currentPage === page
                            ? 'bg-[#0A2647] text-white dark:bg-[#0A2647] dark:text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-[#0A2647] hover:text-white'
                        }`}
                      >
                        {page}
                      </Button>
                    )
                  ))}
                  
                  <Button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-[#0A2647] hover:text-white disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <span className="sr-only">Next page</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-[#0A2647] hover:text-white disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <span className="sr-only">Last page</span>
                    <ChevronRight className="h-4 w-4" />
                    <ChevronRight className="h-4 w-4 -ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default DeleteStakeHRequests;