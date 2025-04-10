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

const AllStakeHRequests = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [pageLoading, setPageLoading] = useState(true)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [error, setError] = useState(null)
  const [senderOptions, setSenderOptions] = useState([])
  const [subjectOptions, setSubjectOptions] = useState([])
  const [statusOptions, setStatusOptions] = useState(['Pending', 'Answered'])
  const [answeredByOptions, setAnsweredByOptions] = useState([])
  const [showAlertDialog, setShowAlertDialog] = useState(false)
  const [alertDialogMessage, setAlertDialogMessage] = useState('')
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState('error')
  const [alertConfirmAction, setAlertConfirmAction] = useState(null)
  
  // Add filter loading states
  const [sendersLoading, setSendersLoading] = useState(true)
  const [subjectsLoading, setSubjectsLoading] = useState(true)
  const [answeredByLoading, setAnsweredByLoading] = useState(true)
  
  const [filters, setFilters] = useState({
    sender: 'all',
    subject: 'all',
    status: 'all',
    answeredBy: 'all',
    searchTerm: '',
    startDate: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })
  
  const [sortConfig, setSortConfig] = useState({
    key: 'date_received',
    direction: 'desc'
  })
  
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

  // Handle real-time search
  const debouncedSearch = useCallback(
    debounce((searchValue, currentFilters) => {
      fetchRecords(searchValue, currentFilters)
    }, 300),
    []
  )

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
      showErrorAlert('Failed to load users. Some filters may not work correctly.');
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
      showErrorAlert('Failed to load filter options. Some filters may not work correctly.');
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
      
      setRecords(filteredData);
    } catch (error) {
      console.error('Error fetching records:', error);
      setError('Failed to load stakeholder request records');
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

  const exportToExcel = async () => {
    try {
      setExportLoading(true);
      setError(null);
      
      const exportData = records.map(record => ({
        'Reference Number': record.reference_number,
        'Date Received': format(new Date(record.date_received), 'yyyy-MM-dd'),
        'Sender': record.sender,
        'Subject': record.subject,
        'Status': record.status,
        'Response Date': record.response_date ? format(new Date(record.response_date), 'yyyy-MM-dd') : 'N/A',
        'Answered By': record.answered_by || 'N/A',
        'Created By': record.created_by,
        'Created At': format(new Date(record.created_at), 'yyyy-MM-dd HH:mm')
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Stakeholder Requests");
      
      // Include date range in filename
      const fileName = `stakeholder_requests_${format(new Date(filters.startDate), 'yyyy-MM-dd')}_to_${format(new Date(filters.endDate), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      // Log the export activity
      await apiService.activityLog.logActivity({
        userId: user.id,
        description: `Exported stakeholder requests data from ${filters.startDate} to ${filters.endDate}`,
        type: 'export'
      });

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
              All Stakeholder Requests
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
                  <AlertDialogDescription>{alertDialogMessage}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  {alertConfirmAction && (
                    <AlertDialogAction onClick={alertConfirmAction}>Confirm</AlertDialogAction>
                  )}
                  {!alertConfirmAction && <AlertDialogAction>OK</AlertDialogAction>}
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
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
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
                      className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700"
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
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700"
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
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700"
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
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700"
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700"
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
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700"
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
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
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
                          onClick={() => navigate(`/update-stake-holder-request/${record.id}`)}

                        >
                          <td className="px-6 py-4 whitespace-nowrap">{record.reference_number}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {format(new Date(record.date_received), 'MMM d, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{record.sender}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{record.subject}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              record.status === 'Pending'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {record.response_date 
                              ? format(new Date(record.response_date), 'MMM d, yyyy')
                              : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{record.answered_by || 'N/A'}</td>
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

export default AllStakeHRequests;

