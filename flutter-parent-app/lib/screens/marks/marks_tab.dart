import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/api_service.dart';
import '../../app/app_provider.dart';
import '../../widgets/app_widgets.dart';
import '../../models/models.dart';
import '../../core/l10n/app_localizations.dart';

class MarksTab extends StatefulWidget {
  const MarksTab({super.key});
  @override
  State<MarksTab> createState() => _MarksTabState();
}

class _MarksTabState extends State<MarksTab> with SingleTickerProviderStateMixin {
  List<Mark> _marks = [];
  bool _loading = true;
  String? _error;
  late TabController _tabController;
  final TransformationController _zoomController = TransformationController();
  // FIX 3: real rank from server — {termNumber: {rank, rankDisplay, average}}
  Map<int, Map<String, dynamic>> _ranking = {};

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetch();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _zoomController.dispose();
    super.dispose();
  }

  Future<void> _fetch() async {
    final app = Provider.of<AppProvider>(context, listen: false);
    if (app.user == null || app.user!.username.isEmpty) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    // 2.4: show provider-cached marks instantly first (no blocking load)
    if (_marks.isEmpty && app.marks.isNotEmpty) {
      if (mounted) {
        setState(() {
          _marks = app.marks;
          _loading = false;
        });
      }
    }
    try {
      final res = await ApiService().guardianMarks(app.user!.username);
      if (mounted) {
        setState(() {
          _marks = res.marks;
          _error = null;
          _loading = _marks.isEmpty; // keep skeleton only if truly nothing
        });
      }
      // FIX 3: fetch REAL rank from server ranking endpoint (never block UI)
      final ward = app.selectedWard;
      if (ward != null && (ward.className ?? '').isNotEmpty) {
        try {
          final ranking = await ApiService()
              .studentRanking(ward.className!, ward.studentName);
          if (mounted && ranking.isNotEmpty) {
            setState(() {
              _ranking = ranking;
              _rankTotal = ranking[1]?['total'] ?? ranking[2]?['total'];
            });
          }
        } catch (_) {/* rank stays hidden on failure */}
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          if (_marks.isEmpty) _error = e.toString();
        });
      }
    }
  }

  // 2.3: marks for the SELECTED ward only — always current
  Map<String, List<Mark>> _getByTerm(Ward? selectedWard) {
    final map = <String, List<Mark>>{};
    if (selectedWard == null) return map;
    final filtered = _marks.where((m) => m.ward == selectedWard.studentName).toList();
    for (final m in filtered) {
      map.putIfAbsent(m.term, () => []).add(m);
    }
    return map;
  }

  @override
  Widget build(BuildContext context) {
    final app = Provider.of<AppProvider>(context);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return GradientBackground(
      child: Column(
        children: [
          // Ward Selector
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: _buildWardSelector(app, isDark, theme),
          ),

          // Tab Bar
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
              borderRadius: BorderRadius.circular(24),
            ),
            child: TabBar(
              controller: _tabController,
              indicatorSize: TabBarIndicatorSize.tab,
              indicator: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                color: AppColors.primary,
              ),
              labelColor: Colors.white,
              unselectedLabelColor: isDark ? Colors.white54 : AppColors.textMuted,
              tabs: [
                Tab(text: AppLocalizations.tr(context, 'ward_marks')),
                Tab(text: AppLocalizations.tr(context, 'report_card')),
              ],
            ),
          ),

          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildMarksList(app, theme, isDark),
                _buildReportCardPreview(app, theme, isDark),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWardSelector(AppProvider app, bool isDark, ThemeData theme) {
    if (app.wards.isEmpty) return const SizedBox();
    // FIX 2A: match by name — object identity breaks after provider rebuilds
    Ward selected = app.wards.first;
    for (final w in app.wards) {
      if (w.studentName == app.selectedWard?.studentName) {
        selected = w;
        break;
      }
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF2C2C2C) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.transparent : AppColors.border),
        boxShadow: isDark ? [] : [softShadow],
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<Ward>(
          value: selected,
          isExpanded: true,
          icon: Icon(Icons.expand_more, color: theme.primaryColor),
          dropdownColor: isDark ? const Color(0xFF2C2C2C) : Colors.white,
          items: app.wards.map((w) => DropdownMenuItem(
            value: w,
            child: Text(w.studentName, style: theme.textTheme.titleMedium),
          )).toList(),
          onChanged: (w) {
            if (w != null) app.selectWard(w);
          },
        ),
      ),
    );
  }

  Widget _buildMarksList(AppProvider app, ThemeData theme, bool isDark) {
    final byTerm = _getByTerm(app.selectedWard);
    final terms = byTerm.keys.toList()..sort();

    return RefreshIndicator(
      onRefresh: _fetch,
      child: ListView(
        padding: const EdgeInsets.only(left: 16, right: 16, bottom: 100),
        children: [
          if (_loading)
            const Padding(padding: EdgeInsets.only(top: 32), child: SkeletonCard(height: 150))
          else if (_error != null)
            EmptyState(icon: Icons.error_outline, message: _error!)
          else if (byTerm.isEmpty)
            EmptyState(icon: Icons.bar_chart_outlined, message: AppLocalizations.tr(context, 'no_marks'))
          else
            ...terms.map((term) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 4),
                  child: Text('${AppLocalizations.tr(context, 'term')} $term',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontSize: 18,
                        color: theme.primaryColor,
                      )),
                ),
                ...byTerm[term]!.map((m) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _SubjectCard(mark: m),
                )).toList(),
              ],
            )),
        ],
      ),
    );
  }

  // total ranked students in the ward's class (server ranking size)
  int? _rankTotal;

  Widget _buildReportCardPreview(AppProvider app, ThemeData theme, bool isDark) {
    final ward = app.selectedWard;
    // 2.3: strictly the selected ward's marks
    final marks = _marks.where((m) => m.ward == ward?.studentName).toList();
    if (_loading) return ListView(padding: const EdgeInsets.all(16), children: const [SkeletonCard(height: 300)]);
    if (ward == null || marks.isEmpty) return EmptyState(icon: Icons.emoji_events_outlined, message: AppLocalizations.tr(context, 'no_report'));

    // 2.2: fit-to-screen by default, smooth pinch-zoom/pan, never hidden by nav bar
    return Column(
      children: [
        Expanded(
          child: InteractiveViewer(
            transformationController: _zoomController,
            constrained: true,
            clipBehavior: Clip.none,
            panEnabled: true,
            scaleEnabled: true,
            minScale: 0.8,
            maxScale: 4.0,
            alignment: Alignment.topCenter,
            boundaryMargin: const EdgeInsets.all(80),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(12, 16, 12, 120), // bottom clears the floating nav bar
              child: FittedBox(
                fit: BoxFit.fitWidth,
                alignment: Alignment.topCenter,
                child: SizedBox(
                  width: 800,
                  child: _ReportCardWidget(ward: ward, marks: marks, ranking: _ranking, rankTotal: _rankTotal),
                ),
              ),
            ),
          ),
        ),
        _ZoomHint(controller: _zoomController),
      ],
    );
  }
}

