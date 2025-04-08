import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/chat_provider.dart';
import '../models/chat.dart';
import '../models/user.dart';
import '../widgets/chat_list_item.dart';
import 'chat_screen.dart';
import 'profile_screen.dart';
import 'settings_screen.dart';
import 'create_group_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = false;
  String? _errorMessage;
  
  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }
  
  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
  
  // Load user chats
  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    
    try {
      final chatProvider = Provider.of<ChatProvider>(context, listen: false);
      await chatProvider.loadChats();
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load chats: ${e.toString()}';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }
  
  // Create a new chat with a user
  void _createNewChat() async {
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);
    
    // Show contact picker
    final List<User>? contacts = await chatProvider.getContacts();
    
    if (contacts == null || !mounted) {
      return;
    }
    
    // Show contact selection dialog
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('New Chat'),
          content: SizedBox(
            width: double.maxFinite,
            child: contacts.isEmpty
                ? const Center(
                    child: Text('No contacts found'),
                  )
                : ListView.builder(
                    shrinkWrap: true,
                    itemCount: contacts.length,
                    itemBuilder: (context, index) {
                      final contact = contacts[index];
                      return ListTile(
                        leading: CircleAvatar(
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
                        title: Text(contact.nickname ?? contact.phoneNumber),
                        onTap: () async {
                          Navigator.pop(context);
                          try {
                            final chat = await chatProvider.createChat(contact.id);
                            if (mounted) {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => ChatScreen(chat: chat),
                                ),
                              );
                            }
                          } catch (e) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Failed to create chat: ${e.toString()}'),
                              ),
                            );
                          }
                        },
                      );
                    },
                  ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('M2You'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              // TODO: Implement search functionality
            },
          ),
          PopupMenuButton<String>(
            onSelected: (value) {
              switch (value) {
                case 'profile':
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const ProfileScreen(),
                    ),
                  );
                  break;
                case 'settings':
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const SettingsScreen(),
                    ),
                  );
                  break;
                case 'logout':
                  Provider.of<AuthProvider>(context, listen: false).logout();
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'profile',
                child: ListTile(
                  leading: Icon(Icons.person),
                  title: Text('Profile'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              const PopupMenuItem(
                value: 'settings',
                child: ListTile(
                  leading: Icon(Icons.settings),
                  title: Text('Settings'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              const PopupMenuItem(
                value: 'logout',
                child: ListTile(
                  leading: Icon(Icons.logout),
                  title: Text('Logout'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Chats'),
            Tab(text: 'Groups'),
          ],
        ),
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
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      // Chats tab
                      Consumer<ChatProvider>(
                        builder: (context, chatProvider, _) {
                          final chats = chatProvider.chats
                              .where((chat) => !chat.isGroup)
                              .toList();
                          
                          if (chats.isEmpty) {
                            return const Center(
                              child: Text('No chats yet. Start a new conversation.'),
                            );
                          }
                          
                          return ListView.builder(
                            itemCount: chats.length,
                            itemBuilder: (context, index) {
                              final chat = chats[index];
                              return ChatListItem(
                                chat: chat,
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => ChatScreen(chat: chat),
                                    ),
                                  );
                                },
                              );
                            },
                          );
                        },
                      ),
                      
                      // Groups tab
                      Consumer<ChatProvider>(
                        builder: (context, chatProvider, _) {
                          final groups = chatProvider.chats
                              .where((chat) => chat.isGroup)
                              .toList();
                          
                          if (groups.isEmpty) {
                            return const Center(
                              child: Text('No groups yet. Create or join a group.'),
                            );
                          }
                          
                          return ListView.builder(
                            itemCount: groups.length,
                            itemBuilder: (context, index) {
                              final group = groups[index];
                              return ChatListItem(
                                chat: group,
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => ChatScreen(chat: group),
                                    ),
                                  );
                                },
                              );
                            },
                          );
                        },
                      ),
                    ],
                  ),
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          if (_tabController.index == 0) {
            // New chat
            _createNewChat();
          } else {
            // New group
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const CreateGroupScreen(),
              ),
            );
          }
        },
        child: Icon(
          _tabController.index == 0 ? Icons.chat : Icons.group_add,
        ),
      ),
    );
  }
}