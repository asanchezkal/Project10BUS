const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  busNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route'
  },
  capacity: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    heading: {
      type: Number,
      min: 0,
      max: 360
    },
    speed: {
      type: Number,
      min: 0
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'offline'],
    default: 'inactive'
  },
  isOnRoute: {
    type: Boolean,
    default: false
  },
  currentDirection: {
    type: String,
    enum: ['to_school', 'from_school'],
    default: 'to_school'
  },
  currentStopIndex: {
    type: Number,
    default: 0
  },
  lastLocationUpdate: {
    type: Date
  },
  schedule: {
    morningStartTime: {
      type: String,
      default: '06:30'
    },
    afternoonStartTime: {
      type: String,
      default: '14:30'
    }
  },
  metadata: {
    make: String,
    model: String,
    year: Number,
    licensePlate: String,
    color: String
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
busSchema.index({ currentLocation: '2dsphere' });
busSchema.index({ school: 1, status: 1 });

// Virtual for current stop
busSchema.virtual('currentStop').get(function() {
  if (!this.route || !this.route.stops) return null;
  return this.route.stops[this.currentStopIndex];
});

// Method to update location
busSchema.methods.updateLocation = function(lat, lng, heading, speed) {
  this.currentLocation.coordinates = [lng, lat]; // GeoJSON format
  this.currentLocation.timestamp = new Date();
  this.currentLocation.heading = heading;
  this.currentLocation.speed = speed;
  this.lastLocationUpdate = new Date();
  return this.save();
};

// Method to get next stop
busSchema.methods.getNextStop = function() {
  if (!this.route || !this.route.stops) return null;
  
  const stops = this.route.stops;
  const nextIndex = (this.currentStopIndex + 1) % stops.length;
  return stops[nextIndex];
};

// Method to advance to next stop
busSchema.methods.advanceToNextStop = function() {
  if (!this.route || !this.route.stops) return;
  
  const stops = this.route.stops;
  this.currentStopIndex = (this.currentStopIndex + 1) % stops.length;
  
  // Check if we've completed a full route cycle
  if (this.currentStopIndex === 0) {
    this.currentDirection = this.currentDirection === 'to_school' ? 'from_school' : 'to_school';
  }
  
  return this.save();
};

module.exports = mongoose.model('Bus', busSchema); 