// server/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { query } from './db.js';
import { initializeTables } from './db-init.js';

// Import middleware
import { setupErrorHandlers } from './middleware/error-handlers.js';
import { setupCors } from './middleware/cors.js';

// Import routes
import authRoutes from './routes/auth-routes.js';
import userRoutes from './routes/user-routes.js';
import activityLogRoutes from './routes/activity-log-routes.js';
import backgroundRoutes from './routes/background-routes.js';
import stakeholderRoutes from './routes/stakeholder-routes.js';
import guardRoutes from './routes/guard-routes.js';
import securityRoutes from './routes/security-routes.js';
import queueRoutes from './routes/queue-routes.js';
import notificationRoutes from './routes/notification-routes.js';
import taskRoutes from './routes/task-routes.js';
import internshipRoutes from './routes/internship-routes.js';

// Import scheduled tasks
import { setupScheduledTasks } from './utils/scheduled-tasks.js';
import { setupLogger } from './utils/logger.js';

console.log('Starting server initialization...');

// Load environment variables
dotenv.config();

// Setup logging
setupLogger();

// Debug environment variables
console.log('Environment variables check:');
console.log('PORT:', process.env.PORT || 5000);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('PG_HOST:', process.env.PG_HOST);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'http://localhost:3000');

const app = express();
const PORT = process.env.PORT || 5000;

console.log('Express app created, configuring middleware...');

// Setup error handlers
setupErrorHandlers();

// Middleware
const isDevelopment = process.env.NODE_ENV !== 'production';

// Configure CORS
setupCors(app, isDevelopment);

// General middleware
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

// Setup scheduled tasks
setupScheduledTasks();

console.log('Route configuration starting...');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/activity-log', activityLogRoutes);
app.use('/api/background-checks', backgroundRoutes);
app.use('/api/stakeholder-requests', stakeholderRoutes);
app.use('/api/guard-shift-reports', guardRoutes);
app.use('/api/security-services', securityRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/internships', internshipRoutes);

// Add a simple test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
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
