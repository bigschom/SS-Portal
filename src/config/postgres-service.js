import pg from 'pg';
import bcrypt from 'bcryptjs';

// Get environment variables from import.meta.env (Vite's approach)
const PG_HOST = import.meta.env.VITE_PG_HOST;
const PG_PORT = import.meta.env.VITE_PG_PORT;
const PG_DATABASE = import.meta.env.VITE_PG_DATABASE;
const PG_USER = import.meta.env.VITE_PG_USER;
const PG_PASSWORD = import.meta.env.VITE_PG_PASSWORD;
const PG_SSL = import.meta.env.VITE_PG_SSL === 'true';

// Create a PostgreSQL connection pool
const pool = new pg.Pool({
  host: PG_HOST,
  port: PG_PORT,
  database: PG_DATABASE,
  user: PG_USER,
  password: PG_PASSWORD,
  ssl: PG_SSL ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit process in browser environment
  // process.exit(-1);
});

// Helper to execute queries with proper error handling
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Validated roles constant
const VALID_ROLES = ['admin', 'superuser', 'standarduser', 'security_guard', 'user', 'user1', 'user2'];

// Export methods to interact with the PostgreSQL database
export default {
  // User authentication methods
  async getUserByUsername(username) {
    if (!username || typeof username !== 'string') {
      throw new Error('Invalid username format');
    }
    
    const result = await query(
      'SELECT * FROM users WHERE username = $1',
      [username.trim()]
    );
    return result.rows[0];
  },

  async getUserById(id) {
    if (!id) {
      throw new Error('Invalid user ID');
    }
    
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async updateUserLoginAttempts(id, attempts) {
    if (!id || attempts === undefined || attempts < 0) {
      throw new Error('Invalid parameters for updating login attempts');
    }
    
    const result = await query(
      'UPDATE users SET failed_login_attempts = $1 WHERE id = $2 RETURNING *',
      [attempts, id]
    );
    return result.rows[0];
  },

  async lockUserAccount(id) {
    if (!id) {
      throw new Error('Invalid user ID for account locking');
    }
    
    const result = await query(
      'UPDATE users SET failed_login_attempts = $1, is_active = false, locked_at = NOW() WHERE id = $2 RETURNING *',
      [5, id] // 5 is MAX_LOGIN_ATTEMPTS
    );
    return result.rows[0];
  },

  async unlockUserAccount(id, updatedById) {
    if (!id || !updatedById) {
      throw new Error('Invalid parameters for unlocking account');
    }
    
    const result = await query(
      'UPDATE users SET is_active = true, failed_login_attempts = 0, locked_at = NULL, updated_by = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [updatedById, id]
    );
    return result.rows[0];
  },

  async updateLastLogin(id) {
    if (!id) {
      throw new Error('Invalid user ID for updating login timestamp');
    }
    
    const result = await query(
      'UPDATE users SET failed_login_attempts = 0, last_login = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  },

  async updatePassword(id, hashedPassword) {
    if (!id || !hashedPassword) {
      throw new Error('Invalid parameters for password update');
    }
    
    const result = await query(
      'UPDATE users SET password = $1, temp_password = NULL, temp_password_expires = NULL, password_change_required = false, failed_login_attempts = 0, updated_at = NOW() WHERE id = $2 RETURNING *',
      [hashedPassword, id]
    );
    return result.rows[0];
  },
  
  async createTempPassword(id, tempPassword, expiresInHours = 24) {
    if (!id || !tempPassword) {
      throw new Error('Invalid parameters for creating temporary password');
    }
    
    // Hash the temporary password before storing
    const salt = await bcrypt.genSalt(10);
    const hashedTempPassword = await bcrypt.hash(tempPassword, salt);
    
    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    
    const result = await query(
      'UPDATE users SET temp_password = $1, temp_password_expires = $2, password_change_required = true, updated_at = NOW() WHERE id = $3 RETURNING *',
      [hashedTempPassword, expiresAt, id]
    );
    return result.rows[0];
  },

  // Storage methods
  async getFileUrl(bucket, filePath) {
    if (!bucket || !filePath) {
      throw new Error('Invalid bucket or file path');
    }
    return `/api/files/${bucket}/${filePath}`;
  },

  // User management methods
  async getAllActiveUsers() {
    const result = await query(
      'SELECT * FROM users WHERE is_active = true ORDER BY username',
      []
    );
    return result.rows;
  },

  validateRole(role) {
    return VALID_ROLES.includes(role);
  },
  
  getValidRoles() {
    return [...VALID_ROLES];
  }
};