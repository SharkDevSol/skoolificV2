import 'package:flutter/material.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/info_dialog.dart';

class StaffListScreen extends StatefulWidget {
  const StaffListScreen({super.key});
  @override
  State<StaffListScreen> createState() => _StaffListScreenState();
}

class _StaffListScreenState extends State<StaffListScreen> with SingleTickerProviderStateMixin {
  late final TabController _tc;
  final _types = ['Teachers', 'Administrative Staff', 'Supportive Staff'];
  final Map<String, List<Map<String, dynamic>>> _cache = {};
  final Map<String, String> _passwords = {};
  final Map<String, String> _usernames = {};
  final Set<String> _loaded = {};
  bool _loading = true;
  String? _error;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: _types.length, vsync: this);
    _tc.addListener(() {
      if (!_tc.indexIsChanging) _load(_types[_tc.index]);
    });
    _load(_types.first);
  }

  @override
  void dispose() {
    _tc.dispose();
    super.dispose();
  }

  String _sid(Map<String, dynamic> s) =>
      '${s['global_staff_id'] ?? s['staff_id'] ?? s['id'] ?? ''}';

  Future<void> _load(String type) async {
    if (_loaded.contains(type)) { setState(() => _loading = false); return; }
    setState(() { _loading = true; _error = null; });
    try {
      final classes = await ApiService().getStaffClasses(type);
      final all = <Map<String, dynamic>>[];
      final seen = <String>{};
      for (final cls in classes) {
        try {
          final rows = await ApiService().getStaffData(type, cls);
          for (final r in rows) {
            final id = _sid(r);
            final key = id.isNotEmpty ? id : '${r['full_name'] ?? r['name']}';
            if (seen.add(key)) {
              r['class_name'] = r['class_name'] ?? cls;
              all.add(r);
            }
          }
        } catch (_) {}
      }
      try {
        final creds = await ApiService().getStaffCredentials();
        for (final a in creds) {
          final id = '${a['global_staff_id'] ?? ''}';
          final pass = '${a['password_plain'] ?? ''}';
          final user = '${a['username'] ?? ''}';
          if (id.isNotEmpty) {
            if (pass.isNotEmpty) _passwords[id] = pass;
            if (user.isNotEmpty) _usernames[id] = user;
          }
        }
      } catch (_) {}
      if (!mounted) return;
      setState(() {
        _cache[type] = all;
        _loaded.add(type);
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  List<Map<String, dynamic>> _filtered(String type) {
    final list = _cache[type] ?? [];
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return list;
    return list.where((s) => '${s['full_name']} ${s['name']} ${s['phone']} ${s['email']} ${s['username']} ${s['class_name']}'.toLowerCase().contains(q)).toList();
  }

  String _password(Map<String, dynamic> s) =>
      _passwords[_sid(s)] ?? '${s['password'] ?? s['password_plain'] ?? ''}';

  String _username(Map<String, dynamic> s) =>
      _usernames[_sid(s)] ?? '${s['username'] ?? ''}';

  bool _isActive(Map<String, dynamic> s) {
    final v = s['is_active'];
    return v != false && '$v'.toLowerCase() != 'false';
  }

  Future<void> _edit(Map<String, dynamic> s, String type) async {
    final nameCtrl = TextEditingController(text: '${s['name'] ?? s['full_name'] ?? ''}');
    final phoneCtrl = TextEditingController(text: '${s['phone'] ?? ''}');
    final emailCtrl = TextEditingController(text: '${s['email'] ?? ''}');
    final roleCtrl = TextEditingController(text: '${s['role'] ?? ''}');
    final qualCtrl = TextEditingController(text: '${s['qualification'] ?? ''}');
    String gender = '${s['gender'] ?? ''}';
    String workTime = '${s['staff_work_time'] ?? s['work_time'] ?? ''}';
    String enrollment = '${s['staff_enrollment_type'] ?? s['enrollment_type'] ?? ''}';
    bool saving = false;

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheet) {
        return AlertDialog(
          title: Text('Edit ${nameCtrl.text.isEmpty ? 'staff' : nameCtrl.text}'),
          content: SizedBox(
            width: 540,
            child: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Full name')),
                const SizedBox(height: 10),
                TextField(controller: phoneCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone')),
                const SizedBox(height: 10),
                TextField(controller: emailCtrl, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email')),
                const SizedBox(height: 10),
                TextField(controller: roleCtrl, decoration: const InputDecoration(labelText: 'Role')),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  value: ['Male', 'Female'].contains(gender) ? gender : null,
                  decoration: const InputDecoration(labelText: 'Gender'),
                  items: const [
                    DropdownMenuItem(value: 'Male', child: Text('Male')),
                    DropdownMenuItem(value: 'Female', child: Text('Female')),
                  ],
                  onChanged: (v) => setSheet(() => gender = v ?? ''),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  value: ['Full Time', 'Part Time'].contains(workTime) ? workTime : null,
                  decoration: const InputDecoration(labelText: 'Work time'),
                  items: const [
                    DropdownMenuItem(value: 'Full Time', child: Text('Full Time')),
                    DropdownMenuItem(value: 'Part Time', child: Text('Part Time')),
                  ],
                  onChanged: (v) => setSheet(() => workTime = v ?? ''),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  value: ['Permanent', 'Contract'].contains(enrollment) ? enrollment : null,
                  decoration: const InputDecoration(labelText: 'Enrollment'),
                  items: const [
                    DropdownMenuItem(value: 'Permanent', child: Text('Permanent')),
                    DropdownMenuItem(value: 'Contract', child: Text('Contract')),
                  ],
                  onChanged: (v) => setSheet(() => enrollment = v ?? ''),
                ),
                const SizedBox(height: 10),
                TextField(controller: qualCtrl, decoration: const InputDecoration(labelText: 'Qualification')),
              ]),
            ),
          ),
          actions: [
            TextButton(onPressed: saving ? null : () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: saving
                  ? null
                  : () async {
                      if (nameCtrl.text.trim().isEmpty) return;
                      setSheet(() => saving = true);
                      final nameKey = s.containsKey('name') ? 'name' : 'full_name';
                      final err = await ApiService().updateStaff(
                        globalStaffId: _sid(s),
                        staffType: type,
                        className: '${s['class_name'] ?? ''}',
                        updates: {
                          nameKey: nameCtrl.text.trim(),
                          'phone': phoneCtrl.text.trim(),
                          'email': emailCtrl.text.trim(),
                          'role': roleCtrl.text.trim(),
                          'gender': gender,
                          'staff_work_time': workTime,
                          'staff_enrollment_type': enrollment,
                          'qualification': qualCtrl.text.trim(),
                        },
                      );
                      if (!ctx.mounted) return;
                      setSheet(() => saving = false);
                      if (err == null) {
                        Navigator.pop(ctx);
                        if (!mounted) return;
                        await _refresh(type);
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Staff updated'), backgroundColor: AppColors.success));
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: AppColors.danger));
                      }
                    },
              child: saving
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Save'),
            ),
          ],
        );
      }),
    );
  }

  Future<void> _refresh(String type) async {
    _loaded.remove(type);
    await _load(type);
  }

  Future<void> _toggle(Map<String, dynamic> s, String type) async {
    final active = _isActive(s);
    final name = '${s['full_name'] ?? s['name'] ?? 'this staff member'}';
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(active ? 'Deactivate staff?' : 'Activate staff?'),
        content: Text(active
            ? '$name will be marked inactive and hidden from active staff lists. You can reactivate later.'
            : '$name will be active again.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(active ? 'Deactivate' : 'Activate')),
        ],
      ),
    );
    if (ok != true) return;
    final err = await ApiService().toggleStaffActive(_sid(s), !active);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(err ?? (active ? 'Staff deactivated' : 'Staff activated')),
      backgroundColor: err == null ? AppColors.success : AppColors.danger,
    ));
    if (err == null) await _refresh(type);
  }

  void _show(Map<String, dynamic> s) {
    showInfoSheet(
      context,
      title: '${s['full_name'] ?? s['name'] ?? 'Staff'}',
      subtitle: '${s['staff_type'] ?? ''}',
      entries: [
        InfoEntry('Full name', '${s['full_name'] ?? s['name'] ?? ''}'),
        InfoEntry('Staff ID', '${s['global_staff_id'] ?? s['staff_id'] ?? s['id'] ?? ''}'),
        InfoEntry('Username', _username(s)),
        InfoEntry('Password', _password(s)),
        InfoEntry('Phone', '${s['phone'] ?? ''}'),
        InfoEntry('Email', '${s['email'] ?? ''}'),
        InfoEntry('Staff type', '${s['staff_type'] ?? ''}'),
        InfoEntry('Class', '${s['class_name'] ?? ''}'),
        InfoEntry('Role', '${s['role'] ?? ''}'),
        InfoEntry('Machine ID', '${s['machine_id'] ?? ''}'),
        InfoEntry('Work time', '${s['staff_work_time'] ?? s['work_time'] ?? ''}'),
        InfoEntry('Enrollment', '${s['staff_enrollment_type'] ?? s['enrollment_type'] ?? ''}'),
        InfoEntry('Gender', '${s['gender'] ?? ''}'),
        InfoEntry('Qualification', '${s['qualification'] ?? ''}'),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Staff'),
        bottom: TabBar(controller: _tc, tabs: const [Tab(text: 'Teachers'), Tab(text: 'Admin'), Tab(text: 'Support')]),
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: TextField(
            decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search staff / phone / username', isDense: true),
            onChanged: (v) => setState(() => _query = v),
          ),
        ),
        Expanded(
          child: TabBarView(
            controller: _tc,
            children: _types.map((type) {
              if (_loading && !_loaded.contains(type)) return const Center(child: CircularProgressIndicator());
              if (_error != null) return Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)));
              final list = _filtered(type);
              final total = _cache[type]?.length ?? 0;
              return Column(children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  child: Row(children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                      decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.10), borderRadius: BorderRadius.circular(20)),
                      child: Text('Total: $total', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800, fontSize: 12)),
                    ),
                    if (_query.trim().isNotEmpty) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                        decoration: BoxDecoration(color: AppColors.info.withOpacity(0.10), borderRadius: BorderRadius.circular(20)),
                        child: Text('Showing: ${list.length}', style: const TextStyle(color: AppColors.info, fontWeight: FontWeight.w800, fontSize: 12)),
                      ),
                    ],
                  ]),
                ),
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: () { _loaded.remove(type); return _load(type); },
                    child: ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                      itemCount: list.length,
                      itemBuilder: (context, i) {
                        final s = list[i];
                        final password = _password(s);
                        final active = _isActive(s);
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            leading: CircleAvatar(child: Text('${s['full_name'] ?? s['name'] ?? 'S'}'.substring(0, 1).toUpperCase())),
                            title: Text('${s['full_name'] ?? s['name'] ?? ''}'),
                            subtitle: Text('${s['phone'] ?? ''} • ${s['class_name'] ?? ''}\nUser: ${_username(s)}${password.isEmpty ? '' : ' • Pass: $password'}${active ? '' : '  •  INACTIVE'}'),
                            isThreeLine: true,
                            trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                              IconButton(
                                icon: Icon(active ? Icons.person_off_outlined : Icons.person_outline, color: active ? AppColors.danger : AppColors.success),
                                tooltip: active ? 'Deactivate' : 'Activate',
                                onPressed: () => _toggle(s, type),
                              ),
                              IconButton(
                                icon: const Icon(Icons.edit_outlined),
                                tooltip: 'Edit',
                                onPressed: () => _edit(s, type),
                              ),
                            ]),
                            onTap: () => _show(s),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ]);
            }).toList(),
          ),
        ),
      ]),
    );
  }
}
