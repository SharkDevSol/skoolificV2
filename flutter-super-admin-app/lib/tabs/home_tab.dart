import 'package:flutter/material.dart';

import '../api.dart';
import '../l10n.dart';
import '../tab_handle.dart';
import '../theme.dart';
import '../ui.dart';

class HomeTab extends StatefulWidget {
  const HomeTab({
    super.key,
    required this.branch,
    required this.active,
    required this.handle,
  });

  final String branch;
  final bool active;
  final TabHandle handle;

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  bool _loaded = false;
  bool _loading = false;
  String? _error;
  Map<String, dynamic>? _students;
  Map<String, dynamic>? _attendance;
  Map<String, dynamic>? _finance;
  Map<String, dynamic>? _faults;

  @override
  void initState() {
    super.initState();
    widget.handle.refresh = _load;
    if (widget.active) _load();
  }

  @override
  void didUpdateWidget(covariant HomeTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.branch != widget.branch) {
      _loaded = false;
      if (widget.active) _load();
    } else if (!oldWidget.active && widget.active && !_loaded) {
      _load();
    }
  }

  Future<void> _load() async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    final results = await Future.wait([
      Api.getJson('/super-admin/report/students', params: {'branchCode': widget.branch}),
      Api.getJson('/super-admin/report/attendance', params: {
        'branchCode': widget.branch,
        'viewMode': 'month',
        'year': '2019',
        'month': '2',
      }),
      Api.getJson('/super-admin/report/finance', params: {'branchCode': widget.branch}),
      Api.getJson('/super-admin/report/faults', params: {'branchCode': widget.branch}),
    ]);
    if (!mounted) return;
    setState(() {
      _students = results[0].data;
      _attendance = results[1].data;
      _finance = results[2].data;
      _faults = results[3].data;
      _loading = false;
      _loaded = true;
      if (_students == null) _error = 'Could not load the reports. Pull down to retry.';
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final stuBranches = activeBranches(_students);
    final finBranches = activeBranches(_finance);
    final attBranches = activeBranches(_attendance);

    return TabScroll(
      onRefresh: _load,
      children: [
        if (_loading && !_loaded)
          const LoadingBox(text: 'Loading reports...')
        else if (_error != null)
          CardBox(child: MessageBanner(_error!, isError: true))
        else ...[
          HeroCard(
            label: T.t('totalStudents'),
            value: fmt(_students?['grandTotal']),
            sub:
                '${fmt(_students?['grandMale'])} ${T.t('boys')} · ${fmt(_students?['grandFemale'])} ${T.t('girls')} · ${T.t('across')} ${stuBranches.length} ${T.t('branchesWord')}',
          ),
          StatGrid(
            children: [
              StatCard(
                label: T.t('attendanceRate'),
                value: '${_attendance?['grandRate'] ?? 0}%',
                valueColor: c.green,
              ),
              StatCard(
                label: T.t('collected'),
                value: fmt(_finance?['grandCollected']),
                valueColor: c.gold,
                sub: 'Birr',
              ),
              StatCard(
                label: T.t('pendingFees'),
                value: fmt(_finance?['grandPending']),
                valueColor: c.red,
                sub: 'Birr',
              ),
              StatCard(
                label: T.t('faultsCount'),
                value: fmt(_faults?['grandTotal']),
              ),
            ],
          ),
          SectionTitle('${T.t('byBranch')} (${stuBranches.length})'),
          if (stuBranches.isEmpty)
            CardBox(child: EmptyBox(T.t('noBranchData')))
          else
            for (final b in stuBranches)
              _branchCard(c, b, finBranches, attBranches),
        ],
      ],
    );
  }

  Widget _branchCard(
    AppColors c,
    Map<String, dynamic> b,
    List<Map<String, dynamic>> finBranches,
    List<Map<String, dynamic>> attBranches,
  ) {
    final code = b['branchCode'].toString();
    final fin = finBranches.where((x) => x['branchCode'] == code).toList();
    final att = attBranches.where((x) => x['branchCode'] == code).toList();
    final f = fin.isEmpty ? null : fin.first;
    final a = att.isEmpty ? null : att.first;
    final name = (b['branchName'] ?? code).toString();

    return CardBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFFF7941E), Color(0xFFFFB04D)]),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  name.isEmpty ? '?' : name.substring(0, 1).toUpperCase(),
                  style: const TextStyle(
                    color: Color(0xFF8B1A1A),
                    fontWeight: FontWeight.w900,
                    fontSize: 15,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  name,
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: c.text),
                ),
              ),
              Pill(fmt(b['total']), color: c.primary),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _mini(c, T.t('attendanceRate'), a == null ? '—' : '${a['rate']}%'),
              _mini(c, T.t('collected'), f == null ? '—' : birr(f['collected'])),
              _mini(c, T.t('pending'), f == null ? '—' : birr(f['pending'])),
            ],
          ),
        ],
      ),
    );
  }

  Widget _mini(AppColors c, String label, String value) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 10, color: c.muted)),
          const SizedBox(height: 3),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: c.text),
          ),
        ],
      ),
    );
  }
}
