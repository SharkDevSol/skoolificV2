import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'storage_service.dart';
import 'api_service.dart';
import '../constants/api_constants.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

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
      });

      // Background handler (app terminated) — must be top-level function
      FirebaseMessaging.onBackgroundMessage(_firebaseBackgroundHandler);
    } catch (e) {
      debugPrint('PushService init skipped: $e'); // no google-services? ignore
    }
  }

  // Send token to OUR backend -> stored against guardian username
  static Future<void> registerToken(String token) async {
    try {
      final username = StorageService.rememberedUsername ?? '';
      final branch = StorageService.branchCode ?? StorageService.savedBranchCode ?? '';
      final body = jsonEncode({
        'username': username,
        'fcm_token': token,
        'platform': 'android',
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

  static void _storeLocal(RemoteMessage msg) {
    // Keep latest 20 notifications locally for the Notifications tab
    try {
      final list = StorageService.getOfflineCache('notifs');
      final notifs = list != null ? jsonDecode(list) as List : [];
      notifs.insert(0, {
        'id': msg.messageId ?? DateTime.now().millisecondsSinceEpoch.toString(),
        'title': msg.notification?.title ?? msg.data['title'] ?? '',
        'body': msg.notification?.body ?? msg.data['body'] ?? '',
        'time': DateTime.now().toIso8601String(),
        'read': false,
      });
      if (notifs.length > 20) notifs.removeRange(20, notifs.length);
      StorageService.setOfflineCache('notifs', jsonEncode(notifs));
    } catch (_) {}
  }
}

/// Must be top-level (not a class method) for background pushes.
@pragma('vm:entry-point')
Future<void> _firebaseBackgroundHandler(RemoteMessage message) async {
  debugPrint('📱 background push: ${message.notification?.title}');
}
