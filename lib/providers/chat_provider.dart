import 'package:flutter/material.dart';
import '../models/chat.dart';
import '../models/group.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

class ChatProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  final StorageService _storageService = StorageService();
  
  List<Chat> _chats = [];
  
  List<Chat> get chats => _chats;
  
  // Load all chats for the user
  Future<void> loadChats() async {
    try {
      final chats = await _apiService.getChats();
      _chats = chats;
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }
  
  // Get a specific chat by ID
  Chat? getChatById(String chatId) {
    try {
      return _chats.firstWhere((chat) => chat.id == chatId);
    } catch (e) {
      return null;
    }
  }
  
  // Get available contacts
  Future<List<User>> getContacts() async {
    try {
      return await _apiService.getContacts();
    } catch (e) {
      rethrow;
    }
  }
  
  // Create a new one-to-one chat
  Future<Chat> createChat(String userId) async {
    try {
      final chat = await _apiService.createChat(userId);
      
      // Add to list if not already present
      if (!_chats.any((c) => c.id == chat.id)) {
        _chats.add(chat);
        notifyListeners();
      }
      
      return chat;
    } catch (e) {
      rethrow;
    }
  }
  
  // Create a new group
  Future<Chat> createGroup({
    required String name,
    String? description,
    String? image,
    required List<String> memberIds,
    required bool isPrivate,
    bool allowAnonymousMessages = false,
    int? messageExpiryTime,
  }) async {
    try {
      final group = await _apiService.createGroup(
        name: name,
        description: description,
        image: image,
        memberIds: memberIds,
        isPrivate: isPrivate,
        allowAnonymousMessages: allowAnonymousMessages,
        messageExpiryTime: messageExpiryTime,
      );
      
      // Get the chat object for this group
      final chat = await _apiService.createChat(group.id);
      
      // Add to list if not already present
      if (!_chats.any((c) => c.id == chat.id)) {
        _chats.add(chat);
        notifyListeners();
      }
      
      return chat;
    } catch (e) {
      rethrow;
    }
  }
  
  // Get group details
  Future<Group> getGroupDetails(String groupId) async {
    try {
      return await _apiService.getGroup(groupId);
    } catch (e) {
      rethrow;
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
      final updatedGroup = await _apiService.updateGroup(
        groupId: groupId,
        name: name,
        description: description,
        image: image,
        isPrivate: isPrivate,
        allowAnonymousMessages: allowAnonymousMessages,
        messageExpiryTime: messageExpiryTime,
      );
      
      // Update chat name if changed
      if (name != null) {
        final chatIndex = _chats.indexWhere((c) => c.isGroup && c.id == groupId);
        if (chatIndex != -1) {
          _chats[chatIndex] = _chats[chatIndex].copyWith(name: name);
          notifyListeners();
        }
      }
      
      return updatedGroup;
    } catch (e) {
      rethrow;
    }
  }
  
  // Add member to group
  Future<bool> addGroupMember({
    required String groupId,
    required String userId,
    String? nickname,
    bool isVisible = true,
    bool isAdmin = false,
  }) async {
    try {
      return await _apiService.addGroupMember(
        groupId,
        userId,
        nickname: nickname,
        isVisible: isVisible,
        isAdmin: isAdmin,
      );
    } catch (e) {
      rethrow;
    }
  }
  
  // Update group member
  Future<bool> updateGroupMember({
    required String groupId,
    required String userId,
    String? nickname,
    bool? isVisible,
    bool? isAdmin,
  }) async {
    try {
      return await _apiService.updateGroupMember(
        groupId,
        userId,
        nickname: nickname,
        isVisible: isVisible,
        isAdmin: isAdmin,
      );
    } catch (e) {
      rethrow;
    }
  }
  
  // Remove member from group
  Future<bool> removeGroupMember({
    required String groupId,
    required String userId,
  }) async {
    try {
      return await _apiService.removeGroupMember(groupId, userId);
    } catch (e) {
      rethrow;
    }
  }
  
  // Leave group
  Future<void> leaveGroup(String groupId) async {
    try {
      final userId = await _getUserId();
      if (userId == null) {
        throw Exception('User not authenticated');
      }
      
      await _apiService.removeGroupMember(groupId, userId);
      
      // Remove chat from list
      _chats.removeWhere((c) => c.isGroup && c.id == groupId);
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }
  
  // Update unread count for a chat
  void updateUnreadCount(String chatId, int unreadCount) {
    final index = _chats.indexWhere((chat) => chat.id == chatId);
    if (index != -1) {
      _chats[index] = _chats[index].copyWith(unreadCount: unreadCount);
      notifyListeners();
    }
  }
  
  // Search for users
  Future<List<User>> searchUsers(String query) async {
    try {
      return await _apiService.searchUsers(query);
    } catch (e) {
      rethrow;
    }
  }
  
  // Get current user ID
  Future<String?> _getUserId() async {
    try {
      final userData = await _storageService.getUserData();
      if (userData != null) {
        final user = User.fromJson(await _storageService.getUserData() as Map<String, dynamic>);
        return user.id;
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  
  // Update a chat with a new last message
  void updateChatWithLastMessage(String chatId, Chat updatedChat) {
    final index = _chats.indexWhere((chat) => chat.id == chatId);
    if (index != -1) {
      _chats[index] = updatedChat;
      
      // Sort chats by last message timestamp
      _chats.sort((a, b) {
        if (a.lastMessage == null && b.lastMessage == null) {
          return a.updatedAt.compareTo(b.updatedAt);
        }
        if (a.lastMessage == null) return 1;
        if (b.lastMessage == null) return -1;
        return b.lastMessage!.timestamp.compareTo(a.lastMessage!.timestamp);
      });
      
      notifyListeners();
    }
  }
}
