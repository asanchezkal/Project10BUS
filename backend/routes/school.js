const express = require('express');
const { body, validationResult } = require('express-validator');
const School = require('../models/School');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get school information
router.get('/', authenticateToken, requireRole(['school']), async (req, res) => {
  try {
    const school = await School.findById(req.user.school)
      .populate('admin', 'firstName lastName email');

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json({ school });
  } catch (error) {
    console.error('Get school error:', error);
    res.status(500).json({ error: 'Failed to get school information' });
  }
});

// Update school information
router.put('/', authenticateToken, requireRole(['school']), [
  body('name').optional().trim(),
  body('address').optional(),
  body('contactInfo').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, address, contactInfo } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (address) updates.address = address;
    if (contactInfo) updates.contactInfo = contactInfo;

    const school = await School.findByIdAndUpdate(
      req.user.school,
      updates,
      { new: true, runValidators: true }
    ).populate('admin', 'firstName lastName email');

    res.json({ school });
  } catch (error) {
    console.error('Update school error:', error);
    res.status(500).json({ error: 'Failed to update school information' });
  }
});

// Get school statistics
router.get('/stats', authenticateToken, requireRole(['school']), async (req, res) => {
  try {
    const schoolId = req.user.school;

    // Get counts
    const driverCount = await User.countDocuments({
      school: schoolId,
      role: 'driver',
      isActive: true
    });

    const parentCount = await User.countDocuments({
      school: schoolId,
      role: 'parent',
      isActive: true
    });

    const busCount = await require('../models/Bus').countDocuments({
      school: schoolId,
      isActive: true
    });

    const routeCount = await require('../models/Route').countDocuments({
      school: schoolId,
      isActive: true
    });

    res.json({
      stats: {
        drivers: driverCount,
        parents: parentCount,
        buses: busCount,
        routes: routeCount
      }
    });
  } catch (error) {
    console.error('Get school stats error:', error);
    res.status(500).json({ error: 'Failed to get school statistics' });
  }
});

module.exports = router; 