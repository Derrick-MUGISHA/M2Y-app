enum MessageType {
  text,
  image,
  document,
  audio,
  video,
}

enum MessageStatus {
  sending,
  sent,
  delivered,
  read,
  failed,
}

class Message {
  final String id;
  final String chatId;
  final String senderId;
  final String? receiverId; // Null for group messages
  final String? groupId; // Null for one-to-one messages
  final MessageType type;
  final String? encryptedContent;
  final String? mediaUrl;
  final MessageStatus status;
  final DateTime timestamp;
  final DateTime? expiresAt; // For self-destructing messages
  final bool isDeleted;
  final bool isAnonymous; // Used for anonymous messages in groups
  final Map<String, dynamic>? metadata; // Additional info for attachments

  Message({
    required this.id,
    required this.chatId,
    required this.senderId,
    this.receiverId,
    this.groupId,
    required this.type,
    this.encryptedContent,
    this.mediaUrl,
    required this.status,
    required this.timestamp,
    this.expiresAt,
    this.isDeleted = false,
    this.isAnonymous = false,
    this.metadata,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['_id'] ?? json['id'],
      chatId: json['chatId'],
      senderId: json['senderId'],
      receiverId: json['receiverId'],
      groupId: json['groupId'],
      type: MessageType.values.firstWhere(
        (e) => e.toString() == 'MessageType.${json['type']}',
        orElse: () => MessageType.text,
      ),
      encryptedContent: json['encryptedContent'],
      mediaUrl: json['mediaUrl'],
      status: MessageStatus.values.firstWhere(
        (e) => e.toString() == 'MessageStatus.${json['status']}',
        orElse: () => MessageStatus.sent,
      ),
      timestamp: DateTime.parse(json['timestamp']),
      expiresAt: json['expiresAt'] != null
          ? DateTime.parse(json['expiresAt'])
          : null,
      isDeleted: json['isDeleted'] ?? false,
      isAnonymous: json['isAnonymous'] ?? false,
      metadata: json['metadata'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'chatId': chatId,
      'senderId': senderId,
      'receiverId': receiverId,
      'groupId': groupId,
      'type': type.toString().split('.').last,
      'encryptedContent': encryptedContent,
      'mediaUrl': mediaUrl,
      'status': status.toString().split('.').last,
      'timestamp': timestamp.toIso8601String(),
      'expiresAt': expiresAt?.toIso8601String(),
      'isDeleted': isDeleted,
      'isAnonymous': isAnonymous,
      'metadata': metadata,
    };
  }

  bool get isExpired {
    if (expiresAt == null) return false;
    return DateTime.now().isAfter(expiresAt!);
  }

  bool get isMedia {
    return type != MessageType.text;
  }

  Message copyWith({
    String? id,
    String? chatId,
    String? senderId,
    String? receiverId,
    String? groupId,
    MessageType? type,
    String? encryptedContent,
    String? mediaUrl,
    MessageStatus? status,
    DateTime? timestamp,
    DateTime? expiresAt,
    bool? isDeleted,
    bool? isAnonymous,
    Map<String, dynamic>? metadata,
  }) {
    return Message(
      id: id ?? this.id,
      chatId: chatId ?? this.chatId,
      senderId: senderId ?? this.senderId,
      receiverId: receiverId ?? this.receiverId,
      groupId: groupId ?? this.groupId,
      type: type ?? this.type,
      encryptedContent: encryptedContent ?? this.encryptedContent,
      mediaUrl: mediaUrl ?? this.mediaUrl,
      status: status ?? this.status,
      timestamp: timestamp ?? this.timestamp,
      expiresAt: expiresAt ?? this.expiresAt,
      isDeleted: isDeleted ?? this.isDeleted,
      isAnonymous: isAnonymous ?? this.isAnonymous,
      metadata: metadata ?? this.metadata,
    );
  }
}
