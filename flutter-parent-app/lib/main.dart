import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'core/services/storage_service.dart';
import 'core/services/push_service.dart';
import 'core/theme/app_theme.dart';
import 'core/l10n/app_localizations.dart';
import 'app/app_provider.dart';
import 'app/app_shell.dart';
import 'screens/login/login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await StorageService.init();
  // 6.2: start FCM push notifications (system tray, works with app closed)
  await PushService.init();
  // FIX: re-register the FCM token on every app start — covers token rotation
  // and users who logged in before this fix existed
  unawaited(PushService.ensureRegistered());
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppProvider(),
      child: Consumer<AppProvider>(
        builder: (context, appProvider, child) {
          return MaterialApp(
            title: 'IQRA Parent',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.light,
            darkTheme: AppTheme.dark,
            themeMode: appProvider.themeMode,
            locale: appProvider.locale,
            // FIX 9: declare supported locales so Localizations resolves them —
            // without this, Localizations.maybeLocaleOf returned null => always English
            supportedLocales: AppLocalizations.supportedLocales,
            localizationsDelegates: const [
              ...GlobalMaterialLocalizations.delegates,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            navigatorKey: GlobalKey<NavigatorState>(),
            // FIX 1: no splash screen — go straight to app/login
            home: StorageService.isLoggedIn ? const AppShell() : const LoginScreen(),
          );
        },
      ),
    );
  }
}
