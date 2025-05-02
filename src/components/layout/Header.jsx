import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  Moon, Sun, ChevronDown, User, LogOut, UserCircle, 
  Lock, CheckCircle, XCircle, AlertCircle, Loader2, Key
} from 'lucide-react';
import { roleBasedNavigation } from './navigationConfig';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { getRoleBasedDashboard } from '../../utils/roleRoutes';
import authService from '../../services/auth-service'; // Import auth service directly

// Password Change Modal Component
const PasswordChangeModal = ({ isOpen, onClose, onSubmit }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [validationResults, setValidationResults] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
    match: false
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setPasswordStrength(0);
      setValidationResults({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
        match: false
      });
    }
  }, [isOpen]);

  // Validate password on input change
  useEffect(() => {
    validatePassword(newPassword, confirmPassword);
  }, [newPassword, confirmPassword]);

  const validatePassword = (password, confirmPwd) => {
    const results = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*]/.test(password),
      match: password === confirmPwd && password !== ''
    };
    
    setValidationResults(results);
    
    // Calculate password strength (0-5)
    const strength = Object.values(results).filter(Boolean).length - (results.match ? 1 : 0);
    setPasswordStrength(strength);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Comprehensive password validation
    const validationErrors = [];

    if (!currentPassword) {
      validationErrors.push('Please enter your current password');
    }
    
    if (!validationResults.length) {
      validationErrors.push('Password must be at least 8 characters long');
    }

    if (!validationResults.uppercase) {
      validationErrors.push('Must contain at least one uppercase letter');
    }

    if (!validationResults.lowercase) {
      validationErrors.push('Must contain at least one lowercase letter');
    }

    if (!validationResults.number) {
      validationErrors.push('Must contain at least one number');
    }

    if (!validationResults.special) {
      validationErrors.push('Must contain at least one special character (!@#$%^&*)');
    }

    if (!validationResults.match) {
      validationErrors.push('Passwords do not match');
    }

    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      setIsSubmitting(false);
      return;
    }

    try {
      await onSubmit(currentPassword, newPassword);
      setIsSubmitting(false);
    } catch (err) {
      setError(err.message || 'Failed to update password');
      setIsSubmitting(false);
    }
  };

  // Function to determine strength color
  const getStrengthColor = () => {
    if (passwordStrength === 0) return 'bg-gray-200 dark:bg-gray-700';
    if (passwordStrength === 1) return 'bg-red-500';
    if (passwordStrength === 2) return 'bg-orange-500';
    if (passwordStrength === 3) return 'bg-yellow-500';
    if (passwordStrength === 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogTitle className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Change Password
        </DialogTitle>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Current Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white"
                required
                autoComplete="current-password"
              />
              <Lock className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                       bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white"
              required
              autoComplete="new-password"
            />
            
            {/* Password strength indicator */}
            <div className="mt-2">
              <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getStrengthColor()} transition-all duration-300`} 
                  style={{ width: `${(passwordStrength / 5) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                {passwordStrength === 0 && "Password strength: Enter a password"}
                {passwordStrength === 1 && "Password strength: Very weak"}
                {passwordStrength === 2 && "Password strength: Weak"}
                {passwordStrength === 3 && "Password strength: Moderate"}
                {passwordStrength === 4 && "Password strength: Strong"}
                {passwordStrength === 5 && "Password strength: Very strong"}
              </p>
            </div>
          </div>
          
          {/* Confirm New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                       bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-[#0A2647] dark:focus:ring-white"
              required
              autoComplete="new-password"
            />
          </div>

          {/* Password Requirements */}
          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <p>Password must contain:</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              <li className="flex items-center gap-1.5">
                {validationResults.length ? (
                  <CheckCircle className="w-4 h-4 text-[#0A2647] dark:text-white" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span>At least 8 characters</span>
              </li>
              <li className="flex items-center gap-1.5">
                {validationResults.uppercase ? (
                  <CheckCircle className="w-4 h-4 text-[#0A2647] dark:text-white" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span>One uppercase letter</span>
              </li>
              <li className="flex items-center gap-1.5">
                {validationResults.lowercase ? (
                  <CheckCircle className="w-4 h-4 text-[#0A2647] dark:text-white" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span>One lowercase letter</span>
              </li>
              <li className="flex items-center gap-1.5">
                {validationResults.number ? (
                  <CheckCircle className="w-4 h-4 text-[#0A2647] dark:text-white" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span>One number</span>
              </li>
              <li className="flex items-center gap-1.5">
                {validationResults.special ? (
                  <CheckCircle className="w-4 h-4 text-[#0A2647] dark:text-white" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span>One special character (!@#$%^&*)</span>
              </li>
              <li className="flex items-center gap-1.5">
                {validationResults.match ? (
                  <CheckCircle className="w-4 h-4 text-[#0A2647] dark:text-white" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span>Passwords match</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4">
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
              disabled={isSubmitting || passwordStrength < 4}
              className="px-4 py-2 bg-[#0A2647] hover:bg-[#0A2647]/90 dark:bg-white text-white dark:text-[#0A2647] rounded-lg
                       dark:hover:bg-gray-100 transition-colors 
                       flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Password
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Toast Notification Component
const Toast = ({ type, message, onClose }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center p-4 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        <div className="mr-3">
          {type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : type === 'error' ? (
            <XCircle className="w-5 h-5 text-red-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-500" />
          )}
        </div>
        <div className="text-gray-800 dark:text-gray-200 font-medium mr-6">
          {message}
        </div>
        <button
          onClick={onClose}
          className="ml-auto bg-transparent text-gray-500 rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <span className="sr-only">Close</span>
          <XCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const Header = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme !== null) {
      return savedTheme === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Get navigation items based on the user's role
  const navigationItems = user ? roleBasedNavigation[user.role] || [] : [];

  // Show toast notification
  const showToast = (type, message, duration = 3000) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), duration);
  };

  // Handle click outside dropdown and submenus
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenSubmenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    try {
      logout();
      setIsDropdownOpen(false);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleProfileClick = () => {
    setIsProfileModalOpen(true);
    setIsDropdownOpen(false);
  };

  const handlePasswordClick = () => {
    setIsPasswordModalOpen(true);
    setIsDropdownOpen(false);
  };

  const handleLogoClick = () => {
    if (user) {
      const dashboardPath = getRoleBasedDashboard(user.role);
      navigate(dashboardPath);
    }
  };

  // Handle password change with history check
  const handlePasswordChange = async (currentPassword, newPassword) => {
    try {
      if (!user || !user.id) {
        throw new Error('User information is missing');
      }
      
      // First, verify if the password is in history using your existing method
      const historyCheck = await authService.checkPasswordHistory(user.id, newPassword);
      
      if (historyCheck.error) {
        throw new Error(historyCheck.error);
      }
      
      if (historyCheck.isRepeatedPassword) {
        throw new Error('You cannot reuse a previous password. Please choose a different password.');
      }
      
      // If password is not in history, proceed with update
      const result = await authService.updatePassword(user.id, newPassword, currentPassword);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setIsPasswordModalOpen(false);
      showToast('success', 'Password updated successfully. Please log in again with your new password.');
      
      // Logout after a short delay to allow the user to see the success message
      setTimeout(() => {
        logout();
        navigate('/login', { replace: true });
      }, 2000);
      
    } catch (error) {
      console.error('Password change error:', error);
      throw new Error(error.message || 'Failed to update password');
    }
  };

  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (localStorage.getItem('darkMode') === null) {
        setIsDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  // Helper function to display role name
  const getRoleDisplayName = (role) => {
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
        return role;
    }
  };
  
  // Helper function to create a short version of the name
  const getShortName = (fullName) => {
    if (!fullName) return '';
    
    const nameParts = fullName.split(' ');
    if (nameParts.length === 1) return nameParts[0];
    
    // If there are two or more parts, return first name and last initial
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    
    return `${firstName} ${lastName.charAt(0)}.`;
  };

  // Create unique keys for the navigation items
  const getItemKey = (item, index) => {
    return item.path ? item.path : `${item.name}-${index}`;
  };

  return (
    <>
      <header className="bg-gray-50 dark:bg-gray-900 shadow-sm sticky top-0 z-20">
        <div className="max-w-full px-4 py-2">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-10 w-auto cursor-pointer" 
              onClick={handleLogoClick}
            />

            {/* Desktop Navigation */}
            <div className="flex flex-1 justify-center" ref={menuRef}>
              <nav className="flex items-center space-x-6">
                {navigationItems.map((item, index) => {
                  const Icon = item.icon;
                  return item.children ? (
                    <div 
                      key={getItemKey(item, index)}
                      className="relative"
                      onMouseEnter={() => setOpenSubmenu(item.name)}
                      onMouseLeave={() => setOpenSubmenu(null)}
                    >
                      <button className="flex items-center px-3 py-2 rounded-md text-sm font-medium 
                                       text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 
                                       transition-colors whitespace-nowrap">
                        <Icon className="h-4 w-4 mr-2" />
                        {item.name}
                        <ChevronDown className="h-4 w-4 ml-1" />
                      </button>
                      {openSubmenu === item.name && (
                        <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10">
                          {item.children.map((child, childIndex) => {
                            const ChildIcon = child.icon;
                            return (
                              <Link
                                key={child.path || `${child.name}-${childIndex}`}
                                to={child.path}
                                className="flex items-center px-4 py-2 text-sm text-gray-900 dark:text-gray-100 
                                         hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <ChildIcon className="h-4 w-4 mr-2" />
                                {child.name}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      key={getItemKey(item, index)}
                      to={item.path}
                      className="flex items-center px-3 py-2 rounded-md text-sm font-medium 
                               text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 
                               transition-colors whitespace-nowrap"
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* User Menu */}
            {user && (
              <div className="flex items-center">
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center space-x-3 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2"
                  >
                    <div className="bg-gray-300 dark:bg-gray-600 rounded-full p-2">
                      <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {isDropdownOpen ? user.full_name : getShortName(user.full_name)}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700">
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3">
                          <div className="bg-gray-300 dark:bg-gray-600 rounded-full p-3">
                            <User className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.full_name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{getRoleDisplayName(user.role)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <button
                          onClick={handleProfileClick}
                          className="flex items-center w-full text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md px-2 py-2"
                        >
                          <User className="h-4 w-4 mr-2" />
                          My Profile
                        </button>
                        <button
                          onClick={handlePasswordClick}
                          className="flex items-center w-full text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md px-2 py-2 mt-1"
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Change Password
                        </button>
                        <button
                          onClick={toggleDarkMode}
                          className="flex items-center w-full text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md px-2 py-2 mt-1"
                        >
                          {isDarkMode ? (
                            <Sun className="h-4 w-4 mr-2" />
                          ) : (
                            <Moon className="h-4 w-4 mr-2" />
                          )}
                          {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                        </button>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full text-left px-6 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Profile Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 gap-0">
          <DialogTitle className="sr-only">User Profile</DialogTitle>
          <div className="flex flex-col">
            {/* Profile Header with Avatar */}
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-t-lg">
              <div className="flex flex-col items-center">
                <div className="bg-white dark:bg-gray-700 rounded-full p-4 shadow-sm">
                  <UserCircle className="h-20 w-20 text-gray-400 dark:text-gray-300" />
                </div>
              </div>
            </div>

            {/* Profile Information */}
            <div className="p-6 space-y-4">
              {/* Full Name */}
              <div className="text-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {user?.full_name}
                </h2>
              </div>

              {/* Info Grid */}
              <div className="space-y-3">
                {/* Username */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Username</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user?.username}
                  </span>
                </div>

                {/* Role */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Role</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user ? getRoleDisplayName(user.role) : ''}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                  <div className="flex items-center">
                    <div className={`h-2 w-2 rounded-full ${
                      Boolean(user?.is_active) === false ? 'bg-red-500' : 'bg-green-500'
                    } mr-2`} />
                    <span className={`text-sm font-medium ${
                      Boolean(user?.is_active) === false
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {Boolean(user?.is_active) === false ? 'Inactive' : 'Active'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Change Modal */}
      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSubmit={handlePasswordChange}
      />

      {/* Toast Notifications */}
      {toast && (
        <Toast 
          type={toast.type} 
          message={toast.message} 
          onClose={() => setToast(null)} 
        />
      )}
    </>
  );
};

export default Header;