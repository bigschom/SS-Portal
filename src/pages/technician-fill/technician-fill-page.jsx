// D:\ME\GitHub\SS-Portal\src\pages\TechnicianFill\TechnicianFillPage.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Download,
  Tool,
  Calendar,
  Clock,
  CheckSquare
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

// Technician Fill Modal Component
const TechnicianFillModal = ({ isOpen, onClose, onSubmit, initialData = null }) => {
  const [formData, setFormData] = useState({
    technician_name: '',
    visit_purpose: '',
    company: '',
    equipment_serviced: '',
    service_type: 'maintenance',
    location: '',
    visit_date: '',
    arrival_time: '',
    departure_time: '',
    status: 'scheduled',
    completion_notes: '',
    escort_required: false,
    escort_name: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        visit_date: initialData.visit_date ? new Date(initialData.visit_date).toISOString().split('T')[0] : ''
      });
      setIsCompleted(['completed', 'cancelled'].includes(initialData.status));
    } else {
      // Set default visit date to today for new visits
      const today = new Date();
      setFormData({
        ...formData,
        visit_date: today.toISOString().split('T')[0]
      });
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.technician_name) newErrors.technician_name = 'Technician name is required';
    if (!formData.visit_purpose) newErrors.visit_purpose = 'Visit purpose is required';
    if (!formData.company) newErrors.company = 'Company is required';
    if (!formData.equipment_serviced) newErrors.equipment_serviced = 'Equipment details are required';
    if (!formData.service_type) newErrors.service_type = 'Service type is required';
    if (!formData.location) newErrors.location = 'Location is required';
    if (!formData.visit_date) newErrors.visit_date = 'Visit date is required';
    if (!formData.arrival_time && formData.status !== 'scheduled') newErrors.arrival_time = 'Arrival time is required';
    
    // If status is completed, departure time and completion notes are required
    if (formData.status === 'completed') {
      if (!formData.departure_time) {
        newErrors.departure_time = 'Departure time is required for completed visits';
      }
      if (!formData.completion_notes) {
        newErrors.completion_notes = 'Completion notes are required';
      }
    }
    
    // If escort is required, escort name is required
    if (formData.escort_required && !formData.escort_name) {
      newErrors.escort_name = 'Escort name is required when escort is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle checkbox fields
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      // If status is changing to completed or cancelled
      if (name === 'status') {
        if (['completed', 'cancelled'].includes(value)) {
          setIsCompleted(true);
          // Set departure time to now if not already set
          if (!formData.departure_time && value === 'completed') {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            setFormData(prev => ({
              ...prev,
              [name]: value,
              departure_time: `${hours}:${minutes}`
            }));
            return;
          }
        } else {
          setIsCompleted(false);
        }
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      await onSubmit(formData);
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
            {initialData ? 'Edit Technician Visit' : 'New Technician Visit'}
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
            <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
            <span>{errors.submit}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Technician Name*
              </label>
              <input
                type="text"
                name="technician_name"
                value={formData.technician_name}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.technician_name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                placeholder="Enter technician's name"
              />
              {errors.technician_name && (
                <p className="mt-1 text-sm text-red-500">{errors.technician_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company*
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
                placeholder="Enter company name"
              />
              {errors.company && (
                <p className="mt-1 text-sm text-red-500">{errors.company}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Visit Purpose*
              </label>
              <input
                type="text"
                name="visit_purpose"
                value={formData.visit_purpose}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.visit_purpose ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                placeholder="Purpose of the visit"
              />
              {errors.visit_purpose && (
                <p className="mt-1 text-sm text-red-500">{errors.visit_purpose}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Equipment Serviced*
              </label>
              <input
                type="text"
                name="equipment_serviced"
                value={formData.equipment_serviced}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.equipment_serviced ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                placeholder="Enter equipment details"
              />
              {errors.equipment_serviced && (
                <p className="mt-1 text-sm text-red-500">{errors.equipment_serviced}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Service Type*
              </label>
              <select
                name="service_type"
                value={formData.service_type}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.service_type ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
              >
                <option value="maintenance">Maintenance</option>
                <option value="repair">Repair</option>
                <option value="installation">Installation</option>
                <option value="inspection">Inspection</option>
                <option value="upgrade">Upgrade</option>
                <option value="other">Other</option>
              </select>
              {errors.service_type && (
                <p className="mt-1 text-sm text-red-500">{errors.service_type}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location*
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.location ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                placeholder="Where is the equipment located?"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-500">{errors.location}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Visit Date*
              </label>
              <input
                type="date"
                name="visit_date"
                value={formData.visit_date}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.visit_date ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
              />
              {errors.visit_date && (
                <p className="mt-1 text-sm text-red-500">{errors.visit_date}</p>
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
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Arrival Time {formData.status !== 'scheduled' ? '*' : ''}
              </label>
              <input
                type="time"
                name="arrival_time"
                value={formData.arrival_time}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.arrival_time ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
              />
              {errors.arrival_time && (
                <p className="mt-1 text-sm text-red-500">{errors.arrival_time}</p>
              )}
            </div>

            {isCompleted && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Departure Time {formData.status === 'completed' ? '*' : ''}
                </label>
                <input
                  type="time"
                  name="departure_time"
                  value={formData.departure_time}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border 
                            ${errors.departure_time ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                            bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                            focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                />
                {errors.departure_time && (
                  <p className="mt-1 text-sm text-red-500">{errors.departure_time}</p>
                )}
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="escort_required"
                name="escort_required"
                checked={formData.escort_required}
                onChange={handleChange}
                className="h-4 w-4 text-[#0A2647] dark:text-white border-gray-300 dark:border-gray-700 
                         rounded focus:ring-[#0A2647] dark:focus:ring-white"
              />
              <label htmlFor="escort_required" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Security Escort Required
              </label>
            </div>

            {formData.escort_required && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Escort Name*
                </label>
                <input
                  type="text"
                  name="escort_name"
                  value={formData.escort_name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border 
                            ${errors.escort_name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                            bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                            focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                  placeholder="Name of security escort"
                />
                {errors.escort_name && (
                  <p className="mt-1 text-sm text-red-500">{errors.escort_name}</p>
                )}
              </div>
            )}

            {isCompleted && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Completion Notes {formData.status === 'completed' ? '*' : ''}
                </label>
                <textarea
                  name="completion_notes"
                  value={formData.completion_notes}
                  onChange={handleChange}
                  rows="3"
                  className={`w-full px-4 py-2 rounded-lg border 
                            ${errors.completion_notes ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                            bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                            focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                  placeholder="Notes about work completed"
                />
                {errors.completion_notes && (
                  <p className="mt-1 text-sm text-red-500">{errors.completion_notes}</p>
                )}
              </div>
            )}
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

// Main Technician Fill Page Component
const TechnicianFillPage = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [visits, setVisits] = useState([]);
  const [filteredVisits, setFilteredVisits] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [toast, setToast] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    fetchTechnicianVisits();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [visits, searchTerm, statusFilter, dateFilter]);

  const fetchTechnicianVisits = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.technicianVisits.getAllVisits();
      setVisits(data || []);
      setFilteredVisits(data || []);
    } catch (error) {
      console.error('Error fetching technician visits:', error);
      showToast('error', 'Failed to load technician visits');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...visits];
    
    // Apply search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        visit =>
          visit.technician_name.toLowerCase().includes(searchLower) ||
          visit.company.toLowerCase().includes(searchLower) ||
          visit.visit_purpose.toLowerCase().includes(searchLower) ||
          visit.equipment_serviced.toLowerCase().includes(searchLower) ||
          visit.location.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(visit => visit.status === statusFilter);
    }
    
    // Apply date filter
    if (dateFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dateFilter === 'today') {
        filtered = filtered.filter(visit => {
          const visitDate = new Date(visit.visit_date);
          visitDate.setHours(0, 0, 0, 0);
          return visitDate.getTime() === today.getTime();
        });
      } else if (dateFilter === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        filtered = filtered.filter(visit => {
          const visitDate = new Date(visit.visit_date);
          visitDate.setHours(0, 0, 0, 0);
          return visitDate.getTime() === tomorrow.getTime();
        });
      } else if (dateFilter === 'this_week') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
        
        filtered = filtered.filter(visit => {
          const visitDate = new Date(visit.visit_date);
          visitDate.setHours(0, 0, 0, 0);
          return visitDate >= startOfWeek && visitDate <= endOfWeek;
        });
      } else if (dateFilter === 'next_week') {
        const startOfNextWeek = new Date(today);
        startOfNextWeek.setDate(today.getDate() - today.getDay() + 7); // Next Sunday
        const endOfNextWeek = new Date(startOfNextWeek);
        endOfNextWeek.setDate(startOfNextWeek.getDate() + 6); // Next Saturday
        
        filtered = filtered.filter(visit => {
          const visitDate = new Date(visit.visit_date);
          visitDate.setHours(0, 0, 0, 0);
          return visitDate >= startOfNextWeek && visitDate <= endOfNextWeek;
        });
      } else if (dateFilter === 'past') {
        filtered = filtered.filter(visit => {
          const visitDate = new Date(visit.visit_date);
          visitDate.setHours(0, 0, 0, 0);
          return visitDate < today;
        });
      } else if (dateFilter === 'future') {
        filtered = filtered.filter(visit => {
          const visitDate = new Date(visit.visit_date);
          visitDate.setHours(0, 0, 0, 0);
          return visitDate > today;
        });
      }
    }
    
    setFilteredVisits(filtered);
  };

  // Other functions for create, update, delete will be similar to other pages
  // I'll just include stubs to keep this example brief
  
  const handleCreateVisit = async (formData) => {
    try {
      // Add user ID to form data
      formData.created_by = user.id;
      formData.updated_by = user.id;
      
      const result = await apiService.technicianVisits.createVisit(formData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Add the new visit to the state
      setVisits(prev => [result, ...prev]);
      showToast('success', 'Technician visit created successfully');
    } catch (error) {
      console.error('Error creating technician visit:', error);
      showToast('error', `Failed to create visit: ${error.message}`);
      throw error;
    }
  };

  const handleUpdateVisit = async (formData) => {
    try {
      // Add user ID to form data
      formData.updated_by = user.id;
      
      const result = await apiService.technicianVisits.updateVisit(selectedVisit.id, formData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Update the visit in the state
      setVisits(prev => 
        prev.map(visit => visit.id === selectedVisit.id ? result : visit)
      );
      
      showToast('success', 'Technician visit updated successfully');
    } catch (error) {
      console.error('Error updating technician visit:', error);
      showToast('error', `Failed to update visit: ${error.message}`);
      throw error;
    }
  };

  const handleDeleteVisit = async (id) => {
    if (!window.confirm('Are you sure you want to delete this technician visit? This action cannot be undone.')) {
      return;
    }
    
    try {
      const result = await apiService.technicianVisits.deleteVisit(id);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Remove the visit from the state
      setVisits(prev => prev.filter(visit => visit.id !== id));
      showToast('success', 'Technician visit deleted successfully');
    } catch (error) {
      console.error('Error deleting technician visit:', error);
      showToast('error', `Failed to delete visit: ${error.message}`);
    }
  };

  const handleExportVisits = async () => {
    try {
      setExportLoading(true);
      // Use the existing filters for the export
      const filters = {
        status: statusFilter !== 'all' ? statusFilter : null,
        dateFilter: dateFilter !== 'all' ? dateFilter : null
      };
      
      await apiService.technicianVisits.generateReport(filters);
      showToast('success', 'Technician visits exported successfully');
    } catch (error) {
      console.error('Error exporting visits:', error);
      showToast('error', 'Failed to export visits');
    } finally {
      setExportLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setSelectedVisit(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (visit) => {
    setSelectedVisit(visit);
    setShowModal(true);
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Helper function to render status badge
  const renderStatusBadge = (status) => {
    let bgClass = '';
    let textClass = '';
    let icon = null;
    
    switch(status) {
      case 'scheduled':
        bgClass = 'bg-gray-100 dark:bg-gray-700';
        textClass = 'text-gray-800 dark:text-gray-300';
        icon = <Calendar className="w-3 h-3 mr-1" />;
        break;
      case 'in_progress':
        bgClass = 'bg-[#0A2647] dark:bg-white';
        textClass = 'text-white dark:text-[#0A2647]';
        icon = <Clock className="w-3 h-3 mr-1" />;
        break;
      case 'completed':
        bgClass = 'bg-green-100 dark:bg-green-900/30';
        textClass = 'text-green-800 dark:text-green-200';
        icon = <CheckSquare className="w-3 h-3 mr-1" />;
        break;
      case 'cancelled':
        bgClass = 'bg-red-100 dark:bg-red-900/30';
        textClass = 'text-red-800 dark:text-red-200';
        icon = <XCircle className="w-3 h-3 mr-1" />;
        break;
      default:
        bgClass = 'bg-gray-100 dark:bg-gray-700';
        textClass = 'text-gray-800 dark:text-gray-300';
    }
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full flex items-center ${bgClass} ${textClass}`}>
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </span>
    );
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
          <h1 className="text-2xl font-bold mb-4 md:mb-0">Technician Visit Log</h1>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleExportVisits}
              disabled={exportLoading || isLoading}
              className="px-4 py-2 bg-[#0A2647] dark:bg-white text-white dark:text-[#0A2647] rounded-lg
                       hover:bg-[#0A2647]/90 dark:hover:bg-gray-100 flex items-center justify-center"
            >
              {exportLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export Visits
            </button>
            
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-[#0A2647] dark:bg-white text-white dark:text-[#0A2647] rounded-lg
                       hover:bg-[#0A2647]/90 dark:hover:bg-gray-100 flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Visit
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
                  placeholder="Search by technician, company, purpose..."
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
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              <div>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                          bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="this_week">This Week</option>
                  <option value="next_week">Next Week</option>
                  <option value="past">Past Visits</option>
                  <option value="future">Future Visits</option>
                </select>
              </div>
              
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setDateFilter('all');
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
          ) : filteredVisits.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No technician visits found.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 
                          className="font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-[#0A2647] dark:hover:text-gray-300"
                          onClick={() => handleOpenEditModal(visit)}
                        >
                          {visit.technician_name} - {visit.company}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Purpose: {visit.visit_purpose}
                        </p>
                      </div>
                      <div className="ml-4 flex items-center space-x-2">
                        {renderStatusBadge(visit.status)}
                      </div>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">Equipment:</span> {visit.equipment_serviced}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">Location:</span> {visit.location}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">Date:</span> {new Date(visit.visit_date).toLocaleDateString()}
                        </p>
                        {visit.arrival_time && (
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium">Arrival:</span> {visit.arrival_time}
                            {visit.departure_time && ` - Departure: ${visit.departure_time}`}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {visit.escort_required && (
                      <p className="mt-2 text-sm text-[#0A2647] dark:text-white">
                        <span className="font-medium">Security Escort:</span> {visit.escort_name || 'Required'}
                      </p>
                    )}
                    
                    {visit.completion_notes && (
                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Notes:</span> {visit.completion_notes}
                      </p>
                    )}
                    
                    <div className="mt-3 flex justify-end space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(visit)}
                        className="px-2 py-1 text-xs bg-gray-100 text-[#0A2647] dark:bg-gray-600 dark:text-white rounded hover:bg-gray-200 dark:hover:bg-gray-500 flex items-center"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteVisit(visit.id)}
                        className="px-2 py-1 text-xs bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/40 flex items-center"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Technician Visit Modal */}
      <AnimatePresence>
        {showModal && (
          <TechnicianFillModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onSubmit={selectedVisit ? handleUpdateVisit : handleCreateVisit}
            initialData={selectedVisit}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TechnicianFillPage;