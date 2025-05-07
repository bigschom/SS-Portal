import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save,
  Loader2,
  AlertCircle,
  Info,
  XCircle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import debounce from 'lodash/debounce';
import apiService from '../../config/api-service';

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
         <Info className="w-5 h-5 text-white" />}
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

const NewInternshipRequest = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // States
  const [pageLoading, setPageLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');
  const [errors, setErrors] = useState({});
  const [duplicateIdFound, setDuplicateIdFound] = useState(false);
  const [idCheckLoading, setIdCheckLoading] = useState(false);
  const [departmentsList, setDepartmentsList] = useState([]);
  
  const [formData, setFormData] = useState({
    full_names: '',
    citizenship: '',
    id_passport_number: '',
    passport_expiry_date: '',
    department_id: '',
    date_start: '',
    date_end: '',
    work_with: '',
    contact_number: '',
    additional_info: '',
    status: 'Active'
  });

  // Initialize component
  useEffect(() => {
    const initializePage = async () => {
      try {
        await fetchDepartments();
      } catch (error) {

      } finally {
        setPageLoading(false);
      }
    };

    initializePage();
  }, []);

  // Check for duplicate ID
  const checkForDuplicateId = debounce(async (idNumber) => {
    if (!idNumber) return;
    
    setIdCheckLoading(true);
    try {
      const result = await apiService.internships.checkDuplicateId(idNumber);
      
      if (result.error) {

        return;
      }
      
      setDuplicateIdFound(result.exists);
    } catch (error) {

    } finally {
      setIdCheckLoading(false);
    }
  }, 500);

  const fetchDepartments = async () => {
    try {
      setIsLoading(true);
  
      
      // Use the internship API
      const departmentResult = await apiService.internships.getDepartments();
      setDepartmentsList(departmentResult || []);
      
    } catch (error) {
 
      showErrorToast('Failed to load departments.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show error toast
  const showErrorToast = (message) => {
    setToastMessage(message);
    setToastType('error');
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'id_passport_number') {
      setFormData(prev => ({ ...prev, [name]: value }));
      checkForDuplicateId(value);
    } else if (name === 'citizenship') {
      const formattedValue = value.trim();
      const lowerCaseValue = formattedValue.toLowerCase();
      if (['rwanda', 'rwandan'].includes(lowerCaseValue)) {
        const capitalizedValue = formattedValue.charAt(0).toUpperCase() + formattedValue.slice(1).toLowerCase();
        setFormData(prev => ({
          ...prev,
          [name]: capitalizedValue,
          passport_expiry_date: ''
        }));
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error for this field if exists
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.full_names) newErrors.full_names = 'Full names are required';
    if (!formData.citizenship) newErrors.citizenship = 'Citizenship is required';
    if (!formData.id_passport_number) newErrors.id_passport_number = 'ID/Passport number is required';
    
    // Passport expiry date for non-Rwandans
    const citizenshipLower = formData.citizenship?.trim().toLowerCase();
    if (formData.citizenship && !['rwanda', 'rwandan'].includes(citizenshipLower) && !formData.passport_expiry_date) {
      newErrors.passport_expiry_date = 'Passport expiry date is required';
    }
    
    if (!formData.department_id) newErrors.department_id = 'Department is required';
    if (!formData.date_start) newErrors.date_start = 'Start date is required';
    if (!formData.date_end) newErrors.date_end = 'End date is required';
    if (!formData.work_with) newErrors.work_with = 'Supervisor is required';
    if (!formData.contact_number) newErrors.contact_number = 'Contact number is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (duplicateIdFound) {
      showErrorToast('This ID/Passport number already exists in the system');
      return;
    }
  
    if (!validateForm()) {
      showErrorToast('Please fill in all required fields');
      return;
    }
  
    if (!user?.username) {
      showErrorToast('User session expired. Please log in again.');
      return;
    }
  
    setIsLoading(true);
    try {
      const selectedDepartment = departmentsList.find(dept => dept.id === parseInt(formData.department_id));
  
      // Format dates properly for database
      const formatDate = (dateString) => {
        return dateString ? new Date(dateString).toISOString().split('T')[0] : null;
      };
  
      const submissionData = {
        full_names: formData.full_names.trim(),
        citizenship: formData.citizenship.trim(),
        id_passport_number: formData.id_passport_number.trim(),
        passport_expiry_date: formatDate(formData.passport_expiry_date),
        department_id: parseInt(formData.department_id),
        department_name: selectedDepartment?.name || '',
        status: 'Active',
        date_start: formatDate(formData.date_start),
        date_end: formatDate(formData.date_end),
        work_with: formData.work_with?.trim() || null,
        contact_number: formData.contact_number?.trim() || null,
        additional_info: formData.additional_info?.trim() || null,
        created_by: user.username
      };
  

  
      // Use the internship API
      const result = await apiService.internships.createInternship(submissionData);
  
      if (result.error) {
   
        throw new Error(result.error);
      }
      

      showSuccessToast('Internship request submitted successfully');
      
      // Reset form after successful submission
      resetForm();
    } catch (error) {

      showErrorToast(error.message || 'An error occurred during submission');
    } finally {
      setIsLoading(false);
    }
  };

  const showSuccessToast = (message) => {
    setToastMessage(message);
    setToastType('success');
    setShowToast(true);
  
    // Automatically remove toast after 3 seconds
    setTimeout(() => {
      setShowToast(false);
      // Reset the form
      resetForm();
    }, 3000);
  };

  // Close toast handler
  const handleCloseToast = () => {
    setShowToast(false);
    if (toastType === 'success') {
      // Reset the form if it was a success toast
      resetForm();
    }
  };

  const resetForm = () => {
    // Reset the formData state to its initial values
    setFormData({
      full_names: '',
      citizenship: '',
      id_passport_number: '',
      passport_expiry_date: '',
      department_id: '',
      date_start: '',
      date_end: '',
      work_with: '',
      contact_number: '',
      additional_info: '',
      status: 'Active'
    });
    
    // Reset any validation states
    setErrors({});
    setDuplicateIdFound(false);
    
    // Scroll to top of form
    window.scrollTo(0, 0);
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A2647] dark:text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <Toast 
            message={toastMessage} 
            type={toastType}
            onClose={handleCloseToast}
          />
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left Panel - Personal Information */}
  <div className="lg:col-span-4">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 space-y-6"
    >
      <h2 className="text-xl font-semibold mb-4 dark:text-white">Personal Information</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Full names*
          </label>
          <input
            type="text"
            name="full_names"
            placeholder="Full names"
            value={formData.full_names}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 rounded-lg border 
                      ${errors.full_names ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                      bg-white dark:bg-gray-800 dark:text-white
                      focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
          />
          {errors.full_names && (
            <p className="mt-1 text-sm text-red-500">{errors.full_names}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Citizenship*
          </label>
          <input
            type="text"
            name="citizenship"
            placeholder="Citizenship"
            value={formData.citizenship}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 rounded-lg border 
                      ${errors.citizenship ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                      bg-white dark:bg-gray-800 dark:text-white
                      focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
          />
          {errors.citizenship && (
            <p className="mt-1 text-sm text-red-500">{errors.citizenship}</p>
          )}
        </div>
        
        <div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ID or Passport Number*
            </label>
            <input
              type="text"
              name="id_passport_number"
              placeholder="ID or Passport Number"
              value={formData.id_passport_number}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 rounded-lg border 
                        ${errors.id_passport_number || duplicateIdFound ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                        bg-white dark:bg-gray-800 dark:text-white
                        focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
            />
            {idCheckLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>
          {errors.id_passport_number && (
            <p className="mt-1 text-sm text-red-500">{errors.id_passport_number}</p>
          )}
          {duplicateIdFound && (
            <p className="mt-1 text-sm text-red-500">
              This ID/Passport number already exists in the system
            </p>
          )}
        </div>
        
        {/* Passport Expiry Date for non-Rwandan citizens */}
        {!['rwanda', 'rwandan'].includes(formData.citizenship?.toLowerCase()) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Passport Expiry Date*
            </label>
            <input
              type="date"
              name="passport_expiry_date"
              value={formData.passport_expiry_date}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 rounded-lg border 
                        ${errors.passport_expiry_date ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                        bg-white dark:bg-gray-800 dark:text-white
                        focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
            />
            {errors.passport_expiry_date && (
              <p className="mt-1 text-sm text-red-500">{errors.passport_expiry_date}</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  </div>
  
  {/* Right Panel - Department and Internship Details */}
  <div className="lg:col-span-8">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 space-y-6"
    >
      <h2 className="text-xl font-semibold mb-4 dark:text-white">Internship Details</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Department*
          </label>
          <select
            name="department_id"
            value={formData.department_id}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 rounded-lg border 
                      ${errors.department_id ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                      bg-white dark:bg-gray-800 dark:text-white
                      focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
          >
            <option value="">Select Department</option>
            {departmentsList.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
          {errors.department_id && (
            <p className="mt-1 text-sm text-red-500">{errors.department_id}</p>
          )}
        </div>
      </div>
      
      {/* Additional Information Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
        className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Start Date*
          </label>
          <input
            type="date"
            name="date_start"
            value={formData.date_start}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 rounded-lg border 
                      ${errors.date_start ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                      bg-white dark:bg-gray-800 dark:text-white
                      focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
          />
          {errors.date_start && (
            <p className="mt-1 text-sm text-red-500">{errors.date_start}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            End Date*
          </label>
          <input
            type="date"
            name="date_end"
            value={formData.date_end}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 rounded-lg border 
                      ${errors.date_end ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                      bg-white dark:bg-gray-800 dark:text-white
                      focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
          />
          {errors.date_end && (
            <p className="mt-1 text-sm text-red-500">{errors.date_end}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Supervisor*
          </label>
          <input
            type="text"
            name="work_with"
            placeholder="Enter supervisor name"
            value={formData.work_with}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 rounded-lg border 
                      ${errors.work_with ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                      bg-white dark:bg-gray-800 dark:text-white
                      focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
          />
          {errors.work_with && (
            <p className="mt-1 text-sm text-red-500">{errors.work_with}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Contact Number*
          </label>
          <input
            type="text"
            name="contact_number"
            placeholder="Enter contact number"
            value={formData.contact_number}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 rounded-lg border 
                      ${errors.contact_number ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                      bg-white dark:bg-gray-800 dark:text-white
                      focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
          />
          {errors.contact_number && (
            <p className="mt-1 text-sm text-red-500">{errors.contact_number}</p>
          )}
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Additional Details
          </label>
          <textarea
            name="additional_info"
            placeholder="Enter any additional details or notes about this internship..."
            value={formData.additional_info}
            onChange={handleInputChange}
            rows={4}
            className={`w-full px-4 py-2 rounded-lg border 
                      ${errors.additional_info ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                      bg-white dark:bg-gray-800 dark:text-white
                      focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
          />
          {errors.additional_info && (
            <p className="mt-1 text-sm text-red-500">{errors.additional_info}</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  </div>
  
  {/* Submit Button - Full Width */}
  <div className="lg:col-span-12">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
      className="flex justify-end mt-4"
    >
      <button
        type="submit"
        disabled={isLoading || duplicateIdFound}
        className={`px-6 py-3 bg-[#0A2647] dark:bg-white text-white dark:text-[#0A2647] rounded-lg
                    hover:bg-[#0A2647]/90 dark:hover:bg-gray-100 transition-colors
                    flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Submitting...</span>
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            <span>Submit Internship Request</span>
          </>
        )}
      </button>
    </motion.div>
  </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewInternshipRequest;