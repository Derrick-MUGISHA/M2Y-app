import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../models/message.dart';
import '../models/user.dart';
import '../utils/constants.dart';
import 'storage_service.dart';
import 'crypto_service.dart';
import 'media_service.dart';

class MessageService {
  final String baseUrl = '${ApiConstants.baseUrl}/messages';
  final StorageService _storageService = StorageService();
  final CryptoService _cryptoService = CryptoService();
  final MediaService _mediaService = MediaService();

  // Send a text message
  Future<Message> sendTextMessage({
    required String receiverId,
    required String content,
    String? groupId,
    DateTime? expiresAt,
    bool isAnonymous = false,
  }) async {
    try {
      final token = await _storageService.getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }

      // Get recipient's public key for encryption
      User recipient;
      if (groupId == null) {
        recipient = await _getUserById(receiverId);
      } else {
        // For group messages, we'll need a different approach - using group key or recipient-specific encryption
        recipient = await _getUserById(receiverId); // Placeholder for now
      }

      // Encrypt message content with recipient's public key
      final encryptedContent = await _cryptoService.encryptMessage(
        content, 
        recipient.publicKey,
      );

      final response = await http.post(
        Uri.parse(baseUrl),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'receiverId': receiverId,
          'groupId': groupId,
          'type': 'text',
          'encryptedContent': encryptedContent,
          'expiresAt': expiresAt?.toIso8601String(),
          'isAnonymous': isAnonymous,
        }),
      );

      if (response.statusCode == 201) {
        return Message.fromJson(jsonDecode(response.body));
      } else {
        final error = jsonDecode(response.body)['message'];
        throw Exception(error ?? 'Failed to send message');
      }
    } catch (e) {
      throw Exception('Network error: ${e.toString()}');
    }
  }

  // Send a media message (image, document, etc.)
  Future<Message> sendMediaMessage({
    required String receiverId,
    required File media,
    required MessageType type,
    String? caption,
    String? groupId,
    DateTime? expiresAt,
    bool isAnonymous = false,
  }) async {
    try {
      final token = await _storageService.getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }

      // First upload the media file
      final mediaUrl = await _mediaService.uploadMedia(media);

      // Encrypt caption if provided
      String? encryptedCaption;
      if (caption != null && caption.isNotEmpty) {
        // Get recipient's public key
        User recipient;
        if (groupId == null) {
          recipient = await _getUserById(receiverId);
        } else {
          recipient = await _getUserById(receiverId); // Placeholder for group
        }

        encryptedCaption = await _cryptoService.encryptMessage(
          caption, 
          recipient.publicKey,
        );
      }

      final response = await http.post(
        Uri.parse(baseUrl),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'receiverId': receiverId,
          'groupId': groupId,
          'type': type.toString().split('.').last,
          'encryptedContent': encryptedCaption,
          'mediaUrl': mediaUrl,
          'expiresAt': expiresAt?.toIso8601String(),
          'isAnonymous': isAnonymous,
          'metadata': {
            'fileName': media.path.split('/').last,
            'fileSize': await media.length(),
            'mimeType': _getMimeType(media.path),
          },
        }),
      );

      if (response.statusCode == 201) {
        return Message.fromJson(jsonDecode(response.body));
      } else {
        final error = jsonDecode(response.body)['message'];
        throw Exception(error ?? 'Failed to send media message');
      }
    } catch (e) {
      throw Exception('Network error: ${e.toString()}');
    }
  }

  // Get messages for a chat
  Future<List<Message>> getChatMessages(String chatId) async {
    try {
      final token = await _storageService.getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }

      final response = await http.get(
        Uri.parse('$baseUrl/chat/$chatId'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        final messages = data.map((json) => Message.fromJson(json)).toList();
        
        // Decrypt messages
        final privateKeyJson = await _storageService.getPrivateKey();
        if (privateKeyJson != null) {
          final privateKey = jsonDecode(privateKeyJson);
          
          for (var i = 0; i < messages.length; i++) {
            if (messages[i].encryptedContent != null) {
              try {
                final decryptedContent = await _cryptoService.decryptMessage(
                  messages[i].encryptedContent!,
                  privateKey,
                );
                
                // We can't modify the original message because it's final,
                // so we create a new one with the decrypted content in metadata
                messages[i] = messages[i].copyWith(
                  metadata: {
                    ...messages[i].metadata ?? {},
                    'decryptedContent': decryptedContent,
                  },
                );
              } catch (e) {
                print('Failed to decrypt message ${messages[i].id}: ${e.toString()}');
              }
            }
          }
        }
        
        return messages;
      } else {
        final error = jsonDecode(response.body)['message'];
        throw Exception(error ?? 'Failed to fetch messages');
      }
    } catch (e) {
      throw Exception('Network error: ${e.toString()}');
    }
  }

  // Delete a message
  Future<bool> deleteMessage(String messageId, bool deleteForEveryone) async {
    try {
      final token = await _storageService.getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }

      final response = await http.delete(
        Uri.parse('$baseUrl/$messageId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'deleteForEveryone': deleteForEveryone,
        }),
      );

      return response.statusCode == 200;
    } catch (e) {
      throw Exception('Network error: ${e.toString()}');
    }
  }

  // Update message status (read, delivered)
  Future<bool> updateMessageStatus(String messageId, MessageStatus status) async {
    try {
      final token = await _storageService.getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }

      final response = await http.patch(
        Uri.parse('$baseUrl/$messageId/status'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'status': status.toString().split('.').last,
        }),
      );

      return response.statusCode == 200;
    } catch (e) {
      throw Exception('Network error: ${e.toString()}');
    }
  }

  // Helper function to get a user by ID
  Future<User> _getUserById(String userId) async {
    try {
      final token = await _storageService.getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }

      final response = await http.get(
        Uri.parse('${ApiConstants.baseUrl}/users/$userId'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        return User.fromJson(jsonDecode(response.body));
      } else {
        final error = jsonDecode(response.body)['message'];
        throw Exception(error ?? 'Failed to get user');
      }
    } catch (e) {
      throw Exception('Network error: ${e.toString()}');
    }
  }

  // Helper function to get MIME type from file path
  String _getMimeType(String path) {
    final ext = path.split('.').last.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'pdf':
        return 'application/pdf';
      case 'doc':
      case 'docx':
        return 'application/msword';
      case 'mp3':
        return 'audio/mpeg';
      case 'mp4':
        return 'video/mp4';
      default:
        return 'application/octet-stream';
    }
  }
}