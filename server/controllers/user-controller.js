// server/controllers/user-controller.js
import bcrypt from 'bcryptjs';
import { query } from '../db.js';

/**
 * Get all active users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllActiveUsers = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, full_name, role, last_login, is_active, failed_login_attempts, locked_at, created_at, updated_at FROM users WHERE is_active = true ORDER BY username',
      []
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching active users:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get all users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllUsers = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, full_name, role, last_login, is_active, failed_login_attempts, locked_at, password_expires_at, created_at, updated_at FROM users ORDER BY username',
      []
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get user by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await query(
      'SELECT id, username, full_name, role, last_login, is_active FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Create a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */

const generateUsername = (fullName) => {
  // Remove special characters and convert to lowercase
  const cleanName = fullName.replace(/[^a-zA-Z\s]/g, '').toLowerCase();
  
  // Split name and create username variations
  const nameParts = cleanName.split(' ');
  const baseUsername = nameParts.length > 1 
    ? `${nameParts[0]}.${nameParts[nameParts.length - 1]}` 
    : nameParts[0];

  return baseUsername;
};

export const createUser = async (req, res) => {

  const { username, full_name, role, is_active, tempPassword, created_by } = req.body;

  if (!username) {
    username = generateUsername(full_name);
    
    // Ensure uniqueness by adding number if needed
    let counter = 1;
    let originalUsername = username;
    while (await isUsernameTaken(username)) {
      username = `${originalUsername}${counter}`;
      counter++;
    }
  }

      // Check for existing username
      const existingUser = await query(
        'SELECT * FROM users WHERE username = $1', 
        [username]
      );
    
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ 
          error: 'Username already exists. Please choose a different username.' 
        });
      }
  
  console.log('Creating user:', username, 'with role:', role);
  
  try {
    // Hash the temporary password
    const salt = await bcrypt.genSalt(10);
    const hashedTempPassword = await bcrypt.hash(tempPassword, salt);
    
    // Calculate expiration time (24 hours)
    const tempPasswordExpires = new Date();
    tempPasswordExpires.setHours(tempPasswordExpires.getHours() + 24);
    
    const result = await query(
      `INSERT INTO users (
        username, full_name, role, is_active, temp_password, 
        temp_password_expires, password_change_required, created_by, created_at, 
        password_expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW() + INTERVAL '3 months')
      RETURNING *`,
      [username, full_name, role, is_active, hashedTempPassword, tempPasswordExpires, true, created_by]
    );
    
    console.log('User created successfully:', username);
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

/**
 * Update user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, full_name, role, is_active, updated_by } = req.body;
  
  console.log('Updating user ID:', id, 'with data:', { username, role, is_active });
  
  try {
    const result = await query(
      `UPDATE users SET username = $1, full_name = $2, role = $3, is_active = $4,
       updated_by = $5, updated_at = NOW() WHERE id = $6 RETURNING *`,
      [username, full_name, role, is_active, updated_by, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('User updated successfully:', username);
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Reset user password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const resetPassword = async (req, res) => {
  const { id } = req.params;
  const { tempPassword, updated_by } = req.body;
  
  console.log('Resetting password for user ID:', id);
  
  try {
    // Hash the temporary password
    const salt = await bcrypt.genSalt(10);
    const hashedTempPassword = await bcrypt.hash(tempPassword, salt);
    
    // Calculate expiration time (24 hours)
    const tempPasswordExpires = new Date();
    tempPasswordExpires.setHours(tempPasswordExpires.getHours() + 24);
    
    const result = await query(
      `UPDATE users SET temp_password = $1, temp_password_expires = $2, 
              password_change_required = true, updated_by = $3, updated_at = NOW() 
       WHERE id = $4 RETURNING *`,
      [hashedTempPassword, tempPasswordExpires, updated_by, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('Password reset successfully for user ID:', id);
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Delete user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteUser = async (req, res) => {
  const { id } = req.params;
  
  console.log('Deleting user ID:', id);
  
  try {
    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('User deleted successfully, ID:', id);
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};