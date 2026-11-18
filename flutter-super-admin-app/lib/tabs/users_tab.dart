import 'package:flutter/material.dart';

import '../api.dart';
import '../l10n.dart';
import '../tab_handle.dart';
import '../theme.dart';
import '../ui.dart';

const _accessTabs = [
  'home',
  'students',
  'attendance',
  'marks',
  'faults',
  'finance',
  'sms',
  'payroll',
  'settings',
];

/// Create and edit super-admin accounts and what each one can see.
/// Only shown to accounts with manageUsers (khalif).
class UsersTab extends StatefulWidget {
  const UsersTab({super.key, required this.active, required this.handle});

  final bool active;
  final TabHandle handle;

  @override
  State<UsersTab> createState() => _UsersTabState();
}

class _UsersTabState extends State<UsersTab> {
  bool _loaded = false;
  bool _loading = false;
  String? _error;
  List<Map<String, dynamic>> _users = [];

  @override
  void initState() {
    super.initState();
    widget.handle.refresh = _load;
    if (widget.active) _load();
  }

  @override
  void didUpdateWidget(covariant UsersTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!oldWidget.active && widget.active && !_loaded) _load();
  }

  Future<void> _load() async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    final res = await Api.getJson('/super-admin/users');
    if (!mounted) return;
    setState(() {
      _users = mapList(res.map?['data']);
      _loading = false;
      _loaded = true;
      if (res.map == null) _error = 'Could not load accounts. Pull down to retry.';
    });
  }

  Future<void> _openEditor({Map<String, dynamic>? user}) async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _UserEditor(user: user),
    );
    if (created == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return TabScroll(
      onRefresh: _load,
      children: [
        CardBox(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const CardTitle('Super admin accounts'),
              Text(
                'Create an account and choose exactly which tabs it can see. '
                'Those accounts sign in with the username and password you set here.',
                style: TextStyle(fontSize: 10.5, color: c.muted, height: 1.4),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: FilledButton.icon(
                  onPressed: () => _openEditor(),
                  style: FilledButton.styleFrom(
                    backgroundColor: c.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
                  ),
                  icon: const Icon(Icons.person_add_alt_1_rounded, size: 19),
                  label: const Text(
                    'Create account',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
        ),
        if (_loading && !_loaded)
          const LoadingBox(text: 'Loading accounts...')
        else if (_error != null)
          CardBox(child: MessageBanner(_error!, isError: true))
        else if (_users.isEmpty)
          CardBox(child: EmptyBox('No accounts yet'))
        else
          for (final u in _users) _userCard(c, u),
      ],
    );
  }

  Widget _userCard(AppColors c, Map<String, dynamic> u) {
    final perms = (u['permissions'] is Map)
        ? Map<String, dynamic>.from(u['permissions'] as Map)
        : <String, dynamic>{};
    final tabs = (perms['tabs'] is List) ? (perms['tabs'] as List).cast<dynamic>() : const [];
    final manage = perms['manageUsers'] == true;
    final owner = perms['owner'] == true;
    final active = u['isActive'] != false;

    return CardBox(
      child: InkWell(
        onTap: () => _openEditor(user: u),
        borderRadius: BorderRadius.circular(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        (u['fullName'] ?? u['username']).toString(),
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: c.text),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '@${u['username']}',
                        style: TextStyle(fontSize: 10.5, color: c.muted),
                      ),
                    ],
                  ),
                ),
                if (owner) Pill('owner', color: c.gold),
                if (manage && !owner) ...[
                  const SizedBox(width: 5),
                  Pill('can create accounts', color: c.blue),
                ],
                const SizedBox(width: 5),
                Pill(active ? 'active' : 'disabled', color: active ? c.green : c.red),
              ],
            ),
            const SizedBox(height: 8),
            if (tabs.isEmpty)
              Text('No access set', style: TextStyle(fontSize: 10.5, color: c.muted))
            else
              Wrap(
                spacing: 5,
                runSpacing: 5,
                children: [for (final t in tabs) Pill(T.t(t.toString()))],
              ),
            const SizedBox(height: 6),
            Text(
              'Tap to change access or reset the password',
              style: TextStyle(fontSize: 9.5, color: c.muted),
            ),
          ],
        ),
      ),
    );
  }
}

class _UserEditor extends StatefulWidget {
  const _UserEditor({this.user});

  final Map<String, dynamic>? user;

  @override
  State<_UserEditor> createState() => _UserEditorState();
}

class _UserEditorState extends State<_UserEditor> {
  late final TextEditingController _username;
  late final TextEditingController _fullName;
  final _password = TextEditingController();
  late Set<String> _tabs;
  late bool _manageUsers;
  late bool _active;
  bool _busy = false;
  String? _error;

  bool get _isEdit => widget.user != null;

