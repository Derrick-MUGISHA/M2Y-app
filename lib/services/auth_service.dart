import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/user.dart';
import '../utils/constants.dart';
import 'storage_service.dart';
import 'crypto_service.dart';

class AuthService {
  final String baseUrl = '${ApiConstants.baseUrl}/auth';
  final StorageService _storageService = StorageService();
  final CryptoService _cryptoService = CryptoService();

  // Send OTP to phone number
  Future<bool> sendOtp(String phoneNumber) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/send-otp'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'phoneNumber': phoneNumber}),
      );

      if (response.statusCode == 200) {
        return true;
      } else {
        final error = jsonDecode(response.body)['message'];
        throw Exception(error ?? 'Failed to send OTP');
      }
    } catch (e) {
      throw Exception('Network error: ${e.toString()}');
    }
  }

  // Verify OTP and register/login user
  Future<User> verifyOtp(String phoneNumber, String otp) async {
    try {
      // Generate encryption keys for E2E encryption
      final keyPair = await _cryptoService.generateKeyPair();
      
      final response = await http.post(
        Uri.parse('$baseUrl/verify-otp'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phoneNumber': phoneNumber,
          'otp': otp,
          'publicKey': keyPair.publicKey,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        // Save auth token to secure storage
        await _storageService.saveToken(data['token']);
        
        // Save private key to secure storage
        await _storageService.savePrivateKey(jsonEncode(keyPair.privateKey));
        
        // Save user data
        await _storageService.saveUserData(jsonEncode(data['user']));
        
        return User.fromJson(data['user']);
      } else {
        final error = jsonDecode(response.body)['message'];
        throw Exception(error ?? 'Failed to verify OTP');
      }
    } catch (e) {
      throw Exception('Network error: ${e.toString()}');
    }
  }

  // Get current user from storage
  Future<User?> getCurrentUser() async {
    try {
      final userData = await _storageService.getUserData();
      if (userData != null) {
        return User.fromJson(jsonDecode(userData));
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // Check if user is authenticated
  Future<bool> isAuthenticated() async {
    final token = await _storageService.getToken();
    return token != null;
  }

  // Logout user
  Future<void> logout() async {
    await _storageService.clearAll();
  }

  // Update user profile
  Future<User> updateProfile({
    String? nickname,
    String? status,
    String? profileImage,
  }) async {
    try {
      final token = await _storageService.getToken();
      
      if (token == null) {
        throw Exception('User not authenticated');
      }
      
      final response = await http.put(
        Uri.parse('$baseUrl/profile'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'nickname': nickname,
          'status': status,
          'profileImage': profileImage,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        // Update stored user data
        await _storageService.saveUserData(jsonEncode(data));
        
        return User.fromJson(data);
      } else {
        final error = jsonDecode(response.body)['message'];
        throw Exception(error ?? 'Failed to update profile');
      }
    } catch (e) {
      throw Exception('Network error: ${e.toString()}');
    }
  }
}