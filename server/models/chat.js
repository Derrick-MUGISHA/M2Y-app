const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chatSchema = new Schema({
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  isGroup: {
    type: Boolean,
    default: false,
  },
  name: {
    type: String,
    trim: true,
  },
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  unreadCounts: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    count: {
      type: Number,
      default: 0,
    },
  }],
  isArchived: {
    type: Boolean,
    default: false,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true
});

// Virtual for getting ID as a string
chatSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
chatSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Index to improve chat lookup performance
chatSchema.index({ participants: 1 });
chatSchema.index({ isGroup: 1 });

// Static method to get or create a chat between two users
chatSchema.statics.getOrCreateOneToOneChat = async function(user1Id, user2Id) {
  // First, check if a one-to-one chat already exists
  const existingChat = await this.findOne({
    isGroup: false,
    participants: { $all: [user1Id, user2Id], $size: 2 }
  })
  .populate('participants', 'phoneNumber nickname profileImage status lastSeen isOnline publicKey')
  .populate('lastMessage');

  if (existingChat) {
    return existingChat;
  }

  // Create a new chat
  const newChat = new this({
    participants: [user1Id, user2Id],
    isGroup: false,
    createdBy: user1Id,
    unreadCounts: [
      { userId: user1Id, count: 0 },
      { userId: user2Id, count: 0 }
    ]
  });

  await newChat.save();
  
  // Populate the participants
  await newChat.populate('participants', 'phoneNumber nickname profileImage status lastSeen isOnline publicKey').execPopulate();
  
  return newChat;
};

// Method to get unread count for a user
chatSchema.methods.getUnreadCountForUser = function(userId) {
  const userUnreadCount = this.unreadCounts.find(
    unread => unread.userId.toString() === userId.toString()
  );
  
  return userUnreadCount ? userUnreadCount.count : 0;
};

// Method to reset unread count for a user
chatSchema.methods.resetUnreadCountForUser = function(userId) {
  const userUnreadCount = this.unreadCounts.find(
    unread => unread.userId.toString() === userId.toString()
  );
  
  if (userUnreadCount) {
    userUnreadCount.count = 0;
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to increment unread count for a user
chatSchema.methods.incrementUnreadCountForUser = function(userId) {
  const userUnreadCount = this.unreadCounts.find(
    unread => unread.userId.toString() === userId.toString()
  );
  
  if (userUnreadCount) {
    userUnreadCount.count += 1;
  } else {
    this.unreadCounts.push({ userId, count: 1 });
  }
  
  return this.save();
};

// Method to update last message
chatSchema.methods.updateLastMessage = function(messageId) {
  this.lastMessage = messageId;
  this.updatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Chat', chatSchema);