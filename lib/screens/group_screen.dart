import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/group.dart';
import '../models/user.dart';
import '../providers/auth_provider.dart';
import '../providers/chat_provider.dart';
import '../widgets/group_list_item.dart';

class GroupScreen extends StatefulWidget {
  final String chatId;
  
  const GroupScreen({
    Key? key,
    required this.chatId,
  }) : super(key: key);

  @override
  _GroupScreenState createState() => _GroupScreenState();
}

class _GroupScreenState extends State<GroupScreen> {
  bool _isLoading = false;
  String? _errorMessage;
  Group? _group;
  User? _currentUser;
  
  @override
  void initState() {
    super.initState();
    _loadData();
  }
  
  // Load group data
  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    
    try {
      // Get current user
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      _currentUser = await authProvider.getCurrentUser();
      
      // Get group details
      final chatProvider = Provider.of<ChatProvider>(context, listen: false);
      _group = await chatProvider.getGroupDetails(widget.chatId);
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load group details: ${e.toString()}';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }
  
  // Update group settings
  Future<void> _updateGroupSettings() async {
    if (_group == null) return;
    
    // Show dialog with form
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) {
        String? name = _group!.name;
        String? description = _group!.description;
        bool isPrivate = _group!.isPrivate;
        bool allowAnonymousMessages = _group!.allowAnonymousMessages;
        int? messageExpiryTime = _group!.messageExpiryTime;
        
        return AlertDialog(
          title: const Text('Group Settings'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  initialValue: name,
                  decoration: const InputDecoration(
                    labelText: 'Group Name',
                  ),
                  onChanged: (value) {
                    name = value;
                  },
                ),
                TextFormField(
                  initialValue: description,
                  decoration: const InputDecoration(
                    labelText: 'Description',
                  ),
                  maxLines: 2,
                  onChanged: (value) {
                    description = value;
                  },
                ),
                const SizedBox(height: 16),
                SwitchListTile(
                  title: const Text('Private Group'),
                  subtitle: const Text('Only invited members can join'),
                  value: isPrivate,
                  onChanged: (value) {
                    isPrivate = value;
                  },
                ),
                SwitchListTile(
                  title: const Text('Allow Anonymous Messages'),
                  subtitle: const Text('Members can send messages anonymously'),
                  value: allowAnonymousMessages,
                  onChanged: (value) {
                    allowAnonymousMessages = value;
                  },
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<int?>(
                  decoration: const InputDecoration(
                    labelText: 'Message Expiry Time',
                  ),
                  value: messageExpiryTime,
                  items: [
                    const DropdownMenuItem(
                      value: null,
                      child: Text('No expiry'),
                    ),
                    const DropdownMenuItem(
                      value: 3600,
                      child: Text('1 hour'),
                    ),
                    const DropdownMenuItem(
                      value: 86400,
                      child: Text('24 hours'),
                    ),
                    const DropdownMenuItem(
                      value: 604800,
                      child: Text('7 days'),
                    ),
                  ],
                  onChanged: (value) {
                    messageExpiryTime = value;
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, {
                'name': name,
                'description': description,
                'isPrivate': isPrivate,
                'allowAnonymousMessages': allowAnonymousMessages,
                'messageExpiryTime': messageExpiryTime,
              }),
              child: const Text('Save'),
            ),
          ],
        );
      },
    );
    
    if (result == null) return;
    
    setState(() {
      _isLoading = true;
    });
    
