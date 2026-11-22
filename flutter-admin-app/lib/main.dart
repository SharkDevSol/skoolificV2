import 'dart:async';
import 'dart:ui' show PlatformDispatcher;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'core/config/app_variant.dart';
import 'core/services/storage_service.dart';
import 'core/services/offline_service.dart';
import 'core/theme/app_theme.dart';
import 'core/l10n/app_localizations.dart';
import 'app/app_provider.dart';
import 'screens/admin/admin_shell.dart';
import 'screens/login/login_screen.dart';
import 'screens/splash/splash_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await StorageService.init();
  OfflineService.init();

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

/// Logs the admin out after 1 hour without any touch, click, scroll or key press.
/// Any interaction restarts the timer, so active users are never logged out.
class InactivityGuard extends StatefulWidget {
  final Widget child;
  const InactivityGuard({super.key, required this.child});

  @override
  State<InactivityGuard> createState() => _InactivityGuardState();
}

class _InactivityGuardState extends State<InactivityGuard> {
  static const Duration _timeout = Duration(minutes: 30);
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _reset();
    HardwareKeyboard.instance.addHandler(_onKey);
  }

  @override
  void dispose() {
    _timer?.cancel();
    HardwareKeyboard.instance.removeHandler(_onKey);
    super.dispose();
  }

  bool _onKey(KeyEvent event) {
    _reset();
    return false;
  }

  void _reset() {
    _timer?.cancel();
    _timer = Timer(_timeout, _logout);
  }

  Future<void> _logout() async {
    if (!mounted) return;
    final app = Provider.of<AppProvider>(context, listen: false);
    if (app.user == null) {
      _reset();
      return;
    }
    await app.logout();
    if (!mounted) return;
    final nav = rootNavigatorKey.currentState;
    if (nav != null) {
      nav.pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
    }
    _reset();
  }

  @override
  Widget build(BuildContext context) {
    return Listener(
      behavior: HitTestBehavior.translucent,
      onPointerDown: (_) => _reset(),
      onPointerMove: (_) => _reset(),
      onPointerSignal: (_) => _reset(),
      child: widget.child,
    );
  }
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
            title: AppVariant.appName,
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
                child: InactivityGuard(child: child ?? const SizedBox()),
              );
            },
            navigatorKey: rootNavigatorKey,
            home: Consumer<AppProvider>(
              builder: (context, app, child) {
                if (app.loading) {
                  return const SplashScreen();
                }
                return app.user != null ? const AdminShell() : const LoginScreen();
              },
            ),
          );
        },
      ),
    );
  }
}
