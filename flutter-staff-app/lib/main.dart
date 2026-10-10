import 'dart:async';
import 'dart:ui' show PlatformDispatcher;
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'core/services/storage_service.dart';
import 'core/services/offline_service.dart';
import 'core/services/push_service.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
export 'core/services/push_service.dart' show firebaseBackgroundHandler;
import 'core/theme/app_theme.dart';
import 'core/l10n/app_localizations.dart';
import 'app/app_provider.dart';
import 'app/app_shell.dart';
import 'screens/login/login_screen.dart';
import 'screens/splash/splash_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  FirebaseMessaging.onBackgroundMessage(firebaseBackgroundHandler);
  await StorageService.init();
  OfflineService.init();

  unawaited(PushService.init());
  unawaited(PushService.ensureRegistered());

  FlutterError.onError = (details) {
    FlutterError.presentError(details);
  };
  PlatformDispatcher.instance.onError = (error, stack) {
    debugPrint('uncaught error: $error');
    return true;
  };

  runApp(const MyApp());
}

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
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
          final materialLocale = loc.languageCode == 'so' ? const Locale('en') : loc;
          AppLocalizations.currentLocale = loc;

          return MaterialApp(
            title: 'IQRA Staff',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.light,
            darkTheme: AppTheme.dark,
            themeMode: appProvider.themeMode,
            locale: loc,
            supportedLocales: AppLocalizations.supportedLocales,
            localizationsDelegates: [
              const _AppLocalizationsDelegate(),
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            localeResolutionCallback: (deviceLocale, supported) => loc,
            builder: (context, child) {
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
            home: Consumer<AppProvider>(
              builder: (context, app, child) {
                if (app.loading) {
                  return const SplashScreen();
                }
                return app.user != null ? const AppShell() : const LoginScreen();
              },
            ),
          );
        },
      ),
    );
  }
}
