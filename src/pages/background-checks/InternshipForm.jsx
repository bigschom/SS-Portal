import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { useAuth } from '../../hooks/useAuth';
import apiService from '../../config/api-service';

// Success Modal Component
const SuccessModal = ({ message, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4 relative"
      >
        <div className="flex items-center space-x-4">
          <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Success</h3>
            <p className="text-gray-600 dark:text-gray-300">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const InternshipForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  
  const isEditMode = !!id;
  const queryParams = new URLSearchParams(location.search);
  const isInternshipType = queryParams.get('type') === 'internship';
  
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [departments, setDepartments] = useState([]);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    full_names: '',
    citizenship: '',
    id_passport_number: '',
    passport_expiry_date: '',
    department_id: '',
    department_name: '',
    role_type: 'Internship', // Default for internship form
    date_start: '',
    date_end: '',
    work_with: '',
    contact_number: '',
    additional_info: '',
    duration: ''
  });


  const fetchDepartments = async () => {
    try {
      const depts = await apiService.backgroundChecks.getDepartments();
      setDepartments(depts || []);
    } catch (error) {
      console.error("Error loading departments:", error);
      setError("Failed to load departments. Please try again.");
    }
  };

  const fetchInternshipData = async () => {
    try {
      setLoading(true);
      const data = await apiService.backgroundChecks.getBackgroundCheckById(id);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.role_type !== 'Internship') {
        setError("This record is not an internship.");
        return;
      }
      
      setFormData({
        full_names: data.full_names || '',
        citizenship: data.citizenship || '',
        id_passport_number: data.id_passport_number || '',
        passport_expiry_date: data.passport_expiry_date || '',
        department_id: data.department_id || '',
        department_name: data.department_name || '',
        role_type: 'Internship',
        date_start: data.date_start || '',
        date_end: data.date_end || '',
        work_with: data.work_with || '',
        contact_number: data.contact_number || '',
        additional_info: data.additional_info || '',
        duration: data.duration || ''
      });
    } catch (error) {
      console.error("Error fetching internship data:", error);
      setError("Failed to load internship data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
      const selectedDept = departments.find(dept => dept.id === value);
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
        if (!formData.work_with) newErrors.work_with = 'Supervisor name is required';
        if (!formData.contact_number) newErrors.contact_number = 'Contact number is required';
        
        // Validate date range
        if (formData.date_start && formData.date_end) {
          const startDate = new Date(formData.date_start);
          const endDate = new Date(formData.date_end);
          
          if (endDate <= startDate) {
            newErrors.date_end = 'End date must be after start date';
          }
        }
    
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
      };
    
      const handleSubmit = async (e) => {
        e.preventDefault();
    
        if (!validateForm()) {
          return;
        }
    
        if (!user?.id) {
          setError('User session expired. Please log in again.');
          return;
        }
    
        setLoading(true);
        try {
          const internshipData = {
            ...formData,
            type: 'internship',
            status: 'Pending',
            created_by: user.id,
            updated_by: user.id
          };
          
          let response;
          
          if (isEditMode) {
            response = await apiService.backgroundChecks.updateBackgroundCheck(id, internshipData);
            
            // Log the activity
            await apiService.activityLog.logActivity({
              userId: user.id,
              description: `Updated internship record for ${formData.full_names}`,
              type: 'update',
              recordId: id
            });
            
            setSuccessMessage('Internship updated successfully');
          } else {
            response = await apiService.backgroundChecks.createBackgroundCheck(internshipData);
            
            // Log the activity
            await apiService.activityLog.logActivity({
              userId: user.id,
              description: `Created new internship record for ${formData.full_names}`,
              type: 'create',
              recordId: response.id
            });
            
            setSuccessMessage('Internship created successfully');
          }
          
          if (response.error) {
            throw new Error(response.error);
          }
          
          setShowSuccessModal(true);
        } catch (error) {
          console.error('Submission error:', error);
          setError(error.message || 'An error occurred during submission');
        } finally {
          setLoading(false);
        }
      };
    
      const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        navigate('/background/internships');
      };
    
      const handleBack = () => {
        navigate('/background/internships');
      };
    
    
      return (
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex items-center">
              <Button 
                variant="ghost" 
                onClick={handleBack}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isEditMode ? 'Edit Internship' : 'New Internship'}
              </h1>
            </div>
    
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
    
            <Card className="dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-lg font-medium dark:text-white">
                  Internship Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-md font-medium text-gray-900 dark:text-white pb-2 border-b border-gray-200 dark:border-gray-700">
                      Personal Information
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Full Names*
                        </label>
                        <input
                          type="text"
                          name="full_names"
                          value={formData.full_names}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            errors.full_names ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
                          } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
                        />
                        {errors.full_names && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.full_names}</p>
                        )}
                      </div>
    
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Citizenship*
                        </label>
                        <input
                          type="text"
                          name="citizenship"
                          value={formData.citizenship}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            errors.citizenship ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
                          } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
                        />
                        {errors.citizenship && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.citizenship}</p>
                        )}
                      </div>
    
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          ID/Passport Number*
                        </label>
                        <input
                          type="text"
                          name="id_passport_number"
                          value={formData.id_passport_number}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            errors.id_passport_number ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
                          } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
                        />
                        {errors.id_passport_number && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.id_passport_number}</p>
                        )}
                      </div>
    
                      {formData.citizenship && 
                       !['rwanda', 'rwandan'].includes(formData.citizenship.toLowerCase()) && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Passport Expiry Date*
                          </label>
                          <input
                            type="date"
                            name="passport_expiry_date"
                            value={formData.passport_expiry_date}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2 rounded-lg border ${
                              errors.passport_expiry_date ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
                            } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                            focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
                          />
                          {errors.passport_expiry_date && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.passport_expiry_date}</p>
                          )}
                        </div>
                      )}
    
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Contact Number*
                        </label>
                        <input
                          type="text"
                          name="contact_number"
                          value={formData.contact_number}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            errors.contact_number ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
                          } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
                        />
                        {errors.contact_number && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.contact_number}</p>
                        )}
                      </div>
                    </div>
                  </div>
    
                  {/* Internship Details */}
                  <div className="space-y-4">
                    <h3 className="text-md font-medium text-gray-900 dark:text-white pb-2 border-b border-gray-200 dark:border-gray-700">
                      Internship Details
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Department*
                        </label>
                        <select
                          name="department_id"
                          value={formData.department_id}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            errors.department_id ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
                          } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
                        >
                          <option value="">Select Department</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                        {errors.department_id && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.department_id}</p>
                        )}
                      </div>
    
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Duration (months)
                        </label>
                        <input
                          type="number"
                          name="duration"
                          value={formData.duration}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            errors.duration ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
                          } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
                        />
                        {errors.duration && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.duration}</p>
                        )}
                      </div>
    
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Start Date*
                        </label>
                        <input
                          type="date"
                          name="date_start"
                          value={formData.date_start}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            errors.date_start ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
                          } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
                        />
                        {errors.date_start && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date_start}</p>
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
                          className={`w-full px-4 py-2 rounded-lg border ${
                            errors.date_end ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
                        } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                        focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
                      />
                      {errors.date_end && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date_end}</p>
                      )}
                    </div>
  
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Supervisor/Manager*
                      </label>
                      <input
                        type="text"
                        name="work_with"
                        value={formData.work_with}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 rounded-lg border ${
                          errors.work_with ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
                        } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                        focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
                      />
                      {errors.work_with && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.work_with}</p>
                      )}
                    </div>
                  </div>
                </div>
  
                {/* Additional Information */}
                <div className="space-y-4">
                  <h3 className="text-md font-medium text-gray-900 dark:text-white pb-2 border-b border-gray-200 dark:border-gray-700">
                    Additional Information
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Additional Information
                    </label>
                    <textarea
                      name="additional_info"
                      value={formData.additional_info}
                      onChange={handleInputChange}
                      rows={4}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        errors.additional_info ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
                      } bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                      focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white`}
                    />
                    {errors.additional_info && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.additional_info}</p>
                    )}
                  </div>
                </div>
  
                {/* Submit Button */}
                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-[#0A2647] hover:bg-[#0A2647]/90 dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isEditMode ? 'Updating...' : 'Saving...'}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {isEditMode ? 'Update Internship' : 'Save Internship'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
  
        {/* Success Modal */}
        <AnimatePresence>
          {showSuccessModal && (
            <SuccessModal
              message={successMessage}
              onClose={handleCloseSuccessModal}
            />
          )}
        </AnimatePresence>
      </div>
    );
  };
  
  export default InternshipForm;
  
    
