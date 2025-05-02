// src/pages/SecurityConfiguration.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Lock, 
  Shield, 
  AlertTriangle, 
  Clock, 
  UserCheck, 
  Save 
} from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import useRoleCheck from '../hooks/useRoleCheck';

const SecurityConfiguration = () => {
  const { user } = useAuth();
  const roleCheck = useRoleCheck();
  const [config, setConfig] = useState({
    passwordPolicy: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true
    },
    sessionSettings: {
      inactivityTimeout: 60, // minutes
      maxLoginAttempts: 5
    },
    accountLockout: {
      enabled: true,
      lockoutDuration: 30 // minutes
    },
    twoFactorAuthentication: {
      enabled: false
    }
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Check permissions
  useEffect(() => {
    if (!roleCheck.canAccessSystemConfig()) {
      // Redirect or show error
      navigate('/dashboard');
    }
  }, [roleCheck]);

  // Fetch current configuration
  useEffect(() => {
    const fetchSecurityConfig = async () => {
      try {
        const currentConfig = await apiService.security.getConfiguration();
        setConfig(currentConfig);
      } catch (error) {
        console.error('Error fetching security configuration:', error);
        setError('Failed to load security configuration');
      }
    };

    fetchSecurityConfig();
  }, []);

  const handleConfigChange = (section, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate configuration
      if (config.passwordPolicy.minLength < 8) {
        throw new Error('Minimum password length must be at least 8 characters');
      }

      // Save configuration
      await apiService.security.updateConfiguration(config);
      
      // Log the activity
      await apiService.activityLog.logActivity({
        userId: user.id,
        description: 'Updated system security configuration',
        type: 'system_config'
      });

      setSuccess('Security configuration updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving configuration:', error);
      setError(error.message || 'Failed to save security configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Shield className="mr-3 text-[#0A2647]" />
          Security Configuration
        </h1>
      </div>

      {/* Error and Success Notifications */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <AlertTriangle className="inline-block mr-2" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <UserCheck className="inline-block mr-2" />
          {success}
        </div>
      )}

      {/* Password Policy Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6"
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Lock className="mr-3 text-[#0A2647]" />
            Password Policy
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2">Minimum Password Length</label>
              <input
                type="number"
                value={config.passwordPolicy.minLength}
                onChange={(e) => handleConfigChange(
                  'passwordPolicy', 
                  'minLength', 
                  parseInt(e.target.value)
                )}
                disabled={!isEditing}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.passwordPolicy.requireUppercase}
                  onChange={(e) => handleConfigChange(
                    'passwordPolicy', 
                    'requireUppercase', 
                    e.target.checked
                  )}
                  disabled={!isEditing}
                  className="mr-2"
                />
                Require Uppercase Letters
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.passwordPolicy.requireLowercase}
                  onChange={(e) => handleConfigChange(
                    'passwordPolicy', 
                    'requireLowercase', 
                    e.target.checked
                  )}
                  disabled={!isEditing}
                  className="mr-2"
                />
                Require Lowercase Letters
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.passwordPolicy.requireNumbers}
                  onChange={(e) => handleConfigChange(
                    'passwordPolicy', 
                    'requireNumbers', 
                    e.target.checked
                  )}
                  disabled={!isEditing}
                  className="mr-2"
                />
                Require Numbers
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.passwordPolicy.requireSpecialChars}
                  onChange={(e) => handleConfigChange(
                    'passwordPolicy', 
                    'requireSpecialChars', 
                    e.target.checked
                  )}
                  disabled={!isEditing}
                  className="mr-2"
                />
                Require Special Characters
              </label>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Session Settings Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6"
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Clock className="mr-3 text-[#0A2647]" />
            Session Settings
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2">Inactivity Timeout (minutes)</label>
              <input
                type="number"
                value={config.sessionSettings.inactivityTimeout}
                onChange={(e) => handleConfigChange(
                  'sessionSettings', 
                  'inactivityTimeout', 
                  parseInt(e.target.value)
                )}
                disabled={!isEditing}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block mb-2">Max Login Attempts</label>
              <input
                type="number"
                value={config.sessionSettings.maxLoginAttempts}
                onChange={(e) => handleConfigChange(
                  'sessionSettings', 
                  'maxLoginAttempts', 
                  parseInt(e.target.value)
                )}
                disabled={!isEditing}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Account Lockout Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6"
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <AlertTriangle className="mr-3 text-[#0A2647]" />
            Account Lockout
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.accountLockout.enabled}
                  onChange={(e) => handleConfigChange(
                    'accountLockout', 
                    'enabled', 
                    e.target.checked
                  )}
                  disabled={!isEditing}
                  className="mr-2"
                />
                Enable Account Lockout
              </label>
            </div>
            
            <div>
              <label className="block mb-2">Lockout Duration (minutes)</label>
              <input
                type="number"
                value={config.accountLockout.lockoutDuration}
                onChange={(e) => handleConfigChange(
                  'accountLockout', 
                  'lockoutDuration', 
                  parseInt(e.target.value)
                )}
                disabled={!isEditing || !config.accountLockout.enabled}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center px-4 py-2 bg-[#0A2647] text-white rounded-lg hover:bg-[#0A2647]/90"
          >
            <Edit2 className="mr-2" /> Edit Configuration
          </button>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="flex items-center px-4 py-2 bg-[#0A2647] text-white rounded-lg hover:bg-[#0A2647]/90 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="mr-2 animate-spin" />
              ) : (
                <Save className="mr-2" />
              )}
              Save Configuration
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default SecurityConfiguration;