    try {
      final chatProvider = Provider.of<ChatProvider>(context, listen: false);
      _group = await chatProvider.updateGroup(
        groupId: _group!.id,
        name: result['name'],
        description: result['description'],
        isPrivate: result['isPrivate'],
        allowAnonymousMessages: result['allowAnonymousMessages'],
        messageExpiryTime: result['messageExpiryTime'],
      );
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Group settings updated successfully'),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to update group settings: ${e.toString()}'),
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }
  
  // Add member to group
  Future<void> _addMember() async {
    if (_group == null || _currentUser == null) return;
    
    // Check if user is admin
    if (!_group!.isAdmin(_currentUser!.id)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Only admins can add new members'),
        ),
      );
      return;
    }
    
    // Get contacts
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);
    final contacts = await chatProvider.getContacts();
    
    if (contacts.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No contacts available'),
        ),
      );
      return;
    }
    
    // Filter out existing members
    final existingMemberIds = _group!.members.map((m) => m.user.id).toList();
    final availableContacts = contacts.where(
      (c) => !existingMemberIds.contains(c.id)
    ).toList();
    
    if (availableContacts.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('All contacts are already members of this group'),
        ),
      );
      return;
    }
    
    // Show contact picker
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) {
        User? selectedUser;
        String? nickname;
        bool isVisible = true;
        bool isAdmin = false;
        
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text('Add Member'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    DropdownButtonFormField<User>(
                      decoration: const InputDecoration(
                        labelText: 'Select Contact',
                      ),
                      value: selectedUser,
                      items: availableContacts.map((contact) {
                        return DropdownMenuItem(
                          value: contact,
                          child: Text(contact.nickname ?? contact.phoneNumber),
                        );
                      }).toList(),
                      onChanged: (value) {
                        setState(() {
                          selectedUser = value;
                        });
                      },
                    ),
                    const SizedBox(height: 16),
                    if (selectedUser != null) ...[
                      TextFormField(
                        decoration: const InputDecoration(
                          labelText: 'Nickname (Optional)',
                          hintText: 'Custom nickname for this group',
                        ),
                        onChanged: (value) {
                          nickname = value.isNotEmpty ? value : null;
                        },
                      ),
                      const SizedBox(height: 16),
                      SwitchListTile(
                        title: const Text('Visible to Other Members'),
                        value: isVisible,
                        onChanged: (value) {
                          setState(() {
                            isVisible = value;
                          });
                        },
                      ),
                      SwitchListTile(
                        title: const Text('Make Admin'),
                        value: isAdmin,
                        onChanged: (value) {
                          setState(() {
                            isAdmin = value;
                          });
                        },
                      ),
                    ],
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: selectedUser == null
                      ? null
                      : () => Navigator.pop(context, {
                          'userId': selectedUser!.id,
                          'nickname': nickname,
                          'isVisible': isVisible,
                          'isAdmin': isAdmin,
                        }),
                  child: const Text('Add'),
                ),
              ],
            );
          },
        );
      },
    );
    
    if (result == null) return;
    
    setState(() {
      _isLoading = true;
    });
    
    try {
      await chatProvider.addGroupMember(
        groupId: _group!.id,
        userId: result['userId'],
        nickname: result['nickname'],
        isVisible: result['isVisible'],
        isAdmin: result['isAdmin'],
      );
      
      // Reload group data
      _loadData();
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Member added successfully'),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to add member: ${e.toString()}'),
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }
  
  // Update member settings
  Future<void> _updateMember(GroupMember member) async {
    if (_group == null || _currentUser == null) return;
    
    // Check if user is admin
    if (!_group!.isAdmin(_currentUser!.id)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Only admins can update member settings'),
        ),
      );
      return;
    }
    
    // Show update form
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) {
        String? nickname = member.nickname;
        bool isVisible = member.isVisible;
        bool isAdmin = member.role == GroupMemberRole.admin;
        
        return AlertDialog(
          title: const Text('Update Member'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  member.user.nickname ?? member.user.phoneNumber,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  initialValue: nickname,
                  decoration: const InputDecoration(
                    labelText: 'Nickname',
                    hintText: 'Custom nickname for this group',
                  ),
                  onChanged: (value) {
                    nickname = value.isNotEmpty ? value : null;
                  },
                ),
                const SizedBox(height: 16),
                SwitchListTile(
                  title: const Text('Visible to Other Members'),
                  value: isVisible,
                  onChanged: (value) {
                    isVisible = value;
                  },
                ),
                SwitchListTile(
                  title: const Text('Admin'),
                  value: isAdmin,
                  onChanged: (value) {
                    isAdmin = value;
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, {
                'nickname': nickname,
                'isVisible': isVisible,
                'isAdmin': isAdmin,
              }),
              child: const Text('Save'),
            ),
          ],
        );
      },
    );
    
    if (result == null) return;
    
    setState(() {
      _isLoading = true;
    });
    
    try {
      final chatProvider = Provider.of<ChatProvider>(context, listen: false);
      await chatProvider.updateGroupMember(
        groupId: _group!.id,
        userId: member.user.id,
        nickname: result['nickname'],
        isVisible: result['isVisible'],
        isAdmin: result['isAdmin'],
      );
      
      // Reload group data
      _loadData();
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Member updated successfully'),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to update member: ${e.toString()}'),
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }
  
  // Remove member from group
  Future<void> _removeMember(GroupMember member) async {
    if (_group == null || _currentUser == null) return;
    
    // Check if user is admin
    if (!_group!.isAdmin(_currentUser!.id)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Only admins can remove members'),
        ),
      );
      return;
    }
    
    // Confirm removal
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Remove Member'),
          content: Text(
            'Are you sure you want to remove ${member.nickname ?? member.user.nickname ?? member.user.phoneNumber} from the group?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
              ),
              child: const Text('Remove'),
            ),
          ],
        );
      },
    );
    
    if (confirm != true) return;
    
    setState(() {
      _isLoading = true;
    });
    
    try {
      final chatProvider = Provider.of<ChatProvider>(context, listen: false);
      await chatProvider.removeGroupMember(
        groupId: _group!.id,
        userId: member.user.id,
      );
      
      // Reload group data
      _loadData();
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Member removed successfully'),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to remove member: ${e.toString()}'),
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }
  
  // Leave group
  Future<void> _leaveGroup() async {
    if (_group == null || _currentUser == null) return;
    
    // Confirm leaving
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Leave Group'),
          content: const Text('Are you sure you want to leave this group?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
              ),
              child: const Text('Leave'),
            ),
          ],
        );
      },
    );
    
    if (confirm != true) return;
    
    setState(() {
      _isLoading = true;
    });
    
    try {
      final chatProvider = Provider.of<ChatProvider>(context, listen: false);
      await chatProvider.leaveGroup(_group!.id);
      
      // Go back to home screen
      Navigator.of(context).popUntil((route) => route.isFirst);
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('You have left the group'),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to leave group: ${e.toString()}'),
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_group?.name ?? 'Group Info'),
        actions: [
          if (_group != null && _currentUser != null && _group!.isAdmin(_currentUser!.id))
            IconButton(
              icon: const Icon(Icons.edit),
              onPressed: _updateGroupSettings,
            ),
        ],
      ),
      body: _isLoading
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
              : _group == null
                  ? const Center(child: Text('Group not found'))
                  : SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Group info
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      CircleAvatar(
                                        radius: 30,
                                        backgroundColor: Theme.of(context).primaryColor,
                                        child: _group!.image == null
                                            ? Text(
                                                _group!.name.substring(0, 1).toUpperCase(),
                                                style: const TextStyle(
                                                  fontSize: 24,
                                                  color: Colors.white,
                                                ),
                                              )
                                            : null,
                                        backgroundImage: _group!.image != null
                                            ? NetworkImage(_group!.image!)
                                            : null,
                                      ),
                                      const SizedBox(width: 16),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              _group!.name,
                                              style: const TextStyle(
                                                fontSize: 20,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              '${_group!.members.length} members',
                                              style: TextStyle(
                                                color: Colors.grey[600],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (_group!.description != null) ...[
                                    const SizedBox(height: 16),
                                    Text(_group!.description!),
                                  ],
                                  const SizedBox(height: 16),
                                  Row(
                                    children: [
                                      Icon(
                                        _group!.isPrivate ? Icons.lock : Icons.public,
                                        size: 16,
                                        color: Colors.grey[600],
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        _group!.isPrivate ? 'Private group' : 'Public group',
                                        style: TextStyle(color: Colors.grey[600]),
                                      ),
                                      const SizedBox(width: 16),
                                      Icon(
                                        _group!.allowAnonymousMessages
                                            ? Icons.visibility_off
                                            : Icons.visibility,
                                        size: 16,
                                        color: Colors.grey[600],
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        _group!.allowAnonymousMessages
                                            ? 'Anonymous messages allowed'
                                            : 'No anonymous messages',
                                        style: TextStyle(color: Colors.grey[600]),
                                      ),
                                    ],
                                  ),
                                  if (_group!.messageExpiryTime != null) ...[
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        Icon(
                                          Icons.timer,
                                          size: 16,
                                          color: Colors.grey[600],
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          'Messages expire after ${_group!.messageExpiryTime! < 3600 ? '${_group!.messageExpiryTime! ~/ 60} minutes' : _group!.messageExpiryTime! < 86400 ? '${_group!.messageExpiryTime! ~/ 3600} hours' : '${_group!.messageExpiryTime! ~/ 86400} days'}',
                                          style: TextStyle(color: Colors.grey[600]),
                                        ),
                                      ],
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ),
                          
                          const SizedBox(height: 24),
                          
                          // Members
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Members',
                                style: Theme.of(context).textTheme.titleLarge,
                              ),
                              if (_currentUser != null && _group!.isAdmin(_currentUser!.id))
                                TextButton.icon(
                                  icon: const Icon(Icons.person_add),
                                  label: const Text('Add'),
                                  onPressed: _addMember,
                                ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: _group!.members.length,
                            itemBuilder: (context, index) {
                              final member = _group!.members[index];
                              final isCurrentUser = _currentUser != null && 
                                  member.user.id == _currentUser!.id;
                              
                              return GroupListItem(
                                member: member,
                                isCurrentUser: isCurrentUser,
                                onTap: _currentUser != null && _group!.isAdmin(_currentUser!.id) && !isCurrentUser
                                    ? () => _updateMember(member)
                                    : null,
                                onLongPress: _currentUser != null && _group!.isAdmin(_currentUser!.id) && !isCurrentUser
                                    ? () => _removeMember(member)
                                    : null,
                              );
                            },
                          ),
                          
                          const SizedBox(height: 32),
                          
                          // Leave group button
                          if (_currentUser != null)
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                icon: const Icon(Icons.exit_to_app),
                                label: const Text('Leave Group'),
                                onPressed: _leaveGroup,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.red,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
    );
  }
}