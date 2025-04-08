import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class StorageService {
  static final StorageService _instance = StorageService._internal();
  late FlutterSecureStorage _secureStorage;
  
  // Keys for storage
  static const String _tokenKey = 'auth_token';
  static const String _userDataKey = 'user_data';
  static const String _privateKeyKey = 'private_key';
  
  // Factory constructor
  factory StorageService() {
    return _instance;
  }
  
  // Private constructor
  StorageService._internal();
  
  // Initialize storage
  Future<void> init() async {
    _secureStorage = const FlutterSecureStorage(
      aOptions: AndroidOptions(
        encryptedSharedPreferences: true,
      ),
    );
  }
  
  // Save authentication token
  Future<void> saveToken(String token) async {
    await _secureStorage.write(key: _tokenKey, value: token);
  }
  
  // Get authentication token
  Future<String?> getToken() async {
    return await _secureStorage.read(key: _tokenKey);
  }
  
  // Save user data (as JSON string)
  Future<void> saveUserData(String userData) async {
    await _secureStorage.write(key: _userDataKey, value: userData);
  }
  
  // Get user data (as JSON string)
  Future<String?> getUserData() async {
    return await _secureStorage.read(key: _userDataKey);
  }
  
  // Save private key (as JSON string)
  Future<void> savePrivateKey(String privateKey) async {
    await _secureStorage.write(key: _privateKeyKey, value: privateKey);
  }
  
  // Get private key (as JSON string)
  Future<String?> getPrivateKey() async {
    return await _secureStorage.read(key: _privateKeyKey);
  }
  
  // Clear all stored data (logout)
  Future<void> clearAll() async {
    await _secureStorage.deleteAll();
  }
}