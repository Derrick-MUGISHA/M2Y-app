import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/io.dart';
import '../models/message.dart';
import '../utils/constants.dart';
import 'storage_service.dart';
import 'crypto_service.dart';

enum WebSocketStatus {
  connecting,
  connected,
  disconnected,
  reconnecting,
}

class WebSocketService {
  final String baseUrl = ApiConstants.wsUrl;
  final StorageService _storageService = StorageService();
  final CryptoService _cryptoService = CryptoService();
  
  WebSocketChannel? _channel;
  WebSocketStatus _status = WebSocketStatus.disconnected;
  Timer? _reconnectTimer;
  Timer? _heartbeatTimer;
  
  // Stream controllers for different event types
  final _messageController = StreamController<Message>.broadcast();
  final _statusUpdateController = StreamController<WebSocketStatus>.broadcast();
  final _typingController = StreamController<Map<String, dynamic>>.broadcast();
  final _deliveredController = StreamController<Map<String, dynamic>>.broadcast();
  final _readController = StreamController<Map<String, dynamic>>.broadcast();

  // Public streams for listeners
  Stream<Message> get onMessage => _messageController.stream;
  Stream<WebSocketStatus> get onStatusUpdate => _statusUpdateController.stream;
  Stream<Map<String, dynamic>> get onTyping => _typingController.stream;
  Stream<Map<String, dynamic>> get onDelivered => _deliveredController.stream;
  Stream<Map<String, dynamic>> get onRead => _readController.stream;
  
  WebSocketStatus get status => _status;
  
  // Connect to WebSocket server
  Future<void> connect() async {
    if (_status == WebSocketStatus.connecting || _status == WebSocketStatus.connected) {
      return;
    }
    
    try {
      _updateStatus(WebSocketStatus.connecting);
      
      final token = await _storageService.getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }
      
      final wsUrl = Uri.parse('$baseUrl?token=$token');
      _channel = IOWebSocketChannel.connect(wsUrl);
      
      _channel!.stream.listen(
        _onMessage,
        onDone: _onDisconnected,
        onError: (error) {
          print('WebSocket error: $error');
          _onDisconnected();
        },
      );
      
      _updateStatus(WebSocketStatus.connected);
      
      // Start heartbeat to keep connection alive
      _startHeartbeat();
    } catch (e) {
      print('WebSocket connection failed: ${e.toString()}');
      _onDisconnected();
    }
  }
  
  // Disconnect from WebSocket server
  void disconnect() {
    _stopReconnectTimer();
    _stopHeartbeat();
    
    if (_channel != null) {
      _channel!.sink.close();
      _channel = null;
    }
    
    _updateStatus(WebSocketStatus.disconnected);
  }
  
  // Send typing indicator
  void sendTyping(String chatId, bool isTyping) {
    if (_status != WebSocketStatus.connected) {
      return;
    }
    
    _channel!.sink.add(jsonEncode({
      'type': 'typing',
      'chatId': chatId,
      'isTyping': isTyping,
    }));
  }
  
  // Send delivered receipt
  void sendDelivered(String messageId) {
    if (_status != WebSocketStatus.connected) {
      return;
    }
    
    _channel!.sink.add(jsonEncode({
      'type': 'delivered',
      'messageId': messageId,
    }));
  }
  
  // Send read receipt
  void sendRead(String messageId) {
    if (_status != WebSocketStatus.connected) {
      return;
    }
    
    _channel!.sink.add(jsonEncode({
      'type': 'read',
      'messageId': messageId,
    }));
  }
  
  // Handle incoming messages
  void _onMessage(dynamic data) async {
    try {
      final json = jsonDecode(data);
      final type = json['type'];
      
      switch (type) {
        case 'message':
          final message = Message.fromJson(json['data']);
          
          // Decrypt message if it has encrypted content
          if (message.encryptedContent != null) {
            final privateKeyJson = await _storageService.getPrivateKey();
            if (privateKeyJson != null) {
              final privateKey = jsonDecode(privateKeyJson);
              
              try {
                final decryptedContent = await _cryptoService.decryptMessage(
                  message.encryptedContent!,
                  privateKey,
                );
                
                // Add decrypted content to metadata
                final updatedMessage = message.copyWith(
                  metadata: {
                    ...message.metadata ?? {},
                    'decryptedContent': decryptedContent,
                  },
                );
                
                _messageController.add(updatedMessage);
              } catch (e) {
                print('Failed to decrypt message: ${e.toString()}');
                _messageController.add(message);
              }
            } else {
              _messageController.add(message);
            }
          } else {
            _messageController.add(message);
          }
          break;
          
        case 'typing':
          _typingController.add({
            'chatId': json['chatId'],
            'userId': json['userId'],
            'isTyping': json['isTyping'],
          });
          break;
          
        case 'delivered':
          _deliveredController.add({
            'messageId': json['messageId'],
            'userId': json['userId'],
          });
          break;
          
        case 'read':
          _readController.add({
            'messageId': json['messageId'],
            'userId': json['userId'],
          });
          break;
          
        case 'pong':
          // Heartbeat response - nothing to do
          break;
          
        default:
          print('Unknown WebSocket message type: $type');
      }
    } catch (e) {
      print('Error processing WebSocket message: ${e.toString()}');
    }
  }
  
  // Handle disconnection
  void _onDisconnected() {
    if (_status == WebSocketStatus.disconnected) {
      return;
    }
    
    _stopHeartbeat();
    _updateStatus(WebSocketStatus.disconnected);
    
    // Start reconnection timer
    _startReconnectTimer();
  }
  
  // Update WebSocket status and notify listeners
  void _updateStatus(WebSocketStatus status) {
    _status = status;
    _statusUpdateController.add(status);
  }
  
  // Start reconnection timer
  void _startReconnectTimer() {
    _stopReconnectTimer();
    
    _updateStatus(WebSocketStatus.reconnecting);
    
    _reconnectTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      connect();
    });
  }
  
  // Stop reconnection timer
  void _stopReconnectTimer() {
    if (_reconnectTimer != null) {
      _reconnectTimer!.cancel();
      _reconnectTimer = null;
    }
  }
  
  // Start heartbeat to keep connection alive
  void _startHeartbeat() {
    _stopHeartbeat();
    
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      if (_status == WebSocketStatus.connected && _channel != null) {
        _channel!.sink.add(jsonEncode({
          'type': 'ping',
        }));
      }
    });
  }
  
  // Stop heartbeat timer
  void _stopHeartbeat() {
    if (_heartbeatTimer != null) {
      _heartbeatTimer!.cancel();
      _heartbeatTimer = null;
    }
  }
  
  // Dispose resources
  void dispose() {
    disconnect();
    
    _messageController.close();
    _statusUpdateController.close();
    _typingController.close();
    _deliveredController.close();
    _readController.close();
  }
}