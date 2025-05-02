// server/middleware/error-handlers.js

/**
 * Set up global error handlers for the server
 */
export const setupErrorHandlers = () => {
    // Global error handlers
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Promise Rejection at:', reason);
    });
  
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
    });
  };
  
  /**
   * Express middleware for handling errors
   * @param {Error} err - Error object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  export const errorHandler = (err, req, res, next) => {
    console.error('Express error handler caught:', err);
    
    // Check for specific error types and handle accordingly
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    
    if (err.name === 'UnauthorizedError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    if (err.name === 'ForbiddenError') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Database errors
    if (err.code) {
      // PostgreSQL error codes
      switch (err.code) {
        case '23505': // unique_violation
          return res.status(409).json({ error: 'Resource already exists' });
        case '23503': // foreign_key_violation
          return res.status(409).json({ error: 'Related resource does not exist' });
        case '23502': // not_null_violation
          return res.status(400).json({ error: 'Missing required field' });
      }
    }
    
    // Default to 500 server error
    return res.status(500).json({ error: 'Server error' });
  };
  
  /**
   * Express middleware for handling 404 Not Found
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  export const notFoundHandler = (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  };