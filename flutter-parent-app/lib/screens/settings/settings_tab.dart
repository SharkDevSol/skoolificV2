import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
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
                      Text(AppLocalizations.tr(context, 'my_wards'), style: const TextStyle(color: Colors.grey)),
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
                  'Change Password',
                  '',
                  onTap: () => _showChangePasswordDialog(context),
                ),
                const Divider(height: 1),
                // 1.7: view/change saved Branch Code
                _SettingsRow(
                  Icons.account_balance_outlined,
                  'Branch Code',
                  storage.StorageService.savedBranchCode ?? '—',
                  onTap: () => _showBranchCodeDialog(context),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          PrimaryButton(
            label: AppLocalizations.tr(context, 'logout'),
            onPressed: () {
              provider.logout();
              Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_) => const LoginScreen()), (r) => false);
            },
          ),
        ],
      ),
    );
  }

  // 1.7: change or reset the remembered Branch Code
  void _showBranchCodeDialog(BuildContext context) {
    final controller = TextEditingController(
      text: storage.StorageService.savedBranchCode ?? '',
    );
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Branch Code'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'This branch code is remembered for quick sign-in. '
              'Change it if you use a different school branch.',
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              textCapitalization: TextCapitalization.characters,
              inputFormatters: [FilteringTextInputFormatter.deny(RegExp(r'\s'))],
              decoration: const InputDecoration(
                labelText: 'Branch Code',
                hintText: 'e.g. IQRA1',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () async {
              await storage.StorageService.setSavedBranchCode('');
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Reset'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              await storage.StorageService.setSavedBranchCode(controller.text);
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Save'),
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

  void _showChangePasswordDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Change Password'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppTextField(label: 'Old Password', isPassword: true),
            const SizedBox(height: 16),
            AppTextField(label: 'New Password', isPassword: true),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Save')),
        ],
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

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = Provider.of<AppProvider>(context);
    final wards = app.wards;

    return Scaffold(
      appBar: AppBar(title: Text(AppLocalizations.tr(context, 'profile'))),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 20),
            AvatarCircle(name: app.user?.name ?? 'G', size: 80),
            const SizedBox(height: 16),
            Text(
              app.user?.name ?? '',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            Text(
              '@${app.user?.username ?? ''}',
              style: const TextStyle(color: Colors.grey, fontSize: 16),
            ),
            const SizedBox(height: 8),
            if (app.user?.phone != null)
              Text(
                'Phone: ${app.user?.phone}',
                style: const TextStyle(color: Colors.grey, fontSize: 15),
              ),
            const SizedBox(height: 32),
            SectionTitle(AppLocalizations.tr(context, 'my_wards')),
            if (app.loading)
              const AppLoadingIndicator()
            else if (wards.isEmpty)
              EmptyState(icon: Icons.people_outline, message: AppLocalizations.tr(context, 'no_wards'))
            else
              ...wards.map((w) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: GestureDetector(
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => _WardDetailsScreen(ward: w))),
                      child: AppCard(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(2),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(color: AppColors.primary.withOpacity(0.3), width: 2),
                              ),
                              child: AvatarCircle(name: w.studentName, size: 48),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    w.studentName,
                                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Class ${w.className ?? '—'}',
                                    style: const TextStyle(fontSize: 13, color: Colors.grey),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(Icons.chevron_right, color: Colors.grey),
                          ],
                        ),
                      ),
                    ),
                  )),
          ],
        ),
      ),
    );
  }
}

class _WardDetailsScreen extends StatefulWidget {
  final Ward ward;
  const _WardDetailsScreen({required this.ward});
  @override
  State<_WardDetailsScreen> createState() => _WardDetailsScreenState();
}

class _WardDetailsScreenState extends State<_WardDetailsScreen> {
  bool _loading = true;
  double _attendanceRate = 0;
  double _marksRate = 0;
  double _paymentRate = 0;

  @override
  void initState() {
    super.initState();
    _fetchStats();
  }

  Future<void> _fetchStats() async {
    final app = Provider.of<AppProvider>(context, listen: false);
    if (app.user == null) return;
    try {
      final now = DateTime.now();
      // Fetch attendance
      final att = await ApiService().monthlySummary(widget.ward.className ?? '', widget.ward.schoolId, year: now.year - 8, month: now.month);
      _attendanceRate = att.percentage;

      // Fetch marks
      final marksRes = await ApiService().guardianMarks(app.user!.username);
      final wardMarks = marksRes.marks.where((m) => m.ward == widget.ward.studentName).toList();
      if (wardMarks.isNotEmpty) {
        _marksRate = wardMarks.fold(0.0, (s, m) => s + m.total) / wardMarks.length;
      }

      // Fetch payments
      final payRes = await ApiService().guardianPayments(app.user!.username);
      final wp = payRes.wardPayments.where((p) => p.ward.studentName == widget.ward.studentName).firstOrNull;
      if (wp != null && wp.monthlyPayments.isNotEmpty) {
        final total = wp.monthlyPayments.fold(0.0, (s, m) => s + m.totalAmount);
        final paid = wp.monthlyPayments.fold(0.0, (s, m) => s + m.paidAmount);
        _paymentRate = total > 0 ? (paid / total) * 100 : 0;
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('${widget.ward.studentName} Details')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            AvatarCircle(name: widget.ward.studentName, size: 80),
            const SizedBox(height: 16),
            Text(widget.ward.studentName, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            Text('${AppLocalizations.tr(context, 'class_label')} ${widget.ward.className ?? '—'}', style: const TextStyle(color: Colors.grey)),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('Age: ${widget.ward.age ?? '—'}', style: const TextStyle(color: Colors.grey, fontWeight: FontWeight.w500)),
                const SizedBox(width: 16),
                Text('Gender: ${widget.ward.gender ?? '—'}', style: const TextStyle(color: Colors.grey, fontWeight: FontWeight.w500)),
              ],
            ),
            const SizedBox(height: 32),
            if (_loading)
              const AppLoadingIndicator()
            else
              Column(
                children: [
                  _StatRow(Icons.calendar_month, AppLocalizations.tr(context, 'attendance_rate'), '${_attendanceRate.toInt()}%', AppColors.info),
                  const SizedBox(height: 12),
                  _StatRow(Icons.assignment, AppLocalizations.tr(context, 'marks_rate'), '${_marksRate.toInt()}%', AppColors.success),
                  const SizedBox(height: 12),
                  _StatRow(Icons.account_balance_wallet, AppLocalizations.tr(context, 'payments_rate'), '${_paymentRate.toInt()}%', AppColors.accent),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class _StatRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  const _StatRow(this.icon, this.label, this.value, this.color);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: isDark ? [] : [softShadow],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 16),
          Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600))),
          Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }
}



