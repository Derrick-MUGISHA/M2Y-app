const crypto = require('crypto');

/**
 * Generate a random string of specified length
 * @param {number} length - Length of the random string
 * @returns {string} - Random string
 */
exports.generateRandomString = (length = 32) => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

/**
 * Format a phone number to a standard format
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} - Formatted phone number
 */
exports.formatPhoneNumber = (phoneNumber) => {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Add + prefix if not present
  if (!phoneNumber.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
};

/**
 * Validate a phone number
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
exports.isValidPhoneNumber = (phoneNumber) => {
  // Basic validation for phone number format
  // This regex allows for country codes and various formats
  const regex = /^\+?[\d\s\(\)\-]{7,20}$/;
  return regex.test(phoneNumber);
};

/**
 * Check if a string is empty or whitespace only
 * @param {string} str - String to check
 * @returns {boolean} - True if empty or whitespace only, false otherwise
 */
exports.isEmptyString = (str) => {
  return !str || str.trim().length === 0;
};

/**
 * Truncate a string to a maximum length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add to truncated string
 * @returns {string} - Truncated string
 */
exports.truncateString = (str, maxLength = 100, suffix = '...') => {
  if (!str || str.length <= maxLength) {
    return str;
  }
  
  return str.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Format a date to a human-readable format
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
exports.formatDate = (date) => {
  if (!date) {
    return '';
  }
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const dateToFormat = new Date(date);
  const dateOnly = new Date(dateToFormat.getFullYear(), dateToFormat.getMonth(), dateToFormat.getDate());
  
  if (dateOnly.getTime() === today.getTime()) {
    // Today, show time only
    return dateToFormat.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (dateOnly.getTime() === yesterday.getTime()) {
    // Yesterday
    return 'Yesterday';
  } else if (now.getTime() - dateToFormat.getTime() < 7 * 24 * 60 * 60 * 1000) {
    // Less than a week ago, show day name
    return dateToFormat.toLocaleDateString([], { weekday: 'long' });
  } else {
    // More than a week ago, show date
    return dateToFormat.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  }
};

/**
 * Get time elapsed since a date in human-readable format
 * @param {Date} date - Date to calculate elapsed time from
 * @returns {string} - Elapsed time string
 */
exports.getTimeElapsed = (date) => {
  if (!date) {
    return '';
  }
  
  const now = new Date();
  const elapsed = now.getTime() - new Date(date).getTime();
  
  // Convert to seconds
  const seconds = Math.floor(elapsed / 1000);
  
  if (seconds < 60) {
    return 'just now';
  }
  
  // Convert to minutes
  const minutes = Math.floor(seconds / 60);
  
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  // Convert to hours
  const hours = Math.floor(minutes / 60);
  
  if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  // Convert to days
  const days = Math.floor(hours / 24);
  
  if (days < 7) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  
  // Convert to weeks
  const weeks = Math.floor(days / 7);
  
  if (weeks < 4) {
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }
  
  // Convert to months
  const months = Math.floor(days / 30);
  
  if (months < 12) {
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }
  
  // Convert to years
  const years = Math.floor(days / 365);
  
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
};

/**
 * Parse query parameters from a URL string
 * @param {string} url - URL string
 * @returns {Object} - Query parameters as key-value pairs
 */
exports.parseQueryParams = (url) => {
  const params = {};
  
  if (!url || !url.includes('?')) {
    return params;
  }
  
  const queryString = url.split('?')[1];
  const pairs = queryString.split('&');
  
  for (let pair of pairs) {
    const [key, value] = pair.split('=');
    params[decodeURIComponent(key)] = decodeURIComponent(value || '');
  }
  
  return params;
};

/**
 * Safely parse JSON string
 * @param {string} jsonString - JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} - Parsed JSON or default value
 */
exports.safeJsonParse = (jsonString, defaultValue = {}) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return defaultValue;
  }
};
