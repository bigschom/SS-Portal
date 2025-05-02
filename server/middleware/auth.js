// server/middleware/auth.js
import jwt from 'jsonwebtoken';

/**
 * Authentication middleware to validate JWT tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

/**
 * Admin role check middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const requireAdmin = (req, res, next) => {
  // First authenticate the token
  authenticateToken(req, res, () => {
    // Then check if user has admin role
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Admin privileges required' });
    }
  });
};

/**
 * Middleware to check if user has specific roles
 * @param {string[]} roles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
export const requireRoles = (roles) => {
  return (req, res, next) => {
    // First authenticate the token
    authenticateToken(req, res, () => {
      // Then check if user has required role
      if (req.user && roles.includes(req.user.role)) {
        next();
      } else {
        res.status(403).json({ error: 'Insufficient privileges' });
      }
    });
  };
};

/**
 * Check if user is authenticated or handle appropriately
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    req.user = null;
    return next();
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};