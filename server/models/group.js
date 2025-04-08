const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const groupMemberSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member',
  },
  nickname: {
    type: String,
    trim: true,
  },
  isVisible: {
    type: Boolean,
    default: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

const groupSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  image: {
    type: String,
  },
  members: [groupMemberSchema],
  isPrivate: {
    type: Boolean,
    default: true,
  },
  allowAnonymousMessages: {
    type: Boolean,
    default: false,
  },
  messageExpiryTime: {
    type: Number, // Time in seconds for messages to expire
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  chatId: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
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
groupSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
groupSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Method to check if a user is a member of the group
groupSchema.methods.isMember = function(userId) {
  return this.members.some(
    member => member.user.toString() === userId.toString()
  );
};

// Method to check if a user is an admin of the group
groupSchema.methods.isAdmin = function(userId) {
  return this.members.some(
    member => member.user.toString() === userId.toString() && member.role === 'admin'
  );
};

// Method to add a member to the group
groupSchema.methods.addMember = function(userId, options = {}) {
  if (this.isMember(userId)) {
    return Promise.resolve(this);
  }
  
  this.members.push({
    user: userId,
    role: options.isAdmin ? 'admin' : 'member',
    nickname: options.nickname,
    isVisible: options.isVisible !== undefined ? options.isVisible : true,
    joinedAt: new Date(),
  });
  
  this.updatedAt = new Date();
  return this.save();
};

// Method to remove a member from the group
groupSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(
    member => member.user.toString() !== userId.toString()
  );
  
  this.updatedAt = new Date();
  return this.save();
};

// Method to update a member's settings
groupSchema.methods.updateMember = function(userId, updates) {
  const member = this.members.find(
    member => member.user.toString() === userId.toString()
  );
  
  if (!member) {
    return Promise.resolve(this);
  }
  
  if (updates.nickname !== undefined) {
    member.nickname = updates.nickname;
  }
  
  if (updates.isVisible !== undefined) {
    member.isVisible = updates.isVisible;
  }
  
  if (updates.role !== undefined) {
    member.role = updates.role;
  }
  
  this.updatedAt = new Date();
  return this.save();
};

// Method to get a member's details
groupSchema.methods.getMember = function(userId) {
  return this.members.find(
    member => member.user.toString() === userId.toString()
  );
};

module.exports = mongoose.model('Group', groupSchema);