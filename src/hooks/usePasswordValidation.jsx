// src/hooks/usePasswordValidation.jsx
import React, { useState, useMemo } from 'react';
import apiService from '../config/api-service';

/**
 * Custom hook for password validation
 * @returns {Object} Password validation utilities
 */
export const usePasswordValidation = () => {
  const [password, setPassword] = useState('');

  // Validation criteria
  const passwordValidation = useMemo(() => {
    return {
      minLength: password.length >= 12,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
  }, [password]);

  /**
   * Validate password against all criteria
   * @param {string} pwd - Password to validate
   * @returns {boolean} Whether password meets all requirements
   */
  const validatePassword = (pwd) => {
    setPassword(pwd);
    return Object.values(passwordValidation).every(Boolean);
  };

  /**
   * Get password strength
   * @returns {string} Password strength ('weak', 'medium', 'strong')
   */
  const getPasswordStrength = () => {
    const validCriteria = Object.values(passwordValidation).filter(Boolean).length;
    
    if (validCriteria <= 2) return 'weak';
    if (validCriteria <= 4) return 'medium';
    return 'strong';
  };

  /**
   * Check password strength via API
   * @param {string} password - Password to check
   * @returns {Promise<Object>} Strength validation result
   */
  const checkPasswordStrengthAPI = async (password) => {
    try {
      const response = await apiService.auth.verifyPasswordStrength(password);
      return response;
    } catch (error) {
      console.error('Password strength check failed:', error);
      return { 
        isStrong: false, 
        error: 'Failed to verify password strength' 
      };
    }
  };

  /**
   * Check if password has been used before
   * @param {string} userId - User ID
   * @param {string} password - Password to check
   * @returns {Promise<boolean>} Whether password is unique
   */
  const checkPasswordHistory = async (userId, password) => {
    try {
      const response = await apiService.auth.verifyPasswordHistory(userId, password);
      return response.isUnique;
    } catch (error) {
      console.error('Password history check failed:', error);
      return false;
    }
  };

  return {
    password,
    passwordValidation,
    validatePassword,
    getPasswordStrength,
    setPassword,
    checkPasswordStrengthAPI,
    checkPasswordHistory
  };
};

/**
 * Password Validation Rules Component
 * @param {Object} props - Component props
 * @param {string} props.password - Password to validate
 */
export const PasswordValidationRules = ({ password }) => {
  const { passwordValidation, getPasswordStrength } = usePasswordValidation();

  // Validate password
  const validationResults = {
    minLength: password?.length >= 12,
    hasUppercase: /[A-Z]/.test(password || ''),
    hasLowercase: /[a-z]/.test(password || ''),
    hasNumber: /[0-9]/.test(password || ''),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password || '')
  };

  const strength = getPasswordStrength(password);

  return (
    <div className="password-validation">
      {/* Strength Meter */}
      <div className="strength-meter mb-2">
        <div 
          className={`h-2 rounded-full ${
            strength === 'weak' ? 'bg-red-500' : 
            strength === 'medium' ? 'bg-yellow-500' : 
            'bg-green-500'
          }`}
          style={{ 
            width: strength === 'weak' ? '33%' : 
                   strength === 'medium' ? '66%' : 
                   '100%' 
          }}
        ></div>
        <p className="text-xs mt-1 text-gray-600">
          Strength: {strength.charAt(0).toUpperCase() + strength.slice(1)}
        </p>
      </div>

      {/* Validation Rules */}
      <ul className="text-xs space-y-1">
        <li className={validationResults.minLength ? 'text-green-600' : 'text-red-600'}>
          ✓ At least 12 characters long
        </li>
        <li className={validationResults.hasUppercase ? 'text-green-600' : 'text-red-600'}>
          ✓ Contains an uppercase letter
        </li>
        <li className={validationResults.hasLowercase ? 'text-green-600' : 'text-red-600'}>
          ✓ Contains a lowercase letter
        </li>
        <li className={validationResults.hasNumber ? 'text-green-600' : 'text-red-600'}>
          ✓ Contains a number
        </li>
        <li className={validationResults.hasSpecialChar ? 'text-green-600' : 'text-red-600'}>
          ✓ Contains a special character
        </li>
      </ul>
    </div>
  );
};

/**
 * Password Change Form Component
 * @param {Object} props - Component props
 * @param {Function} props.onPasswordChange - Callback for password change
 */
export const PasswordChangeForm = ({ onPasswordChange }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const { 
    passwordValidation, 
    validatePassword,
    checkPasswordStrengthAPI,
    checkPasswordHistory
  } = usePasswordValidation();

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');

    // Validate new password complexity
    if (!validatePassword(newPassword)) {
      setError('New password does not meet complexity requirements');
      return;
    }

    // Check password strength via API
    const strengthCheck = await checkPasswordStrengthAPI(newPassword);
    if (!strengthCheck.isStrong) {
      setError('Password is too weak. Please choose a stronger password.');
      return;
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    try {
      const result = await onPasswordChange(currentPassword, newPassword);
      
      if (result.error) {
        setError(result.error);
      } else {
        // Successfully changed password
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setError('An error occurred while changing password');
    }
  };

  return (
    <form onSubmit={handlePasswordChange} className="space-y-4">
      <div>
        <label className="block mb-2">Current Password</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
          required
        />
      </div>

      <div>
        <label className="block mb-2">New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            validatePassword(e.target.value);
          }}
          className="w-full px-3 py-2 border rounded-lg"
          required
        />
        <PasswordValidationRules password={newPassword} />
      </div>

      <div>
        <label className="block mb-2">Confirm New Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
          required
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
      >
        Change Password
      </button>
    </form>
  );
};