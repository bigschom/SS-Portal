import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Moon, Sun, User, Lock, AlertCircle, Loader2, ShieldAlert, 
  CheckCircle, XCircle, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { getRoleBasedDashboard } from '../../utils/roleRoutes';

// Toast Notification Component
const Toast = ({ type, message, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 
        type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
      }`}
    >
      <div className="flex items-center">
        <div className="mr-3">
          {type === 'success' ? <CheckCircle className="w-5 h-5 text-white" /> : 
           type === 'error' ? <XCircle className="w-5 h-5 text-white" /> : 
           type === 'warning' ? <AlertCircle className="w-5 h-5 text-white" /> : 
           <Info className="w-5 h-5 text-white" />}
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

// Success Modal Component
const SuccessModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full mx-4"
      >
        <div className="flex items-center justify-center mb-4 text-green-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h2 className="text-xl font-bold mb-2 text-center text-gray-900 dark:text-white">
          Password Updated Successfully
        </h2>
        
        <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
          Your password has been updated successfully. Please log in again with your new password.
        </p>

        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 dark:bg-white text-white dark:text-black rounded-lg
                     dark:hover:bg-gray-100 transition-colors transform hover:scale-[1.02]"
          >
            Log In Again
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Password Change Modal Component
const PasswordChangeModal = ({ isOpen, onClose, onSubmit, isTemp }) => {
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
      await onSubmit(newPassword);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full mx-4"
      >
        <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
          {isTemp ? 'Change Temporary Password' : 'Change Password'}
        </h2>
        
        {isTemp && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Your temporary password has expired or needs to be changed. Please create a new password.
          </p>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 
                       bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] dark:focus:ring-white"
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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 
                       bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] dark:focus:ring-white"
              required
              autoComplete="new-password"
            />
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <p>Password must contain:</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              <li className="flex items-center gap-1.5">
                {validationResults.length ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span>At least 8 characters</span>
              </li>
              <li className="flex items-center gap-1.5">
                {validationResults.uppercase ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span>One uppercase letter</span>
              </li>
              <li className="flex items-center gap-1.5">
                {validationResults.lowercase ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span>One lowercase letter</span>
              </li>
              <li className="flex items-center gap-1.5">
                {validationResults.number ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span>One number</span>
              </li>
              <li className="flex items-center gap-1.5">
                {validationResults.special ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span>One special character (!@#$%^&*)</span>
              </li>
              <li className="flex items-center gap-1.5">
                {validationResults.match ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span>Passwords match</span>
              </li>
            </ul>
          </div>

          <div className="flex justify-end gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 
                       dark:hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || passwordStrength < 4}
              className="px-4 py-2 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 dark:bg-white text-white dark:text-black rounded-lg
                       dark:hover:bg-gray-100 transition-colors 
                       flex items-center gap-2 disabled:opacity-50 transform hover:scale-[1.02]"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Password
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  const navigate = useNavigate();
  const { login, updatePassword, updateTempPassword, setUser, logout } = useAuth();

  // Initialize dark mode on component mount
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
    
    // Check if there's a pending password change requirement from a previous login
    const passwordChangeRequired = sessionStorage.getItem('passwordChangeRequired') === 'true';
    const tempUserData = sessionStorage.getItem('tempUser');
    
    if (passwordChangeRequired && tempUserData) {
      try {
        const parsedTempUser = JSON.parse(tempUserData);
        setTempUser(parsedTempUser);
        setShowPasswordChange(true);
      } catch (error) {
        console.error('Error parsing temp user data:', error);
        sessionStorage.removeItem('tempUser');
        sessionStorage.removeItem('passwordChangeRequired');
      }
    }
  }, []);

  // Show toast notification
  const showToast = (type, message, duration = 5000) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), duration);
  };

  // Sanitize input (basic example)
  const sanitizeInput = (input) => {
    // Remove potentially dangerous characters
    return input.replace(/[<>]/g, '');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const sanitizedUsername = sanitizeInput(username.trim());
      
      // Call the login API
      const { 
        error: loginError, 
        passwordChangeRequired, 
        user: loggedInUser,
        accountInactive,
        accountDeactivated,
        accountLocked,
        attemptsLeft: remainingAttempts
      } = await login(sanitizedUsername, password);
      
      if (loginError) {
        setError(loginError);
        setAttemptsLeft(remainingAttempts);
        
        // Show toast for specific account status issues
        if (accountLocked) {
          showToast('error', 'Your account is locked due to too many failed attempts. Contact an administrator.');
        } else if (accountDeactivated) {
          showToast('warning', 'Your account has been deactivated due to inactivity. Contact an administrator.');
        } else if (remainingAttempts !== null && remainingAttempts <= 2) {
          showToast('warning', `Warning: ${remainingAttempts} login ${remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining.`);
        }
        
        setIsLoading(false);
        return;
      }
      
      console.log('Login response:', { passwordChangeRequired, loggedInUser });
      
      if (passwordChangeRequired === true) {
        console.log('Password change required, showing modal');
        // Store temporary user for password change
        setTempUser(loggedInUser);
        // Also store in sessionStorage in case of page refresh
        sessionStorage.setItem('tempUser', JSON.stringify(loggedInUser));
        sessionStorage.setItem('passwordChangeRequired', 'true');
        setShowPasswordChange(true);
        setIsLoading(false);
      } else {
        console.log('Normal login, redirecting to dashboard');
        // Show success toast
        showToast('success', 'Login successful! Redirecting to dashboard...');
        
        // Normal login flow with role-based redirect
        // Get role-specific dashboard path
        const dashboardPath = getRoleBasedDashboard(loggedInUser.role);
        
        // Delay navigation slightly to allow toast to be seen
        setTimeout(() => {
          navigate(dashboardPath);
        }, 1000);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
      showToast('error', 'Connection error. Please check your internet connection.');
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (newPassword) => {
    try {
      setIsLoading(true);
      // Use the temporary user stored during login
      const userId = tempUser?.id;
      const token = tempUser?.token;
  
      if (!userId) {
        setError('User information is missing. Please log in again.');
        setIsLoading(false);
        return;
      }
  
      console.log('Updating password for user:', userId);
      
      // Pass both userId and token to updatePassword
      const { user: updatedUser, error } = await updatePassword(userId, newPassword, token);
      
      if (error) {
        setError(error);
        showToast('error', `Failed to update password: ${error}`);
        setIsLoading(false);
        return;
      }
  
      // Check if updatedUser exists before using it
      if (!updatedUser) {
        setError('Failed to update password: No user data returned');
        showToast('error', 'Failed to update password: Server error');
        setIsLoading(false);
        return;
      }
  
      console.log('Password updated successfully');
      
      // Clear temporary user data
      setTempUser(null);
      sessionStorage.removeItem('tempUser');
      sessionStorage.removeItem('passwordChangeRequired');
      
      // Close password change modal
      setShowPasswordChange(false);
      
      // Show success toast
      showToast('success', 'Password updated successfully! Please log in again.');
      
      // Show success modal instead of redirecting
      setShowSuccessModal(true);
      setIsLoading(false);
      
      // Clear the login form
      setUsername('');
      setPassword('');
      
    } catch (error) {
      console.error('Password change error:', error);
      setError(error.message || 'An unexpected error occurred');
      showToast('error', 'An unexpected error occurred while updating the password');
      setIsLoading(false);
    }
  };
  
  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    // Force logout to ensure clean state
    logout();
    // Show toast to confirm logging out
    showToast('info', 'You have been logged out. Please log in with your new password.');
  };
  
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
  };

  // Determine error display type
  const getErrorSeverity = () => {
    if (error && error.includes('locked')) {
      return 'high'; // Account locked
    }
    if (attemptsLeft !== null && attemptsLeft <= 2) {
      return 'medium'; // Few attempts left
    }
    return 'normal'; // Standard error
  };

  const errorSeverity = getErrorSeverity();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
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

      {/* Dark Mode Toggle */}
      <button 
        onClick={toggleDarkMode} 
        className="fixed top-4 right-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 
                 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] dark:focus:ring-white"
        aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDarkMode ? (
          <Sun className="h-6 w-6 text-white" />
        ) : (
          <Moon className="h-6 w-6 text-gray-700" />
        )}
      </button>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-96 p-8 rounded-3xl shadow-xl bg-white dark:bg-gray-800"
      >
        {/* Login Form Content */}
        <div className="flex justify-center mb-6">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="h-20 w-auto object-contain"
          />
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
          Welcome to {import.meta.env.VITE_APP_NAME || 'SS Portal'}
        </h2>
        
        {error && (
          <div className={`mb-6 px-4 py-3 rounded-lg flex items-start gap-2
            ${errorSeverity === 'high' 
              ? 'bg-red-100 dark:bg-red-900/40 border border-red-500 dark:border-red-800 text-red-800 dark:text-red-200' 
              : errorSeverity === 'medium'
                ? 'bg-amber-100 dark:bg-amber-900/30 border border-amber-500 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                : 'bg-red-50 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-200'
            }`}
          >
            {errorSeverity === 'high' ? (
              <ShieldAlert className="w-5 h-5 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            )}
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 
                       bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] dark:focus:ring-white
                       transition-colors duration-200"
              placeholder="Username"
              required
              disabled={isLoading}
              autoComplete="username"
            />
            <User className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          
          <div className="relative">
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 
                       bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] dark:focus:ring-white
                       transition-colors duration-200"
              placeholder="Password"
              required
              disabled={isLoading}
              autoComplete="current-password"
            />
            <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 dark:bg-white text-white dark:text-black
                     dark:hover:bg-gray-100
                     focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] dark:focus:ring-white
                     transition-all duration-200 transform hover:scale-[1.02]
                     flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
            Sign In
          </button>
        </form>
      </motion.div>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordChange && (
          <PasswordChangeModal 
            isOpen={showPasswordChange}
            onClose={() => {
              setShowPasswordChange(false);
              setTempUser(null);
              sessionStorage.removeItem('tempUser');
              sessionStorage.removeItem('passwordChangeRequired');
              showToast('info', 'Password change cancelled');
            }}
            onSubmit={handlePasswordChange}
            isTemp={true}
          />
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <SuccessModal 
            isOpen={showSuccessModal}
            onClose={handleSuccessModalClose}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
export default LoginPage;