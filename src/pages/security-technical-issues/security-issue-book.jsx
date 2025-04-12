// D:\ME\GitHub\SS-Portal\src\pages\SecurityTechnicalIssues\SecurityIssueBook.jsx
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
  Clock,
  AlertTriangle,
  CheckSquare,
  RotateCcw,
  Camera
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

// Security Issue Modal Component
const SecurityIssueModal = ({ isOpen, onClose, onSubmit, initialData = null }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    priority: 'medium',
    reported_by: '',
    assigned_to: '',
    due_date: '',
    status: 'open',
    resolution_notes: '',
    resolution_date: '',
    photo_url: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        due_date: initialData.due_date ? new Date(initialData.due_date).toISOString().split('T')[0] : '',
        resolution_date: initialData.resolution_date ? new Date(initialData.resolution_date).toISOString().split('T')[0] : ''
      });
      if (initialData.photo_url) {
        setPhotoPreview(initialData.photo_url);
      }
      setIsClosed(['resolved', 'not_applicable'].includes(initialData.status));
    } else {
      // Set default due date to 2 days from now for new issues
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 2);
      setFormData({
        ...formData,
        due_date: dueDate.toISOString().split('T')[0],
        reported_by: document.getElementById('current-user-name')?.textContent || ''
      });
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title) newErrors.title = 'Title is required';
    if (!formData.description) newErrors.description = 'Description is required';
    if (!formData.location) newErrors.location = 'Location is required';
    if (!formData.priority) newErrors.priority = 'Priority is required';
    if (!formData.reported_by) newErrors.reported_by = 'Reporter name is required';
    
    // Resolution notes required if status is resolved
    if (formData.status === 'resolved' && !formData.resolution_notes) {
      newErrors.resolution_notes = 'Resolution notes are required when marking issue as resolved';
    }

    // Due date required for open and in_progress issues
    if (['open', 'in_progress'].includes(formData.status) && !formData.due_date) {
      newErrors.due_date = 'Due date is required for open and in-progress issues';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If status is changing to resolved or not_applicable
    if (name === 'status') {
      if (['resolved', 'not_applicable'].includes(value)) {
        setIsClosed(true);
        // Set resolution date to today if not already set
        if (!formData.resolution_date) {
          setFormData(prev => ({
            ...prev,
            [name]: value,
            resolution_date: new Date().toISOString().split('T')[0]
          }));
          return;
        }
      } else {
        setIsClosed(false);
      }
    }
    
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
            {initialData ? 'Edit Security Issue' : 'Report New Security Issue'}
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Issue Title*
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.title ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                placeholder="Brief title describing the issue"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-500">{errors.title}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description*
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.description ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                placeholder="Detailed description of the issue"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-500">{errors.description}</p>
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
                placeholder="Where is the issue located?"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-500">{errors.location}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority*
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.priority ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              {errors.priority && (
                <p className="mt-1 text-sm text-red-500">{errors.priority}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reported By*
              </label>
              <input
                type="text"
                name="reported_by"
                value={formData.reported_by}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.reported_by ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                placeholder="Your name"
              />
              {errors.reported_by && (
                <p className="mt-1 text-sm text-red-500">{errors.reported_by}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assigned To
              </label>
              <input
                type="text"
                name="assigned_to"
                value={formData.assigned_to}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                        bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                        focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent"
                placeholder="Person responsible for fixing"
              />
            </div>

            {!isClosed && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date*
                </label>
                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border 
                            ${errors.due_date ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                            bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                            focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                />
                {errors.due_date && (
                  <p className="mt-1 text-sm text-red-500">{errors.due_date}</p>
                )}
              </div>
            )}

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
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="not_applicable">Not Applicable</option>
              </select>
            </div>

            {/* Photo upload section */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Issue Photo
              </label>
              <div className="flex items-center space-x-4">
                <div className="relative h-32 w-32 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                  {photoPreview ? (
                    <img 
                      src={photoPreview} 
                      alt="Issue" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="h-12 w-12 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    id="photo-upload"
                    onChange={handlePhotoChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="px-4 py-2 bg-[#0A2647] dark:bg-white text-white dark:text-[#0A2647] rounded-lg
                            hover:bg-[#0A2647]/90 dark:hover:bg-gray-100 inline-flex items-center cursor-pointer"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {photoPreview ? 'Change Photo' : 'Upload Photo'}
                  </label>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Upload a photo of the issue (optional). Supports JPG, PNG.
                  </p>
                </div>
              </div>
            </div>

            {isClosed && (
              <>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Resolution Notes*
                  </label>
                  <textarea
                    name="resolution_notes"
                    value={formData.resolution_notes}
                    onChange={handleChange}
                    rows="2"
                    className={`w-full px-4 py-2 rounded-lg border 
                              ${errors.resolution_notes ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                              bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                              focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                    placeholder="Describe how the issue was resolved"
                  />
                  {errors.resolution_notes && (
                    <p className="mt-1 text-sm text-red-500">{errors.resolution_notes}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Resolution Date
                  </label>
                  <input
                    type="date"
                    name="resolution_date"
                    value={formData.resolution_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                            bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                            focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent"
                  />
                </div>
              </>
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

// Main Security Issue Book Component
const SecurityIssueBook = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [issues, setIssues] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [toast, setToast] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchSecurityIssues();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [issues, searchTerm, statusFilter, priorityFilter]);

  const fetchSecurityIssues = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.securityIssues.getAllIssues();
      setIssues(data || []);
      setFilteredIssues(data || []);
    } catch (error) {
      console.error('Error fetching security issues:', error);
      showToast('error', 'Failed to load security issues');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...issues];
    
    // Apply search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        issue =>
          issue.title.toLowerCase().includes(searchLower) ||
          issue.description.toLowerCase().includes(searchLower) ||
          issue.location.toLowerCase().includes(searchLower) ||
          issue.reported_by.toLowerCase().includes(searchLower) ||
          (issue.assigned_to && issue.assigned_to.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(issue => issue.status === statusFilter);
    }
    
    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(issue => issue.priority === priorityFilter);
    }
    
    setFilteredIssues(filtered);
  };

  const handleCreateIssue = async (formData) => {
    try {
      // Add user ID to form data
      formData.append('created_by', user.id);
      formData.append('updated_by', user.id);
      
      const result = await apiService.securityIssues.createIssue(formData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Add the new issue to the state
      setIssues(prev => [result, ...prev]);
      showToast('success', 'Security issue reported successfully');
    } catch (error) {
      console.error('Error creating security issue:', error);
      showToast('error', `Failed to report issue: ${error.message}`);
      throw error;
    }
  };

  const handleUpdateIssue = async (formData) => {
    try {
      // Add user ID to form data
      formData.append('updated_by', user.id);
      
      const result = await apiService.securityIssues.updateIssue(selectedIssue.id, formData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Update the issue in the state
      setIssues(prev => 
        prev.map(issue => issue.id === selectedIssue.id ? result : issue)
      );
      
      showToast('success', 'Security issue updated successfully');
    } catch (error) {
      console.error('Error updating security issue:', error);
      showToast('error', `Failed to update issue: ${error.message}`);
      throw error;
    }
  };

  const handleDeleteIssue = async (id) => {
    if (!window.confirm('Are you sure you want to delete this security issue? This action cannot be undone.')) {
      return;
    }
    
    try {
      const result = await apiService.securityIssues.deleteIssue(id);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Remove the issue from the state
      setIssues(prev => prev.filter(issue => issue.id !== id));
      showToast('success', 'Security issue deleted successfully');
    } catch (error) {
      console.error('Error deleting security issue:', error);
      showToast('error', `Failed to delete issue: ${error.message}`);
    }
  };

  const handleQuickStatusChange = async (id, newStatus) => {
    try {
      // Find the issue first
      const issueToUpdate = issues.find(issue => issue.id === id);
      if (!issueToUpdate) return;
      
      // For resolved status, we need resolution notes
      if (newStatus === 'resolved' && !issueToUpdate.resolution_notes) {
        setSelectedIssue(issueToUpdate);
        setShowModal(true);
        return;
      }
      
      // Otherwise, just update the status
      const formData = new FormData();
      formData.append('status', newStatus);
      formData.append('updated_by', user.id);
      
      // If resolving, add resolution date if not already present
      if (newStatus === 'resolved' && !issueToUpdate.resolution_date) {
        formData.append('resolution_date', new Date().toISOString().split('T')[0]);
      }
      
      const result = await apiService.securityIssues.updateIssue(id, formData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Update the issue in the state
      setIssues(prev => 
        prev.map(issue => issue.id === id ? result : issue)
      );
      
      showToast('success', `Issue status changed to ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating issue status:', error);
      showToast('error', `Failed to update status: ${error.message}`);
    }
  };

  const handleExportIssues = async () => {
    try {
      setExportLoading(true);
      // Use the existing filters for the export
      const filters = {
        status: statusFilter !== 'all' ? statusFilter : null,
        priority: priorityFilter !== 'all' ? priorityFilter : null
      };
      
      await apiService.securityIssues.generateReport(filters);
      showToast('success', 'Security issues exported successfully');
    } catch (error) {
      console.error('Error exporting issues:', error);
      showToast('error', 'Failed to export issues');
    } finally {
      setExportLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setSelectedIssue(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (issue) => {
    setSelectedIssue(issue);
    setShowModal(true);
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Helper function to render priority badge
  const renderPriorityBadge = (priority) => {
    let bgClass = '';
    let icon = null;
    
    switch(priority) {
      case 'low':
        bgClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
        break;
      case 'medium':
        bgClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
        break;
      case 'high':
        bgClass = 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200';
        break;
      case 'critical':
        bgClass = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
        icon = <AlertTriangle className="w-3 h-3 mr-1" />;
        break;
      default:
        bgClass = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full flex items-center ${bgClass}`}>
        {icon}
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  // Helper function to render status badge
  const renderStatusBadge = (status) => {
    let bgClass = '';
    let icon = null;
    let displayText = '';
    
    switch(status) {
        case 'open':
        bgClass = 'bg-[#0A2647] text-white dark:bg-white dark:text-[#0A2647]';
        icon = <AlertCircle className="w-3 h-3 mr-1" />;
        displayText = 'Open';
        break;
      case 'in_progress':
        bgClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
        icon = <Clock className="w-3 h-3 mr-1" />;
        displayText = 'In Progress';
        break;
      case 'resolved':
        bgClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
        icon = <CheckSquare className="w-3 h-3 mr-1" />;
        displayText = 'Resolved';
        break;
      case 'not_applicable':
        bgClass = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        displayText = 'Not Applicable';
        break;
      default:
        bgClass = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        displayText = status;
    }
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full flex items-center ${bgClass}`}>
        {icon}
        {displayText}
      </span>
    );
  };
}
export default SecurityIssueBook;