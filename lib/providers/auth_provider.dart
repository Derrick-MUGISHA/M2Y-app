import 'dart:convert';
import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/auth_service.dart';
import '../services/storage_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  final StorageService _storageService = StorageService();
  
  bool _isAuthenticated = false;
  User? _currentUser;
  
  bool get isAuthenticated => _isAuthenticated;
  User? get currentUser => _currentUser;
  
  // Check if user is authenticated
  Future<bool> checkAuthStatus() async {
  try {
    final token = await _storageService.getToken();
    _isAuthenticated = token != null;
    
    if (_isAuthenticated && _currentUser == null) {
      _currentUser = await _authService.getCurrentUser();
    }
    
    return _isAuthenticated;
  } catch (e) {
    _isAuthenticated = false;
    return false;
  }
}
  
  // Get current user ID
  Future<String?> getUserId() async {
    if (_currentUser != null) {
      return _currentUser!.id;
    }
    
    try {
      final userData = await _storageService.getUserData();
      if (userData != null) {
        final user = User.fromJson(jsonDecode(userData));
        return user.id;
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  
  // Get current user
  Future<User?> getCurrentUser() async {
    if (_currentUser != null) {
      return _currentUser;
    }
    
    _currentUser = await _authService.getCurrentUser();
    return _currentUser;
  }
  
  // Send OTP to phone number
  Future<void> sendOtp(String phoneNumber) async {
    await _authService.sendOtp(phoneNumber);
  }
  
  // Verify OTP and register/login user
  Future<User> verifyOtp(String phoneNumber, String otp) async {
    final user = await _authService.verifyOtp(phoneNumber, otp);
    _currentUser = user;
    _isAuthenticated = true;
    notifyListeners();
    return user;
  }
  
  // Update user profile
  Future<User> updateProfile({
    String? nickname,
    String? status,
    String? profileImage,
  }) async {
    final user = await _authService.updateProfile(
      nickname: nickname,
      status: status,
      profileImage: profileImage,
    );
    
    _currentUser = user;
    notifyListeners();
    return user;
  }
  
  // Logout user
  Future<void> logout() async {
    await _authService.logout();
    _currentUser = null;
    _isAuthenticated = false;
    notifyListeners();
  }
}
