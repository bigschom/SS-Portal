import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Calendar,
  Save,
  RefreshCw,
  AlertCircle,
  Loader2,
  Filter,
  Search,
  Building2,
  Users,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { useAuth } from '../../hooks/useAuth';
import apiService from '../../config/api-service'

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

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

const initialFormData = {
  dateReceived: '',
  referenceNumber: '',
  sender: '',
  otherSender: '',
  subject: '',
  otherSubject: '',
  status: 'Pending',
  responseDate: '',
  answeredBy: ''
}

const NewStakeHRequest = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [pageLoading, setPageLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [availableUsers, setAvailableUsers] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState(initialFormData)
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [senderOptions, setSenderOptions] = useState([])
  const [subjectOptions, setSubjectOptions] = useState([])
  const [toast, setToast] = useState(null)

  // Define fetchAvailableUsers as a useCallback hook
  const fetchAvailableUsers = useCallback(async () => {
    try {
      const users = await apiService.users.getAllActiveUsers();
      
      if (users.error) {
        throw new Error(users.error);
      }
      
      setAvailableUsers(users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('Failed to load users', 'error');
    }
  }, []);

  // Define fetchDropdownOptions as a useCallback hook
  const fetchDropdownOptions = useCallback(async () => {
    try {
      // This would need to be implemented in your API service
      const response = await apiService.stakeholderRequests.getOptions();
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setSenderOptions(response.senders || []);
      setSubjectOptions(response.subjects || []);
    } catch (error) {
      console.error('Error fetching options:', error);
      showToast('Failed to load dropdown options', 'error');
    }
  }, []);

  // First useEffect for initialization
  useEffect(() => {
    setInitialized(true);
  }, [user]);

  // Second useEffect for data initialization
  useEffect(() => {
    if (!initialized) return;

    const initializePage = async () => {
      try {
        await Promise.all([
          fetchAvailableUsers(),
          fetchDropdownOptions()
        ]);
      } catch (error) {
        console.error('Error initializing page:', error);
      } finally {
        setPageLoading(false);
      }
    };

    initializePage();
  }, [initialized, fetchAvailableUsers, fetchDropdownOptions]);

  // Show toast notification
  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      if (name === 'sender' && value !== 'Other') {
        newData.otherSender = '';
      }
      if (name === 'subject' && value !== 'Other') {
        newData.otherSubject = '';
      }
      if (name === 'status' && value === 'Pending') {
        newData.responseDate = '';
        newData.answeredBy = '';
      }
      
      return newData;
    });
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleDateChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: formatDate(value) }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.dateReceived) {
      newErrors.dateReceived = 'Date received is required';
    }
    if (!formData.referenceNumber) {
      newErrors.referenceNumber = 'Reference number is required';
    }
    if (!formData.sender) {
      newErrors.sender = 'Sender is required';
    }
    if (formData.sender === 'Other' && !formData.otherSender) {
      newErrors.otherSender = 'Please specify the sender';
    }
    if (!formData.subject) {
      newErrors.subject = 'Subject is required';
    }
    if (formData.subject === 'Other' && !formData.otherSubject) {
      newErrors.otherSubject = 'Please specify the subject';
    }
    if (formData.status === 'Answered') {
      if (!formData.responseDate) {
        newErrors.responseDate = 'Response date is required';
      }
      if (!formData.answeredBy) {
        newErrors.answeredBy = 'Please select who answered';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setIsSubmitting(true);
    setIsLoading(true);

    try {
      if (!user) {
        throw new Error('No user found. Please login again.');
      }

      const finalSender = formData.sender === 'Other' ? formData.otherSender.trim() : formData.sender;
      const finalSubject = formData.subject === 'Other' ? formData.otherSubject.trim() : formData.subject;

      const requestData = {
        date_received: formData.dateReceived,
        reference_number: formData.referenceNumber.trim(),
        sender: finalSender,
        subject: finalSubject,
        status: formData.status,
        response_date: formData.responseDate || null,
        answered_by: formData.answeredBy || null,
        created_by: user.username,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // This would need to be implemented in your API service
      const response = await apiService.stakeholderRequests.createRequest(requestData);
      
      if (response.error) {
        throw new Error(response.error);
      }

      await fetchDropdownOptions();
      
      showToast('Request has been saved successfully.', 'success');
      
      resetForm();
    } catch (error) {
      console.error('Error:', error);
      showToast(error.message || 'Failed to save request. Please check your input and try again.', 'error');
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setErrors({});
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A2647] dark:text-white" />
      </div>
    );
  }

  return (
// Form container styling
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
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        New Stakeholder Request
      </h2>
    </div>

    {/* Form */}
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form fields go here */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      Reference Number*
    </label>
    <input
      type="text"
      name="referenceNumber"
      value={formData.referenceNumber}
      onChange={handleInputChange}
      className={`w-full px-4 py-2 rounded-lg border ${
        errors.referenceNumber ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
      } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
      focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
    />
    {errors.referenceNumber && (
      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.referenceNumber}</p>
    )}
  </div>

  <div>
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
    Date Received*
  </label>
  <div className="relative w-full">
    <DatePicker
      selected={formData.dateReceived ? new Date(formData.dateReceived) : null}
      onChange={(date) => handleDateChange('dateReceived', date)}
      className={`w-full px-4 py-2 rounded-lg border ${
        errors.dateReceived ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
      } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
      focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
      dateFormat="yyyy-MM-dd"
      placeholderText="Select date"
      maxDate={new Date()}
      wrapperClassName="w-full" // This ensures the wrapper takes full width
    />
  </div>
  {errors.dateReceived && (
    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.dateReceived}</p>
  )}
</div>
</div>

{/* Sender and Subject on same line */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      Sender*
    </label>
    <select
      name="sender"
      value={formData.sender}
      onChange={handleInputChange}
      className={`w-full px-4 py-2 rounded-lg border ${
        errors.sender ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
      } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
      focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
    >
      <option value="">Select Sender</option>
      {senderOptions.map((sender, index) => (
        <option key={index} value={sender}>{sender}</option>
      ))}
      <option value="Other">Other</option>
    </select>
    {errors.sender && (
      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.sender}</p>
    )}
  </div>

  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      Subject*
    </label>
    <select
      name="subject"
      value={formData.subject}
      onChange={handleInputChange}
      className={`w-full px-4 py-2 rounded-lg border ${
        errors.subject ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
      } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
      focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
    >
      <option value="">Select Subject</option>
      {subjectOptions.map((subject, index) => (
        <option key={index} value={subject}>{subject}</option>
      ))}
      <option value="Other">Other</option>
    </select>
    {errors.subject && (
      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.subject}</p>
    )}
  </div>
</div>

{/* Other Sender and Other Subject rows (conditionally rendered) */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {formData.sender === 'Other' && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Specify Sender*
      </label>
      <input
        type="text"
        name="otherSender"
        value={formData.otherSender}
        onChange={handleInputChange}
        className={`w-full px-4 py-2 rounded-lg border ${
          errors.otherSender ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
        } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
        focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
      />
      {errors.otherSender && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.otherSender}</p>
      )}
    </motion.div>
  )}

  {formData.subject === 'Other' && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Specify Subject*
      </label>
      <input
        type="text"
        name="otherSubject"
        value={formData.otherSubject}
        onChange={handleInputChange}
        className={`w-full px-4 py-2 rounded-lg border ${
          errors.otherSubject ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
        } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
        focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
      />
      {errors.otherSubject && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.otherSubject}</p>
      )}
    </motion.div>
  )}
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
      <DatePicker
        selected={formData.responseDate ? new Date(formData.responseDate) : null}
        onChange={(date) => handleDateChange('responseDate', date)}
        className={`w-full px-4 py-2 rounded-lg border ${
          errors.responseDate ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
        } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
        focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
        dateFormat="yyyy-MM-dd"
        placeholderText="Select date"
        maxDate={new Date()}
      />
      {errors.responseDate && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.responseDate}</p>
      )}
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Answered By*
      </label>
      <select
        name="answeredBy"
        value={formData.answeredBy}
        onChange={handleInputChange}
        className={`w-full px-4 py-2 rounded-lg border ${
          errors.answeredBy ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
        } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
        focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
      >
        <option value="">Select User</option>
        {availableUsers.map(user => (
          <option key={user.id} value={user.username}>
            {user.full_name || user.username}
          </option>
        ))}
      </select>
      {errors.answeredBy && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.answeredBy}</p>
      )}
    </div>
  </div>
)}


        
        
        {/* Submit buttons */}
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={resetForm}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-lg mr-4 flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset Form
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-[#0A2647] dark:bg-white text-white dark:text-[#0A2647] rounded-lg
                     hover:bg-[#0A2647]/90 dark:hover:bg-gray-200 transition-colors
                     flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Request
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  </div>
</div>

                          );
                        };
                        
                        export default NewStakeHRequest;                        
