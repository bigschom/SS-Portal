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
  Clock
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { useAuth } from '../../hooks/useAuth';
import apiService from '../../config/api-service'

// Alert/Popup Component
const Alert = ({ message, type = 'error', onClose, onConfirm }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 50 }}
    className={`fixed bottom-4 right-4 z-50 px-6 py-4 rounded-xl shadow-lg
      ${type === 'success' 
        ? 'bg-black text-white dark:bg-white dark:text-black' 
        : 'bg-red-500 text-white'
      }
      transition-colors duration-300`}
  >
    <div className="flex items-center space-x-4">
      <span>{message}</span>
      {onConfirm && (
        <div className="flex space-x-2">
          <button 
            onClick={onConfirm} 
            className="px-3 py-1 bg-white/30 hover:bg-white/40 rounded-lg"
          >
            Confirm
          </button>
          <button 
            onClick={onClose} 
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg"
          >
            Cancel
          </button>
        </div>
      )}
      {!onConfirm && (
        <button 
          onClick={onClose} 
          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg"
        >
          Close
        </button>
      )}
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
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState('error')
  const [alertConfirmAction, setAlertConfirmAction] = useState(null)

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
      showErrorAlert('Failed to load users');
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
      showErrorAlert('Failed to load dropdown options');
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

  // Show success alert
  const showSuccessAlert = (message, confirmAction = null) => {
    setAlertMessage(message);
    setAlertType('success');
    setShowAlert(true);
    setAlertConfirmAction(confirmAction);
  
    // Automatically remove alert after 3 seconds if no confirm action
    if (!confirmAction) {
      setTimeout(() => {
        setShowAlert(false);
        // Reset the form instead of navigating
        resetForm();
      }, 3000);
    }
  };

  // Close alert handler
  const handleCloseAlert = () => {
    setShowAlert(false);
    if (alertConfirmAction) {
      alertConfirmAction();
    } else {
      // Reset the form instead of navigating
      resetForm();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showErrorAlert('Please fill in all required fields');
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
      
      showSuccessAlert('Request has been saved successfully.');
      
      resetForm();
    } catch (error) {
      console.error('Error:', error);
      showErrorAlert(error.message || 'Failed to save request. Please check your input and try again.');
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

// Only updating the return section to adjust the layout
return (
    <div className="p-6">
      <div className="flex justify-center">
        <div className="w-full max-w-[70%]"> {/* Reduced width to 70% */}
          <div className="flex flex-col space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                New Stakeholder Request
              </h1>
            </div>
  
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Request Information Card - Left Side */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="dark:bg-gray-800 h-full">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium dark:text-white flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-[#0A2647] dark:text-blue-400" />
                        Request Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Date Received and Reference Number on same line */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Date Received*
                          </label>
                          <div className="relative">
                            <DatePicker
                              selected={formData.dateReceived ? new Date(formData.dateReceived) : null}
                              onChange={(date) => handleDateChange('dateReceived', date)}
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                              dateFormat="yyyy-MM-dd"
                              placeholderText="Select date"
                              maxDate={new Date()}
                            />
                          </div>
                          {errors.dateReceived && (
                            <p className="mt-1 text-sm text-red-500">{errors.dateReceived}</p>
                          )}
                        </div>
  
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Reference Number*
                          </label>
                          <input
                            type="text"
                            name="referenceNumber"
                            value={formData.referenceNumber}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                          />
                          {errors.referenceNumber && (
                            <p className="mt-1 text-sm text-red-500">{errors.referenceNumber}</p>
                          )}
                        </div>
                      </div>
  
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Sender*
                        </label>
                        <select
                          name="sender"
                          value={formData.sender}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        >
                          <option value="">Select Sender</option>
                          {senderOptions.map((sender, index) => (
                            <option key={index} value={sender}>{sender}</option>
                          ))}
                          <option value="Other">Other</option>
                        </select>
                        {errors.sender && (
                          <p className="mt-1 text-sm text-red-500">{errors.sender}</p>
                        )}
                      </div>
  
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
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                          />
                          {errors.otherSender && (
                            <p className="mt-1 text-sm text-red-500">{errors.otherSender}</p>
                          )}
                        </motion.div>
                      )}
  
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Subject*
                        </label>
                        <select
                          name="subject"
                          value={formData.subject}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        >
                          <option value="">Select Subject</option>
                          {subjectOptions.map((subject, index) => (
                            <option key={index} value={subject}>{subject}</option>
                          ))}
                          <option value="Other">Other</option>
                        </select>
                        {errors.subject && (
                          <p className="mt-1 text-sm text-red-500">{errors.subject}</p>
                        )}
                      </div>
  
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
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                          />
                          {errors.otherSubject && (
                            <p className="mt-1 text-sm text-red-500">{errors.otherSubject}</p>
                          )}
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
  
                {/* Response Information Card - Right Side */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Card className="dark:bg-gray-800 h-full">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium dark:text-white flex items-center">
                        <Users className="w-5 h-5 mr-2 text-[#0A2647] dark:text-blue-400" />
                        Response Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Status
                        </label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Answered">Answered</option>
                        </select>
                      </div>
  
                      <AnimatePresence>
                        {formData.status === 'Answered' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            {/* Response Date and Answered By on same line */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Response Date*
                                </label>
                                <div className="relative">
                                  <DatePicker
                                    selected={formData.responseDate ? new Date(formData.responseDate) : null}
                                    onChange={(date) => handleDateChange('responseDate', date)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                    dateFormat="yyyy-MM-dd"
                                    placeholderText="Select date"
                                    maxDate={new Date()}
                                  />
                                </div>
                                {errors.responseDate && (
                                  <p className="mt-1 text-sm text-red-500">{errors.responseDate}</p>
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
                                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                >
                                  <option value="">Select User</option>
                                  {availableUsers.map((user) => (
                                    <option key={user.id} value={user.username}>{user.full_name || user.username}</option>
                                  ))}
                                </select>
                                {errors.answeredBy && (
                                  <p className="mt-1 text-sm text-red-500">{errors.answeredBy}</p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
  
                      {/* Empty space to balance the card heights */}
                      <div className="flex-grow"></div>
  
                      {/* Buttons - Reset and Save side by side */}
                      <motion.div 
                        className="pt-4 mt-auto"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <div className="flex space-x-4">
                          <Button
                            type="button"
                            onClick={resetForm}
                            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reset Form
                          </Button>
                          <Button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 bg-[#0A2647] hover:bg-[#0A2647]/90 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Request
                              </>
                            )}
                          </Button>
                        </div>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </form>
          </div>
        </div>
      </div>
  
      {/* Alert Popup */}
      <AnimatePresence>
        {showAlert && (
          <Alert 
            message={alertMessage} 
            type={alertType}
            onClose={handleCloseAlert}
            onConfirm={alertConfirmAction ? handleCloseAlert : null}
          />
        )}
      </AnimatePresence>
    </div>
  );
  
  };
  
  export default NewStakeHRequest;
  