/// 2.2: small reset button — one tap back to fit-to-screen
class _ZoomHint extends StatelessWidget {
  final TransformationController controller;
  const _ZoomHint({required this.controller});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<Matrix4>(
      valueListenable: controller,
      builder: (context, matrix, _) {
        final zoomed = matrix.getMaxScaleOnAxis() > 1.05;
        return AnimatedOpacity(
          duration: const Duration(milliseconds: 200),
          opacity: zoomed ? 1 : 0,
          child: Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: FloatingActionButton.small(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              onPressed: zoomed ? () => controller.value = Matrix4.identity() : null,
              child: const Icon(Icons.fit_screen_outlined, size: 18),
            ),
          ),
        );
      },
    );
  }
}

class _SubjectCard extends StatelessWidget {
  final Mark mark;
  const _SubjectCard({required this.mark});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final passed = mark.passStatus.toLowerCase() == 'pass';

    return AppCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2C2C2C) : AppColors.primarySoft,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.book_outlined, color: isDark ? Colors.white70 : AppColors.primary, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(mark.subject,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontSize: 16,
                    )),
              ),
              StatusPill(
                mark.passStatus,
                color: passed ? AppColors.success : AppColors.danger,
                bg: passed
                    ? (isDark ? AppColors.success.withOpacity(0.15) : AppColors.successSoft)
                    : (isDark ? AppColors.danger.withOpacity(0.15) : AppColors.dangerSoft),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: mark.details.entries.where((e) {
              const allowed = ['mid', 'final', 'test_1', 'test_2', 'practical_1', 'practical_2', 'book', 'test1', 'test2', 'practical1', 'practical2'];
              return allowed.contains(e.key.toLowerCase());
            }).map((e) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1A1A1A) : AppColors.surfaceAlt,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: isDark ? const Color(0xFF2C2C2C) : AppColors.border.withOpacity(0.5)),
                ),
                child: RichText(
                  text: TextSpan(
                    children: [
                      TextSpan(
                        text: '${_pretty(e.key)}: ',
                        style: TextStyle(fontSize: 13, color: theme.textTheme.bodyMedium?.color?.withOpacity(0.7)),
                      ),
                      TextSpan(
                        text: e.value.toString(),
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: theme.textTheme.bodyLarge?.color),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: isDark ? AppColors.primary.withOpacity(0.15) : AppColors.primarySoft,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.primary.withOpacity(0.2)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(AppLocalizations.tr(context, 'total_score'),
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: isDark ? Colors.white70 : AppColors.primaryDark,
                    )),
                Text('${mark.total.toInt()}/100',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 18,
                      color: isDark ? Colors.white : AppColors.primary,
                    )),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _pretty(String k) {
    final map = {
      'mid': 'Mid',
      'final': 'Final',
      'test1': 'Test 1',
      'test_1': 'Test 1',
      'test2': 'Test 2',
      'test_2': 'Test 2',
      'practical1': 'Practical 1',
      'practical_1': 'Practical 1',
      'practical2': 'Practical 2',
      'practical_2': 'Practical 2',
      'book': 'Book',
    };
    return map[k.toLowerCase()] ?? k;
  }
}

