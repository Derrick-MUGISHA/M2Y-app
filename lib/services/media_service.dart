import 'dart:io';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:path/path.dart' as path;
import 'package:http_parser/http_parser.dart';
import '../config/env.dart';
import 'storage_service.dart';

class MediaService {
  final String _baseUrl = EnvironmentConfig.apiUrl;
  final StorageService _storage = StorageService();

  Future<String> uploadImage(File file, {int? chatId}) async {
    return await _uploadMedia(file, 'image', chatId: chatId);
  }

  Future<String> uploadVideo(File file, {int? chatId}) async {
    return await _uploadMedia(file, 'video', chatId: chatId);
  }

  Future<String> uploadAudio(File file, {int? chatId}) async {
    return await _uploadMedia(file, 'audio', chatId: chatId);
  }

  Future<String> uploadDocument(File file, {int? chatId}) async {
    return await _uploadMedia(file, 'document', chatId: chatId);
  }

  Future<String> _uploadMedia(File file, String type, {int? chatId}) async {
    final token = await _storage.getAuthToken();

    final uri = Uri.parse('$_baseUrl/media/upload');
    final request = http.MultipartRequest('POST', uri);

    request.headers['Authorization'] = 'Bearer $token';

    // Add file
    final filename = path.basename(file.path);
    final contentType = _getContentType(filename, type);

    request.files.add(
      await http.MultipartFile.fromPath(
        'file',
        file.path,
        contentType: contentType,
        filename: filename,
      ),
    );

    // Add file type
    request.fields['type'] = type;

    // Add chat ID if provided
    if (chatId != null) {
      request.fields['chatId'] = chatId.toString();
    }

    final response = await request.send();
    final responseString = await response.stream.bytesToString();

    if (response.statusCode == 200) {
      final data = jsonDecode(responseString);
      return data['url'];
    } else {
      throw Exception('Failed to upload media: $responseString');
    }
  }

  MediaType _getContentType(String filename, String type) {
    final ext = path.extension(filename).toLowerCase();

    switch (type) {
      case 'image':
        if (ext == '.jpg' || ext == '.jpeg') {
          return MediaType('image', 'jpeg');
        } else if (ext == '.png') {
          return MediaType('image', 'png');
        } else if (ext == '.gif') {
          return MediaType('image', 'gif');
        } else {
          return MediaType('image', 'octet-stream');
        }
      case 'video':
        if (ext == '.mp4') {
          return MediaType('video', 'mp4');
        } else if (ext == '.mov') {
          return MediaType('video', 'quicktime');
        } else {
          return MediaType('video', 'octet-stream');
        }
      case 'audio':
        if (ext == '.mp3') {
          return MediaType('audio', 'mpeg');
        } else if (ext == '.m4a') {
          return MediaType('audio', 'mp4');
        } else if (ext == '.wav') {
          return MediaType('audio', 'wav');
        } else {
          return MediaType('audio', 'octet-stream');
        }
      case 'document':
        if (ext == '.pdf') {
          return MediaType('application', 'pdf');
        } else if (ext == '.doc' || ext == '.docx') {
          return MediaType('application', 'msword');
        } else {
          return MediaType('application', 'octet-stream');
        }
      default:
        return MediaType('application', 'octet-stream');
    }
  }

  Future<bool> deleteMedia(String mediaUrl) async {
    final token = await _storage.getAuthToken();

    final uri = Uri.parse('$_baseUrl/media/delete');
    final response = await http.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'url': mediaUrl}),
    );

    return response.statusCode == 200;
  }

  String getMediaUrl(String mediaPath) {
    return '${EnvironmentConfig.mediaUrl}/$mediaPath';
  }
}
