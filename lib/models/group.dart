import 'user.dart';

enum GroupMemberRole {
  admin,
  member,
}

class GroupMember {
  final User user;
  final GroupMemberRole role;
  final String? nickname; // Custom nickname in this group
  final bool isVisible; // If false, member is "invisible" (privacy feature)
  final DateTime joinedAt;

  GroupMember({
    required this.user,
    required this.role,
    this.nickname,
    this.isVisible = true,
    required this.joinedAt,
  });

  factory GroupMember.fromJson(Map<String, dynamic> json) {
    return GroupMember(
      user: User.fromJson(json['user']),
      role: GroupMemberRole.values.firstWhere(
        (e) => e.toString() == 'GroupMemberRole.${json['role']}',
        orElse: () => GroupMemberRole.member,
      ),
      nickname: json['nickname'],
      isVisible: json['isVisible'] ?? true,
      joinedAt: DateTime.parse(json['joinedAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user': user.toJson(),
      'role': role.toString().split('.').last,
      'nickname': nickname,
      'isVisible': isVisible,
      'joinedAt': joinedAt.toIso8601String(),
    };
  }
}

class Group {
  final String id;
  final String name;
  final String? description;
  final String? image;
  final List<GroupMember> members;
  final bool isPrivate;
  final bool allowAnonymousMessages;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int? messageExpiryTime; // Time in seconds for messages to expire

  Group({
    required this.id,
    required this.name,
    this.description,
    this.image,
    required this.members,
    required this.isPrivate,
    this.allowAnonymousMessages = false,
    required this.createdAt,
    required this.updatedAt,
    this.messageExpiryTime,
  });

  factory Group.fromJson(Map<String, dynamic> json) {
    return Group(
      id: json['_id'] ?? json['id'],
      name: json['name'],
      description: json['description'],
      image: json['image'],
      members: (json['members'] as List)
          .map((member) => GroupMember.fromJson(member))
          .toList(),
      isPrivate: json['isPrivate'] ?? true,
      allowAnonymousMessages: json['allowAnonymousMessages'] ?? false,
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
      messageExpiryTime: json['messageExpiryTime'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'image': image,
      'members': members.map((member) => member.toJson()).toList(),
      'isPrivate': isPrivate,
      'allowAnonymousMessages': allowAnonymousMessages,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'messageExpiryTime': messageExpiryTime,
    };
  }

  List<GroupMember> get admins {
    return members.where((member) => member.role == GroupMemberRole.admin).toList();
  }

  List<GroupMember> get visibleMembers {
    return members.where((member) => member.isVisible).toList();
  }

  bool isAdmin(String userId) {
    final member = members.firstWhere(
      (member) => member.user.id == userId,
      orElse: () => GroupMember(
        user: User(
          id: '',
          phoneNumber: '',
          createdAt: DateTime.now(),
          lastSeen: DateTime.now(),
          publicKey: {},
        ),
        role: GroupMemberRole.member,
        joinedAt: DateTime.now(),
      ),
    );
    return member.role == GroupMemberRole.admin;
  }

  String? getMemberNickname(String userId) {
    final member = members.firstWhere(
      (member) => member.user.id == userId,
      orElse: () => GroupMember(
        user: User(
          id: '',
          phoneNumber: '',
          createdAt: DateTime.now(),
          lastSeen: DateTime.now(),
          publicKey: {},
        ),
        role: GroupMemberRole.member,
        joinedAt: DateTime.now(),
      ),
    );
    return member.nickname;
  }
}
