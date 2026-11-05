import 'package:flutter/material.dart';

import '../api.dart';
import '../l10n.dart';
import '../tab_handle.dart';
import '../theme.dart';
import '../ui.dart';

class SettingsTab extends StatefulWidget {
  const SettingsTab({
    super.key,
    required this.active,
    required this.handle,
    required this.dark,
    required this.onThemeChanged,
    required this.lang,
    required this.onLangChanged,
    required this.onLogout,
  });

  final bool active;
  final TabHandle handle;
  final bool dark;
  final ValueChanged<bool> onThemeChanged;
  final String lang;
  final ValueChanged<String> onLangChanged;
  final Future<void> Function() onLogout;

  @override
  State<SettingsTab> createState() => _SettingsTabState();
}

class _SettingsTabState extends State<SettingsTab> {
  bool _loaded = false;
  bool _loading = false;

  final _currentPass = TextEditingController();
  final _newUser = TextEditingController();
  final _newPass = TextEditingController();
  final _confirmPass = TextEditingController();
  bool _savingAccount = false;
  String? _accountMsg;
  String? _accountErr;

  List<Map<String, dynamic>> _admins = [];
  final Map<String, TextEditingController> _adminUsers = {};
  final Map<String, TextEditingController> _adminPasses = {};
  String? _adminMsg;
  String? _adminErr;
  String? _savingAdmin;

  Map<String, dynamic>? _daily;
  final _recipients = TextEditingController();
  final _hour = TextEditingController(text: '8');
  Map<String, dynamic>? _summary;
  String? _dailyMsg;
  String? _dailyErr;
  bool _savingDaily = false;

  @override
  void initState() {
    super.initState();
    widget.handle.refresh = _load;
    if (widget.active) _load();
  }

