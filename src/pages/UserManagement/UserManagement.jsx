import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, 
  Edit2, 
  Lock, 
  Trash2, 
  Search, 
  Copy, 
  Check, 
  FileSpreadsheet, 
  Loader2, 
  Key, 
  AlertTriangle, 
  Unlock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import apiService from '../../config/api-service';
import { useAuth } from '../../hooks/useAuth';
import useRoleCheck from '../../hooks/useRoleCheck';

// Toast Notification Component
const Toast = ({ type, message, onClose }) => {
  return (
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
};

// User Modal Component for Create/Edit
const UserModal = ({ isOpen, mode, user, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    role: '',
    is_active: true
  });
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameModified, setUsernameModified] = useState(false);
  const [originalUsername, setOriginalUsername] = useState('');

  // Reset state when modal opens/closes or user changes
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        full_name: user.full_name || '',
        role: user.role || '',
        is_active: user.is_active ?? true
      });
      setOriginalUsername(user.username || '');
      setUsernameModified(false);
      setUsernameAvailable(true);
    } else {
      setFormData({
        username: '',
        full_name: '',
        role: '',
        is_active: true
      });
      setOriginalUsername('');
      setUsernameModified(false);
      setUsernameAvailable(true);
    }
  }, [user, isOpen]);

  // Auto-generate username when full_name changes (only in create mode)
  useEffect(() => {
    if (mode === 'create' && formData.full_name && !usernameModified) {
      const generatedUsername = generateUsername(formData.full_name);
      setFormData(prev => ({ ...prev, username: generatedUsername }));
      
      // Show loading spinner briefly without validation
      checkUsernameAvailability(generatedUsername);
    }
  }, [formData.full_name, mode, usernameModified]);

  // Check username availability
  const checkUsernameAvailability = async (username) => {
    // No need to check availability anymore as backend will handle it
    if (!username) {
      return;
    }

    // If in edit mode and username is unchanged, it's always valid
    if (mode === 'edit' && username === originalUsername) {
      return;
    }

    // We'll just set checkingUsername during typing to show the spinner
    // But we won't actually perform the check or display any validation results
    setCheckingUsername(true);
    
    // Simulate a brief delay to show the spinner then hide it
    setTimeout(() => {
      setCheckingUsername(false);
    }, 300);
  };

  // Handle username change with debounce
  const handleUsernameChange = (e) => {
    const newUsername = e.target.value;
    setFormData({ ...formData, username: newUsername });
    setUsernameModified(true);
    
    // Debounce the API call
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      checkUsernameAvailability(newUsername);
    }, 500);
  };

  const timeoutRef = useRef(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const roles = [
    { value: 'admin', label: 'Administrator' },
    { value: 'superuser', label: 'Super User' },
    { value: 'standarduser', label: 'Standard User' },
    { value: 'security_guard', label: 'Security Guard' },
    { value: 'user', label: 'User' },
    { value: 'user1', label: 'User Level 1' },
    { value: 'user2', label: 'User Level 2' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!usernameAvailable) return;
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full mx-4"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {mode === 'create' ? 'Create User' : 'Edit User'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                       bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.username}
                onChange={handleUsernameChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white"
                required
              />
              {checkingUsername && (
                <Loader2 className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 animate-spin" />
              )}
            </div>
            {/* No error message - removed as requested */}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                       bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white"
              required
            >
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-[#0A2647] dark:text-white border-gray-300 dark:border-gray-700 
                       rounded focus:ring-[#0A2647] dark:focus:ring-white"
            />
            <label htmlFor="is_active" className="ml-2 text-gray-700 dark:text-gray-300">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 
                       dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
                          <button
              type="submit"
              className="flex items-center px-4 py-2 bg-[#0A2647] dark:bg-white text-white dark:text-[#0A2647] rounded-lg
                      hover:bg-[#0A2647]/90 dark:hover:bg-gray-200 transition-colors"
            >
              {mode === 'create' ? 'Create' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Temporary Password Modal Component
const TempPasswordModal = ({ isOpen, onClose, tempPassword }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full mx-4"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Temporary Password Generated
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Please copy this temporary password. It will expire in 24 hours.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200 font-mono">
              {tempPassword}
            </code>
            <button
              onClick={handleCopy}
              className="p-2 text-[#0A2647] hover:text-[#0A2647]/90 dark:text-white dark:hover:text-gray-200"
            >
              {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#0A2647] dark:bg-white text-white dark:text-[#0A2647] rounded-lg hover:bg-[#0A2647]/90 dark:hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Confirmation Modal Component
const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full mx-4"
      >
        <div className="flex items-center mb-4">
          <AlertTriangle className="h-6 w-6 text-[#0A2647] dark:text-white mr-2" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
        </div>

        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>

        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Utility function for username generation
const generateUsername = (fullName) => {
  if (!fullName) return '';
  
  // Remove special characters and convert to lowercase
  const cleanName = fullName.replace(/[^a-zA-Z\s]/g, '').toLowerCase();
  
  // Split name and create username
  const nameParts = cleanName.split(' ').filter(part => part.trim() !== '');
  
  if (nameParts.length === 0) return '';
  
  // First 6 chars of first name + first char of last name for all cases
  // If only one name, treat it as both first and last name
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
    
  // Handle first name with different lengths
  const firstPart = firstName.length > 6 ? firstName.substring(0, 6) : firstName;
  const lastPart = lastName.charAt(0);
    
  return firstPart + lastPart;
};

// Main UserManagement Component
const UserManagement = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const roleCheck = useRoleCheck();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showTempPasswordModal, setShowTempPasswordModal] = useState(false);
  const [currentTempPassword, setCurrentTempPassword] = useState('');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState(null);
  const [confirmationTitle, setConfirmationTitle] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Show toast notification
  const showToast = (type, message, duration = 5000) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), duration);
  };

  // Check if user has permission to manage users
  useEffect(() => {
    if (!roleCheck.canManageUsers()) {
      navigate('/dashboard');
      showToast('error', 'You do not have permission to access this page');
    }
  }, [roleCheck, navigate]);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await apiService.users.getAllUsers();
      
      if (data.error) {
        showToast('error', `Failed to load users: ${data.error}`);
        throw new Error(data.error);
      }
      
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('error', 'Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Generate a random temporary password
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Handle create user
  const handleCreateUser = async (userData) => {
    try {
      // If no username is provided, generate one
      if (!userData.username) {
        const generatedUsername = generateUsername(userData.full_name);
        userData.username = generatedUsername;
      }

      const tempPassword = generateTempPassword();
      
      // Call the API to create a user with username instead of ID
      const result = await apiService.users.createUser({
        username: userData.username,
        full_name: userData.full_name,
        role: userData.role,
        is_active: userData.is_active,
        tempPassword,
        created_by: currentUser.username
      });
    
      if (result.error) {
        showToast('error', `Error creating user: ${result.error}`);
        throw new Error(result.error);
      }
      
      // Show success toast
      showToast('success', `User ${userData.username} created successfully`);
      
      // Show the plain text password to the user
      setCurrentTempPassword(tempPassword);
      setShowTempPasswordModal(true);
      fetchUsers();
      setShowModal(false);
      
      // Log activity
      try {
        if (apiService.activityLog && apiService.activityLog.logActivity) {
          await apiService.activityLog.logActivity({
            userId: currentUser.id, // We still need ID for the log itself
            description: `Created new user: ${userData.username}`,
            type: 'user_management'
          });
        }
      } catch (logError) {
        console.error('Error logging activity:', logError);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      showToast('error', `Error creating user: ${error.message || 'Unknown error'}`);
    }
  };

  // Add password expiration check
  const isPasswordExpired = (user) => {
    if (!user.password_expires_at) return false;
    
    const expirationDate = new Date(user.password_expires_at);
    const currentDate = new Date();
    
    return currentDate > expirationDate;
  };

  // Calculate days until password expiration
  const getDaysUntilExpiration = (user) => {
    if (!user.password_expires_at) return null;
    
    const expirationDate = new Date(user.password_expires_at);
    const currentDate = new Date();
    const timeDiff = expirationDate.getTime() - currentDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return daysDiff;
  };
  
  // Handle update user
  const handleUpdateUser = async (userData) => {
    try {
      // Make sure is_active is a boolean, not a string
      const isActive = typeof userData.is_active === 'string' 
        ? userData.is_active === 'true' 
        : Boolean(userData.is_active);
      
      // Call the API to update a user, using username instead of user ID
      const result = await apiService.users.updateUser(selectedUser.id, {
        username: userData.username,
        full_name: userData.full_name,
        role: userData.role,
        is_active: isActive,
        updated_by: currentUser.username // Store username instead of ID
      });
    
      if (result.error) {
        showToast('error', `Error updating user: ${result.error}`);
        throw new Error(result.error);
      }
      
      showToast('success', `User ${userData.username} updated successfully`);
      fetchUsers();
      setShowModal(false);
      
      // Log the activity
      try {
        if (apiService.activityLog && apiService.activityLog.logActivity) {
          await apiService.activityLog.logActivity({
            userId: currentUser.id, // Still need ID for the activity log
            description: `Updated user: ${userData.username}`,
            type: 'user_management'
          });
        }
      } catch (logError) {
        console.error('Error logging activity:', logError);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showToast('error', `Error updating user: ${error.message}`);
    }
  };

  // Handle reset password
  const handleResetPassword = async (userId) => {
    try {
      const tempPassword = generateTempPassword();
      
      // Call the API to reset password, using username instead of ID
      const result = await apiService.users.resetPassword(userId, {
        tempPassword,
        updated_by: currentUser.username // Store username instead of ID
      });
    
      if (result.error) {
        showToast('error', `Error resetting password: ${result.error}`);
        throw new Error(result.error);
      }
    
      showToast('success', 'Password reset successfully');
      setCurrentTempPassword(tempPassword);
      setShowTempPasswordModal(true);
      
      // Log the activity
      try {
        if (apiService.activityLog && apiService.activityLog.logActivity) {
          await apiService.activityLog.logActivity({
            userId: currentUser.id, // Still need ID for the activity log
            description: `Reset password for user ID: ${userId}`,
            type: 'user_management'
          });
        }
      } catch (logError) {
        console.error('Error logging activity:', logError);
      }
      
      fetchUsers();
    } catch (error) {
      console.error('Error resetting password:', error);
      showToast('error', `Error resetting password: ${error.message}`);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId) => {
    try {
      // Call the API to delete a user
      const result = await apiService.users.deleteUser(userId);
    
      if (result.error) {
        showToast('error', `Error deleting user: ${result.error}`);
        throw new Error(result.error);
      }
      
      showToast('success', 'User deleted successfully');
      fetchUsers();
      
      // Log the activity
      try {
        if (apiService.activityLog && apiService.activityLog.logActivity) {
          await apiService.activityLog.logActivity({
            userId: currentUser.id,
            description: `Deleted user ID: ${userId}`,
            type: 'user_management'
          });
        }
      } catch (logError) {
        console.error('Error logging activity:', logError);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('error', `Error deleting user: ${error.message}`);
    }
  };

  // Handle unlock account
  const handleUnlockAccount = async (userId) => {
    try {
      // Call the API to unlock an account
      const result = await apiService.auth.unlockAccount(userId);
      
      if (result.error) {
        showToast('error', `Error unlocking account: ${result.error}`);
        throw new Error(result.error);
      }
      
      showToast('success', 'Account unlocked successfully');
      
      // Log the activity
      try {
        if (apiService.activityLog && apiService.activityLog.logActivity) {
          await apiService.activityLog.logActivity({
            userId: currentUser.id,
            description: `Unlocked account for user ID: ${userId}`,
            type: 'user_management'
          });
        }
      } catch (logError) {
        console.error('Error logging activity:', logError);
      }
      
      // Refresh the users list
      fetchUsers();
    } catch (error) {
      console.error('Error unlocking account:', error);
      showToast('error', `Error unlocking account: ${error.message}`);
    }
  };

  // Show confirmation modal for actions that need confirmation
  const showConfirmation = (action, user, title, message) => {
    setConfirmationAction(() => action);
    setConfirmationTitle(title);
    setConfirmationMessage(message);
    setSelectedUser(user);
    setShowConfirmationModal(true);
  };

  // Handle confirmation modal confirm button
  const handleConfirmAction = () => {
    if (confirmationAction) {
      confirmationAction();
    }
    setShowConfirmationModal(false);
  };

  // Export users to Excel
  const exportToExcel = async () => {
    try {
      setExportLoading(true);
      
      // Format data for export
      const exportData = users.map(user => ({
        'Username': user.username,
        'Full Name': user.full_name,
        'Role': user.role,
        'Status': user.is_active ? 'Active' : 'Inactive',
        'Last Login': user.last_login ? new Date(user.last_login).toLocaleString() : 'Never',
        'Created At': user.created_at ? new Date(user.created_at).toLocaleString() : 'Unknown'
      }));
      
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Users');
      
      // Generate filename with current date
      const fileName = `users_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Write file and trigger download
      XLSX.writeFile(wb, fileName);
      
      showToast('success', 'Users exported successfully');
      
      // Log the activity
      try {
        if (apiService.activityLog && apiService.activityLog.logActivity) {
          await apiService.activityLog.logActivity({
            userId: currentUser.id,
            description: 'Exported users data to Excel',
            type: 'user_management'
          });
        }
      } catch (logError) {
        console.error('Error logging activity:', logError);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      showToast('error', 'Failed to export data. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.username?.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower)
    );
  });

  // Password expiration display helper
  const renderPasswordExpiration = (user) => {
    if (!user.password_expires_at) {
      return 'Not set';
    }
    
    if (isPasswordExpired(user)) {
      return (
        <span className="flex items-center text-red-500 font-medium">
          <AlertTriangle className="mr-2 h-4 w-4" />
          Expired - Change Required
        </span>
      );
    } else {
      const daysLeft = getDaysUntilExpiration(user);
      if (daysLeft === null) return 'Not set';
      
      if (daysLeft <= 0) {
        return (
          <span className="flex items-center text-red-500 font-medium">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Expired Today
          </span>
        );
      } else if (daysLeft === 1) {
        return (
          <span className="flex items-center text-orange-500 font-medium">
            <Calendar className="mr-2 h-4 w-4" />
            Expires Tomorrow
          </span>
        );
      } else if (daysLeft <= 5) {
        return (
          <span className="flex items-center text-orange-500 font-medium">
            <Calendar className="mr-2 h-4 w-4" />
            Expires in {daysLeft} Days
          </span>
        );
      } else if (daysLeft <= 10) {
        return (
          <span className="flex items-center text-yellow-500 font-medium">
            <Calendar className="mr-2 h-4 w-4" />
            {daysLeft} Days Left
          </span>
        );
      } else {
        return (
          <span className="flex items-center text-green-500 font-medium">
            <CheckCircle className="mr-2 h-4 w-4" />
            Valid ({daysLeft} Days)
          </span>
        );
      }
    }
  };

  return (
    <div className="p-6">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <Toast 
            type={toast.type} 
            message={toast.message} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            User Management
          </h1>
          <div className="flex space-x-2">
            <button
              onClick={exportToExcel}
              disabled={exportLoading || loading}
              className="flex items-center px-4 py-2 bg-[#0A2647] dark:bg-white text-white dark:text-[#0A2647] rounded-lg
                       hover:bg-[#0A2647]/90 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {exportLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 mr-2" />
              )}
              Export
            </button>
            <button
              onClick={() => {
                setModalMode('create');
                setSelectedUser(null);
                setShowModal(true);
              }}
              className="flex items-center px-4 py-2 bg-[#0A2647] dark:bg-white text-white dark:text-[#0A2647] rounded-lg
                       hover:bg-[#0A2647]/90 dark:hover:bg-gray-200 transition-colors"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-200 dark:border-gray-700
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white"
            />
            <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <colgroup>
                <col className="w-1/7" />{/* Username */}
                <col className="w-1/7" />{/* Full Name */}
                <col className="w-1/7" />{/* Role */}
                <col className="w-1/7" />{/* Status */}
                <col className="w-1/7" />{/* Last Login */}
                <col className="w-1/7" />{/* Password Expiration */}
                <col className="w-1/7" />{/* Actions */}
              </colgroup>
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Username
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Full Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Password Expiration
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0A2647] dark:text-white" />
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {user.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {renderPasswordExpiration(user)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => {
                              setModalMode('edit');
                              setSelectedUser(user);
                              setShowModal(true);
                            }}
                            className="text-[#0A2647] hover:text-[#0A2647]/80 dark:text-white dark:hover:text-gray-300"
                            title="Edit User"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => showConfirmation(
                              () => handleResetPassword(user.id),
                              user,
                              'Reset Password',
                              `Are you sure you want to reset the password for ${user.username}?`
                            )}
                            className="text-[#0A2647] hover:text-[#0A2647]/80 dark:text-white dark:hover:text-gray-300"
                            title="Reset Password"
                          >
                            <Key className="h-4 w-4" />
                          </button>
                          {user.failed_login_attempts > 0 && (
                            <button
                              onClick={() => showConfirmation(
                                () => handleUnlockAccount(user.id),
                                user,
                                'Unlock Account',
                                `Are you sure you want to unlock the account for ${user.username}?`
                              )}
                              className="text-[#0A2647] hover:text-[#0A2647]/80 dark:text-white dark:hover:text-gray-300"
                              title="Unlock Account"
                            >
                              <Unlock className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => showConfirmation(
                              () => handleDeleteUser(user.id),
                              user,
                              'Delete User',
                              `Are you sure you want to delete ${user.username}? This action cannot be undone.`
                            )}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User Modal */}
      <UserModal
        isOpen={showModal}
        mode={modalMode}
        user={selectedUser}
        onClose={() => setShowModal(false)}
        onSubmit={modalMode === 'create' ? handleCreateUser : handleUpdateUser}
      />

      {/* Temporary Password Modal */}
      <TempPasswordModal
        isOpen={showTempPasswordModal}
        onClose={() => setShowTempPasswordModal(false)}
        tempPassword={currentTempPassword}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmationModal}
        title={confirmationTitle}
        message={confirmationMessage}
        onConfirm={handleConfirmAction}
        onCancel={() => setShowConfirmationModal(false)}
      />
    </div>
  );
};

export default UserManagement;