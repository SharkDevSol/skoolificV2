import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  static const String _tokenKey = 'authToken';
  static const String _userKey = 'staffUser';
  static const String _profileKey = 'staffProfile';
  static const String _branchKey = 'branchCode';

  static late SharedPreferences _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  static Future<void> saveSession({
    required String token,
    required String user,
    required String profile,
    required String branchCode,
  }) async {
    await _prefs.setString(_tokenKey, token);
    await _prefs.setString(_userKey, user);
    await _prefs.setString(_profileKey, profile);
    await _prefs.setString('savedBranchCode', branchCode);
    await _prefs.setString(_branchKey, branchCode);
  }

  static String? get token => _prefs.getString(_tokenKey);
  static String? get user => _prefs.getString(_userKey);
  static String? get profile => _prefs.getString(_profileKey);
  static String? get branchCode => _prefs.getString(_branchKey);

  static Future<void> saveUserJson(String json) async {
    await _prefs.setString(_userKey, json);
  }

  static String? get savedBranchCode => _prefs.getString('savedBranchCode');

  static Future<void> setSavedBranchCode(String code) async {
    if (code.trim().isEmpty) {
      await _prefs.remove('savedBranchCode');
    } else {
      await _prefs.setString('savedBranchCode', code.trim().toUpperCase());
    }
  }

  static bool get rememberMe => _prefs.getBool('rememberMe') ?? false;
  static String? get rememberedUsername => _prefs.getString('rememberedUsername');
  static String? get rememberedPassword => _prefs.getString('rememberedPassword');

  static Future<void> setRememberMe(bool value,
      {String? username, String? password}) async {
    await _prefs.setBool('rememberMe', value);
    if (value && username != null && username.isNotEmpty) {
      await _prefs.setString('rememberedUsername', username);
      if (password != null && password.isNotEmpty) {
        await _prefs.setString('rememberedPassword', password);
      }
    } else if (!value) {
      await _prefs.remove('rememberedUsername');
      await _prefs.remove('rememberedPassword');
    }
  }

  static bool get notifPromptShown => _prefs.getBool('notifPromptShown') ?? false;
  static Future<void> setNotifPromptShown() async =>
      _prefs.setBool('notifPromptShown', true);

  static bool get notificationsEnabled =>
      _prefs.getBool('notificationsEnabled') ?? false;
  static Future<void> setNotificationsEnabled(bool v) async =>
      _prefs.setBool('notificationsEnabled', v);

  static Future<void> setTheme(String theme) async {
    await _prefs.setString('themeMode', theme);
  }

  static String? get theme => _prefs.getString('themeMode');

  static bool get isLoggedIn => token?.isNotEmpty ?? false;

  static Future<void> clear() async {
    await _prefs.remove(_tokenKey);
    await _prefs.remove(_userKey);
    await _prefs.remove(_profileKey);
    await _prefs.remove(_branchKey);
  }

  static Future<void> clearAll() async {
    await _prefs.clear();
  }

  static Future<void> setLocale(String code) async {
    await _prefs.setString('locale', code);
  }

  static String get locale => _prefs.getString('locale') ?? 'en';

  static Future<void> setRememberedUsername(String username) async {
    await _prefs.setString('rememberedUsername', username);
  }

  static bool get hasChosenLanguage => _prefs.getBool('languageChosen') ?? false;

  static Future<void> setLanguageChosen() async {
    await _prefs.setBool('languageChosen', true);
  }

  static Future<void> setOfflineCache(String key, String json) async {
    await _prefs.setString('offline_$key', json);
  }

  static String? getOfflineCache(String key) => _prefs.getString('offline_$key');

  static Future<void> setFcmToken(String token) async =>
      _prefs.setString('fcmToken', token);
  static String? get fcmToken => _prefs.getString('fcmToken');
}
