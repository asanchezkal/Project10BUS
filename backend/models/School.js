const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'USA'
    }
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
  contactInfo: {
    phone: String,
    email: String,
    website: String
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  settings: {
    schoolStartTime: {
      type: String,
      default: '08:00'
    },
    schoolEndTime: {
      type: String,
      default: '15:00'
    },
    busArrivalBuffer: {
      type: Number,
      default: 10, // minutes before school start time
      min: 5,
      max: 30
    },
    notificationBuffer: {
      type: Number,
      default: 10, // minutes before arrival
      min: 5,
      max: 30
    }
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
schoolSchema.index({ location: '2dsphere' });

// Virtual for full address
schoolSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}`;
});

module.exports = mongoose.model('School', schoolSchema); 