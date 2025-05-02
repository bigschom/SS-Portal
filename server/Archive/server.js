// server/server.js
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { query } from './db.js';
import { initializeTables } from './db-init.js';
import axios from 'axios';


// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection at:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

console.log('Starting server initialization...');

// Load environment variables
dotenv.config();

// Debug environment variables
console.log('Environment variables check:');
console.log('PORT:', process.env.PORT || 5000);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('PG_HOST:', process.env.PG_HOST);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'http://localhost:3000');

const app = express();
const PORT = process.env.PORT || 5000;

console.log('Express app created, configuring middleware...');

// Middleware
const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: function(origin, callback) {
    // In development mode, accept all origins
    if (isDevelopment) {
      console.log('CORS: Accepting request from origin:', origin);
      return callback(null, true);
    }
    
    // In production, be more strict
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000'
    ].filter(Boolean); // Remove any undefined values
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));



app.use(express.json());
app.use(cookieParser());

console.log('Middleware configured successfully');

// Initialize database tables on server start
(async () => {
  try {
    console.log('Starting database initialization...');
    await initializeTables();
    console.log('Database tables initialized successfully');
    console.log('All async initialization complete, proceeding to server startup...');
  } catch (error) {
    console.error('Failed to initialize database tables:', error);
  } finally {
    console.log('Initialization process finished, moving to next steps...');
  }
})();

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const TOKEN_EXPIRATION = 60 * 60; // 1 hour
const ACCOUNT_INACTIVE_DAYS = 30; // Mark account as inactive after 30 days

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Check for inactive accounts scheduled task
const checkInactiveAccounts = async () => {
  try {
    const inactiveDaysAgo = new Date();
    inactiveDaysAgo.setDate(inactiveDaysAgo.getDate() - ACCOUNT_INACTIVE_DAYS);
    
    // Get users who haven't logged in for 30+ days and are still active
    const result = await query(
      `UPDATE users 
       SET is_active = false, 
           updated_at = NOW(),
           updated_by = NULL
       WHERE (last_login IS NULL OR last_login < $1)
         AND is_active = true
       RETURNING id, username`,
      [inactiveDaysAgo.toISOString()]
    );
    
    if (result.rows.length > 0) {
      console.log(`Marked ${result.rows.length} accounts as inactive due to inactivity:`, 
        result.rows.map(user => user.username).join(', '));
    }
  } catch (error) {
    console.error('Error checking for inactive accounts:', error);
  }
};

// Run inactive account check daily
setInterval(checkInactiveAccounts, 24 * 60 * 60 * 1000);
// Also run it once at startup
checkInactiveAccounts();

console.log('Route configuration starting...');

