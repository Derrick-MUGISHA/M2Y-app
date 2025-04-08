import 'dart:io';
import 'package:flutter/material.dart';
import '../models/message.dart';
import '../services/message_service.dart';
import '../services/websocket_service.dart';
import 'chat_provider.dart';

class MessageProvider extends ChangeNotifier {
  final MessageService _messageService = MessageService();
  final WebSocketService _webSocketService = WebSocketService();
  
  // Map of chat ID to list of messages
  final Map<String, List<Message>> _messages = {};
  
  // Constructor
  MessageProvider() {
    // Listen for new messages from WebSocket
    _webSocketService.onMessage.listen(_handleIncomingMessage);
    
    // Connect to WebSocket server
    _webSocketService.connect();
  }
  
  // Get messages for a specific chat
  List<Message> getMessagesForChat(String chatId) {
    return _messages[chatId] ?? [];
  }
  
  // Load messages for a chat
  Future<void> loadMessages(String chatId) async {
    try {
      final messages = await _messageService.getChatMessages(chatId);
      _messages[chatId] = messages;
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }
  
  // Send a text message
  Future<Message> sendMessage({
    required String receiverId,
    required String content,
    DateTime? expiresAt,
    bool isAnonymous = false,
  }) async {
    try {
      final message = await _messageService.sendTextMessage(
        receiverId: receiverId,
        content: content,
        expiresAt: expiresAt,
        isAnonymous: isAnonymous,
      );
      
      // Add to local messages list
      if (_messages.containsKey(message.chatId)) {
        _messages[message.chatId]!.add(message);
        notifyListeners();
      }
      
      return message;
    } catch (e) {
      rethrow;
    }
  }
  
  // Send a media message
  Future<Message> sendMedia({
    required String receiverId,
    required File media,
    required MessageType type,
    String? caption,
    DateTime? expiresAt,
    bool isAnonymous = false,
  }) async {
    try {
      final message = await _messageService.sendMediaMessage(
        receiverId: receiverId,
        media: media,
        type: type,
        caption: caption,
        expiresAt: expiresAt,
        isAnonymous: isAnonymous,
      );
      
      // Add to local messages list
      if (_messages.containsKey(message.chatId)) {
        _messages[message.chatId]!.add(message);
        notifyListeners();
      }
      
      return message;
    } catch (e) {
      rethrow;
    }
  }
  
  // Send a text message to a group
  Future<Message> sendGroupMessage({
    required String groupId,
    required String content,
    DateTime? expiresAt,
    bool isAnonymous = false,
  }) async {
    try {
      final message = await _messageService.sendTextMessage(
        receiverId: '', // Not used for group messages
        content: content,
        groupId: groupId,
        expiresAt: expiresAt,
        isAnonymous: isAnonymous,
      );
      
      // Add to local messages list
      if (_messages.containsKey(message.chatId)) {
        _messages[message.chatId]!.add(message);
        notifyListeners();
      }
      
      return message;
    } catch (e) {
      rethrow;
    }
  }
  
  // Send a media message to a group
  Future<Message> sendGroupMedia({
    required String groupId,
    required File media,
    required MessageType type,
    String? caption,
    DateTime? expiresAt,
    bool isAnonymous = false,
  }) async {
    try {
      final message = await _messageService.sendMediaMessage(
        receiverId: '', // Not used for group messages
        media: media,
        type: type,
        caption: caption,
        groupId: groupId,
        expiresAt: expiresAt,
        isAnonymous: isAnonymous,
      );
      
      // Add to local messages list
      if (_messages.containsKey(message.chatId)) {
        _messages[message.chatId]!.add(message);
        notifyListeners();
      }
      
      return message;
    } catch (e) {
      rethrow;
    }
  }
  
  // Delete a message
  Future<bool> deleteMessage(
    String messageId,
    bool deleteForEveryone,
  ) async {
    try {
      final result = await _messageService.deleteMessage(
        messageId,
        deleteForEveryone,
      );
      
      if (result) {
        // Update local message as deleted
        for (final chatId in _messages.keys) {
          final index = _messages[chatId]!.indexWhere((m) => m.id == messageId);
          if (index != -1) {
            _messages[chatId]![index] = _messages[chatId]![index].copyWith(
              isDeleted: true,
            );
            notifyListeners();
            break;
          }
        }
      }
      
      return result;
    } catch (e) {
      rethrow;
    }
  }
  
  // Mark messages as read
  Future<void> markMessagesAsRead(String chatId) async {
    try {
      if (!_messages.containsKey(chatId)) return;
      
      for (final message in _messages[chatId]!) {
        if (message.status == MessageStatus.delivered || message.status == MessageStatus.sent) {
          await _messageService.updateMessageStatus(message.id, MessageStatus.read);
          
          // Also send read receipt via WebSocket
          _webSocketService.sendRead(message.id);
        }
      }
      
      // Update chat provider to reset unread count
      ChatProvider().updateUnreadCount(chatId, 0);
    } catch (e) {
      print('Error marking messages as read: ${e.toString()}');
    }
  }
  
  // Handle incoming message from WebSocket
  void _handleIncomingMessage(Message message) {
    // Add to local messages list
    if (!_messages.containsKey(message.chatId)) {
      _messages[message.chatId] = [];
    }
    
    _messages[message.chatId]!.add(message);
    
    // Send delivered receipt
    _webSocketService.sendDelivered(message.id);
    
    notifyListeners();
    
    // Update chat provider with the new message
    // This will update the chat list with the latest message
    // Get the updated chat object from the server and update the chat provider
  }
  
  // Dispose resources
  @override
  void dispose() {
    _webSocketService.dispose();
    super.dispose();
  }
}
