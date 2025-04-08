const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  chatId: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiverId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
  },
  type: {
    type: String,
    enum: ['text', 'image', 'document', 'audio', 'video'],
    default: 'text',
  },
  encryptedContent: {
    type: String,
  },
  mediaUrl: {
    type: String,
  },
  status: {
    type: String,
    enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
    default: 'sent',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  isAnonymous: {
    type: Boolean,
    default: false,
  },
  metadata: {
    type: Object,
    default: {},
  },
  readBy: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],
  deliveredTo: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true
});

// Virtual for getting ID as a string
messageSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
messageSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Index to help query expiring messages
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to check if a message is expired
messageSchema.methods.isExpired = function() {
  if (!this.expiresAt) {
    return false;
  }
  return new Date() > this.expiresAt;
};

// Method to mark message as read by a user
messageSchema.methods.markAsReadBy = function(userId) {
  if (!this.readBy.some(read => read.userId.toString() === userId.toString())) {
    this.readBy.push({ userId, timestamp: new Date() });
    this.status = 'read';
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to mark message as delivered to a user
messageSchema.methods.markAsDeliveredTo = function(userId) {
  if (!this.deliveredTo.some(delivered => delivered.userId.toString() === userId.toString())) {
    this.deliveredTo.push({ userId, timestamp: new Date() });
    if (this.status === 'sent') {
      this.status = 'delivered';
    }
    return this.save();
  }
  return Promise.resolve(this);
};

module.exports = mongoose.model('Message', messageSchema);