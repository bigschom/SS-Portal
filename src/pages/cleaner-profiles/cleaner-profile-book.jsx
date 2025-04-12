// D:\ME\GitHub\SS-Portal\src\pages\CleanerProfiles\CleanerProfileBook.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Loader2,
  UserPlus,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Calendar,
  Download
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
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

// Cleaner Profile Modal Component
const CleanerProfileModal = ({ isOpen, onClose, onSubmit, initialData = null }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    id_number: '',
    gender: '',
    phone_number: '',
    company: '',
    location_assigned: '',
    supervisor: '',
    shift: '',
    start_date: '',
    end_date: '',
    status: 'active',
    notes: '',
    photo_url: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        start_date: initialData.start_date ? new Date(initialData.start_date).toISOString().split('T')[0] : '',
        end_date: initialData.end_date ? new Date(initialData.end_date).toISOString().split('T')[0] : ''
      });
      if (initialData.photo_url) {
        setPhotoPreview(initialData.photo_url);
      }
    } else {
      // Set default start date to today for new entries
      const today = new Date();
      setFormData({
        ...formData,
        start_date: today.toISOString().split('T')[0]
      });
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.full_name) newErrors.full_name = 'Full name is required';
    if (!formData.id_number) newErrors.id_number = 'ID number is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.phone_number) newErrors.phone_number = 'Phone number is required';
    if (!formData.company) newErrors.company = 'Company is required';
    if (!formData.location_assigned) newErrors.location_assigned = 'Location assignment is required';
    if (!formData.supervisor) newErrors.supervisor = 'Supervisor name is required';
    if (!formData.shift) newErrors.shift = 'Shift schedule is required';
    if (!formData.start_date) newErrors.start_date = 'Start date is required';
    
    // End date is required only for inactive profiles
    if (formData.status === 'inactive' && !formData.end_date) {
      newErrors.end_date = 'End date is required for inactive cleaners';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      // Create form data for file upload
      const submitData = new FormData();
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined) {
          submitData.append(key, formData[key]);
        }
      });
      
      // Add photo if provided
      if (photoFile) {
        submitData.append('photo', photoFile);
      }
      
      await onSubmit(submitData);
      onClose();
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        submit: error.message || 'Error submitting form'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {initialData ? 'Edit Cleaner Profile' : 'Add New Cleaner Profile'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {errors.submit && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 mt-0.5" />
            <span>{errors.submit}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photo upload area */}
          <div className="flex flex-col items-center mb-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-2">
                {photoPreview ? (
                  <img 
                    src={photoPreview} 
                    alt="Cleaner" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserPlus className="w-10 h-10 text-gray-400" />
                )}
              </div>
              <label 
                htmlFor="photo-upload" 
                className="absolute bottom-2 right-0 bg-[#0A2647] dark:bg-white text-white dark:text-[#0A2647] p-1 rounded-full cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </label>
              <input 
                type="file" 
                id="photo-upload" 
                onChange={handlePhotoChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Upload cleaner photo</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name*
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.full_name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                placeholder="Enter full name"
              />
              {errors.full_name && (
                <p className="mt-1 text-sm text-red-500">{errors.full_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ID Number*
              </label>
              <input
                type="text"
                name="id_number"
                value={formData.id_number}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.id_number ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                placeholder="Enter ID number"
              />
              {errors.id_number && (
                <p className="mt-1 text-sm text-red-500">{errors.id_number}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Gender*
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.gender ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && (
                <p className="mt-1 text-sm text-red-500">{errors.gender}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number*
              </label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.phone_number ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                placeholder="Enter phone number"
              />
              {errors.phone_number && (
                <p className="mt-1 text-sm text-red-500">{errors.phone_number}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company/Contractor*
              </label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.company ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                placeholder="Enter cleaning company name"
              />
              {errors.company && (
                <p className="mt-1 text-sm text-red-500">{errors.company}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location Assigned*
              </label>
              <input
                type="text"
                name="location_assigned"
                value={formData.location_assigned}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.location_assigned ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                placeholder="Enter assigned location"
              />
              {errors.location_assigned && (
                <p className="mt-1 text-sm text-red-500">{errors.location_assigned}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Supervisor*
              </label>
              <input
                type="text"
                name="supervisor"
                value={formData.supervisor}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.supervisor ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                placeholder="Enter supervisor name"
              />
              {errors.supervisor && (
                <p className="mt-1 text-sm text-red-500">{errors.supervisor}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Shift*
              </label>
              <select
                name="shift"
                value={formData.shift}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.shift ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
              >
                <option value="">Select Shift</option>
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
                <option value="Full Day">Full Day</option>
                <option value="Alternating">Alternating</option>
              </select>
              {errors.shift && (
                <p className="mt-1 text-sm text-red-500">{errors.shift}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date*
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.start_date ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
              />
              {errors.start_date && (
                <p className="mt-1 text-sm text-red-500">{errors.start_date}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>

            {(formData.status === 'inactive' || formData.status === 'terminated') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date*
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border 
                            ${errors.end_date ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                            bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                            focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                />
                {errors.end_date && (
                  <p className="mt-1 text-sm text-red-500">{errors.end_date}</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Additional Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                      bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                      focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent"
              placeholder="Any additional notes about this cleaner..."
            ></textarea>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-[#0A2647] dark:bg-white text-white dark:text-[#0A2647] rounded-lg
                       hover:bg-[#0A2647]/90 dark:hover:bg-gray-100 flex items-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Main Cleaner Profile Book Component
const CleanerProfileBook = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [cleaners, setCleaners] = useState([]);
  const [filteredCleaners, setFilteredCleaners] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [toast, setToast] = useState(null);
  const [locations, setLocations] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchCleanerProfiles();
  }, []);

  useEffect(() => {
    if (cleaners.length > 0) {
      // Extract unique locations for the filter
      const uniqueLocations = [...new Set(cleaners.map(cleaner => cleaner.location_assigned))];
      setLocations(uniqueLocations);
      
      // Apply filters
      applyFilters();
    }
  }, [cleaners, searchTerm, statusFilter, locationFilter]);

  const fetchCleanerProfiles = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.cleanerProfiles.getAllProfiles();
      setCleaners(data || []);
      setFilteredCleaners(data || []);
    } catch (error) {
      console.error('Error fetching cleaner profiles:', error);
      showToast('error', 'Failed to load cleaner profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...cleaners];
    
    // Apply search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        cleaner =>
          cleaner.full_name.toLowerCase().includes(searchLower) ||
          cleaner.id_number.toLowerCase().includes(searchLower) ||
          cleaner.company.toLowerCase().includes(searchLower) ||
          cleaner.location_assigned.toLowerCase().includes(searchLower) ||
          cleaner.supervisor.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(cleaner => cleaner.status === statusFilter);
    }
    
    // Apply location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(cleaner => cleaner.location_assigned === locationFilter);
    }
    
    setFilteredCleaners(filtered);
  };

  const handleCreateProfile = async (formData) => {
    try {
      // Add user ID to form data
      formData.append('created_by', user.id);
      formData.append('updated_by', user.id);
      
      const result = await apiService.cleanerProfiles.createProfile(formData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Add the new profile to the state
      setCleaners(prev => [result, ...prev]);
      showToast('success', 'Cleaner profile created successfully');
    } catch (error) {
      console.error('Error creating cleaner profile:', error);
      showToast('error', `Failed to create profile: ${error.message}`);
      throw error;
    }
  };

  const handleUpdateProfile = async (formData) => {
    try {
      // Add user ID and cleaner ID to form data
      formData.append('updated_by', user.id);
      
      const result = await apiService.cleanerProfiles.updateProfile(selectedProfile.id, formData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Update the profile in the state
      setCleaners(prev => 
        prev.map(profile => profile.id === selectedProfile.id ? result : profile)
      );
      
      showToast('success', 'Cleaner profile updated successfully');
    } catch (error) {
      console.error('Error updating cleaner profile:', error);
      showToast('error', `Failed to update profile: ${error.message}`);
      throw error;
    }
  };

  const handleDeleteProfile = async (id) => {
    if (!window.confirm('Are you sure you want to delete this cleaner profile? This action cannot be undone.')) {
      return;
    }
    
    try {
      const result = await apiService.cleanerProfiles.deleteProfile(id);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Remove the profile from the state
      setCleaners(prev => prev.filter(profile => profile.id !== id));
      showToast('success', 'Cleaner profile deleted successfully');
    } catch (error) {
      console.error('Error deleting cleaner profile:', error);
      showToast('error', `Failed to delete profile: ${error.message}`);
    }
  };

  const handleExportProfiles = async () => {
    try {
      setExportLoading(true);
      // Use the existing filters for the export
      const filters = {
        status: statusFilter !== 'all' ? statusFilter : null,
        location: locationFilter !== 'all' ? locationFilter : null
      };
      
      await apiService.cleanerProfiles.generateReport(filters);
      showToast('success', 'Cleaner profiles exported successfully');
    } catch (error) {
      console.error('Error exporting profiles:', error);
      showToast('error', 'Failed to export profiles');
    } finally {
      setExportLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setSelectedProfile(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (profile) => {
    setSelectedProfile(profile);
    setShowModal(true);
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white pb-8">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold mb-4 md:mb-0">Cleaner Profile Book</h1>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleExportProfiles}
              disabled={exportLoading || isLoading}
              className="px-4 py-2 bg-[#0A2647] dark:bg-white text-white dark:text-[#0A2647] rounded-lg
                       hover:bg-[#0A2647]/90 dark:hover:bg-gray-100 flex items-center justify-center"
            >
              {exportLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export Profiles
            </button>
            
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-[#0A2647] dark:bg-white text-white dark:text-[#0A2647] rounded-lg
                       hover:bg-[#0A2647]/90 dark:hover:bg-gray-100 flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Cleaner
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, ID, company..."
                  className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-200 dark:border-gray-700
                          bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                          bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
              
              <div>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                          bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent"
                >
                  <option value="all">All Locations</option>
                  {locations.map((location, index) => (
                    <option key={index} value={location}>{location}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setLocationFilter('all');
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 
                        dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg
                        hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center"
              >
                <Filter className="w-4 h-4 mr-2" />
                Reset Filters
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-[#0A2647] dark:text-white" />
            </div>
          ) : filteredCleaners.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No cleaner profiles found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCleaners.map((cleaner) => (
                <div
                  key={cleaner.id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleOpenEditModal(cleaner)}
                >
                  <div className="flex items-center p-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex-shrink-0">
                      {cleaner.photo_url ? (
                        <img 
                          src={cleaner.photo_url} 
                          alt={cleaner.full_name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#0A2647] dark:bg-gray-800 text-white">
                          {cleaner.full_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4 flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{cleaner.full_name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">ID: {cleaner.id_number}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{cleaner.company}</p>
                    </div>
                    
                    <div>
                      <span className={`px-2 py-1 text-xs rounded-full
                        ${cleaner.status === 'active'
                          ? 'bg-[#0A2647] text-white dark:bg-white dark:text-[#0A2647]'
                          : cleaner.status === 'inactive'
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                        }`}
                      >
                        {cleaner.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="px-4 py-3 bg-white dark:bg-gray-800 flex justify-between items-center border-t border-gray-200 dark:border-gray-600">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Location: {cleaner.location_assigned}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {cleaner.shift} Shift
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(cleaner);
                        }}
                        className="p-1 text-[#0A2647] hover:text-[#0A2647]/80 dark:text-white dark:hover:text-gray-300"
                        title="Edit Profile"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProfile(cleaner.id);
                        }}
                        className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete Profile"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cleaner Profile Modal */}
      <AnimatePresence>
        {showModal && (
          <CleanerProfileModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onSubmit={selectedProfile ? handleUpdateProfile : handleCreateProfile}
            initialData={selectedProfile}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CleanerProfileBook;