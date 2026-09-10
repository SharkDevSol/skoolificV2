import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;

/// FIX 11: in-app update system.
/// The app checks a small version.json on the server:
///   { "latestVersion": "4.4.0", "apkUrl": "https://...apk", "notes": "..." }
/// If newer than the installed version -> show the update BADGE on the button.
/// Once the user taps it, we remember "dismissedVersion" so the badge hides
/// until a NEWER version appears.
class UpdateService {
  static const String versionEndpoint =
      'https://iqra.skoolific.com/downloads/parent-app/version.json';

  static const String appVersion = '4.4.0'; // keep in sync with pubspec

  /// Returns null if up-to-date (or check fails => treated as up-to-date),
  /// otherwise a map {version, url, notes}.
  static Future<Map<String, dynamic>?> checkForUpdate() async {
    try {
      final res = await http
          .get(Uri.parse(versionEndpoint))
          .timeout(const Duration(seconds: 10));
      if (res.statusCode != 200) return null;
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final latest = data['latestVersion']?.toString() ?? '';
      if (latest.isEmpty) return null;

      // FIX 11: user already saw/handled this exact version? Don't nag again.
      final prefs = await SharedPreferences.getInstance();
      final dismissed = prefs.getString('dismissedUpdateVersion') ?? '';
      if (latest == dismissed) return null;

      if (_isNewer(latest, appVersion)) {
        return {
          'version': latest,
          'url': data['apkUrl']?.toString() ?? '',
          'notes': data['notes']?.toString() ?? '',
        };
      }
      return null;
    } catch (_) {
      return null; // offline / server down => no nagging
    }
  }

  /// FIX 11: called when the user installs/downloads the update — hides the
  /// badge until a NEWER version is published.
  static Future<void> markVersionSeen(String version) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('dismissedUpdateVersion', version);
  }

  /// 4.2.0 > 4.1.9 style compare (numeric parts)
  static bool _isNewer(String a, String b) {
    List<int> parts(String v) => v
        .split(RegExp(r'[.+]'))
        .map((s) => int.tryParse(s) ?? 0)
        .toList();
    final pa = parts(a);
    final pb = parts(b);
    for (var i = 0; i < 3; i++) {
      final x = i < pa.length ? pa[i] : 0;
      final y = i < pb.length ? pb[i] : 0;
      if (x > y) return true;
      if (x < y) return false;
    }
    return false;
  }
}
