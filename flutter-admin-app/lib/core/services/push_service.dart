import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'storage_service.dart';
import '../constants/api_constants.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../app/app_shell.dart';

class PushService {
  static Future<void> init() async {
    try {
      await Firebase.initializeApp();
      final fcm = FirebaseMessaging.instance;

      // Ask notification permission (Android 13+)
      await fcm.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      try {
        await fcm.setForegroundNotificationPresentationOptions(
          alert: true,
          badge: true,
          sound: true,
        );
      } catch (_) {}

      final token = await fcm.getToken().timeout(const Duration(seconds: 6));
      debugPrint('🔑 FCM token: ${token?.substring(0, 24)}...');
      if (token != null) {
        await registerToken(token);
      }
      fcm.onTokenRefresh.listen(registerToken);

      FirebaseMessaging.onMessage.listen((RemoteMessage msg) {
        debugPrint('📥 foreground push: ${msg.notification?.title}');
        _storeLocal(msg);
      });

      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage msg) {
        debugPrint('📲 notification opened: ${msg.notification?.title}');
        _storeLocal(msg, markRead: true);
        _handleNotificationTap(msg.data);
      });

      FirebaseMessaging.instance.getInitialMessage().then((msg) {
        if (msg != null) {
          debugPrint('📲 cold-start notification tap: ${msg.notification?.title}');
          _storeLocal(msg, markRead: true);
          Future.delayed(const Duration(seconds: 2), () {
            _handleNotificationTap(msg.data);
          });
        }
      });
    } catch (e) {
      debugPrint('PushService init skipped: $e');
    }
  }

  static Future<void> registerToken(String token) async {
    try {
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
        await StorageService.setFcmToken(token);
        return;
      }

      final body = jsonEncode({
        'username': username,
        'fcm_token': token,
        'platform': 'android',
        'language': StorageService.locale,
        'userType': 'staff',
        'userId': username,
        'deviceToken': token,
      });

      // 1. Try /api/devices/register (primary production endpoint)
      try {
        final res = await http.post(
          Uri.parse('${ApiConstants.baseUrl}/api/devices/register'),
          headers: {
            'Content-Type': 'application/json',
            'x-branch-code': branch.toUpperCase(),
          },
          body: body,
        ).timeout(const Duration(seconds: 6));
        if (res.statusCode == 200) {
          await StorageService.setFcmToken(token);
          return;
        }
      } catch (_) {}

      // 2. Fallback: /api/staff/register-device
      try {
        final res = await http.post(
          Uri.parse('${ApiConstants.baseUrl}${ApiConstants.registerDevice}'),
          headers: {
            'Content-Type': 'application/json',
            'x-branch-code': branch.toUpperCase(),
          },
          body: body,
        ).timeout(const Duration(seconds: 6));
        if (res.statusCode == 200) {
          await StorageService.setFcmToken(token);
          return;
        }
      } catch (_) {}

      // Fallback: /api/guardians/register-device with userType: 'staff'
      await http.post(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.registerDeviceFallback}'),
        headers: {
          'Content-Type': 'application/json',
          'x-branch-code': branch.toUpperCase(),
        },
        body: body,
      ).timeout(const Duration(seconds: 6));
      await StorageService.setFcmToken(token);
    } catch (_) {
      await StorageService.setFcmToken(token);
    }
  }

  static Future<void> ensureRegistered() async {
    try {
      final token = await FirebaseMessaging.instance
          .getToken()
          .timeout(const Duration(seconds: 6));
      if (token != null) await registerToken(token);
    } catch (_) {}
  }

  static void _handleNotificationTap(Map<String, dynamic> data) {
    final type = (data['type'] ?? '').toString().toLowerCase();
    switch (type) {
      case 'schedule':
        AppShell.switchTab?.call(1);
        break;
      case 'marks':
      case 'marklist':
        AppShell.switchTab?.call(2);
        break;
      case 'attendance':
        AppShell.switchTab?.call(3);
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
      case 'eval_book':
      case 'evalbook':
        AppShell.openEvalBook?.call();
        break;
      case 'profile':
        AppShell.openProfile?.call();
        break;
      case 'update':
        AppShell.openUpdateDialog?.call();
        break;
      default:
        AppShell.switchTab?.call(0);
    }
  }

  static void _storeLocal(RemoteMessage msg, {bool markRead = false}) {
    try {
      final list = StorageService.getOfflineCache('notifs');
      final notifs = list != null ? jsonDecode(list) as List : [];
      notifs.insert(0, {
        'id': msg.messageId ?? DateTime.now().millisecondsSinceEpoch.toString(),
        'title': msg.notification?.title ?? msg.data['title'] ?? 'IQRA Staff Alert',
        'body': msg.notification?.body ?? msg.data['body'] ?? '',
        'time': DateTime.now().toIso8601String(),
        'read': markRead,
        'type': msg.data['type']?.toString(),
      });
      if (notifs.length > 30) notifs.removeRange(30, notifs.length);
      StorageService.setOfflineCache('notifs', jsonEncode(notifs));
    } catch (_) {}
  }
}

@pragma('vm:entry-point')
Future<void> firebaseBackgroundHandler(RemoteMessage message) async {
  debugPrint('📱 background staff push: ${message.notification?.title}');
}
