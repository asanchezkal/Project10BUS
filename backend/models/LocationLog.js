const mongoose = require('mongoose');

const locationLogSchema = new mongoose.Schema({
  bus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    required: true
  },
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true
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
  heading: {
    type: Number,
    min: 0,
    max: 360
  },
  speed: {
    type: Number,
    min: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  direction: {
    type: String,
    enum: ['to_school', 'from_school'],
    required: true
  },
  currentStopIndex: {
    type: Number,
    default: 0
  },
  isOnRoute: {
    type: Boolean,
    default: true
  },
  metadata: {
    batteryLevel: Number,
    signalStrength: Number,
    accuracy: Number
  }
}, {
  timestamps: true
});

// Index for geospatial queries and time-based queries
locationLogSchema.index({ location: '2dsphere' });
locationLogSchema.index({ bus: 1, timestamp: -1 });
locationLogSchema.index({ route: 1, timestamp: -1 });

module.exports = mongoose.model('LocationLog', locationLogSchema);

// Separate model for arrival logs
const arrivalLogSchema = new mongoose.Schema({
  bus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    required: true
  },
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true
  },
  stop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusStop',
    required: true
  },
  stopIndex: {
    type: Number,
    required: true
  },
  direction: {
    type: String,
    enum: ['to_school', 'from_school'],
    required: true
  },
  scheduledTime: {
    type: Date
  },
  actualTime: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['on_time', 'early', 'late', 'missed'],
    default: 'on_time'
  },
  delayMinutes: {
    type: Number,
    default: 0
  },
  passengers: {
    boarded: {
      type: Number,
      default: 0
    },
    disembarked: {
      type: Number,
      default: 0
    }
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for arrival logs
arrivalLogSchema.index({ bus: 1, actualTime: -1 });
arrivalLogSchema.index({ route: 1, actualTime: -1 });
arrivalLogSchema.index({ stop: 1, actualTime: -1 });

module.exports.ArrivalLog = mongoose.model('ArrivalLog', arrivalLogSchema); 