const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/m2you';

/**
 * Connect to MongoDB database
 */
const connectToDatabase = async () => {
  try {
    // Using updated Mongoose 7.x connection options
    await mongoose.connect(MONGODB_URI);
    
    console.log('Connected to MongoDB');
    
    // Set up mongoose debug mode for development
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', true);
    }
    
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

/**
 * Close database connection
 */
const closeDatabaseConnection = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    throw error;
  }
};

module.exports = {
  connectToDatabase,
  closeDatabaseConnection,
  mongoose,
};