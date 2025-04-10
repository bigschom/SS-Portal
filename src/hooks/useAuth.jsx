// src/context/AuthProvider.jsx
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import apiService from '../config/api-service';

const AuthContext = createContext(null);

// Maximum number of failed login attempts allowed
const MAX_LOGIN_ATTEMPTS = 5;
// Inactivity timeout (in minutes)
const INACTIVITY_TIMEOUT = parseInt(import.meta.env.VITE_SESSION_TIMEOUT_MINUTES || '60', 10);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = sessionStorage.getItem('user');
    if (!storedUser || storedUser === "undefined") {
      return null;
    }
    try {
      return JSON.parse(storedUser);
    } catch (error) {
      console.error('Error parsing user from sessionStorage:', error);
      // Clear the invalid data
      sessionStorage.removeItem('user');
      return null;
    }
  });
  
  const [loading, setLoading] = useState(true);
  const logoutTimer = useRef(null);
  const tokenExpirationChecked = useRef(false);
  const lastActivityTime = useRef(Date.now());

  // Memoize the logout function to prevent recreation on every render
  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem('user');
    sessionStorage.setItem('userLoggedOut', 'true');
    // Also clear any password change flags
    sessionStorage.removeItem('passwordChangeRequired');
    sessionStorage.removeItem('tempUser');
    clearTimeout(logoutTimer.current);
  }, []);

  // Memoize the isTokenExpired function
  const isTokenExpired = useCallback((token) => {
    if (!token) return true;
    
    try {
      // Get the payload part of the JWT (second part)
      const payload = token.split('.')[1];
      // Decode the base64 string
      const decodedPayload = JSON.parse(atob(payload));
      // Check if the token has expired
      const currentTime = Math.floor(Date.now() / 1000);
      return decodedPayload.exp < currentTime;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true; // If there's any error, consider the token expired
    }
  }, []);

  // Reset the auto-logout timer
  const resetLogoutTimer = useCallback(() => {
    clearTimeout(logoutTimer.current);
    logoutTimer.current = setTimeout(() => {
      logout();
      if (window.toastService) {
        window.toastService.warning('Session expired due to inactivity. Please log in again.');
      }
    }, INACTIVITY_TIMEOUT * 60 * 1000);
  }, [logout]);

  // Memoize the checkTokenExpiration function
  const checkTokenExpiration = useCallback(() => {
    if (!user || !user.token) return true;
    
    // Skip if we've already checked and logged out for this user session
    if (tokenExpirationChecked.current) return true;
    
    const expired = isTokenExpired(user.token);
    if (expired) {
      // Set the ref to prevent multiple logouts
      tokenExpirationChecked.current = true;
      // Automatically log out if token is expired
      logout();
      if (window.toastService) {
        window.toastService.error('Your session has expired. Please log in again.');
      }
      return true;
    }
    
    return false;
  }, [user, isTokenExpired, logout]);

  // Reset tokenExpirationChecked when user changes
  useEffect(() => {
    tokenExpirationChecked.current = false;
  }, [user]);

  // Update last activity time and send to server
  const updateActivityTime = useCallback(async () => {
    // Only update if significant time has passed (e.g., 5 minutes)
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (user && now - lastActivityTime.current > fiveMinutes) {
      lastActivityTime.current = now;
      
      try {
        await apiService.auth.trackActivity();
      } catch (error) {
        console.error('Failed to track user activity:', error);
      }
    }
  }, [user]);

  // Initialize user from sessionStorage
  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    // Check if there's a pending password change requirement
    const passwordChangeRequired = sessionStorage.getItem('passwordChangeRequired') === 'true';
    
    // If password change is required, don't initialize the user yet
    if (passwordChangeRequired) {
      setLoading(false);
      return;
    }
    
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Check if user is active
        if (parsedUser && parsedUser.is_active) {
          setUser(parsedUser);
          resetLogoutTimer();
        } else {
          // Clear user if account is not active
          logout();
        }
      } catch (error) {
        console.error('Error parsing user in useEffect:', error);
        sessionStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, [logout, resetLogoutTimer]);

  const login = async (username, password) => {
    try {
      // Call the backend login API
      const result = await apiService.auth.login(username, password);
      
      console.log('Login result from API:', result);
  
      // Check for errors from API
      if (result.error) {
        return {
          user: null,
          error: result.error,
          attemptsLeft: result.attemptsLeft,
          accountInactive: result.accountInactive,
          accountDeactivated: result.accountDeactivated,
          accountLocked: result.accountLocked
        };
      }
  
      if (result.user) {
        // Check if password change is required
        if (result.passwordChangeRequired) {
          console.log('Password change required, not setting user in state yet');
          // Store the flag in sessionStorage
          sessionStorage.setItem('passwordChangeRequired', 'true');
          // Don't set user in state yet, will be set after password change
          
          // Return the full result including passwordChangeRequired flag
          return {
            user: result.user,
            error: null,
            passwordChangeRequired: true
          };
        }
        
        // Normal login flow - update user state and storage
        console.log('Normal login, setting user in state');
        setUser(result.user);
        sessionStorage.setItem('user', JSON.stringify(result.user));
        sessionStorage.removeItem('userLoggedOut');
        sessionStorage.removeItem('passwordChangeRequired');
        resetLogoutTimer();
        lastActivityTime.current = Date.now();
        
        // Return the full result
        return {
          user: result.user,
          error: null,
          passwordChangeRequired: false
        };
      }
  
      return { user: null, error: 'Unknown error occurred' };
    } catch (error) {
      console.error('Login error:', error.message);
      return { user: null, error: 'Connection error' };
    }
  };

  const updatePassword = async (userId, newPassword, token = null) => {
    try {
      console.log('Updating password for user ID:', userId, 'with new password length:', newPassword.length);
      
      // Call the API to update password
      const result = await apiService.auth.updatePassword(userId, newPassword);
      
      console.log('Password update API response:', result);
  
      if (result.error) {
        console.error('Error from API:', result.error);
        return { error: result.error };
      }
  
      if (!result.user) {
        console.error('No user returned from API');
        return { error: 'Server did not return updated user information' };
      }
  
      // Don't update the user state yet since we'll require re-login
      // This prevents auto-login with potentially incorrect state
      
      // Clear any stored user data to force a fresh login
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('passwordChangeRequired');
      sessionStorage.removeItem('tempUser');
      
      return { user: result.user, error: null };
    } catch (error) {
      console.error('Password update error:', error);
      return { error: 'Connection error: ' + (error.message || 'Unknown error') };
    }
  };
  
  const unlockAccount = async (userId) => {
    try {
      const result = await apiService.auth.unlockAccount(userId);
      return { error: result.error || null };
    } catch (error) {
      console.error('Error unlocking account:', error);
      return { error: 'Connection error' };
    }
  };

  // Add this new method for updating temporary passwords
  const updateTempPassword = async (userId, newPassword) => {
    try {
      console.log('Updating temporary password for user ID:', userId);
      
      // Call the API to update temporary password
      const result = await apiService.users.updateTempPassword(userId, newPassword);
      
      console.log('Temp password update API response:', result);

      if (result.error) {
        console.error('Error from API:', result.error);
        return { error: result.error };
      }

      if (!result.user) {
        console.error('No user returned from API');
        return { error: 'Server did not return updated user information' };
      }

      // Don't update the user state yet since we'll require re-login
      // Clear any stored user data to force a fresh login
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('passwordChangeRequired');
      sessionStorage.removeItem('tempUser');

      return { user: result.user, error: null };
    } catch (error) {
      console.error('Temporary password update error:', error);
      return { error: 'Connection error: ' + (error.message || 'Unknown error') };
    }
  };

  // Reset logout timer on user activity and update last activity timestamp
  useEffect(() => {
    if (!user) return;

    const handleUserActivity = () => {
      if (user && user.is_active) {
        resetLogoutTimer();
        updateActivityTime();
      }
    };
    
    // Add event listeners for user activity
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);

    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      clearTimeout(logoutTimer.current);
    };
  }, [user, resetLogoutTimer, updateActivityTime]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      setUser, 
      loading, 
      login, 
      logout, 
      updatePassword,
      updateTempPassword,
      unlockAccount,
      resetLogoutTimer,
      checkTokenExpiration
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};