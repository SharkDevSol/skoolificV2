import 'package:flutter/material.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/ethiopian_date.dart';

class AttendanceTab extends StatefulWidget {
  const AttendanceTab({super.key});
  @override
  State<AttendanceTab> createState() => _AttendanceTabState();
}

class _AttendanceTabState extends State<AttendanceTab> with SingleTickerProviderStateMixin {
  late final TabController _tc;
  List<String> _classes = [];
  String? _className;
  String? _reportClass;
  List<Map<String, dynamic>> _students = [];
  final Map<String, Map<int, String>> _status = {};
  final Map<String, Map<int, String>> _checkIn = {};
  EthDate _today = EthiopianDate.fromGregorian(DateTime.now());
  int _day = EthiopianDate.fromGregorian(DateTime.now()).day;
  bool _loading = true;
  bool _saving = false;
  String? _error;

  bool _reportLoading = false;
  String? _reportError;
  String _period = 'month';
  int _week = 1;
  List<Map<String, dynamic>> _reportRecords = [];

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: 2, vsync: this);
    _tc.addListener(() {
      if (!_tc.indexIsChanging && _tc.index == 1) _loadReport();
    });
    _load();
  }

  @override
  void dispose() {
    _tc.dispose();
    super.dispose();
  }

  int get _year => _today.year;
  int get _month => _today.month;
  int get _daysInMonth => _month == 13 ? (EthiopianDate.year % 4 == 3 ? 6 : 5) : 30;

  String _sid(Map<String, dynamic> s) =>
      '${s['student_id'] ?? s['school_id'] ?? s['id'] ?? ''}';

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final date = await ApiService().getCurrentEthiopianDate();
      final classes = await ApiService().getAcademicAttendanceClasses();
      if (!mounted) return;
      final now = EthiopianDate.fromGregorian(DateTime.now());
      setState(() {
        _today = EthDate(
          int.tryParse('${date['year']}') ?? now.year,
          int.tryParse('${date['month']}') ?? now.month,
          int.tryParse('${date['day']}') ?? now.day,
        );
        _day = _today.day;
        _week = ((_day - 1) ~/ 7) + 1;
        _classes = classes;
        _className = _reportClass ?? (classes.isNotEmpty ? classes.first : null);
        _reportClass = classes.isNotEmpty ? classes.first : null;
      });
      await _loadClass();
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _loadClass() async {
    if (_className == null) return;
    setState(() { _loading = true; _error = null; });
    try {
      final students = await ApiService().getAcademicAttendanceStudents(_className!);
      final records = await ApiService().getAcademicAttendanceMonthly(
        year: _year,
        month: _month,
        className: _className,
      );
      _status.clear();
      _checkIn.clear();
      for (final r in records) {
        final sid = '${r['student_id'] ?? r['school_id'] ?? ''}';
        final d = int.tryParse('${r['ethiopian_day'] ?? r['day'] ?? 0}') ?? 0;
        if (sid.isEmpty || d == 0) continue;
        _status.putIfAbsent(sid, () => {})[d] = '${r['status'] ?? ''}'.toUpperCase();
        final inTime = '${r['check_in_time'] ?? r['check_in'] ?? ''}';
        if (inTime.isNotEmpty) _checkIn.putIfAbsent(sid, () => {})[d] = inTime;
      }
      if (!mounted) return;
      setState(() { _students = students; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  String _code(String s) {
    switch (s.toUpperCase()) {
      case 'PRESENT': return 'P';
      case 'ABSENT': return 'A';
      case 'LATE': return 'L';
      case 'LEAVE':
      case 'PERMISSION': return 'E';
      default: return '';
    }
  }

  String _codeForDay(Map<String, dynamic> student, int day) =>
      _code(_status[_sid(student)]?[day] ?? '');

  Future<void> _mark(Map<String, dynamic> student, String code) async {
    final sid = _sid(student);
    if (sid.isEmpty || _saving) return;
    final previous = _status[sid]?[_day];
    final value = code == 'P' ? 'PRESENT' : code == 'A' ? 'ABSENT' : code == 'L' ? 'LATE' : 'LEAVE';
    setState(() {
      _status.putIfAbsent(sid, () => {})[_day] = value;
      _saving = true;
    });
    final ok = await ApiService().saveAcademicAttendance(
      studentId: sid,
      className: _className!,
      ethYear: _year,
      ethMonth: _month,
      ethDay: _day,
      status: value,
      checkInTime: code == 'P' ? '08:00:00' : (code == 'L' ? '08:20:00' : '00:00:00'),
    );
    if (!mounted) return;
    setState(() {
      _saving = false;
      if (!ok) {
        if (previous == null) {
          _status[sid]?.remove(_day);
        } else {
          _status[sid]?[_day] = previous;
        }
      }
    });
    if (!ok) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Auto-save failed. Check connection.'), backgroundColor: AppColors.danger));
    }
  }

  Future<void> _shiftMonth(int delta) async {
    var m = _month + delta;
    var y = _year;
    if (m < 1) { m = 13; y -= 1; }
    if (m > 13) { m = 1; y += 1; }
    setState(() {
      _today = EthDate(y, m, 1);
      _day = 1;
      _week = 1;
    });
    await _loadClass();
  }

  Future<void> _loadReport() async {
    setState(() { _reportLoading = true; _reportError = null; });
    try {
      final records = await ApiService().getAcademicAttendanceMonthly(
        year: _year,
        month: _month,
        className: _reportClass,
      );
      if (!mounted) return;
      setState(() { _reportRecords = records; _reportLoading = false; });
    } catch (e) {
      if (mounted) setState(() { _reportError = e.toString(); _reportLoading = false; });
    }
  }

  String get _dateLabel => '${EthiopianDate.monthNames[_month - 1]} $_day, $_year';

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Material(
        color: Theme.of(context).appBarTheme.backgroundColor ?? Theme.of(context).cardColor,
        child: TabBar(controller: _tc, tabs: const [Tab(text: 'Attendance'), Tab(text: 'Report')]),
      ),
      Expanded(child: TabBarView(controller: _tc, children: [_buildDaily(), _buildReport()])),
    ]);
  }

  Widget _buildDaily() {
    final counts = {'P': 0, 'A': 0, 'L': 0, 'E': 0};
    for (final s in _students) {
      final code = _codeForDay(s, _day);
      if (counts.containsKey(code)) counts[code] = counts[code]! + 1;
    }
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
        child: Column(children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(children: [
                Row(children: [
                  IconButton(icon: const Icon(Icons.chevron_left), onPressed: () => _shiftMonth(-1)),
                  Expanded(
                    child: Column(children: [
                      Text('${EthiopianDate.monthNames[_month - 1]} $_year', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                      Text(_day == _today.day && _month == EthiopianDate.month && _year == EthiopianDate.year ? 'Today • $_dateLabel' : _dateLabel, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    ]),
                  ),
                  IconButton(icon: const Icon(Icons.chevron_right), onPressed: () => _shiftMonth(1)),
                  IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
                ]),
                const SizedBox(height: 8),
                SizedBox(
                  height: 66,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _daysInMonth,
                    itemBuilder: (context, i) {
                      final d = i + 1;
                      final isSelected = d == _day;
                      int p = 0, a = 0, l = 0;
                      for (final s in _students) {
                        final c = _codeForDay(s, d);
                        if (c == 'P') p++;
                        if (c == 'A') a++;
                        if (c == 'L') l++;
                      }
                      return GestureDetector(
                        onTap: () => setState(() => _day = d),
                        child: Container(
                          width: 48,
                          margin: const EdgeInsets.only(right: 6),
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          decoration: BoxDecoration(
                            color: isSelected ? AppColors.primary : AppColors.primary.withOpacity(0.06),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                            Text('$d', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: isSelected ? Colors.white : AppColors.primary)),
                            const SizedBox(height: 3),
                            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                              if (p > 0) _dot(AppColors.success),
                              if (a > 0) _dot(AppColors.danger),
                              if (l > 0) _dot(AppColors.warning),
                              if (p == 0 && a == 0 && l == 0) _dot(isSelected ? Colors.white54 : Colors.grey.shade300),
                            ]),
                            if (a > 0)
                              Text('A$a', style: TextStyle(fontSize: 8, color: isSelected ? Colors.white : AppColors.danger, fontWeight: FontWeight.bold))
                            else
                              const SizedBox(height: 9),
                          ]),
                        ),
                      );
                    },
                  ),
                ),
              ]),
            ),
          ),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(child: DropdownButtonFormField<String>(
              value: _className,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Class', isDense: true),
              items: _classes.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (v) { setState(() => _className = v); _loadClass(); },
            )),
            const SizedBox(width: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(color: AppColors.success.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.cloud_done, size: 16, color: AppColors.success),
                const SizedBox(width: 4),
                Text(_saving ? 'Saving…' : 'Auto-save', style: const TextStyle(fontSize: 12, color: AppColors.success, fontWeight: FontWeight.bold)),
              ]),
            ),
          ]),
          const SizedBox(height: 8),
          Row(children: [
            _pill('P', counts['P']!, AppColors.success),
            const SizedBox(width: 8),
            _pill('A', counts['A']!, AppColors.danger),
            const SizedBox(width: 8),
            _pill('L', counts['L']!, AppColors.warning),
            const SizedBox(width: 8),
            _pill('E', counts['E']!, AppColors.info),
            const Spacer(),
            Text('Total ${_students.length}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
          ]),
        ]),
      ),
      const SizedBox(height: 6),
      Expanded(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)))
                : _students.isEmpty
                    ? const Center(child: Text('No students in this class.'))
                    : RefreshIndicator(
                        onRefresh: _loadClass,
                        child: ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                          itemCount: _students.length,
                          itemBuilder: (context, i) {
                            final s = _students[i];
                            final code = _codeForDay(s, _day);
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                child: Row(children: [
                                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text('${s['student_name'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700)),
                                    Text('Class ID ${s['class_id'] ?? ''} • School ID ${_sid(s)}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                  ])),
                                  _statusButton('P', code, AppColors.success, () => _mark(s, 'P')),
                                  const SizedBox(width: 4),
                                  _statusButton('A', code, AppColors.danger, () => _mark(s, 'A')),
                                  const SizedBox(width: 4),
                                  _statusButton('L', code, AppColors.warning, () => _mark(s, 'L')),
                                  const SizedBox(width: 4),
                                  _statusButton('E', code, AppColors.info, () => _mark(s, 'E')),
                                ]),
                              ),
                            );
                          },
                        ),
                      ),
      ),
    ]);
  }

  Widget _dot(Color c) => Container(width: 5, height: 5, margin: const EdgeInsets.symmetric(horizontal: 1), decoration: BoxDecoration(color: c, shape: BoxShape.circle));

  Widget _buildReport() {
    final filtered = _period == 'week'
        ? _reportRecords.where((r) => (int.tryParse('${r['week_number'] ?? 0}') ?? 0) == _week).toList()
        : _reportRecords;
    final summary = <String, int>{'PRESENT': 0, 'ABSENT': 0, 'LATE': 0, 'LEAVE': 0, 'PERMISSION': 0};
    final perStudent = <String, Map<String, dynamic>>{};
    final perClass = <String, Map<String, int>>{};
    for (final r in filtered) {
      final status = '${r['status'] ?? ''}'.toUpperCase();
      if (status == 'PRESENT') summary['PRESENT'] = summary['PRESENT']! + 1;
      if (status == 'ABSENT') summary['ABSENT'] = summary['ABSENT']! + 1;
      if (status == 'LATE') summary['LATE'] = summary['LATE']! + 1;
      if (status == 'LEAVE' || status == 'PERMISSION') summary['LEAVE'] = summary['LEAVE']! + 1;
      final name = '${r['student_name'] ?? ''}';
      final cls = '${r['class_name'] ?? ''}';
      final key = '$name|$cls';
      final st = perStudent.putIfAbsent(key, () => {
            'student_name': name, 'class_name': cls,
            'present': 0, 'absent': 0, 'late': 0, 'leave': 0,
          });
      if (status == 'PRESENT') st['present'] = (st['present'] as int) + 1;
      if (status == 'ABSENT') st['absent'] = (st['absent'] as int) + 1;
      if (status == 'LATE') st['late'] = (st['late'] as int) + 1;
      if (status == 'LEAVE' || status == 'PERMISSION') st['leave'] = (st['leave'] as int) + 1;
      final cm = perClass.putIfAbsent(cls, () => {'present': 0, 'absent': 0, 'late': 0, 'leave': 0, 'total': 0});
      cm['total'] = cm['total']! + 1;
      if (status == 'PRESENT') cm['present'] = cm['present']! + 1;
      if (status == 'ABSENT') cm['absent'] = cm['absent']! + 1;
      if (status == 'LATE') cm['late'] = cm['late']! + 1;
      if (status == 'LEAVE' || status == 'PERMISSION') cm['leave'] = cm['leave']! + 1;
    }
    final students = perStudent.values.toList();
    List<Map<String, dynamic>> top(String key) {
      final copy = [...students]..sort((a, b) => (b[key] as int).compareTo(a[key] as int));
      return copy.where((e) => (e[key] as int) > 0).take(10).toList();
    }
    final total = summary.values.fold<int>(0, (a, b) => a + b);
    final rate = total == 0 ? 0 : (((summary['PRESENT']! + summary['LATE']!) / total) * 100).round();

    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
        child: Column(children: [
          Row(children: [
            Expanded(child: DropdownButtonFormField<String>(
              value: _reportClass ?? '__all__',
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Class', isDense: true),
              items: [
                const DropdownMenuItem<String>(value: '__all__', child: Text('All classes')),
                ..._classes.map((c) => DropdownMenuItem<String>(value: c, child: Text(c))),
              ],
              onChanged: (v) { setState(() => _reportClass = (v == '__all__' ? null : v)); _loadReport(); },
            )),
            const SizedBox(width: 8),
            SizedBox(
              width: 110,
              child: DropdownButtonFormField<String>(
                value: _period,
                decoration: const InputDecoration(labelText: 'Period', isDense: true),
                items: const [
                  DropdownMenuItem(value: 'month', child: Text('Month')),
                  DropdownMenuItem(value: 'week', child: Text('Week')),
                ],
                onChanged: (v) { setState(() => _period = v ?? 'month'); },
              ),
            ),
          ]),
          if (_period == 'week') ...[
            const SizedBox(height: 8),
            Row(children: [
              const Text('Week:', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(width: 8),
              ...List.generate(5, (i) => Padding(
                padding: const EdgeInsets.only(right: 6),
                child: ChoiceChip(
                  label: Text('${i + 1}'),
                  selected: _week == i + 1,
                  onSelected: (_) => setState(() => _week = i + 1),
                ),
              )),
            ]),
          ],
          const SizedBox(height: 8),
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.10), borderRadius: BorderRadius.circular(20)),
              child: Text('${EthiopianDate.monthNames[_month - 1]} $_year • ${_period == 'week' ? 'Week $_week' : 'Whole month'}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary)),
            ),
            const Spacer(),
            IconButton.filledTonal(onPressed: _loadReport, icon: const Icon(Icons.refresh, size: 18)),
          ]),
        ]),
      ),
      Expanded(
        child: _reportLoading
            ? const Center(child: CircularProgressIndicator())
            : _reportError != null
                ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_reportError!, textAlign: TextAlign.center)))
                : RefreshIndicator(
                    onRefresh: _loadReport,
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                      children: [
                        Wrap(spacing: 8, runSpacing: 8, children: [
                          _pill('Attendance', rate, AppColors.primary, suffix: '%'),
                          _pill('P', summary['PRESENT']!, AppColors.success),
                          _pill('A', summary['ABSENT']!, AppColors.danger),
                          _pill('L', summary['LATE']!, AppColors.warning),
                          _pill('E', summary['LEAVE']!, AppColors.info),
                          _pill('Total', total, Colors.blueGrey),
                        ]),
                        const SizedBox(height: 14),
                        _leader(title: 'Most absent', key: 'absent', color: AppColors.danger, list: top('absent')),
                        _leader(title: 'Most late', key: 'late', color: AppColors.warning, list: top('late')),
                        _leader(title: 'Most present', key: 'present', color: AppColors.success, list: top('present')),
                        _leader(title: 'Most permission', key: 'leave', color: AppColors.info, list: top('leave')),
                        if (_reportClass == null) ...[
                          const SizedBox(height: 14),
                          const Text('By class', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                          const SizedBox(height: 6),
                          ...(perClass.entries.toList()..sort((a, b) => a.key.compareTo(b.key))).map((e) {
                            final c = e.value;
                            final t = c['total']!;
                            final r = t == 0 ? 0 : (((c['present']! + c['late']!) / t) * 100).round();
                            return Card(
                              margin: const EdgeInsets.only(bottom: 6),
                              child: ListTile(
                                dense: true,
                                title: Text(e.key),
                                subtitle: Text('P ${c['present']} • A ${c['absent']} • L ${c['late']} • E ${c['leave']}'),
                                trailing: Text('$r%', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
                              ),
                            );
                          }),
                        ],
                      ],
                    ),
                  ),
      ),
    ]);
  }

  Widget _leader({required String title, required String key, required Color color, required List<Map<String, dynamic>> list}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
      const SizedBox(height: 6),
      if (list.isEmpty)
        const Card(child: Padding(padding: EdgeInsets.all(14), child: Text('No records.')))
      else
        ...list.map((e) => Card(
              margin: const EdgeInsets.only(bottom: 6),
              child: ListTile(
                dense: true,
                title: Text('${e['student_name']}'),
                subtitle: Text('${e['class_name']}'),
                trailing: Text('${e[key]}', style: TextStyle(fontWeight: FontWeight.bold, color: color)),
              ),
            )),
      const SizedBox(height: 8),
    ]);
  }

  Widget _pill(String label, int value, Color color, {String suffix = ''}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(20)),
      child: Text(label == 'P' || label == 'A' || label == 'L' || label == 'E' ? '$label $value' : '$label $value$suffix', style: TextStyle(color: color, fontWeight: FontWeight.bold)),
    );
  }

  Widget _statusButton(String label, String current, Color color, VoidCallback onTap) {
    final active = current == label;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 34,
        height: 34,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: active ? color : color.withOpacity(0.10),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(label, style: TextStyle(fontWeight: FontWeight.w900, color: active ? Colors.white : color)),
      ),
    );
  }
}
