import 'package:shared_preferences/shared_preferences.dart';

/// Updates are handled by Google Play only (no browser/APK download).
/// The store updates the app automatically; the in-app button simply opens
/// the Play listing so a teacher can tap Update there.
class UpdateService {
  static const String packageName = 'com.skoolific.staff';

  /// Play Store listing (used when the market:// scheme is unavailable).
  static String get playStoreUrl =>
      'https://play.google.com/store/apps/details?id=$packageName';

  /// Deep link that opens the Play Store app straight on this app's page.
  static String get marketUrl => 'market://details?id=$packageName';

  /// Kept for compatibility with older screens: remember that the teacher
  /// already saw the update prompt for this version.
  static Future<void> markVersionSeen(String version) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('dismissedUpdateVersion', version);
  }
}
