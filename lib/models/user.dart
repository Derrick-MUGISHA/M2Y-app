class User {
  final String id;
  final String phoneNumber;
  final String? nickname;
  final String? profileImage;
  final String? status;
  final DateTime createdAt;
  final DateTime lastSeen;
  final bool isOnline;
  final Map<String, dynamic> publicKey; // For E2E encryption

  User({
    required this.id,
    required this.phoneNumber,
    this.nickname,
    this.profileImage,
    this.status,
    required this.createdAt,
    required this.lastSeen,
    this.isOnline = false,
    required this.publicKey,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['_id'] ?? json['id'],
      phoneNumber: json['phoneNumber'],
      nickname: json['nickname'],
      profileImage: json['profileImage'],
      status: json['status'],
      createdAt: DateTime.parse(json['createdAt']),
      lastSeen: DateTime.parse(json['lastSeen']),
      isOnline: json['isOnline'] ?? false,
      publicKey: json['publicKey'] ?? {},
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'phoneNumber': phoneNumber,
      'nickname': nickname,
      'profileImage': profileImage,
      'status': status,
      'createdAt': createdAt.toIso8601String(),
      'lastSeen': lastSeen.toIso8601String(),
      'isOnline': isOnline,
      'publicKey': publicKey,
    };
  }

  User copyWith({
    String? id,
    String? phoneNumber,
    String? nickname,
    String? profileImage,
    String? status,
    DateTime? createdAt,
    DateTime? lastSeen,
    bool? isOnline,
    Map<String, dynamic>? publicKey,
  }) {
    return User(
      id: id ?? this.id,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      nickname: nickname ?? this.nickname,
      profileImage: profileImage ?? this.profileImage,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      lastSeen: lastSeen ?? this.lastSeen,
      isOnline: isOnline ?? this.isOnline,
      publicKey: publicKey ?? this.publicKey,
    );
  }
}
