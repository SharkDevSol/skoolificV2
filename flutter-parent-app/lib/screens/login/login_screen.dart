import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/material.dart';
import '../../core/l10n/app_localizations.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:loading_animation_widget/loading_animation_widget.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/storage_service.dart' as storage;
import '../../core/services/api_service.dart' as api_svc;
import '../../core/services/push_service.dart';
import '../../app/app_provider.dart';
import '../../app/app_shell.dart';
import '../../models/models.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _branchCtrl = TextEditingController();
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscure = true;
  bool _remember = false;
  bool _loading = false;

  // Separate error states
  String? _connectionError;   // connection/timeout error
  String? _branchError;       // branch code error
  String? _credentialError;   // username/password error

  // 1.4: load saved Remember Me + saved branch code (1.7) on open
  @override
  void initState() {
    super.initState();
    _remember = storage.StorageService.rememberMe;
    // FIX 9: branch code ALWAYS prefilled after first login
    final savedBranch = storage.StorageService.savedBranchCode;
    if (savedBranch != null && savedBranch.isNotEmpty) {
      _branchCtrl.text = savedBranch;
    }
    if (_remember) {
      // FIX 8: username AND password restored
      final savedUser = storage.StorageService.rememberedUsername;
      if (savedUser != null && savedUser.isNotEmpty) {
        _usernameCtrl.text = savedUser;
      }
      final savedPass = storage.StorageService.rememberedPassword;
      if (savedPass != null && savedPass.isNotEmpty) {
        _passwordCtrl.text = savedPass;
      }
    }
  }

  @override
  void dispose() {
    _branchCtrl.dispose();
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  // 1.6: trim + uppercase branch code as user types/pastes
  void _onBranchChanged(String value) {
    final cleaned = value.trim().toUpperCase();
    if (value != cleaned) {
      _branchCtrl.value = TextEditingValue(
        text: cleaned,
        selection: TextSelection.collapsed(offset: cleaned.length),
      );
    }
    if (_branchError != null) {
      setState(() => _branchError = null);
    }
  }

  // 1.6: trim username on paste/change
  void _onUsernameChanged(String value) {
    final cleaned = value.trim();
    if (value != cleaned) {
      _usernameCtrl.value = TextEditingValue(
        text: cleaned,
        selection: TextSelection.collapsed(offset: cleaned.length),
      );
    }
    if (_credentialError != null) {
      setState(() => _credentialError = null);
    }
  }

  Future<void> _submit() async {
    // Clear all errors first
    setState(() {
      _connectionError = null;
      _branchError = null;
      _credentialError = null;
    });

    // 1.6: trim before validating (covers paste + submit)
    final branch = _branchCtrl.text.trim();
    final username = _usernameCtrl.text.trim();
    final password = _passwordCtrl.text;

    // Validate branch code
    if (branch.isEmpty) {
      setState(() => _branchError = tr(context, 'branch_required'));
      return;
    }
    if (branch.length < 2) {
      setState(() => _branchError = tr(context, 'branch_too_short'));
      return;
    }

    // Validate username
    if (username.isEmpty) {
      setState(() => _credentialError = tr(context, 'username_required'));
      return;
    }

    // Validate password
    if (password.isEmpty) {
      setState(() => _credentialError = tr(context, 'password_required'));
      return;
    }

    setState(() { _loading = true; });

    try {
      final res = await api_svc.ApiService().login(
        branchCode: branch,
        username: username,
        password: password,
      );

      if (res['success']) {
        // 1.4/8: persist Remember Me preference (username AND password)
        await storage.StorageService.setRememberMe(
          _remember,
          username: _remember ? username : null,
          password: _remember ? password : null,
        );
        // 1.7: always save branch code so it's prefilled next time
        await storage.StorageService.saveSession(
          token: res['token'],
          user: jsonEncode(res['user'] ?? {}),
          branchCode: branch,
        );
        // FIX 6: re-register FCM token NOW that we know the username,
        // so backend pushes reach this phone
        final fcmToken = storage.StorageService.fcmToken;
        if (fcmToken != null && fcmToken.isNotEmpty) {
          await PushService.registerToken(fcmToken);
        }
        if (mounted) {
          context.read<AppProvider>().user = User.fromJson(
            res['user'] as Map<String, dynamic>,
          );
          await context.read<AppProvider>().refresh();

          if (!mounted) return;
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const AppShell()),
          );
        }
      } else {
        // Invalid credentials
        setState(() {
          _loading = false;
          _credentialError = res['message'] ?? tr(context, 'wrong_credentials');
        });
      }
    } on api_svc.ApiException catch (e) {
      // API returned error (invalid credentials, etc.)
      setState(() {
        _loading = false;
        _credentialError = e.message;
      });
    } catch (e) {
      // Connection error - network issue, server down, SSL, etc.
      debugPrint('🔴 Login connection error: ${e.runtimeType}: $e');
      setState(() {
        _loading = false;
        final errStr = e.toString();
        _connectionError = 'Connection failed. Check your internet and try again.';
        debugPrint('Detail: $errStr');
      });
    }
  }

  void _toggleObscure() => setState(() => _obscure = !_obscure);
  void _toggleRemember(bool v) => setState(() => _remember = v);

  // 1.5: single "Need help?" action
  void _needHelp() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Theme.of(ctx).colorScheme.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.help_outline, color: AppColors.primary, size: 24),
            const SizedBox(width: 10),
            Text(
              'Need help?',
              style: TextStyle(
                color: Theme.of(ctx).brightness == Brightness.dark ? Colors.white : AppColors.text,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        content: Text(
          'If you forgot your password or need help, please contact your school administrator.',
          style: TextStyle(
            color: Theme.of(ctx).brightness == Brightness.dark ? Colors.grey.shade300 : const Color(0xFF6B6F8D),
            fontSize: 14,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('OK', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _clearErrors() {
    setState(() {
      _connectionError = null;
      _branchError = null;
      _credentialError = null;
    });
  }

  // 1.1: only show notification prompt if notifications are actually OFF,
  // and only once per install (never every login screen open)
  Future<void> _maybeAskNotifications() async {
    if (!mounted) return;
    if (Platform.isAndroid) {
      // Real check: ask Android if notifications are enabled for this app
      bool enabled = true;
      try {
        const channel = MethodChannel('app.channel.shared.data');
        enabled = await channel.invokeMethod<bool>('areNotificationsEnabled') ?? true;
      } catch (_) {
        enabled = true; // can't check — don't nag
      }
      if (!mounted) return;
      await storage.StorageService.setNotificationsEnabled(enabled);
      if (enabled) return; // already on — never show the popup
      if (storage.StorageService.notifPromptShown) return; // asked before

      await storage.StorageService.setNotifPromptShown();
      if (mounted) {
        Future.delayed(const Duration(milliseconds: 1200), () {
          if (mounted) _reqNotifications();
        });
      }
    }
  }

  void _reqNotifications() {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => AlertDialog(
        backgroundColor: Theme.of(ctx).colorScheme.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.notifications, color: AppColors.primary, size: 24),
            const SizedBox(width: 10),
            Text(
              tr(context, 'turn_on_notifications'),
              style: TextStyle(
                color: Theme.of(ctx).brightness == Brightness.dark ? Colors.white : AppColors.text,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        content: Text(
          'Get alerts for messages, attendance, and payments. We will ask your phone to allow notifications.',
          style: TextStyle(
            color: Theme.of(ctx).brightness == Brightness.dark ? Colors.grey.shade300 : const Color(0xFF6B6F8D),
            fontSize: 14,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Later', style: TextStyle(color: Color(0xFF6B6F8D))),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                if (Platform.isAndroid) {
                  // Open this app's notification settings on Android
                  const channel = MethodChannel('app.channel.shared.data');
                  try {
                    await channel.invokeMethod('openNotificationSettings');
                  } catch (_) {
                    await launchUrl(
                      Uri.parse('package:com.skoolific.guardian'),
                      mode: LaunchMode.externalApplication,
                    );
                  }
                }
              } catch (e) {
                // silently ignore - not critical
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text(
              'Allow',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isKeyboard = MediaQuery.of(context).viewInsets.bottom > 0;

    return Scaffold(
      body: Container(
        height: size.height,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppColors.primaryDark,
              AppColors.primary,
              AppColors.primaryDark,
            ],
          ),
        ),
        child: Stack(
          children: [
            _BackgroundArt(size: size),
            // Logo at top center
            Positioned(
              top: isKeyboard ? 40 : 80,
              left: 0,
              right: 0,
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const CircleLogo(),
                    const SizedBox(height: 12),
                    Image.asset('assets/images/skoolific.png', width: 140),
                  ],
                ),
              ),
            ),
            // Login card centered on screen
            Positioned.fill(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (!isKeyboard) const SizedBox(height: 120),
                      _LoginCard(
                        branchCtrl: _branchCtrl,
                        usernameCtrl: _usernameCtrl,
                        passwordCtrl: _passwordCtrl,
                        obscure: _obscure,
                        remember: _remember,
                        loading: _loading,
                        connectionError: _connectionError,
                        branchError: _branchError,
                        credentialError: _credentialError,
                        onBranchChanged: _onBranchChanged,
                        onUsernameChanged: _onUsernameChanged,
                        onToggleObscure: _toggleObscure,
                        onToggleRemember: _toggleRemember,
                        onNeedHelp: _needHelp,
                        onSubmit: _submit,
                        onClearErrors: _clearErrors,
                        onMounted: _maybeAskNotifications,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BackgroundArt extends StatelessWidget {
  final Size size;
  const _BackgroundArt({required this.size});

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: Stack(
        children: [
          Positioned(
            top: -60,
            left: -60,
            child: Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.06),
              ),
            ),
          ),
          Positioned(
            top: 20,
            right: 0,
            child: _DotGrid(rows: 5, cols: 5, spacing: 14),
          ),
          Positioned(
            left: -40,
            top: size.height * 0.35,
            child: Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.05),
              ),
            ),
          ),
          Positioned(
            right: -30,
            top: size.height * 0.5,
            child: Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.04),
              ),
            ),
          ),
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            height: 100,
            child: CustomPaint(
              painter: _WavePainter(),
              child: Container(),
            ),
          ),
          Positioned(
            bottom: 20,
            left: 0,
            child: _DotGrid(rows: 5, cols: 5, spacing: 12),
          ),
        ],
      ),
    );
  }
}

