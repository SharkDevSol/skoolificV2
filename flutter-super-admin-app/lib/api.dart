import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class Api {
  static const String base = 'https://iqra.skoolific.com/api';
  static String? token;
  static String? username;

  static Map<String, String> _headers() => {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      };

  static Future<void> load() async {
    final p = await SharedPreferences.getInstance();
    token = p.getString('sa_token');
    username = p.getString('sa_user');
  }

  static Future<String?> login(String u, String pw) async {
    try {
      final r = await http.post(
        Uri.parse('$base/super-admin/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'username': u, 'password': pw}),
      );
      if (r.statusCode == 200) {
        final j = jsonDecode(r.body);
        token = j['token'] as String?;
        username = (j['user']?['username'] ?? u).toString();
        final p = await SharedPreferences.getInstance();
        await p.setString('sa_token', token ?? '');
        await p.setString('sa_user', username ?? '');
        return null;
      }
      try {
        return (jsonDecode(r.body)['error'] ?? 'Login failed').toString();
      } catch (_) {
        return 'Login failed';
      }
    } catch (_) {
      return 'Connection error';
    }
  }

  static Future<void> logout() async {
    token = null;
    username = null;
    final p = await SharedPreferences.getInstance();
    await p.remove('sa_token');
    await p.remove('sa_user');
  }

  static Future<dynamic> getJson(String path, {Map<String, String>? params}) async {
    try {
      final uri = Uri.parse('$base$path').replace(queryParameters: params);
      final r = await http.get(uri, headers: _headers()).timeout(const Duration(seconds: 90));
      if (r.statusCode == 200) return jsonDecode(r.body);
      return null;
    } catch (_) {
      return null;
    }
  }

  static Future<Map<String, dynamic>?> get(String path, {Map<String, String>? params}) async {
    final j = await getJson(path, params: params);
    if (j is Map<String, dynamic>) {
      final d = j['data'];
      return d is Map<String, dynamic> ? d : j;
    }
    return null;
  }

  static Future<Map<String, dynamic>?> put(String path, Map<String, dynamic> body) async {
    try {
      final r = await http.put(Uri.parse('$base$path'), headers: _headers(), body: jsonEncode(body)).timeout(const Duration(seconds: 60));
      return jsonDecode(r.body) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  static Future<Map<String, dynamic>?> post(String path, [Map<String, dynamic>? body]) async {
    try {
      final r = await http.post(Uri.parse('$base$path'), headers: _headers(), body: jsonEncode(body ?? {})).timeout(const Duration(seconds: 120));
      return jsonDecode(r.body) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  static Future<void> registerDevice(String fcmToken) async {
    try {
      await http.post(
        Uri.parse('$base/super-admin/register-device'),
        headers: _headers(),
        body: jsonEncode({'fcm_token': fcmToken, 'platform': 'android'}),
      );
    } catch (_) {}
  }
}
