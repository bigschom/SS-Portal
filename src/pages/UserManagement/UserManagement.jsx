import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Unlock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';

// User Modal Component for Create/Edit
const UserModal = ({ isOpen, mode, user, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    role: '',
    is_active: true
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        full_name: user.full_name || '',
        role: user.role || '',
        is_active: user.is_active ?? true
      });
    } else {
      setFormData({
        username: '',
        full_name: '',
        role: '',
        is_active: true
      });
    }
  }, [user]);

const roles = [
  { value: 'admin', label: 'Administrator' },
  { value: 'manager', label: 'Manager' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'security_guard', label: 'Security Guard' },
  { value: 'user', label: 'User' },
  { value: 'user1', label: 'User Level 1' },
  { value: 'user2', label: 'User Level 2' }
];

  const handleSubmit = (e) => {
    e.preventDefault();
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
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                       bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              required
            />
          </div>

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
                       focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              required
            />
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
                       focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
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
              className="h-4 w-4 text-black dark:text-white border-gray-300 dark:border-gray-700 
                       rounded focus:ring-black dark:focus:ring-white"
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
              className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg
                      hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
            <code className="flex-1 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg font-mono text-lg break-all">
              {tempPassword}
            </code>
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Copy className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              )}
            </button>
          </div>
          {copied && (
            <p className="text-sm text-green-500 mt-2">
              ✓ Copied to clipboard
            </p>
          )}
        </div>

        <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
          <p>Important notes:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>This password is valid for 24 hours only</li>
            <li>User will be required to change it upon first login</li>
            <li>Keep this password secure and do not share it</li>
          </ul>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Account Lock Status Component
const AccountLockStatus = ({ user, onUnlock }) => {
  if (!user.locked_at) return null;

  const lockedDate = new Date(user.locked_at).toLocaleString();
  
  return (
    <div className="mt-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
      <div className="flex items-center gap-1.5 mb-1">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span className="font-medium">Account locked</span>
      </div>
      <p>Locked on {lockedDate} due to failed login attempts</p>
      <button
        onClick={() => onUnlock(user)}
        className="mt-1.5 flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
      >
        <Key className="w-3 h-3" />
        <span>Unlock account</span>
      </button>
    </div>
  );
};

// UnlockAccountModal Component
const UnlockAccountModal = ({ isOpen, onClose, onUnlock, user }) => {
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [result, setResult] = useState(null);

  if (!isOpen || !user) return null;

  const handleUnlock = async () => {
    setIsUnlocking(true);
    setResult(null);
    
    try {
      const response = await onUnlock(user.id);
      setResult(response);
      
      if (response.success) {
        setTimeout(() => onClose(), 1500);
      }
    } catch (error) {
      setResult({ success: false, error: 'An unexpected error occurred' });
    } finally {
      setIsUnlocking(false);
    }
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
            Unlock Account
          </h2>
          <button
            onClick={onClose}
            disabled={isUnlocking}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-1.5 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              Account is currently locked
            </span>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Are you sure you want to unlock the account for <span className="font-medium text-gray-700 dark:text-gray-300">{user.full_name} ({user.username})</span>?
          </p>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This will reset the failed login attempts counter and allow the user to log in again.
          </p>
        </div>

        {result && (
          <div className={`mb-4 p-3 rounded-lg ${
            result.success 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
          }`}>
            {result.success 
              ? '✓ Account successfully unlocked' 
              : `× Error: ${result.error}`}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isUnlocking}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 
                     dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUnlock}
            disabled={isUnlocking || (result && result.success)}
            className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg
                     hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            {isUnlocking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Unlocking...
              </>
            ) : (
              <>
                <Key className="w-4 h-4" />
                Unlock Account
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Main User Management Component
const UserManagement = () => {
  const { user: currentUser, unlockAccount } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [showTempPasswordModal, setShowTempPasswordModal] = useState(false);
  const [currentTempPassword, setCurrentTempPassword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [userToUnlock, setUserToUnlock] = useState(null);

  // Available roles
const roles = [
  { value: 'admin', label: 'Administrator' },
  { value: 'manager', label: 'Manager' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'security_guard', label: 'Security Guard' },
  { value: 'user', label: 'User' },
  { value: 'user1', label: 'User Level 1' },
  { value: 'user2', label: 'User Level 2' }
];

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, statusFilter, roleFilter]);

  const generateTempPassword = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let tempPassword = '';
    const randomValues = new Uint32Array(10);
    crypto.getRandomValues(randomValues);
    
    for (let i = 0; i < randomValues.length; i++) {
      tempPassword += characters[randomValues[i] % characters.length];
    }

    return tempPassword;
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'locked') {
          query = query.not('locked_at', 'is', null);
        } else {
          const isActive = statusFilter === 'active';
          query = query.eq('is_active', isActive);
        }
      }
      
      // Apply role filter
      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }

      // Apply search filter
      if (searchTerm) {
        query = query.or(
          `username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      const tempPassword = generateTempPassword();
      const tempPasswordExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('users')
        .insert([{
          ...userData,
          temp_password: tempPassword,
          temp_password_expires: tempPasswordExpiry,
          password_change_required: true,
          created_by: currentUser.username
        }]);

      if (error) throw error;
      
      setCurrentTempPassword(tempPassword);
      setShowTempPasswordModal(true);
      fetchUsers();
      setShowModal(false);
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleUpdateUser = async (userData) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          ...userData,
          updated_by: currentUser.username,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (error) throw error;
      
      fetchUsers();
      setShowModal(false);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleResetPassword = async (userId) => {
    try {
      const tempPassword = generateTempPassword();
      const tempPasswordExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      const { error } = await supabase
        .from('users')
        .update({
          temp_password: tempPassword,
          temp_password_expires: tempPasswordExpiry,
          password_change_required: true,
          updated_by: currentUser.username
        })
        .eq('id', userId);

      if (error) throw error;

      setCurrentTempPassword(tempPassword);
      setShowTempPasswordModal(true);
      
      fetchUsers();
    } catch (error) {
      console.error('Error resetting password:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleUnlockAccount = async (userId) => {
    try {
      const { error } = await unlockAccount(userId);
      
      if (error) throw new Error(error);
      
      // Refresh the users list
      fetchUsers();
      
      return { success: true };
    } catch (error) {
      console.error('Error unlocking account:', error);
      return { success: false, error: error.message };
    }
  };

  const openUnlockModal = (user) => {
    setUserToUnlock(user);
    setShowUnlockModal(true);
  };

  const exportUsers = () => {
    try {
      const exportData = users.map(user => ({
        'Username': user.username,
        'Full Name': user.full_name,
        'Role': getDisplayRole(user.role),
        'Status': user.is_active ? 'Active' : 'Inactive',
        'Login Attempts': user.failed_login_attempts || 0,
        'Locked': user.locked_at ? 'Yes' : 'No',
        'Locked At': user.locked_at ? new Date(user.locked_at).toLocaleString() : 'N/A',
        'Created At': new Date(user.created_at).toLocaleString(),
        'Created By': user.created_by,
        'Last Login': user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Users');
      XLSX.writeFile(wb, `users_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting users:', error);
    }
  };

