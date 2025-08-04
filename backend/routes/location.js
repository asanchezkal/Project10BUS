const express = require('express');
const { body, validationResult } = require('express-validator');
const Bus = require('../models/Bus');
const Route = require('../models/Route');
const LocationLog = require('../models/LocationLog');
const { authenticateToken, requireRole, requireBusDriver } = require('../middleware/auth');
const { calculateTrafficETA } = require('../services/trafficService');

const router = express.Router();

// Update bus location (driver only)
router.post('/update', authenticateToken, requireRole(['driver']), [
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('heading').optional().isFloat({ min: 0, max: 360 }),
  body('speed').optional().isFloat({ min: 0 }),
  body('accuracy').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { latitude, longitude, heading, speed, accuracy } = req.body;
    const driver = req.user;

    // Get driver's bus
    const bus = await Bus.findById(driver.driver.bus).populate('route');
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    // Update bus location
    await bus.updateLocation(latitude, longitude, heading, speed);

    // Log location
    const locationLog = new LocationLog({
      bus: bus._id,
      route: bus.route._id,
      location: {
        coordinates: [longitude, latitude]
      },
      heading,
      speed,
      direction: bus.currentDirection,
      currentStopIndex: bus.currentStopIndex,
      isOnRoute: bus.isOnRoute,
      metadata: {
        accuracy,
        batteryLevel: req.body.batteryLevel,
        signalStrength: req.body.signalStrength
      }
    });

    await locationLog.save();

    // Check if bus is near any stops (within 3 minutes)
    if (bus.route) {
      const stops = bus.route.stops;
      const currentStop = stops[bus.currentStopIndex];
      
      if (currentStop) {
        const distance = bus.route.calculateDistance(
          latitude, longitude,
          currentStop.location.coordinates[1],
          currentStop.location.coordinates[0]
        );

        // If within 500 meters of stop, consider it "near"
        if (distance <= 0.5) {
          // Emit arrival notification
          req.app.get('io').to(`bus_${bus._id}`).emit('bus_near_stop', {
            busId: bus._id,
            stopId: currentStop._id,
            stopName: currentStop.name,
            distance: Math.round(distance * 1000), // meters
            eta: Math.round(distance * 60 / (speed || 30)) // minutes
          });
        }
      }
    }

    // Emit location update to connected clients
    req.app.get('io').to(`bus_${bus._id}`).emit('location_update', {
      busId: bus._id,
      location: {
        latitude,
        longitude,
        heading,
        speed
      },
      timestamp: new Date(),
      currentStopIndex: bus.currentStopIndex,
      direction: bus.currentDirection
    });

    res.json({
      message: 'Location updated successfully',
      bus: {
        id: bus._id,
        currentLocation: bus.currentLocation,
        currentStopIndex: bus.currentStopIndex,
        direction: bus.currentDirection
      }
    });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Get bus location (for parents and school admins)
router.get('/bus/:busId', authenticateToken, requireRole(['parent', 'school']), async (req, res) => {
  try {
    const { busId } = req.params;
    
    const bus = await Bus.findById(busId)
      .populate('route')
      .populate('driver', 'firstName lastName');

    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    // Check if user has access to this bus
    if (req.user.role === 'parent' && req.user.school.toString() !== bus.school.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      bus: {
        id: bus._id,
        busNumber: bus.busNumber,
        currentLocation: bus.currentLocation,
        status: bus.status,
        direction: bus.currentDirection,
        currentStopIndex: bus.currentStopIndex,
        lastLocationUpdate: bus.lastLocationUpdate,
        driver: bus.driver,
        route: bus.route
      }
    });
  } catch (error) {
    console.error('Get bus location error:', error);
    res.status(500).json({ error: 'Failed to get bus location' });
  }
});

// Get ETA to specific stop
router.get('/eta/:busId/:stopIndex', authenticateToken, requireRole(['parent', 'school']), async (req, res) => {
  try {
    const { busId, stopIndex } = req.params;
    
    const bus = await Bus.findById(busId).populate('route');
    if (!bus || !bus.route) {
      return res.status(404).json({ error: 'Bus or route not found' });
    }

    // Check if user has access to this bus
    if (req.user.role === 'parent' && req.user.school.toString() !== bus.school.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const stopIndexNum = parseInt(stopIndex);
    if (stopIndexNum >= bus.route.stops.length) {
      return res.status(400).json({ error: 'Invalid stop index' });
    }

    const targetStop = bus.route.stops[stopIndexNum];
    const currentLocation = bus.currentLocation.coordinates;

    // Calculate basic ETA
    let eta = bus.route.calculateETA(
      currentLocation[1], // latitude
      currentLocation[0], // longitude
      stopIndexNum,
      bus.currentDirection
    );

    if (!eta) {
      return res.status(400).json({ error: 'Unable to calculate ETA' });
    }

    // Get traffic-aware ETA if available
    try {
      const trafficETA = await calculateTrafficETA(
        currentLocation[1],
        currentLocation[0],
        targetStop.location.coordinates[1],
        targetStop.location.coordinates[0]
      );
      
      if (trafficETA) {
        eta.etaMinutes = trafficETA.etaMinutes;
        eta.trafficDelay = trafficETA.trafficDelay;
      }
    } catch (trafficError) {
      console.warn('Traffic calculation failed, using basic ETA:', trafficError.message);
    }

    res.json({
      busId: bus._id,
      stopId: targetStop._id,
      stopName: targetStop.name,
      eta: eta.etaMinutes,
      distance: eta.distance,
      trafficDelay: eta.trafficDelay || 0,
      direction: bus.currentDirection,
      currentStopIndex: bus.currentStopIndex,
      lastUpdate: bus.lastLocationUpdate
    });
  } catch (error) {
    console.error('ETA calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate ETA' });
  }
});

// Get bus location history
router.get('/history/:busId', authenticateToken, requireRole(['school']), async (req, res) => {
  try {
    const { busId } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;

    const query = { bus: busId };
    
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const logs = await LocationLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('route', 'name');

    res.json({ logs });
  } catch (error) {
    console.error('Location history error:', error);
    res.status(500).json({ error: 'Failed to get location history' });
  }
});

// Get all active buses for school
router.get('/school/:schoolId/buses', authenticateToken, requireRole(['school']), async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    const buses = await Bus.find({ 
      school: schoolId, 
      status: { $in: ['active', 'inactive'] } 
    })
    .populate('route', 'name stops')
    .populate('driver', 'firstName lastName')
    .select('-__v');

    res.json({ buses });
  } catch (error) {
    console.error('Get school buses error:', error);
    res.status(500).json({ error: 'Failed to get buses' });
  }
});

// Start/stop bus tracking
router.post('/bus/:busId/tracking', authenticateToken, requireRole(['driver']), async (req, res) => {
  try {
    const { busId } = req.params;
    const { action } = req.body; // 'start' or 'stop'

    // Verify driver owns this bus
    if (req.user.driver.bus.toString() !== busId) {
      return res.status(403).json({ error: 'Access denied to this bus' });
    }

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    if (action === 'start') {
      bus.status = 'active';
      bus.isOnRoute = true;
    } else if (action === 'stop') {
      bus.status = 'inactive';
      bus.isOnRoute = false;
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    await bus.save();

    // Emit status update
    req.app.get('io').to(`bus_${busId}`).emit('bus_status_update', {
      busId: bus._id,
      status: bus.status,
      isOnRoute: bus.isOnRoute
    });

    res.json({
      message: `Bus tracking ${action}ed successfully`,
      bus: {
        id: bus._id,
        status: bus.status,
        isOnRoute: bus.isOnRoute
      }
    });
  } catch (error) {
    console.error('Bus tracking control error:', error);
    res.status(500).json({ error: 'Failed to control bus tracking' });
  }
});

module.exports = router; 