import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  XCircle
} from 'lucide-react';
import apiService from '../../config/api-service';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/button';

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

const UpdateRequest = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();
  
  // Form states
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    reference_number: '',
    date_received: '',
    sender: '',
    subject: '',
    status: 'Pending',
    response_date: '',
    answered_by: ''
  });

  // Show toast notification
  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Initialize component
  useEffect(() => {
    const initializePage = async () => {
      if (id) {
        await fetchRequestById(id);
      } else {
        // If no ID provided, redirect to the list page
        navigate('/all-stake-holder-request');
      }
    };
    
    initializePage();
  }, [id]);

  //To fetch users
  const fetchUsers = async () => {
    try {
      const response = await apiService.users.getAllActiveUsers();
      if (response.error) {
        console.error('Error fetching users:', response.error);
        return;
      }
      setUsers(response || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };
  
  // Call fetchUsers in useEffect
  useEffect(() => {
    const initializePage = async () => {
      await fetchUsers(); // Fetch users first
      
      if (id) {
        await fetchRequestById(id);
      } else {
        // If no ID provided, redirect to the list page
        navigate('/all-stake-holder-request');
      }
    };
    
    initializePage();
  }, [id]);
  
  // Modify handleInputChange to handle the user selection
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'answered_by') {
      // Find the selected user
      const selectedUserObj = users.find(user => user.id === parseInt(value) || user.id === value);
      if (selectedUserObj) {
        setSelectedUserId(value);
        // Save the username in the form data
        setFormData(prev => ({ ...prev, [name]: selectedUserObj.username }));
      } else {
        setSelectedUserId('');
        setFormData(prev => ({ ...prev, [name]: '' }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  
    // Clear error for this field if exists
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Fetch request by ID
  const fetchRequestById = async (requestId) => {
    try {
      setIsLoading(true);
      
      // Get all requests and find the one with matching ID
      const allRequests = await apiService.stakeholderRequests.getAllRequests();
      
      if (allRequests.error) {
        throw new Error(allRequests.error);
      }
      
      const request = allRequests.find(req => req.id === parseInt(requestId));
      
      if (!request) {
        throw new Error('Request not found');
      }
      
      setSelectedRequest(request);
      
      // If there's an answered_by value, find the corresponding user
      if (request.answered_by && users.length > 0) {
        const matchingUser = users.find(user => user.username === request.answered_by);
        if (matchingUser) {
          setSelectedUserId(matchingUser.id.toString());
        }
      }
      
      setFormData({
        reference_number: request.reference_number || '',
        date_received: request.date_received ? new Date(request.date_received).toISOString().split('T')[0] : '',
        sender: request.sender || '',
        subject: request.subject || '',
        status: request.status || 'Pending',
        response_date: request.response_date ? new Date(request.response_date).toISOString().split('T')[0] : '',
        answered_by: request.answered_by || ''
      });
    } catch (error) {
      console.error('Error fetching request details:', error);
      showToast('Failed to load request details.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.reference_number) newErrors.reference_number = 'Reference number is required';
    if (!formData.date_received) newErrors.date_received = 'Date received is required';
    if (!formData.sender) newErrors.sender = 'Sender is required';
    if (!formData.subject) newErrors.subject = 'Subject is required';
    
    // If status is Answered, response date and answered by are required
    if (formData.status === 'Answered') {
      if (!formData.response_date) newErrors.response_date = 'Response date is required for answered requests';
      if (!formData.answered_by) newErrors.answered_by = 'Answered by is required for answered requests';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!validateForm()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
  
    if (!user?.id) {
      showToast('User session expired. Please log in again.', 'error');
      return;
    }
  
    setIsLoading(true);
    try {
      const updateData = {
        ...formData,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      };
      
      const response = await apiService.stakeholderRequests.updateRequest(
        selectedRequest.id, 
        updateData
      );
  
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Show success toast
      showToast('Stakeholder request updated successfully', 'success');
      
      // Navigate back after a short delay
      setTimeout(() => {
        navigate('/all-stake-holder-request');
      }, 3000);
      
    } catch (error) {
      console.error('Update error:', error);
      showToast(error.message || 'An error occurred during update', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate('/all-stake-holder-request');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <Button
          onClick={handleGoBack}
          variant="ghost"
          className="mb-6 flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to All Requests
        </Button>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Update Stakeholder Request
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Status:</span>
            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-[#0A2647] dark:text-white">
              {formData.status}
            </span>
          </div>
        </div>

        {/* Edit Form */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[#0A2647] dark:text-white" />
          </div>
        ) : selectedRequest ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Reference Number and Date Received on same line */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reference Number*
                  </label>
                  <input
                    type="text"
                    name="reference_number"
                    value={formData.reference_number}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.reference_number ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
                    } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
                  />
                  {errors.reference_number && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.reference_number}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date Received*
                  </label>
                  <input
                    type="date"
                    name="date_received"
                    value={formData.date_received}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.date_received ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
                    } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
                  />
                  {errors.date_received && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date_received}</p>
                  )}
                </div>
              </div>

              {/* Sender and Subject on same line */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sender*
                  </label>
                  <input
                    type="text"
                    name="sender"
                    value={formData.sender}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.sender ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
                    } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
                  />
                  {errors.sender && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.sender}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject*
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.subject ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
                    } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
                  />
                  {errors.subject && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.subject}</p>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.status ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
                  } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
                >
                  <option value="Pending">Pending</option>
                  <option value="Answered">Answered</option>
                </select>
                {errors.status && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.status}</p>
                )}
              </div>

              {/* Response Date and Answered By - Only shown if status is Answered */}
              {formData.status === 'Answered' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Response Date*
                    </label>
                    <input
                      type="date"
                      name="response_date"
                      value={formData.response_date}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        errors.response_date ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
                      } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                      focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
                    />
                    {errors.response_date && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.response_date}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Answered By*
                    </label>
                    <select
                      name="answered_by"
                      value={selectedUserId}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        errors.answered_by ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
                      } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                      focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
                    >
                      <option value="">Select User</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id.toString()}>
                          {user.full_name}
                        </option>
                      ))}
                    </select>
                    {errors.answered_by && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.answered_by}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-[#0A2647] dark:bg-white text-white dark:text-[#0A2647] rounded-lg
                           hover:bg-[#0A2647]/90 dark:hover:bg-gray-200 transition-colors
                           flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Update
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
            <p className="text-gray-600 dark:text-gray-300">Request not found or failed to load.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateRequest;