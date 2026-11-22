import 'package:flutter/material.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/info_dialog.dart';

class GuardiansScreen extends StatefulWidget {
  const GuardiansScreen({super.key});
  @override
  State<GuardiansScreen> createState() => _GuardiansScreenState();
}

class _GuardiansScreenState extends State<GuardiansScreen> {
  List<Map<String, dynamic>> _guardians = [];
  bool _loading = true;
  String? _error;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await ApiService().getGuardians();
      if (!mounted) return;
      setState(() { _guardians = data; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  List<Map<String, dynamic>> get _filtered {
    final q = _query.toLowerCase().trim();
    if (q.isEmpty) return _guardians;
    return _guardians.where((g) {
      final students = _studentsOf(g).map((s) => '${s['student_name'] ?? ''} ${s['class'] ?? ''}').join(' ');
      return '${g['guardian_name']} ${g['guardian_phone']} ${g['guardian_username']} $students'.toLowerCase().contains(q);
    }).toList();
  }

  List<Map<String, dynamic>> _studentsOf(Map<String, dynamic> g) {
    final raw = g['students'];
    if (raw is! List) return [];
    return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  int get _studentCount =>
      _guardians.fold<int>(0, (sum, g) => sum + _studentsOf(g).length);

  void _show(Map<String, dynamic> g) {
    final students = _studentsOf(g);
    showInfoSheet(
      context,
      title: '${g['guardian_name'] ?? 'Parent'}',
      subtitle: '${students.length} student(s)',
      entries: [
        InfoEntry('Parent name', '${g['guardian_name'] ?? ''}'),
        InfoEntry('Phone', '${g['guardian_phone'] ?? ''}'),
        InfoEntry('Relation', '${g['guardian_relation'] ?? ''}'),
        InfoEntry('Username', '${g['guardian_username'] ?? ''}'),
        InfoEntry('Password', '${g['guardian_password'] ?? ''}', hidden: true),
        for (var i = 0; i < students.length; i++) ...[
          InfoEntry('Student ${i + 1}', '${students[i]['student_name'] ?? ''}'),
          InfoEntry('Student ${i + 1} class', '${students[i]['class'] ?? ''}'),
          InfoEntry('Student ${i + 1} school ID', '${students[i]['school_id'] ?? ''}'),
          InfoEntry('Student ${i + 1} class ID', '${students[i]['class_id'] ?? ''}'),
        ],
      ],
    );
  }

  Future<void> _edit(Map<String, dynamic> g) async {
    final students = _studentsOf(g);
    final name = TextEditingController(text: '${g['guardian_name'] ?? ''}');
    final phone = TextEditingController(text: '${g['guardian_phone'] ?? ''}');
    final relation = TextEditingController(text: '${g['guardian_relation'] ?? ''}');
    final username = TextEditingController(text: '${g['guardian_username'] ?? ''}');
    final password = TextEditingController(text: '${g['guardian_password'] ?? ''}');
    bool saving = false;

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheet) {
        return AlertDialog(
          title: Text('Edit ${name.text.isEmpty ? 'parent' : name.text}'),
          content: SizedBox(
            width: 520,
            child: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                TextField(controller: name, decoration: const InputDecoration(labelText: 'Parent name')),
                const SizedBox(height: 10),
                TextField(controller: phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone')),
                const SizedBox(height: 10),
                TextField(controller: relation, decoration: const InputDecoration(labelText: 'Relation')),
                const SizedBox(height: 10),
                TextField(controller: username, decoration: const InputDecoration(labelText: 'Username')),
                const SizedBox(height: 10),
                TextField(controller: password, decoration: const InputDecoration(labelText: 'Password')),
                const SizedBox(height: 8),
                Text(
                  students.length == 1
                      ? 'Saved on this student record.'
                      : 'Saved on all ${students.length} student records of this parent.',
                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                ),
              ]),
            ),
          ),
          actions: [
            TextButton(onPressed: saving ? null : () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: saving
                  ? null
                  : () async {
                      if (name.text.trim().isEmpty) return;
                      setSheet(() => saving = true);
                      final updates = {
                        'guardian_name': name.text.trim(),
                        'guardian_phone': phone.text.trim(),
                        'guardian_relation': relation.text.trim(),
                        'guardian_username': username.text.trim(),
                        'guardian_password': password.text.trim(),
                      };
                      String? firstError;
                      for (final s in students) {
                        final err = await ApiService().updateStudent(
                          className: '${s['class'] ?? ''}',
                          schoolId: '${s['school_id'] ?? ''}',
                          classId: '${s['class_id'] ?? ''}',
                          updates: updates,
                        );
                        firstError ??= err;
                      }
                      if (!ctx.mounted) return;
                      setSheet(() => saving = false);
                      if (firstError == null) {
                        Navigator.pop(ctx);
                        if (!mounted) return;
                        await _load();
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Parent updated'), backgroundColor: AppColors.success));
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(firstError), backgroundColor: AppColors.danger));
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

  @override
  Widget build(BuildContext context) {
    final list = _filtered;
    return Scaffold(
      appBar: AppBar(title: const Text('Parents')),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: Row(children: [
            _chip('Parents', '${_guardians.length}', AppColors.primary),
            const SizedBox(width: 8),
            _chip('Students', '$_studentCount', AppColors.success),
            if (_query.trim().isNotEmpty) ...[
              const SizedBox(width: 8),
              _chip('Showing', '${list.length}', AppColors.info),
            ],
          ]),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: TextField(
            decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search parent / phone / student', isDense: true),
            onChanged: (v) => setState(() => _query = v),
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                        itemCount: list.length,
                        itemBuilder: (context, i) {
                          final g = list[i];
                          final students = _studentsOf(g);
                          final names = students.map((s) => '${s['student_name'] ?? ''} (${s['class'] ?? ''})').join(', ');
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: const CircleAvatar(child: Icon(Icons.family_restroom)),
                              title: Text('${g['guardian_name'] ?? ''}'),
                              subtitle: Text('${g['guardian_phone'] ?? ''}\n$names'),
                              isThreeLine: true,
                              trailing: IconButton(
                                icon: const Icon(Icons.edit_outlined),
                                tooltip: 'Edit',
                                onPressed: () => _edit(g),
                              ),
                              onTap: () => _show(g),
                            ),
                          );
                        },
                      ),
                    ),
        ),
      ]),
    );
  }

  Widget _chip(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(color: color.withOpacity(0.10), borderRadius: BorderRadius.circular(20)),
      child: Text('$label: $value', style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 12)),
    );
  }
}
