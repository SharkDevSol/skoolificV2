import 'package:flutter/material.dart';

import '../api.dart';
import '../l10n.dart';
import '../pdf_report.dart';
import '../tab_handle.dart';
import '../theme.dart';
import '../ui.dart';
import 'attendance_tab.dart' show ethMonths;

class FinanceTab extends StatefulWidget {
  const FinanceTab({
    super.key,
    required this.branch,
    required this.active,
    required this.handle,
  });

  final String branch;
  final bool active;
  final TabHandle handle;

  @override
  State<FinanceTab> createState() => _FinanceTabState();
}

class _FinanceTabState extends State<FinanceTab> {
  bool _loaded = false;
  bool _loading = false;
  bool _pdfBusy = false;
  String? _error;
  Map<String, dynamic>? _data;

  String _month = '';
  final _unpaidSearch = TextEditingController();
  final _unassignedSearch = TextEditingController();
  String _unpaidBranch = 'ALL';
  String _unpaidMonths = 'ALL';
  int _page = 1;
  static const _pageSize = 15;

  @override
  void initState() {
    super.initState();
    widget.handle.refresh = _load;
    _unpaidSearch.addListener(() => setState(() => _page = 1));
    _unassignedSearch.addListener(() => setState(() {}));
    if (widget.active) _load();
  }

  @override
  void didUpdateWidget(covariant FinanceTab oldWidget) {
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
    _unpaidSearch.dispose();
    _unassignedSearch.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    final res = await Api.getJson('/super-admin/report/finance', params: {
      'branchCode': widget.branch,
      'month': _month,
    });
    if (!mounted) return;
    setState(() {
      _data = res.data;
      _loading = false;
      _loaded = true;
      if (res.data == null) _error = 'Could not load finance. Pull down to retry.';
    });
  }