class _DotGrid extends StatelessWidget {
  final int rows;
  final int cols;
  final double spacing;
  const _DotGrid({required this.rows, required this.cols, required this.spacing});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(cols, (c) => Column(
        mainAxisSize: MainAxisSize.min,
        children: List.generate(rows, (r) => Container(
          width: 4,
          height: 4,
          margin: EdgeInsets.all(spacing / 2),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white.withValues(alpha: 0.18),
          ),
        )),
      )),
    );
  }
}

class _WavePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5
      ..color = Colors.white.withValues(alpha: 0.12);

    for (int i = 0; i < 4; i++) {
      final path = Path();
      final baseY = size.height * 0.15 * (i + 1);
      path.moveTo(0, baseY);
      for (double x = 0; x <= size.width; x += 20) {
        final y = baseY + 8 * (x % 40 == 0 ? 1 : -1);
        path.lineTo(x, y);
      }
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class CircleLogo extends StatelessWidget {
  const CircleLogo({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: ClipOval(
        child: Image.asset(
          'assets/images/skoolific.png', // FIX 4: Skoolific logo (was IQRA)
          width: 56,
          height: 56,
          fit: BoxFit.contain,
        ),
      ),
    );
  }
}

class _LoginCard extends StatefulWidget {
  final TextEditingController branchCtrl;
  final TextEditingController usernameCtrl;
  final TextEditingController passwordCtrl;
  final bool obscure;
  final bool remember;
  final bool loading;
  final String? connectionError;
  final String? branchError;
  final String? credentialError;
  final ValueChanged<String> onBranchChanged;
  final ValueChanged<String> onUsernameChanged;
  final VoidCallback onToggleObscure;
  final ValueChanged<bool> onToggleRemember;
  final VoidCallback onNeedHelp;
  final VoidCallback onSubmit;
  final VoidCallback onClearErrors;
  final VoidCallback onMounted;

  const _LoginCard({
    required this.branchCtrl,
    required this.usernameCtrl,
    required this.passwordCtrl,
    required this.obscure,
    required this.remember,
    required this.loading,
    required this.connectionError,
    required this.branchError,
    required this.credentialError,
    required this.onBranchChanged,
    required this.onUsernameChanged,
    required this.onToggleObscure,
    required this.onToggleRemember,
    required this.onNeedHelp,
    required this.onSubmit,
    required this.onClearErrors,
    required this.onMounted,
  });

  @override
  State<_LoginCard> createState() => _LoginCardState();
}

class _LoginCardState extends State<_LoginCard> {
  @override
  void initState() {
    super.initState();
    // 1.1: ask about notifications only once and only if they're off
    WidgetsBinding.instance.addPostFrameCallback((_) {
      widget.onMounted();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      constraints: const BoxConstraints(maxWidth: 400),
      margin: const EdgeInsets.symmetric(horizontal: 24),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: isDark ? const Color(0xFF2C2C2C) : Colors.transparent),
        boxShadow: isDark
            ? [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.4),
                  blurRadius: 24,
                  offset: const Offset(0, 8),
                ),
              ]
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.10),
                  blurRadius: 30,
                  offset: const Offset(0, 10),
                ),
              ],
      ),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 32),
          child: Form(
            key: _formKeyState,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Sign In header with lock icon
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.primary.withValues(alpha: 0.25) : AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        Icons.lock_outline,
                        size: 20,
                        color: isDark ? const Color(0xFFE8A87C) : AppColors.primary,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Text(
                      tr(context, 'sign_in_btn'),
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : AppColors.primaryDark,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 28),

                // Connection error (top, prominent)
                if (widget.connectionError != null) ...[
                  _ErrorBanner(
                    message: widget.connectionError!,
                    onDismiss: widget.onClearErrors,
                  ),
                  const SizedBox(height: 20),
                ],

                // Branch Code field (1.3 modern style)
                _ModernField(
                  icon: Icons.account_balance_outlined,
                  label: tr(context, 'branch_code'),
                  placeholder: tr(context, 'enter_branch'),
                  controller: widget.branchCtrl,
                  onChanged: widget.onBranchChanged,
                  error: widget.branchError,
                ),
                const SizedBox(height: 16),

                // Username field
                _ModernField(
                  icon: Icons.person_outline,
                  label: 'Username',
                  placeholder: tr(context, 'enter_username'),
                  controller: widget.usernameCtrl,
                  onChanged: widget.onUsernameChanged,
                  error: widget.credentialError,
                ),
                const SizedBox(height: 16),

                // Password field
                _ModernField(
                  icon: Icons.lock_outline,
                  label: 'Password',
                  placeholder: tr(context, 'enter_password'),
                  controller: widget.passwordCtrl,
                  obscure: widget.obscure,
                  onToggle: widget.onToggleObscure,
                  onChanged: (_) {},
                ),
                const SizedBox(height: 12),

                // Credential error below password field
                if (widget.credentialError != null && widget.connectionError == null) ...[
                  _InlineError(
                    message: widget.credentialError!,
                    onDismiss: widget.onClearErrors,
                  ),
                  const SizedBox(height: 4),
                ],

                const SizedBox(height: 16),
                Row(
                  children: [
                    _RememberMe(
                      value: widget.remember,
                      onChanged: widget.onToggleRemember,
                    ),
                    const Spacer(),
                    // 1.5: single Need help? link (replaces Forgot Password)
                    TextButton(
                      onPressed: widget.onNeedHelp,
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: Text(
                        'Need help?',
                        style: TextStyle(
                          color: isDark ? const Color(0xFFE8A87C) : AppColors.primary,
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                _PrimaryButton(
                  onPressed: widget.onSubmit,
                  loading: widget.loading,
                  hasError: widget.connectionError != null ||
                      widget.branchError != null ||
                      widget.credentialError != null,
                ),
                const SizedBox(height: 20),
                _HelpFooter(onTap: widget.onNeedHelp),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

final _formKeyState = GlobalKey<FormState>();

class _ErrorBanner extends StatelessWidget {
  final String message;
  final VoidCallback onDismiss;
  const _ErrorBanner({required this.message, required this.onDismiss});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.accent.withValues(alpha: isDark ? 0.18 : 0.10),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: AppColors.accent.withValues(alpha: 0.4),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.error_outline,
            size: 18,
            color: isDark ? const Color(0xFFE8A87C) : AppColors.accent,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                color: isDark ? const Color(0xFFE8A87C) : AppColors.primaryDark,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: onDismiss,
            child: Icon(
              Icons.close,
              size: 16,
              color: isDark ? Colors.grey.shade400 : const Color(0xFF9AA0BB),
            ),
          ),
        ],
      ),
    );
  }
}

class _InlineError extends StatelessWidget {
  final String message;
  final VoidCallback onDismiss;
  const _InlineError({required this.message, required this.onDismiss});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Row(
      children: [
        Icon(
          Icons.info_outline,
          size: 14,
          color: isDark ? const Color(0xFFE8A87C) : AppColors.primary,
        ),
        const SizedBox(width: 4),
        Expanded(
          child: Text(
            message,
            style: TextStyle(
              color: isDark ? const Color(0xFFE8A87C) : AppColors.primary,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        GestureDetector(
          onTap: onDismiss,
          child: Icon(
            Icons.close,
            size: 14,
            color: isDark ? Colors.grey.shade500 : const Color(0xFF9AA0BB),
          ),
        ),
      ],
    );
  }
}

/// 1.3: Modern input field — floating label above, icon chip, filled surface,
/// focus glow, subtle elevation. Dark-mode aware colors (1.2 fix).
class _ModernField extends StatefulWidget {
  final IconData icon;
  final String label;
  final String placeholder;
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final bool obscure;
  final VoidCallback? onToggle;
  final String? error;

  const _ModernField({
    required this.icon,
    required this.label,
    required this.placeholder,
    required this.controller,
    required this.onChanged,
    this.obscure = false,
    this.onToggle,
    this.error,
  });

  @override
  State<_ModernField> createState() => _ModernFieldState();
}

class _ModernFieldState extends State<_ModernField> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hasError = widget.error != null && widget.error!.isNotEmpty;

    final Color labelColor = hasError
        ? (isDark ? const Color(0xFFE8A87C) : AppColors.primary)
        : (isDark ? Colors.white : AppColors.text); // 1.2: readable labels
    final Color typedColor = isDark ? Colors.white : AppColors.text; // 1.2: readable typed text
    final Color fieldFill = isDark ? const Color(0xFF2A2A2A) : const Color(0xFFF7F8FC);
    final Color borderColor = hasError
        ? (isDark ? const Color(0xFFE8A87C) : AppColors.primary)
        : (_focused
            ? (isDark ? const Color(0xFFE8A87C) : AppColors.primary)
            : (isDark ? const Color(0xFF3A3A3A) : AppColors.border));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              widget.label,
              style: TextStyle(
                color: labelColor,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            if (hasError) ...[
              const SizedBox(width: 6),
              Icon(Icons.error, size: 12, color: labelColor),
            ],
          ],
        ),
        if (hasError) ...[
          const SizedBox(height: 2),
          Text(
            widget.error!,
            style: TextStyle(
              color: isDark ? const Color(0xFFE8A87C) : AppColors.primary,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
        const SizedBox(height: 8),
        AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          height: 52,
          decoration: BoxDecoration(
            color: fieldFill,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: borderColor, width: _focused ? 1.6 : 1.2),
            boxShadow: _focused
                ? [
                    BoxShadow(
                      color: (isDark ? const Color(0xFFE8A87C) : AppColors.primary)
                          .withValues(alpha: 0.25),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.04),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
          ),
          child: Row(
            children: [
              const SizedBox(width: 6),
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: _focused
                      ? (isDark ? AppColors.primary.withValues(alpha: 0.35) : AppColors.primaryLight)
                      : (isDark ? Colors.white.withValues(alpha: 0.08) : Colors.white),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  widget.icon,
                  size: 17,
                  color: _focused
                      ? (isDark ? const Color(0xFFE8A87C) : AppColors.primary)
                      : (isDark ? Colors.grey.shade300 : AppColors.textMuted),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Focus(
                  onFocusChange: (f) => setState(() => _focused = f),
                  child: TextFormField(
                    controller: widget.controller,
                    obscureText: widget.obscure,
                    onChanged: widget.onChanged,
                    style: TextStyle(
                      fontSize: 15,
                      color: typedColor,
                      fontWeight: FontWeight.w600,
                    ),
                    decoration: InputDecoration(
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      hintText: widget.placeholder,
                      hintStyle: TextStyle(
                        fontSize: 14,
                        color: isDark ? Colors.grey.shade500 : AppColors.textMuted,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ),
                ),
              ),
              if (widget.onToggle != null)
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: widget.onToggle,
                    child: Padding(
                      padding: const EdgeInsets.only(right: 12),
                      child: Icon(
                        widget.obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                        size: 20,
                        color: isDark ? Colors.grey.shade400 : AppColors.textMuted,
                      ),
                    ),
                  ),
                ),
              if (widget.onToggle == null) const SizedBox(width: 12),
            ],
          ),
        ),
      ],
    );
  }
}

