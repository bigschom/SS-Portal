// server/utils/logger.js

/**
 * Configure and set up logging for the server
 * This is a simple logger that enhances the built-in console methods
 */
export const setupLogger = () => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleInfo = console.info;
    
    // Add timestamp and formatting to console.log
    console.log = function(...args) {
      const timestamp = new Date().toISOString();
      originalConsoleLog.apply(console, [`[${timestamp}] [INFO]`, ...args]);
    };
    
    // Add timestamp and formatting to console.error
    console.error = function(...args) {
      const timestamp = new Date().toISOString();
      originalConsoleError.apply(console, [`[${timestamp}] [ERROR]`, ...args]);
    };
    
    // Add timestamp and formatting to console.warn
    console.warn = function(...args) {
      const timestamp = new Date().toISOString();
      originalConsoleWarn.apply(console, [`[${timestamp}] [WARN]`, ...args]);
    };
    
    // Add timestamp and formatting to console.info
    console.info = function(...args) {
      const timestamp = new Date().toISOString();
      originalConsoleInfo.apply(console, [`[${timestamp}] [INFO]`, ...args]);
    };
    
    // Log uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err);
    });
    
    // Log unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
    
    console.log('Logger setup completed');
  };
  
  /**
   * Log a database query (useful for debugging)
   * @param {string} query - The SQL query
   * @param {Array} params - The query parameters
   */
  export const logQuery = (query, params) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Executing query: ${query}`);
      console.log(`With parameters: ${JSON.stringify(params)}`);
    }
  };
  
  /**
   * Log a failed database query
   * @param {string} query - The SQL query
   * @param {Array} params - The query parameters
   * @param {Error} error - The error that occurred
   */
  export const logQueryError = (query, params, error) => {
    console.error(`Database query error: ${error.message}`);
    console.error(`Query: ${query}`);
    console.error(`Parameters: ${JSON.stringify(params)}`);
    
    if (error.stack) {
      console.error(`Stack: ${error.stack}`);
    }
  };
  
  export default {
    setupLogger,
    logQuery,
    logQueryError
  };