import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/chat.dart';
import '../models/message.dart';
import '../providers/auth_provider.dart';

class ChatListItem extends StatelessWidget {
  final Chat chat;
  final Function() onTap;
  
  const ChatListItem({
    Key? key,
    required this.chat,
    required this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<String?>(
      future: Provider.of<AuthProvider>(context, listen: false).getUserId(),
      builder: (context, snapshot) {
        final currentUserId = snapshot.data;
        
        // Chat title
        final String chatName = currentUserId != null
            ? chat.getChatName(currentUserId)
            : chat.name ?? 'Chat';
        
        // Last message preview
        String? lastMessagePreview;
        if (chat.lastMessage != null) {
          if (chat.lastMessage!.isDeleted) {
            lastMessagePreview = 'This message was deleted';
          } else if (chat.lastMessage!.expiresAt != null && chat.lastMessage!.isExpired) {
            lastMessagePreview = 'This message has expired';
          } else {
            switch (chat.lastMessage!.type) {
              case MessageType.text:
                lastMessagePreview = chat.lastMessage!.metadata?['decryptedContent'] ?? 'Encrypted message';
                break;
              case MessageType.image:
                lastMessagePreview = '📷 Image';
                break;
              case MessageType.document:
                lastMessagePreview = '📄 Document';
                break;
              case MessageType.audio:
                lastMessagePreview = '🎵 Audio';
                break;
              case MessageType.video:
                lastMessagePreview = '🎬 Video';
                break;
            }
          }
        }
        
        // Format timestamp
        String? formattedTime;
        if (chat.lastMessage != null) {
          final now = DateTime.now();
          final today = DateTime(now.year, now.month, now.day);
          final yesterday = today.subtract(const Duration(days: 1));
          final messageDate = DateTime(
            chat.lastMessage!.timestamp.year,
            chat.lastMessage!.timestamp.month,
            chat.lastMessage!.timestamp.day,
          );
          
          if (messageDate == today) {
            // Today, show time
            formattedTime = DateFormat.jm().format(chat.lastMessage!.timestamp.toLocal());
          } else if (messageDate == yesterday) {
            // Yesterday
            formattedTime = 'Yesterday';
          } else if (now.difference(messageDate).inDays < 7) {
            // Within a week, show day name
            formattedTime = DateFormat.E().format(chat.lastMessage!.timestamp.toLocal());
          } else {
            // Older, show date
            formattedTime = DateFormat.yMd().format(chat.lastMessage!.timestamp.toLocal());
          }
        }
        
        return ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          leading: CircleAvatar(
            radius: 28,
            backgroundColor: chat.isGroup
                ? Colors.teal.shade400
                : Theme.of(context).primaryColor,
            child: chat.isGroup
                ? const Icon(Icons.group, color: Colors.white, size: 24)
                : currentUserId != null && chat.participants.length > 1
                    ? Text(
                        chat.getOtherParticipant(currentUserId).nickname?.substring(0, 1).toUpperCase() ??
                            chat.getOtherParticipant(currentUserId).phoneNumber.substring(0, 1),
                        style: const TextStyle(color: Colors.white, fontSize: 20),
                      )
                    : const Icon(Icons.person, color: Colors.white),
          ),
          title: Row(
            children: [
              Expanded(
                child: Text(
                  chatName,
                  style: TextStyle(
                    fontWeight: chat.unreadCount > 0
                        ? FontWeight.bold
                        : FontWeight.normal,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (formattedTime != null)
                Text(
                  formattedTime,
                  style: TextStyle(
                    fontSize: 12,
                    color: chat.unreadCount > 0
                        ? Theme.of(context).primaryColor
                        : Colors.grey,
                  ),
                ),
            ],
          ),
          subtitle: Row(
            children: [
              if (chat.lastMessage != null && chat.lastMessage!.isAnonymous)
                Padding(
                  padding: const EdgeInsets.only(right: 4),
                  child: Icon(
                    Icons.visibility_off,
                    size: 12,
                    color: Colors.grey[600],
                  ),
                ),
              Expanded(
                child: Text(
                  lastMessagePreview ?? 'No messages yet',
                  style: TextStyle(
                    color: chat.unreadCount > 0
                        ? Colors.black87
                        : Colors.grey[600],
                    fontWeight: chat.unreadCount > 0
                        ? FontWeight.w500
                        : FontWeight.normal,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (chat.unreadCount > 0)
                Container(
                  margin: const EdgeInsets.only(left: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Theme.of(context).primaryColor,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    chat.unreadCount.toString(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
            ],
          ),
          onTap: onTap,
        );
      },
    );
  }
}