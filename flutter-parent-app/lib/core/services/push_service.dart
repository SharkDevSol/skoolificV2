import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'storage_service.dart';
import 'api_service.dart';
import '../constants/api_constants.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../app/app_shell.dart';

/// 6.2/6.3/7.2/8.2: FCM push notification service.
/// Shows notifications in the system tray even when the app is closed.
class PushService {
  static Future<void> init() async {
    try {
      await Firebase.initializeApp();
      final fcm = FirebaseMessaging.instance;

      // Ask permission (Android 13+)
      await fcm.requestPermission(
        alert: true, badge: true, sound: true,
      );

      // T4: show banner + sound when a push arrives while the app is OPEN
      try {
        await fcm.setForegroundNotificationPresentationOptions(
          alert: true, badge: true, sound: true,
        );
      } catch (_) {}

      // Get this device's token and register it with our backend so the
      // backend knows which phone to push to for this guardian.
      final token = await fcm.getToken();
      debugPrint('🔑 FCM token: ${token?.substring(0, 24)}...');
      if (token != null) {
        await registerToken(token);
      }
      // Refresh handling (token can rotate)
      fcm.onTokenRefresh.listen(registerToken);

      // Foreground messages -> show in-app banner via snack bar is handled
      // by the caller; we just store the latest for the notifications tab.
      FirebaseMessaging.onMessage.listen((RemoteMessage msg) {
        debugPrint('📥 foreground push: ${msg.notification?.title}');
        _storeLocal(msg);
      });

      // When user taps a notification while app is in background
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage msg) {
        debugPrint('📲 notification opened: ${msg.notification?.title}');
        // T8: opening a notification from the tray = it's read + deep-link
        _storeLocal(msg, markRead: true);
        _handleNotificationTap(msg.data);
      });

      // v4.9: app was CLOSED entirely — the tap launched the app
      FirebaseMessaging.instance.getInitialMessage().then((msg) {
        if (msg != null) {
          debugPrint('📲 cold-start notification tap: ${msg.notification?.title}');
          _storeLocal(msg, markRead: true);
          // wait for the shell to be ready, then navigate
          Future.delayed(const Duration(seconds: 2), () {
            _handleNotificationTap(msg.data);
          });
        }
      });

      // Background handler (app terminated) — registered in main() BEFORE
      // any await (moved there — required by firebase_messaging)
    } catch (e) {
      debugPrint('PushService init skipped: $e'); // no google-services? ignore
    }
  }

  // Send token to OUR backend -> stored against guardian username
  static Future<void> registerToken(String token) async {
    try {
      // FIX: use the LOGGED-IN user (falls back to remembered) + saved branch.
      // rememberedUsername is only set when Remember Me is checked — that's why
      // some users never registered and got no pushes.
      String username = '';
      try {
        final u = StorageService.user;
        if (StorageService.isLoggedIn && u != null) {
          username = jsonDecode(u)['username']?.toString() ?? '';
        }
      } catch (_) {}
      username = username.isNotEmpty ? username : (StorageService.rememberedUsername ?? '');
      final branch = StorageService.branchCode ?? StorageService.savedBranchCode ?? '';
      if (username.isEmpty || branch.isEmpty) {
        await StorageService.setFcmToken(token); // save for retry after login
        return;
      }
      final body = jsonEncode({
        'username': username,
        'fcm_token': token,
        'platform': 'android',
        // T10: push notifications arrive in the guardian's selected language
        'language': StorageService.locale,
      });
      await http.post(
        Uri.parse('${ApiConstants.baseUrl}/api/guardians/register-device'),
        headers: {
          'Content-Type': 'application/json',
          'x-branch-code': branch.toUpperCase(),
        },
        body: body,
      );
      // Also save locally so login can re-register after auth
      await StorageService.setFcmToken(token);
    } catch (_) {
      await StorageService.setFcmToken(token);
    }
  }

  /// FIX: re-register on every app start (token may rotate / user may have
  /// logged in from another account). Safe to call repeatedly.
  static Future<void> ensureRegistered() async {
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) await registerToken(token);
    } catch (_) {}
  }

  /// T2: notification tap -> open the matching page.
  /// marks -> Marks tab, attendance -> Attendance tab, payment -> Payments tab,
  /// update -> update popup, message/chat -> Messages page.
  static void _handleNotificationTap(Map<String, dynamic> data) {
    final type = (data['type'] ?? '').toString().toLowerCase();
    switch (type) {
      case 'marks':
        AppShell.switchTab?.call(1);
        break;
      case 'attendance':
        AppShell.switchTab?.call(3);
        break;
      case 'payment':
      case 'payments':
        AppShell.switchTab?.call(2);
        break;
      case 'message':
      case 'messages':
      case 'chat':
        AppShell.openMessages?.call();
        break;
      case 'faults':
      case 'discipline':
        AppShell.openDiscipline?.call();
        break;
      case 'update':
        AppShell.openUpdateDialog?.call();
        break;
      default:
        AppShell.switchTab?.call(0);
    }
  }

  static void _storeLocal(RemoteMessage msg, {bool markRead = false}) {    // Keep latest 20 notifications locally for the Notifications tab
    try {
      final list = StorageService.getOfflineCache('notifs');
      final notifs = list != null ? jsonDecode(list) as List : [];
      notifs.insert(0, {
        'id': msg.messageId ?? DateTime.now().millisecondsSinceEpoch.toString(),
        'title': msg.notification?.title ?? msg.data['title'] ?? '',
        'body': msg.notification?.body ?? msg.data['body'] ?? '',
        'time': DateTime.now().toIso8601String(),
        'read': markRead, // T8: opened from tray = read
        'type': msg.data['type']?.toString(), // T8: for deep-linking
      });
      if (notifs.length > 20) notifs.removeRange(20, notifs.length);
      StorageService.setOfflineCache('notifs', jsonEncode(notifs));
    } catch (_) {}
  }
}

/// Must be top-level (not a class method) for background pushes.
@pragma('vm:entry-point')
Future<void> firebaseBackgroundHandler(RemoteMessage message) async {
  debugPrint('📱 background push: ${message.notification?.title}');
}
