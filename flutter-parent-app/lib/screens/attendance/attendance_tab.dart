import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/api_service.dart';
import '../../app/app_provider.dart';
import '../../widgets/app_widgets.dart';
import '../../models/models.dart';
import '../../core/l10n/app_localizations.dart';

class AttendanceTab extends StatefulWidget {
  const AttendanceTab({super.key});
  @override
  State<AttendanceTab> createState() => _AttendanceTabState();
}

class _AttendanceTabState extends State<AttendanceTab> {
  AttendanceSummary? _summary;
  List<AttendanceDay> _days = [];
  bool _loading = true;
  late int _selectedMonth;
  late int _selectedYear;
  Ward? _lastWard;

  static const _months = [
    'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir',
    'Yekatit', 'Megabit', 'Miyazia', 'Ginbot', 'Sene',
    'Hamle', 'Nehase', 'Pagume'
  ];

  // Ethiopian date today (approx conversion for default selection)
  static int get _ethYear => DateTime.now().year - 7;
  static int get _ethMonth {
    final g = DateTime.now();
    // Ethiopian new year starts Sep 11 (Meskerem 1)
    const newYearMonth = 9;
    const newYearDay = 11;
    if (g.month > newYearMonth ||
        (g.month == newYearMonth && g.day >= newYearDay)) {
      return g.month - newYearMonth + 1; // Sep->1, Oct->2 ...
    }
    return g.month + 4; // Jan->5 ... Aug->12
  }

  @override
  void initState() {
    super.initState();
    // 5.1: default to CURRENT Ethiopian month/year
    _selectedYear = _ethYear;
    _selectedMonth = _ethMonth.clamp(1, 13);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final app = Provider.of<AppProvider>(context);
    if (_lastWard != app.selectedWard) {
      _lastWard = app.selectedWard;
      Future.microtask(_fetch);
    }
  }

  String _cacheKey(Ward w) => '${w.schoolId}:${w.className}:${_selectedYear}:${_selectedMonth}';

