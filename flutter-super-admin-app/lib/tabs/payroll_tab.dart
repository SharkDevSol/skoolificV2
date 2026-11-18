import 'package:flutter/material.dart';

import '../api.dart';
import '../l10n.dart';
import '../tab_handle.dart';
import '../theme.dart';
import '../ui.dart';

/// Payroll overview for every branch: which months are done, which are still
/// pending, and the net amount paid. Visible to khalif (and any account given
/// the payroll tab).
class PayrollTab extends StatefulWidget {
  const PayrollTab({
    super.key,
    required this.branch,
    required this.active,
    required this.handle,
  });

  final String branch;
  final bool active;
  final TabHandle handle;

  @override
  State<PayrollTab> createState() => _PayrollTabState();
}

class _PayrollTabState extends State<PayrollTab> {
  bool _loaded = false;
  bool _loading = false;
  String? _error;
  Map<String, dynamic>? _data;

  @override
  void initState() {
    super.initState();
    widget.handle.refresh = _load;
    if (widget.active) _load();
  }

  @override
  void didUpdateWidget(covariant PayrollTab oldWidget) {
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
    final res = await Api.getJson('/super-admin/report/payroll', params: {
      'branchCode': widget.branch,
    });
    if (!mounted) return;
    setState(() {
      _data = res.data;
      _loading = false;
      _loaded = true;
      if (res.data == null) _error = 'Could not load payroll. Pull down to retry.';
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final d = _data;
    final branches = mapList(d?['branches']);

    return TabScroll(
      onRefresh: _load,
      children: [
        if (_loading && !_loaded)
          const LoadingBox(text: 'Loading payroll...')
        else if (_error != null)
          CardBox(child: MessageBanner(_error!, isError: true))
        else ...[
          HeroCard(
            label: 'Payroll · ${d?['currentEthMonthName'] ?? ''} ${d?['ethYear'] ?? ''} E.C.',
            value: '${fmt(d?['grandDone'])} done · ${fmt(d?['grandPending'])} pending',
            valueSize: 26,
            sub: 'Net paid so far: ${birr(d?['grandNet'])} — totals are per month, not per teacher',
          ),
          StatGrid(
            children: [
              StatCard(
                label: 'Months done',
                value: fmt(d?['grandDone']),
                valueColor: c.green,
                sub: 'all branches',
              ),
              StatCard(
                label: 'Months not done',
                value: fmt(d?['grandPending']),
                valueColor: c.red,
                sub: 'includes this month',
              ),
              StatCard(
                label: 'Total net paid',
                value: birr(d?['grandNet']),
                sub: 'payroll only',
              ),
              StatCard(
                label: 'Branches',
                value: fmt(branches.length),
                sub: 'with payroll data',
              ),
            ],
          ),
          SectionTitle('By Branch', trailing: '${branches.length} branches'),
          if (branches.isEmpty)
            CardBox(child: EmptyBox('No payroll data yet'))
          else
            for (final b in branches) _branchCard(c, b),
        ],
      ],
    );
  }

  Widget _branchCard(AppColors c, Map<String, dynamic> b) {
    final months = mapList(b['months']);
    final started = months.where((m) => m['started'] == true).toList();
    final done = started.where((m) => m['done'] == true).toList();
    final pending = started.where((m) => m['done'] != true).toList();
    final error = b['error'];
    final allDone = started.isNotEmpty && pending.isEmpty;

    return CardBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  (b['branchName'] ?? b['branchCode']).toString(),
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: c.text),
                ),
              ),
              Pill(
                error != null
                    ? 'unavailable'
                    : allDone
                        ? 'all done'
                        : '${pending.length} pending',
                color: error != null ? c.red : (allDone ? c.green : c.red),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '${done.length} of ${started.length} started months done · '
            'net paid ${birr(b['totalNet'])}',
            style: TextStyle(fontSize: 10.5, color: c.muted),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 5,
            runSpacing: 5,
            children: [
              for (final m in months)
                Pill(
                  '${m['monthName']}${m['done'] == true ? ' ✓' : m['started'] == true ? ' ✗' : ''}',
                  color: m['done'] == true
                      ? c.green
                      : (m['started'] == true ? c.red : c.muted),
                ),
            ],
          ),
          const SizedBox(height: 10),
          if (error != null)
            MessageBanner(error.toString(), isError: true)
          else if (started.isEmpty)
            const EmptyBox('No month has started yet')
          else
            DataTableX(
              headers: const ['Month', 'Status', 'Staff', 'Gross', 'Deductions', 'Net', 'Done by'],
              columnSpacing: 11,
              rows: started.map((m) {
                final isDone = m['done'] == true;
                return [
                  cellText(m['monthName'], bold: true),
                  Pill(
                    isDone ? 'Done' : ((m['status'] ?? 'Not started').toString()),
                    color: isDone ? c.green : c.red,
                  ),
                  cellText(fmt(m['staffCount'])),
                  cellText(fmt(m['totalGross'])),
                  cellText(fmt(m['totalDeductions'])),
                  cellText(fmt(m['totalNet']), bold: true, color: isDone ? c.green : c.red),
                  cellText((m['doneBy'] ?? '—').toString(), size: 10),
                ];
              }).toList(),
            ),
        ],
      ),
    );
  }
}
