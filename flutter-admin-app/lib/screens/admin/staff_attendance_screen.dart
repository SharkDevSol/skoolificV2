import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../app/app_provider.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/ethiopian_date.dart';

class StaffAttendanceScreen extends StatefulWidget {
  const StaffAttendanceScreen({super.key});
  @override
  State<StaffAttendanceScreen> createState() => _StaffAttendanceScreenState();
}

class _StaffAttendanceScreenState extends State<StaffAttendanceScreen> with SingleTickerProviderStateMixin {
  final _types = ['Teachers', 'Administrative Staff', 'Supportive Staff'];
  late final TabController _tc;
  List<Map<String, dynamic>> _staff = [];
  Map<String, Map<int, Map<String, dynamic>>> _records = {};
  EthDate _today = EthiopianDate.fromGregorian(DateTime.now());
  int _day = EthiopianDate.fromGregorian(DateTime.now()).day;
  bool _loading = true;
  String? _error;
  String _query = '';

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

  int get _year => _today.year;
  int get _month => _today.month;
  int get _daysInMonth => _month == 13 ? 5 : 30;

  String _globalId(Map<String, dynamic> s) =>
      '${s['global_staff_id'] ?? s['staff_id'] ?? s['id'] ?? ''}';

  String _machineId(Map<String, dynamic> s) => '${s['machine_id'] ?? ''}';

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final all = <Map<String, dynamic>>[];
      final seen = <String>{};
      for (final type in _types) {
        final classes = await ApiService().getStaffClasses(type);
        for (final cls in classes) {
          try {
            final rows = await ApiService().getStaffData(type, cls);
            for (final r in rows) {
              final id = _globalId(r);
              final key = id.isNotEmpty ? id : '${r['full_name'] ?? r['name']}';
              if (seen.add(key)) {
                r['class_name'] = r['class_name'] ?? cls;
                all.add(r);
              }
            }
          } catch (_) {}
        }
      }
      final records = await ApiService().getEthiopianAttendance(_month, _year);
      final map = <String, Map<int, Map<String, dynamic>>>{};
      for (final r in records) {
        final sid = '${r['staff_id'] ?? r['staffId'] ?? r['global_staff_id'] ?? ''}';
        final day = int.tryParse('${r['ethiopian_day'] ?? r['eth_day'] ?? r['day'] ?? 0}') ?? 0;
        if (sid.isEmpty || day == 0) continue;
        map.putIfAbsent(sid, () => {})[day] = r;
      }
      if (!mounted) return;
      setState(() { _staff = all; _records = map; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Map<String, dynamic>? _record(Map<String, dynamic> s, int day) {
    for (final key in [_machineId(s), _globalId(s), '${s['full_name'] ?? s['name'] ?? ''}']) {
      if (key.isEmpty) continue;
      final r = _records[key]?[day];
      if (r != null) return r;
    }
    return null;
  }

  String _code(String raw) {
    final s = raw.toUpperCase().trim();
    if (s == 'PRESENT' || s == 'P') return 'P';
    if (s == 'ABSENT' || s == 'A') return 'A';
    if (s == 'LATE' || s == 'L') return 'L';
    if (s == 'HALF_DAY' || s == 'HALF DAY' || s == 'H') return 'H';
    if (s == 'LEAVE' || s == 'PERMISSION' || s == 'V') return 'V';
    if (s == '*' || s.contains('WITHOUT CHECK OUT')) {
      if (s.contains('LATE')) return 'L*';
      if (s.contains('HALF')) return 'H*';
      return 'P*';
    }
    if (s.contains('LATE') && s.contains('HALF')) return 'L+H';
    return '';
  }

  Color _color(String code) {
    if (code.startsWith('P')) return AppColors.success;
    if (code.startsWith('A')) return AppColors.danger;
    if (code.startsWith('L')) return AppColors.warning;
    if (code.startsWith('H')) return AppColors.info;
    if (code.startsWith('V')) return Colors.purple;
    return Colors.grey;
  }

  String _time(dynamic raw) {
    final s = '${raw ?? ''}';
    if (s.isEmpty || s == 'null') return '';
    if (s.length >= 5) return s.substring(0, 5);
    return s;
  }

  Future<void> _shiftMonth(int delta) async {
    var m = _month + delta;
    var y = _year;
    if (m < 1) { m = 13; y -= 1; }
    if (m > 13) { m = 1; y += 1; }
    setState(() { _today = EthDate(y, m, 1); _day = 1; });
    await _load();
  }

  bool _hasIn(Map<String, dynamic>? rec) {
    final t = _time(rec?['check_in']);
    return t.isNotEmpty && t != '00:00';
  }

  bool _hasOut(Map<String, dynamic>? rec) {
    final t = _time(rec?['check_out']);
    return t.isNotEmpty && t != '00:00';
  }

  String _staffKey(Map<String, dynamic> s, Map<String, dynamic>? rec) {
    final existing = '${rec?['staff_id'] ?? ''}';
    if (existing.isNotEmpty) return existing;
    if (_machineId(s).isNotEmpty) return _machineId(s);
    if (_globalId(s).isNotEmpty) return _globalId(s);
    return '${s['full_name'] ?? s['name'] ?? ''}';
  }

  /// One button per row: first tap saves check-in, second tap saves check-out.
  /// After both times exist the button disappears (edit the times by tapping
  /// the saved times). The backend derives late / half-day / no-out from them.
  Future<void> _punch(Map<String, dynamic> s) async {
    final existing = _record(s, _day);
    if (_hasOut(existing)) return;
    final app = Provider.of<AppProvider>(context, listen: false);
    final now = _fmt(TimeOfDay.now());
    final alreadyIn = _hasIn(existing);
    final checkIn = alreadyIn ? _time(existing!['check_in']) : now;
    final checkOut = alreadyIn ? now : null;

    final err = await ApiService().saveStaffAttendance(
      staffId: _staffKey(s, existing),
      staffName: '${s['full_name'] ?? s['name'] ?? ''}',
      ethMonth: _month,
      ethYear: _year,
      ethDay: _day,
      // '*' keeps an open record visible in the report as "no check-out";
      // an empty status lets the server compute PRESENT / LATE / HALF_DAY
      // from the saved times, so the monthly report uses them.
      statusCode: alreadyIn ? '' : '*',
      checkIn: checkIn,
      checkOut: checkOut,
      shiftType: '${s['shift_assignment'] ?? ''}',
      createdBy: app.user?.name ?? 'Admin',
    );
    if (!mounted) return;
    if (err == null) await _reloadRecords();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(err ?? (alreadyIn ? 'Check-out saved ${_time(checkOut)}' : 'Check-in saved ${_time(checkIn)}')),
      backgroundColor: err == null ? AppColors.success : AppColors.danger,
    ));
  }

