const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose'); // Keep for compatibility with existing code
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Import routes
const authRoutes = require('./routes/auth_routes');
const messageRoutes = require('./routes/message_routes');
const groupRoutes = require('./routes/group_routes');
const userRoutes = require('./routes/user_routes');
const mediaRoutes = require('./routes/media_routes');
const groupAdminRoutes = require('./routes/group_admin_routes');
const twoFactorAuthRoutes = require('./routes/two_factor_auth_routes');
const disappearingMessagesRoutes = require('./routes/disappearing_messages_routes');
const messageReactionRoutes = require('./routes/message_reaction_routes');

// Import services
const websocketService = require('./services/websocket_service');
const { connectToDatabase: connectToMongoDB } = require('./config/database');
const { connectToPG, sequelize } = require('./config/database_pg');

// Load environment variables
dotenv.config();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/users', userRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/group-admin', groupAdminRoutes);
app.use('/api/2fa', twoFactorAuthRoutes);
app.use('/api/disappearing-messages', disappearingMessagesRoutes);
app.use('/api/reactions', messageReactionRoutes);

// Health check route
app.get('/health', async (req, res) => {
  let pgStatus = 'unknown';
  let mongoStatus = 'not used';
  
  // Check PostgreSQL status
  try {
    // Ping the database with a quick query
    await sequelize.query('SELECT 1+1 as result');
    pgStatus = 'connected';
  } catch (error) {
    pgStatus = 'disconnected';
    console.error('PostgreSQL health check error:', error);
  }
  
  // Check MongoDB status (keeping for compatibility)
  const mongoDbStatus = mongoose.connection.readyState;
  const mongoDbStatusText = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    4: 'invalid credentials'
  }[mongoDbStatus] || 'unknown';
  
  res.status(200).json({ 
    status: 'ok',
    databases: {
      postgres: {
        status: pgStatus
      },
      mongodb: {
        status: mongoDbStatusText,
        readyState: mongoDbStatus
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Default route
app.get('/', (req, res) => {
  res.status(200).json({ message: 'M2You API Server' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
    },
  });
});

// Create HTTP server
const server = http.createServer(app);

// Set up WebSocket server
websocketService.setup(server);

// Connect to database and start server
const PORT = process.env.PORT || 5000;

// Start the server first, then connect to the database
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  
  // Connect to PostgreSQL after server starts
  connectToPG()
    .then(async () => {
      console.log('PostgreSQL database connected successfully');
      
      // Initialize the database with our models
      const { syncDatabase, seedTestData } = require('./models/migrations');
      
      try {
        // Set force to true only for initial development to recreate all tables
        // In production, this should be false
        const forceSync = process.env.NODE_ENV === 'development' && process.env.FORCE_DB_SYNC === 'true';
        await syncDatabase(forceSync);
        
        // Seed test data only in development and if requested
        if (process.env.NODE_ENV === 'development' && process.env.SEED_DB === 'true') {
          await seedTestData();
        }
      } catch (dbSetupError) {
        console.error('Database setup error:', dbSetupError);
      }
      
      // Optionally try to connect to MongoDB (if connection string is valid)
      // This is just for compatibility with existing code during transition
      if (process.env.MONGODB_URI) {
        connectToMongoDB()
          .then(() => {
            console.log('MongoDB connected successfully');
          })
          .catch((err) => {
            console.error('Failed to connect to MongoDB (optional):', err);
          });
      }
    })
    .catch((err) => {
      console.error('Failed to connect to PostgreSQL database:', err);
    });
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    console.log('Server closed');
    
    try {
      // Close PostgreSQL connection
      await sequelize.close();
      console.log('PostgreSQL connection closed');
      
      // Check if MongoDB is connected before trying to close
      if (mongoose.connection.readyState === 1) { // 1 = connected
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
      }
      
      process.exit(0);
    } catch (err) {
      console.error('Error closing database connections:', err);
      process.exit(1);
    }
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(async () => {
    console.log('Server closed');
    
    try {
      // Close PostgreSQL connection
      await sequelize.close();
      console.log('PostgreSQL connection closed');
      
      // Check if MongoDB is connected before trying to close
      if (mongoose.connection.readyState === 1) { // 1 = connected
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
      }
      
      process.exit(0);
    } catch (err) {
      console.error('Error closing database connections:', err);
      process.exit(1);
    }
  });
});
