import 'package:flutter/material.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';

/// Unpaid-hide reasons, brought over from the web /admin-unpaid page.
/// The class list uses the same source as the mark-list setup
/// (/api/mark-list/classes) so it is never empty.
class UnpaidReasonsScreen extends StatefulWidget {
  const UnpaidReasonsScreen({super.key});

  @override
  State<UnpaidReasonsScreen> createState() => _UnpaidReasonsScreenState();
}

class _UnpaidReasonsScreenState extends State<UnpaidReasonsScreen> with SingleTickerProviderStateMixin {
  late final TabController _tc;
  List<Map<String, dynamic>> _active = [];
  List<Map<String, dynamic>> _history = [];
  bool _loading = true;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tc.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = ''; });
    try {
      final results = await Future.wait([
        ApiService().getUnpaidReasons(),
        ApiService().getUnpaidReasons(status: 'history'),
      ]);
      if (!mounted) return;
      setState(() {
        _active = results[0];
        _history = results[1];
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _add() async {
    final added = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => const AddUnpaidReasonScreen()),
    );
    if (added == true) await _load();
  }

  Future<void> _delete(Map<String, dynamic> r) async {
    final id = int.tryParse('${r['id']}');
    if (id == null) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete this reason?'),
        content: Text('${r['student_name'] ?? 'This student'} will be hidden again if they are still unpaid.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    final err = await ApiService().deleteUnpaidReason(id);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(err ?? 'Reason deleted'),
      backgroundColor: err == null ? AppColors.success : AppColors.danger,
    ));
    if (err == null) await _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Unpaid Reasons'),
        bottom: TabBar(controller: _tc, tabs: const [Tab(text: 'Active'), Tab(text: 'History')]),
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh), tooltip: 'Refresh'),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _add,
        icon: const Icon(Icons.add),
        label: const Text('Reason'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error.isNotEmpty
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error, textAlign: TextAlign.center)))
              : TabBarView(
                  controller: _tc,
                  children: [
                    _buildList(_active, canDelete: true),
                    _buildList(_history, canDelete: true),
                  ],
                ),
    );
  }

  Widget _buildList(List<Map<String, dynamic>> rows, {required bool canDelete}) {
    if (rows.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(24),
        children: const [
          SizedBox(height: 80),
          Icon(Icons.verified_outlined, size: 48, color: Colors.grey),
          SizedBox(height: 12),
          Text('No entries.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
        ],
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        itemCount: rows.length,
        itemBuilder: (context, i) {
          final r = rows[i];
          final status = '${r['status'] ?? ''}';
          final active = status == 'active';
          final expires = '${r['expires_at'] ?? ''}';
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 6, 10),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: (active ? AppColors.success : Colors.grey).withOpacity(0.12),
                  child: Icon(active ? Icons.visibility : Icons.history, size: 18, color: active ? AppColors.success : Colors.grey),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Expanded(child: Text('${r['student_name'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w800))),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(color: (active ? AppColors.success : Colors.grey).withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
                        child: Text(status.isEmpty ? '—' : status, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: active ? AppColors.success : Colors.grey)),
                      ),
                    ]),
                    const SizedBox(height: 2),
                    Text('${r['class_name'] ?? ''} • added by ${r['created_by'] ?? '—'}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                    const SizedBox(height: 4),
                    Text('${r['reason'] ?? ''}', style: const TextStyle(fontSize: 13)),
                    const SizedBox(height: 4),
                    Text(
                      expires.isEmpty || expires == 'null' ? 'Expires: never' : 'Expires: ${_formatDate(expires)}',
                      style: const TextStyle(fontSize: 10, color: Colors.grey),
                    ),
                  ]),
                ),
                if (canDelete && active)
                  IconButton(
                    icon: const Icon(Icons.delete_outline, color: AppColors.danger),
                    tooltip: 'Delete',
                    onPressed: () => _delete(r),
                  ),
              ]),
            ),
          );
        },
      ),
    );
  }

  String _formatDate(String raw) {
    final d = DateTime.tryParse(raw);
    if (d == null) return raw;
    final local = d.toLocal();
    return '${local.year}-${local.month.toString().padLeft(2, '0')}-${local.day.toString().padLeft(2, '0')} '
        '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  }
}

class AddUnpaidReasonScreen extends StatefulWidget {
  const AddUnpaidReasonScreen({super.key});

  @override
  State<AddUnpaidReasonScreen> createState() => _AddUnpaidReasonScreenState();
}

