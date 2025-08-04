const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const School = require('../models/School');
const { authenticateToken, generateToken } = require('../middleware/auth');

const router = express.Router();

// Login route
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Populate school info if needed
    if (user.school) {
      await user.populate('school');
    }

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        school: user.school,
        driver: user.driver,
        parent: user.parent
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register school admin
router.post('/register/school', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('schoolName').notEmpty().trim(),
  body('schoolAddress').notEmpty().trim(),
  body('phone').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      email,
      password,
      firstName,
      lastName,
      schoolName,
      schoolAddress,
      phone
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create school
    const school = new School({
      name: schoolName,
      address: {
        street: schoolAddress
      },
      location: {
        coordinates: [0, 0] // Will be updated with geocoding
      }
    });

    await school.save();

    // Create school admin user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      phone,
      role: 'school',
      school: school._id,
      school: {
        name: schoolName,
        address: schoolAddress,
        contactInfo: {
          phone,
          email
        }
      }
    });

    await user.save();

    // Update school with admin reference
    school.admin = user._id;
    await school.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        school: school
      }
    });
  } catch (error) {
    console.error('School registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Register driver (by school admin)
router.post('/register/driver', authenticateToken, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('phone').optional().trim(),
  body('licenseNumber').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user is school admin
    if (req.user.role !== 'school') {
      return res.status(403).json({ error: 'Only school admins can register drivers' });
    }

    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      licenseNumber
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create driver user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      phone,
      role: 'driver',
      school: req.user.school,
      driver: {
        licenseNumber,
        isActive: false
      }
    });

    await user.save();

    res.status(201).json({
      message: 'Driver registered successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        driver: user.driver
      }
    });
  } catch (error) {
    console.error('Driver registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Register parent (by school admin)
router.post('/register/parent', authenticateToken, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('phone').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user is school admin
    if (req.user.role !== 'school') {
      return res.status(403).json({ error: 'Only school admins can register parents' });
    }

    const {
      email,
      password,
      firstName,
      lastName,
      phone
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create parent user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      phone,
      role: 'parent',
      school: req.user.school,
      parent: {
        children: [],
        notificationPreferences: {
          etaNotifications: true,
          arrivalNotifications: true
        }
      }
    });

    await user.save();

    res.status(201).json({
      message: 'Parent registered successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        parent: user.parent
      }
    });
  } catch (error) {
    console.error('Parent registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('school')
      .populate('driver.bus')
      .populate('parent.selectedStop')
      .populate('parent.children.busStop');

    res.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('firstName').optional().trim(),
  body('lastName').optional().trim(),
  body('phone').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, phone } = req.body;
    const updates = {};

    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (phone) updates.phone = phone;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ user });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/change-password', authenticateToken, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Logout (client-side token removal)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router; 