// Get display role text
const getDisplayRole = (role) => {
  switch(role) {
    case 'admin':
      return 'Administrator';
    case 'manager':
      return 'Manager';
    case 'supervisor':
      return 'Supervisor';
    case 'security_guard':
      return 'Security Guard';
    case 'user':
      return 'User';
    case 'user1':
      return 'User Level 1';
    case 'user2':
      return 'User Level 2';
    default:
      return role || 'N/A';
  }
};

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = users.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(users.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              User Management
            </h1>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportUsers}
                className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg
                      hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export
              </button>

              <button
                onClick={() => {
                  setModalMode('create');
                  setSelectedUser(null);
                  setShowModal(true);
                }}
                className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg
                      hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </button>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Search */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search Users
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by username or full name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                             bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </div>
              
              {/* Status filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="locked">Locked</option>
                </select>
              </div>
              
              {/* Role filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                >
                  <option value="all">All Roles</option>
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Updated
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Login Attempts
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        <div className="flex justify-center items-center">
                          <Loader2 className="h-6 w-6 animate-spin mr-2" />
                          Loading users...
                        </div>
                      </td>
                    </tr>
                  ) : currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {user.full_name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {user.username}
                              </div>
                              <AccountLockStatus 
                                user={user} 
                                onUnlock={openUnlockModal} 
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span 
                            className="px-3 py-1.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                          >
                            {getDisplayRole(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {user.created_at 
                            ? new Date(user.created_at).toLocaleString() 
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {user.updated_at 
                            ? new Date(user.updated_at).toLocaleString() 
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {user.last_login 
                            ? new Date(user.last_login).toLocaleString() 
                            : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {user.failed_login_attempts > 0 ? (
                            <span className={`inline-flex items-center ${
                              user.failed_login_attempts >= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {user.failed_login_attempts}
                              {user.failed_login_attempts >= 3 && (
                                <AlertTriangle className="ml-1 w-4 h-4 text-amber-500" />
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            {user.locked_at ? (
                              <button
                                onClick={() => openUnlockModal(user)}
                                className="text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                                title="Unlock Account"
                              >
                                <Unlock className="w-4 h-4" />
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setModalMode('edit');
                                    setShowModal(true);
                                  }}
                                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                                  title="Edit User"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleResetPassword(user.id)}
                                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                                  title="Reset Password"
                                >
                                  <Lock className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-400 hover:text-red-500"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {!loading && users.length > itemsPerPage && (
              <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 
                             bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 
                             hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 
                             bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 
                             hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(indexOfLastItem, users.length)}
                      </span>{' '}
                      of <span className="font-medium">{users.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-700 
                                 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300
                                 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <span className="sr-only">Previous</span>
                        &larr;
                      </button>
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                                   ${currentPage === i + 1
                                      ? 'z-10 bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                                      : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
                                    }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-700 
                                 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300
                                 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <span className="sr-only">Next</span>
                        &rarr;
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <UserModal
        isOpen={showModal}
        mode={modalMode}
        user={selectedUser}
        onClose={() => {
          setShowModal(false);
          setSelectedUser(null);
        }}
        onSubmit={modalMode === 'create' ? handleCreateUser : handleUpdateUser}
      />

      <TempPasswordModal
        isOpen={showTempPasswordModal}
        onClose={() => setShowTempPasswordModal(false)}
        tempPassword={currentTempPassword}
      />

      <UnlockAccountModal
        isOpen={showUnlockModal}
        onClose={() => {
          setShowUnlockModal(false);
          setUserToUnlock(null);
        }}
        onUnlock={handleUnlockAccount}
        user={userToUnlock}
      />
    </div>
  );
};

export default UserManagement;