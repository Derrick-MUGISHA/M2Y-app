const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  nickname: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    trim: true,
  },
  profileImage: {
    type: String,
  },
  otp: {
    type: String,
  },
  otpExpiry: {
    type: Date,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  publicKey: {
    type: Object,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  blockedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  contacts: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Virtual for getting ID as a string
userSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    delete ret.otp;
    delete ret.otpExpiry;
    return ret;
  }
});

// Method to check if a user is blocked
userSchema.methods.isBlocked = function(userId) {
  return this.blockedUsers.includes(userId);
};

// Method to update last seen time
userSchema.methods.updateLastSeen = function() {
  this.lastSeen = new Date();
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
