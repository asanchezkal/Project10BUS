const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Middleware to check if user has required role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Middleware to check if user belongs to the same school
const requireSameSchool = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // School admins can access their own school data
    if (req.user.role === 'school') {
      return next();
    }

    const targetSchoolId = req.params.schoolId || req.body.schoolId;
    
    if (!targetSchoolId) {
      return res.status(400).json({ error: 'School ID required' });
    }

    if (req.user.school.toString() !== targetSchoolId.toString()) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Authorization error' });
  }
};

// Middleware to check if user is the bus driver
const requireBusDriver = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'driver') {
      return res.status(403).json({ error: 'Driver access required' });
    }

    const busId = req.params.busId || req.body.busId;
    
    if (!busId) {
      return res.status(400).json({ error: 'Bus ID required' });
    }

    if (req.user.driver.bus.toString() !== busId.toString()) {
      return res.status(403).json({ error: 'Access denied to this bus' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Authorization error' });
  }
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

module.exports = {
  authenticateToken,
  requireRole,
  requireSameSchool,
  requireBusDriver,
  generateToken
}; 