import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import bcrypt from 'bcryptjs';
import db from '../config/postgres-service';

const AuthContext = createContext(null);

// Maximum number of failed login attempts allowed
const MAX_LOGIN_ATTEMPTS = 5;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  
  const [loading, setLoading] = useState(true);
  const logoutTimer = useRef(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // Check if user is active
      if (parsedUser.is_active) {
        setUser(parsedUser);
        resetLogoutTimer();
      } else {
        // Clear user if account is not active
        logout();
      }
    }
    setLoading(false);
  }, []);

  // Reset the auto-logout timer
  const resetLogoutTimer = () => {
    // Clear any existing timers
    clearTimeout(logoutTimer.current);
    
    // Set a new timer for 5 minutes of inactivity
    logoutTimer.current = setTimeout(() => {
      logout();
    }, 5 * 60 * 1000); // 5 minutes of inactivity
  };

  const login = async (username, password) => {
    try {
      // Get the user from database
      const userData = await db.getUserByUsername(username);

      if (!userData) {
        // User not found, return generic error
        return { 
          user: null, 
          error: 'Invalid credentials',
          attemptsLeft: null
        };
      }

      // Check user active status
      if (!userData.is_active) {
        return { 
          user: null, 
          error: 'Account is locked due to too many failed login attempts. Please contact an administrator.',
          accountInactive: true,
          attemptsLeft: 0
        };
      }

      // Check failed login attempts
      const currentAttempts = userData.failed_login_attempts || 0;
      
      // First check if there's a valid temporary password
      if (userData?.temp_password) {
        const tempPasswordValid = 
          userData.temp_password === password && 
          new Date(userData.temp_password_expires) > new Date();

        if (tempPasswordValid) {
          // Reset failed login attempts on successful login
          await db.updateLastLogin(userData.id);
            
          // Use only role for role
          const userWithRole = {
            ...userData,
            role: userData.role,
            failed_login_attempts: 0
          };
          
          return { 
            user: userWithRole, 
            error: null, 
            passwordChangeRequired: true
          };
        }
      }

      // If no valid temp password, check regular password
      if (!userData.password) {
        // Increment failed login attempts
        const newAttempts = currentAttempts + 1;
        const attemptsLeft = MAX_LOGIN_ATTEMPTS - newAttempts;
        
        // Deactivate account if max attempts reached
        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          await db.lockUserAccount(userData.id);
            
          return { 
            user: null, 
            error: 'Account has been locked due to too many failed login attempts. Please contact an administrator.',
            accountLocked: true,
            attemptsLeft: 0
          };
        }
        
        // Update failed attempts
        await db.updateUserLoginAttempts(userData.id, newAttempts);
          
        return { 
          user: null, 
          error: `Invalid credentials. ${attemptsLeft} login ${attemptsLeft === 1 ? 'attempt' : 'attempts'} remaining.`,
          attemptsLeft
        };
      }

      const isValidPassword = await bcrypt.compare(password, userData.password);

      if (!isValidPassword) {
        // Increment failed login attempts
        const newAttempts = currentAttempts + 1;
        const attemptsLeft = MAX_LOGIN_ATTEMPTS - newAttempts;
        
        // Deactivate account if max attempts reached
        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          await db.lockUserAccount(userData.id);
            
          return { 
            user: null, 
            error: 'Account has been locked due to too many failed login attempts. Please contact an administrator.',
            accountLocked: true,
            attemptsLeft: 0
          };
        }
        
        // Update failed attempts
        await db.updateUserLoginAttempts(userData.id, newAttempts);
          
        return { 
          user: null, 
          error: `Invalid credentials. ${attemptsLeft} login ${attemptsLeft === 1 ? 'attempt' : 'attempts'} remaining.`,
          attemptsLeft
        };
      }

      // Reset failed login attempts on successful login and update last login
      const updatedUser = await db.updateLastLogin(userData.id);

      // Use only specific role
      const userWithRole = {
        ...updatedUser,
        role: updatedUser.role,
        failed_login_attempts: 0
      };

      // Store the processed user in localStorage
      localStorage.setItem('user', JSON.stringify(userWithRole));
      
      // Start the auto-logout timer
      resetLogoutTimer();

      setUser(userWithRole);

      return { 
        user: userWithRole, 
        error: null, 
        passwordChangeRequired: false
      };
    } catch (error) {
      console.error('Login error:', error.message);
      return { user: null, error: error.message };
    }
  };

  const updatePassword = async (userId, newPassword) => {
    try {
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update the password in the database
      const updatedUser = await db.updatePassword(userId, hashedPassword);

      // Use only valid roles
      const updatedUserWithRole = {
        ...updatedUser,
        role: updatedUser.role
      };

      // Update user in state and localStorage
      setUser(updatedUserWithRole);
      localStorage.setItem('user', JSON.stringify(updatedUserWithRole));
      
      // Reset the auto-logout timer
      resetLogoutTimer();

      return { error: null };
    } catch (error) {
      console.error('Password update error:', error);
      return { error: error.message };
    }
  };

  const unlockAccount = async (userId) => {
    try {
      const adminId = user?.id;
      if (!adminId) throw new Error("You must be logged in to unlock accounts");
      
      await db.unlockUserAccount(userId, adminId);
      return { error: null };
    } catch (error) {
      console.error('Error unlocking account:', error);
      return { error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    clearTimeout(logoutTimer.current);
  };

  // Reset logout timer on user activity
  useEffect(() => {
    const resetTimerOnActivity = () => {
      if (user && user.is_active) {
        resetLogoutTimer();
      }
    };
    
    // Add event listeners for user activity
    window.addEventListener('mousemove', resetTimerOnActivity);
    window.addEventListener('keydown', resetTimerOnActivity);
    window.addEventListener('click', resetTimerOnActivity);
    window.addEventListener('scroll', resetTimerOnActivity);

    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener('mousemove', resetTimerOnActivity);
      window.removeEventListener('keydown', resetTimerOnActivity);
      window.removeEventListener('click', resetTimerOnActivity);
      window.removeEventListener('scroll', resetTimerOnActivity);
      clearTimeout(logoutTimer.current);
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      setUser, 
      loading, 
      login, 
      logout, 
      updatePassword,
      unlockAccount,
      resetLogoutTimer 
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