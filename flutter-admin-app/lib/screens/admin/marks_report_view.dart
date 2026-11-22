import 'package:flutter/material.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';

class MarksReportView extends StatefulWidget {
  final List<String> classes;
  final List<Map<String, dynamic>> subjectClasses;
  final int termCount;
  const MarksReportView({super.key, required this.classes, required this.subjectClasses, required this.termCount});

  @override
  State<MarksReportView> createState() => _MarksReportViewState();
}

class _MarksReportViewState extends State<MarksReportView> {
  String? _className; // null = all classes
  int _term = 1;
  bool _loading = false;
  String? _error;
  String _query = '';

  List<String> _subjects = [];
  List<Map<String, dynamic>> _rankings = [];
  List<Map<String, dynamic>> _classSummaries = [];
  List<Map<String, dynamic>> _top = [];
  List<Map<String, dynamic>> _low = [];

  @override
  void initState() {
    super.initState();
    if (widget.classes.isNotEmpty) _className = widget.classes.first;
    _load();
  }

  List<String> get _classes => widget.classes;

  List<String> _subjectsFor(String? className) {
    if (className == null) return [];
    return widget.subjectClasses
        .where((r) => r['class_name']?.toString() == className)
        .map((r) => r['subject_name']?.toString() ?? '')
        .where((s) => s.isNotEmpty)
        .toSet()
        .toList()
      ..sort();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      if (_className == null) {
        await _loadAll();
      } else {
        await _loadClass(_className!);
      }
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadClass(String className) async {
    final subjects = _subjectsFor(className);
    final results = await Future.wait(subjects.map((s) async {
      try {
        final data = await ApiService().getMarkList(subjectName: s, className: className, termNumber: _term);
        return MapEntry(s, data);
      } catch (_) {
        return MapEntry(s, <String, dynamic>{});
      }
    }));
    final map = <String, Map<String, dynamic>>{};
    final usedSubjects = <String>[];
    for (final entry in results) {
      final list = entry.value['students'] is List ? entry.value['students'] as List : const [];
      if (list.isEmpty) continue;
      usedSubjects.add(entry.key);
      for (final raw in list) {
        final row = Map<String, dynamic>.from(raw as Map);
        final name = '${row['student_name'] ?? ''}';
        if (name.isEmpty) continue;
        final st = map.putIfAbsent(name, () => {
              'studentName': name,
              'subjects': <String, double>{},
              'totalMarks': 0.0,
              'subjectCount': 0,
              'failed': 0,
            });
        final total = (double.tryParse('${row['total'] ?? 0}') ?? 0).clamp(0, 100).toDouble();
        (st['subjects'] as Map<String, double>)[entry.key] = total;
        st['totalMarks'] = (st['totalMarks'] as double) + total;
        st['subjectCount'] = (st['subjectCount'] as int) + 1;
        if ('${row['pass_status'] ?? ''}'.toLowerCase() != 'pass') st['failed'] = (st['failed'] as int) + 1;
      }
    }
    final list = map.values.map((s) {
      final count = s['subjectCount'] as int;
      final total = s['totalMarks'] as double;
      return {
        ...s,
        'average': count == 0 ? 0.0 : total / count,
        'overallStatus': (s['failed'] as int) == 0 && count > 0 ? 'Pass' : 'Fail',
      };
    }).toList()
      ..sort((a, b) => (b['average'] as double).compareTo(a['average'] as double));
    for (var i = 0; i < list.length; i++) {
      list[i]['rank'] = i + 1;
    }
    if (!mounted) return;
    setState(() {
      _subjects = usedSubjects;
      _rankings = list;
    });
  }

  Future<void> _loadAll() async {
    final summaries = <Map<String, dynamic>>[];
    final allStudents = <Map<String, dynamic>>[];
    for (final cls in _classes) {
      final data = await ApiService().getClassRanking(cls, _term);
      final raw = data['rankings'];
      final rankings = raw is List ? raw.map((e) => Map<String, dynamic>.from(e as Map)).toList() : <Map<String, dynamic>>[];
      if (rankings.isEmpty) continue;
      double sum = 0;
      int pass = 0;
      for (final r in rankings) {
        final avg = double.tryParse('${r['average'] ?? 0}') ?? 0;
        sum += avg;
        if (avg >= 50) pass++;
        allStudents.add({
          'studentName': '${r['studentName'] ?? r['student_name'] ?? ''}',
          'class_name': cls,
          'average': avg,
        });
      }
      summaries.add({
        'className': cls,
        'students': rankings.length,
        'average': rankings.isEmpty ? 0.0 : sum / rankings.length,
        'passRate': rankings.isEmpty ? 0 : ((pass / rankings.length) * 100).round(),
        'topName': '${rankings.first['studentName'] ?? rankings.first['student_name'] ?? ''}',
        'topAverage': double.tryParse('${rankings.first['average'] ?? 0}') ?? 0,
        'lowName': '${rankings.last['studentName'] ?? rankings.last['student_name'] ?? ''}',
        'lowAverage': double.tryParse('${rankings.last['average'] ?? 0}') ?? 0,
      });
    }
    summaries.sort((a, b) => (b['average'] as double).compareTo(a['average'] as double));
    allStudents.sort((a, b) => (b['average'] as double).compareTo(a['average'] as double));
    if (!mounted) return;
    setState(() {
      _classSummaries = summaries;
      _top = allStudents.take(10).toList();
      _low = allStudents.reversed.take(10).toList();
      _subjects = [];
      _rankings = [];
    });
  }

  String _grade(double avg) {
    if (avg >= 90) return 'A+';
    if (avg >= 80) return 'A';
    if (avg >= 70) return 'B+';
    if (avg >= 60) return 'B';
    if (avg >= 50) return 'C';
    if (avg >= 40) return 'D';
    return 'F';
  }

  Color _gradeColor(double avg) {
    if (avg >= 80) return AppColors.success;
    if (avg >= 60) return AppColors.warning;
    if (avg >= 50) return AppColors.info;
    return AppColors.danger;
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _query.trim().isEmpty
        ? _rankings
        : _rankings.where((r) => '${r['studentName']}'.toLowerCase().contains(_query.trim().toLowerCase())).toList();
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
        child: Column(children: [
          Row(children: [
            Expanded(child: DropdownButtonFormField<String>(
              value: _className ?? '__all__',
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Class', isDense: true),
              items: [
                const DropdownMenuItem<String>(value: '__all__', child: Text('All classes')),
                ..._classes.map((c) => DropdownMenuItem<String>(value: c, child: Text(c))),
              ],
              onChanged: (v) { setState(() => _className = (v == '__all__' ? null : v)); _load(); },
            )),
            const SizedBox(width: 8),
            SizedBox(
              width: 90,
              child: DropdownButtonFormField<int>(
                value: _term,
                decoration: const InputDecoration(labelText: 'Term', isDense: true),
                items: List.generate(widget.termCount, (i) => DropdownMenuItem(value: i + 1, child: Text('T${i + 1}'))),
                onChanged: (v) { setState(() => _term = v ?? 1); _load(); },
              ),
            ),
            const SizedBox(width: 4),
            IconButton.filledTonal(onPressed: _load, icon: const Icon(Icons.refresh, size: 18)),
          ]),
          const SizedBox(height: 8),
          if (_className != null)
            TextField(
              decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search student', isDense: true),
              onChanged: (v) => setState(() => _query = v),
            ),
        ]),
      ),
      Expanded(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)))
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                      children: _className == null ? _buildAll() : _buildClass(filtered),
                    ),
                  ),
      ),
    ]);
  }

  List<Widget> _buildClass(List<Map<String, dynamic>> filtered) {
    final total = filtered.length;
    final average = total == 0 ? 0.0 : filtered.fold<double>(0, (a, b) => a + (b['average'] as double)) / total;
    final pass = filtered.where((r) => '${r['overallStatus']}' == 'Pass').length;
    final top = filtered.take(5).toList();
    final low = filtered.reversed.take(5).toList();
    return [
      Wrap(spacing: 8, runSpacing: 8, children: [
        _stat('Students', '$total', AppColors.primary),
        _stat('Subjects', '${_subjects.length}', AppColors.info),
        _stat('Average', '${average.toStringAsFixed(1)}%', AppColors.success),
        _stat('Passed', '$pass', AppColors.warning),
      ]),
      const SizedBox(height: 14),
      const Text('Ranking — all subjects', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
      const SizedBox(height: 6),
      if (filtered.isEmpty)
        const Card(child: Padding(padding: EdgeInsets.all(20), child: Text('No marks found for this class and term.')))
      else
        Card(
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
              columnSpacing: 18,
              headingRowHeight: 40,
              dataRowMinHeight: 38,
              dataRowMaxHeight: 42,
              columns: [
                const DataColumn(label: Text('#', style: TextStyle(fontWeight: FontWeight.bold))),
                const DataColumn(label: Text('Student', style: TextStyle(fontWeight: FontWeight.bold))),
                ..._subjects.map((s) => DataColumn(label: Text(s, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11)))),
                const DataColumn(label: Text('Total', style: TextStyle(fontWeight: FontWeight.bold))),
                const DataColumn(label: Text('Avg', style: TextStyle(fontWeight: FontWeight.bold))),
                const DataColumn(label: Text('Grade', style: TextStyle(fontWeight: FontWeight.bold))),
                const DataColumn(label: Text('Status', style: TextStyle(fontWeight: FontWeight.bold))),
              ],
              rows: filtered.map((r) {
                final avg = r['average'] as double;
                final subs = r['subjects'] as Map<String, double>;
                return DataRow(cells: [
                  DataCell(Text('${r['rank']}')),
                  DataCell(SizedBox(width: 160, child: Text('${r['studentName']}', overflow: TextOverflow.ellipsis))),
                  ..._subjects.map((s) => DataCell(Text(subs[s] == null ? '-' : subs[s]!.toStringAsFixed(0), style: TextStyle(fontSize: 12, color: subs[s] == null ? Colors.grey : null)))),
                  DataCell(Text((r['totalMarks'] as double).toStringAsFixed(0), style: const TextStyle(fontWeight: FontWeight.bold))),
                  DataCell(Text('${avg.toStringAsFixed(1)}%', style: TextStyle(fontWeight: FontWeight.bold, color: _gradeColor(avg)))),
                  DataCell(Text(_grade(avg), style: TextStyle(fontWeight: FontWeight.bold, color: _gradeColor(avg)))),
                  DataCell(Text('${r['overallStatus']}', style: TextStyle(fontWeight: FontWeight.bold, color: '${r['overallStatus']}' == 'Pass' ? AppColors.success : AppColors.danger))),
                ]);
              }).toList(),
            ),
          ),
        ),
      const SizedBox(height: 16),
      _list('Highest points', top, AppColors.success),
      const SizedBox(height: 8),
      _list('Lowest points', low, AppColors.danger),
    ];
  }

  List<Widget> _buildAll() {
    return [
      const Text('All classes — term summary', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
      const SizedBox(height: 4),
      const Text('Class average and rank are calculated from every subject in the selected term.', style: TextStyle(fontSize: 12, color: Colors.grey)),
      const SizedBox(height: 10),
      if (_classSummaries.isEmpty)
        const Card(child: Padding(padding: EdgeInsets.all(20), child: Text('No class ranking data for this term.')))
      else
        ..._classSummaries.asMap().entries.map((e) {
          final i = e.key;
          final c = e.value;
          return Card(
            margin: const EdgeInsets.only(bottom: 6),
            child: ListTile(
              dense: true,
              leading: CircleAvatar(radius: 16, backgroundColor: AppColors.primary.withOpacity(0.10), child: Text('${i + 1}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 12))),
              title: Text('${c['className']}'),
              subtitle: Text('${c['students']} students • pass ${c['passRate']}%\nTop: ${c['topName']} • Low: ${c['lowName']}'),
              isThreeLine: true,
              trailing: Text('${(c['average'] as double).toStringAsFixed(1)}%', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
            ),
          );
        }),
      const SizedBox(height: 16),
      _simpleList('Highest points — all classes', _top, AppColors.success, true),
      const SizedBox(height: 8),
      _simpleList('Lowest points — all classes', _low, AppColors.danger, false),
    ];
  }

  Widget _stat(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(color: color.withOpacity(0.10), borderRadius: BorderRadius.circular(20)),
      child: Text('$label: $value', style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 12)),
    );
  }

  Widget _list(String title, List<Map<String, dynamic>> list, Color color) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: color)),
      const SizedBox(height: 6),
      if (list.isEmpty)
        const Card(child: Padding(padding: EdgeInsets.all(14), child: Text('No records.')))
      else
        ...list.map((r) => Card(
              margin: const EdgeInsets.only(bottom: 6),
              child: ListTile(
                dense: true,
                title: Text('${r['studentName']}'),
                subtitle: Text('Rank ${r['rank']}'),
                trailing: Text('${(r['average'] as double).toStringAsFixed(1)}%', style: TextStyle(fontWeight: FontWeight.bold, color: color)),
              ),
            )),
    ]);
  }

  Widget _simpleList(String title, List<Map<String, dynamic>> list, Color color, bool high) {
    final shown = high ? list : list; // already ordered
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: color)),
      const SizedBox(height: 6),
      if (shown.isEmpty)
        const Card(child: Padding(padding: EdgeInsets.all(14), child: Text('No records.')))
      else
        ...shown.map((r) => Card(
              margin: const EdgeInsets.only(bottom: 6),
              child: ListTile(
                dense: true,
                title: Text('${r['studentName']}'),
                subtitle: Text('${r['class_name']}'),
                trailing: Text('${(r['average'] as double).toStringAsFixed(1)}%', style: TextStyle(fontWeight: FontWeight.bold, color: color)),
              ),
            )),
    ]);
  }
}
