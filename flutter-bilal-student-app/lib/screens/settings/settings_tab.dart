import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/ethiopian_date.dart';
import '../../app/app_provider.dart';
import '../login/login_screen.dart';
import '../../widgets/app_widgets.dart';
import '../../models/models.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/services/api_service.dart';
import '../../core/services/storage_service.dart' as storage;

class SettingsTab extends StatelessWidget {
  const SettingsTab({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(title: Text(AppLocalizations.tr(context, 'settings'))),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          // Profile Button
          AppCard(
            padding: const EdgeInsets.all(16),
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen())),
            child: Row(
              children: [
                const AvatarCircle(name: 'G', size: 50),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(AppLocalizations.tr(context, 'profile'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Text('@${provider.user?.username ?? ''}', style: const TextStyle(color: Colors.grey)),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: Colors.grey),
              ],
            ),
          ),
          const SizedBox(height: 32),
          
          SectionTitle(AppLocalizations.tr(context, 'settings')),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                _SettingsRow(
                  Icons.language,
                  AppLocalizations.tr(context, 'language'),
                  provider.locale.languageCode.toUpperCase(),
                  onTap: () => _showLanguageDialog(context, provider),
                ),
                const Divider(height: 1),
                _SettingsRow(
                  Icons.dark_mode_outlined,
                  AppLocalizations.tr(context, 'dark_mode'),
                  '',
                  trailing: Switch(
                    value: isDark,
                    onChanged: (v) => provider.toggleTheme(),
                    activeColor: AppColors.primary,
                  ),
                ),
                const Divider(height: 1),
                _SettingsRow(
                  Icons.password,
                  tr(context, 'change_password'),
                  '',
                  onTap: () => _showChangePasswordDialog(context),
                ),
                const Divider(height: 1),
                _SettingsRow(
                  Icons.person_outline,
                  'Change Username',
                  '',
                  onTap: () => _showChangeUsernameDialog(context),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          PrimaryButton(
            label: AppLocalizations.tr(context, 'logout'),
            onPressed: () {
              // FIX: clear the session AND clear the navigation stack in one
              // step. provider.logout() alone left this page on the stack
              // (logout seemed to do nothing until BACK was pressed), and
              // pushAndRemoveUntil alone duplicated the login (blank card).
              provider.logout();
              Navigator.of(context, rootNavigator: true)
                  .pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const LoginScreen()),
                (r) => false,
              );
            },
          ),
        ],
      ),
    );
  }

  void _showLanguageDialog(BuildContext context, AppProvider provider) {
    final langs = {
      'en': 'English',
      'so': 'Soomaali',
      'am': 'አማርኛ (Amharic)',
      'ar': 'العربية (Arabic)',
      'om': 'Afaan Oromo',
    };
    final codes = provider.locale.languageCode;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(AppLocalizations.tr(context, 'language')),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ...langs.entries.map((e) => ListTile(
              title: Text(e.value),
              trailing: codes == e.key ? const Icon(Icons.check_circle, color: AppColors.primary) : null,
              onTap: () { provider.setLocale(Locale(e.key)); Navigator.pop(ctx); },
            )),
          ],
        ),
      ),
    );
  }

  // T10: REAL change password — calls the backend, updates the roster
  void _showChangePasswordDialog(BuildContext context) {
    final app = Provider.of<AppProvider>(context, listen: false);
    final username = app.user?.username ?? '';
    final oldCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();
    bool saving = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text(tr(context, 'change_password')),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: oldCtrl,
                obscureText: true,
                decoration: InputDecoration(labelText: tr(context, 'old_password')),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: newCtrl,
                obscureText: true,
                decoration: InputDecoration(labelText: tr(context, 'new_password')),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: confirmCtrl,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Confirm new password'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text(tr(context, 'cancel'))),
            ElevatedButton(
              onPressed: saving ? null : () async {
                if (oldCtrl.text.isEmpty || newCtrl.text.isEmpty) return;
                if (newCtrl.text != confirmCtrl.text) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                      content: Text('New passwords do not match')));
                  return;
                }
                setDialogState(() => saving = true);
                final err = await ApiService()
                    .changePassword(username, oldCtrl.text, newCtrl.text);
                setDialogState(() => saving = false);
                if (!ctx.mounted) return;
                if (err == null) {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                      content: Text('Password changed successfully'),
                      backgroundColor: AppColors.success));
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(err), backgroundColor: AppColors.danger));
                }
              },
              child: saving
                  ? const SizedBox(width: 18, height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : Text(tr(context, 'save')),
            ),
          ],
        ),
      ),
    );
  }

  // T10: REAL change username — calls the backend; server rejects duplicates
  void _showChangeUsernameDialog(BuildContext context) {
    final app = Provider.of<AppProvider>(context, listen: false);
    final currentUsername = app.user?.username ?? '';
    final newCtrl = TextEditingController();
    final passCtrl = TextEditingController();
    bool saving = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Change Username'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Current: $currentUsername',
                  style: const TextStyle(fontSize: 13, color: Colors.grey)),
              const SizedBox(height: 12),
              TextField(
                controller: newCtrl,
                decoration: const InputDecoration(labelText: 'New username'),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: passCtrl,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Confirm with password'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text(tr(context, 'cancel'))),
            ElevatedButton(
              onPressed: saving ? null : () async {
                if (newCtrl.text.trim().isEmpty || passCtrl.text.isEmpty) return;
                setDialogState(() => saving = true);
                final err = await ApiService()
                    .changeUsername(currentUsername, newCtrl.text.trim(), passCtrl.text);
                setDialogState(() => saving = false);
                if (!ctx.mounted) return;
                if (err == null) {
                  Navigator.pop(ctx);
                  // update the stored session so the app keeps working with the new username
                  try {
                    final raw = storage.StorageService.user;
                    if (raw != null) {
                      final u = jsonDecode(raw) as Map<String, dynamic>;
                      u['username'] = newCtrl.text.trim();
                      await storage.StorageService.saveSession(
                        token: storage.StorageService.token ?? '',
                        user: jsonEncode(u),
                        branchCode: storage.StorageService.branchCode ?? '',
                      );
                      await storage.StorageService.setRememberedUsername(newCtrl.text.trim());
                    }
                  } catch (_) {}
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                      content: Text('Username changed successfully'),
                      backgroundColor: AppColors.success));
                } else {
                  // server rejects duplicates with 'Username already exists'
                  ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(err), backgroundColor: AppColors.danger));
                }
              },
              child: saving
                  ? const SizedBox(width: 18, height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : Text(tr(context, 'save')),
            ),
          ],
        ),
      ),
    );
  }
}

