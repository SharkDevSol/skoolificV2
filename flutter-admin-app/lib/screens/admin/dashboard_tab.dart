import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../app/app_provider.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';
import 'marks_report_screen.dart';

class DashboardTab extends StatefulWidget {
  const DashboardTab({super.key});
  @override
  State<DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<DashboardTab> {
  bool _loading = true;
  String? _error;
  int _students = 0;
  int _staff = 0;
  Map<String, dynamic> _summary = {};
  List<Map<String, dynamic>> _mostAbsent = [];
  Map<String, int> _today = {'present': 0, 'absent': 0, 'late': 0, 'leave': 0, 'total': 0};
  int _todayDay = 0;

  List<String> _classes = [];
  List<Map<String, dynamic>> _subjectClasses = [];
  int _termCount = 2;
  String? _markClass;
  int _markTerm = 1;
  Map<String, dynamic> _markSummary = {};
  bool _markLoading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final stats = await ApiService().getDashboardStats();
      final analytics = await ApiService().getAttendanceAnalytics();
      final date = await ApiService().getCurrentEthiopianDate();
      final year = int.tryParse('${date['year']}') ?? 0;
      final month = int.tryParse('${date['month']}') ?? 0;
      final day = int.tryParse('${date['day']}') ?? 0;
      final monthly = await ApiService().getAcademicAttendanceMonthly(year: year, month: month);
      final today = {'present': 0, 'absent': 0, 'late': 0, 'leave': 0, 'total': 0};
      for (final r in monthly) {
        if ((int.tryParse('${r['ethiopian_day']}') ?? 0) != day) continue;
        final s = '${r['status'] ?? ''}'.toUpperCase();
        today['total'] = today['total']! + 1;
        if (s == 'PRESENT') today['present'] = today['present']! + 1;
        if (s == 'ABSENT') today['absent'] = today['absent']! + 1;
        if (s == 'LATE') today['late'] = today['late']! + 1;
        if (s == 'LEAVE' || s == 'PERMISSION') today['leave'] = today['leave']! + 1;
      }
      final enrollment = stats['studentEnrollment'] is Map ? stats['studentEnrollment'] as Map : {};
      final staff = stats['staffCount'] is Map ? stats['staffCount'] as Map : {};
      final summary = analytics['summary'] is Map ? Map<String, dynamic>.from(analytics['summary']) : <String, dynamic>{};
      final all = analytics['allClasses'] is Map ? analytics['allClasses'] as Map : {};
      final absent = all['mostAbsent'] is List ? (all['mostAbsent'] as List) : [];

      final subjectClasses = await ApiService().getSubjectsClasses();
      final config = await ApiService().getMarkConfig();
      final termCount = (int.tryParse('${config['term_count'] ?? config['terms'] ?? 2}') ?? 2).clamp(1, 6);
      final classes = <String>{};
      for (final row in subjectClasses) {
        final c = row['class_name']?.toString() ?? '';
        if (c.isNotEmpty) classes.add(c);
      }
      final sortedClasses = classes.toList()..sort();

      if (!mounted) return;
      setState(() {
        _students = int.tryParse('${enrollment['total'] ?? stats['students'] ?? (stats['basic'] is Map ? (stats['basic'] as Map)['totalStudents'] : null) ?? 0}') ?? 0;
        _staff = int.tryParse('${staff['total'] ?? stats['staff'] ?? (stats['basic'] is Map ? (stats['basic'] as Map)['staffCount'] : null) ?? 0}') ?? 0;
        _summary = summary;
        _mostAbsent = absent.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        _today = today;
        _todayDay = day;
        _termCount = termCount;
        _subjectClasses = subjectClasses;
        _classes = sortedClasses;
        _markClass = sortedClasses.isNotEmpty ? sortedClasses.first : null;
        _loading = false;
      });
      if (_markClass != null) await _loadMarkSummary();
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _loadMarkSummary() async {
    if (_markClass == null) return;
    setState(() { _markLoading = true; });
    final data = await ApiService().getClassRanking(_markClass!, _markTerm);
    final raw = data['rankings'];
    final list = raw is List ? raw.map((e) => Map<String, dynamic>.from(e as Map)).toList() : <Map<String, dynamic>>[];
    double sum = 0;
    int pass = 0;
    for (final r in list) {
      final avg = double.tryParse('${r['average'] ?? 0}') ?? 0;
      sum += avg;
      if (avg >= 50) pass++;
    }
    if (!mounted) return;
    setState(() {
      _markSummary = {
        'students': list.length,
        'average': list.isEmpty ? 0.0 : sum / list.length,
        'passRate': list.isEmpty ? 0 : ((pass / list.length) * 100).round(),
        'top': list.take(5).toList(),
        'low': list.reversed.take(5).toList(),
      };
      _markLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final app = Provider.of<AppProvider>(context);
    final theme = Theme.of(context);
    final user = app.user;
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.cloud_off, size: 48, color: Colors.grey),
          const SizedBox(height: 12),
          Text(_error!, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _load, child: const Text('Retry')),
        ]),
      ));
    }
    final rate = _today['total'] == 0 ? 0 : (((_today['present']! + _today['late']!) / _today['total']!) * 100).round();
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('${tr(context, 'welcome')}, ${user?.name ?? tr(context, 'admin')}', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text('${user?.branchCode ?? ''} • ${tr(context, 'school_overview')}', style: TextStyle(color: theme.textTheme.bodySmall?.color)),
          const SizedBox(height: 18),
          Row(children: [
            Expanded(child: _statCard(tr(context, 'students'), '$_students', Icons.people, AppColors.primary)),
            const SizedBox(width: 12),
            Expanded(child: _statCard(tr(context, 'staff'), '$_staff', Icons.badge, AppColors.success)),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: _statCard(tr(context, 'today_present'), '${_today['present']}', Icons.how_to_reg, AppColors.success)),
            const SizedBox(width: 12),
            Expanded(child: _statCard(tr(context, 'today_absent'), '${_today['absent']}', Icons.person_off, AppColors.danger)),
          ]),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  const Icon(Icons.fact_check, color: AppColors.primary),
                  const SizedBox(width: 8),
                  Text('Today — day $_todayDay', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                  const Spacer(),
                  Text('$rate%', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.primary)),
                ]),
                const SizedBox(height: 8),
                Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
                  _mini('Present', '${_today['present']}', Colors.green),
                  _mini('Absent', '${_today['absent']}', Colors.red),
                  _mini('Late', '${_today['late']}', Colors.orange),
                  _mini('Permission', '${_today['leave']}', Colors.blue),
                ]),
                if (_today['total'] == 0)
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Text('No attendance has been marked today yet.', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  ),
              ]),
            ),
          ),
          const SizedBox(height: 22),
          Text('Mark list report', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(children: [
                Row(children: [
                  Expanded(child: DropdownButtonFormField<String>(
                    value: _markClass,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Class', isDense: true),
                    items: _classes.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                    onChanged: (v) { setState(() => _markClass = v); _loadMarkSummary(); },
                  )),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 90,
                    child: DropdownButtonFormField<int>(
                      value: _markTerm,
                      decoration: const InputDecoration(labelText: 'Term', isDense: true),
                      items: List.generate(_termCount, (i) => DropdownMenuItem(value: i + 1, child: Text('T${i + 1}'))),
                      onChanged: (v) { setState(() => _markTerm = v ?? 1); _loadMarkSummary(); },
                    ),
                  ),
                ]),
                const SizedBox(height: 10),
                if (_markLoading)
                  const Padding(padding: EdgeInsets.all(14), child: Center(child: CircularProgressIndicator()))
                else if ((_markSummary['students'] ?? 0) == 0)
                  const Padding(padding: EdgeInsets.all(10), child: Text('No marks entered for this class/term yet.'))
                else ...[
                  Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
                    _mini('Students', '${_markSummary['students'] ?? 0}', AppColors.primary),
                    _mini('Average', '${(_markSummary['average'] as double? ?? 0).toStringAsFixed(1)}%', AppColors.success),
                    _mini('Pass rate', '${_markSummary['passRate'] ?? 0}%', AppColors.warning),
                  ]),
                  const SizedBox(height: 10),
                  _markList('Highest points', (_markSummary['top'] as List?) ?? [], AppColors.success, 'average'),
                  const SizedBox(height: 6),
                  _markList('Lowest points', (_markSummary['low'] as List?) ?? [], AppColors.danger, 'average'),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MarksReportScreen())),
                    icon: const Icon(Icons.bar_chart),
                    label: const Text('Open full mark list report'),
                  ),
                ],
              ]),
            ),
          ),
          const SizedBox(height: 22),
          Text('All-time attendance totals', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text('Cumulative records from the attendance database — not only today.', style: TextStyle(fontSize: 12, color: theme.textTheme.bodySmall?.color)),
          const SizedBox(height: 10),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _mini('Present', '${_summary['present'] ?? 0}', Colors.green),
                  _mini('Absent', '${_summary['absent'] ?? 0}', Colors.red),
                  _mini('Late', '${_summary['late'] ?? 0}', Colors.orange),
                  _mini('Leave', '${_summary['permission'] ?? 0}', Colors.blue),
                ],
              ),
            ),
          ),
          const SizedBox(height: 22),
          Text('Most absent students (all-time)', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          if (_mostAbsent.isEmpty)
            const Card(child: Padding(padding: EdgeInsets.all(20), child: Text('No attendance records yet.')))
          else
            ..._mostAbsent.take(10).map((s) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: CircleAvatar(child: Text('${_mostAbsent.indexOf(s) + 1}')),
                title: Text('${s['student_name'] ?? ''}'),
                subtitle: Text('${s['class_name'] ?? ''}'),
                trailing: Text('${s['count'] ?? 0} absent', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.danger)),
              ),
            )),
        ],
      ),
    );
  }

  Widget _statCard(String label, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          CircleAvatar(backgroundColor: color.withOpacity(0.12), child: Icon(icon, color: color)),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
            Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ])),
        ]),
      ),
    );
  }

  Widget _mini(String label, String value, Color color) {
    return Column(children: [
      Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: color)),
      Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
    ]);
  }

  Widget _markList(String title, List list, Color color, String key) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: color)),
      const SizedBox(height: 4),
      if (list.isEmpty)
        const Text('No records', style: TextStyle(fontSize: 12, color: Colors.grey))
      else
        ...list.map((raw) {
          final m = Map<String, dynamic>.from(raw as Map);
          final avg = double.tryParse('${m[key] ?? 0}') ?? 0;
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 2),
            child: Row(children: [
              Expanded(child: Text('${m['studentName'] ?? m['student_name'] ?? ''}', style: const TextStyle(fontSize: 12))),
              Text('${avg.toStringAsFixed(1)}%', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color)),
            ]),
          );
        }),
    ]);
  }
}
