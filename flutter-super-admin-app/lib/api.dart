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
    await _loadCache();
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

  /// One shared client = the TLS connection is reused for every request.
  /// On a weak network this alone removes 1-3s of handshake per call.
  static final http.Client _client = http.Client();

  // Small on-device cache so a tab paints instantly, then refreshes.
  static final Map<String, dynamic> _cache = {};
  static const _cachePrefix = 'sa_cache_v1_';
  static const _cacheMaxBytes = 900000;

  static String _cacheKey(String path, Map<String, String>? params) {
    if (params == null || params.isEmpty) return path;
    final keys = params.keys.toList()..sort();
    return '$path?${keys.map((k) => '$k=${params[k]}').join('&')}';
  }

  static dynamic cachedData(String path, {Map<String, String>? params}) =>
      _cache[_cacheKey(path, params)];

  static void _putCache(String key, dynamic data) {
    _cache[key] = data;
    try {
      final raw = jsonEncode(data);
      if (raw.length > _cacheMaxBytes) return;
      SharedPreferences.getInstance().then((p) => p.setString('$_cachePrefix$key', raw)).catchError((_) {});
    } catch (_) {}
  }

  static Future<void> _loadCache() async {
    try {
      final p = await SharedPreferences.getInstance();
      for (final k in p.getKeys()) {
        if (!k.startsWith(_cachePrefix)) continue;
        final raw = p.getString(k);
        if (raw == null) continue;
        final decoded = jsonDecode(raw);
        if (decoded != null) _cache[k.substring(_cachePrefix.length)] = decoded;
      }
    } catch (_) {}
  }

  static Future<ApiResult> _getOnce(
    String path,
    Map<String, String>? params,
    Duration timeout,
  ) async {
    var uri = Uri.parse('$base$path');
    if (params != null && params.isNotEmpty) {
      final clean = <String, String>{};
      params.forEach((k, v) {
        if (v.isNotEmpty) clean[k] = v;
      });
      uri = uri.replace(queryParameters: clean);
    }
    final r = await _client.get(uri, headers: _headers()).timeout(timeout);
    _checkAuth(r.statusCode);
    return ApiResult(r.statusCode, _decode(r.body));
  }

  static Future<ApiResult> getJson(
    String path, {
    Map<String, String>? params,
    Duration timeout = const Duration(seconds: 45),
  }) async {
    final key = _cacheKey(path, params);
    try {
      final first = await _getOnce(path, params, timeout);
      if (first.status >= 200 && first.status < 300 && first.body != null) {
        _putCache(key, first.body);
      }
      return first;
    } catch (_) {
      // one quick retry, then fall back to the last good copy
      try {
        await Future<void>.delayed(const Duration(milliseconds: 800));
        final second = await _getOnce(path, params, timeout);
        if (second.status >= 200 && second.status < 300 && second.body != null) {
          _putCache(key, second.body);
        }
        return second;
      } catch (_) {
        final cached = _cache[key];
        if (cached != null) return ApiResult(200, cached);
        return ApiResult(0, null);
      }
    }
  }

  /// Fetches [path] but hands the last cached copy to [onCached] first, so the
  /// screen shows data immediately while the fresh copy loads in the background.
  static Future<ApiResult> getJsonCached(
    String path, {
    Map<String, String>? params,
    void Function(dynamic data)? onCached,
    Duration timeout = const Duration(seconds: 45),
  }) async {
    final cached = _cache[_cacheKey(path, params)];
    if (cached != null && onCached != null) onCached(cached);
    return getJson(path, params: params, timeout: timeout);
  }

  static Future<ApiResult> postJson(
    String path, [
    Map<String, dynamic>? body,
    Duration timeout = const Duration(seconds: 120),
  ]) async {
    try {
      final r = await _client
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
      final r = await _client
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
      final r = await _client.delete(Uri.parse('$base$path'), headers: _headers())
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