  Future<void> _fetch() async {
    final app = Provider.of<AppProvider>(context, listen: false);
    if (app.user == null || app.selectedWard == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }

    // 5.4: instant ward switching — cached month data shows first
    final cached = app.cachedAttendance(_cacheKey(app.selectedWard!));
    if (cached != null && _days.isEmpty) {
      if (mounted) {
        setState(() {
          _summary = cached.summary;
          _days = cached.days;
          _loading = false;
        });
      }
    }

    if (mounted) setState(() => _loading = true);
    try {
      final summary = await ApiService().monthlySummary(
        app.selectedWard!.className ?? '',
        app.selectedWard!.schoolId,
        year: _selectedYear,
        month: _selectedMonth,
      );
      final days = await ApiService().studentAttendance(
        app.selectedWard!.className ?? '',
        app.selectedWard!.schoolId,
        year: _selectedYear,
        month: _selectedMonth,
      );
      app.cacheAttendance(
        _cacheKey(app.selectedWard!),
        AttendanceMonth(days: days, summary: summary),
      );
      if (mounted) {
        setState(() {
          _summary = summary;
          _days = days;
        });
      }
    } catch (_) {
      // offline: keep cached data if fetch fails
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = Provider.of<AppProvider>(context);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final years = List.generate(5, (i) => _ethYear - i);
    final isCurrentMonth = _selectedMonth == _ethMonth && _selectedYear == _ethYear;

    return GradientBackground(
      child: RefreshIndicator(
        onRefresh: _fetch,
        child: ListView(
          padding: const EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 100),
          children: [
            SectionTitle(AppLocalizations.tr(context, 'student_attendance')),
            if (app.wards.isNotEmpty)
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2C2C2C) : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: isDark ? Colors.transparent : AppColors.border),
                  boxShadow: isDark ? [] : [softShadow],
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<Ward>(
                    value: app.selectedWard,
                    isExpanded: true,
                    icon: Icon(Icons.expand_more, color: theme.primaryColor),
                    dropdownColor: isDark ? const Color(0xFF2C2C2C) : Colors.white,
                    items: app.wards.map((w) => DropdownMenuItem(
                      value: w,
                      child: Text(w.studentName, style: theme.textTheme.titleMedium),
                    )).toList(),
                    onChanged: (w) {
                      if (w != null) {
                        app.selectWard(w);
                        _fetch();
                      }
                    },
                  ),
                ),
              ),

            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF2C2C2C) : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: isDark ? Colors.transparent : AppColors.border),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<int>(
                        value: _selectedMonth,
                        isExpanded: true,
                        icon: Icon(Icons.expand_more, color: theme.primaryColor),
                        dropdownColor: isDark ? const Color(0xFF2C2C2C) : Colors.white,
                        items: List.generate(13, (i) => DropdownMenuItem(
                          value: i + 1,
                          child: Text(_months[i], style: theme.textTheme.bodyLarge),
                        )),
                        onChanged: (v) {
                          if (v != null) {
                            setState(() {
                              _selectedMonth = v;
                              _days = []; // force re-fetch for new month
                            });
                            _fetch();
                          }
                        },
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF2C2C2C) : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: isDark ? Colors.transparent : AppColors.border),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<int>(
                        value: _selectedYear,
                        isExpanded: true,
                        icon: Icon(Icons.expand_more, color: theme.primaryColor),
                        dropdownColor: isDark ? const Color(0xFF2C2C2C) : Colors.white,
                        items: years.map((y) => DropdownMenuItem(
                          value: y,
                          child: Text('$y', style: theme.textTheme.bodyLarge),
                        )).toList(),
                        onChanged: (v) {
                          if (v != null) {
                            setState(() {
                              _selectedYear = v;
                              _days = [];
                            });
                            _fetch();
                          }
                        },
                      ),
                    ),
                  ),
                ),
              ],
            ),
            // 5.1: quick "This Month" chip
            if (!isCurrentMonth)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Align(
                  alignment: Alignment.centerRight,
                  child: TextButton.icon(
                    onPressed: () {
                      setState(() {
                        _selectedYear = _ethYear;
                        _selectedMonth = _ethMonth.clamp(1, 13);
                        _days = [];
                      });
                      _fetch();
                    },
                    icon: const Icon(Icons.today, size: 16),
                    label: const Text('This Month', style: TextStyle(fontSize: 12)),
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 16),

            if (_loading && _days.isEmpty)
              const Column(children: [
                SkeletonCard(height: 160),
                SizedBox(height: 14),
                SkeletonCard(height: 240),
              ])
            else if (_summary == null)
              EmptyState(
                  icon: Icons.calendar_today_outlined,
                  message: AppLocalizations.tr(context, 'no_attendance'))
            else ...[
              // 5.3: Monthly summary (present/absent/late/permission)
              AppCard(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    Row(
                      children: [
                        SizedBox(
                          width: 100,
                          height: 100,
                          child: Stack(
                            children: [
                              Center(
                                child: SizedBox(
                                  width: 100,
                                  height: 100,
                                  child: CircularProgressIndicator(
                                    value: (_summary!.percentage > 0 ? _summary!.percentage : _summary!.rate) / 100,
                                    strokeWidth: 10,
                                    backgroundColor: isDark ? const Color(0xFF3C3C3C) : AppColors.primaryLight,
                                    color: AppColors.primary,
                                    strokeCap: StrokeCap.round,
                                  ),
                                ),
                              ),
                              Center(
                                child: Text(
                                  '${(_summary!.percentage > 0 ? _summary!.percentage : _summary!.rate).toInt()}%',
                                  style: TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.w900,
                                    color: isDark ? Colors.white : AppColors.primaryDark,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 24),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _StatRow(AppLocalizations.tr(context, 'present'), _summary!.present, AppColors.success),
                              const SizedBox(height: 8),
                              _StatRow(AppLocalizations.tr(context, 'absent'), _summary!.absent, AppColors.danger),
                              const SizedBox(height: 8),
                              _StatRow(AppLocalizations.tr(context, 'late'), _summary!.late, AppColors.accent),
                              const SizedBox(height: 8),
                              _StatRow(AppLocalizations.tr(context, 'leave'), _summary!.leave, Colors.purple),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // 5.3: Weekly breakdown
              if (_days.isNotEmpty) ..._buildWeeklyBreakdown(isDark),

              const SizedBox(height: 16),
              if (_days.isNotEmpty)
                AppCard(
                  padding: EdgeInsets.zero,
                  child: ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _days.length,
                    separatorBuilder: (_, __) => Divider(height: 1, color: isDark ? const Color(0xFF2C2C2C) : AppColors.border),
                    itemBuilder: (context, index) {
                      final day = _days[index];
                      final status = day.status.toLowerCase();

                      Color color = AppColors.textSecondary;
                      IconData icon = Icons.help_outline;
                      String title = day.status;

                      if (status.contains('present')) {
                        color = AppColors.success;
                        icon = Icons.check_circle;
                        title = AppLocalizations.tr(context, 'present');
                      } else if (status.contains('absent')) {
                        color = AppColors.danger;
                        icon = Icons.cancel;
                        title = AppLocalizations.tr(context, 'absent');
                      } else if (status.contains('late')) {
                        color = AppColors.accent;
                        icon = Icons.schedule;
                        title = AppLocalizations.tr(context, 'late');
                      } else if (status.contains('leave') || status.contains('permission')) {
                        color = Colors.purple;
                        icon = Icons.home;
                        title = AppLocalizations.tr(context, 'leave');
                      }

                      return ListTile(
                        leading: Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF2C2C2C) : Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              // 5.2: dd/mm/yyyy date instead of weekday-only
                              Text(
                                _formatEthiopianDate(day.day),
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                textAlign: TextAlign.center,
                              ),
                              Text(
                                day.dayOfWeek.substring(0, day.dayOfWeek.length >= 3 ? 3 : 1).toUpperCase(),
                                style: const TextStyle(fontSize: 9, color: Colors.grey),
                              ),
                            ],
                          ),
                        ),
                        title: Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: color)),
                        // 5.2: check-in time kept alongside
                        subtitle: (day.checkInTime?.isNotEmpty ?? false)
                            ? Text('Check-in: ${_formatTime(day.checkInTime!)}', style: const TextStyle(fontSize: 12))
                            : null,
                        trailing: Icon(icon, color: color),
                      );
                    },
                  ),
                )
            ],
          ],
        ),
      ),
    );
  }

  // 5.2: Ethiopian day-of-month -> dd/mm/yyyy (Ethiopian year from selection)
  String _formatEthiopianDate(int day) {
    final dd = day.toString().padLeft(2, '0');
    final mm = _selectedMonth.toString().padLeft(2, '0');
    return '$dd/$mm/$_selectedYear';
  }

  String _formatTime(String t) {
    // API may return HH:MM:SS or ISO — show HH:MM only
    if (t.contains('T')) {
      final timePart = t.split('T')[1];
      return timePart.length >= 5 ? timePart.substring(0, 5) : timePart;
    }
    return t.length >= 5 ? t.substring(0, 5) : t;
  }

  // 5.3: weekly summary cards
  List<Widget> _buildWeeklyBreakdown(bool isDark) {
    final weeks = <int, List<AttendanceDay>>{};
    for (final d in _days) {
      final week = ((d.day - 1) ~/ 7) + 1;
      weeks.putIfAbsent(week, () => []).add(d);
    }
    final sortedWeeks = weeks.keys.toList()..sort();

    return [
      AppCard(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Weekly Summary',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 14,
                  color: isDark ? Colors.white : AppColors.text,
                )),
            const SizedBox(height: 12),
            ...sortedWeeks.map((w) {
              final days = weeks[w]!;
              int present = 0, absent = 0, late = 0, leave = 0;
              for (final d in days) {
                final s = d.status.toLowerCase();
                if (s.contains('present')) present++;
                else if (s.contains('absent')) absent++;
                else if (s.contains('late')) late++;
                else if (s.contains('leave') || s.contains('permission')) leave++;
              }
              final range = 'Days ${days.first.day}–${days.last.day}';
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    SizedBox(
                      width: 80,
                      child: Text('Week $w\n$range',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, height: 1.3)),
                    ),
                    Expanded(
                      child: Row(
                        children: [
                          _WeekChip('P', present, AppColors.success),
                          const SizedBox(width: 6),
                          _WeekChip('A', absent, AppColors.danger),
                          const SizedBox(width: 6),
                          _WeekChip('L', late, AppColors.accent),
                          const SizedBox(width: 6),
                          _WeekChip('Lv', leave, Colors.purple),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    ];
  }
}

class _WeekChip extends StatelessWidget {
  final String label;
  final int count;
  final Color color;
  const _WeekChip(this.label, this.count, this.color);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 6),
        decoration: BoxDecoration(
          color: count > 0 ? color.withOpacity(isDark ? 0.18 : 0.12) : (isDark ? Colors.white.withValues(alpha: 0.05) : Colors.grey.shade200),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Text('$count', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: count > 0 ? color : (isDark ? Colors.white38 : Colors.grey))),
            Text(label, style: TextStyle(fontSize: 9, color: count > 0 ? color : (isDark ? Colors.white38 : Colors.grey))),
          ],
        ),
      ),
    );
  }
}

class _StatRow extends StatelessWidget {
  final String label;
  final int val;
  final Color color;
  const _StatRow(this.label, this.val, this.color);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
            const SizedBox(width: 8),
            Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
          ],
        ),
        Text('$val', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
      ],
    );
  }
}
