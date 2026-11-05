import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

import 'api.dart';
import 'l10n.dart';
import 'login_page.dart';
import 'shell.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp();
  } catch (_) {}
  await Api.load();
  final dark = await Api.getDark();
  T.lang = await Api.getLang();
  runApp(SuperAdminApp(initialDark: dark));
}

class SuperAdminApp extends StatefulWidget {
  const SuperAdminApp({super.key, required this.initialDark});

  final bool initialDark;

  @override
  State<SuperAdminApp> createState() => _SuperAdminAppState();
}

class _SuperAdminAppState extends State<SuperAdminApp> {
  late bool _dark = widget.initialDark;
  late bool _loggedIn = (Api.token ?? '').isNotEmpty;
  late String _lang = T.lang;

  @override
  void initState() {
    super.initState();
    Api.onUnauthorized = _handleUnauthorized;
    _initPush();
  }

  void _handleUnauthorized() {
    if (!mounted) return;
    Api.logout();
    setState(() => _loggedIn = false);
  }

  Future<void> _initPush() async {
    try {
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission();
      FirebaseMessaging.onMessage.listen((message) {
        final title = message.notification?.title ?? 'IQRA Super Admin';
        final body = message.notification?.body ?? '';
        if (body.isEmpty) return;
        _snack('$title — $body');
      });
      if (_loggedIn) await _registerToken();
    } catch (_) {}
  }

  Future<void> _registerToken() async {
    try {
      final t = await FirebaseMessaging.instance.getToken();
      if (t != null) await Api.registerDevice(t);
      FirebaseMessaging.instance.onTokenRefresh.listen((t) {
        if ((Api.token ?? '').isNotEmpty) Api.registerDevice(t);
      });
    } catch (_) {}
  }

  void _snack(String text) {
    _messengerKey.currentState?.showSnackBar(SnackBar(content: Text(text)));
  }

  final GlobalKey<ScaffoldMessengerState> _messengerKey = GlobalKey<ScaffoldMessengerState>();

  void _setDark(bool v) {
    setState(() => _dark = v);
    Api.setDark(v);
  }

  void _setLang(String v) {
    setState(() {
      _lang = v;
      T.lang = v;
    });
    Api.setLang(v);
  }

  void _setLoggedIn(bool v) {
    setState(() => _loggedIn = v);
    if (v) {
      _registerToken();
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'IQRA Super Admin',
      debugShowCheckedModeBanner: false,
      scaffoldMessengerKey: _messengerKey,
      theme: appTheme(false),
      darkTheme: appTheme(true),
      themeMode: _dark ? ThemeMode.dark : ThemeMode.light,
      home: _loggedIn
          ? Shell(
              dark: _dark,
              onThemeChanged: _setDark,
              lang: _lang,
              onLangChanged: _setLang,
              onLogout: () async {
                await Api.logout();
                _setLoggedIn(false);
              },
            )
          : LoginPage(
              dark: _dark,
              onThemeToggle: () => _setDark(!_dark),
              onLoggedIn: () => _setLoggedIn(true),
            ),
    );
  }
}
