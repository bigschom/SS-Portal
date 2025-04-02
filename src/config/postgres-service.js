import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Create a PostgreSQL connection pool
const pool = new pg.Pool({
  host: process.env.VITE_PG_HOST,
  port: process.env.VITE_PG_PORT,
  database: process.env.VITE_PG_DATABASE,
  user: process.env.VITE_PG_USER,
  password: process.env.VITE_PG_PASSWORD,
  ssl: process.env.VITE_PG_SSL === 'true' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper to execute queries
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

// Export methods to interact with the PostgreSQL database
export default {
  // User authentication methods
  async getUserByUsername(username) {
    const result = await query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  },

  async getUserById(id) {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async updateUserLoginAttempts(id, attempts) {
    const result = await query(
      'UPDATE users SET failed_login_attempts = $1 WHERE id = $2 RETURNING *',
      [attempts, id]
    );
    return result.rows[0];
  },

  async lockUserAccount(id) {
    const result = await query(
      'UPDATE users SET failed_login_attempts = $1, is_active = false, locked_at = NOW() WHERE id = $2 RETURNING *',
      [5, id] // 5 is MAX_LOGIN_ATTEMPTS
    );
    return result.rows[0];
  },

  async unlockUserAccount(id, updatedById) {
    const result = await query(
      'UPDATE users SET is_active = true, failed_login_attempts = 0, locked_at = NULL, updated_by = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [updatedById, id]
    );
    return result.rows[0];
  },

  async updateLastLogin(id) {
    const result = await query(
      'UPDATE users SET failed_login_attempts = 0, last_login = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  },

  async updatePassword(id, hashedPassword) {
    const result = await query(
      'UPDATE users SET password = $1, temp_password = NULL, temp_password_expires = NULL, password_change_required = false, failed_login_attempts = 0, updated_at = NOW() WHERE id = $2 RETURNING *',
      [hashedPassword, id]
    );
    return result.rows[0];
  },

  // Storage methods (to replace Supabase storage)
  async getFileUrl(bucket, filePath) {
    // This would be replaced with your own file storage solution
    // For example, using a local file server or a service like AWS S3
    return `/api/files/${bucket}/${filePath}`;
  },

  // Other methods you may need
  async getAllActiveUsers() {
    const result = await query(
      'SELECT * FROM users WHERE is_active = true ORDER BY username',
      []
    );
    return result.rows;
  },

  async validateRole(role) {
    // Only allow specific roles based on your requirements
    const validRoles = ['admin', 'superuser', 'standarduser', 'security_guard', 'user', 'user1', 'user2'];
    return validRoles.includes(role);
  }
};