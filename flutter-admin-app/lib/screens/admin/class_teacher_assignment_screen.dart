import 'package:flutter/material.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';

class ClassTeacherAssignmentScreen extends StatefulWidget {
  const ClassTeacherAssignmentScreen({super.key});
  @override
  State<ClassTeacherAssignmentScreen> createState() => _ClassTeacherAssignmentScreenState();
}

class _ClassTeacherAssignmentScreenState extends State<ClassTeacherAssignmentScreen> {
  List<dynamic> _teachers = [];
  List<dynamic> _classes = [];
  List<dynamic> _assignments = [];
  int? _teacherId;
  String? _className;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await ApiService().getClassTeacherData();
      if (!mounted) return;
      setState(() {
        _teachers = data['teachers'] ?? [];
        _classes = data['classes'] ?? [];
        _assignments = data['assignments'] ?? [];
        _loading = false;
      });
      _syncSelection();
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Set<String> get _assignedClasses {
    final set = <String>{};
    for (final a in _assignments) {
      if (a is Map) {
        final c = '${a['assigned_class'] ?? a['class'] ?? ''}'.trim().toLowerCase();
        if (c.isNotEmpty) set.add(c);
      }
    }
    return set;
  }

  List<String> get _availableClasses {
    final assigned = _assignedClasses;
    return _classes
        .map((c) => '$c')
        .where((c) => c.trim().isNotEmpty && !assigned.contains(c.trim().toLowerCase()))
        .toList()
      ..sort();
  }

  void _syncSelection() {
    final available = _availableClasses;
    if (_className != null && !available.contains(_className)) _className = available.isNotEmpty ? available.first : null;
    if (_className == null && available.isNotEmpty) _className = available.first;
    if (_teachers.isNotEmpty && _teacherId == null) {
      _teacherId = int.tryParse('${(_teachers.first as Map)['global_staff_id']}');
    }
  }

  Future<void> _assign() async {
    if (_teacherId == null || _className == null) return;
    final teacher = _teachers.firstWhere(
      (t) => int.tryParse('${(t as Map)['global_staff_id']}') == _teacherId,
      orElse: () => null,
    );
    final name = teacher is Map ? '${teacher['teacher_name'] ?? teacher['name'] ?? ''}' : '';
    final err = await ApiService().assignClassTeacher(globalStaffId: _teacherId!, teacherName: name, className: _className!);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(err ?? 'Teacher assigned to $_className'),
      backgroundColor: err == null ? AppColors.success : AppColors.danger,
    ));
    if (err == null) await _load();
  }

  Future<void> _unassign(String className) async {
    final ok = await ApiService().unassignClassTeacher(className);
    if (!mounted) return;
    if (ok) await _load();
  }

  @override
  Widget build(BuildContext context) {
    final available = _availableClasses;
    return Scaffold(
      appBar: AppBar(title: const Text('Class Teacher Assignment')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)))
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Row(children: [
                      _chip('Assigned: ${_assignments.length}', AppColors.primary),
                      const SizedBox(width: 8),
                      _chip('Available: ${available.length}', AppColors.info),
                    ]),
                    const SizedBox(height: 10),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const Text('Assign a class teacher', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                          const SizedBox(height: 4),
                          const Text('Already-assigned classes are removed from the class list.', style: TextStyle(fontSize: 12, color: Colors.grey)),
                          const SizedBox(height: 12),
                          DropdownButtonFormField<int>(
                            value: _teacherId,
                            isExpanded: true,
                            decoration: const InputDecoration(labelText: 'Teacher', isDense: true),
                            items: _teachers.map((t) {
                              final m = t as Map;
                              return DropdownMenuItem<int>(value: int.tryParse('${m['global_staff_id']}') ?? 0, child: Text('${m['teacher_name'] ?? m['name'] ?? ''}'));
                            }).toList(),
                            onChanged: (v) => setState(() => _teacherId = v),
                          ),
                          const SizedBox(height: 10),
                          if (available.isEmpty)
                            const Card(
                              child: Padding(
                                padding: EdgeInsets.all(14),
                                child: Text('All classes already have a class teacher. Remove one below to reassign it.'),
                              ),
                            )
                          else
                            DropdownButtonFormField<String>(
                              value: _className != null && available.contains(_className) ? _className : available.first,
                              isExpanded: true,
                              decoration: const InputDecoration(labelText: 'Class', isDense: true),
                              items: available.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                              onChanged: (v) => setState(() => _className = v),
                            ),
                          const SizedBox(height: 12),
                          FilledButton.icon(
                            onPressed: available.isEmpty ? null : _assign,
                            icon: const Icon(Icons.person_add_alt),
                            label: const Text('Assign'),
                          ),
                        ]),
                      ),
                    ),
                    const SizedBox(height: 18),
                    const Text('Current assignments', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                    const SizedBox(height: 8),
                    if (_assignments.isEmpty)
                      const Card(child: Padding(padding: EdgeInsets.all(20), child: Text('No classes assigned yet.')))
                    else ..._assignments.map((a) {
                      final m = a as Map;
                      final className = '${m['assigned_class'] ?? m['class'] ?? ''}';
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: const CircleAvatar(child: Icon(Icons.person)),
                          title: Text('${m['teacher_name'] ?? m['assigned_teacher'] ?? ''}'),
                          subtitle: Text('Class $className'),
                          trailing: IconButton(icon: const Icon(Icons.person_remove), tooltip: 'Unassign', onPressed: () => _unassign(className)),
                        ),
                      );
                    }),
                  ],
                ),
    );
  }

  Widget _chip(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(color: color.withOpacity(0.10), borderRadius: BorderRadius.circular(20)),
      child: Text(text, style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 12)),
    );
  }
}
