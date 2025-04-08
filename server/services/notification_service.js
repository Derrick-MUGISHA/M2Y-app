const twilio = require('twilio');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Twilio credentials
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Create Twilio client
let twilioClient;

// Initialize Twilio client if credentials are available
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

/**
 * Send SMS notification
 * @param {string} to - Recipient phone number
 * @param {string} message - SMS content
 * @returns {Promise} - Promise resolving to SMS response
 */
exports.sendSMS = async (to, message) => {
  try {
    // Check if Twilio is configured
    if (!twilioClient) {
      console.log('Twilio not configured. SMS would have been sent to:', to, 'Message:', message);
      return Promise.resolve({ status: 'success', info: 'SMS simulated (Twilio not configured)' });
    }
    
    // Normalize phone number (ensure it has + prefix)
    const phoneNumber = to.startsWith('+') ? to : `+${to}`;
    
    // Send SMS using Twilio
    const response = await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    
    return { status: 'success', messageId: response.sid, info: response };
  } catch (error) {
    console.error('Error sending SMS:', error);
    
    // For development/fallback, log the message
    console.log('SMS would have been sent to:', to, 'Message:', message);
    
    // In production, you might want to throw the error
    // throw error;
    
    // For now, return success to allow development without Twilio
    return { status: 'error', error: error.message };
  }
};

/**
 * Send push notification
 * @param {string} userId - User ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data for the notification
 * @returns {Promise} - Promise resolving to notification response
 */
exports.sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    // This is a placeholder for actual push notification logic
    // In a real implementation, you would use Firebase Cloud Messaging or similar
    console.log('Push notification would be sent to:', userId);
    console.log('Title:', title);
    console.log('Body:', body);
    console.log('Data:', data);
    
    // Return mock success response
    return { status: 'success', info: 'Push notification simulated' };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { status: 'error', error: error.message };
  }
};

/**
 * Format notification message for new chat message
 * @param {string} senderName - Name of the message sender
 * @param {string} messageContent - Content of the message
 * @param {boolean} isGroup - Whether the message is for a group
 * @param {string} groupName - Name of the group (if applicable)
 * @returns {Object} - Formatted notification object
 */
exports.formatMessageNotification = (senderName, messageContent, isGroup = false, groupName = '') => {
  // Format title
  let title = isGroup 
    ? `${senderName} in ${groupName}`
    : senderName;
  
  // Format body based on message type
  let body = messageContent;
  
  if (messageContent.startsWith('data:image')) {
    body = '📷 Image';
  } else if (messageContent.startsWith('data:audio')) {
    body = '🎵 Audio message';
  } else if (messageContent.startsWith('data:video')) {
    body = '🎬 Video';
  } else if (messageContent.startsWith('data:application/pdf')) {
    body = '📄 PDF document';
  } else if (messageContent.startsWith('data:application')) {
    body = '📎 Document';
  }
  
  return { title, body };
};
