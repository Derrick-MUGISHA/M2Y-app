import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../models/user.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  _ProfileScreenState createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _isLoading = false;
  bool _isSaving = false;
  String? _errorMessage;
  User? _user;
  
  final _formKey = GlobalKey<FormState>();
  final _nicknameController = TextEditingController();
  final _statusController = TextEditingController();
  
  @override
  void initState() {
    super.initState();
    _loadUserData();
  }
  
  @override
  void dispose() {
    _nicknameController.dispose();
    _statusController.dispose();
    super.dispose();
  }
  
  // Load user data
  Future<void> _loadUserData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      _user = await authProvider.getCurrentUser();
      
      if (_user != null) {
        _nicknameController.text = _user!.nickname ?? '';
        _statusController.text = _user!.status ?? '';
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load profile: ${e.toString()}';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }
  
  // Save profile changes
  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    
    setState(() {
      _isSaving = true;
    });
    
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      
      final nickname = _nicknameController.text.trim().isNotEmpty
          ? _nicknameController.text.trim()
          : null;
      
      final status = _statusController.text.trim().isNotEmpty
          ? _statusController.text.trim()
          : null;
      
      await authProvider.updateProfile(
        nickname: nickname,
        status: status,
      );
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Profile updated successfully'),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to update profile: ${e.toString()}'),
        ),
      );
    } finally {
      setState(() {
        _isSaving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
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
                        onPressed: _loadUserData,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : _user == null
                  ? const Center(child: Text('User not found'))
                  : SingleChildScrollView(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        children: [
                          // Profile picture
                          CircleAvatar(
                            radius: 60,
                            backgroundColor: Theme.of(context).primaryColor,
                            child: _user!.profileImage == null
                                ? Text(
                                    _user!.nickname?.substring(0, 1).toUpperCase() ??
                                        _user!.phoneNumber.substring(0, 1),
                                    style: const TextStyle(
                                      fontSize: 40,
                                      color: Colors.white,
                                    ),
                                  )
                                : null,
                            backgroundImage: _user!.profileImage != null
                                ? NetworkImage(_user!.profileImage!)
                                : null,
                          ),
                          const SizedBox(height: 8),
                          
                          // Change picture button (disabled for now)
                          TextButton(
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Profile picture change is not available yet'),
                                ),
                              );
                            },
                            child: const Text('Change Profile Picture'),
                          ),
                          const SizedBox(height: 32),
                          
                          // Profile form
                          Form(
                            key: _formKey,
                            child: Column(
                              children: [
                                // Phone number (read-only)
                                TextFormField(
                                  initialValue: _user!.phoneNumber,
                                  decoration: const InputDecoration(
                                    labelText: 'Phone Number',
                                    prefixIcon: Icon(Icons.phone),
                                  ),
                                  readOnly: true,
                                  enabled: false,
                                ),
                                const SizedBox(height: 16),
                                
                                // Nickname
                                TextFormField(
                                  controller: _nicknameController,
                                  decoration: const InputDecoration(
                                    labelText: 'Nickname',
                                    hintText: 'Enter a nickname',
                                    prefixIcon: Icon(Icons.person),
                                  ),
                                  validator: (value) {
                                    if (value != null && value.length > 30) {
                                      return 'Nickname must be less than 30 characters';
                                    }
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 16),
                                
                                // Status
                                TextFormField(
                                  controller: _statusController,
                                  decoration: const InputDecoration(
                                    labelText: 'Status',
                                    hintText: 'What\'s on your mind?',
                                    prefixIcon: Icon(Icons.info),
                                  ),
                                  maxLength: 100,
                                  maxLines: 2,
                                ),
                                const SizedBox(height: 24),
                                
                                // Save button
                                SizedBox(
                                  width: double.infinity,
                                  child: ElevatedButton(
                                    onPressed: _isSaving ? null : _saveProfile,
                                    child: _isSaving
                                        ? const SizedBox(
                                            height: 20,
                                            width: 20,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              color: Colors.white,
                                            ),
                                          )
                                        : const Text('Save Changes'),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
    );
  }
}