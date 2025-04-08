import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/user.dart';
import '../models/chat.dart';
import '../models/group.dart';
import '../utils/constants.dart';
import 'storage_service.dart';

class ApiService {
  final String baseUrl = ApiConstants.baseUrl;
  final StorageService _storageService = StorageService();

  // Get HTTP headers with auth token
  Future<Map<String, String>> _getAuthHeaders() async {
    final token = await _storageService.getToken();
    if (token == null) {
      throw Exception('User not authenticated');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  // Get user chats
  Future<List<Chat>> getChats() async {
    try {
      final headers = await _getAuthHeaders();

      final response = await http.get(
        Uri.parse('$baseUrl/chats'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => Chat.fromJson(json)).toList();
      } else {
        final error = jsonDecode(response.body)['message'];
        throw Exception(error ?? 'Failed to fetch chats');
      }
    } catch (e) {
      throw Exception('Network error: ${e.toString()}');
    }
  }

  // Create a new one-to-one chat
  Future<Chat> createChat(String userId) async {
    try {
      final headers = await _getAuthHeaders();

      final response = await http.post(
        Uri.parse('$baseUrl/chats'),
        headers: headers,
        body: jsonEncode({
          'userId': userId,
        }),
      );

      if (response.statusCode == 201) {
        return Chat.fromJson(jsonDecode(response.body));
      } else {
        final error = jsonDecode(response.body)['message'];
        throw Exception(error ?? 'Failed to create chat');
      }
    } catch (e) {
      throw Exception('Network error: ${e.toString()}');
    }
  }

  // Get user contacts (other app users)
  Future<List<User>> getContacts() async {
    try {
      final headers = await _getAuthHeaders();

      final response = await http.get(
        Uri.parse('$baseUrl/users/contacts'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => User.fromJson(json)).toList();
      } else {
        final error = jsonDecode(response.body)['message'];
        throw Exception(error ?? 'Failed to fetch contacts');
      }
    } catch (e) {
      throw Exception('Network error: ${e.toString()}');
    }
  }

  // Create a new group
  Future<Group> createGroup({
    required String name,
    String? description,
    String? image,
    required List<String> memberIds,
    required bool isPrivate,
    bool allowAnonymousMessages = false,
    int? messageExpiryTime,
  }) async {
    try {
      final headers = await _getAuthHeaders();

      final response = await http.post(
        Uri.parse('$baseUrl/groups'),
        headers: headers,
        body: jsonEncode({
          'name': name,
          'description': description,
          'image': image,
          'memberIds': memberIds,
          'isPrivate': isPrivate,
          'allowAnonymousMessages': allowAnonymousMessages,
          'messageExpiryTime': messageExpiryTime,
        }),
      );

      if (response.statusCode == 201) {
        return Group.fromJson(jsonDecode(response.body));
      } else {
        final error = jsonDecode(response.body)['message'];
        throw Exception(error ?? 'Failed to create group');
      }
    } catch (e) {
      throw Exception('Network error: ${e.toString()}');
    }
  }

  // Get user groups
  Future<List<Group>> getGroups() async {
    try {
      final headers = await _getAuthHeaders();

      final response = await http.get(
        Uri.parse('$baseUrl/groups'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => Group.fromJson(json)).toList();
      } else {
        final error = jsonDecode(response.body)['message'];
        throw Exception(error ?? 'Failed to fetch groups');
      }
    } catch (e) {
      throw Exception('Network error: ${e.toString()}');
    }
  }

  // Get a specific group
  Future<Group> getGroup(String groupId) async {
    try {
      final headers = await _getAuthHeaders();

      final response = await http.get(
        Uri.parse('$baseUrl/groups/$groupId'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        return Group.fromJson(jsonDecode(response.body));
      } else {
        final error = jsonDecode(response.body)['message'];
        throw Exception(error ?? 'Failed to fetch group');
      }
    } catch (e) {
      throw Exception('Network error: ${e.toString()}');
    }
  }

  // Update group settings
  Future<Group> updateGroup({
    required String groupId,
    String? name,
    String? description,
    String? image,
    bool? isPrivate,
    bool? allowAnonymousMessages,
    int? messageExpiryTime,
  }) async {
    try {
      final headers = await _getAuthHeaders();

      final response = await http.put(
        Uri.parse('$baseUrl/groups/$groupId'),
        headers: headers,
        body: jsonEncode({
          'name': name,
          'description': description,
          'image': image,
          'isPrivate': isPrivate,
          'allowAnonymousMessages': allowAnonymousMessages,
          'messageExpiryTime': messageExpiryTime,
        }),
      );

      if (response.statusCode == 200) {
        return Group.fromJson(jsonDecode(response.body));
      } else {
        final error = jsonDecode(response.body)['message'];
        throw Exception(error ?? 'Failed to update group');
      }
    } catch (e) {
      throw Exception('Network error: ${e.toString()}');
    }
  }

  // Add user to group
  Future<bool> addGroupMember(String groupId, String userId, {
    String? nickname,
    bool isVisible = true,
    bool isAdmin = false,
  }) async {
    try {
      final headers = await _getAuthHeaders();

      final response = await http.post(
        Uri.parse('$baseUrl/groups/$groupId/members'),
        headers: headers,
        body: jsonEncode({
          'userId': userId,
          'nickname': nickname,
          'isVisible': isVisible,
          'isAdmin': isAdmin,
        }),
      );

      return response.statusCode == 200;
    } catch (e) {
      throw Exception('Network error: ${e.toString()}');
    }
  }

  // Update group member settings
  Future<bool> updateGroupMember(String groupId, String userId, {
    String? nickname,
    bool? isVisible,
    bool? isAdmin,
  }) async {
    try {
      final headers = await _getAuthHeaders();

      final response = await http.put(
        Uri.parse('$baseUrl/groups/$groupId/members/$userId'),
        headers: headers,
        body: jsonEncode({
          'nickname': nickname,
          'isVisible': isVisible,
          'isAdmin': isAdmin,
        }),
      );

      return response.statusCode == 200;
    } catch (e) {
      throw Exception('Network error: ${e.toString()}');
    }
  }

  // Remove user from group
  Future<bool> removeGroupMember(String groupId, String userId) async {
    try {
      final headers = await _getAuthHeaders();

      final response = await http.delete(
        Uri.parse('$baseUrl/groups/$groupId/members/$userId'),
        headers: headers,
      );

      return response.statusCode == 200;
    } catch (e) {
      throw Exception('Network error: ${e.toString()}');
    }
  }

  // Search users
  Future<List<User>> searchUsers(String query) async {
    try {
      final headers = await _getAuthHeaders();

      final response = await http.get(
        Uri.parse('$baseUrl/users/search?q=$query'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => User.fromJson(json)).toList();
      } else {
        final error = jsonDecode(response.body)['message'];
        throw Exception(error ?? 'Failed to search users');
      }
    } catch (e) {
      throw Exception('Network error: ${e.toString()}');
    }
  }
}
