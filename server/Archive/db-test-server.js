import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;

const app = express();
const PORT = process.env.PORT || 5000;

// Create PostgreSQL connection pool
const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Test database connection
console.log('Testing database connection...');
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully. Current time:', res.rows[0].now);
  }
});

// Basic route for testing
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Start server
console.log('About to start server on port', PORT);
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
console.log('Called app.listen()');
