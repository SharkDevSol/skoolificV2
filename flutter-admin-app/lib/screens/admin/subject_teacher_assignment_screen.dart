import 'package:flutter/material.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';

class SubjectTeacherAssignmentScreen extends StatefulWidget {
  const SubjectTeacherAssignmentScreen({super.key});
  @override
  State<SubjectTeacherAssignmentScreen> createState() => _SubjectTeacherAssignmentScreenState();
}

class _SubjectTeacherAssignmentScreenState extends State<SubjectTeacherAssignmentScreen> {
  List<String> _teachers = [];
  List<Map<String, dynamic>> _combinations = [];
  final Set<String> _selected = {};
  String? _teacher;
  String _search = '';
  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final rawTeachers = await ApiService().getMarkTeachers();
      final teachers = rawTeachers
          .map((t) => t is Map ? '${t['name'] ?? t['teacher_name'] ?? ''}' : '$t')
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toSet()
          .toList()
        ..sort();
      final combinations = await ApiService().getSubjectClassCombinations();
      final assignments = await ApiService().getTeacherAssignments();
      _selected.clear();
      for (final a in assignments) {
        _selected.add('${a['teacher_name']}|||${a['subject_class']}');
      }
      if (!mounted) return;
      setState(() {
        _teachers = teachers;
        _combinations = combinations;
        _teacher = teachers.isNotEmpty ? teachers.first : null;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  String _subjectClass(Map<String, dynamic> c) =>
      '${c['subject_class'] ?? '${c['subject_name'] ?? ''} Class ${c['class_name'] ?? ''}'}';

  List<Map<String, dynamic>> get _assignedToTeacher {
    final t = _teacher;
    if (t == null) return [];
    return _combinations.where((c) => _selected.contains('$t|||${_subjectClass(c)}')).toList();
  }

  int get _assignedCount => _assignedToTeacher.length;

  Future<void> _save() async {
    setState(() => _saving = true);
    final list = _selected.map((key) {
      final i = key.indexOf('|||');
      return {'teacherName': key.substring(0, i), 'subjectClass': key.substring(i + 3)};
    }).toList();
    final err = await ApiService().assignTeachers(list);
    if (!mounted) return;
    setState(() => _saving = false);
    if (err == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Teacher assignments saved'), backgroundColor: AppColors.success));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: AppColors.danger));
    }
  }

  List<Map<String, dynamic>> get _filtered {
    final q = _search.trim().toLowerCase();
    if (q.isEmpty) return _combinations;
    return _combinations.where((c) => '${c['subject_name'] ?? ''} ${c['class_name'] ?? ''} ${_subjectClass(c)}'.toLowerCase().contains(q)).toList();
  }

  @override
  Widget build(BuildContext context) {
    final teacher = _teacher;
    final filtered = _filtered;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Subject Teacher Assignment'),
        actions: [TextButton(onPressed: _saving ? null : _save, child: Text(_saving ? 'Saving…' : 'Save'))],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)))
              : Column(children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                    child: Column(children: [
                      Row(children: [
                        Expanded(child: DropdownButtonFormField<String>(
                          value: teacher,
                          isExpanded: true,
                          decoration: const InputDecoration(labelText: 'Teacher', isDense: true),
                          items: _teachers.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                          onChanged: (v) => setState(() => _teacher = v),
                        )),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                          decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.10), borderRadius: BorderRadius.circular(20)),
                          child: Text('$_assignedCount assigned', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800, fontSize: 11)),
                        ),
                      ]),
                      const SizedBox(height: 10),
                      if (_assignedToTeacher.isNotEmpty) ...[
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Wrap(spacing: 6, runSpacing: 6, children: _assignedToTeacher.map((c) {
                            final label = '${c['subject_name'] ?? ''} • ${c['class_name'] ?? ''}';
                            return Chip(
                              label: Text(label, style: const TextStyle(fontSize: 11)),
                              onDeleted: () => setState(() => _selected.remove('$teacher|||${_subjectClass(c)}')),
                              deleteIcon: const Icon(Icons.close, size: 14),
                              visualDensity: VisualDensity.compact,
                            );
                          }).toList()),
                        ),
                        const SizedBox(height: 8),
                      ],
                      TextField(
                        decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search subject or class', isDense: true),
                        onChanged: (v) => setState(() => _search = v),
                      ),
                    ]),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(children: [
                      Text('${filtered.length} subject(s) shown', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                      const Spacer(),
                      TextButton.icon(
                        onPressed: () => setState(() {
                          for (final c in filtered) {
                            _selected.add('$teacher|||${_subjectClass(c)}');
                          }
                        }),
                        icon: const Icon(Icons.done_all, size: 16),
                        label: const Text('Select all shown'),
                      ),
                    ]),
                  ),
                  Expanded(
                    child: ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                      itemCount: filtered.length,
                      itemBuilder: (context, i) {
                        final c = filtered[i];
                        final key = '$teacher|||${_subjectClass(c)}';
                        return CheckboxListTile(
                          dense: true,
                          title: Text('${c['subject_name'] ?? ''}'),
                          subtitle: Text('${c['class_name'] ?? ''}'),
                          value: _selected.contains(key),
                          onChanged: (v) => setState(() { if (v == true) _selected.add(key); else _selected.remove(key); }),
                        );
                      },
                    ),
                  ),
                ]),
    );
  }
}
