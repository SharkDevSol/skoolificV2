import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../app/app_provider.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';
import '../login/login_screen.dart';

class AdminSettingsScreen extends StatelessWidget {
  const AdminSettingsScreen({super.key});

  String _roleLabel(String role) {
    final r = role.toLowerCase();
    if (r == 'super_admin' || r == 'admin') return 'Admin';
    if (r == 'sub-account' || r == 'sub_account') return 'Sub admin';
    if (r == 'staff-access' || r == 'staff_access') return 'Staff access';
    return role.isEmpty ? 'Admin' : role;
  }

  @override
  Widget build(BuildContext context) {
    final app = Provider.of<AppProvider>(context);
    final user = app.user;
    final isDark = app.themeMode == ThemeMode.dark;
    return Scaffold(
      appBar: AppBar(title: Text(tr(context, 'admin_settings'))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              leading: CircleAvatar(radius: 24, backgroundColor: AppColors.primary.withOpacity(0.15), child: Text((user?.name.isNotEmpty == true ? user!.name[0] : 'A').toUpperCase(), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primary))),
              title: Text(user?.name ?? tr(context, 'admin'), style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('@${user?.username ?? ''}\n${user?.branchCode ?? ''} • ${_roleLabel(user?.role ?? '')}'),
              isThreeLine: true,
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Column(children: [
              SwitchListTile(
                secondary: const Icon(Icons.dark_mode_outlined),
                title: Text(tr(context, 'dark_mode')),
                value: isDark,
                activeColor: AppColors.primary,
                onChanged: (v) => app.setTheme(v ? ThemeMode.dark : ThemeMode.light),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.language),
                title: Text(tr(context, 'language')),
                subtitle: Text(app.locale.languageCode.toUpperCase()),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => _languageDialog(context, app),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.password),
                title: Text(tr(context, 'change_password')),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => _changePassword(context, app),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.person_outline),
                title: Text(tr(context, 'change_username')),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => _changeUsername(context, app),
              ),
            ]),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () async {
              await app.logout();
              if (!context.mounted) return;
              Navigator.of(context, rootNavigator: true).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const LoginScreen()),
                (r) => false,
              );
            },
            icon: const Icon(Icons.logout),
            label: Text(tr(context, 'sign_out')),
          ),
        ],
      ),
    );
  }

  void _languageDialog(BuildContext context, AppProvider app) {
    const langs = {'en': 'English', 'so': 'Soomaali', 'om': 'Afaan Oromoo', 'am': 'Amharic', 'ar': 'Arabic'};
    showDialog(context: context, builder: (ctx) => AlertDialog(
      title: Text(tr(context, 'select_language')),
      content: Column(mainAxisSize: MainAxisSize.min, children: langs.entries.map((e) => ListTile(
        title: Text(e.value),
        trailing: app.locale.languageCode == e.key ? const Icon(Icons.check_circle, color: AppColors.primary) : null,
        onTap: () { app.setLocale(Locale(e.key)); Navigator.pop(ctx); },
      )).toList()),
    ));
  }

  void _changePassword(BuildContext context, AppProvider app) {
    final oldCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();
    bool saving = false;
    showDialog(context: context, builder: (ctx) => StatefulBuilder(builder: (ctx, setState) => AlertDialog(
      title: Text(tr(context, 'change_password')),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: oldCtrl, obscureText: true, decoration: InputDecoration(labelText: tr(context, 'current_password'))),
        const SizedBox(height: 12),
        TextField(controller: newCtrl, obscureText: true, decoration: InputDecoration(labelText: tr(context, 'new_password'))),
        const SizedBox(height: 12),
        TextField(controller: confirmCtrl, obscureText: true, decoration: InputDecoration(labelText: tr(context, 'confirm_password'))),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: Text(tr(context, 'cancel'))),
        FilledButton(
          onPressed: saving ? null : () async {
            if (newCtrl.text != confirmCtrl.text) {
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(tr(context, 'mismatch'))));
              return;
            }
            if (newCtrl.text.length < 8) {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('New password must be at least 8 characters')));
              return;
            }
            setState(() => saving = true);
            final err = await ApiService().changeAdminPassword(app.user?.username ?? '', oldCtrl.text, newCtrl.text);
            setState(() => saving = false);
            if (!ctx.mounted) return;
            if (err == null) {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(tr(context, 'password_updated')), backgroundColor: AppColors.success));
            } else {
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: AppColors.danger));
            }
          },
          child: saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : Text(tr(context, 'save')),
        ),
      ],
    )));
  }

  void _changeUsername(BuildContext context, AppProvider app) {
    final newCtrl = TextEditingController();
    final passCtrl = TextEditingController();
    bool saving = false;
    showDialog(context: context, builder: (ctx) => StatefulBuilder(builder: (ctx, setState) => AlertDialog(
      title: Text(tr(context, 'change_username')),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        Text('Current: ${app.user?.username ?? ''}', style: const TextStyle(fontSize: 13, color: Colors.grey)),
        const SizedBox(height: 12),
        TextField(controller: newCtrl, decoration: InputDecoration(labelText: tr(context, 'new_username'))),
        const SizedBox(height: 12),
        TextField(controller: passCtrl, obscureText: true, decoration: InputDecoration(labelText: tr(context, 'confirm_password'))),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: Text(tr(context, 'cancel'))),
        FilledButton(
          onPressed: saving ? null : () async {
            if (newCtrl.text.trim().isEmpty) return;
            setState(() => saving = true);
            final err = await ApiService().changeAdminUsername(app.user?.username ?? '', newCtrl.text.trim(), passCtrl.text);
            setState(() => saving = false);
            if (!ctx.mounted) return;
            if (err == null) {
              await app.updateUsername(newCtrl.text.trim());
              if (!ctx.mounted) return;
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(tr(context, 'username_updated')), backgroundColor: AppColors.success));
            } else {
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: AppColors.danger));
            }
          },
          child: saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : Text(tr(context, 'save')),
        ),
      ],
    )));
  }
}