  Future<void> _downloadPdf() async {
    final f = _data;
    if (f == null || _pdfBusy) return;
    setState(() => _pdfBusy = true);
    try {
      await exportFinancePdf(f, widget.branch);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not generate the PDF: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _pdfBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final f = _data;
    final branches = activeBranches(f);
    final byClass = mapList(f?['byClass']);
    final maxExpected = byClass.fold<num>(1, (m, x) => toNum(x['expected']) > m ? toNum(x['expected']) : m);
    final allLocked = <Map<String, dynamic>>[];
    for (final b in branches) {
      allLocked.addAll(mapList(b['lockedMonthPayments']));
    }

    final unassigned = mapList(f?['unassignedStudents']);
    final uq = _unassignedSearch.text.trim().toLowerCase();
    final filteredUnassigned = uq.isEmpty
        ? unassigned
        : unassigned
            .where((s) =>
                (s['studentName'] ?? '').toString().toLowerCase().contains(uq) ||
                (s['class'] ?? '').toString().toLowerCase().contains(uq) ||
                (s['branch'] ?? '').toString().toLowerCase().contains(uq))
            .toList();

    final unpaid = mapList(f?['unpaidStudents']);
    final pq = _unpaidSearch.text.trim().toLowerCase();
    final filteredUnpaid = unpaid.where((s) {
      if (_unpaidBranch != 'ALL' && s['branch'] != _unpaidBranch) return false;
      final cnt = toNum(s['unpaidMonthsCount']);
      if (_unpaidMonths == '>1' && cnt <= 1) return false;
      if (_unpaidMonths == '1' && cnt != 1) return false;
      if (_unpaidMonths == '2' && cnt != 2) return false;
      if (pq.isNotEmpty) {
        final name = (s['studentName'] ?? '').toString().toLowerCase();
        final cls = (s['class'] ?? '').toString().toLowerCase();
        if (!name.contains(pq) && !cls.contains(pq)) return false;
      }
      return true;
    }).toList();
    final totalPages = (filteredUnpaid.length / _pageSize).ceil().clamp(1, 999999).toInt();
    final currentPage = _page.clamp(1, totalPages).toInt();
    final pagedUnpaid = filteredUnpaid.skip((currentPage - 1) * _pageSize).take(_pageSize).toList();

    final expectedTotal = toNum(f?['grandExpected']);
    final rate = toNum(f?['grandCollectedUnlocked'] ?? f?['grandCollected']) /
        (expectedTotal == 0 ? 1 : expectedTotal);

    return TabScroll(
      onRefresh: _load,
      children: [
        CardBox(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: c.green.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: BoxDecoration(color: c.green, shape: BoxShape.circle),
                          ),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              '${T.t('liveAudit')} · ${f?['academicYear'] ?? '2019 E.C.'} (${f?['currentEthMonthName'] ?? 'Tikimt'})',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: c.green),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: FilledButton.icon(
                  onPressed: f == null || _pdfBusy ? null : _downloadPdf,
                  style: FilledButton.styleFrom(
                    backgroundColor: c.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
                  ),
                  icon: _pdfBusy
                      ? const SizedBox(
                          width: 17,
                          height: 17,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.download_rounded, size: 19),
                  label: Text(
                    _pdfBusy ? T.t('generatingPdf') : T.t('downloadPdfReport'),
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              FilterField(
                label: T.t('month'),
                child: Container(
                  height: 46,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(
                    color: c.input,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: c.line),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _month,
                      isExpanded: true,
                      dropdownColor: c.card,
                      icon: Icon(Icons.expand_more_rounded, size: 18, color: c.muted),
                      style: TextStyle(fontSize: 12.5, color: c.text),
                      items: [
                        DropdownMenuItem(value: '', child: Text(T.t('allMonths'))),
                        for (var i = 0; i < ethMonths.length; i++)
                          DropdownMenuItem(value: '${i + 1}', child: Text(ethMonths[i])),
                      ],
                      onChanged: (v) {
                        setState(() => _month = v ?? '');
                        _load();
                      },
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        if (_loading && !_loaded)
          const LoadingBox(text: 'Loading finance...')
        else if (_error != null)
          CardBox(child: MessageBanner(_error!, isError: true))
        else ...[
          HeroCard(
            label: T.t('collectedToday'),
            value: '${fmt(f?['grandCollectedToday'])} Birr',
            valueSize: 30,
            sub:
                '${T.t('collected')} ${birr(f?['grandCollected'])} · ${(rate * 100).round()}% ${T.t('ofExpected')} ${birr(f?['grandExpected'])}',
          ),
          StatGrid(
            children: [
              StatCard(
                label: T.t('totalStudents'),
                value: fmt(f?['grandStudents']),
                sub: '${fmt(f?['grandOld'])} old · ${fmt(f?['grandNew'])} new',
              ),
              StatCard(
                label: T.t('freeStudents'),
                value: fmt(f?['grandFreeStudents']),
                sub: '${fmt(f?['grandPayingStudents'])} paying',
              ),
              StatCard(
                label: T.t('unpaidDue'),
                value: fmt(f?['grandUnpaidUnlocked']),
                valueColor: c.red,
                sub: birr(f?['grandPendingUnlocked'] ?? f?['grandPending']),
              ),
              StatCard(
                label: 'Advance Payments',
                value: fmt(f?['grandAdvance']),
                valueColor: c.gold,
                sub: '${allLocked.length} payments',
              ),
            ],
          ),
          CardBox(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CardTitle(T.t('monthPerformance')),
                _monthBox(
                  c,
                  'Month 1 · Meskerem',
                  c.primaryDeep,
                  [
                    KV('Expected', birr(f?['grandM1Expected'])),
                    KV('Collected', birr(f?['grandM1Collected']), color: c.green),
                    KV(
                      'Rate',
                      '${_pct(f?['grandM1Collected'], f?['grandM1Expected'])}%',
                      color: c.green,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                _monthBox(
                  c,
                  'Month 2 · Tikimt',
                  c.primaryDeep,
                  [
                    KV('Expected', birr(f?['grandM2Expected'])),
                    KV('Collected', birr(f?['grandM2Collected']), color: c.green),
                    KV(
                      'Rate',
                      '${_pct(f?['grandM2Collected'], f?['grandM2Expected'])}%',
                      color: c.green,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                _monthBox(
                  c,
                  'Total Unlocked Months (M1 + M2)',
                  c.blue,
                  [
                    KV('Expected', birr(f?['grandExpectedUnlocked'] ?? f?['grandExpected'])),
                    KV('Collected', birr(f?['grandCollectedUnlocked'] ?? f?['grandCollected']), color: c.green),
                    KV('Outstanding', birr(f?['grandPendingUnlocked'] ?? f?['grandPending']), color: c.red),
                  ],
                ),
                const SizedBox(height: 8),
                _monthBox(
                  c,
                  'All Months & Advance',
                  const Color(0xFF7C3AED),
                  [
                    KV('Cash Collected', birr(f?['grandCollected']), color: c.green),
                    KV('Advance Prepayments', birr(f?['grandAdvance']), color: c.gold),
                    KV('Full Year Pending', birr(f?['grandPendingAll']), color: c.red),
                  ],
                ),
              ],
            ),
          ),
          CardBox(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Text(
              T.t('unlockedNote'),
              style: TextStyle(fontSize: 10.5, color: c.muted, height: 1.4),
            ),
          ),
          if (mapList(f?['feeSchedule']).isNotEmpty) _feeSchedule(c, mapList(f?['feeSchedule'])),
          SectionTitle(T.t('byBranch')),
          if (branches.isEmpty)
            CardBox(child: EmptyBox(T.t('noBranchData')))
          else
            for (final b in branches) _branchCard(c, b),
          _unassignedCard(c, unassigned, filteredUnassigned),
          _unpaidCard(c, branches, filteredUnpaid, pagedUnpaid, currentPage, totalPages),
          if (allLocked.isNotEmpty) _advanceCard(c, allLocked, f),
          SectionTitle('${T.t('byClass')} (${T.t('allBranchesNote')})'),
          CardBox(
            child: byClass.isEmpty
                ? EmptyBox(T.t('noInvoices'))
                : Column(
                    children: byClass.map((cls) {
                      final collected = toNum(cls['collected']);
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    '${cls['className']} — ${fmt(cls['students'] ?? cls['totalStudents'])} students',
                                    style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: c.text),
                                  ),
                                ),
                                Text(
                                  '${fmt(collected)} / ${fmt(cls['expected'])}',
                                  style: TextStyle(fontSize: 10.5, color: c.muted),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            BarTrack(
                              value: maxExpected == 0 ? 0.0 : collected / maxExpected,
                            ),
                            const SizedBox(height: 3),
                            Text(
                              '${T.t('pending')} ${birr(cls['pending'])}',
                              style: TextStyle(fontSize: 10, color: c.muted),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
          ),
        ],
      ],
    );
  }

  int _pct(dynamic a, dynamic b) {
    final x = toNum(a).toDouble();
    final y = toNum(b).toDouble();
    return y == 0 ? 0 : ((x / y) * 100).round();
  }

  Widget _monthBox(AppColors c, String title, Color color, List<Widget> rows) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: c.input,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: c.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: color),
          ),
          const SizedBox(height: 6),
          ...rows,
        ],
      ),
    );
  }

  Widget _feeSchedule(AppColors c, List<Map<String, dynamic>> fees) {
    return CardBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CardTitle(T.t('standardFeeSchedule')),
          DataTableX(
            headers: const ['Category', 'Classes', 'Monthly', 'Old Reg', 'New Reg', 'M1 Old', 'M1 New'],
            columnSpacing: 12,
            rows: fees
                .map((fs) => [
                      cellText(fs['category'], bold: true),
                      cellText(fs['classes']),
                      cellText(fmt(fs['monthlyFee']), bold: true),
                      cellText(fmt(fs['oldRegFee'])),
                      cellText(fmt(fs['newRegFee'])),
                      Pill(fmt(fs['m1Old'])),
                      Pill(fmt(fs['m1New']), color: c.blue),
                    ])
                .toList(),
          ),
        ],
      ),
    );
  }

  Widget _branchCard(AppColors c, Map<String, dynamic> b) {
    final classes = mapList(b['classes']).where((x) => toNum(x['totalStudents'] ?? x['students']) > 0).toList();
    final m1 = classes.fold<num>(0, (s, x) => s + toNum(x['m1PaidCount']));
    final m2 = classes.fold<num>(0, (s, x) => s + toNum(x['m2PaidCount']));

    return CardBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${b['branchName'] ?? b['branchCode']}',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: c.text),
          ),
          const SizedBox(height: 3),
          Text(
            '${fmt(b['totalStudents'])} students · collected ${birr(b['collected'])}',
            style: TextStyle(fontSize: 10.5, color: c.muted),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 5,
            runSpacing: 5,
            children: [
              Pill('${fmt(b['oldStudents'])} old'),
              Pill('${fmt(b['newStudents'])} new', color: c.blue),
              if (toNum(b['unassignedStudents']) > 0)
                Pill('${fmt(b['unassignedStudents'])} unassigned', color: c.gold),
              Pill('${fmt(b['unpaidUnlocked'])} unpaid', color: c.red),
              if (toNum(b['advanceCollected']) > 0)
                Pill('${fmt(b['advanceCollected'])} advance', color: c.gold),
            ],
          ),
          const SizedBox(height: 10),
          if (classes.isEmpty)
            EmptyBox(T.t('noInvoices'))
          else ...[
            DataTableX(
              headers: const [
                'Class', 'Total', 'Old', 'New', 'Free', 'Paying', 'Fee', 'Reg O/N',
                'M1', 'M1 E/C', 'M2', 'M2 E/C', 'Unpaid', 'Expected', 'Collected', 'Rate',
              ],
              columnSpacing: 11,
              rows: classes.map((cls) {
                final unpaid = toNum(cls['unpaidUnlockedCount']);
                return [
                  cellText(cls['className'], bold: true),
                  cellText(fmt(cls['totalStudents'] ?? cls['students']), bold: true),
                  cellText(fmt(cls['oldStudents'])),
                  cellText(fmt(cls['newStudents'])),
                  cellText(fmt(cls['freeStudents']), color: toNum(cls['freeStudents']) > 0 ? c.green : null),
                  cellText(fmt(cls['payingStudents'])),
                  cellText(fmt(cls['monthlyFee'])),
                  cellText('${fmt(cls['oldRegFee'])}/${fmt(cls['newRegFee'])}', size: 9.5),
                  cellText(fmt(cls['m1PaidCount'])),
                  cellText('${fmt(cls['m1Expected'])}/${fmt(cls['m1Collected'])}', size: 9.5),
                  cellText(fmt(cls['m2PaidCount'])),
                  cellText('${fmt(cls['m2Expected'])}/${fmt(cls['m2Collected'])}', size: 9.5),
                  cellText(fmt(unpaid), color: unpaid > 0 ? c.red : c.green, bold: true),
                  cellText(fmt(cls['expectedUnlocked'] ?? cls['expected']), bold: true),
                  cellText(fmt(cls['collectedUnlocked'] ?? cls['collected']), bold: true, color: c.green),
                  Pill('${fmt(cls['rate'])}%'),
                ];
              }).toList(),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: c.input,
                borderRadius: BorderRadius.circular(9),
                border: Border.all(color: c.line),
              ),
              child: Wrap(
                spacing: 12,
                runSpacing: 4,
                children: [
                  Text('TOTAL ${fmt(b['totalStudents'])}', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: c.text)),
                  Text('M1 paid ${fmt(m1)}', style: TextStyle(fontSize: 10.5, color: c.muted)),
                  Text('M2 paid ${fmt(m2)}', style: TextStyle(fontSize: 10.5, color: c.muted)),
                  Text('Expected ${birr(b['expectedUnlocked'] ?? b['expected'])}', style: TextStyle(fontSize: 10.5, color: c.text)),
                  Text('Collected ${birr(b['collectedUnlocked'] ?? b['collected'])}', style: TextStyle(fontSize: 10.5, color: c.green, fontWeight: FontWeight.w700)),
                  Text('${b['rate']}%', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: c.primary)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _unassignedCard(
    AppColors c,
    List<Map<String, dynamic>> all,
    List<Map<String, dynamic>> filtered,
  ) {
    return CardBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CardTitle('Unassigned Students (${filtered.length})'),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(
              color: c.input,
              borderRadius: BorderRadius.circular(8),
              border: const Border(left: BorderSide(color: Color(0xFFF59E0B), width: 4)),
            ),
            child: Text(
              T.t('unassignedDesc'),
              style: TextStyle(fontSize: 10.5, color: c.muted, height: 1.4),
            ),
          ),
          SearchBox(
            hint: 'Search unassigned student...',
            controller: _unassignedSearch,
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 10),
          if (filtered.isEmpty)
            EmptyBox('No unassigned students match your search.')
          else
            DataTableX(
              headers: const ['#', 'Branch', 'Class', 'Student', 'Status'],
              columnSpacing: 12,
              rows: List.generate(filtered.length, (i) {
                final s = filtered[i];
                return [
                  cellText(i + 1, color: c.muted),
                  cellText(s['branch'], bold: true),
                  Pill((s['class'] ?? '—').toString()),
                  cellText(s['studentName'], bold: true),
                  Pill('Classification required', color: c.amber),
                ];
              }),
            ),
        ],
      ),
    );
  }

  Widget _unpaidCard(
    AppColors c,
    List<Map<String, dynamic>> branches,
    List<Map<String, dynamic>> filtered,
    List<Map<String, dynamic>> paged,
    int page,
    int totalPages,
  ) {
    return CardBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CardTitle(
            'Unpaid Students (${filtered.length})',
            trailing: Text(
              '${paged.length} of ${filtered.length}',
              style: TextStyle(fontSize: 10, color: c.muted),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(
              color: c.input,
              borderRadius: BorderRadius.circular(8),
              border: const Border(left: BorderSide(color: Color(0xFFB21E23), width: 4)),
            ),
            child: Text(
              T.t('unpaidDesc'),
              style: TextStyle(fontSize: 10.5, color: c.muted, height: 1.4),
            ),
          ),
          SearchBox(
            hint: 'Search unpaid student...',
            controller: _unpaidSearch,
            onChanged: (_) => setState(() => _page = 1),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _miniDropdown(
                  c,
                  value: _unpaidBranch,
                  items: [
                    {'value': 'ALL', 'label': 'All Branches'},
                    for (final b in branches)
                      {'value': (b['branchName'] ?? b['branchCode']).toString(), 'label': (b['branchName'] ?? b['branchCode']).toString()},
                  ],
                  onChanged: (v) => setState(() {
                    _unpaidBranch = v ?? 'ALL';
                    _page = 1;
                  }),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _miniDropdown(
                  c,
                  value: _unpaidMonths,
                  items: const [
                    {'value': 'ALL', 'label': 'Any months'},
                    {'value': '1', 'label': '1 month'},
                    {'value': '2', 'label': '2 months'},
                    {'value': '>1', 'label': '2+ months'},
                  ],
                  onChanged: (v) => setState(() {
                    _unpaidMonths = v ?? 'ALL';
                    _page = 1;
                  }),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (filtered.isEmpty)
            EmptyBox('No unpaid students match your filters.')
          else ...[
            DataTableX(
              headers: const ['#', 'Branch', 'Class', 'Student', 'Months', 'Unpaid', 'Due'],
              columnSpacing: 11,
              rows: List.generate(paged.length, (i) {
                final s = paged[i];
                final row = (page - 1) * _pageSize + i + 1;
                return [
                  cellText(row, color: c.muted),
                  cellText(s['branch'], bold: true),
                  Pill((s['class'] ?? '—').toString()),
                  cellText(s['studentName'], bold: true),
                  cellText('${s['unpaidMonthsCount']}'),
                  cellText((mapList(s['unpaidMonths']).isEmpty
                          ? (s['unpaidMonths'] is List ? (s['unpaidMonths'] as List).join(', ') : '—')
                          : mapList(s['unpaidMonths']).join(', ')),
                      size: 10, color: c.red),
                  cellText(birr(s['totalDue']), bold: true, color: c.red),
                ];
              }),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                OutlinedButton(
                  onPressed: page <= 1 ? null : () => setState(() => _page = page - 1),
                  child: const Text('Previous'),
                ),
                Expanded(
                  child: Text(
                    'Page $page of $totalPages',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 11, color: c.muted),
                  ),
                ),
                OutlinedButton(
                  onPressed: page >= totalPages ? null : () => setState(() => _page = page + 1),
                  child: const Text('Next'),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _miniDropdown(
    AppColors c, {
    required String value,
    required List<Map<String, String>> items,
    required ValueChanged<String?> onChanged,
  }) {
    final safe = items.any((i) => i['value'] == value) ? value : items.first['value']!;
    return Container(
      height: 44,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: c.input,
        borderRadius: BorderRadius.circular(11),
        border: Border.all(color: c.line),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: safe,
          isExpanded: true,
          dropdownColor: c.card,
          icon: Icon(Icons.expand_more_rounded, size: 18, color: c.muted),
          style: TextStyle(fontSize: 11, color: c.text),
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

  Widget _advanceCard(AppColors c, List<Map<String, dynamic>> payments, Map<String, dynamic>? f) {
    return CardBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CardTitle('Advance Payments (${payments.length})'),
          DataTableX(
            headers: const ['Branch', 'Class', 'Student', 'Month', 'Receipt', 'Amount'],
            columnSpacing: 11,
            rows: List.generate(payments.length, (i) {
              final p = payments[i];
              final receipt = (p['receiptNumber'] ?? '').toString().trim();
              return [
                cellText(p['branch']),
                cellText(p['class'], bold: true),
                cellText(p['studentName']),
                Pill((p['monthName'] ?? 'Month ${p['monthNumber']}').toString(), color: c.blue),
                cellText(
                  receipt.isEmpty || receipt == 'N/A'
                      ? 'RCP-${(p['invoiceNumber'] ?? i + 1).toString().padLeft(6, '0')}'
                      : receipt,
                  size: 10,
                ),
                cellText(birr(p['paidAmount']), bold: true, color: c.green),
              ];
            }),
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: Text(
              'TOTAL ${birr(f?['grandAdvance'])}',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: c.text),
            ),
          ),
        ],
      ),
    );
  }
}
