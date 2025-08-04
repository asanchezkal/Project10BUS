const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['school', 'driver', 'parent'],
    required: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: function() { return this.role === 'driver' || this.role === 'parent'; }
  },
  // Driver specific fields
  driver: {
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus'
    },
    licenseNumber: String,
    isActive: {
      type: Boolean,
      default: false
    }
  },
  // Parent specific fields
  parent: {
    children: [{
      name: String,
      grade: String,
      busStop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BusStop'
      }
    }],
    selectedStop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusStop'
    },
    pushToken: String,
    notificationPreferences: {
      etaNotifications: {
        type: Boolean,
        default: true
      },
      arrivalNotifications: {
        type: Boolean,
        default: true
      }
    }
  },
  // School specific fields
  school: {
    name: String,
    address: String,
    contactInfo: {
      phone: String,
      email: String
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema); 