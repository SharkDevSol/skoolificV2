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

/// FIX 9: ONE navigator key created once — a new key per rebuild remounts the
/// whole navigator (app "reloaded" to Posts on every theme/ward/language change).
final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

/// FIX 8B: our own localization delegate. Flutter does NOT ship Somali/Amharic/
/// Arabic material translations for everything, and a locale MaterialWidgets
/// can't resolve makes buttons (dropdowns, +, tabs) silently die. This
/// delegate loads our strings for any locale and falls back to English
/// material texts, so every widget keeps working in all 4 languages.
class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => true; // we handle any of our 4 languages

  @override
  Future<AppLocalizations> load(Locale locale) async => AppLocalizations();

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
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
            // FIX 9: language switch only swaps OUR strings — the widget tree,
            // locale resolution, and navigator stay mounted (no reload, no Posts jump)
            locale: appProvider.locale,
            supportedLocales: AppLocalizations.supportedLocales,
            localizationsDelegates: const [
              _AppLocalizationsDelegate(),
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            navigatorKey: rootNavigatorKey,
            // FIX 1: react to session ending. While the provider is loading,
            // keep showing whatever the saved session implies (shell if a
            // token exists). When the provider finishes and the user is null
            // (expired JWT / logged out), switch to login.
            home: Consumer<AppProvider>(
              builder: (context, app, child) {
                final hasToken = StorageService.isLoggedIn;
                final loggedIn = app.loading
                    ? hasToken // still deciding — keep current surface
                    : (hasToken && app.user != null);
                return loggedIn ? const AppShell() : const LoginScreen();
              },
            ),
          );
        },
      ),
    );
  }
}
