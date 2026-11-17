const jwt = require('jsonwebtoken');

/**
 * Middleware to verify if the user is authenticated via Bearer token
 */
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'your_jwt_secret';

    const decoded = jwt.verify(token, secret);
    req.user = decoded; // Attaches payload (userId, role) to request
    next();
  } catch (error) {
    console.error('Token Verification Error:', error.message);
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token.' 
    });
  }
};

/**
 * Middleware to check if the authenticated user has the 'employer' role
 */
const verifyEmployer = (req, res, next) => {
  verifyToken(req, res, () => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ success: false, message: 'Access denied. Role not found.' });
    }

    const role = req.user.role.toLowerCase().trim();
    if (role === 'employer' || role === 'admin') {
      next();
    } else {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Employers only.' 
      });
    }
  });
};

/**
 * Middleware to check if the authenticated user is a job seeker
 */
const verifyJobSeeker = (req, res, next) => {
  verifyToken(req, res, () => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ success: false, message: 'Access denied. Role not found.' });
    }

    const role = req.user.role.toLowerCase().trim();
    if (role === 'jobseeker' || role === 'admin') {
      next();
    } else {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Job Seekers only.' 
      });
    }
  });
};

/**
 * Middleware to check if the authenticated user has the 'admin' role
 */
const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ success: false, message: 'Access denied. Role not found.' });
    }

    const role = req.user.role.toLowerCase().trim();
    if (role === 'admin') {
      next();
    } else {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admins only.' 
      });
    }
  });
};

module.exports = { 
  verifyToken, 
  verifyEmployer, 
  verifyJobSeeker, 
  verifyAdmin 
};