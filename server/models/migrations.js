const { sequelize } = require('../config/database_pg');
const { User, Chat, ChatMember, Message } = require('./pg_index');

// Function to sync all models with the database
const syncDatabase = async (force = false) => {
  try {
    console.log('Starting database synchronization...');
    
    // Sync all models at once
    await sequelize.sync({ force });
    
    console.log('Database synchronization completed successfully!');
    return true;
  } catch (error) {
    console.error('Database synchronization failed:', error);
    throw error;
  }
};

// Function to drop all tables (for testing only)
const dropAllTables = async () => {
  try {
    console.log('Dropping all tables...');
    await sequelize.drop();
    console.log('All tables dropped successfully!');
    return true;
  } catch (error) {
    console.error('Failed to drop tables:', error);
    throw error;
  }
};

// Create seed data for testing (useful for development)
const seedTestData = async () => {
  try {
    console.log('Seeding test data...');
    
    // Create test users
    const user1 = await User.create({
      phoneNumber: '+12025550001',
      nickname: 'Alice',
      status: 'online',
      privacySettings: {
        lastSeen: 'contacts',
        profilePhoto: 'everyone',
        status: 'everyone',
        readReceipts: true,
        groups: 'everyone'
      }
    });
    
    const user2 = await User.create({
      phoneNumber: '+12025550002',
      nickname: 'Bob',
      status: 'offline',
      privacySettings: {
        lastSeen: 'contacts',
        profilePhoto: 'contacts',
        status: 'contacts',
        readReceipts: true,
        groups: 'contacts'
      }
    });
    
    // Create a direct chat between the two users
    const directChat = await Chat.create({
      type: 'direct',
      user1Id: user1.id,
      user2Id: user2.id,
      lastActivity: new Date()
    });
    
    // Create a few messages
    await Message.create({
      chatId: directChat.id,
      senderId: user1.id,
      type: 'text',
      content: 'Hello, Bob! How are you doing?'
    });
    
    await Message.create({
      chatId: directChat.id,
      senderId: user2.id,
      type: 'text',
      content: 'Hi Alice! I\'m doing great, thanks for asking!'
    });
    
    // Create a group chat
    const groupChat = await Chat.create({
      type: 'group',
      name: 'Test Group',
      description: 'A test group chat',
      settings: {
        onlyAdminsCanSend: false,
        onlyAdminsCanEditInfo: true,
        disappearingMessages: false,
        disappearingMessagesTime: 0,
      }
    });
    
    // Add members to the group
    await ChatMember.create({
      chatId: groupChat.id,
      userId: user1.id,
      role: 'admin',
      joinedAt: new Date()
    });
    
    await ChatMember.create({
      chatId: groupChat.id,
      userId: user2.id,
      role: 'member',
      joinedAt: new Date()
    });
    
    // Add a group message
    await Message.create({
      chatId: groupChat.id,
      senderId: user1.id,
      type: 'text',
      content: 'Welcome to the test group, everyone!'
    });
    
    console.log('Test data seeded successfully!');
    return true;
  } catch (error) {
    console.error('Failed to seed test data:', error);
    throw error;
  }
};

module.exports = {
  syncDatabase,
  dropAllTables,
  seedTestData
};