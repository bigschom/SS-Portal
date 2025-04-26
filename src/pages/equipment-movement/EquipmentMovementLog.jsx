import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  Loader2, 
  Plus, 
  Search, 
  FileText, 
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle
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

// Equipment Movement Log Entry Modal
const EquipmentMovementModal = ({ isOpen, onClose, onSubmit, initialData = null }) => {
  const [formData, setFormData] = useState({
    item_name: '',
    item_description: '',
    serial_number: '',
    tag_number: '',
    quantity: 1,
    movement_type: 'out', // 'in' or 'out'
    carried_by: '',
    authorized_by: '',
    destination_from: '',
    destination_to: '',
    notes: '',
    status: 'pending_return' // 'pending_return', 'returned', 'approved_non_return'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        tag_number: initialData.tag_number || ''
      });
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.item_name) newErrors.item_name = 'Item name is required';
    if (!formData.carried_by) newErrors.carried_by = 'Carrier name is required';
    if (!formData.authorized_by) newErrors.authorized_by = 'Authorization is required';
    if (!formData.destination_from) newErrors.destination_from = 'Destination From is required';
    if (!formData.destination_to) newErrors.destination_to = 'Destination To is required';
    
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
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {initialData ? 'Edit Equipment Movement' : 'Record Equipment Movement'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Movement Type*
              </label>
              <select
                name="movement_type"
                value={formData.movement_type}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                        bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                        focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent"
              >
                <option value="out">Outgoing</option>
                <option value="in">Incoming</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Item Name*
              </label>
              <input
                type="text"
                name="item_name"
                value={formData.item_name}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.item_name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                placeholder="Enter item name"
              />
              {errors.item_name && (
                <p className="mt-1 text-sm text-red-500">{errors.item_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Serial Number
              </label>
              <input
                type="text"
                name="serial_number"
                value={formData.serial_number}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                        bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                        focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent"
                placeholder="Enter serial number (if applicable)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                TAG Number
              </label>
              <input
                type="text"
                name="tag_number"
                value={formData.tag_number}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                        bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                        focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent"
                placeholder="Enter TAG number (if applicable)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="1"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                        bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                        focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Carried By*
              </label>
              <input
                type="text"
                name="carried_by"
                value={formData.carried_by}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.carried_by ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                placeholder="Name of person carrying the item"
              />
              {errors.carried_by && (
                <p className="mt-1 text-sm text-red-500">{errors.carried_by}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Authorized By*
              </label>
              <input
                type="text"
                name="authorized_by"
                value={formData.authorized_by}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.authorized_by ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                placeholder="Name of person who authorized"
              />
              {errors.authorized_by && (
                <p className="mt-1 text-sm text-red-500">{errors.authorized_by}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Destination From*
              </label>
              <input
                type="text"
                name="destination_from"
                value={formData.destination_from}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.destination_from ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                placeholder="Origin of the item"
              />
              {errors.destination_from && (
                <p className="mt-1 text-sm text-red-500">{errors.destination_from}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Destination To*
              </label>
              <input
                type="text"
                name="destination_to"
                value={formData.destination_to}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border 
                          ${errors.destination_to ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white focus:border-transparent`}
                placeholder="Final destination of the item"
              />
              {errors.destination_to && (
                <p className="mt-1 text-sm text-red-500">{errors.destination_to}</p>
              )}
            </div>

            {initialData && (
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
                  <option value="pending_return">Pending Return</option>
                  <option value="returned">Returned</option>
                  <option value="approved_non_return">Approved Non-Return</option>
                </select>
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
              placeholder="Any additional details..."
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
                  <Save className="w-4 h-4 mr-2" />
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

// Main Equipment Movement Log Component
const EquipmentMovementLog = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [equipmentLogs, setEquipmentLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchEquipmentLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [equipmentLogs, searchTerm, statusFilter, dateFilter]);

  const fetchEquipmentLogs = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.equipmentMovement.getAllMovementLogs();
      setEquipmentLogs(data || []);
      setFilteredLogs(data || []);
    } catch (error) {
      console.error('Error fetching equipment logs:', error);
      showToast('error', 'Failed to load equipment movement logs');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...equipmentLogs];
    
    // Apply search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        log =>
          log.item_name.toLowerCase().includes(searchLower) ||
          log.serial_number?.toLowerCase().includes(searchLower) ||
          log.tag_number?.toLowerCase().includes(searchLower) ||
          log.carried_by.toLowerCase().includes(searchLower) ||
          log.authorized_by.toLowerCase().includes(searchLower) ||
          log.destination_from?.toLowerCase().includes(searchLower) ||
          log.destination_to?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter);
    }
    
    // Apply date filter
    if (dateFilter !== 'all') {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const ninetyDaysAgo = new Date(today);
      ninetyDaysAgo.setDate(today.getDate() - 90);
      
      if (dateFilter === 'today') {
        filtered = filtered.filter(log => {
          const logDate = new Date(log.created_at);
          return (
            logDate.getDate() === today.getDate() &&
            logDate.getMonth() === today.getMonth() &&
            logDate.getFullYear() === today.getFullYear()
          );
        });
      } else if (dateFilter === '30days') {
        filtered = filtered.filter(log => {
          const logDate = new Date(log.created_at);
          return logDate >= thirtyDaysAgo;
        });
      } else if (dateFilter === '90days') {
        filtered = filtered.filter(log => {
          const logDate = new Date(log.created_at);
          return logDate >= ninetyDaysAgo;
        });
      }
    }
    
    setFilteredLogs(filtered);
  };

  const handleCreateMovementLog = async (formData) => {
    try {
      formData.created_by = user.id;
      formData.updated_by = user.id;
      
      const result = await apiService.equipmentMovement.createMovementLog(formData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Add the new log to the state
      setEquipmentLogs(prev => [result, ...prev]);
      showToast('success', 'Equipment movement logged successfully');
    } catch (error) {
      console.error('Error creating equipment movement log:', error);
      showToast('error', `Failed to create log: ${error.message}`);
      throw error;
    }
  };

  const handleUpdateMovementLog = async (formData) => {
    try {
      formData.updated_by = user.id;
      
      const result = await apiService.equipmentMovement.updateMovementLog(selectedLog.id, formData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Update the log in the state
      setEquipmentLogs(prev => 
        prev.map(log => log.id === selectedLog.id ? result : log)
      );
      
      showToast('success', 'Equipment movement log updated successfully');
    } catch (error) {
      console.error('Error updating equipment movement log:', error);
      showToast('error', `Failed to update log: ${error.message}`);
      throw error;
    }
  };

  const handleOpenCreateModal = () => {
    setSelectedLog(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (log) => {
    setSelectedLog(log);
    setShowModal(true);
  };

  const handleGenerateReport = async () => {
    try {
      setIsLoading(true);
      await apiService.equipmentMovement.generateReport();
      showToast('success', 'Report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      showToast('error', 'Failed to generate report');
    } finally {
      setIsLoading(false);
    }
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
          <h1 className="text-2xl font-bold mb-4 md:mb-0">Equipment Movement Log</h1>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleGenerateReport}
              disabled={isLoading}
              className="px-4 py-2 bg-[#0A2647] dark:bg-white text-white dark:text-[#0A2647] rounded-lg
                       hover:bg-[#0A2647]/90 dark:hover:bg-gray-100 flex items-center justify-center"
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </button>
            
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-[#0A2647] dark:bg-white text-white dark:text-[#0A2647] rounded-lg
                       hover:bg-[#0A2647]/90 dark:hover:bg-gray-100 flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Entry
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
                  placeholder="Search by item, serial number, person..."
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
                  <option value="pending_return">Pending Return</option>
                  <option value="returned">Returned</option>
                  <option value="approved_non_return">Approved Non-Return</option>
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
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 90 Days</option>
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
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No equipment movement logs found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Item
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Direction
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Carried By
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Authorized By
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Destination From
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Destination To
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredLogs.map((log) => (
                    <tr 
                      key={log.id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => handleOpenEditModal(log)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {log.item_name}
                        </div>
                        {log.serial_number && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            SN: {log.serial_number}
                          </div>
                        )}
                        {log.tag_number && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            TAG: {log.tag_number}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${log.movement_type === 'out' 
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200' 
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                          }`}
                        >
                          {log.movement_type === 'out' ? 'Outgoing' : 'Incoming'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {log.carried_by}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {log.authorized_by}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${log.status === 'pending_return' 
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                            : log.status === 'returned' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                          }`}
                        >
                          {log.status === 'pending_return' 
                            ? 'Pending Return' 
                            : log.status === 'returned' 
                              ? 'Returned' 
                              : 'Non-Return Approved'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(log);
                          }}
                          className="text-[#0A2647] hover:text-[#0A2647]/80 dark:text-white dark:hover:text-gray-300"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Movement Modal */}
      <AnimatePresence>
        {showModal && (
          <EquipmentMovementModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onSubmit={selectedLog ? handleUpdateMovementLog : handleCreateMovementLog}
            initialData={selectedLog}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default EquipmentMovementLog;