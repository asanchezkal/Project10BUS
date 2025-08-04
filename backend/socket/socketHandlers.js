const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Bus = require('../models/Bus');
const { sendPushNotification } = require('../services/notificationService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const initializeSocketHandlers = (io) => {
  // Store connected users
  const connectedUsers = new Map();
  const busRooms = new Map();

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user || !user.isActive) {
        return next(new Error('Invalid user'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.email} (${socket.user.role})`);
    
    // Store connected user
    connectedUsers.set(socket.user._id.toString(), {
      socketId: socket.id,
      user: socket.user,
      role: socket.user.role
    });

    // Join role-specific room
    socket.join(`role_${socket.user.role}`);
    
    // Join school-specific room
    if (socket.user.school) {
      socket.join(`school_${socket.user.school}`);
    }

    // Handle driver-specific connections
    if (socket.user.role === 'driver' && socket.user.driver.bus) {
      const busId = socket.user.driver.bus.toString();
      socket.join(`bus_${busId}`);
      busRooms.set(busId, socket.id);
      
      console.log(`Driver ${socket.user.email} joined bus room: ${busId}`);
    }

    // Handle parent-specific connections
    if (socket.user.role === 'parent') {
      // Join rooms for buses that serve their selected stop
      if (socket.user.parent.selectedStop) {
        // This would need to be implemented based on route logic
        // For now, join all buses in their school
        socket.join(`school_${socket.user.school}_buses`);
      }
    }

    // Handle location updates from drivers
    socket.on('location_update', async (data) => {
      try {
        if (socket.user.role !== 'driver') {
          return;
        }

        const { latitude, longitude, heading, speed, accuracy } = data;
        const busId = socket.user.driver.bus;

        if (!busId) {
          return;
        }

        // Update bus location in database
        const bus = await Bus.findById(busId).populate('route');
        if (!bus) {
          return;
        }

        await bus.updateLocation(latitude, longitude, heading, speed);

        // Broadcast to all users tracking this bus
        socket.to(`bus_${busId}`).emit('location_update', {
          busId: bus._id,
          location: { latitude, longitude, heading, speed },
          timestamp: new Date(),
          currentStopIndex: bus.currentStopIndex,
          direction: bus.currentDirection
        });

        // Check if bus is approaching stops and notify parents
        if (bus.route && bus.route.stops) {
          const stops = bus.route.stops;
          const currentStop = stops[bus.currentStopIndex];
          
          if (currentStop) {
            const distance = bus.route.calculateDistance(
              latitude, longitude,
              currentStop.location.coordinates[1],
              currentStop.location.coordinates[0]
            );

            // If within 500 meters, notify parents
            if (distance <= 0.5) {
              const etaMinutes = Math.round(distance * 60 / (speed || 30));
              
              // Notify parents about approaching stop
              socket.to(`bus_${busId}`).emit('bus_approaching_stop', {
                busId: bus._id,
                stopId: currentStop._id,
                stopName: currentStop.name,
                etaMinutes,
                distance: Math.round(distance * 1000)
              });

              // Send push notifications to parents
              await sendApproachingStopNotifications(bus, currentStop, etaMinutes);
            }
          }
        }

      } catch (error) {
        console.error('Location update error:', error);
      }
    });

    // Handle bus status updates
    socket.on('bus_status_update', async (data) => {
      try {
        if (socket.user.role !== 'driver') {
          return;
        }

        const { status, isOnRoute } = data;
        const busId = socket.user.driver.bus;

        if (!busId) {
          return;
        }

        const bus = await Bus.findById(busId);
        if (!bus) {
          return;
        }

        bus.status = status;
        bus.isOnRoute = isOnRoute;
        await bus.save();

        // Broadcast status update
        socket.to(`bus_${busId}`).emit('bus_status_update', {
          busId: bus._id,
          status: bus.status,
          isOnRoute: bus.isOnRoute,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Bus status update error:', error);
      }
    });

    // Handle next stop requests from drivers
    socket.on('get_next_stop', async () => {
      try {
        if (socket.user.role !== 'driver') {
          return;
        }

        const busId = socket.user.driver.bus;
        if (!busId) {
          return;
        }

        const bus = await Bus.findById(busId).populate('route');
        if (!bus || !bus.route) {
          socket.emit('next_stop', { error: 'No route assigned' });
          return;
        }

        const nextStop = bus.getNextStop();
        if (nextStop) {
          socket.emit('next_stop', {
            stop: nextStop,
            currentIndex: bus.currentStopIndex,
            direction: bus.currentDirection
          });
        } else {
          socket.emit('next_stop', { error: 'No next stop available' });
        }

      } catch (error) {
        console.error('Get next stop error:', error);
        socket.emit('next_stop', { error: 'Failed to get next stop' });
      }
    });

    // Handle ETA requests from parents
    socket.on('request_eta', async (data) => {
      try {
        if (socket.user.role !== 'parent') {
          return;
        }

        const { busId, stopIndex } = data;
        
        // Verify parent has access to this bus
        const bus = await Bus.findById(busId);
        if (!bus || bus.school.toString() !== socket.user.school.toString()) {
          socket.emit('eta_response', { error: 'Access denied' });
          return;
        }

        // Calculate ETA
        const eta = await calculateETAForParent(bus, stopIndex);
        socket.emit('eta_response', eta);

      } catch (error) {
        console.error('ETA request error:', error);
        socket.emit('eta_response', { error: 'Failed to calculate ETA' });
      }
    });

    // Handle parent stop selection
    socket.on('select_stop', async (data) => {
      try {
        if (socket.user.role !== 'parent') {
          return;
        }

        const { stopId } = data;
        
        // Update parent's selected stop
        await User.findByIdAndUpdate(socket.user._id, {
          'parent.selectedStop': stopId
        });

        // Join bus room for this stop
        // This would need route logic to determine which bus serves this stop
        socket.emit('stop_selected', { stopId });

      } catch (error) {
        console.error('Stop selection error:', error);
        socket.emit('stop_selected', { error: 'Failed to select stop' });
      }
    });

    // Handle driver arrival at stop
    socket.on('arrived_at_stop', async (data) => {
      try {
        if (socket.user.role !== 'driver') {
          return;
        }

        const { stopIndex } = data;
        const busId = socket.user.driver.bus;

        if (!busId) {
          return;
        }

        const bus = await Bus.findById(busId);
        if (!bus) {
          return;
        }

        // Update bus current stop
        bus.currentStopIndex = stopIndex;
        await bus.save();

        // Notify parents about arrival
        socket.to(`bus_${busId}`).emit('bus_arrived_at_stop', {
          busId: bus._id,
          stopIndex,
          timestamp: new Date()
        });

        // Send push notifications
        await sendArrivalNotifications(bus, stopIndex);

      } catch (error) {
        console.error('Arrival notification error:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.email}`);
      
      // Remove from connected users
      connectedUsers.delete(socket.user._id.toString());
      
      // Remove from bus rooms if driver
      if (socket.user.role === 'driver' && socket.user.driver.bus) {
        busRooms.delete(socket.user.driver.bus.toString());
      }
    });
  });

  // Helper function to send approaching stop notifications
  const sendApproachingStopNotifications = async (bus, stop, etaMinutes) => {
    try {
      // Find parents who have this stop selected
      const parents = await User.find({
        role: 'parent',
        school: bus.school,
        'parent.selectedStop': stop._id,
        'parent.notificationPreferences.etaNotifications': true
      });

      for (const parent of parents) {
        if (parent.parent.pushToken) {
          await sendPushNotification(parent.parent.pushToken, {
            title: 'Bus Approaching',
            body: `Bus ${bus.busNumber} will arrive at ${stop.name} in ${etaMinutes} minutes`,
            data: {
              type: 'bus_approaching',
              busId: bus._id.toString(),
              stopId: stop._id.toString(),
              etaMinutes
            }
          });
        }
      }
    } catch (error) {
      console.error('Error sending approaching stop notifications:', error);
    }
  };

  // Helper function to send arrival notifications
  const sendArrivalNotifications = async (bus, stopIndex) => {
    try {
      const route = await bus.populate('route');
      if (!route.route || !route.route.stops[stopIndex]) {
        return;
      }

      const stop = route.route.stops[stopIndex];
      
      // Find parents who have this stop selected
      const parents = await User.find({
        role: 'parent',
        school: bus.school,
        'parent.selectedStop': stop._id,
        'parent.notificationPreferences.arrivalNotifications': true
      });

      for (const parent of parents) {
        if (parent.parent.pushToken) {
          await sendPushNotification(parent.parent.pushToken, {
            title: 'Bus Arrived',
            body: `Bus ${bus.busNumber} has arrived at ${stop.name}`,
            data: {
              type: 'bus_arrived',
              busId: bus._id.toString(),
              stopId: stop._id.toString()
            }
          });
        }
      }
    } catch (error) {
      console.error('Error sending arrival notifications:', error);
    }
  };

  // Helper function to calculate ETA for parents
  const calculateETAForParent = async (bus, stopIndex) => {
    try {
      const populatedBus = await bus.populate('route');
      if (!populatedBus.route || !populatedBus.route.stops[stopIndex]) {
        return { error: 'Invalid stop' };
      }

      const stop = populatedBus.route.stops[stopIndex];
      const currentLocation = populatedBus.currentLocation.coordinates;

      const eta = populatedBus.route.calculateETA(
        currentLocation[1],
        currentLocation[0],
        stopIndex,
        populatedBus.currentDirection
      );

      return {
        busId: bus._id,
        stopId: stop._id,
        stopName: stop.name,
        eta: eta.etaMinutes,
        distance: eta.distance,
        direction: populatedBus.currentDirection
      };
    } catch (error) {
      console.error('ETA calculation error:', error);
      return { error: 'Failed to calculate ETA' };
    }
  };

  // Make io available to routes
  io.app = io;
};

module.exports = { initializeSocketHandlers }; 