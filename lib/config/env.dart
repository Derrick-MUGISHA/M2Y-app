enum Environment {
  dev,
  prod,
}

class EnvironmentConfig {
  static Environment _environment = Environment.dev;
  static final Map<String, dynamic> _config = {
    Environment.dev: {
      'apiUrl': 'http://localhost:5000/api',
      'wsUrl': 'ws://localhost:5000/ws',
      'mediaUrl': 'http://localhost:5000/uploads',
      'callTimeout': 30, // seconds
      'reconnectInterval': 5, // seconds
      'enableDebugLogs': true,
    },
    Environment.prod: {
      'apiUrl': 'https://api.m2you.app/api',
      'wsUrl': 'wss://api.m2you.app/ws',
      'mediaUrl': 'https://api.m2you.app/uploads',
      'callTimeout': 60, // seconds
      'reconnectInterval': 5, // seconds
      'enableDebugLogs': false,
    }
  };

  static initialize(Environment env) {
    _environment = env;
  }

  static String get apiUrl => _config[_environment]['apiUrl'];
  static String get wsUrl => _config[_environment]['wsUrl'];
  static String get mediaUrl => _config[_environment]['mediaUrl'];
  static int get callTimeout => _config[_environment]['callTimeout'];
  static int get reconnectInterval => _config[_environment]['reconnectInterval'];
  static bool get enableDebugLogs => _config[_environment]['enableDebugLogs'];
  static bool get isProduction => _environment == Environment.prod;
}
