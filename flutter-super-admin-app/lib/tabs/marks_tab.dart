import 'package:flutter/material.dart';

import '../api.dart';
import '../l10n.dart';
import '../tab_handle.dart';
import '../theme.dart';
import '../ui.dart';

class MarksTab extends StatefulWidget {
  const MarksTab({
    super.key,
    required this.branch,
    required this.active,
    required this.handle,
  });

  final String branch;
  final bool active;
  final TabHandle handle;

  @override
  State<MarksTab> createState() => _MarksTabState();
}

class _MarksTabState extends State<MarksTab> {
  bool _loaded = false;
  bool _loading = false;
  String? _error;
  Map<String, dynamic>? _data;

  String _term = '1';
  String _classFilter = 'ALL';
  final _search = TextEditingController();
  int _rankView = 0; // 0 highest, 1 lowest

  @override
  void initState() {
    super.initState();
    widget.handle.refresh = _load;
    _search.addListener(() => setState(() {}));
    if (widget.active) _load();
  }

  @override
  void didUpdateWidget(covariant MarksTab oldWidget) {
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
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    final res = await Api.getJson('/super-admin/report/marks', params: {
      'branchCode': widget.branch,
      'term': _term,
    });
    if (!mounted) return;
    setState(() {
      _data = res.data;
      _loading = false;
      _loaded = true;
      if (res.data == null) _error = 'Could not load marks. Pull down to retry.';
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final m = _data;
    final allBranches = mapList(m?['byBranch']).where((b) => b['error'] == null).toList();
    final classNames = <String>{};
    for (final b in allBranches) {
      for (final cls in mapList(b['classes'])) {
        final n = (cls['className'] ?? '').toString();
        if (n.isNotEmpty) classNames.add(n);
      }
    }
    final sortedClasses = classNames.toList()..sort();
    final q = _search.text.trim().toLowerCase();

    return TabScroll(
      onRefresh: _load,
      children: [
        CardBox(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CardTitle('Marks & Academic Performance Filter'),
              Row(
                children: [
                  Expanded(
                    child: FilterField(
                      label: T.t('term'),
                      child: _dropdown(
                        c,
                        value: _term,
                        items: const [
                          {'value': '1', 'label': 'Term 1'},
                          {'value': '2', 'label': 'Term 2'},
                        ],
                        onChanged: (v) {
                          setState(() => _term = v ?? '1');
                          _load();
                        },
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilterField(
                      label: 'Class',
                      child: _dropdown(
                        c,
                        value: _classFilter,
                        items: [
                          {'value': 'ALL', 'label': 'All Classes'},
                          for (final cls in sortedClasses) {'value': cls, 'label': cls},
                        ],
                        onChanged: (v) => setState(() => _classFilter = v ?? 'ALL'),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SearchBox(
                hint: 'Search class or student...',
                controller: _search,
                onChanged: (_) => setState(() {}),
              ),
            ],
          ),
        ),
        if (_loading && !_loaded)
          const LoadingBox(text: 'Loading marks...')
        else if (_error != null)
          CardBox(child: MessageBanner(_error!, isError: true))
        else ...[
          StatGrid(
            children: [
              StatCard(
                label: 'Total Graded Students',
                value: fmt(m?['grandGradedStudents']),
              ),
              StatCard(
                label: 'Recorded Subjects',
                value: fmt(m?['grandSubjectsCount']),
                valueColor: c.gold,
              ),
              StatCard(
                label: 'Overall Average',
                value: score(m?['grandAvgScore']),
                valueColor: c.green,
              ),
            ],
          ),
          SectionTitle('Top Performing Students by Class & Branch'),
          if (allBranches.isEmpty)
            CardBox(child: EmptyBox(T.t('noBranchData')))
          else
            for (final b in allBranches) _branchCard(c, b, q),
        ],
      ],
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

  Widget _branchCard(AppColors c, Map<String, dynamic> b, String q) {
    var classes = mapList(b['classes']);
    if (_classFilter != 'ALL') {
      classes = classes
          .where((cls) => (cls['className'] ?? '').toString().toUpperCase() == _classFilter.toUpperCase())
          .toList();
    }
    if (q.isNotEmpty) {
      classes = classes.where((cls) {
        if ((cls['className'] ?? '').toString().toLowerCase().contains(q)) return true;
        final students = [
          ...mapList(cls['bigMarkStudents']),
          ...mapList(cls['topStudents']),
          ...mapList(cls['lowestStudents']),
        ];
        return students.any((s) => (s['studentName'] ?? s['name'] ?? '').toString().toLowerCase().contains(q));
      }).toList();
    }

    return CardBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${b['branchName']} — Term ${_data?['term'] ?? _term}',
            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: c.text),
          ),
          const SizedBox(height: 3),
          Text(
            '${fmt(b['totalGradedStudents'] ?? b['gradedStudents'])} graded · ${fmt(b['subjectsCount'])} subjects · Branch avg ${score(b['avgScore'])}',
            style: TextStyle(fontSize: 10.5, color: c.muted),
          ),
          const SizedBox(height: 8),
          if (classes.isEmpty)
            EmptyBox('No class mark sheets found for this filter.')
          else
            for (final cls in classes) _classCard(c, cls),
        ],
      ),
    );
  }

  Widget _classCard(AppColors c, Map<String, dynamic> cls) {
    final high = toNum(cls['highestTotalMark']);
    final low = toNum(cls['lowestTotalMark']);
    final highStudents = mapList(cls['bigMarkStudents']);
    final topStudents = highStudents.isNotEmpty ? highStudents : mapList(cls['topStudents']);
    final lowStudents = mapList(cls['lowestStudents']);
    final display = _rankView == 0 ? topStudents : lowStudents;
    final subjects = mapList(cls['subjectTopScorers']);
    final subjectList = subjects.isNotEmpty ? subjects : mapList(cls['topBySubject']);

    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: c.input,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: c.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Class ${cls['className']}',
            style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: c.text),
          ),
          const SizedBox(height: 7),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              Pill('${fmt(cls['studentCount'] ?? cls['totalGradedStudents'])} Students'),
              Pill('${fmt(cls['subjectCount'] ?? cls['subjectsCount'])} Subjects', color: c.blue),
              Pill('Avg ${score(cls['classAvgScore'] ?? cls['avgScore'])}', color: c.green),
              if (cls['highestTotalMark'] != null)
                Pill('High ${score(high)} pts', color: c.green),
              if (cls['lowestTotalMark'] != null)
                Pill('Low ${score(low)} pts', color: c.red),
            ],
          ),
          const SizedBox(height: 10),
          PillTabs(
            options: const ['Highest Rank', 'Lowest Rank'],
            value: _rankView,
            onChanged: (i) => setState(() => _rankView = i),
          ),
          const SizedBox(height: 8),
          if (display.isEmpty)
            EmptyBox('No ranked students for this view.')
          else
            DataTableX(
              headers: const ['Rank', 'Student', 'Total', 'Avg', 'Subjects'],
              columnSpacing: 12,
              rows: List.generate(display.length, (i) {
                final s = display[i];
                final subjectsArr = mapList(s['subjects']);
                final rank = toNum(s['rank'] ?? i + 1);
                return [
                  _rankBadge(c, rank.toInt()),
                  cellText(s['studentName'] ?? s['name'], bold: true),
                  cellText(fmt(s['totalScore']), bold: true, color: c.green),
                  cellText(score(s['avgScore']), bold: true),
                  Wrap(
                    spacing: 3,
                    runSpacing: 3,
                    children: subjectsArr
                        .map((sub) => Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                              decoration: BoxDecoration(
                                color: (num.tryParse(sub['score'].toString()) ?? 0) >= 90
                                    ? c.green.withValues(alpha: 0.14)
                                    : c.card,
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: c.line),
                              ),
                              child: Text(
                                '${sub['subject']}: ${sub['score']}',
                                style: TextStyle(fontSize: 9.5, color: c.text),
                              ),
                            ))
                        .toList(),
                  ),
                ];
              }),
            ),
          if (subjectList.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              'Highest Scorer by Subject',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: c.muted),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: subjectList.map((sub) {
                final tops = mapList(sub['topStudents']);
                final top = tops.isEmpty ? null : tops.first;
                return Container(
                  width: 150,
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                  decoration: BoxDecoration(
                    color: c.card,
                    borderRadius: BorderRadius.circular(9),
                    border: Border.all(color: c.line),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        (sub['subject'] ?? '').toString().toUpperCase(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: c.muted),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        (top?['studentName'] ?? top?['name'] ?? '—').toString(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: c.text),
                      ),
                      Text(
                        '${top?['score'] ?? top?['total'] ?? '—'}',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: c.green),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _rankBadge(AppColors c, int rank) {
    final Color bg = rank == 1
        ? const Color(0xFFFFD700)
        : rank == 2
            ? const Color(0xFFC0C0C0)
            : rank == 3
                ? const Color(0xFFCD7F32)
                : c.card;
    return Container(
      width: 24,
      height: 24,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: bg, shape: BoxShape.circle, border: Border.all(color: c.line)),
      child: Text(
        '$rank',
        style: TextStyle(
          fontSize: 10.5,
          fontWeight: FontWeight.w800,
          color: rank <= 3 ? Colors.black : c.text,
        ),
      ),
    );
  }
}
