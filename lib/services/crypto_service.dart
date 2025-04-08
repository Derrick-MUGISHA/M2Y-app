import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:pointycastle/export.dart';
import 'package:pointycastle/asymmetric/api.dart';
import 'package:pointycastle/key_generators/api.dart';
import 'package:pointycastle/key_generators/rsa_key_generator.dart';
import 'package:pointycastle/random/fortuna_random.dart';

class KeyPair {
  final Map<String, dynamic> privateKey;
  final Map<String, dynamic> publicKey;

  KeyPair({required this.privateKey, required this.publicKey});
}

class CryptoService {
  // Generate RSA key pair for E2E encryption
  Future<KeyPair> generateKeyPair() async {
    try {
      // Generate RSA key pair
      final keyPair = await compute(_generateRSAKeyPair, 2048);
      final publicKey = keyPair.publicKey as RSAPublicKey;
      final privateKey = keyPair.privateKey as RSAPrivateKey;

      // Convert to Map for JSON serialization
      final publicKeyMap = {
        'n': publicKey.modulus.toString(),
        'e': publicKey.exponent.toString(),
      };

      final privateKeyMap = {
        'n': privateKey.modulus.toString(),
        'p': privateKey.p.toString(),
        'q': privateKey.q.toString(),
        'd': privateKey.privateExponent.toString(),
      };

      return KeyPair(
        publicKey: publicKeyMap,
        privateKey: privateKeyMap,
      );
    } catch (e) {
      throw Exception('Failed to generate key pair: ${e.toString()}');
    }
  }

  // Encrypt message using recipient's public key
  Future<String> encryptMessage(String message, Map<String, dynamic> publicKeyMap) async {
    try {
      // Convert public key map to RSAPublicKey
      final publicKey = RSAPublicKey(
        BigInt.parse(publicKeyMap['n']),
        BigInt.parse(publicKeyMap['e']),
      );

      // Use AES for content encryption and RSA for key exchange (hybrid encryption)
      final aesKey = _generateRandomAESKey(32); // 256 bits
      final iv = _generateRandomIV(16);
      
      // Encrypt the message with AES
      final encryptedContent = _encryptWithAES(
        utf8.encode(message),
        aesKey,
        iv,
      );
      
      // Encrypt the AES key with RSA
      final cipher = PKCS1Encoding(RSAEngine())
        ..init(true, PublicKeyParameter<RSAPublicKey>(publicKey));
      
      final encryptedKey = cipher.process(Uint8List.fromList(aesKey));

      // Combine everything for transmission
      final result = {
        'key': base64Encode(encryptedKey),
        'iv': base64Encode(iv),
        'content': base64Encode(encryptedContent),
      };

      return jsonEncode(result);
    } catch (e) {
      throw Exception('Failed to encrypt message: ${e.toString()}');
    }
  }

  // Decrypt message using user's private key
  Future<String> decryptMessage(String encryptedMessage, Map<String, dynamic> privateKeyMap) async {
    try {
      // Parse encrypted message JSON
      final encryptedData = jsonDecode(encryptedMessage);
      
      // Extract components
      final encryptedKey = base64Decode(encryptedData['key']);
      final iv = base64Decode(encryptedData['iv']);
      final encryptedContent = base64Decode(encryptedData['content']);

      // Convert private key map to RSAPrivateKey
      final privateKey = RSAPrivateKey(
        BigInt.parse(privateKeyMap['n']),
        BigInt.parse(privateKeyMap['p']),
        BigInt.parse(privateKeyMap['q']),
        BigInt.parse(privateKeyMap['d']),
      );

      // Decrypt the AES key with RSA
      final cipher = PKCS1Encoding(RSAEngine())
        ..init(false, PrivateKeyParameter<RSAPrivateKey>(privateKey));
      
      final aesKey = cipher.process(Uint8List.fromList(encryptedKey));

      // Decrypt the content with AES
      final decryptedContent = _decryptWithAES(
        encryptedContent, 
        aesKey,
        iv,
      );

      return utf8.decode(decryptedContent);
    } catch (e) {
      throw Exception('Failed to decrypt message: ${e.toString()}');
    }
  }

  // Helper function to generate random AES key
  Uint8List _generateRandomAESKey(int length) {
    final secureRandom = _getSecureRandom();
    final key = Uint8List(length);
    for (var i = 0; i < length; i++) {
      key[i] = secureRandom.nextUint8();
    }
    return key;
  }

  // Helper function to generate random IV
  Uint8List _generateRandomIV(int length) {
    final secureRandom = _getSecureRandom();
    final iv = Uint8List(length);
    for (var i = 0; i < length; i++) {
      iv[i] = secureRandom.nextUint8();
    }
    return iv;
  }

  // Helper function to get secure random generator
  SecureRandom _getSecureRandom() {
    final secureRandom = FortunaRandom();
    final seedSource = Random.secure();
    final seeds = <int>[];
    for (var i = 0; i < 32; i++) {
      seeds.add(seedSource.nextInt(255));
    }
    secureRandom.seed(KeyParameter(Uint8List.fromList(seeds)));
    return secureRandom;
  }

  // Helper function to encrypt with AES
  Uint8List _encryptWithAES(Uint8List plaintext, Uint8List key, Uint8List iv) {
    final cipher = PaddedBlockCipher('AES/CBC/PKCS7')
      ..init(
        true, 
        ParametersWithIV(KeyParameter(key), iv),
      );
    
    return cipher.process(plaintext);
  }

  // Helper function to decrypt with AES
  Uint8List _decryptWithAES(Uint8List ciphertext, Uint8List key, Uint8List iv) {
    final cipher = PaddedBlockCipher('AES/CBC/PKCS7')
      ..init(
        false, 
        ParametersWithIV(KeyParameter(key), iv),
      );
    
    return cipher.process(ciphertext);
  }
}

// Function to be run in separate isolate for performance
AsymmetricKeyPair<PublicKey, PrivateKey> _generateRSAKeyPair(int bitLength) {
  final secureRandom = FortunaRandom();
  final random = Random.secure();
  final seeds = <int>[];
  for (var i = 0; i < 32; i++) {
    seeds.add(random.nextInt(255));
  }
  secureRandom.seed(KeyParameter(Uint8List.fromList(seeds)));

  final keyGen = RSAKeyGenerator()
    ..init(ParametersWithRandom(
      RSAKeyGeneratorParameters(BigInt.from(65537), bitLength, 64),
      secureRandom,
    ));

  return keyGen.generateKeyPair();
}