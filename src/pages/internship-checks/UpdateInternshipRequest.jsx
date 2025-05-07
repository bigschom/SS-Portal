import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
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
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {

      return '';
    }
    
    return date.toISOString().split('T')[0];
  } catch (error) {

    return '';
  }
};

const UpdateInternshipRequest = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  
  // Form states
  const [internship, setInternship] = useState(null);
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
    date_start: '',
    date_end: '',
    work_with: '',
    contact_number: '',
    additional_info: '',
    status: 'Active'
  });

  // Show toast notification
  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    
    const timer = setTimeout(() => setToast(null), 5000);
    
    // If it's a success toast, navigate back after the toast disappears
    if (type === 'success') {
      setTimeout(() => {
        navigate('/all-Internship-checks');
      }, 3000);
    }
    
    return timer;
  };

  // Fetch departments and internship data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Load departments
        const depts = await apiService.internships.getDepartments();
        setDepartments(depts);
        
        // Load internship data
        if (id) {
          const internshipData = await apiService.internships.getInternshipById(id);
          
          if (internshipData.error) {
            throw new Error(internshipData.error);
          }
          
          // Format dates properly for form inputs
          const formattedData = {
            ...internshipData,
            date_start: internshipData.date_start ? formatDateForInput(internshipData.date_start) : '',
            date_end: internshipData.date_end ? formatDateForInput(internshipData.date_end) : '',
            passport_expiry_date: internshipData.passport_expiry_date ? formatDateForInput(internshipData.passport_expiry_date) : ''
          };
          
          setInternship(internshipData);
          setFormData(formattedData);
        } else {
          navigate('/internship-checks');
        }
      } catch (error) {

        showToast('Failed to load internship details: ' + (error.message || 'Unknown error'));
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
    
    // Required fields for internship
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

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    if (!user?.username) {
      showToast('User session expired. Please log in again.', 'error');
      return;
    }

    setSubmitLoading(true);
    try {
      // Format the data for the API
      const formattedData = { ...formData };
      
      // Ensure all date fields are either valid dates or null
      const dateFields = ['date_start', 'date_end', 'passport_expiry_date'];
      
      dateFields.forEach(field => {
        if (!formattedData[field] || formattedData[field] === '') {
          formattedData[field] = null;
        }
      });
      
      const updateData = {
        ...formattedData,
        updated_by: user.username
      };
      
      // Check if date_end is in the past, automatically set status to "Expired"
      const endDate = new Date(formattedData.date_end);
      const today = new Date();
      
      if (endDate < today) {
        updateData.status = 'Expired';
      } else {
        updateData.status = 'Active';
      }
      
      // Use the internship API
      const response = await apiService.internships.updateInternship(
        internship.id, 
        updateData
      );

      if (response.error) {
        throw new Error(response.error);
      }
      
      // Show success toast and navigate back after timeout
      showToast(`Internship updated successfully`, 'success');
    } catch (error) {

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
          onClick={() => navigate('/all-Internship-checks')}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span>Back to Internship Checks</span>
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
                      Status
                    </label>
                    <div className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      {new Date(formData.date_end) >= new Date() ? 'Active' : 'Expired'}
                    </div>
                    <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                      Status is automatically determined by the end date
                    </p>
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
                      <span>Update Internship</span>
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

export default UpdateInternshipRequest;