// src/config/db.js
import { Pool } from 'pg';

// Create PostgreSQL connection pool
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'securityservices',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  port: process.env.POSTGRES_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

// Wrapper around the pool for easier query execution
export const db = {
  /**
   * Execute a SQL query with parameters
   * @param {string} text - SQL query text
   * @param {Array} params - Query parameters
   * @returns {Promise} - Query result
   */
  query: (text, params) => pool.query(text, params),
  
  /**
   * Get a client from the pool for transactions
   * @returns {Promise} - Client connection
   */
  getClient: async () => {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;
    
    // Override client.query to log queries
    client.query = (...args) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('QUERY:', args[0]);
      }
      return query.apply(client, args);
    };
    
    // Override client.release to ensure we don't release twice
    client.release = () => {
      client.query = query;
      client.release = release;
      return release.apply(client);
    };
    
    return client;
  },
  
  /**
   * Execute queries within a transaction
   * @param {Function} callback - Function that receives a client and executes queries
   * @returns {Promise} - Result of the transaction
   */
  transaction: async (callback) => {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
};

// Create a function to check database connection
export const checkDbConnection = async () => {
  try {
    const res = await db.query('SELECT NOW()');
    console.log('Database connected:', res.rows[0].now);
    return true;
  } catch (err) {
    console.error('Database connection error:', err);
    return false;
  }
};

// Export pool directly if needed
export { pool };
