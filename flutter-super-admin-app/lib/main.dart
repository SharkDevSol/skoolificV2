import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'api.dart';
import 'home.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp();
  } catch (_) {}
  await Api.load();
  runApp(const SuperAdminApp());
}

class SuperAdminApp extends StatelessWidget {
  const SuperAdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'IQRA Super Admin',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1F3B73)),
        scaffoldBackgroundColor: const Color(0xFFF6F7FB),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF1F3B73),
          foregroundColor: Colors.white,
          elevation: 0,
        ),
      ),
      home: Api.token == null ? const LoginPage() : const HomePage(),
    );
  }
}
