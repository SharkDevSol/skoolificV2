import 'package:flutter/material.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';
import 'marks_report_view.dart';

class MarksTab extends StatefulWidget {
  const MarksTab({super.key});
  @override
  State<MarksTab> createState() => _MarksTabState();
}

class _MarksTabState extends State<MarksTab> with SingleTickerProviderStateMixin {
  late final TabController _tc;
  List<Map<String, dynamic>> _subjectClasses = [];
  List<String> _classes = [];
  List<String> _subjects = [];
  String? _className;
  String? _subject;
  int _term = 1;
  int _termCount = 2;

  List<Map<String, dynamic>> _components = [];
  List<Map<String, dynamic>> _students = [];
  final Map<String, Map<String, String>> _values = {};
  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: 2, vsync: this);
    _loadOptions();
  }

  @override
  void dispose() {
    _tc.dispose();
    super.dispose();
  }

  Future<void> _loadOptions() async {
    setState(() { _loading = true; _error = null; });
    try {
      final list = await ApiService().getSubjectsClasses();
      final config = await ApiService().getMarkConfig();
      final tc = int.tryParse('${config['term_count'] ?? config['terms'] ?? 2}') ?? 2;
      final classes = <String>{};
      for (final row in list) {
        final c = row['class_name']?.toString() ?? '';
        if (c.isNotEmpty) classes.add(c);
      }
      final sortedClasses = classes.toList()..sort();
      if (!mounted) return;
      setState(() {
        _subjectClasses = list;
        _termCount = tc.clamp(1, 6);
        _classes = sortedClasses;
        _className = sortedClasses.isNotEmpty ? sortedClasses.first : null;
        if (_term > _termCount) _term = 1;
        _refreshSubjects();
      });
      await _loadMarks();
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  void _refreshSubjects() {
    if (_className == null) { _subjects = []; _subject = null; return; }
    final subjects = _subjectClasses
        .where((r) => r['class_name']?.toString() == _className)
        .map((r) => r['subject_name']?.toString() ?? '')
        .where((s) => s.isNotEmpty)
        .toSet()
        .toList()
      ..sort();
    _subjects = subjects;
    if (!_subjects.contains(_subject)) _subject = _subjects.isNotEmpty ? _subjects.first : null;
  }

  Future<void> _loadMarks() async {
    if (_className == null || _subject == null) {
      setState(() { _loading = false; });
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final data = await ApiService().getMarkList(
        subjectName: _subject!,
        className: _className!,
        termNumber: _term,
      );
      final comps = (data['components'] is List)
          ? (data['components'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList()
          : <Map<String, dynamic>>[];
      final students = (data['students'] is List)
          ? (data['students'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList()
          : <Map<String, dynamic>>[];
      _values.clear();
      for (final s in students) {
        final sid = '${s['school_id'] ?? s['id'] ?? ''}';
        final row = <String, String>{};
        for (final c in comps) {
          final key = _componentKey('${c['name'] ?? ''}');
          row[key] = '${s[key] ?? ''}';
        }
        _values[sid] = row;
      }
      if (!mounted) return;
      setState(() {
        _components = comps;
        _students = students;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  String _componentKey(String name) {
    var key = name.trim().toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '_');
    key = key.replaceAll(RegExp(r'^_+|_+$'), '');
    return key;
  }

  double _studentTotal(String sid) {
    final row = _values[sid] ?? {};
    double total = 0;
    row.forEach((_, v) { total += double.tryParse(v) ?? 0; });
    return total;
  }

  List<String> get _rankedIds {
    final ids = _students.map((s) => '${s['school_id'] ?? s['id'] ?? ''}').toList();
    ids.sort((a, b) => _studentTotal(b).compareTo(_studentTotal(a)));
    return ids;
  }

  Future<void> _save() async {
    if (_className == null || _subject == null) return;
    setState(() { _saving = true; _error = null; });
    try {
      final rows = <Map<String, dynamic>>[];
      for (final s in _students) {
        final sid = '${s['school_id'] ?? s['id'] ?? ''}';
        final marks = <String, double>{};
        for (final c in _components) {
          final key = _componentKey('${c['name'] ?? ''}');
          marks[key] = double.tryParse(_values[sid]?[key] ?? '') ?? 0;
        }
        rows.add({
          'studentName': '${s['student_name'] ?? ''}',
          'studentId': sid,
          'school_id': sid,
          'marks': marks,
        });
      }
      final ok = await ApiService().updateMarks(
        subjectName: _subject!,
        className: _className!,
        termNumber: _term,
        rows: rows,
      );
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(ok ? 'Marks saved' : (ApiService().lastError ?? 'Could not save marks')),
        backgroundColor: ok ? AppColors.success : AppColors.danger,
      ));
      if (ok) await _loadMarks();
    } catch (e) {
      if (!mounted) return;
      setState(() { _saving = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Material(
        color: Theme.of(context).appBarTheme.backgroundColor ?? Theme.of(context).cardColor,
        child: TabBar(controller: _tc, tabs: const [Tab(text: 'Enter Marks'), Tab(text: 'Report')]),
      ),
      Expanded(child: TabBarView(controller: _tc, children: [
        _buildEntry(),
        MarksReportView(classes: _classes, subjectClasses: _subjectClasses, termCount: _termCount),
      ])),
    ]);
  }

  Widget _buildEntry() {
    final theme = Theme.of(context);
    final ranked = _rankedIds;
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
        child: Column(children: [
          Row(children: [
            Expanded(child: DropdownButtonFormField<String>(
              value: _className,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Class', isDense: true),
              items: _classes.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (v) {
                setState(() { _className = v; _refreshSubjects(); });
                _loadMarks();
              },
            )),
            const SizedBox(width: 10),
            SizedBox(
              width: 96,
              child: DropdownButtonFormField<int>(
                value: _term,
                decoration: const InputDecoration(labelText: 'Term', isDense: true),
                items: List.generate(_termCount, (i) => DropdownMenuItem(value: i + 1, child: Text('T${i + 1}'))),
                onChanged: (v) { setState(() => _term = v ?? 1); _loadMarks(); },
              ),
            ),
          ]),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: DropdownButtonFormField<String>(
              value: _subject,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Subject', isDense: true),
              items: _subjects.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
              onChanged: (v) { setState(() => _subject = v); _loadMarks(); },
            )),
            const SizedBox(width: 10),
            FilledButton.icon(
              onPressed: _saving ? null : _save,
              icon: _saving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.save),
              label: const Text('Save'),
            ),
          ]),
          const SizedBox(height: 8),
          Row(children: [
            _chip('$_termCount term(s) configured', AppColors.info),
            const SizedBox(width: 8),
            _chip('Total ${_students.length}', AppColors.primary),
          ]),
        ]),
      ),
      const SizedBox(height: 8),
      Expanded(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)))
                : _students.isEmpty
                    ? const Center(child: Text('No mark list for this subject/class/term.'))
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                        itemCount: _students.length,
                        itemBuilder: (context, i) {
                          final s = _students[i];
                          final sid = '${s['school_id'] ?? s['id'] ?? ''}';
                          final rank = ranked.indexOf(sid) + 1;
                          final total = _studentTotal(sid);
                          final avg = _components.isEmpty ? 0.0 : total / _components.length;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Row(children: [
                                  Expanded(child: Text('${s['student_name'] ?? ''}', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700))),
                                  Chip(label: Text('Rank $rank'), visualDensity: VisualDensity.compact),
                                  const SizedBox(width: 6),
                                  Text('${total.toStringAsFixed(1)} / ${avg.toStringAsFixed(1)} avg', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
                                ]),
                                const SizedBox(height: 8),
                                Wrap(spacing: 8, runSpacing: 8, children: _components.map((c) {
                                  final key = _componentKey('${c['name'] ?? ''}');
                                  return SizedBox(
                                    width: 120,
                                    child: TextFormField(
                                      initialValue: _values[sid]?[key] ?? '',
                                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                      decoration: InputDecoration(labelText: '${c['name'] ?? key}', isDense: true, border: const OutlineInputBorder()),
                                      onChanged: (v) { _values.putIfAbsent(sid, () => {})[key] = v; },
                                    ),
                                  );
                                }).toList()),
                              ]),
                            ),
                          );
                        },
                      ),
      ),
    ]);
  }

  Widget _chip(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: color.withOpacity(0.10), borderRadius: BorderRadius.circular(20)),
      child: Text(text, style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 11)),
    );
  }
}
