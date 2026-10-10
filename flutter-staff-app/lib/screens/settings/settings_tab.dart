import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/l10n/app_localizations.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/page_header.dart';
import '../../app/app_provider.dart';
import '../../core/services/api_service.dart';
import '../login/login_screen.dart';

class SettingsTab extends StatelessWidget {
  const SettingsTab({super.key});

  @override
  Widget build(BuildContext context) {
    final prov = Provider.of<AppProvider>(context);
    final user = prov.user;
    final profile = prov.profile;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            PageHeader(
              title: tr(context, 'settings'),
              icon: Icons.settings_outlined,
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                children: [
                  // User Summary Card
                  if (user != null)
                    AppCard(
                      child: Row(
                        children: [
                          AvatarCircle(
                            name: profile?.name ?? user.name,
                            imageUrl: profile?.imageStaff,
                            size: 52,
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  profile?.name.isNotEmpty == true ? profile!.name : user.name,
                                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${user.staffType} • ${user.branchCode}',
                                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 18),

                  // Appearance Section
                  SectionHeader(tr(context, 'dark_mode')),
                  AppCard(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      children: [
                        _radioTile(
                          'Light Mode',
                          Icons.light_mode_outlined,
                          prov.themeMode == ThemeMode.light,
                          () => prov.setTheme(ThemeMode.light),
                        ),
                        const Divider(height: 12),
                        _radioTile(
                          'Dark Mode',
                          Icons.dark_mode_outlined,
                          prov.themeMode == ThemeMode.dark,
                          () => prov.setTheme(ThemeMode.dark),
                        ),
                        const Divider(height: 12),
                        _radioTile(
                          'System Default',
                          Icons.settings_brightness_outlined,
                          prov.themeMode == ThemeMode.system,
                          () => prov.setTheme(ThemeMode.system),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Language Section
                  SectionHeader(tr(context, 'language')),
                  AppCard(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      children: [
                        _langTile('English', 'en', prov),
                        const Divider(height: 12),
                        _langTile('Af-Soomaali', 'so', prov),
                        const Divider(height: 12),
                        _langTile('አማርኛ (Amharic)', 'am', prov),
                        const Divider(height: 12),
                        _langTile('العربية (Arabic)', 'ar', prov),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Account Section (spec 9: change username / password)
                  SectionHeader(tr(context, 'account')),
                  AppCard(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                    child: Column(
                      children: [
                        ListTile(
                          leading: const Icon(Icons.person_outline,
                              color: AppColors.primary),
                          title: Text(
                            tr(context, 'change_username'),
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          subtitle: Text(
                            user?.username ?? '',
                            style: const TextStyle(
                                color: AppColors.textMuted, fontSize: 12),
                          ),
                          trailing: const Icon(Icons.chevron_right,
                              color: AppColors.textMuted),
                          onTap: () => _changeUsernameDialog(context),
                        ),
                        const Divider(height: 8),
                        ListTile(
                          leading: const Icon(Icons.lock_outline,
                              color: AppColors.primary),
                          title: Text(
                            tr(context, 'change_password'),
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          trailing: const Icon(Icons.chevron_right,
                              color: AppColors.textMuted),
                          onTap: () => _changePasswordDialog(context),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),

                  // App Info
                  AppCard(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('IQRA Staff Mobile', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                            SizedBox(height: 2),
                            Text('Version 1.1.0 (Build 2)', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                          ],
                        ),
                        Image.asset('assets/images/logo.png', width: 32, height: 32),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Sign Out Button
                  ElevatedButton.icon(
                    onPressed: () => _confirmSignOut(context),
                    icon: const Icon(Icons.logout, color: Colors.white),
                    label: Text(tr(context, 'sign_out')),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.danger,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                    ),
                  ),
                  const SizedBox(height: 30),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _radioTile(String label, IconData icon, bool isSel, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: Row(
          children: [
            Icon(icon, size: 20, color: isSel ? AppColors.primary : AppColors.textSecondary),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                  fontSize: 14,
                  color: isSel ? AppColors.primary : null,
                ),
              ),
            ),
            if (isSel) const Icon(Icons.check_circle, color: AppColors.primary, size: 20),
          ],
        ),
      ),
    );
  }

  Widget _langTile(String label, String code, AppProvider prov) {
    final isSel = prov.locale.languageCode == code;
    return GestureDetector(
      onTap: () => prov.setLocale(Locale(code)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                  fontSize: 14,
                  color: isSel ? AppColors.primary : null,
                ),
              ),
            ),
            if (isSel) const Icon(Icons.check_circle, color: AppColors.primary, size: 20),
          ],
        ),
      ),
    );
  }

  /// Server-side failure reason (the backend returns `{error: "..."}`), so we
  /// can show "Username already exists" instead of a generic auth message.
  String? _serverError(Map<String, dynamic> res) {
    final body = res['body'];
    if (body is Map) {
      for (final k in ['error', 'message', 'msg']) {
        final v = body[k];
        if (v is String && v.trim().isNotEmpty) return v.trim();
      }
    }
    return null;
  }

  Future<void> _changeUsernameDialog(BuildContext context) async {
    final prov = Provider.of<AppProvider>(context, listen: false);
    final currentCtrl = TextEditingController(text: prov.user?.username ?? '');
    final newCtrl = TextEditingController();
    final passCtrl = TextEditingController();
    String? err;
    String? newUsername;

    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(tr(context, 'change_username')),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: currentCtrl,
              decoration: InputDecoration(labelText: tr(context, 'username')),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: newCtrl,
              decoration: InputDecoration(labelText: tr(context, 'new_username')),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: passCtrl,
              obscureText: true,
              decoration: InputDecoration(labelText: tr(context, 'password')),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(tr(context, 'cancel')),
          ),
          ElevatedButton(
            onPressed: () async {
              if (currentCtrl.text.trim().isEmpty ||
                  newCtrl.text.trim().isEmpty ||
                  passCtrl.text.isEmpty) {
                Navigator.pop(ctx, false);
                if (ctx.mounted) showError(context, tr(context, 'invalid_credentials'));
                return;
              }
              try {
                final res = await ApiService().changeUsername(
                  currentUsername: currentCtrl.text.trim(),
                  newUsername: newCtrl.text.trim(),
                  password: passCtrl.text,
                );
                if (res['ok'] == true) {
                  newUsername = newCtrl.text.trim();
                } else {
                  err = _serverError(res) ?? tr(context, 'invalid_credentials');
                }
                if (!ctx.mounted) return;
                Navigator.pop(ctx, res['ok'] == true);
              } catch (_) {
                err = tr(context, 'save_failed');
                if (ctx.mounted) Navigator.pop(ctx, false);
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            child: Text(tr(context, 'save'), style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (saved == true) {
      if (newUsername != null) await prov.updateUsername(newUsername!);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(tr(context, 'username_updated')),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } else if (saved == false && context.mounted) {
      showError(context, err ?? tr(context, 'invalid_credentials'));
    }
  }

  Future<void> _changePasswordDialog(BuildContext context) async {
    final prov = Provider.of<AppProvider>(context, listen: false);
    final userCtrl = TextEditingController(text: prov.user?.username ?? '');
    final currentCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();
    String? err;

    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(tr(context, 'change_password')),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: userCtrl,
              decoration: InputDecoration(labelText: tr(context, 'username')),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: currentCtrl,
              obscureText: true,
              decoration: InputDecoration(labelText: tr(context, 'current_password')),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: newCtrl,
              obscureText: true,
              decoration: InputDecoration(labelText: tr(context, 'new_password')),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: confirmCtrl,
              obscureText: true,
              decoration: InputDecoration(labelText: tr(context, 'confirm_password')),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(tr(context, 'cancel')),
          ),
          ElevatedButton(
            onPressed: () async {
              if (newCtrl.text != confirmCtrl.text) {
                if (ctx.mounted) showError(context, tr(context, 'mismatch'));
                return;
              }
              if (userCtrl.text.trim().isEmpty ||
                  currentCtrl.text.isEmpty ||
                  newCtrl.text.isEmpty) {
                Navigator.pop(ctx, false);
                if (ctx.mounted) showError(context, tr(context, 'invalid_credentials'));
                return;
              }
              try {
                final res = await ApiService().changePassword(
                  username: userCtrl.text.trim(),
                  currentPassword: currentCtrl.text,
                  newPassword: newCtrl.text,
                );
                if (res['ok'] != true) {
                  err = _serverError(res) ?? tr(context, 'invalid_credentials');
                }
                if (!ctx.mounted) return;
                Navigator.pop(ctx, res['ok'] == true);
              } catch (_) {
                err = tr(context, 'save_failed');
                if (ctx.mounted) Navigator.pop(ctx, false);
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            child: Text(tr(context, 'save'), style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (saved == true && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(tr(context, 'password_updated')),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } else if (saved == false && context.mounted) {
      showError(context, err ?? tr(context, 'invalid_credentials'));
    }
  }

  void _confirmSignOut(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(tr(context, 'sign_out')),
        content: Text(tr(context, 'are_you_sure_sign_out')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(tr(context, 'cancel')),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final prov = Provider.of<AppProvider>(context, listen: false);
              await prov.logout();
              if (context.mounted) {
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (r) => false,
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            child: Text(tr(context, 'sign_out')),
          ),
        ],
      ),
    );
  }
}
