import React, { createContext, useState, useContext, useEffect } from 'react';
import apiService from '../config/api-service';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is stored in localStorage
    const checkUser = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          
          // Verify the token is still valid by making an authenticated request
          try {
            // You could add a /api/auth/verify endpoint or use an existing authenticated endpoint
            await apiService.users.getUserById(userData.id);
            setUser(userData);
          } catch (err) {
            // If token is invalid, clear the stored user
            console.error('Stored token is invalid:', err);
            localStorage.removeItem('user');
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error checking auth user:', err);
        setError(err.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const login = async (username, password) => {
    try {
      setError(null);
      
      const result = await apiService.auth.login(username, password);
      
      if (result.error) {
        setError(result.error);
        return { 
          success: false, 
          error: result.error,
          attemptsLeft: result.attemptsLeft,
          accountInactive: result.accountInactive,
          accountLocked: result.accountLocked,
          passwordChangeRequired: result.passwordChangeRequired,
          user: result.user
        };
      }
      
      // If login successful and no password change required, store user
      if (result.user && !result.passwordChangeRequired) {
        localStorage.setItem('user', JSON.stringify(result.user));
        setUser(result.user);
      }
      
      return { 
        success: true, 
        user: result.user,
        passwordChangeRequired: result.passwordChangeRequired
      };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    try {
      setError(null);
      // No need to call API for logout, just clear local storage
      localStorage.removeItem('user');
      setUser(null);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const unlockAccount = async (userId) => {
    try {
      const result = await apiService.auth.unlockAccount(userId);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error unlocking account:', error);
      return { success: false, error: error.message };
    }
  };

  const updatePassword = async (userId, newPassword) => {
    try {
      const result = await apiService.auth.updatePassword(userId, newPassword);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // If password update successful, update user in state and localStorage
      if (result.user) {
        setUser(result.user);
        localStorage.setItem('user', JSON.stringify(result.user));
      }
      
      return { success: true, updatedUser: result.user };
    } catch (error) {
      console.error('Error updating password:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    setUser,
    loading,
    error,
    login,
    logout,
    unlockAccount,
    updatePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
