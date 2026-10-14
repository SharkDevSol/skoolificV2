import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/services/storage_service.dart';
import '../../core/theme/app_theme.dart';
import '../../app/app_shell.dart';
import '../login/login_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _animController;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..repeat();

    _navigateAfterDelay();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Future<void> _navigateAfterDelay() async {
    await Future.delayed(const Duration(seconds: 3));
    if (!mounted) return;
    
    final Widget nextScreen = StorageService.isLoggedIn ? const AppShell() : const LoginScreen();
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) => nextScreen,
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(opacity: animation, child: child);
        },
        transitionDuration: const Duration(milliseconds: 600),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset(
              'assets/images/oneco.png',
              width: 180,
            ),
            const SizedBox(height: 40),
            WaveLoader(controller: _animController),
          ],
        ),
      ),
    );
  }
}

class WaveLoader extends StatelessWidget {
  final AnimationController controller;
  const WaveLoader({super.key, required this.controller});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        return CustomPaint(
          size: const Size(180, 30),
          painter: _WaveLoaderPainter(progress: controller.value),
        );
      },
    );
  }
}

class _WaveLoaderPainter extends CustomPainter {
  final double progress;
  _WaveLoaderPainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.primary
      ..style = PaintingStyle.fill;
      
    final maskPaint = Paint()
      ..blendMode = BlendMode.dstIn;
      
    canvas.saveLayer(Rect.fromLTWH(0, 0, size.width, size.height), Paint());
    
    // Draw base waves
    _drawWave(canvas, size, paint, 0);
    _drawWave(canvas, size, paint, size.height / 2, invert: true, delay: -0.2);
    
    // Create animated mask (like the CSS webkit-mask linear gradient)
    final maskOffset = progress * size.width;
    final maskRect = Rect.fromLTWH(-maskOffset, 0, size.width * 2, size.height);
    
    final maskGradient = LinearGradient(
      colors: [Colors.black, Colors.black, Colors.transparent, Colors.transparent],
      stops: const [0.0, 0.15, 0.15, 0.5],
      tileMode: TileMode.repeated,
    ).createShader(maskRect);
    
    maskPaint.shader = maskGradient;
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), maskPaint);
    
    canvas.restore();
  }
  
  void _drawWave(Canvas canvas, Size size, Paint paint, double yOffset, {bool invert = false, double delay = 0}) {
    final path = Path();
    final waveWidth = size.width / 3;
    final waveHeight = size.height / 2;
    
    path.moveTo(0, yOffset + (invert ? waveHeight : 0));
    
    for (double i = 0; i < 3; i++) {
      final startX = i * waveWidth;
      if (invert) {
         path.quadraticBezierTo(startX + waveWidth * 0.25, yOffset - waveHeight * 0.5, startX + waveWidth * 0.5, yOffset + waveHeight * 0.5);
         path.quadraticBezierTo(startX + waveWidth * 0.75, yOffset + waveHeight * 1.5, startX + waveWidth, yOffset + waveHeight);
      } else {
         path.quadraticBezierTo(startX + waveWidth * 0.25, yOffset + waveHeight * 1.5, startX + waveWidth * 0.5, yOffset + waveHeight * 0.5);
         path.quadraticBezierTo(startX + waveWidth * 0.75, yOffset - waveHeight * 0.5, startX + waveWidth, yOffset);
      }
    }
    
    path.lineTo(size.width, yOffset + waveHeight);
    path.lineTo(0, yOffset + waveHeight);
    path.close();
    
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _WaveLoaderPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
