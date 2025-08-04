const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Bus = require('../models/Bus');
const Route = require('../models/Route');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get parent's profile
router.get('/profile', authenticateToken, requireRole(['parent']), async (req, res) => {
  try {
    const parent = await User.findById(req.user._id)
      .select('-password')
      .populate('parent.selectedStop')
      .populate('parent.children.busStop');

    res.json({ parent });
  } catch (error) {
    console.error('Get parent profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update parent's profile
router.put('/profile', authenticateToken, requireRole(['parent']), [
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

    const parent = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ parent });
  } catch (error) {
    console.error('Update parent profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get available bus stops
router.get('/available-stops', authenticateToken, requireRole(['parent']), async (req, res) => {
  try {
    const routes = await Route.find({ school: req.user.school, isActive: true })
      .select('name stops');

    const allStops = [];
    routes.forEach(route => {
      route.stops.forEach(stop => {
        allStops.push({
          id: stop._id,
          name: stop.name,
          address: stop.address,
          routeName: route.name,
          routeId: route._id
        });
      });
    });

    // Remove duplicates based on stop name and address
    const uniqueStops = allStops.filter((stop, index, self) =>
      index === self.findIndex(s => 
        s.name === stop.name && 
        JSON.stringify(s.address) === JSON.stringify(stop.address)
      )
    );

    res.json({ stops: uniqueStops });
  } catch (error) {
    console.error('Get available stops error:', error);
    res.status(500).json({ error: 'Failed to get available stops' });
  }
});

// Select bus stop
router.put('/select-stop', authenticateToken, requireRole(['parent']), [
  body('stopId').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { stopId } = req.body;

    // Verify the stop exists and belongs to the school
    const routes = await Route.find({ school: req.user.school, isActive: true });
    const stopExists = routes.some(route => 
      route.stops.some(stop => stop._id.toString() === stopId)
    );

    if (!stopExists) {
      return res.status(400).json({ error: 'Invalid stop selected' });
    }

    // Update parent's selected stop
    const parent = await User.findByIdAndUpdate(
      req.user._id,
      { 'parent.selectedStop': stopId },
      { new: true, runValidators: true }
    )
    .select('-password')
    .populate('parent.selectedStop');

    res.json({ 
      message: 'Stop selected successfully',
      parent 
    });
  } catch (error) {
    console.error('Select stop error:', error);
    res.status(500).json({ error: 'Failed to select stop' });
  }
});

// Get buses serving selected stop
router.get('/buses-for-stop', authenticateToken, requireRole(['parent']), async (req, res) => {
  try {
    const parent = await User.findById(req.user._id)
      .populate('parent.selectedStop');

    if (!parent.parent.selectedStop) {
      return res.status(400).json({ error: 'No stop selected' });
    }

    const stopId = parent.parent.selectedStop._id;

    // Find routes that contain this stop
    const routes = await Route.find({
      school: req.user.school,
      isActive: true,
      'stops._id': stopId
    }).populate('bus', 'busNumber driver');

    const buses = routes
      .filter(route => route.bus)
      .map(route => ({
        busId: route.bus._id,
        busNumber: route.bus.busNumber,
        routeName: route.name,
        routeId: route._id,
        driver: route.bus.driver
      }));

    res.json({ buses });
  } catch (error) {
    console.error('Get buses for stop error:', error);
    res.status(500).json({ error: 'Failed to get buses for stop' });
  }
});

// Update notification preferences
router.put('/notification-preferences', authenticateToken, requireRole(['parent']), [
  body('etaNotifications').optional().isBoolean(),
  body('arrivalNotifications').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { etaNotifications, arrivalNotifications } = req.body;
    const updates = {};

    if (etaNotifications !== undefined) {
      updates['parent.notificationPreferences.etaNotifications'] = etaNotifications;
    }
    if (arrivalNotifications !== undefined) {
      updates['parent.notificationPreferences.arrivalNotifications'] = arrivalNotifications;
    }

    const parent = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ 
      message: 'Notification preferences updated successfully',
      parent 
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// Add child
router.post('/children', authenticateToken, requireRole(['parent']), [
  body('name').notEmpty().trim(),
  body('grade').optional().trim(),
  body('busStopId').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, grade, busStopId } = req.body;

    const parent = await User.findById(req.user._id);
    parent.parent.children.push({
      name,
      grade,
      busStop: busStopId
    });

    await parent.save();

    const updatedParent = await parent.populate('parent.children.busStop');

    res.status(201).json({ 
      message: 'Child added successfully',
      parent: updatedParent 
    });
  } catch (error) {
    console.error('Add child error:', error);
    res.status(500).json({ error: 'Failed to add child' });
  }
});

// Update child
router.put('/children/:childId', authenticateToken, requireRole(['parent']), [
  body('name').optional().trim(),
  body('grade').optional().trim(),
  body('busStopId').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { childId } = req.params;
    const { name, grade, busStopId } = req.body;

    const parent = await User.findById(req.user._id);
    const childIndex = parent.parent.children.findIndex(
      child => child._id.toString() === childId
    );

    if (childIndex === -1) {
      return res.status(404).json({ error: 'Child not found' });
    }

    if (name) parent.parent.children[childIndex].name = name;
    if (grade) parent.parent.children[childIndex].grade = grade;
    if (busStopId) parent.parent.children[childIndex].busStop = busStopId;

    await parent.save();

    const updatedParent = await parent.populate('parent.children.busStop');

    res.json({ 
      message: 'Child updated successfully',
      parent: updatedParent 
    });
  } catch (error) {
    console.error('Update child error:', error);
    res.status(500).json({ error: 'Failed to update child' });
  }
});

// Remove child
router.delete('/children/:childId', authenticateToken, requireRole(['parent']), async (req, res) => {
  try {
    const { childId } = req.params;

    const parent = await User.findById(req.user._id);
    parent.parent.children = parent.parent.children.filter(
      child => child._id.toString() !== childId
    );

    await parent.save();

    res.json({ 
      message: 'Child removed successfully',
      parent 
    });
  } catch (error) {
    console.error('Remove child error:', error);
    res.status(500).json({ error: 'Failed to remove child' });
  }
});

module.exports = router; 