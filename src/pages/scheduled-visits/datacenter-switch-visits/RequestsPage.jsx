// src/pages/RequestsPage.jsx
import { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, CheckCircle, Calendar, X, Plus, Trash2 } from 'lucide-react';

const RequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [visitors, setVisitors] = useState([
    { name: '', idNumber: '', checkInTime: new Date().toISOString().slice(0, 16) }
  ]);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'requests'));
      const currentDate = new Date();

          // Get all non-expired requests
    let filteredRequests = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(req => {
        const endDate = new Date(req.accessEndDate);
        return endDate >= currentDate;
      });

          // Apply search if exists
    if (searchTerm) {
      filteredRequests = filteredRequests.filter(req => 
        req.requestNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
          // Apply status filter
    if (statusFilter === 'active') {
      filteredRequests = filteredRequests.filter(req => !req.checkedIn);
    } else if (statusFilter === 'checked') {
      filteredRequests = filteredRequests.filter(req => req.checkedIn);
    }

    setRequests(filteredRequests);
  } catch (error) {
    console.error('Error fetching requests:', error);
  } finally {
    setLoading(false);
  }
};

  // Add function to calculate remaining days
const getRemainingDays = (endDate) => {
  const end = new Date(endDate);
  const today = new Date();
  const diffTime = end - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};
      

  const handleCheckInClick = (requestId) => {
    setSelectedRequestId(requestId);
    setIsCheckInModalOpen(true);
    setVisitors([{ name: '', idNumber: '', checkInTime: new Date().toISOString().slice(0, 16) }]);
  };

  const addVisitor = () => {
    setVisitors([
      ...visitors,
      { name: '', idNumber: '', checkInTime: new Date().toISOString().slice(0, 16) }
    ]);
  };

  const removeVisitor = (index) => {
    setVisitors(visitors.filter((_, i) => i !== index));
  };

  const handleVisitorChange = (index, field, value) => {
    const updatedVisitors = visitors.map((visitor, i) => {
      if (i === index) {
        return { ...visitor, [field]: value };
      }
      return visitor;
    });
    setVisitors(updatedVisitors);
  };

  const handleCheckInSubmit = async () => {
    // Validate all fields are filled
    const isValid = visitors.every(visitor => 
      visitor.name.trim() && visitor.idNumber.trim() && visitor.checkInTime
    );

    if (!isValid) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await updateDoc(doc(db, 'requests', selectedRequestId), {
        checkInHistory: arrayUnion(...visitors.map(visitor => ({
          ...visitor,
          checkedBy: auth.currentUser.email,
          timestamp: new Date().toISOString()
        }))),
        checkedIn: true
      });
      
      setIsCheckInModalOpen(false);
      fetchRequests();
    } catch (error) {
      console.error('Error updating check-in:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Access Requests</CardTitle>
            <div className="flex space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-md"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-md px-4"
              >
                <option value="all">All Active Requests</option>
                <option value="active">Not Checked In</option>
                <option value="checked">Checked In</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
{requests.map((request) => (
  <div key={request.id} className="border rounded-lg p-4">
    <div className="flex justify-between items-start">
      <div>
        <div className="flex items-center space-x-2">
          <h3 className="font-medium">{request.requestNumber}</h3>
          {request.checkedIn && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
              Checked In
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600">{request.requestedFor}</p>
        <div className="mt-2 text-sm space-y-2">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-gray-500" />
            <span>
              Access Period: {new Date(request.accessStartDate).toLocaleDateString()} - {new Date(request.accessEndDate).toLocaleDateString()}
            </span>
            <span className="ml-2 text-orange-600 font-medium">
              ({getRemainingDays(request.accessEndDate)} days remaining)
            </span>
          </div>
          <p>Description: {request.description}</p>
        </div>
      </div>
      {/* Remove conditional rendering for the button */}
      <Button
        onClick={() => handleCheckInClick(request.id)}
        className="bg-green-600 hover:bg-green-700"
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        CheckIn
      </Button>
    </div>

    {request.checkInHistory && request.checkInHistory.length > 0 && (
      <div className="mt-4">
        <h4 className="font-medium mb-2">Check-in History</h4>
        <div className="space-y-2">
          {request.checkInHistory.map((checkIn, index) => (
            <div key={index} className="text-sm bg-gray-50 p-2 rounded">
              <p>Visitor: {checkIn.name} (ID: {checkIn.idNumber})</p>
              <p>Checked in: {new Date(checkIn.checkInTime).toLocaleString()}</p>
              <p>Verified by: {checkIn.checkedBy}</p>
            </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Check-in Modal */}
      {isCheckInModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
            <div className="bg-[#0A2647] text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
              <h2 className="text-xl font-semibold">Check-in Details</h2>
              <button onClick={() => setIsCheckInModalOpen(false)} className="text-white hover:text-gray-200">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">ID Number</th>
                      <th className="px-4 py-2 text-left">Check-in Time</th>
                      <th className="px-4 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitors.map((visitor, index) => (
                      <tr key={index} className="border-b">
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={visitor.name}
                            onChange={(e) => handleVisitorChange(index, 'name', e.target.value)}
                            className="w-full p-2 border rounded"
                            placeholder="Visitor Name"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={visitor.idNumber}
                            onChange={(e) => handleVisitorChange(index, 'idNumber', e.target.value)}
                            className="w-full p-2 border rounded"
                            placeholder="ID Number"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="datetime-local"
                            value={visitor.checkInTime}
                            onChange={(e) => handleVisitorChange(index, 'checkInTime', e.target.value)}
                            className="w-full p-2 border rounded"
                          />
                        </td>
                        <td className="px-4 py-2">
                          {visitors.length > 1 && (
                            <button
                              onClick={() => removeVisitor(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 size={20} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={addVisitor}
                className="mt-4 flex items-center text-[#0A2647] hover:text-[#0A2647]/80"
              >
                <Plus size={20} className="mr-2" />
                Add Another Person
              </button>
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-4">
              <Button
                variant="outline"
                onClick={() => setIsCheckInModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCheckInSubmit}
                className="bg-[#0A2647] hover:bg-[#0A2647]/90"
              >
                Submit Check-in
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestsPage;