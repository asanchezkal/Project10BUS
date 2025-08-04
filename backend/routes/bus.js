const express = require('express');
const { body, validationResult } = require('express-validator');
const Bus = require('../models/Bus');
const User = require('../models/User');
const Route = require('../models/Route');
const { authenticateToken, requireRole, requireSameSchool } = require('../middleware/auth');

const router = express.Router();

// Get all buses for school
router.get('/', authenticateToken, requireRole(['school']), async (req, res) => {
  try {
    const buses = await Bus.find({ school: req.user.school })
      .populate('driver', 'firstName lastName email')
      .populate('route', 'name')
      .sort({ busNumber: 1 });

    res.json({ buses });
  } catch (error) {
    console.error('Get buses error:', error);
    res.status(500).json({ error: 'Failed to get buses' });
  }
});

// Get single bus
router.get('/:id', authenticateToken, requireRole(['school', 'driver']), async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id)
      .populate('driver', 'firstName lastName email')
      .populate('route', 'name stops');

    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    // Check if user has access to this bus
    if (req.user.role === 'driver' && req.user.driver.bus.toString() !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.user.role === 'school' && bus.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ bus });
  } catch (error) {
    console.error('Get bus error:', error);
    res.status(500).json({ error: 'Failed to get bus' });
  }
});

// Create new bus
router.post('/', authenticateToken, requireRole(['school']), [
  body('busNumber').notEmpty().trim(),
  body('capacity').isInt({ min: 1, max: 100 }),
  body('driverId').optional().isMongoId(),
  body('routeId').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { busNumber, capacity, driverId, routeId } = req.body;

    // Check if bus number already exists
    const existingBus = await Bus.findOne({ 
      busNumber, 
      school: req.user.school 
    });

    if (existingBus) {
      return res.status(400).json({ error: 'Bus number already exists' });
    }

    // Create bus
    const bus = new Bus({
      busNumber,
      capacity,
      school: req.user.school,
      driver: driverId,
      route: routeId
    });

    await bus.save();

    // If driver is assigned, update driver's bus assignment
    if (driverId) {
      await User.findByIdAndUpdate(driverId, {
        'driver.bus': bus._id,
        'driver.isActive': true
      });
    }

    const populatedBus = await bus.populate('driver', 'firstName lastName email');
    const populatedBusWithRoute = await populatedBus.populate('route', 'name');

    res.status(201).json({ bus: populatedBusWithRoute });
  } catch (error) {
    console.error('Create bus error:', error);
    res.status(500).json({ error: 'Failed to create bus' });
  }
});

// Update bus
router.put('/:id', authenticateToken, requireRole(['school']), [
  body('busNumber').optional().trim(),
  body('capacity').optional().isInt({ min: 1, max: 100 }),
  body('driverId').optional().isMongoId(),
  body('routeId').optional().isMongoId(),
  body('status').optional().isIn(['active', 'inactive', 'maintenance', 'offline'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { busNumber, capacity, driverId, routeId, status } = req.body;

    const bus = await Bus.findById(req.params.id);
    if (!bus || bus.school.toString() !== req.user.school.toString()) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    // Check if bus number already exists (if changing)
    if (busNumber && busNumber !== bus.busNumber) {
      const existingBus = await Bus.findOne({ 
        busNumber, 
        school: req.user.school,
        _id: { $ne: req.params.id }
      });

      if (existingBus) {
        return res.status(400).json({ error: 'Bus number already exists' });
      }
    }

    // Update bus
    const updates = {};
    if (busNumber) updates.busNumber = busNumber;
    if (capacity) updates.capacity = capacity;
    if (routeId) updates.route = routeId;
    if (status) updates.status = status;

    // Handle driver assignment
    if (driverId !== undefined) {
      // Remove old driver assignment
      if (bus.driver) {
        await User.findByIdAndUpdate(bus.driver, {
          'driver.bus': null,
          'driver.isActive': false
        });
      }

      // Assign new driver
      if (driverId) {
        updates.driver = driverId;
        await User.findByIdAndUpdate(driverId, {
          'driver.bus': bus._id,
          'driver.isActive': true
        });
      } else {
        updates.driver = null;
      }
    }

    const updatedBus = await Bus.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
    .populate('driver', 'firstName lastName email')
    .populate('route', 'name');

    res.json({ bus: updatedBus });
  } catch (error) {
    console.error('Update bus error:', error);
    res.status(500).json({ error: 'Failed to update bus' });
  }
});

// Delete bus
router.delete('/:id', authenticateToken, requireRole(['school']), async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus || bus.school.toString() !== req.user.school.toString()) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    // Remove driver assignment
    if (bus.driver) {
      await User.findByIdAndUpdate(bus.driver, {
        'driver.bus': null,
        'driver.isActive': false
      });
    }

    await Bus.findByIdAndDelete(req.params.id);

    res.json({ message: 'Bus deleted successfully' });
  } catch (error) {
    console.error('Delete bus error:', error);
    res.status(500).json({ error: 'Failed to delete bus' });
  }
});

// Get available drivers for bus assignment
router.get('/available-drivers', authenticateToken, requireRole(['school']), async (req, res) => {
  try {
    const drivers = await User.find({
      school: req.user.school,
      role: 'driver',
      isActive: true,
      $or: [
        { 'driver.bus': { $exists: false } },
        { 'driver.bus': null }
      ]
    }).select('firstName lastName email driver.licenseNumber');

    res.json({ drivers });
  } catch (error) {
    console.error('Get available drivers error:', error);
    res.status(500).json({ error: 'Failed to get available drivers' });
  }
});

// Get available routes for bus assignment
router.get('/available-routes', authenticateToken, requireRole(['school']), async (req, res) => {
  try {
    const routes = await Route.find({
      school: req.user.school,
      isActive: true,
      bus: { $exists: false }
    }).select('name direction');

    res.json({ routes });
  } catch (error) {
    console.error('Get available routes error:', error);
    res.status(500).json({ error: 'Failed to get available routes' });
  }
});

module.exports = router; 