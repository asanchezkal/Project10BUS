const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Bus = require('../models/Bus');
const Route = require('../models/Route');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get driver's assigned bus and route
router.get('/my-bus', authenticateToken, requireRole(['driver']), async (req, res) => {
  try {
    const driver = await User.findById(req.user._id)
      .populate({
        path: 'driver.bus',
        populate: {
          path: 'route',
          select: 'name stops direction'
        }
      });

    if (!driver.driver.bus) {
      return res.status(404).json({ error: 'No bus assigned' });
    }

    res.json({ 
      bus: driver.driver.bus,
      driver: {
        firstName: driver.firstName,
        lastName: driver.lastName,
        email: driver.email,
        licenseNumber: driver.driver.licenseNumber
      }
    });
  } catch (error) {
    console.error('Get driver bus error:', error);
    res.status(500).json({ error: 'Failed to get bus information' });
  }
});

// Get driver's current route
router.get('/my-route', authenticateToken, requireRole(['driver']), async (req, res) => {
  try {
    const bus = await Bus.findById(req.user.driver.bus)
      .populate('route', 'name stops direction');

    if (!bus || !bus.route) {
      return res.status(404).json({ error: 'No route assigned' });
    }

    res.json({ route: bus.route });
  } catch (error) {
    console.error('Get driver route error:', error);
    res.status(500).json({ error: 'Failed to get route information' });
  }
});

// Get next stop for driver
router.get('/next-stop', authenticateToken, requireRole(['driver']), async (req, res) => {
  try {
    const bus = await Bus.findById(req.user.driver.bus)
      .populate('route', 'stops');

    if (!bus || !bus.route) {
      return res.status(404).json({ error: 'No route assigned' });
    }

    const nextStop = bus.getNextStop();
    if (!nextStop) {
      return res.status(404).json({ error: 'No next stop available' });
    }

    res.json({ 
      nextStop,
      currentStopIndex: bus.currentStopIndex,
      direction: bus.currentDirection
    });
  } catch (error) {
    console.error('Get next stop error:', error);
    res.status(500).json({ error: 'Failed to get next stop' });
  }
});

// Update driver's bus status
router.put('/bus-status', authenticateToken, requireRole(['driver']), [
  body('status').isIn(['active', 'inactive', 'maintenance']),
  body('isOnRoute').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, isOnRoute } = req.body;

    const bus = await Bus.findById(req.user.driver.bus);
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    bus.status = status;
    bus.isOnRoute = isOnRoute;
    await bus.save();

    res.json({ 
      message: 'Bus status updated successfully',
      bus: {
        id: bus._id,
        status: bus.status,
        isOnRoute: bus.isOnRoute
      }
    });
  } catch (error) {
    console.error('Update bus status error:', error);
    res.status(500).json({ error: 'Failed to update bus status' });
  }
});

// Mark arrival at stop
router.post('/arrive-at-stop', authenticateToken, requireRole(['driver']), [
  body('stopIndex').isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { stopIndex } = req.body;

    const bus = await Bus.findById(req.user.driver.bus)
      .populate('route', 'stops');

    if (!bus || !bus.route) {
      return res.status(404).json({ error: 'No route assigned' });
    }

    if (stopIndex >= bus.route.stops.length) {
      return res.status(400).json({ error: 'Invalid stop index' });
    }

    // Update bus current stop
    bus.currentStopIndex = stopIndex;
    await bus.save();

    // Log arrival
    const ArrivalLog = require('../models/LocationLog').ArrivalLog;
    const arrivalLog = new ArrivalLog({
      bus: bus._id,
      route: bus.route._id,
      stop: bus.route.stops[stopIndex]._id,
      stopIndex,
      direction: bus.currentDirection,
      actualTime: new Date()
    });

    await arrivalLog.save();

    res.json({ 
      message: 'Arrival logged successfully',
      currentStopIndex: bus.currentStopIndex,
      stop: bus.route.stops[stopIndex]
    });
  } catch (error) {
    console.error('Log arrival error:', error);
    res.status(500).json({ error: 'Failed to log arrival' });
  }
});

// Get driver's profile
router.get('/profile', authenticateToken, requireRole(['driver']), async (req, res) => {
  try {
    const driver = await User.findById(req.user._id)
      .select('-password')
      .populate('driver.bus', 'busNumber');

    res.json({ driver });
  } catch (error) {
    console.error('Get driver profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update driver's profile
router.put('/profile', authenticateToken, requireRole(['driver']), [
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

    const driver = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ driver });
  } catch (error) {
    console.error('Update driver profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get driver's location history
router.get('/location-history', authenticateToken, requireRole(['driver']), async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;

    const query = { bus: req.user.driver.bus };

    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const LocationLog = require('../models/LocationLog');
    const logs = await LocationLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json({ logs });
  } catch (error) {
    console.error('Get location history error:', error);
    res.status(500).json({ error: 'Failed to get location history' });
  }
});

module.exports = router; 