  @override
  void initState() {
    super.initState();
    final u = widget.user;
    final perms = (u?['permissions'] is Map)
        ? Map<String, dynamic>.from(u!['permissions'] as Map)
        : <String, dynamic>{};
    final tabs = (perms['tabs'] is List) ? (perms['tabs'] as List).cast<dynamic>() : const [];
    _username = TextEditingController(text: (u?['username'] ?? '').toString());
    _fullName = TextEditingController(text: (u?['fullName'] ?? '').toString());
    _tabs = tabs.map((e) => e.toString()).where(_accessTabs.contains).toSet();
    if (_tabs.isEmpty && !_isEdit) _tabs = {..._accessTabs};
    _manageUsers = perms['manageUsers'] == true;
    _active = (u?['isActive'] ?? true) != false;
  }

  @override
  void dispose() {
    _username.dispose();
    _fullName.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final perms = {
        'tabs': _tabs.toList(),
        'manageUsers': _manageUsers,
      };
      if (_isEdit) {
        final id = widget.user!['id'];
        final body = <String, dynamic>{
          'fullName': _fullName.text.trim(),
          'isActive': _active,
          'permissions': perms,
        };
        if (_password.text.trim().isNotEmpty) body['password'] = _password.text.trim();
        final r = await Api.putJson('/super-admin/users/$id', body);
        if (!r.ok) throw Exception(r.errorMessage ?? 'Could not save the account');
      } else {
        final body = <String, dynamic>{
          'username': _username.text.trim().toLowerCase(),
          'password': _password.text,
          'fullName': _fullName.text.trim(),
          'permissions': perms,
        };
        final r = await Api.postJson('/super-admin/users', body);
        if (!r.ok) throw Exception(r.errorMessage ?? 'Could not create the account');
      }
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _delete() async {
    final id = widget.user!['id'];
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete account?'),
        content: Text('Remove @${widget.user!['username']} permanently?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _busy = true);
    final r = await Api.deleteJson('/super-admin/users/$id');
    if (!mounted) return;
    if (r.ok) {
      Navigator.of(context).pop(true);
    } else {
      setState(() {
        _busy = false;
        _error = r.errorMessage ?? 'Could not delete the account';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final owner = widget.user?['permissions'] is Map &&
        (widget.user!['permissions'] as Map)['owner'] == true;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        margin: const EdgeInsets.all(10),
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
        decoration: BoxDecoration(
          color: c.card,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: c.line),
        ),
        child: SafeArea(
          top: false,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Center(
                  child: Container(
                    width: 38,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(color: c.line, borderRadius: BorderRadius.circular(99)),
                  ),
                ),
                Text(
                  _isEdit ? 'Edit account' : 'Create account',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: c.text),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _username,
                  enabled: !_isEdit && !owner,
                  decoration: const InputDecoration(hintText: 'Username (e.g. khalif2)'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _fullName,
                  decoration: const InputDecoration(hintText: 'Profile name'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _password,
                  obscureText: true,
                  decoration: InputDecoration(
                    hintText: _isEdit ? 'New password (leave empty to keep)' : 'Password (min 6 characters)',
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'What can this account see?',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: c.text),
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: _accessTabs.map((t) {
                    final on = _tabs.contains(t);
                    return FilterChip(
                      label: Text(T.t(t), style: const TextStyle(fontSize: 11)),
                      selected: on,
                      onSelected: owner
                          ? null
                          : (v) => setState(() {
                                if (v) {
                                  _tabs.add(t);
                                } else {
                                  _tabs.remove(t);
                                }
                              }),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 6),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                  value: _manageUsers,
                  onChanged: owner ? null : (v) => setState(() => _manageUsers = v),
                  title: Text(
                    'Can create / edit accounts',
                    style: TextStyle(fontSize: 12, color: c.text),
                  ),
                ),
                if (_isEdit && !owner)
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    value: _active,
                    onChanged: (v) => setState(() => _active = v),
                    title: Text('Account active', style: TextStyle(fontSize: 12, color: c.text)),
                  ),
                if (_error != null) ...[
                  const SizedBox(height: 6),
                  MessageBanner(_error!, isError: true),
                ],
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: SizedBox(
                        height: 46,
                        child: FilledButton(
                          onPressed: _busy ? null : _save,
                          style: FilledButton.styleFrom(
                            backgroundColor: c.primary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: Text(_busy ? 'Saving...' : (_isEdit ? 'Save changes' : 'Create account')),
                        ),
                      ),
                    ),
                    if (_isEdit && !owner) ...[
                      const SizedBox(width: 8),
                      SizedBox(
                        height: 46,
                        child: OutlinedButton(
                          onPressed: _busy ? null : _delete,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.red,
                            side: const BorderSide(color: Colors.red),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text('Delete'),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
