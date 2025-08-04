const express = require('express');
const { body, validationResult } = require('express-validator');
const Route = require('../models/Route');
const Bus = require('../models/Bus');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all routes for school
router.get('/', authenticateToken, requireRole(['school']), async (req, res) => {
  try {
    const routes = await Route.find({ school: req.user.school })
      .populate('bus', 'busNumber')
      .sort({ name: 1 });

    res.json({ routes });
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({ error: 'Failed to get routes' });
  }
});

// Get single route
router.get('/:id', authenticateToken, requireRole(['school', 'driver']), async (req, res) => {
  try {
    const route = await Route.findById(req.params.id)
      .populate('bus', 'busNumber driver')
      .populate('bus.driver', 'firstName lastName');

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Check if user has access to this route
    if (req.user.role === 'driver') {
      const bus = await Bus.findById(req.user.driver.bus);
      if (!bus || bus.route.toString() !== req.params.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    if (req.user.role === 'school' && route.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ route });
  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({ error: 'Failed to get route' });
  }
});

// Create new route
router.post('/', authenticateToken, requireRole(['school']), [
  body('name').notEmpty().trim(),
  body('stops').isArray({ min: 2 }),
  body('stops.*.name').notEmpty().trim(),
  body('stops.*.location.coordinates').isArray({ min: 2, max: 2 }),
  body('stops.*.location.coordinates.*').isFloat(),
  body('stops.*.estimatedTime').isInt({ min: 0 }),
  body('stops.*.stopOrder').isInt({ min: 0 }),
  body('direction').isIn(['to_school', 'from_school', 'both']),
  body('busId').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, stops, direction, busId } = req.body;

    // Check if route name already exists
    const existingRoute = await Route.findOne({ 
      name, 
      school: req.user.school 
    });

    if (existingRoute) {
      return res.status(400).json({ error: 'Route name already exists' });
    }

    // Validate stop order
    const stopOrders = stops.map(stop => stop.stopOrder);
    const uniqueOrders = new Set(stopOrders);
    if (uniqueOrders.size !== stops.length) {
      return res.status(400).json({ error: 'Stop orders must be unique' });
    }

    // Create route
    const route = new Route({
      name,
      stops,
      direction,
      school: req.user.school,
      bus: busId
    });

    await route.save();

    // If bus is assigned, update bus's route assignment
    if (busId) {
      await Bus.findByIdAndUpdate(busId, { route: route._id });
    }

    const populatedRoute = await route.populate('bus', 'busNumber');

    res.status(201).json({ route: populatedRoute });
  } catch (error) {
    console.error('Create route error:', error);
    res.status(500).json({ error: 'Failed to create route' });
  }
});

// Update route
router.put('/:id', authenticateToken, requireRole(['school']), [
  body('name').optional().trim(),
  body('stops').optional().isArray({ min: 2 }),
  body('direction').optional().isIn(['to_school', 'from_school', 'both']),
  body('busId').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, stops, direction, busId } = req.body;

    const route = await Route.findById(req.params.id);
    if (!route || route.school.toString() !== req.user.school.toString()) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Check if route name already exists (if changing)
    if (name && name !== route.name) {
      const existingRoute = await Route.findOne({ 
        name, 
        school: req.user.school,
        _id: { $ne: req.params.id }
      });

      if (existingRoute) {
        return res.status(400).json({ error: 'Route name already exists' });
      }
    }

    // Validate stops if provided
    if (stops) {
      const stopOrders = stops.map(stop => stop.stopOrder);
      const uniqueOrders = new Set(stopOrders);
      if (uniqueOrders.size !== stops.length) {
        return res.status(400).json({ error: 'Stop orders must be unique' });
      }
    }

    // Update route
    const updates = {};
    if (name) updates.name = name;
    if (stops) updates.stops = stops;
    if (direction) updates.direction = direction;

    // Handle bus assignment
    if (busId !== undefined) {
      // Remove old bus assignment
      if (route.bus) {
        await Bus.findByIdAndUpdate(route.bus, { route: null });
      }

      // Assign new bus
      if (busId) {
        updates.bus = busId;
        await Bus.findByIdAndUpdate(busId, { route: route._id });
      } else {
        updates.bus = null;
      }
    }

    const updatedRoute = await Route.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('bus', 'busNumber');

    res.json({ route: updatedRoute });
  } catch (error) {
    console.error('Update route error:', error);
    res.status(500).json({ error: 'Failed to update route' });
  }
});

// Delete route
router.delete('/:id', authenticateToken, requireRole(['school']), async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route || route.school.toString() !== req.user.school.toString()) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Remove bus assignment
    if (route.bus) {
      await Bus.findByIdAndUpdate(route.bus, { route: null });
    }

    await Route.findByIdAndDelete(req.params.id);

    res.json({ message: 'Route deleted successfully' });
  } catch (error) {
    console.error('Delete route error:', error);
    res.status(500).json({ error: 'Failed to delete route' });
  }
});

// Get available buses for route assignment
router.get('/available-buses', authenticateToken, requireRole(['school']), async (req, res) => {
  try {
    const buses = await Bus.find({
      school: req.user.school,
      isActive: true,
      route: { $exists: false }
    }).select('busNumber capacity');

    res.json({ buses });
  } catch (error) {
    console.error('Get available buses error:', error);
    res.status(500).json({ error: 'Failed to get available buses' });
  }
});

// Get route stops
router.get('/:id/stops', authenticateToken, requireRole(['school', 'driver']), async (req, res) => {
  try {
    const route = await Route.findById(req.params.id).select('stops');

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Check access permissions
    if (req.user.role === 'driver') {
      const bus = await Bus.findById(req.user.driver.bus);
      if (!bus || bus.route.toString() !== req.params.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    if (req.user.role === 'school' && route.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ stops: route.stops });
  } catch (error) {
    console.error('Get route stops error:', error);
    res.status(500).json({ error: 'Failed to get route stops' });
  }
});

module.exports = router; 