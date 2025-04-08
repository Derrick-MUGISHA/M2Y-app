import 'package:flutter/material.dart';
import '../models/group.dart';

class GroupListItem extends StatelessWidget {
  final GroupMember member;
  final bool isCurrentUser;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  
  const GroupListItem({
    Key? key,
    required this.member,
    this.isCurrentUser = false,
    this.onTap,
    this.onLongPress,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Display name - use nickname in group if available, otherwise user's nickname or phone
    final displayName = member.nickname ?? 
        member.user.nickname ?? 
        member.user.phoneNumber;
    
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: Stack(
        children: [
          CircleAvatar(
            radius: 24,
            backgroundColor: isCurrentUser
                ? Theme.of(context).primaryColor
                : Colors.teal.shade400,
            child: member.user.profileImage == null
                ? Text(
                    displayName.substring(0, 1).toUpperCase(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                    ),
                  )
                : null,
            backgroundImage: member.user.profileImage != null
                ? NetworkImage(member.user.profileImage!)
                : null,
          ),
          if (!member.isVisible)
            Positioned(
              right: 0,
              bottom: 0,
              child: Container(
                padding: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: Colors.white,
                    width: 1.5,
                  ),
                ),
                child: const Icon(
                  Icons.visibility_off,
                  size: 14,
                  color: Colors.grey,
                ),
              ),
            ),
        ],
      ),
      title: Row(
        children: [
          Expanded(
            child: Text(
              displayName,
              style: TextStyle(
                fontWeight: isCurrentUser
                    ? FontWeight.bold
                    : FontWeight.normal,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (member.role == GroupMemberRole.admin)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.blue.shade100,
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Text(
                'Admin',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.blue,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
        ],
      ),
      subtitle: member.user.phoneNumber != displayName
          ? Text(member.user.phoneNumber)
          : member.user.status != null
              ? Text(
                  member.user.status!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                )
              : null,
      trailing: onTap != null
          ? const Icon(Icons.arrow_forward_ios, size: 16)
          : null,
      onTap: onTap,
      onLongPress: onLongPress,
    );
  }
}