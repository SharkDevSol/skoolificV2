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
  static String? fullName;
  /// { tabs: [...], manageUsers: bool, owner: bool }
  static Map<String, dynamic> permissions = {};

  /// Called when the backend rejects the session (401).
  static void Function()? onUnauthorized;

  static bool canSee(String tab) {
    final tabs = permissions['tabs'];
    if (tabs is List && tabs.isNotEmpty) return tabs.contains(tab);
    return true; // no restriction stored -> show everything
  }

  static bool get canManageUsers => permissions['manageUsers'] == true;

  static void applyUser(Map<String, dynamic>? user) {
    if (user == null) return;
    username = (user['username'] ?? username)?.toString();
    fullName = (user['fullName'] ?? user['full_name'] ?? fullName)?.toString();
    final p = user['permissions'];
    if (p is Map) {
      permissions = Map<String, dynamic>.from(p);
    }
  }

  static Future<void> _persistUser() async {
    final p = await SharedPreferences.getInstance();
    if (username != null) await p.setString('sa_user', username!);
    await p.setString('sa_perms', jsonEncode(permissions));
  }

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
    try {
      final raw = p.getString('sa_perms');
      if (raw != null && raw.isNotEmpty) {
        final decoded = jsonDecode(raw);
        if (decoded is Map) permissions = Map<String, dynamic>.from(decoded);
      }
    } catch (_) {}
  }

  /// Refreshes the signed-in account + permissions from the server.
  static Future<bool> fetchMe() async {
    final r = await getJson('/super-admin/me');
    if (r.status == 401) return false;
    final d = r.data;
    if (d == null) return true;
    fullName = (d['fullName'] ?? d['full_name'] ?? fullName)?.toString();
    final perms = d['permissions'];
    if (perms is Map) permissions = Map<String, dynamic>.from(perms);
    await _persistUser();
    return true;
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
        fullName = (j['user']?['fullName'] ?? j['user']?['full_name'] ?? username).toString();
        final perms = j['user']?['permissions'];
        permissions = perms is Map ? Map<String, dynamic>.from(perms) : {};
        final p = await SharedPreferences.getInstance();
        await p.setString('sa_token', token ?? '');
        await _persistUser();
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
    fullName = null;
    permissions = {};
    final p = await SharedPreferences.getInstance();
    await p.remove('sa_token');
    await p.remove('sa_user');
    await p.remove('sa_perms');
    await p.remove('sa_remember_user');
    await p.remove('sa_remember');
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

  static Future<ApiResult> deleteJson(String path) async {
    try {
      final r = await http.delete(Uri.parse('$base$path'), headers: _headers())
          .timeout(const Duration(seconds: 60));
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
