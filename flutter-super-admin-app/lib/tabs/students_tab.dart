import 'package:flutter/material.dart';

import '../api.dart';
import '../l10n.dart';
import '../tab_handle.dart';
import '../theme.dart';
import '../ui.dart';

class StudentsTab extends StatefulWidget {
  const StudentsTab({
    super.key,
    required this.branch,
    required this.active,
    required this.handle,
  });

  final String branch;
  final bool active;
  final TabHandle handle;

  @override
  State<StudentsTab> createState() => _StudentsTabState();
}

class _StudentsTabState extends State<StudentsTab> {
  bool _loaded = false;
  bool _loading = false;
  String? _error;
  Map<String, dynamic>? _students;
  Map<String, dynamic>? _registrations;

  late DateTime _from = DateTime.now();
  late DateTime _to = DateTime.now();

  @override
  void initState() {
    super.initState();
    widget.handle.refresh = _load;
    if (widget.active) _load();
  }

  @override
  void didUpdateWidget(covariant StudentsTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.branch != widget.branch) {
      _loaded = false;
      if (widget.active) _load();
    } else if (!oldWidget.active && widget.active && !_loaded) {
      _load();
    }
  }

  String _date(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Future<void> _load() async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    final results = await Future.wait([
      Api.getJson('/super-admin/report/students', params: {'branchCode': widget.branch}),
      Api.getJson('/super-admin/report/registrations', params: {
        'branchCode': widget.branch,
        'from': _date(_from),
        'to': _date(_to),
      }),
    ]);
    if (!mounted) return;
    setState(() {
      _students = results[0].data;
      _registrations = results[1].data;
      _loading = false;
      _loaded = true;
      if (_students == null) _error = 'Could not load student reports. Pull down to retry.';
    });
  }

  Future<void> _pickDate(bool isFrom) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isFrom ? _from : _to,
      firstDate: DateTime(2015),
      lastDate: DateTime(2100),
    );
    if (picked == null) return;
    setState(() {
      if (isFrom) {
        _from = picked;
        if (_to.isBefore(picked)) _to = picked;
      } else {
        _to = picked;
        if (_from.isAfter(picked)) _from = picked;
      }
    });
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final stuBranches = activeBranches(_students);
    final regBranches = activeBranches(_registrations);
    final added = <Map<String, dynamic>>[];
    for (final b in regBranches) {
      for (final s in mapList(b['added'])) {
        added.add({...s, 'branchCode': b['branchCode'], 'branchName': b['branchName']});
      }
    }

    return TabScroll(
      onRefresh: _load,
      children: [
        if (_loading && !_loaded)
          const LoadingBox(text: 'Loading students...')
        else if (_error != null)
          CardBox(child: MessageBanner(_error!, isError: true))
        else ...[
          HeroCard(
            label: T.t('totalStudents'),
            value: fmt(_students?['grandTotal']),
            sub:
                '${fmt(_students?['grandMale'])} ${T.t('boys')} · ${fmt(_students?['grandFemale'])} ${T.t('girls')}',
          ),
          StatGrid(
            children: [
              StatCard(
                label: T.t('newStudents'),
                value: fmt(_registrations?['grandNew']),
                valueColor: c.primary,
              ),
              StatCard(
                label: T.t('oldStudents'),
                value: fmt(_registrations?['grandOld']),
                valueColor: c.gold,
              ),
              StatCard(
                label: T.t('addedToday'),
                value: fmt(_registrations?['grandAddedToday']),
                valueColor: c.gold,
              ),
            ],
          ),
          SectionTitle(T.t('addedByDate')),
          CardBox(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CardTitle(T.t('addedByDateTitle')),
                Row(
                  children: [
                    Expanded(
                      child: FilterField(
                        label: T.t('from'),
                        child: _dateButton(c, isFrom: true),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: FilterField(
                        label: T.t('to'),
                        child: _dateButton(c, isFrom: false),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [c.primaryDeep, c.primary]),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'STUDENTS ADDED',
                        style: TextStyle(
                          color: Color(0xFFFFD9A0),
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        fmt(_registrations?['grandAdded']),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${fmt(added.where((s) => s['type'] == 'new').length)} ${T.t('newStudents')} · ${fmt(added.where((s) => s['type'] == 'old').length)} ${T.t('oldStudents')}',
                        style: const TextStyle(color: Color(0xFFFFE7C2), fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          CardBox(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CardTitle('${T.t('studentsAdded')} (${added.length})'),
                if (added.isEmpty)
                  EmptyBox(T.t('noStudentsAdded'))
                else
                  DataTableX(
                    headers: [
                      T.t('student'),
                      T.t('class'),
                      T.t('branch'),
                      T.t('typeWord'),
                    ],
                    rows: added
                        .map(
                          (s) => [
                            cellText(s['studentName'], bold: true),
                            cellText(s['className']),
                            cellText(s['branchCode']),
                            cellText(
                              s['type'] == 'new'
                                  ? T.t('newStudents')
                                  : s['type'] == 'old'
                                      ? T.t('oldStudents')
                                      : '—',
                              bold: true,
                            ),
                          ],
                        )
                        .toList(),
                  ),
              ],
            ),
          ),
          SectionTitle(T.t('studentsTitle')),
          CardBox(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Text(
              T.t('perBranchDetail'),
              style: TextStyle(fontSize: 12, color: c.muted),
            ),
          ),
          if (stuBranches.isEmpty)
            CardBox(child: EmptyBox(T.t('noBranchData')))
          else
            for (final b in stuBranches) ...[
              _branchCard(c, b, regBranches),
            ],
        ],
      ],
    );
  }

  Widget _dateButton(AppColors c, {required bool isFrom}) {
    final d = isFrom ? _from : _to;
    return InkWell(
      onTap: () => _pickDate(isFrom),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 46,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: c.input,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: c.line),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                _date(d),
                style: TextStyle(fontSize: 12.5, color: c.text),
              ),
            ),
            Icon(Icons.calendar_month_rounded, size: 17, color: c.muted),
          ],
        ),
      ),
    );
  }

  Widget _branchCard(
    AppColors c,
    Map<String, dynamic> b,
    List<Map<String, dynamic>> regBranches,
  ) {
    final code = b['branchCode'].toString();
    final rbs = regBranches.where((x) => x['branchCode'] == code).toList();
    final rb = rbs.isEmpty ? null : rbs.first;
    final classes = mapList(b['classes']).where((x) => (x['students'] ?? 0) > 0).toList();

    return CardBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${b['branchName']} ($code) — ${fmt(b['total'])} ${T.t('studentsCount')} · ${T.t('newStudents')} ${fmt(rb?['newCount'])} / ${T.t('oldStudents')} ${fmt(rb?['oldCount'])}',
            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: c.text),
          ),
          const SizedBox(height: 8),
          if (classes.isEmpty)
            EmptyBox(T.t('noClasses'))
          else
            DataTableX(
              headers: [
                T.t('class'),
                T.t('newStudents'),
                T.t('oldStudents'),
                T.t('total'),
              ],
              rows: classes.map((cls) {
                final rc = mapList(rb?['classes'])
                    .where((x) => x['className'] == cls['className'])
                    .toList();
                final r = rc.isEmpty ? null : rc.first;
                return [
                  cellText(cls['className'], bold: true),
                  cellText(fmt(r?['newCount'])),
                  cellText(fmt(r?['oldCount'])),
                  cellText(fmt(cls['students']), bold: true),
                ];
              }).toList(),
            ),
        ],
      ),
    );
  }
}
