import React, { createContext, useContext, useState, useEffect } from 'react';
import { requestNotificationPermission } from '../../../../utils/notificationUtils';

// Create context
const TaskContext = createContext();

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};

export const TaskProvider = ({ children }) => {
  // Get user from sessionStorage instead of useAuth hook
  const getUserFromStorage = () => {
    try {
      const userStr = sessionStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing user from sessionStorage:', error);
      return null;
    }
  };
  
  const user = getUserFromStorage();
  
  // Create a simplified toast function
  const toast = {
    success: (message) => console.log('Success:', message),
    error: (message) => console.error('Error:', message),
    warning: (message) => console.warn('Warning:', message),
    info: (message) => console.info('Info:', message)
  };
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('available');
  const [actionLoading, setActionLoading] = useState({});
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showHandlersTab, setShowHandlersTab] = useState(false);
  
  // Dialog states
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editableData, setEditableData] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSendBackDialog, setShowSendBackDialog] = useState(false);
  const [viewResponsesOpen, setViewResponsesOpen] = useState(false);
  const [editPermission, setEditPermission] = useState(false);
  
  // Form states
  const [commentText, setCommentText] = useState('');
  const [responseText, setResponseText] = useState('');
  const [sendBackReason, setSendBackReason] = useState('');
  
  // Timer state
  const [timeLeftInMinutes, setTimeLeftInMinutes] = useState(null);

  // Initialize notifications
  useEffect(() => {
    const initNotifications = async () => {
      const hasPermission = await requestNotificationPermission();
      if (hasPermission && 'serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/service-worker.js');
          console.log('ServiceWorker registration successful');
        } catch (error) {
          console.error('ServiceWorker registration failed:', error);
        }
      }
      setNotificationsEnabled(hasPermission);
    };
    
    initNotifications();
  }, []);

  // Auto-dismiss notifications
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Set loading for a specific request
  const setRequestLoading = (requestId, isLoading) => {
    setActionLoading(prev => ({ ...prev, [requestId]: isLoading }));
  };

  // Clear dialog states
  const clearDialogStates = () => {
    setIsDialogOpen(false);
    setSelectedRequest(null);
    setCommentText('');
    setResponseText('');
    setSendBackReason('');
    setShowEditDialog(false);
    setShowSendBackDialog(false);
    setViewResponsesOpen(false);
  };

  // Toggle a dialog
  const toggleDialog = (dialogName, value, request = null) => {
    switch (dialogName) {
      case 'main':
        setIsDialogOpen(value);
        if (request) {
          setSelectedRequest(request);
          setEditableData(request);
        }
        break;
      case 'edit':
        setShowEditDialog(value);
        break;
      case 'sendBack':
        setShowSendBackDialog(value);
        break;
      case 'viewResponses':
        setViewResponsesOpen(value);
        break;
      default:
        break;
    }
  };

  // Share values through context
  const contextValue = {
    // State values
    user,
    loading,
    setLoading,
    pageLoading,
    setPageLoading,
    error,
    setError,
    success,
    setSuccess,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    actionLoading,
    setActionLoading,
    notificationsEnabled,
    showHandlersTab,
    setShowHandlersTab,
    
    // Request related states
    selectedRequest,
    setSelectedRequest,
    isDialogOpen,
    setIsDialogOpen,
    editableData,
    setEditableData,
    showEditDialog,
    showSendBackDialog,
    viewResponsesOpen,
    editPermission,
    setEditPermission,
    
    // Form states
    commentText,
    setCommentText,
    responseText,
    setResponseText,
    sendBackReason,
    setSendBackReason,
    
    // Timer state
    timeLeftInMinutes,
    setTimeLeftInMinutes,
    
    // Utility functions
    setRequestLoading,
    clearDialogStates,
    toggleDialog,
    toast
  };

  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
};