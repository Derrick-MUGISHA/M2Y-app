class ApiConstants {
  // Base URL for the API
  static const String baseUrl = 'http://localhost:8000/api';
  
  // WebSocket URL
  static const String wsUrl = 'ws://localhost:8000/ws';
}

class AppConstants {
  // App name
  static const String appName = 'M2You';
  
  // App version
  static const String appVersion = '1.0.0';
  
  // Shared preferences keys
  static const String themeKey = 'app_theme';
  static const String notificationsEnabledKey = 'notifications_enabled';
  static const String showPreviewsKey = 'show_previews';
}

class ErrorMessages {
  // Auth errors
  static const String invalidPhoneNumber = 'Invalid phone number format';
  static const String invalidOtp = 'Invalid OTP code';
  static const String otpExpired = 'OTP code has expired';
  static const String userNotFound = 'User not found';
  static const String serverError = 'Server error, please try again';
  static const String networkError = 'Network error, please check your connection';
  
  // Chat errors
  static const String chatCreationFailed = 'Failed to create chat';
  static const String messagesFetchFailed = 'Failed to fetch messages';
  static const String messageSendFailed = 'Failed to send message';
  
  // Group errors
  static const String groupCreationFailed = 'Failed to create group';
  static const String groupUpdateFailed = 'Failed to update group settings';
  static const String memberAddFailed = 'Failed to add member to group';
  static const String memberRemoveFailed = 'Failed to remove member from group';
}