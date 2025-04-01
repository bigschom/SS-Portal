import { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Download, FileText, Filter, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '@/hooks/useAuth';

const ExportModal = ({
  showDateModal,
  setShowDateModal,
  dateRange,
  setDateRange,
  selectedExportType,
  handleExport
}) => {
  if (!showDateModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold mb-4">Select Date Range</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({...prev, startDate: e.target.value}))}
              className="w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({...prev, endDate: e.target.value}))}
              className="w-full border rounded p-2"
            />
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={() => setShowDateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport}>
              Export
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Reports = () => {
  const { userData } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: 'all',
    status: 'all',
    requestedBy: 'all',
    searchTerm: ''
  });
  const [summaryStats, setSummaryStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    checkedIn: 0
  });
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedExportType, setSelectedExportType] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  const canExport = () => {
    return userData?.role === 'admin' || userData?.role === 'user';
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const requestsRef = collection(db, 'requests');
      const snapshot = await getDocs(requestsRef);
      const requestData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setRequests(requestData);
      calculateStats(requestData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const currentDate = new Date();
    
    const stats = {
      total: data.length,
      active: data.filter(req => new Date(req.accessEndDate) >= currentDate).length,
      expired: data.filter(req => new Date(req.accessEndDate) < currentDate).length,
      checkedIn: data.filter(req => req.checkedIn).length,
      uniqueRequestors: new Set(data.map(req => req.requestedFor)).size
    };

    setSummaryStats(stats);
  };

  const getFilteredData = () => {
    return requests.filter(req => {
      // Date range filter
      const matchesDateRange = !dateRange.startDate || !dateRange.endDate || (
        new Date(req.accessStartDate) >= new Date(dateRange.startDate) &&
        new Date(req.accessStartDate) <= new Date(dateRange.endDate)
      );

      // Status filter
      const endDate = new Date(req.accessEndDate);
      const currentDate = new Date();
      const isActive = endDate >= currentDate;
      const matchesStatus = 
        filters.status === 'all' ? true :
        filters.status === 'active' ? isActive :
        filters.status === 'expired' ? !isActive :
        filters.status === 'checkedIn' ? req.checkedIn : true;

      // Requestor filter
      const matchesRequestor = 
        filters.requestedBy === 'all' ? true :
        req.requestedFor === filters.requestedBy;

      // Search filter
      const matchesSearch = 
        filters.searchTerm === '' ? true :
        req.requestNumber.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        req.requestedFor.toLowerCase().includes(filters.searchTerm.toLowerCase());

      return matchesDateRange && matchesStatus && matchesRequestor && matchesSearch;
    });
  };

  const exportToExcel = () => {
    const filteredData = getFilteredData();
    const exportData = requests.map(req => ({
      'Request Number': req.requestNumber,
      'Requested For': req.requestedFor,
      'Start Date': new Date(req.accessStartDate).toLocaleDateString(),
      'End Date': new Date(req.accessEndDate).toLocaleDateString(),
      'Status': new Date(req.accessEndDate) >= new Date() ? 'Active' : 'Expired',
      'Description': req.description,
      'Total Check-ins': req.checkInHistory?.length || 0,
      'Last Check-in': req.checkInHistory?.length ? 
        new Date(req.checkInHistory[req.checkInHistory.length - 1].checkInTime).toLocaleString() : 'N/A',
      'Check-in Details': req.checkInHistory?.map(ch => 
        `${ch.name} (ID: ${ch.idNumber}) - ${new Date(ch.checkInTime).toLocaleString()}`
      ).join('; ') || 'No check-ins',
      'Created By': req.uploadedBy,
      'Created Date': new Date(req.createdAt).toLocaleDateString(),
      'Access Duration (Days)': Math.ceil((new Date(req.accessEndDate) - new Date(req.accessStartDate)) / (1000 * 60 * 60 * 24)),
      'Remaining Days': Math.ceil((new Date(req.accessEndDate) - new Date()) / (1000 * 60 * 60 * 24))
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Access Requests');
    XLSX.writeFile(wb, `access_requests_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const filteredData = getFilteredData();
    const doc = new jsPDF();
    
    // Add Title and Header
    doc.setFontSize(20);
    doc.setTextColor(10, 38, 71);
    doc.text('Access Request Report', 15, 20);
    
    // Add Summary Statistics
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text([
      `Generated: ${new Date().toLocaleString()}`,
      `Total Requests: ${summaryStats.total}`,
      `Active Requests: ${summaryStats.active}`,
      `Expired Requests: ${summaryStats.expired}`,
      `Total Check-ins: ${requests.reduce((sum, req) => sum + (req.checkInHistory?.length || 0), 0)}`
    ], 15, 35);

    // Add Bar Chart
    const chartData = getChartData();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    // Create chart using canvas
    // Convert to image and add to PDF
    const chartImg = canvas.toDataURL('image/png');
    doc.addImage(chartImg, 'PNG', 15, 80, 180, 100);

    // Add Request Table
    doc.autoTable({
      startY: 190,
      head: [[
        'Request #',
        'Requested For',
        'Status',
        'Access Period',
        'Check-ins'
      ]],
      body: requests.map(req => [
        req.requestNumber,
        req.requestedFor,
        new Date(req.accessEndDate) >= new Date() ? 'Active' : 'Expired',
        `${new Date(req.accessStartDate).toLocaleDateString()} - ${new Date(req.accessEndDate).toLocaleDateString()}`,
        req.checkInHistory?.length || 0
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [10, 38, 71] }
    });

    // Add Check-in Details
    const requestsWithCheckins = requests.filter(req => req.checkInHistory?.length > 0);
    if (requestsWithCheckins.length > 0) {
      doc.addPage();
      doc.text('Check-in Details', 15, 20);
      
      requestsWithCheckins.forEach((req, index) => {
        doc.autoTable({
          startY: index === 0 ? 30 : doc.lastAutoTable.finalY + 10,
          head: [[`Request ${req.requestNumber} - ${req.requestedFor}`]],
          body: req.checkInHistory.map(ch => [[
            `Visitor: ${ch.name}`,
            `ID: ${ch.idNumber}`,
            `Time: ${new Date(ch.checkInTime).toLocaleString()}`,
            `Verified by: ${ch.checkedBy}`
          ].join(' | ')]),
          styles: { fontSize: 8 }
        });
      });
    }

    doc.save(`access_requests_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const getChartData = () => {
    const filteredData = getFilteredData();
    const monthlyData = filteredData.reduce((acc, req) => {
      const month = new Date(req.createdAt).toLocaleString('default', { month: 'long' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(monthlyData).map(([month, count]) => ({
      month,
      requests: count
    }));
  };

  const handleExport = () => {
    if (selectedExportType === 'excel') {
      exportToExcel();
    } else {
      exportToPDF();
    }
    setShowDateModal(false);
  };

  if (loading) return <div className="p-8 text-center">Loading reports...</div>;

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#0A2647]">Access Request Reports</h1>
        {canExport() && (
          <div className="flex space-x-3">
            <Button onClick={() => {
              setSelectedExportType('excel');
              setShowDateModal(true);
            }}>
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
            <Button onClick={() => {
              setSelectedExportType('pdf');
              setShowDateModal(true);
            }}>
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        )}
      </div>

      <ExportModal
        showDateModal={showDateModal}
        setShowDateModal={setShowDateModal}
        dateRange={dateRange}
        setDateRange={setDateRange}
        selectedExportType={selectedExportType}
        handleExport={handleExport}
      />

      {/* Summary Stats */}
      <div className="flex justify-center gap-6">
        <Card className="w-64">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-600">Total Requests</h3>
              <p className="text-4xl font-bold text-[#0A2647] mt-2">{summaryStats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="w-64">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-600">Active Requests</h3>
              <p className="text-4xl font-bold text-green-600 mt-2">{summaryStats.active}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                className="w-full border rounded-md p-2"
              >
                <option value="all">All Time</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full border rounded-md p-2"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="checkedIn">Checked In</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Requested By</label>
              <select
                value={filters.requestedBy}
                onChange={(e) => setFilters({...filters, requestedBy: e.target.value})}
                                className="w-full border rounded-md p-2"
              >
                <option value="all">All Users</option>
                {Array.from(new Set(requests.map(req => req.requestedFor)))
                  .sort()
                  .map(user => (
                    <option key={user} value={user}>{user}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                  placeholder="Search requests..."
                  className="w-full pl-10 pr-4 py-2 border rounded-md"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Request Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="requests" fill="#0A2647" name="Requests" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Active', value: summaryStats.active },
                      { name: 'Expired', value: summaryStats.expired }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#0A2647"
                    dataKey="value"
                    label
                  >
                    <Cell fill="#0A2647" />
                    <Cell fill="#EF4444" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;