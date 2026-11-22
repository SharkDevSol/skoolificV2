import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/config/app_variant.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/info_dialog.dart';

class AddAccountScreen extends StatefulWidget {
  const AddAccountScreen({super.key});
  @override
  State<AddAccountScreen> createState() => _AddAccountScreenState();
}

class _AddAccountScreenState extends State<AddAccountScreen> {
  static const _permissions = {
    'students': 'Students',
    'guardians': 'Guardians',
    'mark_list': 'Marks & mark list report',
    'attendance': 'Students Attendance',
    'faults': 'Student Faults',
    'communication': 'Message',
    'posts': 'Posts',
    'staff_attendance': 'Staff Attendance',
    'hr_leave': 'HR Leave',
    'class_teacher': 'Class Teacher Assignment',
    'teacher_evaluation': 'Teacher Evaluation',
    'staff': 'Staff list',
  };

  List<Map<String, dynamic>> _staff = [];
  List<Map<String, dynamic>> _access = [];
  final Map<String, Map<String, dynamic>> _creds = {};
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  String _sid(Map<String, dynamic> s) =>
      '${s['global_staff_id'] ?? s['staff_id'] ?? s['id'] ?? ''}';

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final staff = <Map<String, dynamic>>[];
      final seen = <String>{};
      for (final type in ['Teachers', 'Administrative Staff', 'Supportive Staff']) {
        final classes = await ApiService().getStaffClasses(type);
        for (final cls in classes) {
          try {
            final rows = await ApiService().getStaffData(type, cls);
            for (final r in rows) {
              final id = _sid(r);
              final key = id.isNotEmpty ? id : '${r['full_name'] ?? r['name']}';
              if (seen.add(key)) {
                r['class_name'] = r['class_name'] ?? cls;
                staff.add(r);
              }
            }
          } catch (_) {}
        }
      }
      final access = await ApiService().getStaffAccess();
      final creds = await ApiService().getStaffCredentials();
      if (!mounted) return;
      setState(() {
        _staff = staff;
        _creds.clear();
        for (final c in creds) {
          final id = '${c['global_staff_id'] ?? ''}';
          if (id.isNotEmpty) _creds[id] = c;
        }
        // Only accounts that actually have at least one permission are access accounts.
        _access = access.where((a) {
          final perms = a['permissions'];
          return perms is List && perms.isNotEmpty;
        }).toList();
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Map<String, dynamic>? _staffById(String id) {
    for (final s in _staff) {
      if (_sid(s) == id) return s;
    }
    return null;
  }

  Set<String> _grantedIds() => _access.map((a) => '${a['global_staff_id'] ?? ''}').toSet();

  Future<void> _edit([Map<String, dynamic>? access]) async {
    final granted = _grantedIds();
    final available = <Map<String, dynamic>>[
      for (final s in _staff)
        if (access != null ? _sid(s) == '${access['global_staff_id'] ?? ''}' : !granted.contains(_sid(s))) s,
    ];
    int? staffIndex;
    if (access != null) {
      final sid = '${access['global_staff_id'] ?? ''}';
      final i = available.indexWhere((s) => _sid(s) == sid);
      staffIndex = i >= 0 ? i : null;
    }
    final selected = <String>{};
    final rawPerms = access?['permissions'];
    if (rawPerms is List) selected.addAll(rawPerms.map((e) => '$e'));
    bool saving = false;

    await showDialog(context: context, builder: (ctx) => StatefulBuilder(builder: (ctx, setSheet) {
      final picked = staffIndex == null ? null : available[staffIndex!];
      final accessRec = access;
      final cred = picked == null ? null : _creds[_sid(picked)];
      final username = '${accessRec?['username'] ?? cred?['username'] ?? picked?['username'] ?? ''}';
      final password = '${accessRec?['password_plain'] ?? cred?['password_plain'] ?? picked?['password_plain'] ?? picked?['password'] ?? ''}';
      return AlertDialog(
        title: Text(access == null ? 'Grant Staff Access' : 'Edit Staff Access'),
        content: SizedBox(width: 560, child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (available.isEmpty)
            const Text('All staff already have access. Choose an existing access below to edit it.', style: TextStyle(color: Colors.grey))
          else
            DropdownButtonFormField<int>(
              value: staffIndex,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Staff member'),
              items: available.asMap().entries.map((e) => DropdownMenuItem(value: e.key, child: Text('${e.value['full_name'] ?? e.value['name'] ?? ''}'))).toList(),
              onChanged: access == null ? (v) => setSheet(() => staffIndex = v) : null,
            ),
          const SizedBox(height: 12),
          if (picked != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.05), borderRadius: BorderRadius.circular(12)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('They log in with their existing staff account', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                const SizedBox(height: 6),
                Row(children: [
                  Expanded(child: Text('Username: $username', style: const TextStyle(fontSize: 13))),
                  IconButton(icon: const Icon(Icons.copy, size: 18), onPressed: () => copyValue(ctx, 'Username', username)),
                ]),
                Row(children: [
                  Expanded(child: Text('Password: ${password.isEmpty ? '(unchanged)' : password}', style: const TextStyle(fontSize: 13))),
                  IconButton(icon: const Icon(Icons.copy, size: 18), onPressed: () => copyValue(ctx, 'Password', password)),
                ]),
                Text('Ask them to install the ${AppVariant.appName} APK and sign in with this username and password.', style: const TextStyle(fontSize: 11, color: Colors.grey)),
              ]),
            ),
            const SizedBox(height: 14),
          ],
          const Text('What can this staff use?', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          ..._permissions.entries.map((e) => CheckboxListTile(
            dense: true,
            contentPadding: EdgeInsets.zero,
            title: Text(e.value),
            value: selected.contains(e.key),
            onChanged: (v) => setSheet(() { if (v == true) selected.add(e.key); else selected.remove(e.key); }),
          )),
        ]))),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: saving || staffIndex == null || selected.isEmpty ? null : () async {
              setSheet(() => saving = true);
              final s = available[staffIndex!];
              final sid = int.tryParse(_sid(s)) ?? 0;
              final err = await ApiService().updateStaffAccess(
                globalStaffId: sid,
                isActive: true,
                permissions: selected.toList(),
              );
              setSheet(() => saving = false);
              if (!ctx.mounted) return;
              if (err == null) {
                Navigator.pop(ctx);
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Staff access saved. They can now log into the admin app.'), backgroundColor: AppColors.success));
                await _load();
              } else {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: AppColors.danger));
              }
            },
            child: saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save Access'),
          ),
        ],
      );
    }));
  }

  Future<void> _delete(Map<String, dynamic> a) async {
    final name = '${a['username'] ?? ''}';
    final ok = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(
      title: const Text('Delete access?'),
      content: Text('Remove admin-app access for $name? Their staff account will stay, but they will no longer be able to use the admin app.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete')),
      ],
    ));
    if (ok != true) return;
    final err = await ApiService().removeStaffAccess(int.tryParse('${a['global_staff_id'] ?? 0}') ?? 0);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(err ?? 'Access removed'),
      backgroundColor: err == null ? AppColors.success : AppColors.danger,
    ));
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final granted = _grantedIds();
    final availableCount = _staff.where((s) => !granted.contains(_sid(s))).length;
    return Scaffold(
      appBar: AppBar(title: const Text('Add Account / Access')),
      floatingActionButton: availableCount == 0 ? null : FloatingActionButton.extended(
        onPressed: () => _edit(),
        icon: const Icon(Icons.person_add),
        label: const Text('Grant Access'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)))
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                  children: [
                    Row(children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                        decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.10), borderRadius: BorderRadius.circular(20)),
                        child: Text('Access accounts: ${_access.length}', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800, fontSize: 12)),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                        decoration: BoxDecoration(color: AppColors.info.withOpacity(0.10), borderRadius: BorderRadius.circular(20)),
                        child: Text('Staff without access: $availableCount', style: const TextStyle(color: AppColors.info, fontWeight: FontWeight.w800, fontSize: 12)),
                      ),
                    ]),
                    const SizedBox(height: 10),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Text(
                          'Only accounts you grant access to appear here. The staff member keeps the same username and password as the staff app. They install the ${AppVariant.appName} APK and log in with that account.',
                          style: const TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (_access.isEmpty)
                      const Card(child: Padding(padding: EdgeInsets.all(20), child: Text('No staff has been given access yet.')))
                    else
                      ..._access.map((a) {
                        final sid = '${a['global_staff_id'] ?? ''}';
                        final s = _staffById(sid);
                        final perms = (a['permissions'] as List?)?.map((e) => '$e').toList() ?? [];
                        final name = '${s?['full_name'] ?? s?['name'] ?? a['username'] ?? ''}';
                        final cred = _creds[sid];
                        final password = '${a['password_plain'] ?? cred?['password_plain'] ?? s?['password_plain'] ?? ''}';
                        final username = '${a['username'] ?? cred?['username'] ?? s?['username'] ?? ''}';
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            leading: CircleAvatar(child: Text(name.isEmpty ? 'S' : name[0].toUpperCase())),
                            title: Text(name),
                            subtitle: Text('$username${password.isEmpty ? '' : ' • $password'}\n${perms.length} modules: ${perms.map((p) => _permissions[p] ?? p).join(', ')}'),
                            isThreeLine: true,
                            trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                              IconButton(icon: const Icon(Icons.edit_outlined), tooltip: 'Edit', onPressed: () => _edit(a)),
                              IconButton(icon: const Icon(Icons.delete_outline, color: AppColors.danger), tooltip: 'Delete', onPressed: () => _delete(a)),
                            ]),
                            onTap: () => _edit(a),
                          ),
                        );
                      }),
                  ],
                ),
    );
  }
}
