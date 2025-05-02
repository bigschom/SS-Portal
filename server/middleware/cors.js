// server/middleware/cors.js
import cors from 'cors';

// Keep track of the last time we logged a CORS request from each origin
const originLogTimestamps = new Map();
const LOG_THROTTLE_MS = 5000; // Only log once per 5 seconds per origin

export const setupCors = (app, isDevelopment) => {
  app.use(cors({
    origin: function(origin, callback) {
      // In development mode, accept all origins
      if (isDevelopment) {
        // Only log if we haven't logged this origin recently
        const now = Date.now();
        const lastLog = originLogTimestamps.get(origin) || 0;
        if (now - lastLog > LOG_THROTTLE_MS) {
          console.log('CORS: Accepting request from origin:', origin);
          originLogTimestamps.set(origin, now);
        }
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
};