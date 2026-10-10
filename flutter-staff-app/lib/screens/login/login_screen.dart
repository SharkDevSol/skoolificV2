import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/services/api_service.dart';
import '../../core/services/storage_service.dart';
import '../../widgets/app_widgets.dart';
import '../../app/app_provider.dart';
import '../../app/app_shell.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _branchCtrl = TextEditingController();
  final _userCtrl = TextEditingController();
  final _passCtrl = TextEditingController();

  bool _obscurePass = true;
  bool _rememberMe = false;
  bool _loading = false;
  String? _error;

  final List<String> _quickBranches = ['IQRA1', 'IQRA2', 'IQRA3', 'IQRA4', 'IQRA5'];

  @override
  void initState() {
    super.initState();
    _rememberMe = StorageService.rememberMe;
    final savedBranch = StorageService.branchCode ?? StorageService.savedBranchCode ?? 'IQRA1';
    _branchCtrl.text = savedBranch;

    if (_rememberMe) {
      _userCtrl.text = StorageService.rememberedUsername ?? '';
      _passCtrl.text = StorageService.rememberedPassword ?? '';
    }
  }

  @override
  void dispose() {
    _branchCtrl.dispose();
    _userCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final branch = _branchCtrl.text.trim().toUpperCase();
    final username = _userCtrl.text.trim();
    final password = _passCtrl.text;

    if (branch.isEmpty) {
      setState(() => _error = tr(context, 'branch_required'));
      return;
    }
    if (username.isEmpty) {
      setState(() => _error = tr(context, 'username_required'));
      return;
    }
    if (password.isEmpty) {
      setState(() => _error = tr(context, 'password_required'));
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final res = await ApiService().login(
        branchCode: branch,
        username: username,
        password: password,
      );

      final token = res['token']?.toString() ?? '';
      final userData = res['user'] is Map ? Map<String, dynamic>.from(res['user']) : <String, dynamic>{};
      final profileData = res['profile'] is Map ? Map<String, dynamic>.from(res['profile']) : <String, dynamic>{};

      if (token.isEmpty) {
        throw Exception('Server did not return a valid authentication token');
      }

      await StorageService.setRememberMe(
        _rememberMe,
        username: username,
        password: password,
      );

      if (!mounted) return;
      final provider = Provider.of<AppProvider>(context, listen: false);
      await provider.loginSuccess(
        token: token,
        userData: userData,
        profileData: profileData,
        branchCode: branch,
      );

      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const AppShell()),
      );
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceAll('Exception:', '').trim();
        });
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      body: GradientBackground(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Brand Logo — Skoolific mark, sized to read clearly
                    // against the gradient background (not oversized).
                    Container(
                      width: 150,
                      height: 150,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(isDark ? 0.45 : 0.12),
                            blurRadius: 20,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.all(14),
                      child: Image.asset(
                        'assets/images/skoolific.png',
                        fit: BoxFit.contain,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      tr(context, 'app_title'),
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : AppColors.primary,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      tr(context, 'sign_in'),
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? Colors.white70 : AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Login Card
                    AppCard(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Quick Branch Pills
                          Text(
                            tr(context, 'branch_code'),
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 8),
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: _quickBranches.map((b) {
                                final isSelected = _branchCtrl.text.toUpperCase() == b;
                                return GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      _branchCtrl.text = b;
                                    });
                                  },
                                  child: Container(
                                    margin: const EdgeInsets.only(right: 8),
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? AppColors.primary
                                          : (isDark ? const Color(0xFF2C2C2C) : AppColors.primarySoft),
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      b,
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: isSelected
                                            ? Colors.white
                                            : (isDark ? Colors.white70 : AppColors.primary),
                                      ),
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _branchCtrl,
                            textCapitalization: TextCapitalization.characters,
                            decoration: InputDecoration(
                              hintText: tr(context, 'branch_code'),
                              prefixIcon: const Icon(Icons.apartment_rounded, color: AppColors.primary),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Username
                          Text(
                            tr(context, 'username'),
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _userCtrl,
                            decoration: InputDecoration(
                              hintText: tr(context, 'username'),
                              prefixIcon: const Icon(Icons.person_rounded, color: AppColors.primary),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Password
                          Text(
                            tr(context, 'password'),
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _passCtrl,
                            obscureText: _obscurePass,
                            decoration: InputDecoration(
                              hintText: tr(context, 'password'),
                              prefixIcon: const Icon(Icons.lock_rounded, color: AppColors.primary),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePass ? Icons.visibility_off : Icons.visibility,
                                  color: AppColors.textMuted,
                                ),
                                onPressed: () => setState(() => _obscurePass = !_obscurePass),
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Remember Me
                          Row(
                            children: [
                              Checkbox(
                                value: _rememberMe,
                                activeColor: AppColors.primary,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                                onChanged: (v) => setState(() => _rememberMe = v ?? false),
                              ),
                              Text(
                                tr(context, 'remember_me'),
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                              ),
                            ],
                          ),

                          if (_error != null) ...[
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              decoration: BoxDecoration(
                                color: AppColors.dangerSoft,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.danger.withOpacity(0.3)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.error_outline, color: AppColors.danger, size: 18),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _error!,
                                      style: const TextStyle(color: AppColors.danger, fontSize: 13, fontWeight: FontWeight.w500),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          const SizedBox(height: 20),

                          // Submit Button
                          PrimaryButton(
                            label: tr(context, 'login'),
                            loading: _loading,
                            onPressed: _handleLogin,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Language Selector Row
                    Consumer<AppProvider>(
                      builder: (context, prov, _) {
                        return Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            _langChip('English', const Locale('en'), prov),
                            const SizedBox(width: 8),
                            _langChip('Soomaali', const Locale('so'), prov),
                            const SizedBox(width: 8),
                            _langChip('አማርኛ', const Locale('am'), prov),
                            const SizedBox(width: 8),
                            _langChip('العربية', const Locale('ar'), prov),
                          ],
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _langChip(String label, Locale loc, AppProvider prov) {
    final isSelected = prov.locale.languageCode == loc.languageCode;
    return GestureDetector(
      onTap: () => prov.setLocale(loc),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.black.withOpacity(0.06),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: isSelected ? Colors.white : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}