class _ReportCardWidget extends StatelessWidget {
  final Ward ward;
  final List<Mark> marks;
  // FIX 3: real ranking from server — {termNumber: {rank, rankDisplay, ...}}
  final Map<int, Map<String, dynamic>> ranking;
  final int? rankTotal;

  const _ReportCardWidget({
    required this.ward,
    required this.marks,
    this.ranking = const {},
    this.rankTotal,
  });

  @override
  Widget build(BuildContext context) {
    // Group marks by subject; separate per-term totals for accurate table
    final subjects = marks.map((m) => m.subject).toSet().toList()..sort();
    final totalMarks = marks.fold<double>(0, (sum, m) => sum + m.total);
    final avgMark = marks.isNotEmpty ? (totalMarks / marks.length) : 0.0;

    return Container(
      width: 800,
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFFD6631F), width: 3),
        ),
        padding: const EdgeInsets.all(4),
        child: Container(
          decoration: BoxDecoration(
            border: Border.all(color: const Color(0xFFD6631F), width: 1),
          ),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Image.asset('assets/images/logo.png', width: 120, height: 120, fit: BoxFit.contain),
                  Expanded(
                    child: Column(
                      children: [
                        const SizedBox(height: 16),
                        const Text('IQRA ACADEMY', style: TextStyle(fontSize: 36, fontWeight: FontWeight.w900, color: Color(0xFF982B21), letterSpacing: 2)),
                        const Text('Iqra Kindergarten, Primary, Intermediate and Secondary School', style: TextStyle(fontSize: 14, color: Color(0xFF982B21))),
                        const Text('Jigjiga-Ethiopia', style: TextStyle(fontSize: 14, color: Color(0xFF982B21))),
                      ],
                    ),
                  ),
                  const SizedBox(width: 120),
                ],
              ),
              const SizedBox(height: 16),

              // Title Row
              Row(
                children: [
                  Expanded(child: Container(height: 2, color: const Color(0xFFD6631F))),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: Text("STUDENT'S REPORT CARD", style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF982B21), letterSpacing: 2)),
                  ),
                  Expanded(child: Container(height: 2, color: const Color(0xFFD6631F))),
                ],
              ),
              const SizedBox(height: 24),

              // Student Info (2.3: selected ward's real data)
              _InfoRow(label: 'Full Name:', value: ward.studentName, arabicLabel: 'الاسم الكامل'),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(child: _InfoRow(label: 'Sex:', value: ward.gender ?? '—', arabicLabel: 'الجنس')),
                  Expanded(child: _InfoRow(label: 'Age:', value: ward.age?.toString() ?? '—', arabicLabel: 'العمر')),
                  Expanded(child: _InfoRow(label: 'Grade:', value: ward.className ?? '—', arabicLabel: 'الصف')),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(child: _InfoRow(label: 'Branch:', value: ward.schoolId)),
                  const Expanded(child: _InfoRow(label: 'Academic Year:', value: '2026')),
                ],
              ),
              const SizedBox(height: 16),

              // Signature Row
              Row(
                children: [
                  const Text("Parent's/Guardian's Signature: ", style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.black)),
                  Expanded(child: Container(margin: const EdgeInsets.only(top: 14, right: 16), height: 1, color: Colors.black)),
                  const Text("Date: ", style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.black)),
                  Container(margin: const EdgeInsets.only(top: 14), width: 100, height: 1, color: Colors.black),
                ],
              ),
              const SizedBox(height: 16),

              // Table
              Table(
                border: TableBorder.all(color: Colors.black, width: 1.5),
                columnWidths: const {
                  0: FlexColumnWidth(2),
                  1: FlexColumnWidth(1.5),
                  2: FlexColumnWidth(1.5),
                  3: FlexColumnWidth(1.5),
                },
                children: [
                  // Table Header
                  TableRow(
                    decoration: const BoxDecoration(color: Color(0xFF8B0000)),
                    children: [
                      _buildCell('Subject', isHeader: true),
                      _buildCell('1st Term', isHeader: true),
                      _buildCell('2nd Term', isHeader: true),
                      _buildCell('Average', isHeader: true),
                    ],
                  ),
                  // 2.3: per-term values per subject (correct data)
                  ...subjects.map((sub) {
                    final subMarks = marks.where((m) => m.subject == sub).toList();
                    final t1 = subMarks.where((m) => m.term == '1').toList();
                    final t2 = subMarks.where((m) => m.term == '2').toList();
                    final term1 = t1.isNotEmpty ? t1.first.total.toStringAsFixed(1) : '';
                    final term2 = t2.isNotEmpty ? t2.first.total.toStringAsFixed(1) : '';
                    final vals = <double>[
                      if (t1.isNotEmpty) t1.first.total,
                      if (t2.isNotEmpty) t2.first.total,
                    ];
                    final avg = vals.isNotEmpty
                        ? (vals.reduce((a, b) => a + b) / vals.length).toStringAsFixed(1)
                        : '';
                    return TableRow(
                      children: [
                        _buildCell(sub, isBold: true),
                        _buildCell(term1),
                        _buildCell(term2),
                        _buildCell(avg),
                      ],
                    );
                  }),
                  // Total — per-term sums; Average column = average of the two
                  // term totals (NOT the sum of every mark — that printed 529)
                  TableRow(
                    decoration: const BoxDecoration(color: Color(0xFFFAF0E6)),
                    children: [
                      _buildCell('Total', isBold: true),
                      _buildCell(_termTotal(marks, '1')),
                      _buildCell(_termTotal(marks, '2')),
                      _buildCell(_overallTotal(marks)),
                    ],
                  ),
                  // Average
                  TableRow(
                    decoration: const BoxDecoration(color: Color(0xFFFAF0E6)),
                    children: [
                      _buildCell('Average', isBold: true),
                      _buildCell(_termAvg(marks, '1')),
                      _buildCell(_termAvg(marks, '2')),
                      _buildCell(_overallAvg(marks)),
                    ],
                  ),
                  // FIX 3: Rank row — REAL rank from server's class ranking.
                  // Per-term rank + overall (best term with marks) + class size.
                  // No redundant labels: term1/term2/overall each shown once.
                  TableRow(
                    decoration: const BoxDecoration(color: Color(0xFFE6F2FF)),
                    children: [
                      _buildCell(tr(context, 'rank'), isBold: true),
                      _buildCell(ranking[1]?['rankDisplay']?.toString() ?? '—'),
                      _buildCell(ranking[2]?['rankDisplay']?.toString() ?? '—'),
                      _buildCell(_overallRankLabel(ranking, rankTotal)),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Grading Scale
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                decoration: BoxDecoration(border: Border.all(color: Colors.black, width: 1)),
                child: RichText(
                  text: const TextSpan(
                    style: TextStyle(color: Colors.black, fontSize: 13, fontFamily: 'sans-serif'),
                    children: [
                      TextSpan(text: 'Grading Scale: ', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                      TextSpan(text: ' A+ (90-100)   A (80-89)   B+ (70-79)   B (60-69)   C (50-59)   D (40-49)   F (< 40)'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 48),

              // Footer Signatures
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Column(
                    children: [
                      const Text('Class Teacher\'s Signature', style: TextStyle(fontSize: 14, color: Colors.black)),
                      const SizedBox(height: 32),
                      Container(width: 250, height: 1, color: Colors.black),
                    ],
                  ),
                  Column(
                    children: [
                      const Text('School Director\'s Signature', style: TextStyle(fontSize: 14, color: Colors.black)),
                      const SizedBox(height: 32),
                      Container(width: 250, height: 1, color: Colors.black),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 48),
            ],
          ),
        ),
      ),
    );
  }

  // FIX 3: Average column math — average of the two term totals, not the
  // grand sum of every mark (which printed e.g. 529 instead of ~264.5)
  String _overallTotal(List<Mark> marks) {
    final t1 = marks.where((m) => m.term == '1').toList();
    final t2 = marks.where((m) => m.term == '2').toList();
    if (t1.isEmpty && t2.isEmpty) return '';
    final s1 = t1.fold<double>(0, (s, m) => s + m.total);
    final s2 = t2.fold<double>(0, (s, m) => s + m.total);
    if (t1.isEmpty) return s2.toStringAsFixed(1);
    if (t2.isEmpty) return s1.toStringAsFixed(1);
    return ((s1 + s2) / 2).toStringAsFixed(1);
  }

  String _overallAvg(List<Mark> marks) {
    final t1 = marks.where((m) => m.term == '1').toList();
    final t2 = marks.where((m) => m.term == '2').toList();
    if (t1.isEmpty && t2.isEmpty) return '';
    final a1 = t1.isNotEmpty ? t1.fold<double>(0, (s, m) => s + m.total) / t1.length : null;
    final a2 = t2.isNotEmpty ? t2.fold<double>(0, (s, m) => s + m.total) / t2.length : null;
    if (a1 == null) return a2!.toStringAsFixed(1);
    if (a2 == null) return a1.toStringAsFixed(1);
    return ((a1 + a2) / 2).toStringAsFixed(1);
  }

  /// Overall rank label for the last cell: "2nd of 4" (best of available terms)
  String _overallRankLabel(Map<int, Map<String, dynamic>> ranking, int? rankTotal) {
    final r1 = ranking[1]?['rank'];
    final r2 = ranking[2]?['rank'];
    if (r1 == null && r2 == null) return '—';
    // use the term with marks; prefer the LATEST term that has a rank
    final rank = r2 ?? r1;
    final display = ranking[2]?['rankDisplay'] ?? ranking[1]?['rankDisplay'] ?? '$rank';
    return rankTotal != null ? '$display of $rankTotal' : display.toString();
  }

  String _termTotal(List<Mark> marks, String term) {
    final t = marks.where((m) => m.term == term).toList();
    if (t.isEmpty) return '';
    return t.fold<double>(0, (s, m) => s + m.total).toStringAsFixed(1);
  }

  String _termAvg(List<Mark> marks, String term) {
    final t = marks.where((m) => m.term == term).toList();
    if (t.isEmpty) return '';
    return (t.fold<double>(0, (s, m) => s + m.total) / t.length).toStringAsFixed(1);
  }

  Widget _buildCell(String text, {bool isHeader = false, bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: TextStyle(
          color: isHeader ? Colors.white : Colors.black,
          fontWeight: (isHeader || isBold) ? FontWeight.bold : FontWeight.normal,
          fontSize: isHeader ? 15 : 14,
          fontFamily: 'sans-serif',
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final String? arabicLabel;

  const _InfoRow({required this.label, required this.value, this.arabicLabel});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.black)),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.only(bottom: 2),
          decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Colors.black, width: 1))),
          child: Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.black)),
        ),
        if (arabicLabel != null) ...[
          const SizedBox(width: 8),
          Text(arabicLabel!, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        ],
      ],
    );
  }
}
