import 'package:flutter/material.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/info_dialog.dart';

class StudentsTab extends StatefulWidget {
  const StudentsTab({super.key});
  @override
  State<StudentsTab> createState() => _StudentsTabState();
}

class _StudentsTabState extends State<StudentsTab> {
  List<String> _classes = [];
  String? _className;
  List<Map<String, dynamic>> _students = [];
  bool _loading = true;
  String? _error;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _loadClasses();
  }

  Future<void> _loadClasses() async {
    setState(() { _loading = true; _error = null; });
    try {
      final classes = await ApiService().getClasses();
      if (!mounted) return;
      setState(() {
        _classes = classes;
        _className = classes.isNotEmpty ? classes.first : null;
      });
      if (_className != null) await _loadStudents();
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _loadStudents() async {
    if (_className == null) return;
    setState(() { _loading = true; _error = null; });
    try {
      final list = await ApiService().getStudentList(_className!);
      if (!mounted) return;
      setState(() { _students = list; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  List<Map<String, dynamic>> get _filtered {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return _students;
    return _students.where((s) {
      final text = '${s['student_name']} ${s['school_id']} ${s['class_id']} ${s['guardian_name']} ${s['guardian_phone']}'.toLowerCase();
      return text.contains(q);
    }).toList();
  }

  bool _isActive(Map<String, dynamic> s) {
    final v = s['is_active'];
    return v != false && '$v'.toLowerCase() != 'false';
  }

  void _showStudent(Map<String, dynamic> s) {
    showInfoSheet(
      context,
      title: '${s['student_name'] ?? 'Student'}',
      subtitle: 'Class ${_className ?? ''}',
      entries: [
        InfoEntry('Full name', '${s['student_name'] ?? ''}'),
        InfoEntry('Class', '${_className ?? ''}'),
        InfoEntry('Class ID', '${s['class_id'] ?? ''}'),
        InfoEntry('School ID', '${s['school_id'] ?? ''}'),
        InfoEntry('Gender', '${s['gender'] ?? ''}'),
        InfoEntry('Age', '${s['age'] ?? ''}'),
        InfoEntry('Parent name', '${s['guardian_name'] ?? ''}'),
        InfoEntry('Parent phone', '${s['guardian_phone'] ?? ''}'),
        InfoEntry('Parent relation', '${s['guardian_relation'] ?? ''}'),
        InfoEntry('Parent username', '${s['guardian_username'] ?? ''}'),
        InfoEntry('Parent password', '${s['guardian_password'] ?? ''}', hidden: true),
        InfoEntry('Status', _isActive(s) ? 'Active' : 'Inactive'),
      ],
    );
  }

  Future<void> _edit(Map<String, dynamic> s) async {
    final name = TextEditingController(text: '${s['student_name'] ?? ''}');
    final age = TextEditingController(text: '${s['age'] ?? ''}');
    final parent = TextEditingController(text: '${s['guardian_name'] ?? ''}');
    final phone = TextEditingController(text: '${s['guardian_phone'] ?? ''}');
    final relation = TextEditingController(text: '${s['guardian_relation'] ?? ''}');
    String gender = '${s['gender'] ?? ''}';
    bool saving = false;

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheet) {
        return AlertDialog(
          title: Text('Edit ${name.text.isEmpty ? 'student' : name.text}'),
          content: SizedBox(
            width: 520,
            child: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                TextField(controller: name, decoration: const InputDecoration(labelText: 'Student name')),
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
                TextField(controller: age, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Age')),
                const SizedBox(height: 10),
                TextField(controller: parent, decoration: const InputDecoration(labelText: 'Parent name')),
                const SizedBox(height: 10),
                TextField(controller: phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Parent phone')),
                const SizedBox(height: 10),
                TextField(controller: relation, decoration: const InputDecoration(labelText: 'Parent relation')),
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
                      final err = await ApiService().updateStudent(
                        className: _className ?? '${s['class'] ?? ''}',
                        schoolId: '${s['school_id'] ?? ''}',
                        classId: '${s['class_id'] ?? ''}',
                        updates: {
                          'student_name': name.text.trim(),
                          'gender': gender,
                          'age': age.text.trim(),
                          'guardian_name': parent.text.trim(),
                          'guardian_phone': phone.text.trim(),
                          'guardian_relation': relation.text.trim(),
                        },
                      );
                      if (!ctx.mounted) return;
                      setSheet(() => saving = false);
                      if (err == null) {
                        Navigator.pop(ctx);
                        if (!mounted) return;
                        await _loadStudents();
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Student updated'), backgroundColor: AppColors.success));
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

  Future<void> _toggle(Map<String, dynamic> s) async {
    final active = _isActive(s);
    final name = '${s['student_name'] ?? 'this student'}';
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(active ? 'Deactivate student?' : 'Activate student?'),
        content: Text(active
            ? '$name will be hidden from attendance and mark lists. You can reactivate later.'
            : '$name will be active again in attendance and mark lists.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(active ? 'Deactivate' : 'Activate')),
        ],
      ),
    );
    if (ok != true) return;
    final err = await ApiService().toggleStudentActive(
      className: _className ?? '${s['class'] ?? ''}',
      schoolId: '${s['school_id'] ?? ''}',
      classId: '${s['class_id'] ?? ''}',
      isActive: !active,
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(err ?? (active ? 'Student deactivated' : 'Student activated')),
      backgroundColor: err == null ? AppColors.success : AppColors.danger,
    ));
    if (err == null) await _loadStudents();
  }

  @override
  Widget build(BuildContext context) {
    final list = _filtered;
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
        child: Column(children: [
          Row(children: [
            Expanded(
              child: DropdownButtonFormField<String>(
                value: _className,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Class', isDense: true),
                items: _classes.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                onChanged: (v) {
                  setState(() => _className = v);
                  _loadStudents();
                },
              ),
            ),
            const SizedBox(width: 10),
            IconButton.filledTonal(onPressed: _loadStudents, icon: const Icon(Icons.refresh)),
          ]),
          const SizedBox(height: 8),
          Row(children: [
            _totalChip('Total students', '${_students.length}', AppColors.primary),
            const SizedBox(width: 8),
            if (_query.trim().isNotEmpty)
              _totalChip('Showing', '${list.length}', AppColors.info),
          ]),
        ]),
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: TextField(
          decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search student / parent / phone', isDense: true),
          onChanged: (v) => setState(() => _query = v),
        ),
      ),
      Expanded(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)))
                : list.isEmpty
                    ? const Center(child: Text('No students found.'))
                    : RefreshIndicator(
                        onRefresh: _loadStudents,
                        child: ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                          itemCount: list.length,
                          itemBuilder: (context, i) {
                            final s = list[i];
                            final name = '${s['student_name'] ?? 'Student'}';
                            final active = _isActive(s);
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                leading: CircleAvatar(child: Text(name.substring(0, 1).toUpperCase())),
                                title: Text(name),
                                subtitle: Text(
                                  'Class ID ${s['class_id'] ?? '-'} • School ID ${s['school_id'] ?? '-'}\n'
                                  '${s['guardian_name'] ?? ''} • ${s['guardian_phone'] ?? ''}'
                                  '${active ? '' : '  •  INACTIVE'}',
                                ),
                                isThreeLine: true,
                                trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                                  IconButton(
                                    icon: Icon(active ? Icons.person_off_outlined : Icons.person_outline, color: active ? AppColors.danger : AppColors.success),
                                    tooltip: active ? 'Deactivate' : 'Activate',
                                    onPressed: () => _toggle(s),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.edit_outlined),
                                    tooltip: 'Edit',
                                    onPressed: () => _edit(s),
                                  ),
                                ]),
                                onTap: () => _showStudent(s),
                              ),
                            );
                          },
                        ),
                      ),
      ),
    ]);
  }

  Widget _totalChip(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(color: color.withOpacity(0.10), borderRadius: BorderRadius.circular(20)),
      child: Text('$label: $value', style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 12)),
    );
  }
}
