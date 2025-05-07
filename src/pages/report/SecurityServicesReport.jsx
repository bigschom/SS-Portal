// src/pages/security-services/reports/ReportsPage.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { 
  DownloadCloud, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  Calendar, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  RotateCcw,
  Loader2,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import apiClient from '../../config/api-service';

// Service types for filtering
const SERVICE_TYPES = {
  REQUEST_SERIAL_NUMBER: 'request_serial_number',
  CHECK_STOLEN_PHONE: 'stolen_phone_check',
  CALL_HISTORY: 'call_history_request',
  UNBLOCK_CALL: 'unblock_call_request',
  UNBLOCK_MOMO: 'unblock_momo_request',
  MONEY_REFUND: 'money_refund_request',
  MOMO_TRANSACTION: 'momo_transaction_request',
  BACKOFFICE_APPOINTMENT: 'backoffice_appointment'
};

// Human-readable service labels
const SERVICE_LABELS = {
  [SERVICE_TYPES.REQUEST_SERIAL_NUMBER]: 'Serial Number Request',
  [SERVICE_TYPES.CHECK_STOLEN_PHONE]: 'Stolen Phone Check',
  [SERVICE_TYPES.CALL_HISTORY]: 'Call History Request',
  [SERVICE_TYPES.UNBLOCK_CALL]: 'Unblock Call Request',
  [SERVICE_TYPES.UNBLOCK_MOMO]: 'Unblock MoMo Request',
  [SERVICE_TYPES.MONEY_REFUND]: 'Money Refund Request',
  [SERVICE_TYPES.MOMO_TRANSACTION]: 'MoMo Transaction History',
  [SERVICE_TYPES.BACKOFFICE_APPOINTMENT]: 'Backoffice Appointment'
};

// Status definitions
const REQUEST_STATUS = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  PENDING_INVESTIGATION: 'pending_investigation',
  UNABLE_TO_HANDLE: 'unable_to_handle',
  SENT_BACK: 'sent_back'
};

// Status configs for UI display
const STATUS_CONFIG = {
  [REQUEST_STATUS.NEW]: {
    label: 'New',
    color: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/20'
  },
  [REQUEST_STATUS.IN_PROGRESS]: {
    label: 'In Progress',
    color: 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/20'
  },
  [REQUEST_STATUS.COMPLETED]: {
    label: 'Completed',
    color: 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/20'
  },
  [REQUEST_STATUS.PENDING_INVESTIGATION]: {
    label: 'Under Investigation',
    color: 'text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/20'
  },
  [REQUEST_STATUS.UNABLE_TO_HANDLE]: {
    label: 'Unable to Handle',
    color: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/20'
  },
  [REQUEST_STATUS.SENT_BACK]: {
    label: 'Sent Back',
    color: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/20'
  }
};

