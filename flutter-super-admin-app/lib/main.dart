import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'api.dart';

const kBlue = Color(0xFF1F3B73);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp();
  } catch (_) {}
  await Api.load();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(statusBarColor: kBlue));
  runApp(const SuperAdminApp());
}

class SuperAdminApp extends StatelessWidget {
  const SuperAdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'IQRA Super Admin',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(useMaterial3: true, colorScheme: ColorScheme.fromSeed(seedColor: kBlue)),
      home: const SuperAdminWeb(),
    );
  }
}

class SuperAdminWeb extends StatefulWidget {
  const SuperAdminWeb({super.key});

  @override
  State<SuperAdminWeb> createState() => _SuperAdminWebState();
}

class _SuperAdminWebState extends State<SuperAdminWeb> {
  static const String _url = 'https://iqra.skoolific.com/super-admin';
  late final WebViewController _controller;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _initPush();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(kBlue)
      ..setUserAgent('SkoolificSuperAdminApp/1.1')
      ..addJavaScriptChannel('SuperAdminBridge', onMessageReceived: _onJsMessage)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) setState(() { _loading = true; _error = null; });
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _loading = false);
            _syncToken();
          },
          onWebResourceError: (e) {
            if (e.isForMainFrame ?? true) {
              if (mounted) {
                setState(() {
                  _error = e.description;
                  _loading = false;
                });
              }
            }
          },
        ),
      )
      ..loadRequest(Uri.parse(_url));
  }

  Future<void> _initPush() async {
    try {
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission();
    } catch (_) {}
  }

  // Read the super admin token from the web app's localStorage and register
  // this device for the daily push notifications.
  void _syncToken() {
    _controller.runJavaScript("""
      (function () {
        try {
          var t = window.localStorage.getItem('superAdminToken');
          if (t) { SuperAdminBridge.postMessage(t); }
        } catch (e) {}
      })();
    """);
  }

  Future<void> _onJsMessage(JavaScriptMessage message) async {
    final raw = message.message.trim();
    if (raw.isEmpty) return;

    // PDF downloaded from the web page -> open the native share/save sheet.
    if (raw.startsWith('{')) {
      try {
        final j = jsonDecode(raw);
        if (j is Map && j['type'] == 'pdf') {
          final name = (j['name'] ?? 'report.pdf').toString().replaceAll(RegExp(r'[^A-Za-z0-9._-]'), '_');
          final bytes = base64Decode((j['data'] ?? '').toString());
          final dir = await getTemporaryDirectory();
          final file = File('${dir.path}/$name');
          await file.writeAsBytes(bytes, flush: true);
          await Share.shareXFiles([XFile(file.path)]);
          return;
        }
      } catch (_) {}
    }

    // Otherwise this is the super admin session token.
    final token = raw;
    if (token == Api.token) return;
    Api.token = token;
    try {
      final t = await FirebaseMessaging.instance.getToken();
      if (t != null) await Api.registerDevice(t);
    } catch (_) {}
  }

  Future<void> _reload() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    await _controller.loadRequest(Uri.parse(_url));
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _controller.canGoBack()) {
          await _controller.goBack();
        } else {
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          child: Stack(
            children: [
              WebViewWidget(controller: _controller),
              if (_loading)
                const Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: LinearProgressIndicator(minHeight: 3, color: kBlue),
                ),
              if (_error != null)
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.wifi_off, size: 56, color: Colors.black26),
                        const SizedBox(height: 12),
                        const Text('Could not load the Super Admin page', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        const SizedBox(height: 6),
                        Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.black54, fontSize: 12)),
                        const SizedBox(height: 16),
                        FilledButton.icon(
                          onPressed: _reload,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Try again'),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
