import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiResult {
  final int status;
  final dynamic body;

  ApiResult(this.status, this.body);

  bool get ok => status >= 200 && status < 300;

  Map<String, dynamic>? get map =>
      body is Map<String, dynamic> ? body as Map<String, dynamic> : null;

  /// The `data` payload when the backend wraps it in `{success, data}`.
  Map<String, dynamic>? get data {
    final m = map;
    if (m == null) return null;
    final d = m['data'];
    if (d is Map<String, dynamic>) return d;
    if (d is Map) return Map<String, dynamic>.from(d);
    return null;
  }

  String? get errorMessage {
    final m = map;
    if (m == null) return null;
    final e = m['error'] ?? m['message'];
    return e?.toString();
  }
}

class Api {
  static const String base = 'https://iqra.skoolific.com/api';
  static String? token;
  static String? username;

  /// Called when the backend rejects the session (401).
  static void Function()? onUnauthorized;

  static Map<String, String> _headers() => {
        if (token != null && token!.isNotEmpty) 'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

  // ---------------- session / preferences ----------------

  static Future<void> load() async {
    final p = await SharedPreferences.getInstance();
    token = p.getString('sa_token');
    username = p.getString('sa_user');
  }

  static Future<String?> login(String u, String pw) async {
    try {
      final r = await http
          .post(
            Uri.parse('$base/super-admin/login'),
            headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
            body: jsonEncode({'username': u, 'password': pw}),
          )
          .timeout(const Duration(seconds: 45));
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
        final j = jsonDecode(r.body);
        return (j['error'] ?? j['message'] ?? 'Login failed').toString();
      } catch (_) {
        return 'Login failed (${r.statusCode})';
      }
    } catch (_) {
      return 'Connection error. Check your internet and try again.';
    }
  }

  static Future<void> logout() async {
    token = null;
    username = null;
    final p = await SharedPreferences.getInstance();
    await p.remove('sa_token');
    await p.remove('sa_user');
  }

  static Future<bool> getDark() async {
    final p = await SharedPreferences.getInstance();
    return p.getBool('sa_dark') ?? false;
  }

  static Future<void> setDark(bool v) async {
    final p = await SharedPreferences.getInstance();
    await p.setBool('sa_dark', v);
  }

  static Future<String> getLang() async {
    final p = await SharedPreferences.getInstance();
    return p.getString('sa_lang') ?? 'en';
  }

  static Future<void> setLang(String v) async {
    final p = await SharedPreferences.getInstance();
    await p.setString('sa_lang', v);
  }

  static Future<bool> getRemember() async {
    final p = await SharedPreferences.getInstance();
    return p.getBool('sa_remember') ?? true;
  }

  static Future<String> getRememberUser() async {
    final p = await SharedPreferences.getInstance();
    return p.getString('sa_remember_user') ?? '';
  }

  static Future<void> saveRemember(bool remember, String user) async {
    final p = await SharedPreferences.getInstance();
    await p.setBool('sa_remember', remember);
    if (remember) {
      await p.setString('sa_remember_user', user);
    } else {
      await p.remove('sa_remember_user');
    }
  }

  // ---------------- HTTP ----------------

  static Future<ApiResult> getJson(
    String path, {
    Map<String, String>? params,
    Duration timeout = const Duration(seconds: 90),
  }) async {
    try {
      var uri = Uri.parse('$base$path');
      if (params != null && params.isNotEmpty) {
        final clean = <String, String>{};
        params.forEach((k, v) {
          if (v.isNotEmpty) clean[k] = v;
        });
        uri = uri.replace(queryParameters: clean);
      }
      final r = await http.get(uri, headers: _headers()).timeout(timeout);
      _checkAuth(r.statusCode);
      return ApiResult(r.statusCode, _decode(r.body));
    } catch (_) {
      return ApiResult(0, null);
    }
  }

  static Future<ApiResult> postJson(
    String path, [
    Map<String, dynamic>? body,
    Duration timeout = const Duration(seconds: 120),
  ]) async {
    try {
      final r = await http
          .post(Uri.parse('$base$path'), headers: _headers(), body: jsonEncode(body ?? {}))
          .timeout(timeout);
      _checkAuth(r.statusCode);
      return ApiResult(r.statusCode, _decode(r.body));
    } catch (_) {
      return ApiResult(0, null);
    }
  }

  static Future<ApiResult> putJson(
    String path,
    Map<String, dynamic> body, {
    Duration timeout = const Duration(seconds: 60),
  }) async {
    try {
      final r = await http
          .put(Uri.parse('$base$path'), headers: _headers(), body: jsonEncode(body))
          .timeout(timeout);
      _checkAuth(r.statusCode);
      return ApiResult(r.statusCode, _decode(r.body));
    } catch (_) {
      return ApiResult(0, null);
    }
  }

  static dynamic _decode(String body) {
    try {
      return jsonDecode(body);
    } catch (_) {
      return null;
    }
  }

  static void _checkAuth(int status) {
    if (status == 401) onUnauthorized?.call();
  }

  static Future<void> registerDevice(String fcmToken) async {
    try {
      await http
          .post(
            Uri.parse('$base/super-admin/register-device'),
            headers: _headers(),
            body: jsonEncode({'fcm_token': fcmToken, 'platform': 'android'}),
          )
          .timeout(const Duration(seconds: 30));
    } catch (_) {}
  }
}