const SecurityServicesReport = () => {
  const [activeTab, setActiveTab] = useState('requests');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [requests, setRequests] = useState([]);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Filtering state
  const [filters, setFilters] = useState({
    dateFrom: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    serviceType: '',
    status: '',
    searchQuery: ''
  });
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });
  
  // Selected columns for export
  const [selectedColumns, setSelectedColumns] = useState({
    reference_number: true,
    service_type: true,
    status: true,
    full_names: true,
    primary_contact: true,
    created_at: true,
    updated_at: true,
    created_by: true,
    assigned_to: true
  });
  
  // Fetch requests
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/security-services/reports/requests', {
        params: {
          page,
          pageSize,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          serviceType: filters.serviceType,
          status: filters.status,
          searchQuery: filters.searchQuery,
          sortKey: sortConfig.key,
          sortDirection: sortConfig.direction
        }
      });
      
      setRequests(response.data.items || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalItems(response.data.totalItems || 0);
      setError(null);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setError('Failed to load reports data. Please try again.');
      
      // Set mock data for development if API fails
      setRequests(getMockRequestsData());
      setTotalPages(5);
      setTotalItems(75);
    } finally {
      setLoading(false);
    }
  };
  
  // Get mock data for development
  const getMockRequestsData = () => {
    const mockRequests = [];
    const statuses = Object.values(REQUEST_STATUS);
    const serviceTypes = Object.values(SERVICE_TYPES);
    
    for (let i = 1; i <= 15; i++) {
      const randomDays = Math.floor(Math.random() * 30);
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - randomDays);
      
      const updatedDays = Math.floor(Math.random() * randomDays);
      const updatedDate = new Date(createdDate);
      updatedDate.setDate(updatedDate.getDate() + updatedDays);
      
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
      
      const prefixes = {
        [SERVICE_TYPES.REQUEST_SERIAL_NUMBER]: 'SNR',
        [SERVICE_TYPES.CHECK_STOLEN_PHONE]: 'SPC',
        [SERVICE_TYPES.CALL_HISTORY]: 'CHR',
        [SERVICE_TYPES.UNBLOCK_CALL]: 'UCR',
        [SERVICE_TYPES.UNBLOCK_MOMO]: 'UMR',
        [SERVICE_TYPES.MONEY_REFUND]: 'MRR',
        [SERVICE_TYPES.MOMO_TRANSACTION]: 'MTR',
        [SERVICE_TYPES.BACKOFFICE_APPOINTMENT]: 'BOA'
      };
      
      mockRequests.push({
        id: i,
        reference_number: `${prefixes[serviceType] || 'REQ'}-${new Date().getFullYear()}-${String(i).padStart(4, '0')}`,
        service_type: serviceType,
        status: status,
        full_names: `Customer ${i}`,
        primary_contact: `07${Math.floor(10000000 + Math.random() * 90000000)}`,
        created_at: createdDate.toISOString(),
        updated_at: updatedDate.toISOString(),
        created_by: {
          id: Math.floor(Math.random() * 5) + 1,
          fullname: ['John Doe', 'Jane Smith', 'Alice Johnson', 'Bob Wilson', 'Eve Jackson'][Math.floor(Math.random() * 5)]
        },
        assigned_to: status !== REQUEST_STATUS.NEW ? {
          id: Math.floor(Math.random() * 5) + 1,
          fullname: ['Bigirimana', 'John Doe', 'Jane Smith', 'Alice Johnson', 'Bob Wilson'][Math.floor(Math.random() * 5)]
        } : null
      });
    }
    
    return mockRequests;
  };
  
  // Effect to fetch requests when filters or pagination changes
  useEffect(() => {
    fetchRequests();
  }, [page, pageSize, sortConfig, filters]);
  
  // Handle sort
  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [key]: value
    }));
    
    // Reset to first page when filter changes
    setPage(1);
  };
  
  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };
  
  // Export to Excel
  const exportToExcel = () => {
    const exportData = requests.map(request => {
      const exportObj = {};
      
      if (selectedColumns.reference_number) exportObj['Reference Number'] = request.reference_number;
      if (selectedColumns.service_type) exportObj['Service Type'] = SERVICE_LABELS[request.service_type] || request.service_type;
      if (selectedColumns.status) exportObj['Status'] = STATUS_CONFIG[request.status]?.label || request.status;
      if (selectedColumns.full_names) exportObj['Customer Name'] = request.full_names;
      if (selectedColumns.primary_contact) exportObj['Contact Number'] = request.primary_contact;
      if (selectedColumns.created_at) exportObj['Created Date'] = format(new Date(request.created_at), 'yyyy-MM-dd HH:mm');
      if (selectedColumns.updated_at) exportObj['Last Updated'] = format(new Date(request.updated_at), 'yyyy-MM-dd HH:mm');
      if (selectedColumns.created_by) exportObj['Created By'] = request.created_by?.fullname || 'N/A';
      if (selectedColumns.assigned_to) exportObj['Assigned To'] = request.assigned_to?.fullname || 'N/A';
      
      return exportObj;
    });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Requests');
    
    // Generate report name
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const fileName = `security-services-report-${dateStr}.xlsx`;
    
    // Generate and download file
    XLSX.writeFile(workbook, fileName);
  };
  
  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(16);
    doc.text('Security Services Report', 14, 22);
    
    // Filters info
    doc.setFontSize(10);
    doc.text(`Date Range: ${filters.dateFrom} to ${filters.dateTo}`, 14, 30);
    if (filters.serviceType) {
      doc.text(`Service Type: ${SERVICE_LABELS[filters.serviceType] || filters.serviceType}`, 14, 35);
    }
    if (filters.status) {
      doc.text(`Status: ${STATUS_CONFIG[filters.status]?.label || filters.status}`, 14, 40);
    }
    
    // Create table data
    const tableColumn = [];
    const tableRows = [];
    
    // Add selected columns
    if (selectedColumns.reference_number) tableColumn.push('Reference');
    if (selectedColumns.service_type) tableColumn.push('Service');
    if (selectedColumns.status) tableColumn.push('Status');
    if (selectedColumns.full_names) tableColumn.push('Customer');
    if (selectedColumns.primary_contact) tableColumn.push('Contact');
    if (selectedColumns.created_at) tableColumn.push('Created');
    if (selectedColumns.assigned_to) tableColumn.push('Assigned To');
    
    // Add data rows
    requests.forEach(request => {
      const rowData = [];
      
      if (selectedColumns.reference_number) rowData.push(request.reference_number);
      if (selectedColumns.service_type) rowData.push(SERVICE_LABELS[request.service_type] || request.service_type);
      if (selectedColumns.status) rowData.push(STATUS_CONFIG[request.status]?.label || request.status);
      if (selectedColumns.full_names) rowData.push(request.full_names);
      if (selectedColumns.primary_contact) rowData.push(request.primary_contact);
      if (selectedColumns.created_at) rowData.push(format(new Date(request.created_at), 'yyyy-MM-dd'));
      if (selectedColumns.assigned_to) rowData.push(request.assigned_to?.fullname || 'N/A');
      
      tableRows.push(rowData);
    });
    
    // Add table to document
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    
    // Generate report name
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const fileName = `security-services-report-${dateStr}.pdf`;
    
    // Save the PDF
    doc.save(fileName);
  };
  
  // Print report
  const printReport = () => {
    const printWindow = window.open('', '_blank');
    
    const html = `
      <html>
        <head>
          <title>Security Services Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1e40af; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .filters { margin-bottom: 20px; font-size: 14px; color: #666; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <button onclick="window.print()" style="padding: 8px 16px; background: #1e40af; color: white; border: none; border-radius: 4px; cursor: pointer;">Print</button>
          <h1>Security Services Report</h1>
          <div class="filters">
            <p>Date Range: ${filters.dateFrom} to ${filters.dateTo}</p>
            ${filters.serviceType ? `<p>Service Type: ${SERVICE_LABELS[filters.serviceType] || filters.serviceType}</p>` : ''}
            ${filters.status ? `<p>Status: ${STATUS_CONFIG[filters.status]?.label || filters.status}</p>` : ''}
          </div>
          <table>
            <thead>
              <tr>
                ${selectedColumns.reference_number ? '<th>Reference Number</th>' : ''}
                ${selectedColumns.service_type ? '<th>Service Type</th>' : ''}
                ${selectedColumns.status ? '<th>Status</th>' : ''}
                ${selectedColumns.full_names ? '<th>Customer Name</th>' : ''}
                ${selectedColumns.primary_contact ? '<th>Contact</th>' : ''}
                ${selectedColumns.created_at ? '<th>Created Date</th>' : ''}
                ${selectedColumns.assigned_to ? '<th>Assigned To</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${requests.map(request => `
                <tr>
                  ${selectedColumns.reference_number ? `<td>${request.reference_number}</td>` : ''}
                  ${selectedColumns.service_type ? `<td>${SERVICE_LABELS[request.service_type] || request.service_type}</td>` : ''}
                  ${selectedColumns.status ? `<td>${STATUS_CONFIG[request.status]?.label || request.status}</td>` : ''}
                  ${selectedColumns.full_names ? `<td>${request.full_names}</td>` : ''}
                  ${selectedColumns.primary_contact ? `<td>${request.primary_contact}</td>` : ''}
                  ${selectedColumns.created_at ? `<td>${format(new Date(request.created_at), 'yyyy-MM-dd')}</td>` : ''}
                  ${selectedColumns.assigned_to ? `<td>${request.assigned_to?.fullname || 'N/A'}</td>` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top: 20px; font-size: 12px; color: #666;">
            <p>Total Records: ${totalItems}</p>
            <p>Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };
  
  // Render status badge
  const renderStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || {
      label: status,
      color: 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };
  
  // Render sort icon
  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4 ml-1" />;
    }
    
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4 ml-1" />
      : <ChevronDown className="h-4 w-4 ml-1" />;
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Security Services Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Generate and export detailed reports for security service requests
          </p>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 p-4 rounded-lg mb-6">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="requests">
            Requests Report
          </TabsTrigger>
          <TabsTrigger value="performance">
            Performance Report
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            Scheduled Reports
          </TabsTrigger>
        </TabsList>
        
        {/* Requests Report Tab */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Service Requests Report</CardTitle>
              <CardDescription>
                Filter, view and export service request data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="mb-6 grid gap-4 md:grid-cols-5">
                <div className="space-y-2">
                  <Label htmlFor="date-from">From Date</Label>
                  <Input 
                    id="date-from" 
                    type="date" 
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date-to">To Date</Label>
                  <Input 
                    id="date-to" 
                    type="date" 
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="service-type">Service Type</Label>
                  <Select 
                    value={filters.serviceType} 
                    onValueChange={(value) => handleFilterChange('serviceType', value)}
                  >
                    <SelectTrigger id="service-type">
                      <SelectValue placeholder="All Services" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL_SERVICES">All Services</SelectItem>
                      {Object.keys(SERVICE_TYPES).map((key) => (
                        <SelectItem key={key} value={SERVICE_TYPES[key]}>
                          {SERVICE_LABELS[SERVICE_TYPES[key]]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={filters.status} 
                    onValueChange={(value) => handleFilterChange('status', value)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL_STATUSES">All Statuses</SelectItem>
                      {Object.keys(REQUEST_STATUS).map((key) => (
                        <SelectItem key={key} value={REQUEST_STATUS[key]}>
                          {STATUS_CONFIG[REQUEST_STATUS[key]]?.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Input 
                      id="search" 
                      placeholder="Search..." 
                      value={filters.searchQuery}
                      onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                      className="pl-10"
                    />
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* Export Options */}
              <div className="mb-6">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <Button onClick={exportToExcel} className="flex items-center space-x-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    <span>Export Excel</span>
                  </Button>
                  
                  <Button onClick={exportToPDF} variant="outline" className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Export PDF</span>
                  </Button>
                  
                  <Button onClick={printReport} variant="outline" className="flex items-center space-x-2">
                    <Printer className="h-5 w-5" />
                    <span>Print</span>
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      setFilters({
                        dateFrom: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
                        dateTo: format(new Date(), 'yyyy-MM-dd'),
                        serviceType: '',
                        status: '',
                        searchQuery: ''
                      });
                      setPage(1);
                    }}
                    variant="ghost" 
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Reset</span>
                  </Button>
                </div>
                
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium text-primary mb-2 flex items-center">
                    <Filter className="h-4 w-4 mr-1" />
                    Select Columns for Export
                  </summary>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4 border rounded-md">
                    {[
                      { id: 'reference_number', label: 'Reference Number' },
                      { id: 'service_type', label: 'Service Type' },
                      { id: 'status', label: 'Status' },
                      { id: 'full_names', label: 'Customer Name' },
                      { id: 'primary_contact', label: 'Contact Number' },
                      { id: 'created_at', label: 'Created Date' },
                      { id: 'updated_at', label: 'Last Updated' },
                      { id: 'created_by', label: 'Created By' },
                      { id: 'assigned_to', label: 'Assigned To' }
                    ].map((column) => (
                      <div key={column.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`column-${column.id}`} 
                          checked={selectedColumns[column.id]}
                          onCheckedChange={(checked) => {
                            setSelectedColumns(prev => ({
                              ...prev,
                              [column.id]: !!checked
                            }));
                          }}
                        />
                        <Label 
                          htmlFor={`column-${column.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {column.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
              
              {/* Results Table */}
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort('reference_number')}
                      >
                        <div className="flex items-center">
                          Reference Number
                          {renderSortIcon('reference_number')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort('service_type')}
                      >
                        <div className="flex items-center">
                          Service Type
                          {renderSortIcon('service_type')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center">
                          Status
                          {renderSortIcon('status')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort('full_names')}
                      >
                        <div className="flex items-center">
                          Customer
                          {renderSortIcon('full_names')}
                        </div>
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        Contact
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hidden md:table-cell"
                        onClick={() => handleSort('created_at')}
                      >
                        <div className="flex items-center">
                          Created
                          {renderSortIcon('created_at')}
                        </div>
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Assigned To
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                          <span className="text-gray-500 dark:text-gray-400 mt-2 block">Loading requests...</span>
                        </TableCell>
                      </TableRow>
                    ) : requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <p className="text-gray-500 dark:text-gray-400">No requests found matching your filters.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      requests.map((request) => (
                        <TableRow key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <TableCell className="font-medium">{request.reference_number}</TableCell>
                          <TableCell>{SERVICE_LABELS[request.service_type] || request.service_type}</TableCell>
                          <TableCell>{renderStatusBadge(request.status)}</TableCell>
                          <TableCell>{request.full_names}</TableCell>
                          <TableCell className="hidden md:table-cell">{request.primary_contact}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {format(new Date(request.created_at), 'yyyy-MM-dd')}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {request.assigned_to?.fullname || 'Not assigned'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {requests.length} of {totalItems} results
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1 || loading}
                  >
                    Previous
                  </Button>
                  
                  <div className="text-sm">
                    Page {page} of {totalPages}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages || loading}
                  >
                    Next
                  </Button>
                </div>
                
                <div className="hidden sm:flex items-center space-x-2">
                  <Label htmlFor="page-size" className="text-sm">Show</Label>
                  <Select 
                    value={String(pageSize)} 
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger id="page-size" className="w-20">
                      <SelectValue placeholder={pageSize} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Performance Report Tab */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance Report</CardTitle>
              <CardDescription>
                Performance metrics for service agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">Performance Analytics</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
                  Coming soon. This report will include detailed performance metrics for service agents, including response time, completion rate, and customer satisfaction.
                </p>
                <Button variant="outline" disabled>
                  Under Development
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Scheduled Reports Tab */}
        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>
                Set up automatic report generation and delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">Automated Reporting</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
                  Coming soon. You'll be able to schedule reports to be automatically generated and sent to your email or other destinations on a regular basis.
                </p>
                <Button variant="outline" disabled>
                  Under Development
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityServicesReport;