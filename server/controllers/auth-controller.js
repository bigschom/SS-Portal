// server/controllers/auth-controller.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const TOKEN_EXPIRATION = 60 * 60; // 1 hour

/**
 * Handle user login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const login = async (req, res) => {
  console.log('Login attempt for:', req.body.username);
  const { username, password } = req.body;
  
  try {
    // Get user from database
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    const userData = result.rows[0];
    
    if (!userData) {
      // User not found, return generic error
      console.log('User not found:', username);
      return res.json({ 
        error: 'Invalid credentials',
        attemptsLeft: null
      });
    }
    
    // Check if account is inactive due to 30 days of inactivity
    if (!userData.is_active && userData.locked_at === null) {
      console.log('Account inactive due to inactivity:', username);
      return res.json({ 
        error: 'Your account has been deactivated due to inactivity. Please contact an administrator.',
        accountInactive: true,
        accountDeactivated: true,
        attemptsLeft: 0
      });
    }
    
    // Check if account is locked due to failed attempts
    if (!userData.is_active && userData.locked_at !== null) {
      console.log('Account locked due to failed attempts:', username);
      return res.json({ 
        error: 'Account is locked due to too many failed login attempts. Please contact an administrator.',
        accountInactive: true,
        accountLocked: true,
        attemptsLeft: 0
      });
    }
    
    // Check failed login attempts
    const currentAttempts = userData.failed_login_attempts || 0;
    
    // First check if there's a valid temporary password
    let isValidTempPassword = false;
    
    if (userData.temp_password && new Date(userData.temp_password_expires) > new Date()) {
      // Use bcrypt to compare the provided password with the hashed temp password
      isValidTempPassword = await bcrypt.compare(password, userData.temp_password);
    }
    
    if (isValidTempPassword) {
      console.log('User logged in with temporary password, password change required');
      
      // Reset failed login attempts on successful login
      await query(
        'UPDATE users SET failed_login_attempts = 0, last_login = NOW() WHERE id = $1 RETURNING *',
        [userData.id]
      );
      
      // Create JWT token
      const token = jwt.sign({ id: userData.id, role: userData.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
      
      // Send user data with token
      const userWithRole = {
        id: userData.id,
        username: userData.username,
        full_name: userData.full_name,
        role: userData.role,
        is_active: userData.is_active,
        password_last_changed: userData.password_last_changed,
        password_expires_at: userData.password_expires_at,
        token
      };
      
      return res.json({ 
        user: userWithRole, 
        error: null, 
        passwordChangeRequired: true  
      });
    }
    
    // If no valid temp password, check regular password
    // Before comparing passwords, ensure both are strings
    const passwordToCheck = String(password);
    const hashedPassword = String(userData.password);
    const isValidPassword = await bcrypt.compare(passwordToCheck, hashedPassword);
    
    if (!isValidPassword) {
      // Increment failed login attempts
      const newAttempts = currentAttempts + 1;
      const attemptsLeft = MAX_LOGIN_ATTEMPTS - newAttempts;
      
      console.log('Failed login attempt for:', username, `(${attemptsLeft} attempts left)`);
      
      // Deactivate account if max attempts reached
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        await query(
          'UPDATE users SET failed_login_attempts = $1, is_active = false, locked_at = NOW() WHERE id = $2',
          [MAX_LOGIN_ATTEMPTS, userData.id]
        );
        
        console.log('Account locked due to max failed attempts:', username);
        
        return res.json({ 
          error: 'Account has been locked due to too many failed login attempts. Please contact an administrator.',
          accountLocked: true,
          attemptsLeft: 0
        });
      }
      
      // Update failed attempts
      await query(
        'UPDATE users SET failed_login_attempts = $1 WHERE id = $2',
        [newAttempts, userData.id]
      );
      
      return res.json({ 
        error: `Invalid credentials. ${attemptsLeft} login ${attemptsLeft === 1 ? 'attempt' : 'attempts'} remaining.`,
        attemptsLeft
      });
    }
    
    // Reset failed login attempts on successful login and update last login
    const updateResult = await query(
      'UPDATE users SET failed_login_attempts = 0, last_login = NOW(), last_activity = NOW() WHERE id = $1 RETURNING *',
      [userData.id]
    );
    const updatedUser = updateResult.rows[0];
    
    // Check password expiration
    const currentDate = new Date();
    const expirationDate = new Date(updatedUser.password_expires_at);
    const isPasswordExpired = currentDate > expirationDate;
    
    // Calculate days until expiration
    const timeDiff = expirationDate.getTime() - currentDate.getTime();
    const daysToExpiration = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    // Create JWT token with expiration
    const token = jwt.sign(
      { id: updatedUser.id, role: updatedUser.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: TOKEN_EXPIRATION }
    );
    
    // Send user data with token
    const userWithRole = {
      id: updatedUser.id,
      username: updatedUser.username,
      full_name: updatedUser.full_name,
      role: updatedUser.role,
      is_active: updatedUser.is_active,
      password_last_changed: updatedUser.password_last_changed,
      password_expires_at: updatedUser.password_expires_at,
      token
    };
    
    console.log('Successful login for:', username);
    
    // Check if password is expired or about to expire
    if (isPasswordExpired) {
      return res.json({ 
        user: userWithRole, 
        error: null, 
        passwordExpired: true,
        passwordChangeRequired: true,
        daysRemaining: 0
      });
    } else if (daysToExpiration <= 10) {
      // Password is about to expire, add warning
      return res.json({ 
        user: userWithRole, 
        error: null, 
        passwordChangeRequired: false,
        passwordWarning: `Your password will expire in ${daysToExpiration} days. Please change it soon.`,
        daysRemaining: daysToExpiration
      });
    } else {
      // Normal login
      return res.json({ 
        user: userWithRole, 
        error: null, 
        passwordChangeRequired: false
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Check if user session is valid
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const checkSession = (req, res) => {
  // If the middleware passes, the token is valid
  return res.json({ valid: true });
};

/**
 * Update user password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updatePassword = async (req, res) => {
  const { userId, newPassword, currentPassword } = req.body;

  try {
    // Get user data
    const userData = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userData.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userData.rows[0];
    
    // Verify current password if provided
    if (currentPassword) {
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }
  
    // Check password history (last 5 passwords)
    const passwordHistory = await query(
      'SELECT password FROM password_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
      [userId]
    );
  
    // Check if new password matches any previous passwords
    if (passwordHistory.rows.length > 0) {
      const passwordChecks = await Promise.all(
        passwordHistory.rows.map(async (row) => {
          // Make sure password is not null and is a string
          if (row.password && typeof row.password === 'string') {
            return await bcrypt.compare(newPassword, row.password);
          }
          return false;
        })
      );
      
      const isPasswordReused = passwordChecks.some(result => result === true);
    
      if (isPasswordReused) {
        return res.status(400).json({ 
          error: 'Cannot reuse previous passwords. Please choose a different password.' 
        });
      }
    }
  
    console.log('Server received password update request:', { userId, passwordLength: newPassword?.length });
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    console.log('Password hashed successfully, updating database');
    
    // Add current password to history before updating
    // IMPORTANT: Make sure user.password is not null before inserting
    if (user.password) {
      await query(
        'INSERT INTO password_history (user_id, password, created_at) VALUES ($1, $2, NOW())',
        [userId, user.password]
      );
    }
    
    // Update the password and clear temporary password fields
    const result = await query(
      `UPDATE users SET 
        password = $1, 
        temp_password = NULL, 
        temp_password_expires = NULL, 
        password_change_required = false, 
        password_last_changed = NOW(),
        password_expires_at = NOW() + INTERVAL '3 months',
        failed_login_attempts = 0, 
        updated_at = NOW() 
       WHERE id = $2 RETURNING *`,
      [hashedPassword, userId]
    );
    
    if (result.rows.length === 0) {
      console.error('User not found for ID:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    const updatedUser = result.rows[0];
    console.log('Password updated successfully for user:', updatedUser.username);
    
    // Create new token
    const token = jwt.sign({ id: updatedUser.id, role: updatedUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // Return updated user info
    const userWithRole = {
      id: updatedUser.id,
      username: updatedUser.username,
      full_name: updatedUser.full_name,
      role: updatedUser.role,
      is_active: updatedUser.is_active,
      token
    };
    
    return res.json({ user: userWithRole, error: null });
  } catch (error) {
    console.error('Password update error:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Unlock a locked user account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const unlockAccount = async (req, res) => {
  const { userId } = req.body;
  
  console.log('Unlock account request for user ID:', userId);
  
  // Only admin can unlock accounts
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to unlock accounts' });
  }
  
  try {
    const result = await query(
      'UPDATE users SET is_active = true, failed_login_attempts = 0, locked_at = NULL, updated_by = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [req.user.username, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('Account unlocked successfully for user ID:', userId);
    return res.json({ success: true, error: null });
  } catch (error) {
    console.error('Error unlocking account:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Track user activity
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const trackActivity = async (req, res) => {
  try {
    await query(
      'UPDATE users SET last_activity = NOW() WHERE id = $1',
      [req.user.id]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('Error tracking user activity:', error);
    return res.json({ success: false });
  }
};

/**
 * Update temporary password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateTempPassword = async (req, res) => {
  const { userId, newPassword } = req.body;
  
  console.log('Server received temp password update request:', { userId, passwordLength: newPassword?.length });
  
  try {
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    console.log('Temporary password hashed successfully, updating database');
    
    // Update the password
    const result = await query(
      'UPDATE users SET temp_password = $1, temp_password_expires = NOW() + INTERVAL \'24 hours\', updated_at = NOW() WHERE id = $2 RETURNING *',
      [hashedPassword, userId]
    );
    
    if (result.rows.length === 0) {
      console.error('User not found for ID:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    const updatedUser = result.rows[0];
    console.log('Temporary password updated successfully for user:', updatedUser.username);
    
    // Create new token
    const token = jwt.sign({ id: updatedUser.id, role: updatedUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // Return updated user info
    const userWithRole = {
      id: updatedUser.id,
      username: updatedUser.username,
      full_name: updatedUser.full_name,
      role: updatedUser.role,
      is_active: updatedUser.is_active,
      token
    };
    
    return res.json({ user: userWithRole, error: null });
  } catch (error) {
    console.error('Temp password update error:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

export const passwordStrength = (req, res) => {
  const { password } = req.body;
  
  // Implement password strength validation
  const checks = {
    minLength: password.length >= 12,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  const strengthScore = Object.values(checks).filter(Boolean).length;
  let strength = 'weak';
  
  if (strengthScore >= 5) strength = 'strong';
  else if (strengthScore >= 3) strength = 'medium';

  return res.json({
    isStrong: strengthScore >= 3,
    strength,
    checks
  });
};

export const getCurrentActivity = async (req, res) => {
  try {
    const result = await query(
      'SELECT last_activity, last_login FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const currentTime = new Date();
    const lastActivityTime = new Date(user.last_activity);
    const inactivityDuration = currentTime - lastActivityTime;

    return res.json({
      lastActivityAt: user.last_activity,
      lastLogin: user.last_login,
      inactivityDuration: inactivityDuration / 1000, // in seconds
      shouldLogout: inactivityDuration > 30 * 60 * 1000 // 30 minutes
    });
  } catch (error) {
    console.error('Error fetching current activity:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const verifyPasswordHistory = async (req, res) => {
  const { userId, newPassword } = req.body;
  
  try {
    // Check last N passwords (e.g., last 5)
    const passwordHistoryResult = await query(
      'SELECT password FROM password_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
      [userId]
    );
    
    if (passwordHistoryResult.rows.length === 0) {
      // No password history found, so the password is unique
      return res.json({ isUnique: true });
    }
    
    // Compare new password with previous hashed passwords
    const passwordChecks = await Promise.all(
      passwordHistoryResult.rows.map(async (row) => {
        if (row.password && typeof row.password === 'string') {
          return await bcrypt.compare(newPassword, row.password);
        }
        return false;
      })
    );
    
    // If any comparison returns true, the password is not unique
    const isUnique = !passwordChecks.some(result => result === true);
    
    return res.json({ isUnique });
  } catch (error) {
    console.error('Error verifying password history:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const checkUsernameAvailability = async (req, res) => {
  const { username } = req.params;
  
  try {
    const result = await query(
      'SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)',
      [username]
    );
    
    return res.json({
      available: !result.rows[0].exists,
      suggestedUsername: result.rows[0].exists 
        ? `${username}${Math.floor(Math.random() * 100)}` 
        : username
    });
  } catch (error) {
    return res.status(500).json({ available: false });
  }
};

export const checkPasswordExpiration = async (userId) => {
  const result = await query(`
    SELECT 
      password_expires_at, 
      (password_expires_at - INTERVAL '10 days') AS expiration_warning_date,
      NOW() AS current_time
    FROM users 
    WHERE id = $1
  `, [userId]);

  const { password_expires_at, expiration_warning_date, current_time } = result.rows[0];

  return {
    daysRemaining: Math.ceil((password_expires_at - current_time) / (1000 * 60 * 60 * 24)),
    isNearingExpiration: current_time >= expiration_warning_date
  };
};