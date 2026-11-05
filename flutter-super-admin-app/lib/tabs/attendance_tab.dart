import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api.dart';
import '../l10n.dart';
import '../tab_handle.dart';
import '../theme.dart';
import '../ui.dart';

const ethMonths = [
  'Meskerem',
  'Tikimt',
  'Hidar',
  'Tahsas',
  'Tir',
  'Yekatit',
  'Megabit',
  'Miazia',
  'Ginbot',
  'Sene',
  'Hamle',
  'Nehase',
  'Pagume',
];

class AttendanceTab extends StatefulWidget {
  const AttendanceTab({
    super.key,
    required this.branch,
    required this.active,
    required this.handle,
  });

  final String branch;
  final bool active;
  final TabHandle handle;

  @override
  State<AttendanceTab> createState() => _AttendanceTabState();
}

class _AttendanceTabState extends State<AttendanceTab> {
  bool _loaded = false;
  bool _loading = false;
  String? _error;
  Map<String, dynamic>? _data;

  int _viewMode = 0; // 0 month, 1 week, 2 date
  final _year = TextEditingController(text: '2019');
  String _month = '2';
  String _week = '1';
  final _day = TextEditingController();
  int _leader = 0; // absent, present, late, permission
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    widget.handle.refresh = _load;
    if (widget.active) _load();
  }

  @override
  void didUpdateWidget(covariant AttendanceTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.branch != widget.branch) {
      _loaded = false;
      if (widget.active) _load();
    } else if (!oldWidget.active && widget.active && !_loaded) {
      _load();
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _year.dispose();
    _day.dispose();
    super.dispose();
  }

  void _queueLoad() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 450), _load);
  }

  Future<void> _load() async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    final mode = _viewMode == 0 ? 'month' : (_viewMode == 1 ? 'week' : 'date');
    final res = await Api.getJson('/super-admin/report/attendance', params: {
      'branchCode': widget.branch,
      'viewMode': mode,
      'year': _year.text.trim(),
      'month': _month,
      if (mode == 'week') 'week': _week,
      if (mode == 'date') 'day': _day.text.trim(),
    });
    if (!mounted) return;
    setState(() {
      _data = res.data;
      _loading = false;
      _loaded = true;
      if (res.data == null) _error = 'Could not load attendance. Pull down to retry.';
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final a = _data;
    final rate = toNum(a?['grandRate']);
    final branches = activeBranches(a);
    final maxTotal = branches.fold<int>(1, (m, b) {
      final t = toNum(b['total']);
      return t.toInt() > m ? t.toInt() : m;
    });

    return TabScroll(
      onRefresh: _load,
      children: [
        Segmented(
          options: const ['Monthly', 'Weekly', 'Daily'],
          value: _viewMode,
          onChanged: (i) {
            setState(() => _viewMode = i);
            _load();
          },
        ),
        const SizedBox(height: 12),
        CardBox(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CardTitle(
                _viewMode == 0
                    ? 'Filter by Ethiopian Month'
                    : _viewMode == 1
                        ? 'Filter by Ethiopian Week'
                        : 'Filter by Ethiopian Date',
              ),
              Row(
                children: [
                  Expanded(
                    child: FilterField(
                      label: T.t('year'),
                      child: TextField(
                        controller: _year,
                        keyboardType: TextInputType.number,
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                        onChanged: (_) => _queueLoad(),
                        style: TextStyle(fontSize: 13, color: c.text),
                        decoration: const InputDecoration(hintText: '2019'),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilterField(
                      label: T.t('month'),
                      child: _dropdown(
                        c,
                        value: _month,
                        items: [
                          {'value': '', 'label': T.t('allMonths')},
                          for (var i = 0; i < ethMonths.length; i++)
                            {'value': '${i + 1}', 'label': ethMonths[i]},
                        ],
                        onChanged: (v) {
                          setState(() => _month = v ?? '');
                          _load();
                        },
                      ),
                    ),
                  ),
                  if (_viewMode == 1) ...[
                    const SizedBox(width: 8),
                    Expanded(
                      child: FilterField(
                        label: 'Week',
                        child: _dropdown(
                          c,
                          value: _week,
                          items: [
                            for (var i = 1; i <= 5; i++) {'value': '$i', 'label': 'Week $i'},
                          ],
                          onChanged: (v) {
                            setState(() => _week = v ?? '1');
                            _load();
                          },
                        ),
                      ),
                    ),
                  ],
                  if (_viewMode == 2) ...[
                    const SizedBox(width: 8),
                    Expanded(
                      child: FilterField(
                        label: 'Day',
                        child: TextField(
                          controller: _day,
                          keyboardType: TextInputType.number,
                          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                          onChanged: (_) => _queueLoad(),
                          style: TextStyle(fontSize: 13, color: c.text),
                          decoration: const InputDecoration(hintText: '1-30'),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
        if (_loading && !_loaded)
          const LoadingBox(text: 'Loading attendance...')
        else if (_error != null)
          CardBox(child: MessageBanner(_error!, isError: true))
        else ...[
          CardBox(
            child: Row(
              children: [
                SizedBox(
                  width: 108,
                  height: 108,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      SizedBox.expand(
                        child: CircularProgressIndicator(
                          value: (rate / 100).clamp(0.0, 1.0).toDouble(),
                          strokeWidth: 12,
                          strokeCap: StrokeCap.round,
                          backgroundColor: c.track,
                          valueColor: AlwaysStoppedAnimation(c.primaryDeep),
                        ),
                      ),
                      Text(
                        '${rate.round()}%',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: c.text,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    children: [
                      _legend(c, c.green, T.t('present'), fmt(a?['grandPresent'])),
                      _legend(c, c.amber, T.t('late'), fmt(a?['grandLate'])),
                      _legend(c, c.red, T.t('absent'), fmt(a?['grandAbsent'])),
                      _legend(c, c.blue, 'Permission', fmt(a?['grandPermission'])),
                      _legend(c, c.muted, 'Records', fmt(a?['grandTotal'])),
                    ],
                  ),
                ),
              ],
            ),
          ),
          SectionTitle(T.t('byBranch')),
          if (branches.isEmpty)
            CardBox(child: EmptyBox(T.t('noBranchData')))
          else
            for (final b in branches) _branchCard(c, b, maxTotal),
        ],
      ],
    );
  }

  Widget _legend(AppColors c, Color color, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Container(width: 9, height: 9, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 7),
          Expanded(child: Text(label, style: TextStyle(fontSize: 11.5, color: c.muted))),
          Text(value, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: c.text)),
        ],
      ),
    );
  }

  Widget _dropdown(
    AppColors c, {
    required String value,
    required List<Map<String, String>> items,
    required ValueChanged<String?> onChanged,
  }) {
    final safe = items.any((i) => i['value'] == value) ? value : items.first['value']!;
    return Container(
      height: 46,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: c.input,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: c.line),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: safe,
          isExpanded: true,
          dropdownColor: c.card,
          icon: Icon(Icons.expand_more_rounded, size: 18, color: c.muted),
          style: TextStyle(fontSize: 12.5, color: c.text),
          items: items
              .map((i) => DropdownMenuItem(
                    value: i['value'],
                    child: Text(i['label']!, overflow: TextOverflow.ellipsis),
                  ))
              .toList(),
          onChanged: onChanged,
        ),
      ),
    );
  }

  Widget _branchCard(AppColors c, Map<String, dynamic> b, int maxTotal) {
    final classes = mapList(b['classes']).where((x) => (toNum(x['total'])) > 0).toList();
    final leaderboards = b['leaderboards'];
    final keys = ['mostAbsent', 'mostPresent', 'mostLate', 'mostPermission'];
    final leaderKey = keys[_leader];
    List<Map<String, dynamic>> leaders = [];
    if (leaderboards is Map) leaders = mapList(leaderboards[leaderKey]);
    if (leaders.isEmpty) leaders = mapList(b[leaderKey]);

    final countLabel = ['Days Absent', 'Days Present', 'Times Late', 'Leaves'][_leader];
    final total = toNum(b['total']);

    return CardBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${b['branchName']} — ${b['rate']}% Attendance Rate',
            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: c.text),
          ),
          const SizedBox(height: 3),
          Text(
            '${fmt(b['total'])} records · P: ${fmt(b['present'])} · L: ${fmt(b['late'])} · A: ${fmt(b['absent'])} · Perm: ${fmt(b['permission'])}',
            style: TextStyle(fontSize: 10.5, color: c.muted),
          ),
          const SizedBox(height: 10),
          BarTrack(value: maxTotal == 0 ? 0.0 : total / maxTotal),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(11),
            decoration: BoxDecoration(
              color: c.input,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: c.line),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Student Leaderboards',
                  style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: c.text),
                ),
                const SizedBox(height: 8),
                PillTabs(
                  options: const ['Most Absent', 'Most Present', 'Most Late', 'Permission'],
                  value: _leader,
                  onChanged: (i) => setState(() => _leader = i),
                ),
                const SizedBox(height: 8),
                if (leaders.isEmpty)
                  EmptyBox('No records for this category')
                else
                  DataTableX(
                    headers: ['#', 'Student Name', T.t('class'), countLabel],
                    columnSpacing: 12,
                    rows: List.generate(leaders.length, (i) {
                      final s = leaders[i];
                      return [
                        cellText('#${i + 1}', color: c.muted),
                        cellText(s['student_name'], bold: true),
                        Pill((s['class_name'] ?? '—').toString()),
                        cellText(
                          s['count'],
                          bold: true,
                          color: _leader == 0
                              ? c.red
                              : _leader == 1
                                  ? c.green
                                  : _leader == 2
                                      ? c.amber
                                      : c.blue,
                        ),
                      ];
                    }),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Class-by-Class Summary',
            style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: c.text),
          ),
          const SizedBox(height: 6),
          if (classes.isEmpty)
            EmptyBox(T.t('noAttendance'))
          else
            DataTableX(
              headers: [
                T.t('class'),
                T.t('present'),
                T.t('late'),
                T.t('absent'),
                'Perm',
                T.t('total'),
                T.t('rate'),
              ],
              columnSpacing: 13,
              rows: classes.map((cls) {
                final r = toNum(cls['rate']);
                return [
                  cellText(cls['className'], bold: true),
                  cellText(fmt(cls['present']), color: c.green),
                  cellText(fmt(cls['late']), color: c.amber),
                  cellText(fmt(cls['absent']), color: c.red),
                  cellText(fmt(cls['permission']), color: c.blue),
                  cellText(fmt(cls['total']), bold: true),
                  Pill('${r.round()}%', color: r >= 80 ? c.green : c.red),
                ];
              }).toList(),
            ),
        ],
      ),
    );
  }
}
