const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Initialize global variables
let wss = null;
let clients = new Map(); // Map to store connected clients: userId -> WebSocket

/**
 * Set up the WebSocket server
 * @param {http.Server} server - HTTP server instance
 */
function setup(server) {
  // Initialize WebSocket server
  wss = new WebSocket.Server({
    server,
    path: '/ws'
  });

  // Connection handler
  wss.on('connection', (ws) => {
    // Generate a temporary ID for the connection
    const clientId = uuidv4();
    
    // Store the connection temporarily
    ws.id = clientId;
    ws.isAlive = true;
    ws.authenticated = false;
    ws.userId = null;
    
    console.log(`WebSocket client connected: ${clientId}`);

    // Set up ping to keep connection alive
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Handle incoming messages
    ws.on('message', (messageBuffer) => {
      try {
        const message = JSON.parse(messageBuffer.toString());
        handleMessage(ws, message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        sendErrorToClient(ws, 'Invalid message format');
      }
    });

    // Handle connection close
    ws.on('close', () => {
      console.log(`WebSocket client disconnected: ${clientId}`);
      
      // Remove from authenticated clients if needed
      if (ws.authenticated && ws.userId) {
        clients.delete(ws.userId);
        
        // Notify other users about status change
        broadcastStatusUpdate(ws.userId, 'offline');
      }
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
    });

    // Send welcome message to client
    sendToClient(ws, {
      type: 'connection',
      status: 'connected',
      clientId
    });
  });

  // Set up interval to check for inactive connections
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        console.log(`Terminating inactive connection: ${ws.id}`);
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // Check every 30 seconds

  // Clean up interval on server close
  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  return wss;
}

/**
 * Handle incoming WebSocket messages
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} message - Parsed message object
 */
function handleMessage(ws, message) {
  switch (message.type) {
    case 'auth':
      // Authenticate the connection
      handleAuth(ws, message);
      break;
    
    case 'message':
      // Handle chat message
      if (!ws.authenticated) {
        return sendErrorToClient(ws, 'Authentication required');
      }
      handleChatMessage(ws, message);
      break;
    
    case 'typing':
      // Handle typing indicator
      if (!ws.authenticated) {
        return sendErrorToClient(ws, 'Authentication required');
      }
      handleTypingIndicator(ws, message);
      break;
    
    case 'status':
      // Handle status update
      if (!ws.authenticated) {
        return sendErrorToClient(ws, 'Authentication required');
      }
      handleStatusUpdate(ws, message);
      break;
    
    case 'read':
      // Handle read receipts
      if (!ws.authenticated) {
        return sendErrorToClient(ws, 'Authentication required');
      }
      handleReadReceipt(ws, message);
      break;
    
    case 'reaction':
      // Handle message reactions
      if (!ws.authenticated) {
        return sendErrorToClient(ws, 'Authentication required');
      }
      handleMessageReaction(ws, message);
      break;
    
    case 'ping':
      // Simple ping-pong to keep connection alive
      sendToClient(ws, { type: 'pong', timestamp: Date.now() });
      break;
    
    default:
      sendErrorToClient(ws, 'Unknown message type');
  }
}

/**
 * Handle authentication messages
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} message - Authentication message
 */
function handleAuth(ws, message) {
  // For demo purposes, we'll accept any auth for now
  // In production, verify the token with JWT or similar
  
  if (!message.userId) {
    return sendErrorToClient(ws, 'Invalid authentication credentials');
  }
  
  // Mark as authenticated
  ws.authenticated = true;
  ws.userId = message.userId;
  
  // Store in authenticated clients
  clients.set(ws.userId, ws);
  
  // Notify client of successful authentication
  sendToClient(ws, {
    type: 'auth',
    status: 'authenticated',
    userId: ws.userId
  });
  
  // Broadcast user online status
  broadcastStatusUpdate(ws.userId, 'online');
  
  console.log(`Client ${ws.id} authenticated as user ${ws.userId}`);
}

/**
 * Handle chat messages
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} message - Chat message
 */
function handleChatMessage(ws, message) {
  // Validate message
  if (!message.chatId || !message.content) {
    return sendErrorToClient(ws, 'Invalid message format');
  }
  
  // Process the message
  const processedMessage = {
    type: 'message',
    id: message.id || uuidv4(),
    chatId: message.chatId,
    senderId: ws.userId,
    content: message.content,
    timestamp: Date.now(),
    status: 'sent'
  };
  
  // Send delivery confirmation to sender
  sendToClient(ws, {
    type: 'message_status',
    id: processedMessage.id,
    status: 'sent',
    timestamp: processedMessage.timestamp
  });
  
  // Forward to chat participants
  broadcastToChat(message.chatId, processedMessage, [ws.userId]);
}

/**
 * Handle typing indicators
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} message - Typing indicator message
 */
function handleTypingIndicator(ws, message) {
  if (!message.chatId) {
    return sendErrorToClient(ws, 'Invalid typing indicator format');
  }
  
  const typingData = {
    type: 'typing',
    chatId: message.chatId,
    userId: ws.userId,
    isTyping: !!message.isTyping,
    timestamp: Date.now()
  };
  
  // Broadcast to chat participants
  broadcastToChat(message.chatId, typingData, [ws.userId]);
}

/**
 * Handle status updates
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} message - Status update message
 */
function handleStatusUpdate(ws, message) {
  const status = message.status || 'online';
  
  broadcastStatusUpdate(ws.userId, status);
}

/**
 * Handle read receipts
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} message - Read receipt message
 */
function handleReadReceipt(ws, message) {
  if (!message.chatId || !message.messageId) {
    return sendErrorToClient(ws, 'Invalid read receipt format');
  }
  
  const readData = {
    type: 'read',
    chatId: message.chatId,
    messageId: message.messageId,
    userId: ws.userId,
    timestamp: Date.now()
  };
  
  // Broadcast to chat participants
  broadcastToChat(message.chatId, readData, [ws.userId]);
}

/**
 * Handle message reactions
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} message - Message reaction data
 */
function handleMessageReaction(ws, message) {
  if (!message.messageId || !message.emoji) {
    return sendErrorToClient(ws, 'Invalid reaction format');
  }
  
  const reactionData = {
    type: 'reaction',
    messageId: message.messageId,
    emoji: message.emoji,
    isAnimated: !!message.isAnimated,
    action: message.action || 'add', // 'add' or 'remove'
    userId: ws.userId,
    chatId: message.chatId,
    timestamp: Date.now()
  };
  
  // Broadcast to chat participants
  if (message.chatId) {
    broadcastToChat(message.chatId, reactionData);
  } else {
    // This is a fallback, but in a real app, we should always know the chatId
    broadcastToAll(reactionData);
  }
}

/**
 * Broadcast status update to all connected clients
 * @param {string} userId - User ID
 * @param {string} status - User status
 */
function broadcastStatusUpdate(userId, status) {
  const statusData = {
    type: 'status',
    userId,
    status,
    timestamp: Date.now()
  };
  
  // Broadcast to all authenticated clients
  broadcastToAll(statusData);
}

/**
 * Send a message to a specific WebSocket client
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} data - Message data
 */
function sendToClient(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

/**
 * Send an error message to a client
 * @param {WebSocket} ws - WebSocket connection
 * @param {string} errorMessage - Error message
 */
function sendErrorToClient(ws, errorMessage) {
  sendToClient(ws, {
    type: 'error',
    message: errorMessage,
    timestamp: Date.now()
  });
}

/**
 * Send a message to a specific user
 * @param {string} userId - User ID
 * @param {Object} data - Message data
 */
function sendToUser(userId, data) {
  const ws = clients.get(userId);
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    sendToClient(ws, data);
    return true;
  }
  
  return false;
}

/**
 * Broadcast a message to all connected clients
 * @param {Object} data - Message data
 */
function broadcastToAll(data) {
  clients.forEach((ws, userId) => {
    if (ws.readyState === WebSocket.OPEN) {
      sendToClient(ws, data);
    }
  });
}

/**
 * Broadcast a message to all participants in a chat
 * @param {string} chatId - Chat ID
 * @param {Object} data - Message data
 * @param {Array} excludeUserIds - User IDs to exclude from broadcast
 */
function broadcastToChat(chatId, data, excludeUserIds = []) {
  // In a real application, you would query the database to get chat participants
  // For now, we'll just broadcast to all connected users except excluded ones
  
  clients.forEach((ws, userId) => {
    if (!excludeUserIds.includes(userId) && ws.readyState === WebSocket.OPEN) {
      sendToClient(ws, data);
    }
  });
}

/**
 * Get the WebSocket server instance
 * @returns {WebSocket.Server} - WebSocket server instance
 */
function getServer() {
  return wss;
}

/**
 * Forward a message to a specific user if they're online
 * @param {string} userId - User ID
 * @param {Object} data - Message data
 * @returns {boolean} - Whether the message was sent
 */
function forwardToUser(userId, data) {
  return sendToUser(userId, data);
}

module.exports = {
  setup,
  getServer,
  sendToUser,
  forwardToUser,
  broadcastToAll,
  broadcastToChat
};