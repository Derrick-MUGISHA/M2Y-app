import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/chat_provider.dart';
import '../models/user.dart';
import '../screens/chat_screen.dart';

class CreateGroupScreen extends StatefulWidget {
  const CreateGroupScreen({Key? key}) : super(key: key);

  @override
  _CreateGroupScreenState createState() => _CreateGroupScreenState();
}

class _CreateGroupScreenState extends State<CreateGroupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  
  List<User> _availableContacts = [];
  final Set<User> _selectedContacts = {};
  
  bool _isPrivate = true;
  bool _allowAnonymousMessages = false;
  int? _messageExpiryTime;
  
  bool _isLoading = false;
  bool _isCreating = false;
  String? _errorMessage;
  
  @override
  void initState() {
    super.initState();
    _loadContacts();
  }
  
  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }
  
  // Load available contacts
  Future<void> _loadContacts() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    
    try {
      final chatProvider = Provider.of<ChatProvider>(context, listen: false);
      final contacts = await chatProvider.getContacts();
      
      setState(() {
        _availableContacts = contacts;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load contacts: ${e.toString()}';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }
  
  // Toggle contact selection
  void _toggleContactSelection(User contact) {
    setState(() {
      if (_selectedContacts.contains(contact)) {
        _selectedContacts.remove(contact);
      } else {
        _selectedContacts.add(contact);
      }
    });
  }
  
  // Create group
  Future<void> _createGroup() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    
    if (_selectedContacts.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select at least one contact'),
        ),
      );
      return;
    }
    
    setState(() {
      _isCreating = true;
    });
    
    try {
      final chatProvider = Provider.of<ChatProvider>(context, listen: false);
      
      final group = await chatProvider.createGroup(
        name: _nameController.text.trim(),
        description: _descriptionController.text.trim().isNotEmpty
            ? _descriptionController.text.trim()
            : null,
        memberIds: _selectedContacts.map((contact) => contact.id).toList(),
        isPrivate: _isPrivate,
        allowAnonymousMessages: _allowAnonymousMessages,
        messageExpiryTime: _messageExpiryTime,
      );
      
      // Navigate to chat screen with the new group
      if (mounted) {
        Navigator.popUntil(context, (route) => route.isFirst);
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ChatScreen(chat: group),
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to create group: ${e.toString()}'),
        ),
      );
    } finally {
      setState(() {
        _isCreating = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('New Group'),
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
                        onPressed: _loadContacts,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : _availableContacts.isEmpty
                  ? const Center(
                      child: Text('No contacts available. Add some contacts first.'),
                    )
                  : SingleChildScrollView(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Group info
                              TextFormField(
                                controller: _nameController,
                                decoration: const InputDecoration(
                                  labelText: 'Group Name *',
                                  hintText: 'Enter a name for your group',
                                ),
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return 'Please enter a group name';
                                  }
                                  if (value.length > 50) {
                                    return 'Group name must be less than 50 characters';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 16),
                              TextFormField(
                                controller: _descriptionController,
                                decoration: const InputDecoration(
                                  labelText: 'Description (Optional)',
                                  hintText: 'What\'s this group about?',
                                ),
                                maxLines: 2,
                                maxLength: 200,
                              ),
                              const SizedBox(height: 16),
                              
                              // Group settings
                              const Text(
                                'Group Settings',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              const SizedBox(height: 8),
                              SwitchListTile(
                                title: const Text('Private Group'),
                                subtitle: const Text('Only invited members can join'),
                                value: _isPrivate,
                                onChanged: (value) {
                                  setState(() {
                                    _isPrivate = value;
                                  });
                                },
                              ),
                              SwitchListTile(
                                title: const Text('Allow Anonymous Messages'),
                                subtitle: const Text('Members can send messages without revealing their identity'),
                                value: _allowAnonymousMessages,
                                onChanged: (value) {
                                  setState(() {
                                    _allowAnonymousMessages = value;
                                  });
                                },
                              ),
                              const SizedBox(height: 8),
                              DropdownButtonFormField<int?>(
                                decoration: const InputDecoration(
                                  labelText: 'Message Expiry Time',
                                ),
                                hint: const Text('When messages should disappear'),
                                value: _messageExpiryTime,
                                items: const [
                                  DropdownMenuItem(
                                    value: null,
                                    child: Text('No expiry'),
                                  ),
                                  DropdownMenuItem(
                                    value: 3600,
                                    child: Text('1 hour'),
                                  ),
                                  DropdownMenuItem(
                                    value: 86400,
                                    child: Text('24 hours'),
                                  ),
                                  DropdownMenuItem(
                                    value: 604800,
                                    child: Text('7 days'),
                                  ),
                                ],
                                onChanged: (value) {
                                  setState(() {
                                    _messageExpiryTime = value;
                                  });
                                },
                              ),
                              const SizedBox(height: 24),
                              
                              // Contacts selection
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Add Participants',
                                    style: Theme.of(context).textTheme.titleMedium,
                                  ),
                                  Text(
                                    '${_selectedContacts.length} selected',
                                    style: TextStyle(
                                      color: Colors.grey[600],
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              
                              // Selected contacts chips
                              if (_selectedContacts.isNotEmpty)
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: _selectedContacts.map((contact) {
                                    return Chip(
                                      avatar: CircleAvatar(
                                        backgroundColor: Theme.of(context).primaryColor,
                                        child: contact.profileImage == null
                                            ? Text(
                                                contact.nickname?.substring(0, 1).toUpperCase() ??
                                                    contact.phoneNumber.substring(0, 1),
                                                style: const TextStyle(color: Colors.white),
                                              )
                                            : null,
                                        backgroundImage: contact.profileImage != null
                                            ? NetworkImage(contact.profileImage!)
                                            : null,
                                      ),
                                      label: Text(contact.nickname ?? contact.phoneNumber),
                                      deleteIcon: const Icon(Icons.close, size: 18),
                                      onDeleted: () => _toggleContactSelection(contact),
                                    );
                                  }).toList(),
                                ),
                              
                              const SizedBox(height: 16),
                              const Divider(),
                              
                              // Available contacts list
                              ListView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: _availableContacts.length,
                                itemBuilder: (context, index) {
                                  final contact = _availableContacts[index];
                                  final isSelected = _selectedContacts.contains(contact);
                                  
                                  return CheckboxListTile(
                                    title: Text(contact.nickname ?? contact.phoneNumber),
                                    subtitle: Text(contact.phoneNumber),
                                    secondary: CircleAvatar(
                                      backgroundColor: Theme.of(context).primaryColor,
                                      child: contact.profileImage == null
                                          ? Text(
                                              contact.nickname?.substring(0, 1).toUpperCase() ??
                                                  contact.phoneNumber.substring(0, 1),
                                              style: const TextStyle(color: Colors.white),
                                            )
                                          : null,
                                      backgroundImage: contact.profileImage != null
                                          ? NetworkImage(contact.profileImage!)
                                          : null,
                                    ),
                                    value: isSelected,
                                    onChanged: (value) => _toggleContactSelection(contact),
                                  );
                                },
                              ),
                              
                              const SizedBox(height: 32),
                              
                              // Create button
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  onPressed: _isCreating ? null : _createGroup,
                                  child: _isCreating
                                      ? const SizedBox(
                                          height: 20,
                                          width: 20,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            color: Colors.white,
                                          ),
                                        )
                                      : const Text('Create Group'),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
    );
  }
}