class _SettingsRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final VoidCallback? onTap;
  final Widget? trailing;

  const _SettingsRow(this.icon, this.title, this.value, {this.onTap, this.trailing});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Row(
          children: [
            Icon(icon, color: Colors.grey),
            const SizedBox(width: 16),
            Expanded(child: Text(title, style: const TextStyle(fontSize: 16))),
            if (value.isNotEmpty) Text(value, style: const TextStyle(color: Colors.grey)),
            if (trailing != null) trailing!,
            if (trailing == null && onTap != null) const Icon(Icons.chevron_right, color: Colors.grey),
          ],
        ),
      ),
    );
  }
}

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    setState(() => _loading = true);
    final app = Provider.of<AppProvider>(context, listen: false);
    try {
      final fresh = await ApiService().studentProfile(app.user?.username ?? '');
      if (fresh != null && fresh.username.isNotEmpty && mounted) {
        app.setUser(fresh);
      }
    } catch (_) {
      // server may lack the profile endpoint — keep cached data
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final app = Provider.of<AppProvider>(context);
    final user = app.user;

    Widget row(String label, String value) {
      final v = value.trim();
      if (v.isEmpty) return const SizedBox.shrink();
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 110,
              child: Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
            ),
            Expanded(
              child: Text(v, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(AppLocalizations.tr(context, 'profile')),
        actions: [
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(14),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          else
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _refresh,
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const SizedBox(height: 20),
            AvatarCircle(name: user?.name ?? 'S', size: 80),
            const SizedBox(height: 16),
            Text(
              user?.name ?? '',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            Text(
              '@${user?.username ?? ''}',
              style: const TextStyle(color: Colors.grey, fontSize: 16),
            ),
            const SizedBox(height: 20),
            Card(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Column(
                  children: [
                    row('Phone', user?.phone ?? ''),
                    row('Class', user?.className ?? ''),
                    row('Gender', user?.gender ?? ''),
                    row('Age', user?.age ?? ''),
                    row('School ID', user?.schoolId ?? ''),
                    row('Branch', user?.branchCode ?? ''),
                    row('Role', user?.role ?? ''),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}



