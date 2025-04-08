const { sequelize } = require('../config/database_pg');
const User = require('./pg_user');
const Chat = require('./pg_chat');
const ChatMember = require('./pg_chat_member');
const Message = require('./pg_message');
const GroupAdminControls = require('./pg_group_admin_controls');
const MessageReaction = require('./pg_message_reaction');

// User - Chat (Direct) relationships
Chat.belongsTo(User, { as: 'User1', foreignKey: 'user1Id' });
Chat.belongsTo(User, { as: 'User2', foreignKey: 'user2Id' });
User.hasMany(Chat, { as: 'DirectChatsAsUser1', foreignKey: 'user1Id' });
User.hasMany(Chat, { as: 'DirectChatsAsUser2', foreignKey: 'user2Id' });

// User - ChatMember relationships
User.hasMany(ChatMember, { foreignKey: 'userId' });
ChatMember.belongsTo(User, { foreignKey: 'userId' });

// Chat - ChatMember relationships
Chat.hasMany(ChatMember, { foreignKey: 'chatId' });
ChatMember.belongsTo(Chat, { foreignKey: 'chatId' });

// User - Chat (Group) relationships through ChatMember
User.belongsToMany(Chat, { through: ChatMember, foreignKey: 'userId', otherKey: 'chatId' });
Chat.belongsToMany(User, { through: ChatMember, foreignKey: 'chatId', otherKey: 'userId' });

// Message relationships
Message.belongsTo(User, { as: 'Sender', foreignKey: 'senderId' });
User.hasMany(Message, { as: 'SentMessages', foreignKey: 'senderId' });

Message.belongsTo(Chat, { foreignKey: 'chatId' });
Chat.hasMany(Message, { foreignKey: 'chatId' });

// Reply relationship (self-referential)
Message.belongsTo(Message, { as: 'ReplyTo', foreignKey: 'replyToId' });
Message.hasMany(Message, { as: 'Replies', foreignKey: 'replyToId' });

// Chat - GroupAdminControls relationship (1:1)
Chat.hasOne(GroupAdminControls, { foreignKey: 'chatId' });
GroupAdminControls.belongsTo(Chat, { foreignKey: 'chatId' });

// Message - MessageReaction relationships
Message.hasMany(MessageReaction, { foreignKey: 'messageId' });
MessageReaction.belongsTo(Message, { foreignKey: 'messageId' });

// User - MessageReaction relationships
User.hasMany(MessageReaction, { foreignKey: 'userId' });
MessageReaction.belongsTo(User, { foreignKey: 'userId' });

// Export models
module.exports = {
  sequelize,
  User,
  Chat,
  ChatMember,
  Message,
  GroupAdminControls,
  MessageReaction
};