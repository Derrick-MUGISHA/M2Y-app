const { Sequelize } = require('sequelize');
require('dotenv').config();

// Get database URL from environment variables
const databaseUrl = process.env.DATABASE_URL;

// Create Sequelize instance with connection pooling
const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10, // Maximum number of connections in the pool
    min: 0, // Minimum number of connections in the pool
    acquire: 30000, // Maximum time (ms) that pool will try to get connection before throwing error
    idle: 10000 // Maximum time (ms) that a connection can be idle before being released
  },
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false // Needed for some PostgreSQL providers
    } : false
  }
});

// Function to connect to the database
const connectToPG = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the PostgreSQL database:', error);
    throw error;
  }
};

// Function to close the database connection
const closePGConnection = async () => {
  try {
    await sequelize.close();
    console.log('PostgreSQL database connection closed successfully.');
    return true;
  } catch (error) {
    console.error('Error closing PostgreSQL database connection:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  connectToPG,
  closePGConnection
};