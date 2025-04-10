import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save,
  Loader2,
  AlertCircle,
  Info
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import debounce from 'lodash/debounce';
import apiService from '../../config/api-service';
import { ROLE_TYPES } from '../../constants/roleTypes';

// Toast Notification Component (similar to VisitorForm)
const Toast = ({ message, type = 'error', onClose }) => (
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
      <button 
        onClick={onClose} 
        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg"
      >
        Close
      </button>
    </div>
  </motion.div>
);

const NewRequest = () => {
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
    role_type: '',
    submitted_date: '',
    status: 'Pending',
    requested_by: '',
    from_company: '',
    duration: '',
    operating_country: '',
    date_start: '',
    date_end: '',
    work_with: '',
    additional_info: '',
    contact_number: ''
  });

  useEffect(() => {
    const initializePage = async () => {
      try {
        await fetchDepartments();
      } catch (error) {
        console.error('Error initializing page:', error);
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
      const result = await apiService.backgroundChecks.checkDuplicateId(idNumber);
      
      if (result.error) {
        console.error('Error checking for duplicate ID:', result.error);
        return;
      }
      
      setDuplicateIdFound(result.exists);
    } catch (error) {
      console.error('Error checking for duplicate ID:', error);
    } finally {
      setIdCheckLoading(false);
    }
  }, 500);

  const fetchDepartments = async () => {
    try {
      setIsLoading(true);
      console.log('Starting to fetch departments...');
      
      // Get departments from static list
      const departmentResult = apiService.backgroundChecks.getDepartments();
      setDepartmentsList(departmentResult || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
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
    if (!formData.role_type) newErrors.role_type = 'Role type is required';
    
    // Role-specific validations
    const roleType = formData.role_type;
    
    if (['Staff', 'Apprentice'].includes(roleType)) {
      if (!formData.submitted_date) newErrors.submitted_date = 'Submitted date is required';
      if (!formData.requested_by) newErrors.requested_by = 'Requested by is required';
    }
    else if (roleType === 'Expert') {
      if (!formData.from_company) newErrors.from_company = 'Company is required';
      if (!formData.submitted_date) newErrors.submitted_date = 'Submitted date is required';
      if (!formData.requested_by) newErrors.requested_by = 'Requested by is required';
    }
    else if (['Contractor', 'Consultant'].includes(roleType)) {
      if (!formData.duration) newErrors.duration = 'Duration is required';
      if (!formData.operating_country) newErrors.operating_country = 'Operating country is required';
      if (!formData.from_company) newErrors.from_company = 'Company is required';
      if (!formData.submitted_date) newErrors.submitted_date = 'Submitted date is required';
      if (!formData.requested_by) newErrors.requested_by = 'Requested by is required';
      if (!formData.additional_info) newErrors.additional_info = 'Additional information is required';
    }
    else if (roleType === 'Internship') {
      if (!formData.date_start) newErrors.date_start = 'Start date is required';
      if (!formData.date_end) newErrors.date_end = 'End date is required';
      if (!formData.work_with) newErrors.work_with = 'Work with is required';
      if (!formData.contact_number) newErrors.contact_number = 'Contact number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showErrorToast('Please fill in all required fields');
      return;
    }

    if (!user?.id) {
      showErrorToast('User session expired. Please log in again.');
      return;
    }

    setIsLoading(true);
    try {
      const selectedDepartment = departmentsList.find(dept => dept.id === parseInt(formData.department_id));

      const submissionData = {
        full_names: formData.full_names,
        citizenship: formData.citizenship,
        id_passport_number: formData.id_passport_number,
        passport_expiry_date: formData.passport_expiry_date || null,
        department_id: parseInt(formData.department_id),
        department_name: selectedDepartment?.name || '',
        role_type: formData.role_type,
        submitted_date: formData.submitted_date || null,
        status: 'Pending',
        requested_by: formData.requested_by,
        from_company: formData.from_company || null,
        duration: formData.duration || null,
        operating_country: formData.operating_country || null,
        date_start: formData.date_start || null,
        date_end: formData.date_end || null,
        work_with: formData.work_with || null,
        additional_info: formData.additional_info || null,
        contact_number: formData.contact_number || null,
        created_by: user.id,
        updated_by: user.id
      };

      const result = await apiService.backgroundChecks.createBackgroundCheck(submissionData);

      if (result.error) throw new Error(result.error);
      
      showSuccessToast('Background check request submitted successfully');
    } catch (error) {
      console.error('Submission error:', error);
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
      role_type: '',
      submitted_date: '',
      status: 'Pending',
      requested_by: '',
      from_company: '',
      duration: '',
      operating_country: '',
      date_start: '',
      date_end: '',
      work_with: '',
      additional_info: '',
      contact_number: ''
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
        <Loader2 className="w-8 h-8 animate-spin text-gray-700 dark:text-gray-300" />
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
                                focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
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
                                focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
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
                                  focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
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
                  
                  {/* Hide Passport Expiry Date for Rwandan citizens */}
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
                                  focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                      />
                      {errors.passport_expiry_date && (
                        <p className="mt-1 text-sm text-red-500">{errors.passport_expiry_date}</p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
            
            {/* Right Panel - Department and Roles */}
            <div className="lg:col-span-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 space-y-6"
              >
                <h2 className="text-xl font-semibold mb-4 dark:text-white">Department and Roles</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <select
                      name="department_id"
                      value={formData.department_id}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 rounded-lg border 
                                ${errors.department_id ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                bg-white dark:bg-gray-800 dark:text-white
                                focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
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
                  
                  <div>
                    <select
                      name="role_type"
                      value={formData.role_type}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 rounded-lg border 
                                ${errors.role_type ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                bg-white dark:bg-gray-800 dark:text-white
                                focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
                    >
                      <option value="">Select Role Type</option>
                      {ROLE_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    {errors.role_type && (
                      <p className="mt-1 text-sm text-red-500">{errors.role_type}</p>
                    )}
                  </div>
                </div>
                
                {/* Role-specific fields */}
                
              </motion.div>
              
              {/* Additional Information Section - In its own div as in VisitorForm */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
  className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mt-6"
>
  <h2 className="text-xl font-semibold mb-4 dark:text-white">Additional Information</h2>
  
  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Submitted Date and Requested By fields - only shown for specific roles */}
    {['Staff', 'Apprentice', 'Expert', 'Contractor', 'Consultant'].includes(formData.role_type) && (
      <>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Submitted Date*
          </label>
          <input
            type="date"
            name="submitted_date"
            value={formData.submitted_date}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 rounded-lg border 
                      ${errors.submitted_date ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                      bg-white dark:bg-gray-800 dark:text-white
                      focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
          />
          {errors.submitted_date && (
            <p className="mt-1 text-sm text-red-500">{errors.submitted_date}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Requested By*
          </label>
          <input
            type="text"
            name="requested_by"
            placeholder="Enter name"
            value={formData.requested_by}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 rounded-lg border 
                      ${errors.requested_by ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                      bg-white dark:bg-gray-800 dark:text-white
                      focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
          />
          {errors.requested_by && (
            <p className="mt-1 text-sm text-red-500">{errors.requested_by}</p>           )}
            </div>
          </>
        )}
        
        {/* Fields for Expert, Contractor, Consultant */}
        {['Expert', 'Contractor', 'Consultant'].includes(formData.role_type) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Company Name*
            </label>
            <input
              type="text"
              name="from_company"
              placeholder="Enter company name"
              value={formData.from_company}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 rounded-lg border 
                        ${errors.from_company ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                        bg-white dark:bg-gray-800 dark:text-white
                        focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
            />
            {errors.from_company && (
              <p className="mt-1 text-sm text-red-500">{errors.from_company}</p>
            )}
          </div>
        )}
        
        {/* Fields for Contractor, Consultant */}
        {['Contractor', 'Consultant'].includes(formData.role_type) && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Duration*
              </label>
              <input
                type="text"
                name="duration"
                placeholder="e.g., 6 months or 1 year"
                value={formData.duration}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.duration ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                          bg-white dark:bg-gray-800 dark:text-white
                          focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
              />
              {errors.duration && (
                <p className="mt-1 text-sm text-red-500">{errors.duration}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Operating Country*
              </label>
              <input
                type="text"
                name="operating_country"
                placeholder="Enter country name"
                value={formData.operating_country}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.operating_country ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                          bg-white dark:bg-gray-800 dark:text-white
                          focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
              />
              {errors.operating_country && (
                <p className="mt-1 text-sm text-red-500">{errors.operating_country}</p>
              )}
            </div>
          </>
        )}
        
        {/* Fields for Internship */}
        {formData.role_type === 'Internship' && (
          <>
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
                          focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
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
                          focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
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
                          focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
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
                          focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
              />
              {errors.contact_number && (
                <p className="mt-1 text-sm text-red-500">{errors.contact_number}</p>
              )}
            </div>
          </>
        )}
      </div>
    
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Additional Details
        </label>
        <textarea
          name="additional_info"
          placeholder="Enter any additional details or notes about this request..."
          value={formData.additional_info}
          onChange={handleInputChange}
          rows={4}
          className={`w-full px-4 py-2 rounded-lg border 
                    ${errors.additional_info ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                    bg-white dark:bg-gray-800 dark:text-white
                    focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
        />
        {errors.additional_info && (
          <p className="mt-1 text-sm text-red-500">{errors.additional_info}</p>
        )}
      </div>
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
                  className={`px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg
                            hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors
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
                      <span>Submit Request</span>
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

export default NewRequest;


