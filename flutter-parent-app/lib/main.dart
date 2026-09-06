import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/services/storage_service.dart';
import 'core/theme/app_theme.dart';
import 'app/app_provider.dart';
import 'app/app_shell.dart';
import 'screens/login/login_screen.dart';
import 'screens/splash/splash_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await StorageService.init();
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
            // You can add localization delegates here if needed later
            navigatorKey: GlobalKey<NavigatorState>(),
            home: const SplashScreen(),
          );
        },
      ),
    );
  }
}
