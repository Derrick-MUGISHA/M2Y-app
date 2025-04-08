import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  _SettingsScreenState createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _notificationsEnabled = true;
  bool _showPreviewsInNotifications = false;
  ThemeMode _themeMode = ThemeMode.system;
  
  @override
  void initState() {
    super.initState();
    // Load settings from shared preferences
    // For now, we'll use default values
  }
  
  // Show theme selection dialog
  void _showThemeSelector() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Theme'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              RadioListTile<ThemeMode>(
                title: const Text('System Default'),
                value: ThemeMode.system,
                groupValue: _themeMode,
                onChanged: (value) {
                  Navigator.pop(context);
                  setState(() {
                    _themeMode = value!;
                  });
                },
              ),
              RadioListTile<ThemeMode>(
                title: const Text('Light'),
                value: ThemeMode.light,
                groupValue: _themeMode,
                onChanged: (value) {
                  Navigator.pop(context);
                  setState(() {
                    _themeMode = value!;
                  });
                },
              ),
              RadioListTile<ThemeMode>(
                title: const Text('Dark'),
                value: ThemeMode.dark,
                groupValue: _themeMode,
                onChanged: (value) {
                  Navigator.pop(context);
                  setState(() {
                    _themeMode = value!;
                  });
                },
              ),
            ],
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
  
  // Show logout confirmation dialog
  void _showLogoutConfirmation() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Logout'),
          content: const Text('Are you sure you want to logout?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                Provider.of<AuthProvider>(context, listen: false).logout();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
              ),
              child: const Text('Logout'),
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
        title: const Text('Settings'),
      ),
      body: ListView(
        children: [
          // Notifications section
          ListTile(
            title: const Text(
              'Notifications',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            tileColor: Colors.grey[100],
          ),
          SwitchListTile(
            title: const Text('Enable Notifications'),
            subtitle: const Text('Receive push notifications for new messages'),
            value: _notificationsEnabled,
            onChanged: (value) {
              setState(() {
                _notificationsEnabled = value;
              });
            },
          ),
          SwitchListTile(
            title: const Text('Message Previews'),
            subtitle: const Text('Show message content in notifications'),
            value: _showPreviewsInNotifications,
            onChanged: _notificationsEnabled
                ? (value) {
                    setState(() {
                      _showPreviewsInNotifications = value;
                    });
                  }
                : null,
          ),
          
          // Appearance section
          ListTile(
            title: const Text(
              'Appearance',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            tileColor: Colors.grey[100],
          ),
          ListTile(
            title: const Text('Theme'),
            subtitle: Text(
              _themeMode == ThemeMode.system
                  ? 'System Default'
                  : _themeMode == ThemeMode.light
                      ? 'Light'
                      : 'Dark',
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: _showThemeSelector,
          ),
          
          // Privacy section
          ListTile(
            title: const Text(
              'Privacy',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            tileColor: Colors.grey[100],
          ),
          ListTile(
            title: const Text('Two-Factor Authentication'),
            subtitle: const Text('Enhance account security'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('This feature is coming soon'),
                ),
              );
            },
          ),
          ListTile(
            title: const Text('Blocked Users'),
            subtitle: const Text('Manage users you\'ve blocked'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('This feature is coming soon'),
                ),
              );
            },
          ),
          
          // Account section
          ListTile(
            title: const Text(
              'Account',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            tileColor: Colors.grey[100],
          ),
          ListTile(
            title: const Text('Change Phone Number'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('This feature is coming soon'),
                ),
              );
            },
          ),
          ListTile(
            title: const Text('Delete Account'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('This feature is coming soon'),
                ),
              );
            },
          ),
          
          // About section
          ListTile(
            title: const Text(
              'About',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            tileColor: Colors.grey[100],
          ),
          ListTile(
            title: const Text('Privacy Policy'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Privacy policy will be displayed here'),
                ),
              );
            },
          ),
          ListTile(
            title: const Text('Terms of Service'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Terms of service will be displayed here'),
                ),
              );
            },
          ),
          ListTile(
            title: const Text('App Version'),
            subtitle: const Text('1.0.0'),
          ),
          
          // Logout
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: ElevatedButton(
              onPressed: _showLogoutConfirmation,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
              ),
              child: const Text('Logout'),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}