  @override
  void didUpdateWidget(covariant SettingsTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!oldWidget.active && widget.active && !_loaded) _load();
  }

  @override
  void dispose() {
    _currentPass.dispose();
    _newUser.dispose();
    _newPass.dispose();
    _confirmPass.dispose();
    _recipients.dispose();
    _hour.dispose();
    for (final c in _adminUsers.values) {
      c.dispose();
    }
    for (final c in _adminPasses.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    if (_loading) return;
    setState(() => _loading = true);
    final results = await Future.wait([
      Api.getJson('/super-admin/branch-admins'),
      Api.getJson('/super-admin/daily-report/settings'),
    ]);
    if (!mounted) return;
    final admins = mapList(results[0].map?['data']);
    final daily = results[1].data;
    setState(() {
      _admins = admins;
      for (final a in admins) {
        final code = (a['branchCode'] ?? '').toString();
        if (!_adminUsers.containsKey(code)) {
          _adminUsers[code] = TextEditingController(text: (a['username'] ?? '').toString());
          _adminPasses[code] = TextEditingController();
        }
      }
      _daily = daily;
      if (daily != null) {
        _recipients.text = (daily['recipients'] ?? '').toString();
        _hour.text = (daily['send_hour'] ?? 8).toString();
      }
      _loading = false;
      _loaded = true;
    });
  }

  Future<void> _saveAccount() async {
    setState(() {
      _savingAccount = true;
      _accountMsg = null;
      _accountErr = null;
    });
    if (_currentPass.text.isEmpty) {
      setState(() {
        _savingAccount = false;
        _accountErr = 'Current password is required';
      });
      return;
    }
    if (_newPass.text.isNotEmpty && _newPass.text != _confirmPass.text) {
      setState(() {
        _savingAccount = false;
        _accountErr = 'Passwords do not match';
      });
      return;
    }
    final res = await Api.putJson('/super-admin/account', {
      'currentPassword': _currentPass.text,
      if (_newUser.text.trim().isNotEmpty) 'newUsername': _newUser.text.trim(),
      if (_newPass.text.isNotEmpty) 'newPassword': _newPass.text,
    });
    if (!mounted) return;
    setState(() {
      _savingAccount = false;
      if (res.ok) {
        _accountMsg = T.t('accountUpdated');
        _currentPass.clear();
        _newUser.clear();
        _newPass.clear();
        _confirmPass.clear();
        final userMap = res.map?['user'];
        if (userMap is Map && userMap['username'] != null) {
          Api.username = userMap['username'].toString();
        }
      } else {
        _accountErr = res.errorMessage ?? 'Update failed';
      }
    });
  }

  Future<void> _saveAdmin(String code) async {
    final username = (_adminUsers[code]?.text ?? '').trim();
    final pass = _adminPasses[code]?.text ?? '';
    if (username.isEmpty && pass.isEmpty) {
      setState(() => _adminErr = 'Enter a new username or password');
      return;
    }
    if (pass.isNotEmpty && pass.length < 4) {
      setState(() => _adminErr = 'Password must be at least 4 characters');
      return;
    }
    setState(() {
      _savingAdmin = code;
      _adminMsg = null;
      _adminErr = null;
    });
    final res = await Api.putJson('/super-admin/branch-admins/$code', {
      if (username.isNotEmpty) 'username': username,
      if (pass.isNotEmpty) 'newPassword': pass,
    });
    if (!mounted) return;
    setState(() {
      _savingAdmin = null;
      if (res.ok) {
        _adminMsg = res.map?['message']?.toString() ?? '$code admin updated';
        _adminPasses[code]?.clear();
      } else {
        _adminErr = res.errorMessage ?? 'Update failed';
      }
    });
    if (res.ok) _load();
  }

  Future<void> _saveDaily() async {
    setState(() {
      _savingDaily = true;
      _dailyMsg = null;
      _dailyErr = null;
    });
    final res = await Api.putJson('/super-admin/daily-report/settings', {
      'daily_report_enabled': _daily?['daily_report_enabled'] != false,
      'recipients': _recipients.text.trim(),
      'send_hour': int.tryParse(_hour.text.trim()) ?? 8,
    });
    if (!mounted) return;
    setState(() {
      _savingDaily = false;
      if (res.ok) {
        _daily = res.data ?? _daily;
        _dailyMsg = 'Daily report settings saved';
      } else {
        _dailyErr = res.errorMessage ?? 'Save failed';
      }
    });
  }

  Future<void> _previewDaily() async {
    setState(() {
      _savingDaily = true;
      _dailyErr = null;
      _dailyMsg = null;
    });
    final res = await Api.getJson(
      '/super-admin/daily-report/preview',
      timeout: const Duration(seconds: 120),
    );
    if (!mounted) return;
    setState(() {
      _savingDaily = false;
      if (res.ok) {
        _summary = res.data;
      } else {
        _dailyErr = res.errorMessage ?? 'Preview failed';
      }
    });
  }

  Future<void> _sendDaily() async {
    setState(() {
      _savingDaily = true;
      _dailyErr = null;
      _dailyMsg = null;
    });
    final res = await Api.postJson('/super-admin/daily-report/send', {});
    if (!mounted) return;
    final d = res.data;
    final sent = d?['sent'] == true;
    setState(() {
      _savingDaily = false;
      if (sent) {
        final recipients = _listText(d?['recipients']);
        _dailyMsg = 'Daily report sent${recipients.isEmpty ? '' : ' to $recipients'}';
      } else {
        _dailyErr = 'Not sent: ${d?['reason'] ?? d?['error'] ?? d?['status'] ?? res.errorMessage ?? 'unknown'}';
      }
    });
  }

  Future<void> _confirmLogout() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Log out?'),
        content: const Text('You will need to sign in again to see the reports.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFE5484D)),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Log out'),
          ),
        ],
      ),
    );
    if (ok == true) await widget.onLogout();
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return TabScroll(
      onRefresh: _load,
      children: [
        if (_loading && !_loaded)
          const LoadingBox(text: 'Loading settings...')
        else ...[
          _accountCard(c),
          _brachAdminsCard(c),
          _dailyCard(c),
          _preferencesCard(c),
          CardBox(
            child: SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton.icon(
                onPressed: _confirmLogout,
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFE5484D),
                  side: const BorderSide(color: Color(0xFFE5484D)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                icon: const Icon(Icons.logout_rounded, size: 19),
                label: Text(
                  T.t('logout'),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Center(
            child: Text(
              'IQRA Super Admin · v2.0.0',
              style: TextStyle(fontSize: 10, color: c.muted),
            ),
          ),
        ],
      ],
    );
  }

  String _listText(dynamic raw) {
    if (raw is List) return raw.map((e) => e.toString()).join(', ');
    if (raw == null) return '';
    return raw.toString();
  }

  Widget _accountCard(AppColors c) {
    return CardBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _groupTitle(c, Icons.person_outline_rounded, T.t('account')),
          if (_accountMsg != null) MessageBanner(_accountMsg!),
          if (_accountErr != null) MessageBanner(_accountErr!, isError: true),
          TextField(
            controller: _currentPass,
            obscureText: true,
            style: TextStyle(fontSize: 13.5, color: c.text),
            decoration: InputDecoration(hintText: T.t('currentPassword')),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _newUser,
            style: TextStyle(fontSize: 13.5, color: c.text),
            decoration: InputDecoration(hintText: T.t('newUsername')),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _newPass,
            obscureText: true,
            style: TextStyle(fontSize: 13.5, color: c.text),
            decoration: InputDecoration(hintText: T.t('newPassword')),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _confirmPass,
            obscureText: true,
            style: TextStyle(fontSize: 13.5, color: c.text),
            decoration: InputDecoration(hintText: T.t('confirmPassword')),
          ),
          const SizedBox(height: 12),
          PrimaryButton(
            label: _savingAccount ? T.t('saving') : T.t('save'),
            onPressed: _savingAccount ? null : _saveAccount,
          ),
        ],
      ),
    );
  }

  Widget _brachAdminsCard(AppColors c) {
    return CardBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _groupTitle(c, Icons.vpn_key_outlined, 'Branch Admin Accounts (IQRA2 – IQRA5)'),
          Text(
            'Change the username or password used to log in to each branch admin page.',
            style: TextStyle(fontSize: 11.5, color: c.muted, height: 1.4),
          ),
          const SizedBox(height: 8),
          if (_adminMsg != null) MessageBanner(_adminMsg!),
          if (_adminErr != null) MessageBanner(_adminErr!, isError: true),
          if (_admins.isEmpty)
            const EmptyBox('Loading...')
          else
            for (final a in _admins) _adminRow(c, a),
        ],
      ),
    );
  }

  Widget _adminRow(AppColors c, Map<String, dynamic> a) {
    final code = (a['branchCode'] ?? '').toString();
    final saving = _savingAdmin == code;
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: c.input,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: c.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$code — ${a['branchName'] ?? ''}${a['name'] != null ? ' (${a['name']})' : ''}',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: c.text),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _adminUsers[code],
            style: TextStyle(fontSize: 13, color: c.text),
            decoration: InputDecoration(
              hintText: 'Username (current: ${a['username'] ?? '—'})',
            ),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _adminPasses[code],
            obscureText: true,
            style: TextStyle(fontSize: 13, color: c.text),
            decoration: const InputDecoration(hintText: 'New password'),
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: PrimaryButton(
              label: saving ? T.t('saving') : T.t('save'),
              expanded: false,
              height: 40,
              onPressed: saving ? null : () => _saveAdmin(code),
            ),
          ),
          if (a['error'] != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: MessageBanner(a['error'].toString(), isError: true),
            ),
        ],
      ),
    );
  }

  Widget _dailyCard(AppColors c) {
    return CardBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _groupTitle(c, Icons.sms_outlined, 'Daily Report Notification'),
          Text(
            "Sends a daily email with today's totals (students, new registrations, attendance, fees, faults) and a push notification to this app.",
            style: TextStyle(fontSize: 11.5, color: c.muted, height: 1.4),
          ),
          const SizedBox(height: 10),
          if (_dailyMsg != null) MessageBanner(_dailyMsg!),
          if (_dailyErr != null) MessageBanner(_dailyErr!, isError: true),
          if (_daily == null)
            const EmptyBox('Loading...')
          else ...[
            Row(
              children: [
                Toggle(
                  value: _daily?['daily_report_enabled'] != false,
                  onChanged: (v) => setState(() {
                    _daily = {...?_daily, 'daily_report_enabled': v};
                  }),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Send the daily report automatically',
                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: c.text),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _recipients,
              style: TextStyle(fontSize: 13, color: c.text),
              decoration: const InputDecoration(hintText: 'Recipients (comma separated emails)'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _hour,
              keyboardType: TextInputType.number,
              style: TextStyle(fontSize: 13, color: c.text),
              decoration: const InputDecoration(hintText: 'Send hour (0-23, server time)'),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: PrimaryButton(
                    label: T.t('save'),
                    height: 42,
                    onPressed: _savingDaily ? null : _saveDaily,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: _savingDaily ? null : _previewDaily,
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(42),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Preview', style: TextStyle(fontSize: 12)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: _savingDaily ? null : _sendDaily,
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(42),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Send now', style: TextStyle(fontSize: 12)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Recipients in use: ${_listText(_daily?['resolvedRecipients']).isEmpty ? 'none — add emails above' : _listText(_daily?['resolvedRecipients'])}',
              style: TextStyle(fontSize: 10.5, color: c.muted),
            ),
            if (_summary != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  "Today: ${_summary!['students'] ?? 0} students · ${_summary!['newRegistrations'] ?? 0} new · attendance ${_summary!['attendanceRate'] ?? 0}% · collected ${_summary!['collected'] ?? 0} Birr · pending ${_summary!['pending'] ?? 0} Birr · faults ${_summary!['faults'] ?? 0}",
                  style: TextStyle(fontSize: 10.5, color: c.muted, height: 1.4),
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _preferencesCard(AppColors c) {
    return CardBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _groupTitle(c, Icons.tune_rounded, T.t('preferences')),
          Text(
            T.t('language'),
            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: c.text),
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: T.langs.map((l) {
              final active = widget.lang == l['code'];
              return GestureDetector(
                onTap: () => widget.onLangChanged(l['code']!),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: active ? c.primary : c.input,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: active ? c.primary : c.line),
                  ),
                  child: Text(
                    T.t(l['labelKey']!),
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                      color: active ? Colors.white : c.text,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: c.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.dark_mode_outlined, size: 18, color: c.primary),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      T.t('darkMode'),
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: c.text),
                    ),
                    Text(
                      T.t('darkModeDesc'),
                      style: TextStyle(fontSize: 10.5, color: c.muted),
                    ),
                  ],
                ),
              ),
              Toggle(value: widget.dark, onChanged: widget.onThemeChanged),
            ],
          ),
        ],
      ),
    );
  }

  Widget _groupTitle(AppColors c, IconData icon, String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Container(
            width: 30,
            height: 30,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: c.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(9),
            ),
            child: Icon(icon, size: 16, color: c.primary),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              title,
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: c.text),
            ),
          ),
        ],
      ),
    );
  }
}