  Future<void> _reloadRecords() async {
    try {
      final records = await ApiService().getEthiopianAttendance(_month, _year);
      final map = <String, Map<int, Map<String, dynamic>>>{};
      for (final r in records) {
        final sid = '${r['staff_id'] ?? r['staffId'] ?? r['global_staff_id'] ?? ''}';
        final day = int.tryParse('${r['ethiopian_day'] ?? r['eth_day'] ?? r['day'] ?? 0}') ?? 0;
        if (sid.isEmpty || day == 0) continue;
        map.putIfAbsent(sid, () => {})[day] = r;
      }
      if (mounted) setState(() => _records = map);
    } catch (_) {}
  }

  /// Tap the saved times to edit them with the "Set time" picker.
  Future<void> _editTimes(Map<String, dynamic> s) async {
    final existing = _record(s, _day);
    TimeOfDay? checkIn = _parseTime('${existing?['check_in'] ?? ''}');
    TimeOfDay? checkOut = _parseTime('${existing?['check_out'] ?? ''}');
    bool saving = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheet) {
        Future<void> pick(bool isIn) async {
          final t = await showTimePicker(
            context: ctx,
            initialTime: (isIn ? checkIn : checkOut) ?? (isIn ? const TimeOfDay(hour: 8, minute: 0) : const TimeOfDay(hour: 17, minute: 0)),
          );
          if (t == null) return;
          setSheet(() { if (isIn) checkIn = t; else checkOut = t; });
        }

        Future<void> save() async {
          if (saving) return;
          setSheet(() => saving = true);
          final app = Provider.of<AppProvider>(context, listen: false);
          final now = _fmt(TimeOfDay.now());
          final inValue = checkIn == null ? now : _fmt(checkIn!);
          final outValue = checkOut == null ? null : _fmt(checkOut!);
          final err = await ApiService().saveStaffAttendance(
            staffId: _staffKey(s, existing),
            staffName: '${s['full_name'] ?? s['name'] ?? ''}',
            ethMonth: _month,
            ethYear: _year,
            ethDay: _day,
            statusCode: checkOut == null ? '*' : '',
            checkIn: inValue,
            checkOut: outValue,
            shiftType: '${s['shift_assignment'] ?? ''}',
            createdBy: app.user?.name ?? 'Admin',
          );
          setSheet(() => saving = false);
          if (!ctx.mounted) return;
          Navigator.pop(ctx);
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(err ?? 'Times saved'),
            backgroundColor: err == null ? AppColors.success : AppColors.danger,
          ));
          if (err == null) await _reloadRecords();
        }

        return Padding(
          padding: EdgeInsets.fromLTRB(20, 0, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${s['full_name'] ?? s['name'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
              const SizedBox(height: 2),
              Text('${_today.monthName} $_day, $_year • ${s['class_name'] ?? ''}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
              const SizedBox(height: 16),
              const Text('Set time', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Row(children: [
                Expanded(child: OutlinedButton.icon(
                  onPressed: saving ? null : () => pick(true),
                  icon: const Icon(Icons.login),
                  label: Text('Check-in ${checkIn == null ? '--:--' : _time(_fmt(checkIn!))}'),
                )),
                const SizedBox(width: 8),
                Expanded(child: OutlinedButton.icon(
                  onPressed: saving ? null : () => pick(false),
                  icon: const Icon(Icons.logout),
                  label: Text('Check-out ${checkOut == null ? '--:--' : _time(_fmt(checkOut!))}'),
                )),
              ]),
              const SizedBox(height: 6),
              const Text(
                'Leave check-out empty when the staff member is still working. The monthly report uses these times.',
                style: TextStyle(fontSize: 11, color: Colors.grey),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: saving ? null : save,
                  icon: saving
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.save),
                  label: const Text('Save times'),
                ),
              ),
            ]),
          ),
        );
      }),
    );
  }

  TimeOfDay? _parseTime(String raw) {
    final m = RegExp(r'(\d{1,2}):(\d{2})').firstMatch(raw);
    if (m == null) return null;
    final h = int.tryParse(m.group(1)!);
    final min = int.tryParse(m.group(2)!);
    if (h == null || min == null) return null;
    if (h == 0 && min == 0) return null;
    return TimeOfDay(hour: h, minute: min);
  }

  String _fmt(TimeOfDay t) => '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}:00';

  List<Map<String, dynamic>> get _filtered {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return _staff;
    return _staff.where((s) => '${s['full_name']} ${s['name']} ${s['class_name']} ${s['staff_type']}'.toLowerCase().contains(q)).toList();
  }

  Map<String, int> _countsFor(String staffName, {int? day}) {
    final counts = {'P': 0, 'A': 0, 'L': 0, 'H': 0, 'V': 0, 'N': 0};
    for (final days in _records.values) {
      for (final e in days.entries) {
        if (day != null && e.key != day) continue;
        final name = '${e.value['staff_name'] ?? ''}';
        if (name.toLowerCase() != staffName.toLowerCase()) continue;
        final c = _code('${e.value['status'] ?? ''}');
        if (c.startsWith('P')) counts['P'] = counts['P']! + 1;
        else if (c.startsWith('A')) counts['A'] = counts['A']! + 1;
        else if (c.startsWith('L')) counts['L'] = counts['L']! + 1;
        else if (c.startsWith('H')) counts['H'] = counts['H']! + 1;
        else if (c.startsWith('V')) counts['V'] = counts['V']! + 1;
        if (c.endsWith('*')) counts['N'] = counts['N']! + 1;
      }
    }
    return counts;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Staff Attendance • ${_today.monthName} $_day, $_year'),
        bottom: TabBar(controller: _tc, tabs: const [Tab(text: 'Daily'), Tab(text: 'Report')]),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)))
              : TabBarView(controller: _tc, children: [_buildDaily(), _buildReport()]),
    );
  }

  Widget _buildDaily() {
    final list = _filtered;
    int p = 0, a = 0, l = 0, h = 0, v = 0;
    for (final s in list) {
      final c = _code('${_record(s, _day)?['status'] ?? ''}');
      if (c.startsWith('P')) p++;
      if (c.startsWith('A')) a++;
      if (c.startsWith('L')) l++;
      if (c.startsWith('H')) h++;
      if (c.startsWith('V')) v++;
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
                      Text('${_today.monthName} $_year', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                      Text('${EthiopianDate.monthNames[_month - 1]} $_day, $_year', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    ]),
                  ),
                  IconButton(icon: const Icon(Icons.chevron_right), onPressed: () => _shiftMonth(1)),
                  IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
                ]),
                const SizedBox(height: 8),
                SizedBox(
                  height: 58,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _daysInMonth,
                    itemBuilder: (context, i) {
                      final d = i + 1;
                      final selected = d == _day;
                      int marks = 0;
                      for (final s in _staff) {
                        if (_record(s, d) != null) marks++;
                      }
                      return GestureDetector(
                        onTap: () => setState(() => _day = d),
                        child: Container(
                          width: 46,
                          margin: const EdgeInsets.only(right: 6),
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          decoration: BoxDecoration(
                            color: selected ? AppColors.primary : AppColors.primary.withOpacity(0.06),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                            Text('$d', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: selected ? Colors.white : AppColors.primary)),
                            Text(marks > 0 ? '$marks✓' : '—', style: TextStyle(fontSize: 9, color: selected ? Colors.white70 : Colors.grey, fontWeight: FontWeight.bold)),
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
            _pill('P', p, AppColors.success),
            const SizedBox(width: 6),
            _pill('A', a, AppColors.danger),
            const SizedBox(width: 6),
            _pill('L', l, AppColors.warning),
            const SizedBox(width: 6),
            _pill('H', h, AppColors.info),
            const SizedBox(width: 6),
            _pill('V', v, Colors.purple),
            const Spacer(),
            Text('Total ${list.length}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
          ]),
          const SizedBox(height: 8),
          TextField(
            decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search staff / class', isDense: true),
            onChanged: (v) => setState(() => _query = v),
          ),
        ]),
      ),
      const SizedBox(height: 8),
      Expanded(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
            itemCount: list.length,
            itemBuilder: (context, i) {
              final s = list[i];
              final rec = _record(s, _day);
              final code = _code('${rec?['status'] ?? ''}');
              final counts = _countsFor('${s['full_name'] ?? s['name'] ?? ''}');
              final hasIn = _hasIn(rec);
              final hasOut = _hasOut(rec);
              final done = hasIn && hasOut;
              final inText = hasIn ? _time(rec!['check_in']) : '--:--';
              final outText = hasOut ? _time(rec!['check_out']) : '--:--';
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      CircleAvatar(
                        radius: 18,
                        backgroundColor: (code.isEmpty ? Colors.grey : _color(code)).withOpacity(0.12),
                        child: Text(code.isEmpty ? '—' : code, style: TextStyle(fontWeight: FontWeight.w900, color: code.isEmpty ? Colors.grey : _color(code), fontSize: 11)),
                      ),
                      const SizedBox(width: 10),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('${s['full_name'] ?? s['name'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700)),
                        Text('${s['class_name'] ?? ''}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                        const SizedBox(height: 2),
                        InkWell(
                          onTap: rec == null ? null : () => _editTimes(s),
                          borderRadius: BorderRadius.circular(6),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 2),
                            child: Row(mainAxisSize: MainAxisSize.min, children: [
                              Icon(Icons.schedule, size: 12, color: Theme.of(context).colorScheme.primary),
                              const SizedBox(width: 4),
                              Text(
                                '$inText  →  $outText',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Theme.of(context).textTheme.bodyLarge?.color,
                                  decoration: rec == null ? TextDecoration.none : TextDecoration.underline,
                                  decorationStyle: TextDecorationStyle.dotted,
                                ),
                              ),
                            ]),
                          ),
                        ),
                      ])),
                      if (!done)
                        IconButton.filledTonal(
                          icon: const Icon(Icons.edit, size: 20),
                          tooltip: hasIn ? 'Check out' : 'Check in',
                          onPressed: () => _punch(s),
                        ),
                    ]),
                    Padding(
                      padding: const EdgeInsets.only(left: 46, bottom: 2),
                      child: Text('Month: P ${counts['P']} • A ${counts['A']} • L ${counts['L']} • H ${counts['H']} • V ${counts['V']}', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                    ),
                  ]),
                ),
              );
            },
          ),
        ),
      ),
    ]);
  }

  Widget _buildReport() {
    final perStaff = <String, Map<String, int>>{};
    final summary = {'P': 0, 'A': 0, 'L': 0, 'H': 0, 'V': 0, 'N': 0};
    for (final days in _records.values) {
      for (final e in days.entries) {
        final name = '${e.value['staff_name'] ?? ''}';
        if (name.isEmpty) continue;
        final c = _code('${e.value['status'] ?? ''}');
        final row = perStaff.putIfAbsent(name, () => {'P': 0, 'A': 0, 'L': 0, 'H': 0, 'V': 0, 'N': 0});
        if (c.startsWith('P')) { row['P'] = row['P']! + 1; summary['P'] = summary['P']! + 1; }
        if (c.startsWith('A')) { row['A'] = row['A']! + 1; summary['A'] = summary['A']! + 1; }
        if (c.startsWith('L')) { row['L'] = row['L']! + 1; summary['L'] = summary['L']! + 1; }
        if (c.startsWith('H')) { row['H'] = row['H']! + 1; summary['H'] = summary['H']! + 1; }
        if (c.startsWith('V')) { row['V'] = row['V']! + 1; summary['V'] = summary['V']! + 1; }
        if (c.endsWith('*')) { row['N'] = row['N']! + 1; summary['N'] = summary['N']! + 1; }
      }
    }
    final rows = perStaff.entries.toList()
      ..sort((a, b) => (b.value['A']! + b.value['L']!).compareTo(a.value['A']! + a.value['L']!));
    final total = summary.values.take(5).fold<int>(0, (a, b) => a + b);
    final rate = total == 0 ? 0 : (((summary['P']! + summary['L']!) / total) * 100).round();
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('${_today.monthName} $_year attendance report', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 4),
          const Text('Monthly totals for all staff. Tap Daily to change a day.', style: TextStyle(fontSize: 12, color: Colors.grey)),
          const SizedBox(height: 10),
          Wrap(spacing: 8, runSpacing: 8, children: [
            _pill('Attendance', rate, AppColors.primary, suffix: '%'),
            _pill('P', summary['P']!, AppColors.success),
            _pill('A', summary['A']!, AppColors.danger),
            _pill('L', summary['L']!, AppColors.warning),
            _pill('H', summary['H']!, AppColors.info),
            _pill('V', summary['V']!, Colors.purple),
            _pill('No-out', summary['N']!, Colors.blueGrey),
          ]),
          const SizedBox(height: 16),
          const Text('Staff totals', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
          const SizedBox(height: 6),
          if (rows.isEmpty)
            const Card(child: Padding(padding: EdgeInsets.all(20), child: Text('No attendance records for this month.')))
          else
            ...rows.map((e) {
              final c = e.value;
              return Card(
                margin: const EdgeInsets.only(bottom: 6),
                child: ListTile(
                  dense: true,
                  title: Text(e.key),
                  subtitle: Text('P ${c['P']} • A ${c['A']} • L ${c['L']} • H ${c['H']} • V ${c['V']} • No-out ${c['N']}'),
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _pill(String label, int value, Color color, {String suffix = ''}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(20)),
      child: Text(
        ['P', 'A', 'L', 'H', 'V'].contains(label) ? '$label $value' : '$label $value$suffix',
        style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12),
      ),
    );
  }
}
