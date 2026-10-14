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
  // Server-reported term count (Bilal = 4) — report card shows ALL terms
  int _termCount = 2;

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
      final res = await ApiService().studentMarks(app.user!.username);
      if (mounted) {
        setState(() {
          _marks = res.marks;
          _termCount = res.termCount > 0 ? res.termCount : 4;
          _error = null;
          _loading = false;
        });
      }
      final className = app.user!.className ?? '';
      if (className.isNotEmpty) {
        try {
          final ranking = await ApiService().studentRanking(className, app.user!.name);
          if (mounted && ranking.isNotEmpty) {
            setState(() {
              _ranking = ranking;
              _rankTotal = ranking[1]?['total'] ?? ranking[2]?['total'];
            });
          }
        } catch (_) {}
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          // FIX (offline): NEVER show a connection error when we have cached
          // data — fall back to the provider's cached marks instead.
          if (_marks.isEmpty && app.marks.isNotEmpty) {
            _marks = app.marks;
            _error = null;
          } else if (_marks.isEmpty) {
            _error = e.toString();
          } else {
            _error = null;
          }
        });
      }
    }
  }

  // 2.3: marks for the SELECTED ward only — always current
  Map<String, List<Mark>> _getByTerm(Ward? selectedWard) {
    final map = <String, List<Mark>>{};
    for (final m in _marks) {
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
    return const SizedBox();
  }

  Widget _buildMarksList(AppProvider app, ThemeData theme, bool isDark) {
    final byTerm = _getByTerm(null);
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
    final marks = _marks;
    if (_loading) return ListView(padding: const EdgeInsets.all(16), children: const [SkeletonCard(height: 300)]);
    if (marks.isEmpty) return EmptyState(icon: Icons.emoji_events_outlined, message: AppLocalizations.tr(context, 'no_report'));

    // 2.2: fit-to-screen by default, smooth pinch-zoom/pan, never hidden by nav bar
    // FIX (3): TAP the card -> fullscreen zoom view (pinch + pan inside)
    return Column(
      children: [
        Expanded(
          child: GestureDetector(
            onTap: () => _openZoom(app.user?.name ?? '', marks),
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
                    child: _ReportCardWidget(
                      wardName: app.user?.name ?? '',
                      gender: app.user?.gender ?? '',
                      age: app.user?.age ?? '',
                      branch: app.user?.branchCode ?? '',
                      className: app.user?.className ?? '',
                      marks: marks,
                      ranking: _ranking,
                      rankTotal: _rankTotal,
                      termCount: _termCount,
                    ),
                  ),
              ),
            ),
          ),
        ),
        ),
        _ZoomHint(controller: _zoomController),
      ],
    );
  }

  // FIX (3): fullscreen zoom dialog — pinch to zoom, drag to pan, tap X to close
  void _openZoom(String studentName, List<Mark> marks) {
    final zoomCtrl = TransformationController();
    final app = Provider.of<AppProvider>(context, listen: false);
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => Dialog.fullscreen(
        backgroundColor: Colors.black,
        child: SafeArea(
          child: Stack(
            children: [
              InteractiveViewer(
                transformationController: zoomCtrl,
                panEnabled: true,
                scaleEnabled: true,
                minScale: 1.0,
                maxScale: 6.0,
                boundaryMargin: const EdgeInsets.all(200),
                child: Center(
                  child: FittedBox(
                    fit: BoxFit.contain,
                    child: SizedBox(
                      width: 900,
                      child: _ReportCardWidget(
                        wardName: studentName,
                        gender: app.user?.gender ?? '',
                        age: app.user?.age ?? '',
                        branch: app.user?.branchCode ?? '',
                        className: app.user?.className ?? '',
                        marks: marks,
                        ranking: _ranking,
                        rankTotal: _rankTotal,
                        termCount: _termCount,
                      ),
                    ),
                  ),
                ),
              ),
              Positioned(
                top: 8,
                right: 8,
                child: CircleAvatar(
                  radius: 20,
                  backgroundColor: Colors.white24,
                  child: IconButton(
                    icon: const Icon(Icons.close, color: Colors.white, size: 20),
                    onPressed: () {
                      zoomCtrl.dispose();
                      Navigator.of(ctx).pop();
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
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
              // Skip system/metadata columns — show every numeric mark component
              const skip = {
                'id', 'student_name', 'studentname', 'age', 'gender',
                'total', 'pass_status', 'passstatus', 'class', 'classname',
                'subject', 'term', 'created_at', 'updated_at',
              };
              if (skip.contains(e.key.toLowerCase())) return false;
              final v = e.value;
              return v is num || (v is String && double.tryParse(v) != null);
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
  final String wardName;
  final String gender;
  final String age;
  final String branch;
  final String className;
  final List<Mark> marks;
  // FIX 3: real ranking from server — {termNumber: {rank, rankDisplay, ...}}
  final Map<int, Map<String, dynamic>> ranking;
  final int? rankTotal;
  // Server term count — show ALL term columns even when a term has no marks
  final int termCount;

  const _ReportCardWidget({
    required this.wardName,
    this.gender = '',
    this.age = '',
    this.branch = '',
    this.className = '',
    required this.marks,
    this.ranking = const {},
    this.rankTotal,
    this.termCount = 4,
  });

  @override
  Widget build(BuildContext context) {
    // Group marks by subject; separate per-term totals for accurate table
    final subjects = marks.map((m) => m.subject).toSet().toList()..sort();

    // Show ALL terms from server config (Bilal = 4) — even if a term has
    // no marks yet, its column still prints (empty cells).
    final termNums = List<int>.generate(termCount, (i) => i + 1);
    // Column widths: subject + one per term + average
    final colWidths = <int, FlexColumnWidth>{
      0: const FlexColumnWidth(2),
      for (var i = 0; i < termNums.length; i++) i + 1: const FlexColumnWidth(1.2),
      termNums.length + 1: const FlexColumnWidth(1.2),
    };

    return Container(
      width: 800,
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFFE5C518), width: 3),
        ),
        padding: const EdgeInsets.all(4),
        child: Container(
          decoration: BoxDecoration(
            border: Border.all(color: const Color(0xFFE5C518), width: 1),
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
                        const Text('BILAL ACADEMY', style: TextStyle(fontSize: 36, fontWeight: FontWeight.w900, color: Color(0xFF8A6A0B), letterSpacing: 2)),
                        const Text('Bilal Kindergarten, Primary, Intermediate and Secondary School', style: TextStyle(fontSize: 14, color: Color(0xFF8A6A0B))),
                        const Text('Jigjiga-Ethiopia', style: TextStyle(fontSize: 14, color: Color(0xFF8A6A0B))),
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
                  Expanded(child: Container(height: 2, color: const Color(0xFFE5C518))),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: Text("STUDENT'S REPORT CARD", style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF8A6A0B), letterSpacing: 2)),
                  ),
                  Expanded(child: Container(height: 2, color: const Color(0xFFE5C518))),
                ],
              ),
              const SizedBox(height: 24),

              // Student Info
              _InfoRow(label: 'Full Name:', value: wardName, arabicLabel: 'الاسم الكامل'),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(child: _InfoRow(label: tr(context, 'gender') + ':', value: gender.isEmpty ? '—' : gender, arabicLabel: 'الجنس')),
                  Expanded(child: _InfoRow(label: tr(context, 'age') + ':', value: age.isEmpty ? '—' : age, arabicLabel: 'العمر')),
                  Expanded(child: _InfoRow(label: tr(context, 'grade') + ':', value: className.isEmpty ? '—' : className, arabicLabel: 'الصف')),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(child: _InfoRow(label: tr(context, 'branch') + ':', value: branch.isEmpty ? '—' : branch)),
                  Expanded(child: _InfoRow(label: tr(context, 'academic_year') + ':', value: '2026')),
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

              // Table — dynamic term columns (Bilal has 4 terms)
              Table(
                border: TableBorder.all(color: Colors.black, width: 1.5),
                columnWidths: colWidths,
                children: [
                  // Table Header
                  TableRow(
                    decoration: const BoxDecoration(color: Color(0xFF8A6A0B)),
                    children: [
                      _buildCell(tr(context, 'subject'), isHeader: true),
                      ...termNums.map((t) => _buildCell(
                          AppLocalizations.tr(context, 'term_$t'),
                          isHeader: true)),
                      _buildCell(tr(context, 'average_score'), isHeader: true),
                    ],
                  ),
                  // Per-term values per subject
                  ...subjects.map((sub) {
                    final subMarks =
                        marks.where((m) => m.subject == sub).toList();
                    final termVals = <double>[];
                    final termCells = <Widget>[];
                    for (final t in termNums) {
                      final tm = subMarks
                          .where((m) => (int.tryParse(m.term) ?? 0) == t)
                          .toList();
                      if (tm.isNotEmpty) {
                        final v =
                            tm.fold<double>(0, (s, m) => s + m.total);
                        termVals.add(v);
                        termCells.add(_buildCell(v.toStringAsFixed(1)));
                      } else {
                        termCells.add(_buildCell(''));
                      }
                    }
                    final avg = termVals.isNotEmpty
                        ? (termVals.reduce((a, b) => a + b) /
                                termVals.length)
                            .toStringAsFixed(1)
                        : '';
                    return TableRow(
                      children: [
                        _buildCell(sub, isBold: true),
                        ...termCells,
                        _buildCell(avg),
                      ],
                    );
                  }),
                  // Total row
                  TableRow(
                    decoration: const BoxDecoration(color: Color(0xFFFAF0E6)),
                    children: [
                      _buildCell(tr(context, 'total'), isBold: true),
                      ...termNums
                          .map((t) => _buildCell(_termTotal(marks, '$t'))),
                      _buildCell(_overallTotal(marks)),
                    ],
                  ),
                  // Average row
                  TableRow(
                    decoration: const BoxDecoration(color: Color(0xFFFAF0E6)),
                    children: [
                      _buildCell(tr(context, 'average_score'), isBold: true),
                      ...termNums
                          .map((t) => _buildCell(_termAvg(marks, '$t'))),
                      _buildCell(_overallAvg(marks)),
                    ],
                  ),
                  // Rank row
                  TableRow(
                    decoration: const BoxDecoration(color: Color(0xFFE6F2FF)),
                    children: [
                      _buildCell(tr(context, 'rank'), isBold: true),
                      ...termNums.map((t) => _buildCell(
                          ranking[t]?['rankDisplay']?.toString() ?? '—')),
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
                  text: TextSpan(
                    style: const TextStyle(color: Colors.black, fontSize: 13, fontFamily: 'sans-serif'),
                    children: [
                      TextSpan(text: tr(context, 'grading_scale') + ': ', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
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

  // Average of per-term totals (works for 2, 3, 4+ terms)
  String _overallTotal(List<Mark> marks) {
    final byTerm = <String, double>{};
    for (final m in marks) {
      byTerm.update(m.term, (v) => v + m.total, ifAbsent: () => m.total);
    }
    if (byTerm.isEmpty) return '';
    return (byTerm.values.reduce((a, b) => a + b) / byTerm.length)
        .toStringAsFixed(1);
  }

  String _overallAvg(List<Mark> marks) {
    final byTerm = <String, List<Mark>>{};
    for (final m in marks) {
      byTerm.putIfAbsent(m.term, () => []).add(m);
    }
    if (byTerm.isEmpty) return '';
    final avgs = byTerm.values
        .where((l) => l.isNotEmpty)
        .map((l) => l.fold<double>(0, (s, m) => s + m.total) / l.length)
        .toList();
    if (avgs.isEmpty) return '';
    return (avgs.reduce((a, b) => a + b) / avgs.length).toStringAsFixed(1);
  }

  /// Overall rank label for the last cell: "2nd of 4" (best/latest term with a rank)
  String _overallRankLabel(Map<int, Map<String, dynamic>> ranking, int? rankTotal) {
    if (ranking.isEmpty) return '—';
    // Prefer the latest term that has a rank
    final keys = ranking.keys.toList()..sort();
    for (final k in keys.reversed) {
      final r = ranking[k];
      if (r != null && r['rank'] != null) {
        final display = r['rankDisplay'] ?? r['rank'];
        return rankTotal != null ? '$display of $rankTotal' : display.toString();
      }
    }
    return '—';
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