class _RememberMe extends StatelessWidget {
  final bool value;
  final ValueChanged<bool> onChanged;
  const _RememberMe({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return InkWell(
      onTap: () => onChanged(!value),
      borderRadius: BorderRadius.circular(6),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.rectangle,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(
                  color: value
                      ? (isDark ? const Color(0xFFE8A87C) : AppColors.primary)
                      : (isDark ? Colors.grey.shade600 : const Color(0xFFD3D7E8)),
                  width: 1.5,
                ),
                color: value
                    ? (isDark ? const Color(0xFFE8A87C) : AppColors.primary)
                    : Colors.transparent,
              ),
              child: value
                  ? const Icon(Icons.check, size: 13, color: Colors.white, weight: 2.5)
                  : null,
            ),
            const SizedBox(width: 8),
            Text(
              tr(context, 'remember_me'),
              style: TextStyle(
                color: isDark ? Colors.grey.shade300 : const Color(0xFF6B6F8D),
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PrimaryButton extends StatelessWidget {
  final VoidCallback onPressed;
  final bool loading;
  final bool hasError;
  const _PrimaryButton({
    required this.onPressed,
    required this.loading,
    required this.hasError,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: loading ? null : onPressed,
      borderRadius: BorderRadius.circular(16),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        height: 52,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppColors.primary, AppColors.accent],
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AppColors.accent.withValues(alpha: 0.40),
              blurRadius: 18,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Center(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (loading)
                LoadingAnimationWidget.staggeredDotsWave(
                  color: Colors.white,
                  size: 26,
                )
              else
                const Icon(Icons.login_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 10),
              Text(
                hasError ? tr(context, 'try_again') : tr(context, 'sign_in_btn'),
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                  letterSpacing: 0.3,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HelpFooter extends StatelessWidget {
  final VoidCallback onTap;
  const _HelpFooter({required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: isDark ? Colors.white.withValues(alpha: 0.05) : const Color(0xFFF7F8FC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark ? const Color(0xFF2C2C2C) : AppColors.border,
            width: 1,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
          child: Wrap(
            alignment: WrapAlignment.center,
            spacing: 4,
            runAlignment: WrapAlignment.center,
            children: [
              Text(
                tr(context, 'need_help'),
                style: TextStyle(
                  color: isDark ? Colors.grey.shade300 : const Color(0xFF6B6F8D),
                  fontSize: 13,
                ),
              ),
              Text(
                tr(context, 'need_help_msg'),
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: isDark ? const Color(0xFFE8A87C) : AppColors.primary,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
