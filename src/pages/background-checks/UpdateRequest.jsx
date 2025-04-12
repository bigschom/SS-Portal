import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  ArrowLeft,
  XCircle
} from 'lucide-react';
import apiService from '../../config/api-service';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_TYPES } from '../../constants/roleTypes';
 
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

// Helper function to format dates for input fields
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  
  try {
    // Handle various date formats
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return '';
    }
    
    // Format as YYYY-MM-DD
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return '';
  }
};

const UpdateRequest = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  
  // Form states
  const [background, setBackground] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [departments, setDepartments] = useState([]);
  const [toast, setToast] = useState(null);
  
  const [formData, setFormData] = useState({
    full_names: '',
    citizenship: '',
    id_passport_number: '',
    passport_expiry_date: '',
    department_id: '',
    department_name: '',
    role_type: '',
    role: '',
    date_start: '',
    date_end: '',
    work_with: '',
    contact_number: '',
    additional_info: '',
    status: 'Pending',
    closed_date: '',
    from_company: '',
    duration: '',
    operating_country: '',
    requested_by: '',
    submitted_date: ''
  });

  // Show toast notification
  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    
    // Clear toast after 5 seconds (increased from 3 seconds for better visibility)
    const timer = setTimeout(() => setToast(null), 5000);
    
    // If it's a success toast, navigate back after the toast disappears
    if (type === 'success') {
      setTimeout(() => {
        navigate('/all-background-checks');
      }, 3000); // Navigate after 3 seconds
    }
    
    return timer;
  };

  // Fetch departments and background check data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Load departments
        const depts = await apiService.backgroundChecks.getDepartments();
        setDepartments(depts);
        
        // Load background check data if ID is provided
        if (id) {
          const backgroundData = await apiService.backgroundChecks.getBackgroundCheckById(id);
          
          if (backgroundData.error) {
            throw new Error(backgroundData.error);
          }
          
          console.log('Raw background data from server:', backgroundData);
          
          // Format dates properly for form inputs
          const formattedData = {
            ...backgroundData,
            // Format date strings to YYYY-MM-DD for input[type="date"]
            submitted_date: backgroundData.submitted_date ? formatDateForInput(backgroundData.submitted_date) : '',
            passport_expiry_date: backgroundData.passport_expiry_date ? formatDateForInput(backgroundData.passport_expiry_date) : '',
            date_start: backgroundData.date_start ? formatDateForInput(backgroundData.date_start) : '',
            date_end: backgroundData.date_end ? formatDateForInput(backgroundData.date_end) : '',
            closed_date: backgroundData.closed_date ? formatDateForInput(backgroundData.closed_date) : ''
          };
          
          console.log('Formatted data for form:', formattedData);
          
          setBackground(backgroundData);
          setFormData(formattedData);
        } else {
          navigate('/background-checks');
        }
      } catch (error) {
        console.error('Error loading data:', error);
        showToast('Failed to load background check details: ' + (error.message || 'Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [id, navigate]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'citizenship') {
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
    } else if (name === 'department_id') {
      // Update department_name when department_id changes
      const selectedDept = departments.find(dept => dept.id === parseInt(value));
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        department_name: selectedDept ? selectedDept.name : ''
      }));
    } else if (name === 'role_type') {
      // Reset role-specific fields when role type changes
      const roleSpecificReset = {};
      
      // Fields to reset based on role type
      if (value === 'Intern' || value === 'Apprentice') {
        roleSpecificReset.from_company = '';
        roleSpecificReset.operating_country = '';
      } else if (value === 'Contractor' || value === 'Consultant') {
        roleSpecificReset.duration = '';
      }
      
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        ...roleSpecificReset
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error for this field if exists
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Log date fields for debugging
  useEffect(() => {
    if (background && Object.keys(background).length > 0) {
      console.log('Current form date fields:', {
        submitted_date: formData.submitted_date,
        passport_expiry_date: formData.passport_expiry_date,
        date_start: formData.date_start,
        date_end: formData.date_end,
        closed_date: formData.closed_date
      });
    }
  }, [background, formData]);

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    // Required fields for all
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
      
      // Add validation for role field for Staff
      if (roleType === 'Staff' && !formData.role) {
        newErrors.role = 'Role is required';
      }
    }
    else if (roleType === 'Expert') {
      if (!formData.from_company) newErrors.from_company = 'Company is required';
      if (!formData.submitted_date) newErrors.submitted_date = 'Submitted date is required';
      if (!formData.requested_by) newErrors.requested_by = 'Requested by is required';
      if (!formData.role) newErrors.role = 'Role is required';
    }
    else if (['Contractor', 'Consultant'].includes(roleType)) {
      if (!formData.duration) newErrors.duration = 'Duration is required';
      if (!formData.operating_country) newErrors.operating_country = 'Operating country is required';
      if (!formData.from_company) newErrors.from_company = 'Company is required';
      if (!formData.submitted_date) newErrors.submitted_date = 'Submitted date is required';
      if (!formData.requested_by) newErrors.requested_by = 'Requested by is required';
      if (!formData.role) newErrors.role = 'Role is required';
    }
    else if (roleType === 'Internship') {
      if (!formData.date_start) newErrors.date_start = 'Start date is required';
      if (!formData.date_end) newErrors.date_end = 'End date is required';
      if (!formData.work_with) newErrors.work_with = 'Supervisor is required';
      if (!formData.contact_number) newErrors.contact_number = 'Contact number is required';
    }
    
    // Status validation
    if (formData.status === 'Closed' && !formData.closed_date) {
      newErrors.closed_date = 'Closed date is required when status is Closed';
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

    setSubmitLoading(true);
    try {
      // Format the data for the API
      const formattedData = { ...formData };
      
      // Ensure all date fields are either valid dates or null (not empty strings)
      const dateFields = ['submitted_date', 'passport_expiry_date', 'date_start', 'date_end', 'closed_date'];
      
      dateFields.forEach(field => {
        // If the field is empty or invalid, set it to null instead of empty string
        if (!formattedData[field] || formattedData[field] === '') {
          formattedData[field] = null;
        }
      });
      
      const updateData = {
        ...formattedData,
        updated_by: user.id,
        closed_by: formattedData.status === 'Closed' ? user.id : null
      };
      
      console.log('Sending update data:', updateData);
      
      const response = await apiService.backgroundChecks.updateBackgroundCheck(
        background.id, 
        updateData
      );

      if (response.error) {
        throw new Error(response.error);
      }
      
      console.log('Update successful, response:', response);
      
      // Log the activity
      try {
        await apiService.activityLog.logActivity({
          userId: user.id,
          description: `Updated background check for ${formData.full_names} (${formData.status})`,
          type: 'update',
          recordId: background.id
        });
      } catch (logError) {
        console.warn('Failed to log activity, but update was successful:', logError);
      }
      
      // Show success toast and navigate back after timeout (set in showToast function)
      showToast(`Background check request ${formData.status === 'Closed' ? 'closed' : 'updated'} successfully`, 'success');
    } catch (error) {
      console.error('Update error:', error);
      showToast(error.message || 'An error occurred during update. Please try again.', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (isLoading) {
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
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/all-background-checks')}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span>Back to All Requests</span>
        </button>
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
                                ${errors.id_passport_number ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                bg-white dark:bg-gray-800 dark:text-white
                                focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                    />
                    {errors.id_passport_number && (
                      <p className="mt-1 text-sm text-red-500">{errors.id_passport_number}</p>
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
                      {departments.map((dept) => (
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Role Type*
                    </label>
                    <select
                      name="role_type"
                      value={formData.role_type}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 rounded-lg border 
                                ${errors.role_type ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                bg-white dark:bg-gray-800 dark:text-white
                                focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
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
              </motion.div>
              
              {/* Additional Information Section - Below Department and Roles on the right side */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mt-6"
              >
                <h2 className="text-xl font-semibold mb-4 dark:text-white">Additional Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Role field for Staff, Expert, Contractor, Consultant */}
{['Staff', 'Expert', 'Contractor', 'Consultant'].includes(formData.role_type) && (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      Role*
    </label>
    <input
      type="text"
      name="role"
      placeholder="Enter specific role"
      value={formData.role}
      onChange={handleInputChange}
      className={`w-full px-4 py-2 rounded-lg border 
                ${errors.role ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                bg-white dark:bg-gray-800 dark:text-white
                focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
    />
    {errors.role && (
      <p className="mt-1 text-sm text-red-500">{errors.role}</p>
    )}
  </div>
)}

                  {/* Submitted Date and Requested By fields */}
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
                                    focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
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
                          placeholder=" "
                          value={formData.requested_by}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 rounded-lg border 
                                    ${errors.requested_by ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                    bg-white dark:bg-gray-800 dark:text-white
                                    focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                        />
                        {errors.requested_by && (
                          <p className="mt-1 text-sm text-red-500">{errors.requested_by}</p>
                        )}
                      </div>
                    </>
                  )}
                  
                  {/* Fields for Expert, Contractor, Consultant */}
                  {['Expert', 'Contractor', 'Consultant'].includes(formData.role_type) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        From Company*
                      </label>
                      <input
                        type="text"
                        name="from_company"
                        placeholder="From Company Name"
                        value={formData.from_company}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 rounded-lg border 
                                  ${errors.from_company ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                  bg-white dark:bg-gray-800 dark:text-white
                                  focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
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
                                    focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
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
                          placeholder="Operating Country Name"
                          value={formData.operating_country}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 rounded-lg border 
                                    ${errors.operating_country ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                    bg-white dark:bg-gray-800 dark:text-white
                                    focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
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
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 rounded-lg border 
                                ${errors.status ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                bg-white dark:bg-gray-800 dark:text-white
                                focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Closed">Closed</option>
                    </select>
                    {errors.status && (
                      <p className="mt-1 text-sm text-red-500">{errors.status}</p>
                    )}
                  </div>

                  {formData.status === 'Closed' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Closed Date*
                      </label>
                      <input
                        type="date"
                        name="closed_date"
                        value={formData.closed_date}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 rounded-lg border 
                                  ${errors.closed_date ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
                                  bg-white dark:bg-gray-800 dark:text-white
                                  focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                      />
                      {errors.closed_date && (
                        <p className="mt-1 text-sm text-red-500">{errors.closed_date}</p>
                      )}
                    </div>
                  )}

                  {/* Additional Info field for all roles */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Additional Details
                    </label>
                    <textarea
                      name="additional_info"
                      placeholder="Additional Details"
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
                  disabled={submitLoading}
                  className={`px-6 py-3 bg-[#0A2647] dark:bg-white text-white dark:text-[#0A2647] rounded-lg
                            hover:bg-[#0A2647]/90 dark:hover:bg-gray-100 transition-colors
                            flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>Update Request</span>
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

export default UpdateRequest;