// AUTH ROUTES
app.post('/api/auth/login', async (req, res) => {
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
      token
    };
    
    console.log('Successful login for:', username);
    
    return res.json({ 
      user: userWithRole, 
      error: null, 
      passwordChangeRequired: false
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Add a session check endpoint
app.get('/api/auth/check-session', authenticateToken, (req, res) => {
  // If the middleware passes, the token is valid
  return res.json({ valid: true });
});

app.post('/api/auth/update-password', authenticateToken, async (req, res) => {
  const { userId, newPassword } = req.body;
  
  console.log('Server received password update request:', { userId, passwordLength: newPassword?.length });
  
  // Verify the user has permission to update this password
  if (req.user.username !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to update this password' });
  }
  
  try {
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    console.log('Password hashed successfully, updating database');
    
    // Update the password and clear temporary password fields
    const result = await query(
      'UPDATE users SET password = $1, temp_password = NULL, temp_password_expires = NULL, password_change_required = false, failed_login_attempts = 0, updated_at = NOW() WHERE id = $2 RETURNING *',
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
});

app.post('/api/auth/unlock-account', authenticateToken, async (req, res) => {
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
});

// Track user activity
app.post('/api/auth/track-activity', authenticateToken, async (req, res) => {
  try {
    await query(
      'UPDATE users SET last_activity = NOW() WHERE id = $1',
      [req.user.username]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('Error tracking user activity:', error);
    return res.json({ success: false });
  }
});

// USER ROUTES
app.get('/api/users/active', authenticateToken, async (req, res) => {
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
});

app.get('/api/users/:id', authenticateToken, async (req, res) => {
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
});

app.post('/api/users', authenticateToken, async (req, res) => {
  const { username, full_name, role, is_active, tempPassword, created_by } = req.body;
  
  console.log('Creating user:', username, 'with role:', role);
  
  try {
    // Hash the temporary password
    const salt = await bcrypt.genSalt(10);
    const hashedTempPassword = await bcrypt.hash(tempPassword, salt);
    
    // Calculate expiration time (24 hours)
    const tempPasswordExpires = new Date();
    tempPasswordExpires.setHours(tempPasswordExpires.getHours() + 24);
    
    const result = await query(
      `INSERT INTO users (username, full_name, role, is_active, temp_password, 
        temp_password_expires, password_change_required, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
      [username, full_name, role, is_active, hashedTempPassword, tempPasswordExpires, true, created_by]
    );
    
    console.log('User created successfully:', username);
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, full_name, role, last_login, is_active, failed_login_attempts, locked_at, created_at, updated_at FROM users ORDER BY username',
      []
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/update-temp-password', authenticateToken, async (req, res) => {
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
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  
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
});


app.post('/api/users/:id/reset-password', authenticateToken, async (req, res) => {
  
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
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  
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
});

// Activity Log routes
app.post('/api/activity-log', authenticateToken, async (req, res) => {
  const { userId, description, type, recordId } = req.body;
  
  console.log('Logging activity:', { userId, type, description });
  
  try {
    const result = await query(
      `INSERT INTO activity_log (user_id, description, type, record_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [userId, description, type, recordId]
    );
    
    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error logging activity:', error);
    // Return success anyway to not block the main functionality
    return res.json({ success: true, warning: 'Activity not logged' });
  }
});

// Add a simple test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Start server with better error handling
console.log('About to start listening on port', PORT);
try {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`✅ Server successfully running on port ${PORT}`);
    console.log(`📜 API is available at http://localhost:${PORT}/api`);
    console.log(`================================================`);
  });
  console.log('Server startup initiated');
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1); // Exit with error code
}

// Add a timeout to check if anything is hanging
setTimeout(() => {
  console.log("5-second timeout reached - server should be running by now if everything is working");
}, 5000);

console.log("Server.js script execution completed");


// Background Check Routes - All routes updated with proper date handling

// Get unique citizenship values
app.get('/api/background-checks/citizenships', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching unique citizenship values');
    
    const result = await query(
      'SELECT DISTINCT citizenship FROM background_checks WHERE citizenship IS NOT NULL AND citizenship != \'\' ORDER BY citizenship'
    );
    
    return res.json(result.rows.map(row => row.citizenship));
  } catch (error) {
    console.error('Error fetching citizenships:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Get unique requesters
app.get('/api/background-checks/requesters', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching unique requesters');
    
    const result = await query(
      'SELECT DISTINCT requested_by FROM background_checks WHERE requested_by IS NOT NULL AND requested_by != \'\' ORDER BY requested_by'
    );
    
    return res.json(result.rows.map(row => row.requested_by));
  } catch (error) {
    console.error('Error fetching requesters:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Get all internships with better filtering
app.get('/api/background-checks/internships', authenticateToken, async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    
    console.log('Fetching internships with filters:', { status, startDate, endDate });
    
    let queryStr = `
      SELECT 
        id, full_names, citizenship, id_passport_number, 
        TO_CHAR(passport_expiry_date, 'YYYY-MM-DD') as passport_expiry_date, 
        department_id, department_name, role_type, role, 
        TO_CHAR(submitted_date, 'YYYY-MM-DD') as submitted_date, 
        status, requested_by, from_company, duration,
        operating_country, 
        TO_CHAR(date_start, 'YYYY-MM-DD') as date_start, 
        TO_CHAR(date_end, 'YYYY-MM-DD') as date_end, 
        work_with, additional_info, contact_number,
        TO_CHAR(closed_date, 'YYYY-MM-DD') as closed_date,
        closed_by,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
      FROM background_checks
      WHERE role_type = 'Internship'
    `;
    
    const queryParams = [];
    let paramCount = 1;
    
    // Apply date filters if provided
    if (startDate) {
      queryStr += ` AND date_start >= $${paramCount}`;
      queryParams.push(startDate);
      paramCount++;
    }
    
    if (endDate) {
      queryStr += ` AND date_end <= $${paramCount}`;
      queryParams.push(endDate);
      paramCount++;
    }
    
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Apply status filters
    if (status === 'active') {
      queryStr += ` AND date_end >= $${paramCount}`;
      queryParams.push(currentDate);
      paramCount++;
    } else if (status === 'expired') {
      queryStr += ` AND date_end < $${paramCount}`;
      queryParams.push(currentDate);
      paramCount++;
    }
    
    queryStr += ` ORDER BY date_start DESC`;
    
    console.log('Executing query:', queryStr, 'with params:', queryParams);
    
    const result = await query(queryStr, queryParams);
    
    console.log(`Found ${result.rows.length} internships matching the criteria`);
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching internships:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Check for duplicate ID/passport number
app.get('/api/background-checks/check-id/:idNumber', authenticateToken, async (req, res) => {
  try {
    const { idNumber } = req.params;
    
    console.log('Checking for duplicate ID/passport:', idNumber);
    
    const result = await query(
      'SELECT EXISTS(SELECT 1 FROM background_checks WHERE id_passport_number = $1)',
      [idNumber]
    );
    
    return res.json({ exists: result.rows[0].exists });
  } catch (error) {
    console.error('Error checking for duplicate ID:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Get departments - Better error handling
app.get('/api/departments/active', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching active departments');
    
    const result = await query(
      'SELECT id, name FROM departments WHERE status = $1 ORDER BY name',
      ['active']
    );
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Get all background checks - Enhanced with proper date formatting and filtering
app.get('/api/background-checks', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching all background checks with filters:', req.query);
    
    // Extract filter parameters
    const { 
      role_type, 
      department_name, 
      status, 
      citizenship, 
      requestedBy, 
      startDate, 
      endDate, 
      search,
      sortKey,
      sortDirection
    } = req.query;
    
    // Start building the query with proper date formatting
    let queryText = `
      SELECT 
        id, full_names, citizenship, id_passport_number, 
        TO_CHAR(passport_expiry_date, 'YYYY-MM-DD') as passport_expiry_date, 
        department_id, department_name, role_type, role, 
        TO_CHAR(submitted_date, 'YYYY-MM-DD') as submitted_date, 
        status, requested_by, from_company, duration,
        operating_country, 
        TO_CHAR(date_start, 'YYYY-MM-DD') as date_start, 
        TO_CHAR(date_end, 'YYYY-MM-DD') as date_end, 
        work_with, additional_info, contact_number,
        TO_CHAR(closed_date, 'YYYY-MM-DD') as closed_date,
        closed_by,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
      FROM background_checks WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    // Add filters to the query - using the exact field names from your schema
    if (role_type && role_type !== 'all') {
      queryText += ` AND role_type = $${paramIndex}`;
      params.push(role_type);
      paramIndex++;
    }
    
    if (department_name && department_name !== 'all') {
      queryText += ` AND department_name = $${paramIndex}`;
      params.push(department_name);
      paramIndex++;
    }
    
    if (status && status !== 'all') {
      queryText += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (citizenship && citizenship !== 'all') {
      queryText += ` AND citizenship = $${paramIndex}`;
      params.push(citizenship);
      paramIndex++;
    }
    
    if (requestedBy && requestedBy !== 'all') {
      queryText += ` AND requested_by = $${paramIndex}`;
      params.push(requestedBy);
      paramIndex++;
    }
    
    if (startDate) {
      queryText += ` AND submitted_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      queryText += ` AND submitted_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    if (search) {
      queryText += ` AND full_names ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    // Add sorting - using the exact field names from your schema
    const validSortKeys = ['full_names', 'citizenship', 'department_name', 'role_type', 
                           'status', 'submitted_date', 'requested_by'];
    
    if (sortKey && validSortKeys.includes(sortKey)) {
      const direction = sortDirection === 'asc' ? 'ASC' : 'DESC';
      queryText += ` ORDER BY ${sortKey} ${direction}`;
    } else {
      queryText += ' ORDER BY submitted_date DESC';
    }
    
    console.log('Executing query:', queryText);
    console.log('With parameters:', params);
    
    const result = await query(queryText, params);
    console.log(`Found ${result.rows.length} background checks`);
    
    // Log the activity (view all is important to track)
    try {
      await query(
        `INSERT INTO activity_log (user_id, description, type, record_id, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [req.user.username, 'Viewed all background checks', 'view', null]
      );
    } catch (logError) {
      console.error('Failed to log activity for view all:', logError);
      // Continue with the response even if activity logging fails
    }
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching background checks:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Get background check by ID - With proper date formatting
app.get('/api/background-checks/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  console.log('Fetching background check with ID:', id);
  
  try {
    // Make sure id is a number
    const numericId = parseInt(id, 10);
    
    if (isNaN(numericId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Use TO_CHAR to ensure all dates are formatted consistently as YYYY-MM-DD
    const result = await query(
      `SELECT 
          id, 
          full_names, 
          citizenship, 
          id_passport_number, 
          TO_CHAR(passport_expiry_date, 'YYYY-MM-DD') as passport_expiry_date, 
          department_id, 
          department_name, 
          role_type, 
          role, 
          TO_CHAR(submitted_date, 'YYYY-MM-DD') as submitted_date, 
          status, 
          requested_by, 
          from_company, 
          duration,
          operating_country, 
          TO_CHAR(date_start, 'YYYY-MM-DD') as date_start, 
          TO_CHAR(date_end, 'YYYY-MM-DD') as date_end, 
          work_with, 
          additional_info, 
          contact_number,
          TO_CHAR(closed_date, 'YYYY-MM-DD') as closed_date,
          closed_by,
          TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
          TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
       FROM background_checks 
       WHERE id = $1`,
      [numericId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Background check not found' });
    }
    
    console.log('Found background check:', result.rows[0].full_names);
    console.log('Date fields in response:', {
      submitted_date: result.rows[0].submitted_date,
      passport_expiry_date: result.rows[0].passport_expiry_date,
      date_start: result.rows[0].date_start,
      date_end: result.rows[0].date_end,
      closed_date: result.rows[0].closed_date
    });
    
    // Log the activity
    try {
      await query(
        `INSERT INTO activity_log (user_id, description, type, record_id, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [req.user.username, `Viewed background check: ${result.rows[0].full_names}`, 'view', numericId]
      );
    } catch (logError) {
      console.error('Failed to log activity for view:', logError);
      // Continue with the response even if activity logging fails
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching background check:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Create new background check - Enhanced with date handling
app.post('/api/background-checks', authenticateToken, async (req, res) => {
  try {
    console.log('Creating new background check with data:', req.body);
    
    const {
      full_names,
      citizenship,
      id_passport_number,
      passport_expiry_date,
      department_id,
      department_name,
      role_type,
      role,
      submitted_date,
      status,
      requested_by,
      from_company,
      duration,
      operating_country,
      date_start,
      date_end,
      work_with,
      additional_info,
      contact_number,
      created_by,
      updated_by
    } = req.body;
    
    // Validate required fields
    if (!full_names || !citizenship || !id_passport_number) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check for duplicate ID/Passport number
    const duplicateCheck = await query(
      'SELECT EXISTS(SELECT 1 FROM background_checks WHERE id_passport_number = $1)',
      [id_passport_number]
    );
    
    if (duplicateCheck.rows[0].exists) {
      return res.status(400).json({
        error: 'ID or Passport number already exists in the system'
      });
    }
    
    // Process date fields - handle empty strings
    const processedData = {
      full_names,
      citizenship,
      id_passport_number,
      passport_expiry_date: passport_expiry_date || null,
      department_id: department_id || null,
      department_name: department_name || null,
      role_type,
      role: role || null,
      submitted_date: submitted_date || null,
      status: status || 'Pending',
      requested_by: requested_by || null,
      from_company: from_company || null,
      duration: duration || null,
      operating_country: operating_country || null,
      date_start: date_start || null,
      date_end: date_end || null,
      work_with: work_with || null,
      additional_info: additional_info || null,
      contact_number: contact_number || null,
      created_by: created_by || req.user.username,
      updated_by: updated_by || req.user.username
    };
    
    // Format dates properly if they are provided
    const dateFields = ['submitted_date', 'passport_expiry_date', 'date_start', 'date_end', 'closed_date'];
    
    dateFields.forEach(field => {
      if (processedData[field] && processedData[field] !== '') {
        try {
          // Try to parse and format the date
          const date = new Date(processedData[field]);
          if (!isNaN(date.getTime())) {
            // Format as YYYY-MM-DD
            processedData[field] = date.toISOString().split('T')[0];
          } else {
            console.warn(`Invalid date detected for ${field}:`, processedData[field]);
            processedData[field] = null;
          }
        } catch (error) {
          console.error(`Error processing date for ${field}:`, error);
          processedData[field] = null;
        }
      } else {
        processedData[field] = null;
      }
    });
    
    console.log('Processed data for creation:', processedData);
    
    // Prepare SQL parameters in the correct order
    const params = [
      processedData.full_names,
      processedData.citizenship,
      processedData.id_passport_number,
      processedData.passport_expiry_date,
      processedData.department_id,
      processedData.department_name,
      processedData.role_type,
      processedData.role,
      processedData.submitted_date,
      processedData.status,
      processedData.requested_by,
      processedData.from_company,
      processedData.duration,
      processedData.operating_country,
      processedData.date_start,
      processedData.date_end,
      processedData.work_with,
      processedData.additional_info,
      processedData.contact_number,
      processedData.created_by,
      processedData.updated_by
    ];
    
    console.log('SQL parameters:', params);
    
    const result = await query(
      `INSERT INTO background_checks (
        full_names, citizenship, id_passport_number, passport_expiry_date,
        department_id, department_name, role_type, role,
        submitted_date, status, requested_by, from_company, duration,
        operating_country, date_start, date_end, work_with, additional_info,
        contact_number, created_by, updated_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())
      RETURNING *`,
      params
    );
    
    console.log('Background check created successfully:', result.rows[0].id);
    
    // Log activity
    try {
      await query(
        `INSERT INTO activity_log (user_id, description, type, record_id, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [req.user.username, `Created background check: ${full_names}`, 'create', result.rows[0].id]
      );
    } catch (logError) {
      console.error('Failed to log activity for create:', logError);
    }
    
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating background check:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Update background check - Fixed date handling
app.put('/api/background-checks/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  console.log('Received update request for background check ID:', id);
  console.log('Update data:', JSON.stringify(updateData, null, 2));
  
  try {
    // Validate required fields
    if (!updateData.full_names || !updateData.citizenship || !updateData.id_passport_number) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Make sure id is a number
    const numericId = parseInt(id, 10);
    
    if (isNaN(numericId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Check if record exists before updating
    const checkExists = await query(
      'SELECT id FROM background_checks WHERE id = $1',
      [numericId]
    );
    
    if (checkExists.rows.length === 0) {
      return res.status(404).json({ error: 'Background check not found' });
    }
    
    // Process date fields to ensure they're in the correct format for PostgreSQL
    // Convert empty strings to null for date fields
    const dateFields = [
      'submitted_date', 
      'passport_expiry_date', 
      'date_start', 
      'date_end', 
      'closed_date'
    ];
    
    // Create a copy of updateData to avoid mutating the original
    const processedData = { ...updateData };
    
    dateFields.forEach(field => {
      // If the field exists in updateData and is an empty string or invalid, set it to null
      if (field in processedData) {
        if (!processedData[field] || processedData[field] === '') {
          processedData[field] = null;
        } else {
          try {
            // Try to parse and format the date
            const date = new Date(processedData[field]);
            if (!isNaN(date.getTime())) {
              // Format as YYYY-MM-DD
              processedData[field] = date.toISOString().split('T')[0];
            } else {
              console.warn(`Invalid date detected for ${field}:`, processedData[field]);
              processedData[field] = null;
            }
          } catch (error) {
            console.error(`Error processing date for ${field}:`, error);
            processedData[field] = null;
          }
        }
      }
    });
    
    // Build the dynamic update query
    const keys = Object.keys(processedData).filter(key => 
      // Only include fields that are actually in our database schema
      [
        'full_names', 'citizenship', 'id_passport_number', 
        'passport_expiry_date', 'department_id', 'department_name', 
        'role_id', 'role_type', 'role', 'submitted_date', 'status', 
        'requested_by', 'from_company', 'duration', 
        'operating_country', 'date_start', 'date_end', 
        'work_with', 'additional_info', 'contact_number', 
        'updated_by', 'closed_date', 'closed_by'
      ].includes(key)
    );
    
    const values = keys.map(key => processedData[key]);
    
    // Create the SET part of the query
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
    
    // Add updated_at to the query
    const queryText = `
      UPDATE background_checks 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${keys.length + 1}
      RETURNING *
    `;
    
    // Add the id to the values array
    values.push(numericId);
    
    console.log('Executing query:', queryText);
    console.log('With parameters:', values);
    
    const result = await query(queryText, values);
    
    if (result.rows.length === 0) {
      return res.status(500).json({ error: 'Update failed' });
    }
    
    console.log('Update successful for ID:', id);
    
    // Format the dates in the response for consistent client handling
    const updatedRecord = result.rows[0];
    const formattedRecord = { ...updatedRecord };
    
    dateFields.forEach(field => {
      if (formattedRecord[field]) {
        try {
          formattedRecord[field] = new Date(formattedRecord[field]).toISOString().split('T')[0];
        } catch (error) {
          console.error(`Error formatting date in response for ${field}:`, error);
        }
      }
    });
    
    // Log the activity
    try {
      const activityData = {
        user_id: req.user.username,
        description: `Updated background check: ${processedData.full_names} (${processedData.status})`,
        type: 'update',
        record_id: numericId
      };
      
      await query(
        `INSERT INTO activity_log (user_id, description, type, record_id, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [activityData.user_id, activityData.description, activityData.type, activityData.record_id]
      );
      
      console.log('Activity logged for update:', activityData);
    } catch (logError) {
      console.error('Failed to log activity:', logError);
      // Continue with the response even if activity logging fails
    }
    
    return res.json(formattedRecord);
  } catch (error) {
    console.error('Error updating background check:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Delete background check
app.delete('/api/background-checks/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  console.log('Deleting background check with ID:', id);
  
  try {
    // Make sure id is a number
    const numericId = parseInt(id, 10);
    
    if (isNaN(numericId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Get the background check details before deleting (for activity log)
    const checkResult = await query(
      'SELECT full_names FROM background_checks WHERE id = $1',
      [numericId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Background check not found' });
    }
    
    const fullNames = checkResult.rows[0].full_names;
    
    // Delete the background check
    const result = await query(
      'DELETE FROM background_checks WHERE id = $1 RETURNING id',
      [numericId]
    );
    
    // Log the activity
    try {
      await query(
        `INSERT INTO activity_log (user_id, description, type, record_id, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [req.user.username, `Deleted background check: ${fullNames}`, 'delete', numericId]
      );
    } catch (logError) {
      console.error('Failed to log activity for delete:', logError);
    }
    
    return res.json({ success: true, message: 'Background check deleted successfully' });
  } catch (error) {
    console.error('Error deleting background check:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});




// Stakeholder Requests - For filter options
app.get('/api/stakeholder-requests/options', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching stakeholder request options');
    
    // Get all unique senders
    const sendersResult = await query(
      'SELECT DISTINCT sender FROM stakeholder_requests WHERE sender IS NOT NULL AND sender != \'\' ORDER BY sender'
    );
    
    // Get all unique subjects
    const subjectsResult = await query(
      'SELECT DISTINCT subject FROM stakeholder_requests WHERE subject IS NOT NULL AND subject != \'\' ORDER BY subject'
    );
    
    return res.json({
      senders: sendersResult.rows.map(row => row.sender),
      subjects: subjectsResult.rows.map(row => row.subject)
    });
  } catch (error) {
    console.error('Error fetching stakeholder request options:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Get all stakeholder requests
app.get('/api/stakeholder-requests/options', authenticateToken, async (req, res) => {
  try {
    // Get unique senders
    const senderResult = await query(
      'SELECT DISTINCT sender FROM stakeholder_requests WHERE sender IS NOT NULL AND sender != \'\' ORDER BY sender'
    );
    
    // Get unique subjects
    const subjectResult = await query(
      'SELECT DISTINCT subject FROM stakeholder_requests WHERE subject IS NOT NULL AND subject != \'\' ORDER BY subject'
    );
    
    return res.json({
      senders: senderResult.rows.map(row => row.sender),
      subjects: subjectResult.rows.map(row => row.subject)
    });
  } catch (error) {
    console.error('Error fetching stakeholder request options:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Get all stakeholder requests with better filtering
app.get('/api/stakeholder-requests', authenticateToken, async (req, res) => {
  try {
    const { 
      sender, 
      subject, 
      status, 
      answeredBy, 
      startDate, 
      endDate, 
      search
    } = req.query;
    
    let queryText = `
      SELECT 
        id, reference_number, sender, subject, status,
        TO_CHAR(date_received, 'YYYY-MM-DD') as date_received,
        TO_CHAR(response_date, 'YYYY-MM-DD') as response_date,
        answered_by, created_by,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
      FROM stakeholder_requests WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    // Add filters
    if (sender && sender !== 'all') {
      queryText += ` AND sender = $${paramIndex}`;
      params.push(sender);
      paramIndex++;
    }
    
    if (subject && subject !== 'all') {
      queryText += ` AND subject = $${paramIndex}`;
      params.push(subject);
      paramIndex++;
    }
    
    if (status && status !== 'all') {
      queryText += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (answeredBy && answeredBy !== 'all') {
      queryText += ` AND answered_by = $${paramIndex}`;
      params.push(answeredBy);
      paramIndex++;
    }
    
    if (startDate) {
      queryText += ` AND date_received >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      queryText += ` AND date_received <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    if (search) {
      queryText += ` AND (
        reference_number ILIKE $${paramIndex} OR
        sender ILIKE $${paramIndex} OR
        subject ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    queryText += ' ORDER BY date_received DESC';
    
    const result = await query(queryText, params);
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stakeholder requests:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Update a stakeholder request
app.put('/api/stakeholder-requests/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  try {
    // Prepare SQL parameters
    const keys = Object.keys(updateData).filter(key => 
      ['reference_number', 'date_received', 'sender', 'subject', 'status', 
       'response_date', 'answered_by', 'updated_by', 'updated_at'].includes(key)
    );
    
    const values = keys.map(key => updateData[key]);
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
    
    const queryText = `
      UPDATE stakeholder_requests 
      SET ${setClause}
      WHERE id = $${keys.length + 1}
      RETURNING *
    `;
    
    values.push(id);
    
    const result = await query(queryText, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating stakeholder request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Create a new stakeholder request
app.post('/api/stakeholder-requests', authenticateToken, async (req, res) => {
  try {
    const {
      reference_number,
      date_received,
      sender,
      subject,
      status,
      response_date,
      answered_by,
      created_by,
      created_at,
      updated_at
    } = req.body;
    
    // Process and validate date fields
    const processDate = (dateString) => {
      if (!dateString) return null;
      try {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      } catch (error) {
        console.error('Error processing date:', error);
        return null;
      }
    };
    
    const result = await query(
      `INSERT INTO stakeholder_requests (
        reference_number, date_received, sender, subject, status,
        response_date, answered_by, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        reference_number,
        processDate(date_received),
        sender,
        subject,
        status || 'Pending',
        processDate(response_date),
        answered_by,
        created_by || req.user.username,
        created_at || new Date().toISOString(),
        updated_at || new Date().toISOString()
      ]
    );
    
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating stakeholder request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Delete a single stakeholder request
app.delete('/api/stakeholder-requests/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { deleted_by } = req.query;
  
  console.log('Deleting stakeholder request with ID:', id, 'by user:', deleted_by);
  
  try {
    // Start a transaction
    await query('BEGIN');
    
    // Get request details before deleting (for logging)
    const checkResult = await query(
      'SELECT reference_number, sender, subject FROM stakeholder_requests WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'Stakeholder request not found' });
    }
    
    const requestDetails = checkResult.rows[0];
    
    // Delete the request
    const result = await query(
      'DELETE FROM stakeholder_requests WHERE id = $1 RETURNING id',
      [id]
    );
    
    // Log the activity
    await query(
      `INSERT INTO activity_log (user_id, description, type, record_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        deleted_by || req.user.username,
        `Deleted stakeholder request: ${requestDetails.reference_number} from ${requestDetails.sender} about ${requestDetails.subject}`,
        'delete',
        id
      ]
    );
    
    // Commit the transaction
    await query('COMMIT');
    
    return res.json({ 
      success: true, 
      message: 'Stakeholder request deleted successfully',
      id: id 
    });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    console.error('Error deleting stakeholder request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Delete multiple stakeholder requests
app.post('/api/stakeholder-requests/delete-multiple', authenticateToken, async (req, res) => {
  const { ids, deleted_by } = req.body;
  
  console.log('Deleting multiple stakeholder requests:', ids, 'by user:', deleted_by);
  
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No valid IDs provided for deletion' });
  }
  
  try {
    // Start a transaction
    await query('BEGIN');
    
    // Get request details before deleting (for logging)
    const checkResult = await query(
      'SELECT id, reference_number, sender, subject FROM stakeholder_requests WHERE id = ANY($1)',
      [ids]
    );
    
    if (checkResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'No matching stakeholder requests found' });
    }
    
    // Delete the requests
    const result = await query(
      'DELETE FROM stakeholder_requests WHERE id = ANY($1) RETURNING id',
      [ids]
    );
    
    // Log the activity for each deleted request
    for (const request of checkResult.rows) {
      await query(
        `INSERT INTO activity_log (user_id, description, type, record_id, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          deleted_by || req.user.username,
          `Deleted stakeholder request: ${request.reference_number} from ${request.sender} about ${request.subject}`,
          'delete',
          request.id
        ]
      );
    }
    
    // Log a batch delete activity
    await query(
      `INSERT INTO activity_log (user_id, description, type, record_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        deleted_by || req.user.username,
        `Batch deleted ${result.rows.length} stakeholder requests`,
        'batch_delete',
        null
      ]
    );
    
    // Commit the transaction
    await query('COMMIT');
    
    return res.json({ 
      success: true, 
      message: `${result.rows.length} stakeholder requests deleted successfully`,
      count: result.rows.length,
      ids: result.rows.map(row => row.id)
    });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    console.error('Error deleting multiple stakeholder requests:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});


// Add this route to test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await query('SELECT NOW() as time');
    res.json({ 
      success: true, 
      time: result.rows[0].time,
      dbConfig: {
        host: process.env.PG_HOST,
        port: process.env.PG_PORT,
        database: process.env.PG_DATABASE,
        user: process.env.PG_USER,
        // Don't include password for security reasons
      }
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      dbConfig: {
        host: process.env.PG_HOST,
        port: process.env.PG_PORT,
        database: process.env.PG_DATABASE,
        user: process.env.PG_USER,
        // Don't include password for security reasons
      }
    });
  }
});


// Guard Shift Report Routes
app.get('/api/guard-shift-reports', authenticateToken, async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      shiftType, 
      hasIncident, 
      guard, 
      location,
      page = 1,
      limit = 10
    } = req.query;
    
    console.log('Fetching guard shift reports with filters:', req.query);
    
    // Build the query with filters
    let queryText = `
      SELECT 
        id, 
        guard_name, 
        shift_type, 
        location, 
        TO_CHAR(shift_date, 'YYYY-MM-DD') as shift_date,
        TO_CHAR(shift_start_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as shift_start_time,
        TO_CHAR(shift_end_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as shift_end_time,
        has_incident,
        incident_details,
        TO_CHAR(incident_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as incident_time,
        actions_taken,
        cctv_status,
        cctv_issues,
        cctv_supervision_reason,
        cctv_supervision_other_reason,
        electricity_status,
        water_status,
        office_status,
        parking_status,
        team_members,
        notes,
        created_by,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
      FROM guard_shift_reports
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    // Add filters
    if (startDate) {
      queryText += ` AND shift_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      queryText += ` AND shift_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    if (shiftType && shiftType !== 'all') {
      queryText += ` AND shift_type = $${paramIndex}`;
      params.push(shiftType);
      paramIndex++;
    }
    
    if (hasIncident === 'true' || hasIncident === 'false') {
      queryText += ` AND has_incident = $${paramIndex}`;
      params.push(hasIncident === 'true');
      paramIndex++;
    }
    
    if (guard && guard !== 'all') {
      queryText += ` AND guard_name ILIKE $${paramIndex}`;
      params.push(`%${guard}%`);
      paramIndex++;
    }
    
    if (location && location !== 'all') {
      queryText += ` AND location = $${paramIndex}`;
      params.push(location);
      paramIndex++;
    }
    
    // Count total records for pagination
    const countQuery = `SELECT COUNT(*) FROM (${queryText}) AS filtered_reports`;
    const countResult = await query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Add pagination
    const offset = (page - 1) * limit;
    queryText += ` ORDER BY shift_date DESC, shift_start_time DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    console.log('Executing query:', queryText);
    console.log('With parameters:', params);
    
    const result = await query(queryText, params);
    
    return res.json({
      data: result.rows,
      count: totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error('Error fetching guard shift reports:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

app.get('/api/guard-shift-reports/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Fetching guard shift report with ID:', id);
    
    const result = await query(
      `SELECT 
        id, 
        guard_name, 
        shift_type, 
        location, 
        TO_CHAR(shift_date, 'YYYY-MM-DD') as shift_date,
        TO_CHAR(shift_start_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as shift_start_time,
        TO_CHAR(shift_end_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as shift_end_time,
        has_incident,
        incident_details,
        TO_CHAR(incident_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as incident_time,
        actions_taken,
        equipment_status,
        team_members,
        notes,
        created_by,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
      FROM guard_shift_reports
      WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Guard shift report not found' });
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching guard shift report:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

app.post('/api/guard-shift-reports', authenticateToken, async (req, res) => {
  try {
    const {
      submitted_by,
      location,
      shift_type,
      shift_start_time,
      shift_end_time,
      team_members,
      cctv_status,
      cctv_issues,
      cctv_supervision_reason,
      cctv_supervision_other_reason,
      electricity_status,
      water_status,
      office_status,
      parking_status,
      incident_occurred,
      incident_type,
      incident_time,
      incident_location,
      incident_description,
      action_taken,
      notes,
      user_id
    } = req.body;
    
    console.log('Creating guard shift report with data:', req.body);
    
    // Validate required fields
    if (!submitted_by || !location || !shift_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Extract date from shift_start_time for shift_date
    const shift_date = shift_start_time ? new Date(shift_start_time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    
    // Store team members as JSON
    const team_members_json = JSON.stringify(team_members || []);
    
    const result = await query(
      `INSERT INTO guard_shift_reports (
        guard_name,
        shift_type,
        location,
        shift_date,
        shift_start_time,
        shift_end_time,
        has_incident,
        incident_details,
        incident_time,
        actions_taken,
        cctv_status,
        cctv_issues,
        cctv_supervision_reason,
        cctv_supervision_other_reason,
        electricity_status,
        water_status,
        office_status,
        parking_status,
        team_members,
        notes,
        created_by,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())
      RETURNING *`,
      [
        submitted_by,
        shift_type,
        location,
        shift_date,
        shift_start_time,
        shift_end_time,
        incident_occurred || false,
        incident_description,
        incident_time,
        action_taken,
        cctv_status,
        cctv_issues,
        cctv_supervision_reason,
        cctv_supervision_other_reason,
        electricity_status,
        water_status,
        office_status,
        parking_status,
        team_members_json,
        notes,
        user_id || req.user.username
      ]
    );
    
    console.log('Guard shift report created successfully:', result.rows[0].id);
    
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating guard shift report:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});


app.put('/api/guard-shift-reports/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('Updating guard shift report with ID:', id);
    console.log('Update data:', updateData);
    
    // Get the current report
    const currentReport = await query('SELECT * FROM guard_shift_reports WHERE id = $1', [id]);
    
    if (currentReport.rows.length === 0) {
      return res.status(404).json({ error: 'Guard shift report not found' });
    }
    
    // Prepare the update data
    const updates = {};
    
    // Handle simple fields
    ['guard_name', 'shift_type', 'location', 'shift_date', 'shift_start_time', 
     'shift_end_time', 'has_incident', 'incident_details', 'incident_time', 
     'actions_taken', 'notes'].forEach(field => {
      if (field in updateData) {
        updates[field] = updateData[field];
      }
    });
    
    // Handle equipment status as JSON
    if (updateData.cctv_status || updateData.electricity_status || 
        updateData.water_status || updateData.office_status || 
        updateData.parking_status) {
      
      // Get current equipment status
      let currentEquipment = {};
      try {
        currentEquipment = JSON.parse(currentReport.rows[0].equipment_status || '{}');
      } catch (e) {
        console.warn('Error parsing current equipment status:', e);
      }
      
      // Update with new values
      const equipment_status = {
        ...currentEquipment,
        cctv_status: updateData.cctv_status || currentEquipment.cctv_status,
        cctv_issues: updateData.cctv_issues || currentEquipment.cctv_issues,
        cctv_supervision_reason: updateData.cctv_supervision_reason || currentEquipment.cctv_supervision_reason,
        cctv_supervision_other_reason: updateData.cctv_supervision_other_reason || currentEquipment.cctv_supervision_other_reason,
        electricity_status: updateData.electricity_status || currentEquipment.electricity_status,
        water_status: updateData.water_status || currentEquipment.water_status,
        office_status: updateData.office_status || currentEquipment.office_status,
        parking_status: updateData.parking_status || currentEquipment.parking_status
      };
      
      updates.equipment_status = JSON.stringify(equipment_status);
    }
    
    // Handle team members as JSON
    if (updateData.team_members) {
      updates.team_members = JSON.stringify(updateData.team_members);
    }
    
    // Build the dynamic update query
    const keys = Object.keys(updates);
    const values = keys.map(key => updates[key]);
    
    // Create the SET part of the query
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
    
    // Add updated_at to the query
    const queryText = `
      UPDATE guard_shift_reports 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${keys.length + 1}
      RETURNING *
    `;
    
    // Add the id to the values array
    values.push(id);
    
    const result = await query(queryText, values);
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating guard shift report:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

app.delete('/api/guard-shift-reports/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Deleting guard shift report with ID:', id);
    
    const result = await query(
      'DELETE FROM guard_shift_reports WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Guard shift report not found' });
    }
    
    return res.json({ success: true, message: 'Guard shift report deleted successfully' });
  } catch (error) {
    console.error('Error deleting guard shift report:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

app.get('/api/guard-shift-reports/stats/weekly', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching weekly guard shift report stats');
    
    // Get current date and start of week (Sunday)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Go to Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Format dates for PostgreSQL
    const startDate = startOfWeek.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];
    
    // Get total reports for the week
    const totalResult = await query(
      'SELECT COUNT(*) FROM guard_shift_reports WHERE shift_date BETWEEN $1 AND $2',
      [startDate, endDate]
    );
    
    // Get incident count for the week
    const incidentResult = await query(
      'SELECT COUNT(*) FROM guard_shift_reports WHERE shift_date BETWEEN $1 AND $2 AND has_incident = true',
      [startDate, endDate]
    );
    
    // Get issues count (reports with equipment issues)
    const issuesResult = await query(
      `SELECT COUNT(*) FROM guard_shift_reports 
       WHERE shift_date BETWEEN $1 AND $2 
       AND (
         electricity_status = 'issues' OR
         water_status = 'issues' OR
         office_status = 'issues' OR
         parking_status = 'issues' OR
         cctv_status = 'partial-issue' OR
         cctv_status = 'not-working'
       )`,
      [startDate, endDate]
    );
    
    // Get reports by location
    const locationResult = await query(
      'SELECT location, COUNT(*) FROM guard_shift_reports WHERE shift_date BETWEEN $1 AND $2 GROUP BY location',
      [startDate, endDate]
    );
    
    // Get reports by shift type
    const shiftTypeResult = await query(
      'SELECT shift_type, COUNT(*) FROM guard_shift_reports WHERE shift_date BETWEEN $1 AND $2 GROUP BY shift_type',
      [startDate, endDate]
    );
    
    return res.json({
      totalReports: parseInt(totalResult.rows[0].count),
      incidentCount: parseInt(incidentResult.rows[0].count),
      issuesCount: parseInt(issuesResult.rows[0].count),
      byLocation: locationResult.rows.map(row => ({
        location: row.location,
        count: parseInt(row.count)
      })),
      byShiftType: shiftTypeResult.rows.map(row => ({
        shiftType: row.shift_type,
        count: parseInt(row.count)
      }))
    });
  } catch (error) {
    console.error('Error fetching guard shift report stats:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});


// Add proxy endpoints for backward compatibility with existing frontend code
app.post('/api/guard-shifts', authenticateToken, async (req, res) => {
  try {
    console.log('Received request to /api/guard-shifts, forwarding to /api/guard-shift-reports');
    
    // Forward the request to the guard-shift-reports endpoint
    const response = await axios.post(
      `${req.protocol}://${req.get('host')}/api/guard-shift-reports`,
      req.body,
      {
        headers: {
          Authorization: req.headers.authorization
        }
      }
    );
    
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error forwarding request:', error);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

app.get('/api/guard-shifts', authenticateToken, async (req, res) => {
  try {
    console.log('Forwarding GET request from /api/guard-shifts to /api/guard-shift-reports');
    
    // Get the query parameters
    const queryParams = new URLSearchParams(req.query).toString();
    const url = queryParams ? `/api/guard-shift-reports?${queryParams}` : '/api/guard-shift-reports';
    
    // Make an internal request to the other endpoint
    const response = await axios.get(
      `${req.protocol}://${req.get('host')}${url}`,
      {
        headers: {
          Authorization: req.headers.authorization
        }
      }
    );
    
    return res.json(response.data);
  } catch (error) {
    console.error('Error forwarding request:', error);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

app.get('/api/guard-shifts/stats/weekly', authenticateToken, async (req, res) => {
  try {
    console.log('Forwarding GET request from /api/guard-shifts/stats/weekly to /api/guard-shift-reports/stats/weekly');
    
    // Get the query parameters
    const queryParams = new URLSearchParams(req.query).toString();
    const url = queryParams ? `/api/guard-shift-reports/stats/weekly?${queryParams}` : '/api/guard-shift-reports/stats/weekly';
    
    // Make an internal request to the other endpoint
    const response = await axios.get(
      `${req.protocol}://${req.get('host')}${url}`,
      {
        headers: {
          Authorization: req.headers.authorization
        }
      }
    );
    
    return res.json(response.data);
  } catch (error) {
    console.error('Error forwarding request:', error);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});


// Add endpoints for getting locations and shift types
app.get('/api/guard-shifts/locations', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching guard shift locations');
    
    const result = await query(
      'SELECT DISTINCT location FROM guard_shift_reports ORDER BY location',
      []
    );
    
    return res.json(result.rows.map(row => row.location));
  } catch (error) {
    console.error('Error fetching guard shift locations:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

app.get('/api/guard-shifts/shift-types', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching guard shift types');
    
    const result = await query(
      'SELECT DISTINCT shift_type FROM guard_shift_reports ORDER BY shift_type',
      []
    );
    
    return res.json(result.rows.map(row => row.shift_type));
  } catch (error) {
    console.error('Error fetching guard shift types:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Add endpoint for getting all guard shift reports (for export)
app.get('/api/guard-shifts/all', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching all guard shift reports for export');
    
    const result = await query(
      `SELECT 
        id, 
        guard_name, 
        shift_type, 
        location, 
        TO_CHAR(shift_date, 'YYYY-MM-DD') as shift_date,
        TO_CHAR(shift_start_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as shift_start_time,
        TO_CHAR(shift_end_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as shift_end_time,
        has_incident,
        incident_details,
        TO_CHAR(incident_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as incident_time,
        actions_taken,
        cctv_status,
        cctv_issues,
        cctv_supervision_reason,
        cctv_supervision_other_reason,
        electricity_status,
        water_status,
        office_status,
        parking_status,
        team_members,
        notes,
        created_by,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
      FROM guard_shift_reports
      ORDER BY shift_date DESC, shift_start_time DESC`,
      []
    );
    
    // Process the data to make it more frontend-friendly
    const processedData = result.rows.map(row => {
      let teamMembers = [];
      try {
        teamMembers = JSON.parse(row.team_members || '[]');
      } catch (e) {
        console.warn('Error parsing team members:', e);
      }
      
      return {
        id: row.id,
        submitted_by: row.guard_name,
        location: row.location,
        shift_type: row.shift_type,
        shift_start_time: row.shift_start_time,
        shift_end_time: row.shift_end_time,
        cctv_status: row.cctv_status || 'unknown',
        cctv_issues: row.cctv_issues || null,
        cctv_supervision_reason: row.cctv_supervision_reason || null,
        cctv_supervision_other_reason: row.cctv_supervision_other_reason || null,
        electricity_status: row.electricity_status || 'unknown',
        water_status: row.water_status || 'unknown',
        office_status: row.office_status || 'unknown',
        parking_status: row.parking_status || 'unknown',
        incident_occurred: row.has_incident || false,
        incident_type: row.incident_type || null,
        incident_time: row.incident_time || null,
        incident_location: row.incident_location || null,
        incident_description: row.incident_details || null,
        action_taken: row.actions_taken || null,
        notes: row.notes || null,
        team_members: teamMembers,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });
    
    return res.json({
      data: processedData,
      count: processedData.length
    });
  } catch (error) {
    console.error('Error fetching all guard shift reports:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});



// QUEUE MANAGEMENT ROUTES
// Get all handlers
app.get('/api/queue/handlers', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching queue handlers');
    
    const result = await query(
      `SELECT qh.id, qh.service_type, qh.user_id, u.username, u.full_name,
              qh.created_at, qh.updated_at
       FROM queue_handlers qh
       JOIN users u ON qh.user_id = u.id
       ORDER BY qh.service_type, u.full_name`
    );
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching queue handlers:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Assign a handler to a service type
app.post('/api/queue/handlers', authenticateToken, async (req, res) => {
  try {
    const { service_type, user_id } = req.body;
    
    console.log('Assigning handler to service type:', { service_type, user_id });
    
    if (!service_type || !user_id) {
      return res.status(400).json({ error: 'Service type and user ID are required' });
    }
    
    // Check if the user exists
    const userCheck = await query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Insert or update the handler assignment
    const result = await query(
      `INSERT INTO queue_handlers (service_type, user_id, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (service_type, user_id) 
       DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [service_type, user_id]
    );
    
    // Get the user details to include in the response
    const userResult = await query(
      'SELECT id, username, full_name FROM users WHERE id = $1',
      [user_id]
    );
    
    const handler = {
      ...result.rows[0],
      username: userResult.rows[0].username,
      full_name: userResult.rows[0].full_name
    };
    
    return res.status(201).json(handler);
  } catch (error) {
    console.error('Error assigning queue handler:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Remove a handler from a service type
app.delete('/api/queue/handlers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Removing handler with ID:', id);
    
    const result = await query(
      'DELETE FROM queue_handlers WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Handler not found' });
    }
    
    return res.json({ success: true, message: 'Handler removed successfully' });
  } catch (error) {
    console.error('Error removing queue handler:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Get all service requests
app.get('/api/queue/requests', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching service requests');
    
    const result = await query(
      `SELECT sr.id, sr.reference_number, sr.service_type, sr.status, sr.priority,
              sr.full_names, sr.id_passport, sr.primary_contact, sr.secondary_contact,
              sr.details, sr.assigned_to, sr.created_by,
              creator.username as creator_username, creator.full_name as creator_full_name,
              assignee.username as assignee_username, assignee.full_name as assignee_full_name,
              sr.created_at, sr.updated_at
       FROM service_requests sr
       LEFT JOIN users creator ON sr.created_by = creator.id
       LEFT JOIN users assignee ON sr.assigned_to = assignee.id
       ORDER BY sr.created_at DESC`
    );
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching service requests:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Assign a request to a handler
app.put('/api/queue/requests/:id/assign', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    
    console.log('Assigning request to handler:', { request_id: id, user_id });
    
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Check if the request exists
    const requestCheck = await query(
      'SELECT id FROM service_requests WHERE id = $1',
      [id]
    );
    
    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Service request not found' });
    }
    
    // Check if the user exists
    const userCheck = await query(
      'SELECT id FROM users WHERE id = $1',
      [user_id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update the request
    const result = await query(
      `UPDATE service_requests 
       SET assigned_to = $1, status = 'in_progress', updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [user_id, id]
    );
    
    // Get the user details to include in the response
    const userResult = await query(
      'SELECT id, username, full_name FROM users WHERE id = $1',
      [user_id]
    );
    
    const request = {
      ...result.rows[0],
      assignee_username: userResult.rows[0].username,
      assignee_full_name: userResult.rows[0].full_name
    };
    
    return res.json(request);
  } catch (error) {
    console.error('Error assigning service request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Mark a request as unable to handle
app.put('/api/queue/requests/:id/unable-to-handle', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Marking request as unable to handle:', id);
    
    // Check if the request exists
    const requestCheck = await query(
      'SELECT id FROM service_requests WHERE id = $1',
      [id]
    );
    
    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Service request not found' });
    }
    
    // Update the request
    const result = await query(
      `UPDATE service_requests 
       SET status = 'unable_to_handle', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking service request as unable to handle:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Mark a request as completed
app.put('/api/queue/requests/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Marking request as completed:', id);
    
    // Check if the request exists
    const requestCheck = await query(
      'SELECT id FROM service_requests WHERE id = $1',
      [id]
    );
    
    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Service request not found' });
    }
    
    // Update the request
    const result = await query(
      `UPDATE service_requests 
       SET status = 'completed', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking service request as completed:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Mark a request as under investigation
app.put('/api/queue/requests/:id/investigate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Marking request as under investigation:', id);
    
    // Check if the request exists
    const requestCheck = await query(
      'SELECT id FROM service_requests WHERE id = $1',
      [id]
    );
    
    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Service request not found' });
    }
    
    // Update the request
    const result = await query(
      `UPDATE service_requests 
       SET status = 'pending_investigation', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking service request as under investigation:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Send back a request
app.put('/api/queue/requests/:id/send-back', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Sending back request:', id);
    
    // Check if the request exists
    const requestCheck = await query(
      'SELECT id FROM service_requests WHERE id = $1',
      [id]
    );
    
    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Service request not found' });
    }
    
    // Update the request
    const result = await query(
      `UPDATE service_requests 
       SET status = 'sent_back', assigned_to = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error sending back service request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Get handlers by service type
app.get('/api/queue/handlers/by-service/:serviceType', authenticateToken, async (req, res) => {
  try {
    const { serviceType } = req.params;
    
    console.log('Fetching handlers for service type:', serviceType);
    
    const result = await query(
      `SELECT qh.id, qh.service_type, qh.user_id, u.username, u.full_name
       FROM queue_handlers qh
       JOIN users u ON qh.user_id = u.id
       WHERE qh.service_type = $1
       ORDER BY u.full_name`,
      [serviceType]
    );
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching handlers by service type:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});


// NOTIFICATION SETTINGS ROUTES
app.get('/api/notifications/settings/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('Fetching notification settings for user ID:', userId);
    
    // Check if settings exist for this user
    const result = await query(
      'SELECT browser_enabled, sms_enabled, email_enabled FROM notification_settings WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      // Create default settings if none exist
      const defaultSettings = {
        browserEnabled: true,
        smsEnabled: false,
        emailEnabled: true
      };
      
      await query(
        `INSERT INTO notification_settings (user_id, browser_enabled, sms_enabled, email_enabled)
         VALUES ($1, $2, $3, $4)`,
        [userId, defaultSettings.browserEnabled, defaultSettings.smsEnabled, defaultSettings.emailEnabled]
      );
      
      return res.json(defaultSettings);
    }
    
    // Return existing settings
    const settings = result.rows[0];
    return res.json({
      browserEnabled: settings.browser_enabled,
      smsEnabled: settings.sms_enabled,
      emailEnabled: settings.email_enabled
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

app.put('/api/notifications/settings/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { browserEnabled, smsEnabled, emailEnabled } = req.body;
    
    console.log('Updating notification settings for user ID:', userId);
    
    // Update or insert settings (upsert)
    await query(
      `INSERT INTO notification_settings (user_id, browser_enabled, sms_enabled, email_enabled, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         browser_enabled = $2,
         sms_enabled = $3,
         email_enabled = $4,
         updated_at = NOW()`,
      [userId, browserEnabled, smsEnabled, emailEnabled]
    );
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});



// Get available security services
app.get('/api/security-services', authenticateToken, async (req, res) => {
  try {
    const services = [
      {
        id: 1,
        service_type: 'request_serial_number',
        name: 'Request Serial Number',
        description: 'Request a new serial number'
      },
      {
        id: 2,
        service_type: 'stolen_phone_check',
        name: 'Stolen Phone Check',
        description: 'Check if a phone is reported stolen'
      },
      {
        id: 3,
        service_type: 'call_history_request',
        name: 'Call History Request',
        description: 'Request call history'
      },
      {
        id: 4,
        service_type: 'unblock_call_request',
        name: 'Unblock Call Request',
        description: 'Request to unblock calls'
      },
      {
        id: 5,
        service_type: 'unblock_momo_request',
        name: 'Unblock MoMo Request',
        description: 'Request to unblock MoMo account'
      },
      {
        id: 6,
        service_type: 'money_refund_request',
        name: 'Money Refund Request',
        description: 'Request a money refund'
      },
      {
        id: 7,
        service_type: 'momo_transaction_request',
        name: 'MoMo Transaction Request',
        description: 'Request MoMo transaction details'
      },
      {
        id: 8,
        service_type: 'backoffice_appointment',
        name: 'Backoffice Appointment',
        description: 'Schedule a backoffice appointment'
      }
    ];
    
    res.json({ services });
  } catch (error) {
    console.error('Error fetching security services:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user service permissions
app.get('/api/security-services/permissions/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // In a real-world scenario, you'd fetch these from a database based on user role/permissions
    const allPermissions = [
      'request_serial_number',
      'stolen_phone_check',
      'call_history_request',
      'unblock_call_request',
      'unblock_momo_request',
      'money_refund_request',
      'momo_transaction_request',
      'backoffice_appointment'
    ];
    
    // For this example, we'll return all permissions
    // In a real app, you'd filter based on user role or specific user permissions
    res.json({ permissions: allPermissions });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});



// TASKS ROUTES
// Get available requests for a user
app.get('/api/tasks/available/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('Fetching available requests for user ID:', userId);
    
    // Get requests that are new and not assigned to anyone
    const result = await query(
      `SELECT sr.*, 
        json_agg(DISTINCT rc) AS request_comments,
        json_agg(DISTINCT rh) AS request_history,
        json_build_object('id', created_by.id, 'fullname', created_by.full_name) AS created_by,
        CASE WHEN sr.assigned_to IS NOT NULL THEN 
          json_build_object('id', assigned_to.id, 'fullname', assigned_to.full_name)
        ELSE NULL END AS assigned_to
      FROM service_requests sr
      LEFT JOIN users created_by ON sr.created_by = created_by.id
      LEFT JOIN users assigned_to ON sr.assigned_to = assigned_to.id
      LEFT JOIN request_comments rc ON sr.id = rc.request_id
      LEFT JOIN request_history rh ON sr.id = rh.request_id
      WHERE sr.status = 'new' AND sr.assigned_to IS NULL
      GROUP BY sr.id, created_by.id, created_by.full_name, assigned_to.id, assigned_to.full_name
      ORDER BY sr.created_at DESC`,
      []
    );
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching available requests:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Get assigned requests for a user
app.get('/api/tasks/assigned/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;
    
    console.log('Fetching assigned requests for user ID:', userId, 'Status filter:', status);
    
    let query_text = `
      SELECT sr.*, 
        json_agg(DISTINCT rc) AS request_comments,
        json_agg(DISTINCT rh) AS request_history,
        json_build_object('id', created_by.id, 'fullname', created_by.full_name) AS created_by,
        json_build_object('id', assigned_to.id, 'fullname', assigned_to.full_name) AS assigned_to
      FROM service_requests sr
      LEFT JOIN users created_by ON sr.created_by = created_by.id
      LEFT JOIN users assigned_to ON sr.assigned_to = assigned_to.id
      LEFT JOIN request_comments rc ON sr.id = rc.request_id
      LEFT JOIN request_history rh ON sr.id = rh.request_id
      WHERE sr.assigned_to = $1
    `;
    
    const queryParams = [userId];
    
    // Add status filter if provided
    if (status) {
      query_text += ` AND sr.status = $2`;
      queryParams.push(status);
    }
    
    query_text += `
      GROUP BY sr.id, created_by.id, created_by.full_name, assigned_to.id, assigned_to.full_name
      ORDER BY sr.updated_at DESC
    `;
    
    const result = await query(query_text, queryParams);
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching assigned requests:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Get submitted requests for a user
app.get('/api/tasks/submitted/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('Fetching submitted requests for user ID:', userId);
    
    const result = await query(
      `SELECT sr.*, 
        json_agg(DISTINCT rc) AS request_comments,
        json_agg(DISTINCT rh) AS request_history,
        json_build_object('id', created_by.id, 'fullname', created_by.full_name) AS created_by,
        CASE WHEN sr.assigned_to IS NOT NULL THEN 
          json_build_object('id', assigned_to.id, 'fullname', assigned_to.full_name)
        ELSE NULL END AS assigned_to
      FROM service_requests sr
      LEFT JOIN users created_by ON sr.created_by = created_by.id
      LEFT JOIN users assigned_to ON sr.assigned_to = assigned_to.id
      LEFT JOIN request_comments rc ON sr.id = rc.request_id
      LEFT JOIN request_history rh ON sr.id = rh.request_id
      WHERE sr.created_by = $1 AND sr.status != 'sent_back'
      GROUP BY sr.id, created_by.id, created_by.full_name, assigned_to.id, assigned_to.full_name
      ORDER BY sr.created_at DESC`,
      [userId]
    );
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching submitted requests:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Get sent back requests for a user
app.get('/api/tasks/sent-back/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('Fetching sent back requests for user ID:', userId);
    
    const result = await query(
      `SELECT sr.*, 
        json_agg(DISTINCT rc) AS request_comments,
        json_agg(DISTINCT rh) AS request_history,
        json_build_object('id', created_by.id, 'fullname', created_by.full_name) AS created_by,
        CASE WHEN sr.assigned_to IS NOT NULL THEN 
          json_build_object('id', assigned_to.id, 'fullname', assigned_to.full_name)
        ELSE NULL END AS assigned_to
      FROM service_requests sr
      LEFT JOIN users created_by ON sr.created_by = created_by.id
      LEFT JOIN users assigned_to ON sr.assigned_to = assigned_to.id
      LEFT JOIN request_comments rc ON sr.id = rc.request_id
      LEFT JOIN request_history rh ON sr.id = rh.request_id
      WHERE sr.created_by = $1 AND sr.status = 'sent_back'
      GROUP BY sr.id, created_by.id, created_by.full_name, assigned_to.id, assigned_to.full_name
      ORDER BY sr.updated_at DESC`,
      [userId]
    );
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sent back requests:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Get new requests since a timestamp
app.get('/api/tasks/new-since/:timestamp', authenticateToken, async (req, res) => {
  try {
    const { timestamp } = req.params;
    const { userId } = req.query;
    
    console.log('Fetching new requests since:', timestamp, 'for user ID:', userId);
    
    const result = await query(
      `SELECT sr.* 
      FROM service_requests sr
      WHERE sr.created_at > to_timestamp($1) 
      AND sr.status = 'new' 
      AND sr.assigned_to IS NULL
      ORDER BY sr.created_at DESC`,
      [timestamp / 1000] // Convert milliseconds to seconds for PostgreSQL timestamp
    );
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching new requests:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Get status changes since a timestamp
app.get('/api/tasks/status-changes/:timestamp', authenticateToken, async (req, res) => {
  try {
    const { timestamp } = req.params;
    const { userId } = req.query;
    
    console.log('Fetching status changes since:', timestamp, 'for user ID:', userId);
    
    const result = await query(
      `SELECT sr.id, sr.reference_number, sr.status, rh.created_at
      FROM request_history rh
      JOIN service_requests sr ON rh.request_id = sr.id
      WHERE rh.created_at > to_timestamp($1)
      AND rh.action = 'status_change'
      AND (sr.created_by = $2 OR sr.assigned_to = $2)
      ORDER BY rh.created_at DESC`,
      [timestamp / 1000, userId] // Convert milliseconds to seconds for PostgreSQL timestamp
    );
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching status changes:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Claim a request
app.post('/api/tasks/claim/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { userId } = req.body;
    
    console.log('Claiming request ID:', requestId, 'for user ID:', userId);
    
    // Start a transaction
    await query('BEGIN');
    
    // Update the request
    await query(
      `UPDATE service_requests 
      SET assigned_to = $1, 
          status = 'in_progress', 
          updated_at = NOW() 
      WHERE id = $2`,
      [userId, requestId]
    );
    
    // Add to history
    await query(
      `INSERT INTO request_history (request_id, performed_by, action, details, created_at)
      VALUES ($1, $2, 'status_change', 'Request claimed and status changed to in progress', NOW())`,
      [requestId, userId]
    );
    
    // Commit the transaction
    await query('COMMIT');
    
    return res.json({ success: true });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    console.error('Error claiming request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Update request status
app.put('/api/tasks/status/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, userId, details, assigned_to } = req.body;
    
    console.log('Updating request ID:', requestId, 'to status:', status);
    
    // Start a transaction
    await query('BEGIN');
    
    // Update the request
    const updateQuery = `
      UPDATE service_requests 
      SET status = $1, 
          updated_at = NOW()
          ${assigned_to !== undefined ? ', assigned_to = $3' : ''}
      WHERE id = $2
    `;
    
    const updateParams = assigned_to !== undefined 
      ? [status, requestId, assigned_to] 
      : [status, requestId];
    
    await query(updateQuery, updateParams);
    
    // Add to history
    await query(
      `INSERT INTO request_history (request_id, performed_by, action, details, created_at)
      VALUES ($1, $2, 'status_change', $3, NOW())`,
      [requestId, userId, details || `Status changed to ${status}`]
    );
    
    // Commit the transaction
    await query('COMMIT');
    
    return res.json({ success: true });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    console.error('Error updating request status:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Add a comment to a request
app.post('/api/tasks/comment/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { userId, comment, isSendBackReason } = req.body;
    
    console.log('Adding comment to request ID:', requestId);
    
    // Insert the comment
    await query(
      `INSERT INTO request_comments (request_id, created_by, comment, is_send_back_reason, created_at)
      VALUES ($1, $2, $3, $4, NOW())`,
      [requestId, userId, comment, isSendBackReason]
    );
    
    // Add to history
    await query(
      `INSERT INTO request_history (request_id, performed_by, action, details, created_at)
      VALUES ($1, $2, 'comment_added', $3, NOW())`,
      [requestId, userId, isSendBackReason ? 'Send back reason added' : 'Comment added']
    );
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error adding comment:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Update request data
app.put('/api/tasks/data/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const updateData = req.body;
    
    console.log('Updating data for request ID:', requestId);
    
    // Start a transaction
    await query('BEGIN');
    
    // Build the update query dynamically based on the provided fields
    const allowedFields = [
      'full_names', 'primary_contact', 'secondary_contact', 
      'details', 'status', 'assigned_to', 'priority'
    ];
    
    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;
    
    // Add updated_at field
    updateFields.push(`updated_at = NOW()`);
    
    // Add other fields from the request body
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramIndex}`);
        queryParams.push(value);
        paramIndex++;
      }
    }
    
    // Add request ID as the last parameter
    queryParams.push(requestId);
    
    // Execute the update if there are fields to update
    if (updateFields.length > 0) {
      const updateQuery = `
        UPDATE service_requests 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramIndex}
      `;
      
      await query(updateQuery, queryParams);
      
      // Add to history
      await query(
        `INSERT INTO request_history (request_id, performed_by, action, details, created_at)
        VALUES ($1, $2, 'edited', 'Request data updated', NOW())`,
        [requestId, updateData.updated_by || null]
      );
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    return res.json({ success: true });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    console.error('Error updating request data:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});



// For Security Components

// Fetch Backoffice Users
app.get('/api/security-services/backoffice-users', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching backoffice users');
    
    // Fetch active backoffice users from the database
    const result = await query(`
      SELECT 
        id, 
        full_name AS fullname, 
        role,
        username
      FROM users 
      WHERE 
        is_active = true 
        AND role IN ('backoffice', 'admin', 'support')
      ORDER BY full_name
    `);
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching backoffice users:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Submit Backoffice Appointment
app.post('/api/security-services/backoffice-appointments', authenticateToken, async (req, res) => {
  try {
    const { request, appointments } = req.body;
    
    console.log('Received backoffice appointment request:', { request, appointments });
    
    // Validate required fields
    if (!request || !appointments || !Array.isArray(appointments)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    // Validate selected backoffice user exists and is active
    const userCheck = await query(
      `SELECT id FROM users 
       WHERE id = $1 
       AND is_active = true 
       AND role IN ('backoffice', 'admin', 'support')`,
      [appointments[0].backoffice_user_id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or inactive backoffice user' });
    }
    
    // Start a transaction
    await query('BEGIN');
    
    // Generate a unique reference number (more robust implementation)
    const lastRequestResult = await query(
      `SELECT reference_number 
       FROM service_requests 
       WHERE reference_number LIKE 'BOA-${new Date().getFullYear()}%'
       ORDER BY created_at DESC 
       LIMIT 1`
    );
    
    let sequenceNumber = 1;
    if (lastRequestResult.rows.length > 0) {
      const lastRefNumber = lastRequestResult.rows[0].reference_number;
      const lastSequence = parseInt(lastRefNumber.split('-')[2]);
      sequenceNumber = isNaN(lastSequence) ? 1 : lastSequence + 1;
    }
    
    const referenceNumber = `BOA-${new Date().getFullYear()}-${sequenceNumber.toString().padStart(4, '0')}`;
    
    // Insert the main service request
    const serviceRequestResult = await query(
      `INSERT INTO service_requests (
        reference_number, 
        service_type, 
        full_names, 
        id_passport, 
        primary_contact, 
        secondary_contact, 
        details, 
        created_by, 
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [
        referenceNumber,
        'backoffice_appointment',
        request.full_names,
        request.id_passport,
        request.primary_contact,
        request.secondary_contact || null,
        request.details || null,
        null, // created_by set to null since no specific user context
        'new'
      ]
    );
    
    const serviceRequestId = serviceRequestResult.rows[0].id;
    
    // Insert appointment details
    for (const appointment of appointments) {
      await query(
        `INSERT INTO backoffice_appointments (
          service_request_id,
          backoffice_user_id,
          preferred_date,
          preferred_time
        ) VALUES ($1, $2, $3, $4)`,
        [
          serviceRequestId,
          appointment.backoffice_user_id,
          appointment.preferred_date,
          appointment.preferred_time
        ]
      );
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    console.log('Backoffice appointment created successfully');
    
    return res.status(201).json({ 
      referenceNumber,
      serviceRequestId
    });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    
    console.error('Error creating backoffice appointment:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Add to server routes section
app.post('/api/security-services/call-history-request', authenticateToken, async (req, res) => {
  try {
    const { formData, callHistoryRequests, serviceType, userId } = req.body;
    
    console.log('Received call history request:', { formData, callHistoryRequests });
    
    // Validate required fields
    if (!formData || !callHistoryRequests || !Array.isArray(callHistoryRequests)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    // Start a transaction
    await query('BEGIN');
    
    // Generate reference number
    const lastRequestResult = await query(
      `SELECT reference_number 
       FROM service_requests 
       WHERE reference_number LIKE 'CHR-${new Date().getFullYear()}%'
       ORDER BY created_at DESC 
       LIMIT 1`
    );
    
    let sequenceNumber = 1;
    if (lastRequestResult.rows.length > 0) {
      const lastRefNumber = lastRequestResult.rows[0].reference_number;
      const lastSequence = parseInt(lastRefNumber.split('-')[2]);
      sequenceNumber = isNaN(lastSequence) ? 1 : lastSequence + 1;
    }
    
    const referenceNumber = `CHR-${new Date().getFullYear()}-${sequenceNumber.toString().padStart(4, '0')}`;
    
    // Insert the main service request
    const serviceRequestResult = await query(
      `INSERT INTO service_requests (
        reference_number, 
        service_type, 
        full_names, 
        id_passport, 
        primary_contact, 
        secondary_contact, 
        details, 
        created_by, 
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [
        referenceNumber,
        serviceType || 'call_history_request',
        formData.full_names,
        formData.id_passport,
        formData.primary_contact,
        formData.secondary_contact || null,
        formData.details || null,
        req.user.username,
        'new'
      ]
    );
    
    const serviceRequestId = serviceRequestResult.rows[0].id;
    
    // Insert call history request details
    for (const request of callHistoryRequests) {
      await query(
        `INSERT INTO call_history_requests (
          service_request_id,
          phone_number,
          start_date,
          end_date
        ) VALUES ($1, $2, $3, $4)`,
        [
          serviceRequestId,
          request.phone_number,
          request.start_date,
          request.end_date
        ]
      );
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    console.log('Call history request created successfully');
    
    return res.status(201).json({ 
      referenceNumber,
      serviceRequestId
    });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    
    console.error('Error creating call history request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Add to server routes section
app.post('/api/security-services/momo-transaction-request', authenticateToken, async (req, res) => {
  try {
    const { formData, momoTransactions, serviceType, userId } = req.body;
    
    console.log('Received MoMo transaction request:', { formData, momoTransactions });
    
    // Validate required fields
    if (!formData || !momoTransactions || !Array.isArray(momoTransactions)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    // Start a transaction
    await query('BEGIN');
    
    // Generate reference number
    const lastRequestResult = await query(
      `SELECT reference_number 
       FROM service_requests 
       WHERE reference_number LIKE 'MTR-${new Date().getFullYear()}%'
       ORDER BY created_at DESC 
       LIMIT 1`
    );
    
    let sequenceNumber = 1;
    if (lastRequestResult.rows.length > 0) {
      const lastRefNumber = lastRequestResult.rows[0].reference_number;
      const lastSequence = parseInt(lastRefNumber.split('-')[2]);
      sequenceNumber = isNaN(lastSequence) ? 1 : lastSequence + 1;
    }
    
    const referenceNumber = `MTR-${new Date().getFullYear()}-${sequenceNumber.toString().padStart(4, '0')}`;
    
    // Insert the main service request
    const serviceRequestResult = await query(
      `INSERT INTO service_requests (
        reference_number, 
        service_type, 
        full_names, 
        id_passport, 
        primary_contact, 
        secondary_contact, 
        details, 
        created_by, 
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [
        referenceNumber,
        serviceType || 'momo_transaction_request',
        formData.full_names,
        formData.id_passport,
        formData.primary_contact,
        formData.secondary_contact || null,
        formData.details || null,
        req.user.username,
        'new'
      ]
    );
    
    const serviceRequestId = serviceRequestResult.rows[0].id;
    
    // Insert MoMo transaction request details
    for (const transaction of momoTransactions) {
      await query(
        `INSERT INTO momo_transaction_requests (
          service_request_id,
          phone_number,
          start_date,
          end_date
        ) VALUES ($1, $2, $3, $4)`,
        [
          serviceRequestId,
          transaction.phone_number,
          transaction.start_date,
          transaction.end_date
        ]
      );
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    console.log('MoMo transaction request created successfully');
    
    return res.status(201).json({ 
      referenceNumber,
      serviceRequestId
    });
  } catch (error){
    // Rollback in case of error
    await query('ROLLBACK');
    
    console.error('Error creating MoMo transaction request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Add to server routes section
app.post('/api/security-services/unblock-momo-request', authenticateToken, async (req, res) => {
  try {
    const { formData, momoNumberRequests, serviceType, userId } = req.body;
    
    console.log('Received unblock MoMo request:', { formData, momoNumberRequests });
    
    // Validate required fields
    if (!formData || !momoNumberRequests || !Array.isArray(momoNumberRequests)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    // Start a transaction
    await query('BEGIN');
    
    // Generate reference number
    const lastRequestResult = await query(
      `SELECT reference_number 
       FROM service_requests 
       WHERE reference_number LIKE 'UMR-${new Date().getFullYear()}%'
       ORDER BY created_at DESC 
       LIMIT 1`
    );
    
    let sequenceNumber = 1;
    if (lastRequestResult.rows.length > 0) {
      const lastRefNumber = lastRequestResult.rows[0].reference_number;
      const lastSequence = parseInt(lastRefNumber.split('-')[2]);
      sequenceNumber = isNaN(lastSequence) ? 1 : lastSequence + 1;
    }
    
    const referenceNumber = `UMR-${new Date().getFullYear()}-${sequenceNumber.toString().padStart(4, '0')}`;
    
    // Insert the main service request
    const serviceRequestResult = await query(
      `INSERT INTO service_requests (
        reference_number, 
        service_type, 
        full_names, 
        id_passport, 
        primary_contact, 
        secondary_contact, 
        details, 
        created_by, 
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [
        referenceNumber,
        serviceType || 'unblock_momo_request',
        formData.full_names,
        formData.id_passport,
        formData.primary_contact,
        formData.secondary_contact || null,
        formData.details || null,
        req.user.username,
        'new'
      ]
    );
    
    const serviceRequestId = serviceRequestResult.rows[0].id;
    
    // Insert unblock MoMo request details
    for (const request of momoNumberRequests) {
      await query(
        `INSERT INTO unblock_momo_requests (
          service_request_id,
          phone_number,
          date_blocked,
          account_type
        ) VALUES ($1, $2, $3, $4)`,
        [
          serviceRequestId,
          request.number,
          request.date_blocked || null,
          request.account_type
        ]
      );
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    console.log('Unblock MoMo request created successfully');
    
    return res.status(201).json({ 
      referenceNumber,
      serviceRequestId
    });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    
    console.error('Error creating unblock MoMo request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Add to server routes section
app.post('/api/security-services/money-refund-request', authenticateToken, async (req, res) => {
  try {
    const { formData, refundRequests, serviceType, userId } = req.body;
    
    console.log('Received money refund request:', { formData, refundRequests });
    
    // Validate required fields
    if (!formData || !refundRequests || !Array.isArray(refundRequests)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    // Start a transaction
    await query('BEGIN');
    
    // Generate reference number
    const lastRequestResult = await query(
      `SELECT reference_number 
       FROM service_requests 
       WHERE reference_number LIKE 'MRR-${new Date().getFullYear()}%'
       ORDER BY created_at DESC 
       LIMIT 1`
    );
    
    let sequenceNumber = 1;
    if (lastRequestResult.rows.length > 0) {
      const lastRefNumber = lastRequestResult.rows[0].reference_number;
      const lastSequence = parseInt(lastRefNumber.split('-')[2]);
      sequenceNumber = isNaN(lastSequence) ? 1 : lastSequence + 1;
    }
    
    const referenceNumber = `MRR-${new Date().getFullYear()}-${sequenceNumber.toString().padStart(4, '0')}`;
    
    // Insert the main service request
    const serviceRequestResult = await query(
      `INSERT INTO service_requests (
        reference_number, 
        service_type, 
        full_names, 
        id_passport, 
        primary_contact, 
        secondary_contact, 
        details, 
        created_by, 
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [
        referenceNumber,
        serviceType || 'money_refund_request',
        formData.full_names,
        formData.id_passport,
        formData.primary_contact,
        formData.secondary_contact || null,
        formData.details || null,
        req.user.username,
        'new'
      ]
    );
    
    const serviceRequestId = serviceRequestResult.rows[0].id;
    
    // Insert money refund request details
    for (const request of refundRequests) {
      await query(
        `INSERT INTO money_refund_requests (
          service_request_id,
          phone_number,
          recipient_number,
          amount,
          transaction_date,
          reason
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          serviceRequestId,
          request.phone_number,
          request.recipient_number,
          parseFloat(request.amount),
          request.transaction_date,
          request.reason
        ]
      );
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    console.log('Money refund request created successfully');
    
    return res.status(201).json({ 
      referenceNumber,
      serviceRequestId
    });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    
    console.error('Error creating money refund request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Add to server routes section
app.post('/api/security-services/serial-number-request', authenticateToken, async (req, res) => {
  try {
    const { formData, phoneRequests, serviceType, userId } = req.body;
    
    console.log('Received serial number request:', { formData, phoneRequests });
    
    // Validate required fields
    if (!formData || !phoneRequests || !Array.isArray(phoneRequests)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    // Start a transaction
    await query('BEGIN');
    
    // Generate reference number
    const lastRequestResult = await query(
      `SELECT reference_number 
       FROM service_requests 
       WHERE reference_number LIKE 'SNR-${new Date().getFullYear()}%'
       ORDER BY created_at DESC 
       LIMIT 1`
    );
    
    let sequenceNumber = 1;
    if (lastRequestResult.rows.length > 0) {
      const lastRefNumber = lastRequestResult.rows[0].reference_number;
      const lastSequence = parseInt(lastRefNumber.split('-')[2]);
      sequenceNumber = isNaN(lastSequence) ? 1 : lastSequence + 1;
    }
    
    const referenceNumber = `SNR-${new Date().getFullYear()}-${sequenceNumber.toString().padStart(4, '0')}`;
    
    // Insert the main service request
    const serviceRequestResult = await query(
      `INSERT INTO service_requests (
        reference_number, 
        service_type, 
        full_names, 
        id_passport, 
        primary_contact, 
        secondary_contact, 
        details, 
        created_by, 
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [
        referenceNumber,
        serviceType || 'serial_number_request',
        formData.full_names,
        formData.id_passport,
        formData.primary_contact,
        formData.secondary_contact || null,
        formData.details || null,
        req.user.username,
        'new'
      ]
    );
    
    const serviceRequestId = serviceRequestResult.rows[0].id;
    
    // Insert serial number request details
    for (const request of phoneRequests) {
      await query(
        `INSERT INTO serial_number_requests (
          service_request_id,
          phone_number,
          phone_brand,
          start_date,
          end_date
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          serviceRequestId,
          request.phone_number,
          request.phone_brand,
          request.start_date,
          request.end_date
        ]
      );
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    console.log('Serial number request created successfully');
    
    return res.status(201).json({ 
      referenceNumber,
      serviceRequestId
    });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    
    console.error('Error creating serial number request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Add to server routes section
app.post('/api/security-services/stolen-phone-check', authenticateToken, async (req, res) => {
  try {
    const { formData, imeiRequests, serviceType, userId } = req.body;
    
    console.log('Received stolen phone check request:', { formData, imeiRequests });
    
    // Validate required fields
    if (!formData || !imeiRequests || !Array.isArray(imeiRequests)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    // Start a transaction
    await query('BEGIN');
    
    // Generate reference number
    const lastRequestResult = await query(
      `SELECT reference_number 
       FROM service_requests 
       WHERE reference_number LIKE 'SPC-${new Date().getFullYear()}%'
       ORDER BY created_at DESC 
       LIMIT 1`
    );
    
    let sequenceNumber = 1;
    if (lastRequestResult.rows.length > 0) {
      const lastRefNumber = lastRequestResult.rows[0].reference_number;
      const lastSequence = parseInt(lastRefNumber.split('-')[2]);
      sequenceNumber = isNaN(lastSequence) ? 1 : lastSequence + 1;
    }
    
    const referenceNumber = `SPC-${new Date().getFullYear()}-${sequenceNumber.toString().padStart(4, '0')}`;
    
    // Insert the main service request
    const serviceRequestResult = await query(
      `INSERT INTO service_requests (
        reference_number, 
        service_type, 
        full_names, 
        id_passport, 
        primary_contact, 
        secondary_contact, 
        details, 
        created_by, 
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [
        referenceNumber,
        serviceType || 'stolen_phone_check',
        formData.full_names,
        formData.id_passport,
        formData.primary_contact,
        formData.secondary_contact || null,
        formData.details || null,
        req.user.username,
        'new'
      ]
    );
    
    const serviceRequestId = serviceRequestResult.rows[0].id;
    
    // Insert stolen phone check request details
    for (const request of imeiRequests) {
      await query(
        `INSERT INTO stolen_phone_requests (
          service_request_id,
          imei_number
        ) VALUES ($1, $2)`,
        [
          serviceRequestId,
          request.imei_number
        ]
      );
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    console.log('Stolen phone check request created successfully');
    
    return res.status(201).json({ 
      referenceNumber,
      serviceRequestId
    });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    
    console.error('Error creating stolen phone check request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});


// Add to server routes section
app.post('/api/security-services/unblock-call-request', authenticateToken, async (req, res) => {
  try {
    const { formData, phoneNumberRequests, serviceType, userId } = req.body;
    
    console.log('Received unblock call request:', { formData, phoneNumberRequests });
    
    // Validate required fields
    if (!formData || !phoneNumberRequests || !Array.isArray(phoneNumberRequests)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    // Start a transaction
    await query('BEGIN');
    
    // Generate reference number
    const lastRequestResult = await query(
      `SELECT reference_number 
       FROM service_requests 
       WHERE reference_number LIKE 'UCR-${new Date().getFullYear()}%'
       ORDER BY created_at DESC 
       LIMIT 1`
    );
    
    let sequenceNumber = 1;
    if (lastRequestResult.rows.length > 0) {
      const lastRefNumber = lastRequestResult.rows[0].reference_number;
      const lastSequence = parseInt(lastRefNumber.split('-')[2]);
      sequenceNumber = isNaN(lastSequence) ? 1 : lastSequence + 1;
    }
    
    const referenceNumber = `UCR-${new Date().getFullYear()}-${sequenceNumber.toString().padStart(4, '0')}`;
    
    // Insert the main service request
    const serviceRequestResult = await query(
      `INSERT INTO service_requests (
        reference_number, 
        service_type, 
        full_names, 
        id_passport, 
        primary_contact, 
        secondary_contact, 
        details, 
        created_by, 
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [
        referenceNumber,
        serviceType || 'unblock_call_request',
        formData.full_names,
        formData.id_passport,
        formData.primary_contact,
        formData.secondary_contact || null,
        formData.details || null,
        req.user.username,
        'new'
      ]
    );
    
    const serviceRequestId = serviceRequestResult.rows[0].id;
    
    // Insert unblock call request details
    for (const request of phoneNumberRequests) {
      await query(
        `INSERT INTO unblock_call_requests (
          service_request_id,
          phone_number,
          date_blocked,
          reason_blocked
        ) VALUES ($1, $2, $3, $4)`,
        [
          serviceRequestId,
          request.number,
          request.date_blocked || null,
          request.reason_blocked || null
        ]
      );
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    console.log('Unblock call request created successfully');
    
    return res.status(201).json({ 
      referenceNumber,
      serviceRequestId
    });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    
    console.error('Error creating unblock call request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Add to server routes section
app.post('/api/security-services/other-request', authenticateToken, async (req, res) => {
  try {
    const { formData, otherRequests, serviceType, userId } = req.body;
    
    console.log('Received other request:', { formData, otherRequests });
    
    // Validate required fields
    if (!formData || !otherRequests || !Array.isArray(otherRequests)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    // Start a transaction
    await query('BEGIN');
    
    // Generate reference number
    const lastRequestResult = await query(
      `SELECT reference_number 
       FROM service_requests 
       WHERE reference_number LIKE 'OTR-${new Date().getFullYear()}%'
       ORDER BY created_at DESC 
       LIMIT 1`
    );
    
    let sequenceNumber = 1;
    if (lastRequestResult.rows.length > 0) {
      const lastRefNumber = lastRequestResult.rows[0].reference_number;
      const lastSequence = parseInt(lastRefNumber.split('-')[2]);
      sequenceNumber = isNaN(lastSequence) ? 1 : lastSequence + 1;
    }
    
    const referenceNumber = `OTR-${new Date().getFullYear()}-${sequenceNumber.toString().padStart(4, '0')}`;
    
    // Insert the main service request
    const serviceRequestResult = await query(
      `INSERT INTO service_requests (
        reference_number, 
        service_type, 
        full_names, 
        id_passport, 
        primary_contact, 
        secondary_contact, 
        details, 
        created_by, 
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [
        referenceNumber,
        serviceType || 'other_request',
        formData.full_names,
        formData.id_passport,
        formData.primary_contact,
        formData.secondary_contact || null,
        formData.details || null,
        req.user.username,
        'new'
      ]
    );
    
    const serviceRequestId = serviceRequestResult.rows [0].id;
    
    // Insert other request details
    for (const request of otherRequests) {
      await query(
        `INSERT INTO other_requests (
          service_request_id,
          reference_number,
          request_date
        ) VALUES ($1, $2, $3)`,
        [
          serviceRequestId,
          request.number,
          request.request_date
        ]
      );
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    console.log('Other request created successfully');
    
    return res.status(201).json({ 
      referenceNumber,
      serviceRequestId
    });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    
    console.error('Error creating other request:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Add these routes to your server.js file to support the task system

// TASK MANAGEMENT ROUTES
// Get available requests for a user
app.get('/tasks/available/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('Fetching available requests for user ID:', userId);
    
    // Get requests that are new and not created by this user
    const result = await query(
      `SELECT sr.*, 
        COALESCE(
          jsonb_agg(DISTINCT rc) FILTER (WHERE rc.id IS NOT NULL), 
          '[]'::jsonb
        ) AS request_comments,
        COALESCE(
          jsonb_agg(DISTINCT rh) FILTER (WHERE rh.id IS NOT NULL), 
          '[]'::jsonb
        ) AS request_history,
        json_build_object('id', creator.id, 'fullname', creator.full_name) AS created_by,
        CASE WHEN sr.assigned_to IS NOT NULL THEN 
          json_build_object('id', assignee.id, 'fullname', assignee.full_name)
        ELSE NULL END AS assigned_to
      FROM service_requests sr
      LEFT JOIN users creator ON sr.created_by = creator.id
      LEFT JOIN users assignee ON sr.assigned_to = assignee.id
      LEFT JOIN request_comments rc ON sr.id = rc.request_id
      LEFT JOIN request_history rh ON sr.id = rh.request_id
      WHERE sr.status = 'new' 
        AND sr.assigned_to IS NULL 
        AND sr.created_by != $1
      GROUP BY sr.id, creator.id, creator.full_name, assignee.id, assignee.full_name
      ORDER BY sr.created_at DESC`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching available requests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get assigned requests for a user
app.get('/tasks/assigned/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;
    
    console.log('Fetching assigned requests for user ID:', userId);
    
    let queryText = `
      SELECT sr.*, 
        COALESCE(
          jsonb_agg(DISTINCT rc) FILTER (WHERE rc.id IS NOT NULL), 
          '[]'::jsonb
        ) AS request_comments,
        COALESCE(
          jsonb_agg(DISTINCT rh) FILTER (WHERE rh.id IS NOT NULL), 
          '[]'::jsonb
        ) AS request_history,
        json_build_object('id', creator.id, 'fullname', creator.full_name) AS created_by,
        json_build_object('id', assignee.id, 'fullname', assignee.full_name) AS assigned_to
      FROM service_requests sr
      LEFT JOIN users creator ON sr.created_by = creator.id
      LEFT JOIN users assignee ON sr.assigned_to = assignee.id
      LEFT JOIN request_comments rc ON sr.id = rc.request_id
      LEFT JOIN request_history rh ON sr.id = rh.request_id
      WHERE sr.assigned_to = $1
    `;
    
    const queryParams = [userId];
    
    // Add status filter if provided
    if (status) {
      queryText += ` AND sr.status = $2`;
      queryParams.push(status);
    }
    
    queryText += `
      GROUP BY sr.id, creator.id, creator.full_name, assignee.id, assignee.full_name
      ORDER BY sr.updated_at DESC
    `;
    
    const result = await query(queryText, queryParams);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching assigned requests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get submitted requests for a user
app.get('/tasks/submitted/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('Fetching submitted requests for user ID:', userId);
    
    const result = await query(
      `SELECT sr.*, 
        COALESCE(
          jsonb_agg(DISTINCT rc) FILTER (WHERE rc.id IS NOT NULL), 
          '[]'::jsonb
        ) AS request_comments,
        COALESCE(
          jsonb_agg(DISTINCT rh) FILTER (WHERE rh.id IS NOT NULL), 
          '[]'::jsonb
        ) AS request_history,
        json_build_object('id', creator.id, 'fullname', creator.full_name) AS created_by,
        CASE WHEN sr.assigned_to IS NOT NULL THEN 
          json_build_object('id', assignee.id, 'fullname', assignee.full_name)
        ELSE NULL END AS assigned_to
      FROM service_requests sr
      LEFT JOIN users creator ON sr.created_by = creator.id
      LEFT JOIN users assignee ON sr.assigned_to = assignee.id
      LEFT JOIN request_comments rc ON sr.id = rc.request_id
      LEFT JOIN request_history rh ON sr.id = rh.request_id
      WHERE sr.created_by = $1 AND sr.status != 'sent_back'
      GROUP BY sr.id, creator.id, creator.full_name, assignee.id, assignee.full_name
      ORDER BY sr.created_at DESC`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching submitted requests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get sent back requests for a user
app.get('/tasks/sent-back/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('Fetching sent back requests for user ID:', userId);
    
    const result = await query(
      `SELECT sr.*, 
        COALESCE(
          jsonb_agg(DISTINCT rc) FILTER (WHERE rc.id IS NOT NULL), 
          '[]'::jsonb
        ) AS request_comments,
        COALESCE(
          jsonb_agg(DISTINCT rh) FILTER (WHERE rh.id IS NOT NULL), 
          '[]'::jsonb
        ) AS request_history,
        json_build_object('id', creator.id, 'fullname', creator.full_name) AS created_by,
        CASE WHEN sr.assigned_to IS NOT NULL THEN 
          json_build_object('id', assignee.id, 'fullname', assignee.full_name)
        ELSE NULL END AS assigned_to
      FROM service_requests sr
      LEFT JOIN users creator ON sr.created_by = creator.id
      LEFT JOIN users assignee ON sr.assigned_to = assignee.id
      LEFT JOIN request_comments rc ON sr.id = rc.request_id
      LEFT JOIN request_history rh ON sr.id = rh.request_id
      WHERE sr.created_by = $1 AND sr.status = 'sent_back'
      GROUP BY sr.id, creator.id, creator.full_name, assignee.id, assignee.full_name
      ORDER BY sr.updated_at DESC`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sent back requests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get new requests since a timestamp
app.get('/tasks/new-since/:timestamp', authenticateToken, async (req, res) => {
  try {
    const { timestamp } = req.params;
    const { userId } = req.query;
    
    console.log('Fetching new requests since:', timestamp);
    
    const result = await query(
      `SELECT sr.* 
      FROM service_requests sr
      WHERE sr.created_at > to_timestamp($1) 
      AND sr.status = 'new' 
      AND sr.assigned_to IS NULL
      ORDER BY sr.created_at DESC`,
      [timestamp / 1000] // Convert milliseconds to seconds for PostgreSQL timestamp
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching new requests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get status changes since a timestamp
app.get('/tasks/status-changes/:timestamp', authenticateToken, async (req, res) => {
  try {
    const { timestamp } = req.params;
    const { userId } = req.query;
    
    console.log('Fetching status changes since:', timestamp);
    
    const result = await query(
      `SELECT sr.id, sr.reference_number, sr.status, rh.created_at
      FROM request_history rh
      JOIN service_requests sr ON rh.request_id = sr.id
      WHERE rh.created_at > to_timestamp($1)
      AND rh.action = 'status_change'
      AND (sr.created_by = $2 OR sr.assigned_to = $2)
      ORDER BY rh.created_at DESC`,
      [timestamp / 1000, userId] // Convert milliseconds to seconds for PostgreSQL timestamp
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching status changes:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Claim a request
app.post('/tasks/claim/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { userId } = req.body;
    
    console.log('Claiming request ID:', requestId, 'for user ID:', userId);
    
    // Start a transaction
    await query('BEGIN');
    
    // Update the request
    const updateResult = await query(
      `UPDATE service_requests 
      SET assigned_to = $1, 
          status = 'in_progress', 
          updated_at = NOW() 
      WHERE id = $2
      RETURNING *`,
      [userId, requestId]
    );
    
    if (updateResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }
    
    // Get user details for the history entry
    const userResult = await query(
      'SELECT id, full_name FROM users WHERE id = $1',
      [userId]
    );
    
    const userName = userResult.rows[0]?.full_name || 'Unknown';
    
    // Add to history
    await query(
      `INSERT INTO request_history (request_id, performed_by, action, details, created_at)
      VALUES ($1, $2, 'status_change', $3, NOW())`,
      [requestId, userId, `Request claimed and status changed to in progress by ${userName}`]
    );
    
    // Commit the transaction
    await query('COMMIT');
    
    res.json({ success: true, request: updateResult.rows[0] });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    console.error('Error claiming request:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update request status
app.put('/tasks/status/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, userId, details, assigned_to } = req.body;
    
    console.log('Updating request ID:', requestId, 'to status:', status);
    
    // Start a transaction
    await query('BEGIN');
    
    // Build the update query based on whether assigned_to is provided
    let updateQuery = `
      UPDATE service_requests 
      SET status = $1, 
          updated_at = NOW()
    `;
    
    const queryParams = [status, requestId];
    
    // Add assigned_to to update if provided
    if (assigned_to !== undefined) {
      updateQuery += `, assigned_to = $3`;
      queryParams.push(assigned_to);
    }
    
    updateQuery += ` WHERE id = $2 RETURNING *`;
    
    const updateResult = await query(updateQuery, queryParams);
    
    if (updateResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }
    
    // Add to history
    await query(
      `INSERT INTO request_history (request_id, performed_by, action, details, created_at)
      VALUES ($1, $2, 'status_change', $3, NOW())`,
      [requestId, userId, details || `Status changed to ${status}`]
    );
    
    // Commit the transaction
    await query('COMMIT');
    
    res.json({ success: true, request: updateResult.rows[0] });
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    console.error('Error updating request status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a comment to a request
app.post('/tasks/comment/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { userId, comment, isSendBackReason } = req.body;
    
    console.log('Adding comment to request ID:', requestId);
    
    // Insert the comment
    const insertResult = await query(
      `INSERT INTO request_comments (request_id, created_by, comment, is_send_back_reason, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *`,
      [requestId, userId, comment, isSendBackReason || false]
    );
    
    // Add to history
    await query(
      `INSERT INTO request_history (request_id, performed_by, action, details, created_at)
      VALUES ($1, $2, 'comment_added', $3, NOW())`,
      [requestId, userId, isSendBackReason ? 'Send back reason added' : 'Comment added']
    );
    
    res.json({ success: true, comment: insertResult.rows[0] });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update request data
app.put('/tasks/data/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const updateData = req.body;
    
    console.log('Updating data for request ID:', requestId);
    
    // Start a transaction
    await query('BEGIN');
    
    // Build the update query dynamically based on the provided fields
    const allowedFields = [
      'full_names', 'primary_contact', 'secondary_contact', 
      'details', 'status', 'assigned_to', 'priority'
    ];
    
    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;
    
    // Add updated_at field
    updateFields.push(`updated_at = NOW()`);
    
    // Add other fields from the request body
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramIndex}`);
        queryParams.push(value);
        paramIndex++;
      }
    }
    
    // Add request ID as the last parameter
    queryParams.push(requestId);
    
    // Execute the update if there are fields to update
    if (updateFields.length > 0) {
      const updateQuery = `
        UPDATE service_requests 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const updateResult = await query(updateQuery, queryParams);
      
      if (updateResult.rows.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({ error: 'Request not found' });
      }
      
      // Add to history
      await query(
        `INSERT INTO request_history (request_id, performed_by, action, details, created_at)
        VALUES ($1, $2, 'edited', 'Request data updated', NOW())`,
        [requestId, updateData.updated_by || null]
      );
      
      // Commit the transaction
      await query('COMMIT');
      
      res.json({ success: true, request: updateResult.rows[0] });
    } else {
      await query('ROLLBACK');
      res.status(400).json({ error: 'No valid fields to update' });
    }
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    console.error('Error updating request data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// SERVICE-SPECIFIC DETAIL ROUTES

// Get Call History details
app.get('/tasks/details/call-history/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const result = await query(
      `SELECT ch.* 
       FROM call_history_requests ch
       WHERE ch.service_request_id = $1`,
      [requestId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching call history details:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get MoMo Transaction details
app.get('/tasks/details/momo-transaction/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const result = await query(
      `SELECT mt.* 
       FROM momo_transaction_requests mt
       WHERE mt.service_request_id = $1`,
      [requestId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching MoMo transaction details:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Money Refund details
app.get('/tasks/details/money-refund/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const result = await query(
      `SELECT mr.* 
       FROM money_refund_requests mr
       WHERE mr.service_request_id = $1`,
      [requestId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching money refund details:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Serial Number details
app.get('/tasks/details/serial-number/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const result = await query(
      `SELECT sn.* 
       FROM serial_number_requests sn
       WHERE sn.service_request_id = $1`,
      [requestId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching serial number details:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Stolen Phone details
app.get('/tasks/details/stolen-phone/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const result = await query(
      `SELECT sp.* 
       FROM stolen_phone_requests sp
       WHERE sp.service_request_id = $1`,
      [requestId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stolen phone details:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Unblock Call details
app.get('/tasks/details/unblock-call/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const result = await query(
      `SELECT uc.* 
       FROM unblock_call_requests uc
       WHERE uc.service_request_id = $1`,
      [requestId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching unblock call details:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Unblock MoMo details
app.get('/tasks/details/unblock-momo/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const result = await query(
      `SELECT um.* 
       FROM unblock_momo_requests um
       WHERE um.service_request_id = $1`,
      [requestId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching unblock MoMo details:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Backoffice Appointment details
app.get('/tasks/details/backoffice-appointment/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const result = await query(
      `SELECT ba.*, 
        json_build_object('id', u.id, 'fullname', u.full_name) AS backoffice_user
       FROM backoffice_appointments ba
       JOIN users u ON ba.backoffice_user_id = u.id
       WHERE ba.service_request_id = $1`,
      [requestId]
    );
    
    res.json(result.rows.length > 0 ? result.rows[0] : null);
  } catch (error) {
    console.error('Error fetching backoffice appointment details:', error);
    res.status(500).json({ error: 'Server error' });
  }
});