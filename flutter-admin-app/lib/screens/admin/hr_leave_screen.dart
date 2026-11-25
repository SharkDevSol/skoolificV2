import 'package:flutter/material.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/ethiopian_date.dart';

class HrLeaveScreen extends StatefulWidget {
  const HrLeaveScreen({super.key});
  @override
  State<HrLeaveScreen> createState() => _HrLeaveScreenState();
}

class _HrLeaveScreenState extends State<HrLeaveScreen> with SingleTickerProviderStateMixin {
  late final TabController _tc;
  final EthDate _today = EthiopianDate.fromGregorian(DateTime.now());
  List<Map<String, dynamic>> _pending = [];
  List<Map<String, dynamic>> _approved = [];
  List<Map<String, dynamic>> _rejected = [];
  List<Map<String, dynamic>> _records = [];
  List<Map<String, dynamic>> _staff = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: 5, vsync: this);
    _load();
  }

  @override
  void dispose() { _tc.dispose(); super.dispose(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final pending = await ApiService().getLeaveIssues(_today.month, _today.year, status: 'PENDING');
      final approved = await ApiService().getLeaveIssues(_today.month, _today.year, status: 'APPROVED');
      final rejected = await ApiService().getLeaveIssues(_today.month, _today.year, status: 'REJECTED');
      final records = await ApiService().getLeaveRecords(_today.month, _today.year);
      final staff = <Map<String, dynamic>>[];
      final seen = <String>{};
      for (final type in ['Teachers', 'Administrative Staff', 'Supportive Staff', 'Finance']) {
        final classes = await ApiService().getStaffClasses(type);
        for (final cls in classes) {
          try {
            final rows = await ApiService().getStaffData(type, cls);
            for (final r in rows) {
              final id = '${r['global_staff_id'] ?? r['staff_id'] ?? r['id'] ?? ''}';
              final key = id.isNotEmpty ? id : '${r['full_name'] ?? r['name']}';
              if (seen.add(key)) { r['class_name'] = r['class_name'] ?? cls; staff.add(r); }
            }
          } catch (_) {}
        }
      }
      if (!mounted) return;
      setState(() {
        _pending = pending;
        _approved = approved;
        _rejected = rejected;
        _records = records;
        _staff = staff;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  String _dateLabel(Map<String, dynamic> item) {
    final m = int.tryParse('${item['ethiopian_month'] ?? _today.month}') ?? _today.month;
    final d = int.tryParse('${item['ethiopian_day'] ?? 0}') ?? 0;
    final y = int.tryParse('${item['ethiopian_year'] ?? _today.year}') ?? _today.year;
    return '${EthiopianDate.monthNames[(m - 1).clamp(0, 12)]} $d, $y';
  }

  Future<void> _approve(Map<String, dynamic> item) async {
    final id = '${item['attendance_id'] ?? item['id'] ?? ''}';
    if (id.isEmpty) return;
    final ok = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(
      title: const Text('Approve leave?'),
      content: Text('${item['staff_name'] ?? ''} • ${_dateLabel(item)}\n\nThis will move the record to the Approved list.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Approve')),
      ],
    ));
    if (ok != true) return;
    final err = await ApiService().approveLeave(id, 'Approved by admin');
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(err ?? 'Leave approved'),
      backgroundColor: err == null ? AppColors.success : AppColors.danger,
    ));
    if (err == null) await _load();
  }

  Future<void> _reject(Map<String, dynamic> item) async {
    final id = '${item['attendance_id'] ?? item['id'] ?? ''}';
    if (id.isEmpty) return;
    final reasonCtrl = TextEditingController();
    String? validation;
    final ok = await showDialog<bool>(context: context, builder: (ctx) => StatefulBuilder(builder: (ctx, setSheet) => AlertDialog(
      title: const Text('Reject leave'),
      content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('${item['staff_name'] ?? ''} • ${_dateLabel(item)}'),
        const SizedBox(height: 12),
        TextField(
          controller: reasonCtrl,
          maxLines: 3,
          decoration: InputDecoration(
            labelText: 'Reason (required)',
            errorText: validation,
            border: const OutlineInputBorder(),
          ),
          onChanged: (_) { if (validation != null) setSheet(() => validation = null); },
        ),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
          onPressed: () {
            if (reasonCtrl.text.trim().isEmpty) {
              setSheet(() => validation = 'Please write the rejection reason');
              return;
            }
            Navigator.pop(ctx, true);
          },
          child: const Text('Reject'),
        ),
      ],
    )));
    if (ok != true) return;
    final err = await ApiService().rejectLeave(id, reasonCtrl.text.trim());
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(err ?? 'Leave rejected'),
      backgroundColor: err == null ? AppColors.success : AppColors.danger,
    ));
    if (err == null) await _load();
  }

  int _daysBetween(int sm, int sd, int sy, int em, int ed, int ey) {
    int idx(int m, int d, int y) => y * 365 + (m - 1) * 30 + d;
    final diff = idx(em, ed, ey) - idx(sm, sd, sy);
    return diff + 1;
  }

  Future<void> _grant() async {
    if (_staff.isEmpty) return;
    int? staffIndex;
    int sm = _today.month, sd = _today.day, sy = _today.year;
    int em = _today.month, ed = _today.day, ey = _today.year;
    final reasonCtrl = TextEditingController();
    bool saving = false;

    final ok = await showDialog<bool>(context: context, builder: (ctx) => StatefulBuilder(builder: (ctx, setSheet) {
      final days = _daysBetween(sm, sd, sy, em, ed, ey);
      Widget dateRow(String label, int m, int d, int y, void Function(int, int, int) onChanged) {
        final maxDay = m == 13 ? 5 : 30;
        final safeDay = d.clamp(1, maxDay);
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
          const SizedBox(height: 4),
          Row(children: [
            Expanded(child: DropdownButtonFormField<int>(
              value: m,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Month', isDense: true),
              items: List.generate(13, (i) => DropdownMenuItem(value: i + 1, child: Text(EthiopianDate.monthNames[i]))),
              onChanged: (v) {
                if (v == null) return;
                final nd = d.clamp(1, v == 13 ? 5 : 30);
                onChanged(v, nd, y);
              },
            )),
            const SizedBox(width: 6),
            SizedBox(width: 72, child: DropdownButtonFormField<int>(
              value: safeDay,
              decoration: const InputDecoration(labelText: 'Day', isDense: true),
              items: List.generate(maxDay, (i) => DropdownMenuItem(value: i + 1, child: Text('${i + 1}'))),
              onChanged: (v) { if (v != null) onChanged(m, v, y); },
            )),
            const SizedBox(width: 6),
            SizedBox(width: 86, child: DropdownButtonFormField<int>(
              value: y,
              decoration: const InputDecoration(labelText: 'Year', isDense: true),
              items: List.generate(5, (i) => DropdownMenuItem(value: _today.year - 2 + i, child: Text('${_today.year - 2 + i}'))),
              onChanged: (v) { if (v != null) onChanged(m, d, v); },
            )),
          ]),
        ]);
      }

      return AlertDialog(
        title: const Text('Grant leave'),
        content: SizedBox(width: 520, child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          DropdownButtonFormField<int>(
            value: staffIndex,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Staff'),
            items: _staff.asMap().entries.map((e) => DropdownMenuItem(value: e.key, child: Text('${e.value['full_name'] ?? e.value['name'] ?? ''}'))).toList(),
            onChanged: (v) => setSheet(() => staffIndex = v),
          ),
          const SizedBox(height: 12),
          dateRow('Start date', sm, sd, sy, (m, d, y) => setSheet(() { sm = m; sd = d; sy = y; })),
          const SizedBox(height: 10),
          dateRow('End date', em, ed, ey, (m, d, y) => setSheet(() { em = m; ed = d; ey = y; })),
          const SizedBox(height: 8),
          Text(days <= 0 ? 'End date must be after the start date' : 'Total: $days day(s)', style: TextStyle(fontWeight: FontWeight.w800, color: days <= 0 ? AppColors.danger : AppColors.success)),
          const SizedBox(height: 10),
          TextField(controller: reasonCtrl, maxLines: 2, decoration: const InputDecoration(labelText: 'Reason (required)', border: OutlineInputBorder())),
        ]))),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
            onPressed: saving ? null : () {
              if (staffIndex == null) return;
              if (_daysBetween(sm, sd, sy, em, ed, ey) <= 0) return;
              if (reasonCtrl.text.trim().isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Reason is required')));
                return;
              }
              Navigator.pop(ctx, true);
            },
            child: saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Grant'),
          ),
        ],
      );
    }));
    if (ok != true || staffIndex == null) return;
    setState(() => _loading = true);
    final s = _staff[staffIndex!];
    final days = _daysBetween(sm, sd, sy, em, ed, ey);
    final err = await ApiService().grantLeave(
      staffId: '${s['global_staff_id'] ?? s['staff_id'] ?? s['id'] ?? ''}',
      staffName: '${s['full_name'] ?? s['name'] ?? ''}',
      departmentName: '${s['staff_type'] ?? s['class_name'] ?? ''}',
      startMonth: sm,
      startDay: sd,
      startYear: sy,
      numberOfDays: days,
      reason: reasonCtrl.text.trim(),
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(err ?? 'Leave granted for $days day(s)'),
      backgroundColor: err == null ? AppColors.success : AppColors.danger,
    ));
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('HR Leave • ${_today.monthName} ${_today.year}'),
        bottom: TabBar(
          controller: _tc,
          isScrollable: true,
          tabs: [
            Tab(text: 'Pending ${_pending.length}'),
            Tab(text: 'Approved ${_approved.length}'),
            Tab(text: 'Rejected ${_rejected.length}'),
            Tab(text: 'Granted ${_records.length}'),
            const Tab(text: 'Grant'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)))
              : TabBarView(controller: _tc, children: [
                  _issueList(_pending, pending: true),
                  _issueList(_approved),
                  _issueList(_rejected),
                  _grantedList(),
                  _grantTab(),
                ]),
    );
  }

  Widget _issueList(List<Map<String, dynamic>> items, {bool pending = false}) {
    if (items.isEmpty) return const Center(child: Text('No records in this list.'));
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      itemBuilder: (context, i) {
        final item = items[i];
        final status = '${item['permission_status'] ?? ''}';
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            title: Text('${item['staff_name'] ?? ''} • ${item['status'] ?? ''}'),
            subtitle: Text('${_dateLabel(item)} • ${item['department_name'] ?? ''}\n${item['permission_reason'] ?? item['notes'] ?? ''}'
                '${status.isNotEmpty ? '\nStatus: $status' : ''}'),
            isThreeLine: true,
            trailing: pending
                ? Wrap(spacing: 2, children: [
                    IconButton(icon: const Icon(Icons.check_circle, color: Colors.green), tooltip: 'Approve', onPressed: () => _approve(item)),
                    IconButton(icon: const Icon(Icons.cancel, color: Colors.red), tooltip: 'Reject', onPressed: () => _reject(item)),
                  ])
                : null,
          ),
        );
      },
    );
  }

  Widget _grantedList() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Card(
          child: Padding(
            padding: EdgeInsets.all(14),
            child: Text(
              'Granted = leave days you added manually (or approved). It shows the date range and total days for each staff member.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ),
        ),
        const SizedBox(height: 8),
        if (_records.isEmpty)
          const Card(child: Padding(padding: EdgeInsets.all(20), child: Text('No granted leave for this month.')))
        else
          ..._records.map((r) {
            final start = int.tryParse('${r['start_day'] ?? 0}') ?? 0;
            final end = int.tryParse('${r['end_day'] ?? 0}') ?? 0;
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: const CircleAvatar(child: Icon(Icons.event_available)),
                title: Text('${r['staff_name'] ?? ''}'),
                subtitle: Text('${EthiopianDate.monthNames[_today.month - 1]} $start – $end, ${_today.year} • ${r['total_days'] ?? 0} day(s)\n${r['department_name'] ?? ''} • ${r['leave_reason'] ?? ''}'),
                isThreeLine: true,
              ),
            );
          }),
      ],
    );
  }

  Widget _grantTab() {
    return ListView(padding: const EdgeInsets.all(16), children: [
      Card(child: Padding(padding: const EdgeInsets.all(20), child: Column(children: [
        const Text('Grant multi-day leave', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        const SizedBox(height: 8),
        const Text('Select the staff member, the start date and the end date. The number of days is calculated automatically.', textAlign: TextAlign.center),
        const SizedBox(height: 18),
        FilledButton.icon(onPressed: _grant, icon: const Icon(Icons.add), label: const Text('Grant Leave')),
      ]))),
    ]);
  }
}
