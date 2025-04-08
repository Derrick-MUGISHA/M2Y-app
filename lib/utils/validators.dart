// Phone number validator
String? validatePhoneNumber(String? value) {
  if (value == null || value.isEmpty) {
    return 'Please enter your phone number';
  }
  
  // Basic validation for phone number format
  // This regex allows for country codes and various formats
  final regex = RegExp(r'^\+?[\d\s\(\)\-]{7,20}$');
  if (!regex.hasMatch(value)) {
    return 'Enter a valid phone number';
  }
  
  return null;
}

// OTP validator
String? validateOtp(String? value) {
  if (value == null || value.isEmpty) {
    return 'Please enter the verification code';
  }
  
  if (value.length != 6) {
    return 'Verification code must be 6 digits';
  }
  
  if (!RegExp(r'^[0-9]{6}$').hasMatch(value)) {
    return 'Verification code must only contain digits';
  }
  
  return null;
}

// Password validator
String? validatePassword(String? value) {
  if (value == null || value.isEmpty) {
    return 'Please enter a password';
  }
  
  if (value.length < 8) {
    return 'Password must be at least 8 characters';
  }
  
  // Check for at least one uppercase letter, one lowercase letter, and one number
  if (!RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$').hasMatch(value)) {
    return 'Password must include uppercase, lowercase, and numbers';
  }
  
  return null;
}

// Username/nickname validator
String? validateUsername(String? value) {
  if (value == null || value.isEmpty) {
    return 'Please enter a username';
  }
  
  if (value.length < 3) {
    return 'Username must be at least 3 characters';
  }
  
  if (value.length > 30) {
    return 'Username must be less than 30 characters';
  }
  
  if (!RegExp(r'^[a-zA-Z0-9_]+$').hasMatch(value)) {
    return 'Username can only contain letters, numbers, and underscores';
  }
  
  return null;
}

// Email validator
String? validateEmail(String? value) {
  if (value == null || value.isEmpty) {
    return 'Please enter an email address';
  }
  
  final emailRegex = RegExp(
    r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
  );
  
  if (!emailRegex.hasMatch(value)) {
    return 'Enter a valid email address';
  }
  
  return null;
}

// Required field validator
String? validateRequired(String? value, String fieldName) {
  if (value == null || value.trim().isEmpty) {
    return '$fieldName is required';
  }
  
  return null;
}

// Group name validator
String? validateGroupName(String? value) {
  if (value == null || value.isEmpty) {
    return 'Please enter a group name';
  }
  
  if (value.length < 3) {
    return 'Group name must be at least 3 characters';
  }
  
  if (value.length > 50) {
    return 'Group name must be less than 50 characters';
  }
  
  return null;
}