class _AddUnpaidReasonScreenState extends State<AddUnpaidReasonScreen> {
  List<String> _classes = [];
  List<Map<String, dynamic>> _students = [];
  final Set<String> _picked = {};
  String? _className;
  final _reason = TextEditingController();
  final _hours = TextEditingController(text: '4');
  bool _timer = false;
  bool _loading = true;
  bool _loadingStudents = false;
  bool _saving = false;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _loadClasses();
  }

  @override
  void dispose() {
    _reason.dispose();
    _hours.dispose();
    super.dispose();
  }

  Future<void> _loadClasses() async {
    setState(() { _loading = true; _error = ''; });
    try {
      // Same classes source as the mark-list setup (fixes the empty web list).
      final classes = await ApiService().getMarkClasses();
      if (!mounted) return;
      setState(() { _classes = classes; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _loadStudents(String cls) async {
    setState(() { _className = cls; _picked.clear(); _students = []; _loadingStudents = true; });
    try {
      final rows = await ApiService().getStudentList(cls);
      if (!mounted) return;
      setState(() { _students = rows; _loadingStudents = false; });
    } catch (e) {
      if (mounted) setState(() { _loadingStudents = false; _error = e.toString(); });
    }
  }

  Future<void> _save() async {
    if (_saving) return;
    if (_className == null || _className!.isEmpty) {
      setState(() => _error = 'Select a class');
      return;
    }
    if (_picked.isEmpty) {
      setState(() => _error = 'Select at least one student');
      return;
    }
    if (_reason.text.trim().isEmpty) {
      setState(() => _error = 'Write the reason');
      return;
    }
    setState(() { _saving = true; _error = ''; });
    final hours = int.tryParse(_hours.text) ?? 4;
    final expiresAt = _timer ? DateTime.now().add(Duration(hours: hours)).toUtc().toIso8601String() : null;
    final students = _students.where((s) => _picked.contains('${s['student_name'] ?? ''}')).map((s) => {
          'studentName': '${s['student_name'] ?? ''}',
          'schoolId': '${s['school_id'] ?? ''}',
          'className': _className,
        }).toList();
    final err = await ApiService().addUnpaidReason(
      students: students,
      reason: _reason.text.trim(),
      expiresAt: expiresAt,
    );
    if (!mounted) return;
    setState(() => _saving = false);
    if (err == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Reason added for ${students.length} student(s)'),
        backgroundColor: AppColors.success,
      ));
      Navigator.pop(context, true);
    } else {
      setState(() => _error = err);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Add reason')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
              children: [
                DropdownButtonFormField<String>(
                  value: _className,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Class'),
                  items: _classes.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                  onChanged: (v) {
                    if (v != null) _loadStudents(v);
                  },
                ),
                const SizedBox(height: 12),
                if (_loadingStudents)
                  const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator()))
                else if (_className != null && _students.isEmpty)
                  const Text('No students found in this class.', style: TextStyle(color: Colors.grey, fontSize: 12))
                else if (_students.isNotEmpty) ...[
                  Row(children: [
                    Text('Students (${_picked.length} selected)', style: const TextStyle(fontWeight: FontWeight.w700)),
                    const Spacer(),
                    TextButton(
                      onPressed: () => setState(() {
                        if (_picked.length == _students.length) {
                          _picked.clear();
                        } else {
                          _picked.addAll(_students.map((s) => '${s['student_name'] ?? ''}'));
                        }
                      }),
                      child: Text(_picked.length == _students.length ? 'Clear' : 'Select all'),
                    ),
                  ]),
                  Container(
                    constraints: const BoxConstraints(maxHeight: 260),
                    decoration: BoxDecoration(border: Border.all(color: AppColors.border), borderRadius: BorderRadius.circular(10)),
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: _students.length,
                      itemBuilder: (context, i) {
                        final s = _students[i];
                        final name = '${s['student_name'] ?? ''}';
                        return CheckboxListTile(
                          dense: true,
                          title: Text(name),
                          subtitle: Text('School ID ${s['school_id'] ?? '-'}', style: const TextStyle(fontSize: 11)),
                          value: _picked.contains(name),
                          onChanged: (v) => setState(() {
                            if (v == true) {
                              _picked.add(name);
                            } else {
                              _picked.remove(name);
                            }
                          }),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                TextField(
                  controller: _reason,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Reason', alignLabelWithHint: true),
                ),
                const SizedBox(height: 8),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Timer'),
                  subtitle: const Text('Off = the reason stays forever'),
                  value: _timer,
                  onChanged: (v) => setState(() => _timer = v),
                ),
                if (_timer)
                  Row(children: [
                    SizedBox(
                      width: 120,
                      child: TextField(
                        controller: _hours,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Hours'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Expires ${_hours.text.isEmpty ? '4' : _hours.text} hour(s) after saving',
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ),
                  ]),
                if (_error.isNotEmpty)
                  Container(
                    margin: const EdgeInsets.only(top: 12),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: AppColors.dangerSoft, borderRadius: BorderRadius.circular(10)),
                    child: Text(_error, style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w600)),
                  ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: _saving ? null : _save,
                  icon: _saving
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.check),
                  label: const Text('Save reason'),
                ),
              ],
            ),
    );
  }
}
