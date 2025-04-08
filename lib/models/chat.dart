import 'user.dart';
import 'message.dart';

class Chat {
  final String id;
  final String? name; // For one-to-one chats, this might be null
  final bool isGroup;
  final List<User> participants;
  final Message? lastMessage;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int unreadCount;
  final bool isArchived;
  final bool isPinned;
  
  Chat({
    required this.id,
    this.name,
    required this.isGroup,
    required this.participants,
    this.lastMessage,
    required this.createdAt,
    required this.updatedAt,
    this.unreadCount = 0,
    this.isArchived = false,
    this.isPinned = false,
  });

  factory Chat.fromJson(Map<String, dynamic> json) {
    return Chat(
      id: json['_id'] ?? json['id'],
      name: json['name'],
      isGroup: json['isGroup'] ?? false,
      participants: (json['participants'] as List)
          .map((participant) => User.fromJson(participant))
          .toList(),
      lastMessage: json['lastMessage'] != null
          ? Message.fromJson(json['lastMessage'])
          : null,
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
      unreadCount: json['unreadCount'] ?? 0,
      isArchived: json['isArchived'] ?? false,
      isPinned: json['isPinned'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'isGroup': isGroup,
      'participants': participants.map((participant) => participant.toJson()).toList(),
      'lastMessage': lastMessage?.toJson(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'unreadCount': unreadCount,
      'isArchived': isArchived,
      'isPinned': isPinned,
    };
  }

  Chat copyWith({
    String? id,
    String? name,
    bool? isGroup,
    List<User>? participants,
    Message? lastMessage,
    DateTime? createdAt,
    DateTime? updatedAt,
    int? unreadCount,
    bool? isArchived,
    bool? isPinned,
  }) {
    return Chat(
      id: id ?? this.id,
      name: name ?? this.name,
      isGroup: isGroup ?? this.isGroup,
      participants: participants ?? this.participants,
      lastMessage: lastMessage ?? this.lastMessage,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      unreadCount: unreadCount ?? this.unreadCount,
      isArchived: isArchived ?? this.isArchived,
      isPinned: isPinned ?? this.isPinned,
    );
  }

  User getOtherParticipant(String currentUserId) {
    return participants.firstWhere((user) => user.id != currentUserId);
  }

  String getChatName(String currentUserId) {
    if (isGroup) {
      return name ?? 'Group Chat';
    } else {
      final otherUser = getOtherParticipant(currentUserId);
      return otherUser.nickname ?? otherUser.phoneNumber;
    }
  }
}
