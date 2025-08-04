const mongoose = require('mongoose');

const busStopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  estimatedTime: {
    type: Number, // minutes from route start
    required: true
  },
  isSchoolStop: {
    type: Boolean,
    default: false
  },
  stopOrder: {
    type: Number,
    required: true
  },
  metadata: {
    description: String,
    landmarks: [String],
    notes: String
  }
});

const routeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  bus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus'
  },
  stops: [busStopSchema],
  direction: {
    type: String,
    enum: ['to_school', 'from_school', 'both'],
    default: 'both'
  },
  schedule: {
    morning: {
      startTime: {
        type: String,
        default: '06:30'
      },
      estimatedDuration: {
        type: Number, // minutes
        default: 60
      }
    },
    afternoon: {
      startTime: {
        type: String,
        default: '14:30'
      },
      estimatedDuration: {
        type: Number, // minutes
        default: 60
      }
    }
  },
  totalDistance: {
    type: Number, // kilometers
    default: 0
  },
  estimatedDuration: {
    type: Number, // minutes
    default: 60
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for geospatial queries
routeSchema.index({ 'stops.location': '2dsphere' });
routeSchema.index({ school: 1, isActive: 1 });

// Method to get stops in correct order based on direction
routeSchema.methods.getStopsForDirection = function(direction) {
  if (direction === 'from_school') {
    // Reverse the stops for return journey
    return [...this.stops].reverse();
  }
  return this.stops;
};

// Method to calculate distance between two points
routeSchema.methods.calculateDistance = function(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = this.deg2rad(lat2 - lat1);
  const dLon = this.deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

routeSchema.methods.deg2rad = function(deg) {
  return deg * (Math.PI/180);
};

// Method to find nearest stop to a location
routeSchema.methods.findNearestStop = function(lat, lng) {
  let nearestStop = null;
  let minDistance = Infinity;
  
  this.stops.forEach(stop => {
    const distance = this.calculateDistance(
      lat, lng, 
      stop.location.coordinates[1], 
      stop.location.coordinates[0]
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestStop = stop;
    }
  });
  
  return { stop: nearestStop, distance: minDistance };
};

// Method to get next stop from current location
routeSchema.methods.getNextStop = function(currentStopIndex, direction = 'to_school') {
  if (!this.stops || this.stops.length === 0) return null;
  
  const stops = direction === 'from_school' ? 
    [...this.stops].reverse() : 
    this.stops;
  
  const nextIndex = (currentStopIndex + 1) % stops.length;
  return {
    stop: stops[nextIndex],
    index: nextIndex
  };
};

// Method to calculate ETA to a specific stop
routeSchema.methods.calculateETA = function(currentLat, currentLng, targetStopIndex, direction = 'to_school') {
  if (!this.stops || this.stops.length === 0) return null;
  
  const stops = direction === 'from_school' ? 
    [...this.stops].reverse() : 
    this.stops;
  
  const targetStop = stops[targetStopIndex];
  if (!targetStop) return null;
  
  // Calculate distance to target stop
  const distance = this.calculateDistance(
    currentLat, currentLng,
    targetStop.location.coordinates[1],
    targetStop.location.coordinates[0]
  );
  
  // Assume average speed of 30 km/h in urban areas
  const averageSpeed = 30; // km/h
  const etaMinutes = Math.round((distance / averageSpeed) * 60);
  
  return {
    etaMinutes,
    distance: Math.round(distance * 100) / 100,
    targetStop
  };
};

module.exports = mongoose.model('Route', routeSchema); 