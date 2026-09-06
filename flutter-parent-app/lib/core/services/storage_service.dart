import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  static const String _tokenKey = 'authToken';
  static const String _userKey = 'guardianUser';
  static const String _branchKey = 'branchCode';

  static late SharedPreferences _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  static Future<void> saveSession({
    required String token,
    required String user,
    required String branchCode,
  }) async {
    await _prefs.setString(_tokenKey, token);
    await _prefs.setString(_userKey, user);
    // 1.7: also remember branch code separately (survives logout)
    await _prefs.setString('savedBranchCode', branchCode);
    await _prefs.setString(_branchKey, branchCode);
  }

  static String? get token => _prefs.getString(_tokenKey);
  static String? get user => _prefs.getString(_userKey);
  static String? get branchCode => _prefs.getString(_branchKey);

  // 1.7: branch code that survives logout — for prefilling login
  static String? get savedBranchCode => _prefs.getString('savedBranchCode');

  // 1.7: manual reset of remembered branch code (from Settings)
  static Future<void> setSavedBranchCode(String code) async {
    if (code.trim().isEmpty) {
      await _prefs.remove('savedBranchCode');
    } else {
      await _prefs.setString('savedBranchCode', code.trim().toUpperCase());
    }
  }

  // 1.4: Remember Me — keep user signed in / remember username
  static bool get rememberMe => _prefs.getBool('rememberMe') ?? false;
  static String? get rememberedUsername => _prefs.getString('rememberedUsername');

  static Future<void> setRememberMe(bool value, {String? username}) async {
    await _prefs.setBool('rememberMe', value);
    if (value && username != null && username.isNotEmpty) {
      await _prefs.setString('rememberedUsername', username);
    } else if (!value) {
      await _prefs.remove('rememberedUsername');
    }
  }

  // 1.1: notification prompt state — ask once, only if notifications off
  static bool get notifPromptShown => _prefs.getBool('notifPromptShown') ?? false;
  static Future<void> setNotifPromptShown() async =>
      _prefs.setBool('notifPromptShown', true);

  // OS notification permission status (set from MainActivity after check)
  static bool get notificationsEnabled =>
      _prefs.getBool('notificationsEnabled') ?? false;
  static Future<void> setNotificationsEnabled(bool v) async =>
      _prefs.setBool('notificationsEnabled', v);

  static Future<void> setTheme(String theme) async {
    await _prefs.setString('themeMode', theme);
  }

  static String? get theme => _prefs.getString('themeMode');

  static bool get isLoggedIn => token?.isNotEmpty ?? false;

  // 1.4: logout keeps savedBranchCode + rememberMe prefs,
  // clears only the active session
  static Future<void> clear() async {
    await _prefs.remove(_tokenKey);
    await _prefs.remove(_userKey);
    await _prefs.remove(_branchKey);
  }

  // Full wipe (not used in normal logout)
  static Future<void> clearAll() async {
    await _prefs.clear();
  }

  static Future<void> setLocale(String code) async {
    await _prefs.setString('locale', code);
  }

  static String get locale => _prefs.getString('locale') ?? 'en';

  // 10.6: offline data cache (marks/payments/posts/attendance)
  static Future<void> setOfflineCache(String key, String json) async {
    await _prefs.setString('offline_$key', json);
  }

  static String? getOfflineCache(String key) => _prefs.getString('offline_$key');

  // 6.2: FCM device token
  static Future<void> setFcmToken(String token) async =>
      _prefs.setString('fcmToken', token);
  static String? get fcmToken => _prefs.getString('fcmToken');
}
