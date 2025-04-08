import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import '../models/chat.dart';
import '../models/message.dart';
import '../models/user.dart';
import '../providers/auth_provider.dart';
import '../providers/message_provider.dart';
import '../widgets/chat_bubble.dart';
import '../widgets/message_input.dart';
import 'group_screen.dart';


class ChatScreen extends StatefulWidget {
  final Chat chat;
  
  const ChatScreen({
    Key? key,
    required this.chat,
  }) : super(key: key);

  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _messageController = TextEditingController();
  bool _isLoading = false;
  bool _isSending = false;
  String? _errorMessage;
  User? _currentUser;
  
  @override
  void initState() {
    super.initState();
    _loadData();
  }
  
  @override
  void dispose() {
    _scrollController.dispose();
    _messageController.dispose();
    super.dispose();
  }
  
  // Load messages and current user
  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    
    try {
      // Get current user
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      _currentUser = await authProvider.getCurrentUser();
      
      // Load messages
      final messageProvider = Provider.of<MessageProvider>(context, listen: false);
      await messageProvider.loadMessages(widget.chat.id);
      
      // Mark messages as read
      messageProvider.markMessagesAsRead(widget.chat.id);
      
      // Scroll to bottom after loading
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load messages: ${e.toString()}';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }
  
  // Send text message
  Future<void> _sendTextMessage(String text) async {
    if (text.trim().isEmpty) return;
    
    setState(() {
      _isSending = true;
    });
    
    try {
      final messageProvider = Provider.of<MessageProvider>(context, listen: false);
      
      if (widget.chat.isGroup) {
        await messageProvider.sendGroupMessage(
          groupId: widget.chat.id,
          content: text,
        );
      } else {
        final receiver = widget.chat.getOtherParticipant(_currentUser!.id);
        await messageProvider.sendMessage(
          receiverId: receiver.id,
          content: text,
        );
      }
      
      _messageController.clear();
      
      // Scroll to bottom after sending
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to send message: ${e.toString()}'),
        ),
      );
    } finally {
      setState(() {
        _isSending = false;
      });
    }
  }
  
  // Pick and send image
  Future<void> _sendImage() async {
    final ImagePicker picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.gallery);
    
    if (image == null) return;
    
    setState(() {
      _isSending = true;
    });
    
    try {
      final messageProvider = Provider.of<MessageProvider>(context, listen: false);
      final file = File(image.path);
      
      if (widget.chat.isGroup) {
        await messageProvider.sendGroupMedia(
          groupId: widget.chat.id,
          media: file,
          type: MessageType.image,
        );
      } else {
        final receiver = widget.chat.getOtherParticipant(_currentUser!.id);
        await messageProvider.sendMedia(
          receiverId: receiver.id,
          media: file,
          type: MessageType.image,
        );
      }
      
      // Scroll to bottom after sending
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to send image: ${e.toString()}'),
        ),
      );
    } finally {
      setState(() {
        _isSending = false;
      });
    }
  }
  
  // Pick and send document
  Future<void> _sendDocument() async {
    final result = await FilePicker.platform.pickFiles();
    
    if (result == null || result.files.isEmpty) return;
    
    setState(() {
      _isSending = true;
    });
    
    try {
      final messageProvider = Provider.of<MessageProvider>(context, listen: false);
      final file = File(result.files.first.path!);
      
      if (widget.chat.isGroup) {
        await messageProvider.sendGroupMedia(
          groupId: widget.chat.id,
          media: file,
          type: MessageType.document,
        );
      } else {
        final receiver = widget.chat.getOtherParticipant(_currentUser!.id);
        await messageProvider.sendMedia(
          receiverId: receiver.id,
          media: file,
          type: MessageType.document,
        );
      }
      
      // Scroll to bottom after sending
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to send document: ${e.toString()}'),
        ),
      );
    } finally {
      setState(() {
        _isSending = false;
      });
    }
  }
  
  // Show message options (delete, etc.)
  void _showMessageOptions(Message message) {
    if (_currentUser == null || message.senderId != _currentUser!.id) {
      return;
    }
    
    showModalBottomSheet(
      context: context,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.delete),
                title: const Text('Delete for me'),
                onTap: () async {
                  Navigator.pop(context);
                  try {
                    final messageProvider = Provider.of<MessageProvider>(context, listen: false);
                    await messageProvider.deleteMessage(message.id, false);
                  } catch (e) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Failed to delete message: ${e.toString()}'),
                      ),
                    );
                  }
                },
              ),
              ListTile(
                leading: const Icon(Icons.delete_forever),
                title: const Text('Delete for everyone'),
                onTap: () async {
                  Navigator.pop(context);
                  try {
                    final messageProvider = Provider.of<MessageProvider>(context, listen: false);
                    await messageProvider.deleteMessage(message.id, true);
                  } catch (e) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Failed to delete message: ${e.toString()}'),
                      ),
                    );
                  }
                },
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final otherUser = _currentUser != null && !widget.chat.isGroup
        ? widget.chat.getOtherParticipant(_currentUser!.id)
        : null;
    
    return Scaffold(
      appBar: AppBar(
        title: widget.chat.isGroup
            ? Text(widget.chat.name ?? 'Group Chat')
            : Text(otherUser?.nickname ?? otherUser?.phoneNumber ?? ''),
        actions: [
          if (widget.chat.isGroup)
            IconButton(
              icon: const Icon(Icons.group),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => GroupScreen(chatId: widget.chat.id),
                  ),
                );
              },
            ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Chat messages
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _errorMessage != null
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                _errorMessage!,
                                textAlign: TextAlign.center,
                                style: const TextStyle(color: Colors.red),
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: _loadData,
                                child: const Text('Retry'),
                              ),
                            ],
                          ),
                        )
                      : Consumer<MessageProvider>(
                          builder: (context, messageProvider, _) {
                            final messages = messageProvider.getMessagesForChat(widget.chat.id);
                            
                            if (messages.isEmpty) {
                              return const Center(
                                child: Text('No messages yet. Start a conversation.'),
                              );
                            }
                            
                            WidgetsBinding.instance.addPostFrameCallback((_) {
                              if (_scrollController.hasClients && 
                                  _scrollController.position.maxScrollExtent > 0) {
                                _scrollController.animateTo(
                                  _scrollController.position.maxScrollExtent,
                                  duration: const Duration(milliseconds: 300),
                                  curve: Curves.easeOut,
                                );
                              }
                            });
                            
                            return ListView.builder(
                              controller: _scrollController,
                              padding: const EdgeInsets.all(16),
                              itemCount: messages.length,
                              itemBuilder: (context, index) {
                                final message = messages[index];
                                final isCurrentUser = _currentUser != null && 
                                    message.senderId == _currentUser!.id;
                                
                                return ChatBubble(
                                  message: message,
                                  isCurrentUser: isCurrentUser,
                                  onLongPress: () => _showMessageOptions(message),
                                );
                              },
                            );
                          },
                        ),
            ),
            
            // Message input
            MessageInput(
              controller: _messageController,
              isSending: _isSending,
              onSendPressed: _sendTextMessage,
              onAttachmentPressed: () {
                showModalBottomSheet(
                  context: context,
                  builder: (context) {
                    return SafeArea(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          ListTile(
                            leading: const Icon(Icons.image),
                            title: const Text('Image'),
                            onTap: () {
                              Navigator.pop(context);
                              _sendImage();
                            },
                          ),
                          ListTile(
                            leading: const Icon(Icons.insert_drive_file),
                            title: const Text('Document'),
                            onTap: () {
                              Navigator.pop(context);
                              _sendDocument();
                            },
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}