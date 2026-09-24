import 'dart:async';
import 'dart:ui' show PlatformDispatcher;
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'core/services/storage_service.dart';
import 'core/services/push_service.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
// background handler exported from push_service
export 'core/services/push_service.dart' show firebaseBackgroundHandler;
import 'core/theme/app_theme.dart';
import 'core/l10n/app_localizations.dart';
import 'app/app_provider.dart';
import 'app/app_shell.dart';
import 'screens/login/login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // CRITICAL: firebase_messaging requires the background handler registered
  // BEFORE any await (registering it later = native crash on Android)
  FirebaseMessaging.onBackgroundMessage(firebaseBackgroundHandler);
  await StorageService.init();
  // FIX (crash): do NOT await Firebase init before runApp — requestPermission
  // + getToken can block/throw before the UI exists and kills the app
  // ("closed because this app has a bug"). Start the UI FIRST, then init
  // push in the background (fire-and-forget).
  unawaited(PushService.init());
  // FIX: re-register the FCM token on every app start — covers token rotation
  // and users who logged in before this fix existed
  unawaited(PushService.ensureRegistered());
  // Catch-all: never let a background error kill the app
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
  };
  PlatformDispatcher.instance.onError = (error, stack) {
    debugPrint('uncaught: $error');
    return true; // handled — do not crash
  };
  runApp(const MyApp());
}

/// FIX 9: ONE navigator key created once — a new key per rebuild remounts the
/// whole navigator (app "reloaded" to Posts on every theme/ward/language change).
final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

/// T7/T11: our own delegate supplies AppLocalizations for ALL 4 languages
/// (including Somali, which Flutter's GlobalMaterialLocalizations does NOT
/// ship — its load() throws "unsupported locale" and kills the widget tree).
class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) =>
      AppLocalizations.supportedLocales.any((l) => l.languageCode == locale.languageCode);

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
          final loc = appProvider.locale;
          // T7/T11: Somali has NO Flutter material bundle — pass a fallback
          // locale (en) to the Material delegates so they never throw, while
          // OUR delegate still serves Somali strings for every widget.
          final materialLocale =
              loc.languageCode == 'so' ? const Locale('en') : loc;
          return MaterialApp(
            title: 'IQRA Parent',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.light,
            darkTheme: AppTheme.dark,
            themeMode: appProvider.themeMode,
            // T7: language switch swaps OUR strings via _AppLocalizationsDelegate —
            // widget tree stays mounted (no reload, no data loss, no Posts jump)
            locale: loc,
            supportedLocales: AppLocalizations.supportedLocales,
            localizationsDelegates: [
              const _AppLocalizationsDelegate(),
              // T7/T11: material delegate resolves en/am/ar directly; for 'so'
              // we override with materialLocale=en (see above) so load() never fails
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            localeResolutionCallback: (deviceLocale, supported) {
              // T7/T11: ALWAYS resolve to the user's chosen language —
              // this is what makes tr() widgets rebuild with new strings
              return loc;
            },
            builder: (context, child) {
              // T7/T11: wrap with Localizations override for the material
              // widgets when locale is Somali (they get 'en' material strings
              // but our Somali strings come from _AppLocalizationsDelegate)
              return Localizations(
                locale: materialLocale,
                delegates: const [
                  GlobalMaterialLocalizations.delegate,
                  GlobalWidgetsLocalizations.delegate,
                  GlobalCupertinoLocalizations.delegate,
                ],
                child: child ?? const SizedBox(),
              );
            },
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
