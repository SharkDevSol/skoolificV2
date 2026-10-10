import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/services/api_service.dart';
import '../../core/services/offline_service.dart';
import '../../core/utils/class_id.dart';
import '../../core/utils/ethiopian_date.dart';
import '../../widgets/app_widgets.dart';
import '../../app/app_provider.dart';
import '../../models/models.dart';

class AttendanceTab extends StatefulWidget {
  const AttendanceTab({super.key});

  @override
  State<AttendanceTab> createState() => _AttendanceTabState();
}

class _AttendanceTabState extends State<AttendanceTab> {
  String? _selectedClass;
  DateTime _weekStart = _mondayOf(DateTime.now());
  String _selectedDay = 'monday';
  String _searchQuery = '';
  bool _loading = false;
  bool _saving = false;
  bool _dirty = false;
  bool _persisting = false;
  bool _offlineData = false;
  int _pendingSync = 0;
  bool _manuallyNavigated = false;
  List<String> _schoolDays = const [];

  // Report tab: per-student monthly totals + rankings, Ethiopian month.
  int _pageTab = 0; // 0 = attendance grid, 1 = report
  int _reportMonthOffset = 0; // 0 = current Ethiopian month, -1 = previous…
  bool _reportLoading = false;
  _MonthReport? _report;

  List<StudentAttendanceItem> _students = [];

  static const List<String> _days = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ];
  static const List<String> _statuses = ['', 'P', 'A', 'L', 'E'];

  static DateTime _mondayOf(DateTime d) {
    final daysFromMonday = (d.weekday + 6) % 7; // Mon = 0
    return DateTime(d.year, d.month, d.day).subtract(Duration(days: daysFromMonday));
  }

  static String _ymd(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  String get _cacheKey =>
      'weekly_${_selectedClass ?? 'none'}_${_ymd(_weekStart)}'.replaceAll(RegExp(r'[^\w-]'), '_');

  int get _globalStaffId =>
      Provider.of<AppProvider>(context, listen: false).profile?.globalStaffId ??
      Provider.of<AppProvider>(context, listen: false).user?.globalStaffId ??
      0;

  @override
  void initState() {
    super.initState();
    OfflineService.init();
    _pendingSync = OfflineService.pendingCount;
    _selectedDay = _days[(DateTime.now().weekday + 6) % 7];
    final prov = Provider.of<AppProvider>(context, listen: false);
    if (prov.assignedClasses.isNotEmpty) {
      _selectedClass = prov.selectedClass ?? prov.assignedClasses.first;
      _load();
    }
    ApiService().getSchoolDays().then((d) {
      if (mounted) setState(() => _schoolDays = d);
    });
  }

  Future<void> _load() async {
    if (_selectedClass == null) return;
    setState(() {
      _loading = true;
      _offlineData = false;
    });

    final online = await OfflineService.isOnline();
    if (online) {
      await OfflineService.flush();
      if (mounted) setState(() => _pendingSync = OfflineService.pendingCount);
    }

    if (!online) {
      _loadFromCache();
      if (mounted) setState(() => _loading = false);
      return;
    }

    try {
      var res = await ApiService().getWeeklyAttendance(
        className: _selectedClass!,
        weekStart: _ymd(_weekStart),
      );
      if (res['exists'] != true) {
        final created = await ApiService().createWeeklyAttendance(
          className: _selectedClass!,
          weekStart: _ymd(_weekStart),
          globalStaffId: _globalStaffId,
        );
        if (created) {
          res = await ApiService().getWeeklyAttendance(
            className: _selectedClass!,
            weekStart: _ymd(_weekStart),
          );
        }
      }
      var rows = _rowsFromPayload(res);
      if (rows.isEmpty) {
        rows = (await ApiService().getClassStudents(_selectedClass!))
            .map((s) => StudentAttendanceItem.fromJson(s))
            .toList();
      }
      _apply(rows, fromCache: false);
      await OfflineService.cache(_cacheKey, {
        'exists': true,
        'data': _students.map(_cacheRecord).toList(),
      });
      // Shared roster so Discipline can show names offline too.
      if (_students.isNotEmpty) {
        await OfflineService.cache(
            'class_students_$_selectedClass',
            _students
                .map((s) => {
                      'student_name': s.studentName,
                      'school_id': s.studentId,
                      'class_id': s.classId,
                    })
                .toList());
      }
    } catch (_) {
      final cached = OfflineService.readCache<Map<String, dynamic>>(_cacheKey);
      if (cached != null) {
        _apply(_rowsFromPayload(cached), fromCache: true);
      } else {
        try {
          final students = await ApiService().getClassStudents(_selectedClass!);
          _apply(students.map((s) => StudentAttendanceItem.fromJson(s)).toList(),
              fromCache: false);
        } catch (_) {
          _apply(const <StudentAttendanceItem>[], fromCache: false);
        }
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<StudentAttendanceItem> _rowsFromPayload(Map<String, dynamic> payload) {
    final data = payload['data'];
    if (data is! List) return <StudentAttendanceItem>[];
    return data
        .map((e) => StudentAttendanceItem.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  /// Cache record = PUT record + name, so offline rows keep student names.
  Map<String, dynamic> _cacheRecord(StudentAttendanceItem s) =>
      {...s.toRecord(), 'student_name': s.studentName};

  void _apply(List<StudentAttendanceItem> rows, {required bool fromCache}) {
    rows.sort((a, b) {
      final ai = int.tryParse(a.classId) ?? 0;
      final bi = int.tryParse(b.classId) ?? 0;
      if (ai != bi) return ai.compareTo(bi);
      return a.studentName.toLowerCase().compareTo(b.studentName.toLowerCase());
    });
    _students = rows;
    _offlineData = fromCache;
  }

  void _loadFromCache() {
    final cached = OfflineService.readCache<Map<String, dynamic>>(_cacheKey);
    if (cached != null) {
      _apply(_rowsFromPayload(cached), fromCache: true);
    } else {
      _apply(const <StudentAttendanceItem>[], fromCache: true);
    }
  }

  /// Autosave: runs every time a status changes (serialized, re-runs if dirty).
  Future<void> _persist() async {
    _dirty = true;
    if (_persisting) return;
    _persisting = true;
    setState(() => _saving = true);

    while (_dirty) {
      _dirty = false;
      final records = _students.map((s) => s.toRecord()).toList();
      final payload = {
        'className': _selectedClass,
        'weekStart': _ymd(_weekStart),
        'globalStaffId': _globalStaffId,
        'records': records,
      };

      var ok = false;
      final online = await OfflineService.isOnline();
      if (online) {
        try {
          ok = await ApiService().updateWeeklyAttendance(
            className: _selectedClass!,
            weekStart: _ymd(_weekStart),
            globalStaffId: _globalStaffId,
            records: records,
          );
        } catch (_) {
          ok = false;
        }
        if (ok) await OfflineService.flush();
      }

      if (!ok) {
        await OfflineService.enqueue('weekly_attendance', payload);
      }

      await OfflineService.cache(
          _cacheKey,
          {
            'exists': true,
            'data': _students.map(_cacheRecord).toList(),
          });

      if (mounted) {
        setState(() {
          _offlineData = !ok;
          _pendingSync = OfflineService.pendingCount;
        });
      }
    }

    _persisting = false;
    if (mounted) setState(() => _saving = false);
  }

  void _setStatus(StudentAttendanceItem item, String day, String status) {
    item.setDay(day, status);
    setState(() {});
    _persist();
  }

  String _getStatus(StudentAttendanceItem item, String day) {
    final v = item.day(day).toUpperCase();
    return _statuses.contains(v) ? v : '';
  }

  void _markAllPresent() {
    for (final s in _students) {
      s.setDay(_selectedDay, 'P');
    }
    setState(() {});
    _persist();
  }

  void _shiftWeek(int weeks) {
    setState(() {
      _manuallyNavigated = true;
      _weekStart = _weekStart.add(Duration(days: 7 * weeks));
    });
    _load();
  }

  /// Jump back to the week containing today (local date math — works offline).
  void _goToCurrentWeek() {
    setState(() {
      _manuallyNavigated = false;
      _weekStart = _mondayOf(DateTime.now());
      _selectedDay = _days[(DateTime.now().weekday + 6) % 7];
    });
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final prov = Provider.of<AppProvider>(context);

    if (!prov.isClassTeacher && prov.assignedClasses.isEmpty) {
      return Center(
        child: EmptyState(
          icon: Icons.person_off_outlined,
          message: tr(context, 'not_class_teacher'),
        ),
      );
    }

    // Assigned classes may arrive after this tab first built (slow refresh).
    if (_selectedClass == null && prov.assignedClasses.isNotEmpty) {
      _selectedClass = prov.selectedClass ?? prov.assignedClasses.first;
      Future.microtask(_load);
    }

    // Auto-open the week that contains today (e.g. when a new week starts the
    // page moves forward by itself). Pure local date math — works offline.
    // Manual prev/next navigation is respected until the week label is tapped.
    if (!_manuallyNavigated) {
      final nowWeek = _mondayOf(DateTime.now());
      if (_weekStart != nowWeek) {
        _weekStart = nowWeek;
        _selectedDay = _days[(DateTime.now().weekday + 6) % 7];
        if (_selectedClass != null) Future.microtask(_load);
      }
    }

    final filtered = _students.where((s) {
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      return s.studentName.toLowerCase().contains(q) ||
          classIdLabel(s.classId).toLowerCase().contains(q) ||
          s.classId.contains(q);
    }).toList();

    return Scaffold(
      body: Stack(
        children: [
          Column(
            children: [
              _buildHeader(context, prov, isDark),
              _pageToggle(isDark),
              Expanded(
                child: _pageTab == 1
                    ? _buildReportView(isDark)
                    : _loading
                        ? const Center(child: AppLoadingIndicator())
                        : filtered.isEmpty
                            ? EmptyState(
                                icon: Icons.group_outlined, message: tr(context, 'no_records'))
                            : _buildTable(filtered, isDark),
              ),
              // Clears the floating "auto-saved" pill (bottom:104 + ~46px
              // tall ≈ 150) so the pill never covers the last student row.
              const SizedBox(height: 160),
            ],
          ),
          if (_pageTab == 0)
            Positioned(
            left: 16,
            right: 16,
            bottom: 104, // clears the floating nav (65px) + offset
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: isDark ? const Color(0xFF2C2C2C) : AppColors.border),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(isDark ? 0.5 : 0.12),
                    blurRadius: 14,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: Row(
                children: [
                  StatusPill(
                    _saving
                        ? tr(context, 'saving')
                        : (_pendingSync > 0 || _offlineData)
                            ? '↻ $_pendingSync ${tr(context, 'pending_sync')}'
                            : tr(context, 'auto_saved'),
                    color: (_pendingSync > 0 || _offlineData || _saving)
                        ? AppColors.accent
                        : AppColors.success,
                    bg: (_pendingSync > 0 || _offlineData || _saving)
                        ? AppColors.accent.withOpacity(0.15)
                        : AppColors.successSoft,
                  ),
                  const Spacer(),
                  if (_pendingSync > 0)
                    TextButton.icon(
                      onPressed: () async {
                        final left = await OfflineService.flush();
                        if (mounted) setState(() => _pendingSync = left);
                        if (mounted && left == 0) showSuccess(context, tr(context, 'synced'));
                      },
                      icon: const Icon(Icons.sync, size: 16),
                      label: Text(tr(context, 'sync'), style: const TextStyle(fontSize: 12)),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ------------------------------------------------------------------ header

  Widget _buildHeader(BuildContext context, AppProvider prov, bool isDark) {
    final weekEnd = _weekStart.add(const Duration(days: 6));
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                flex: 2,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF2C2C2C) : AppColors.surfaceAlt,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      value: _selectedClass,
                      hint: Text(tr(context, 'class_label'), style: const TextStyle(fontSize: 13)),
                      items: prov.assignedClasses.map((c) {
                        return DropdownMenuItem(
                          value: c,
                          child: Text(c,
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val == null) return;
                        setState(() => _selectedClass = val);
                        prov.setSelectedClass(val);
                        _load();
                        if (_pageTab == 1) _loadReport();
                      },
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 4,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF2C2C2C) : AppColors.surfaceAlt,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.chevron_left, size: 20),
                        onPressed: () => _shiftWeek(-1),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: _goToCurrentWeek,
                          child: Column(
                            children: [
                              Text(
                                _weekRangeLabel(_weekStart, weekEnd),
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
                                textAlign: TextAlign.center,
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                '${EthiopianDate.fromGregorian(_weekStart).year} E.C.',
                                style: const TextStyle(
                                    fontSize: 10, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.chevron_right, size: 20),
                        onPressed: () => _shiftWeek(1),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 36,
                  child: TextField(
                    decoration: InputDecoration(
                      hintText: 'Search student...',
                      prefixIcon: const Icon(Icons.search, size: 16),
                      contentPadding: EdgeInsets.zero,
                      fillColor: isDark ? const Color(0xFF2C2C2C) : AppColors.surfaceAlt,
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(30), borderSide: BorderSide.none),
                    ),
                    onChanged: (q) => setState(() => _searchQuery = q),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: _markAllPresent,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.successSoft,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.success.withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check, size: 14, color: AppColors.success),
                      const SizedBox(width: 4),
                      Text(
                        '${tr(context, 'mark_all_present')} (${_selectedDay.substring(0, 3)})',
                        style: const TextStyle(
                            color: AppColors.success,
                            fontSize: 11,
                            fontWeight: FontWeight.w800),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 34,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: _days.map((d) {
                final isSelected = _selectedDay == d;
                final isSchoolDay = _schoolDays.isEmpty || _schoolDays.contains(d);
                final date = _weekStart.add(Duration(days: _days.indexOf(d)));
                return GestureDetector(
                  onTap: () => setState(() => _selectedDay = d),
                  child: Container(
                    margin: const EdgeInsets.only(right: 6),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.primary
                          : (isDark ? const Color(0xFF2C2C2C) : AppColors.surfaceAlt),
                      borderRadius: BorderRadius.circular(12),
                      border: isSchoolDay
                          ? null
                          : Border.all(color: AppColors.textMuted.withOpacity(0.4)),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          d.substring(0, 3).toUpperCase(),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: isSelected ? Colors.white : (isDark ? Colors.white70 : AppColors.text),
                          ),
                        ),
                        Text(
                          '${EthiopianDate.fromGregorian(date).day}',
                          style: TextStyle(
                            fontSize: 9,
                            color: isSelected
                                ? Colors.white70
                                : (isDark ? Colors.white54 : AppColors.textSecondary),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  /// "Meskerem 18 – 24, 2019" (or cross-month: "Nehase 28 – Meskerem 3").
  String _weekRangeLabel(DateTime a, DateTime b) {
    final ea = EthiopianDate.fromGregorian(a);
    final eb = EthiopianDate.fromGregorian(b);
    if (ea.month == eb.month && ea.year == eb.year) {
      return '${ea.monthName} ${ea.day} – ${eb.day}, ${ea.year}';
    }
    return '${ea.monthName} ${ea.day} – ${eb.monthName} ${eb.day}, ${eb.year}';
  }

  // ------------------------------------------------------------------ table

  Widget _buildTable(List<StudentAttendanceItem> students, bool isDark) {
    // Single-day view: only the selected day's column is shown (picked via the
    // day buttons in the header). The status dropdown only holds P/A/L/E, so
    // it gets a fixed narrow width and student names take the rest — before,
    // names were capped at 40% of the screen and truncated behind the wide
    // dropdown.
    final screenW = MediaQuery.of(context).size.width;
    const numWidth = 40.0;
    const dayWidth = 110.0;
    final nameWidth = (screenW - numWidth - dayWidth).clamp(150.0, 320.0).toDouble();
    final totalWidth = numWidth + nameWidth + dayWidth;
    final dayDate = _weekStart.add(Duration(days: _days.indexOf(_selectedDay)));

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const ClampingScrollPhysics(),
      child: SizedBox(
        width: totalWidth,
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8),
              color: AppColors.primarySoft,
              child: Row(
                children: [
                  SizedBox(
                    width: numWidth,
                    child: Text(
                      '#',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.primary),
                    ),
                  ),
                  SizedBox(
                    width: nameWidth,
                    child: Padding(
                      padding: const EdgeInsets.only(left: 8),
                      child: Text(
                        tr(context, 'student'),
                        style: const TextStyle(
                            fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.primary),
                      ),
                    ),
                  ),
                  Container(
                    width: dayWidth,
                    color: AppColors.primary.withOpacity(0.12),
                    child: Column(
                      children: [
                        Text(
                          _selectedDay.substring(0, 3).toUpperCase(),
                          style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: AppColors.primary),
                        ),
                        Text(
                          '${EthiopianDate.fromGregorian(dayDate).day}',
                          style: const TextStyle(
                              fontSize: 9, color: AppColors.primary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.only(bottom: 8),
                itemCount: students.length,
                itemBuilder: (context, idx) {
                  final student = students[idx];
                  final bg = idx.isEven
                      ? (isDark ? const Color(0xFF161616) : Colors.white)
                      : (isDark ? const Color(0xFF1B1B1B) : const Color(0xFFFAFAFA));
                  return Container(
                    decoration: BoxDecoration(
                      color: bg,
                      border: Border(
                          bottom: BorderSide(color: AppColors.border.withOpacity(0.6))),
                    ),
                    child: Row(
                      children: [
                        SizedBox(
                          width: numWidth,
                          child: Text(
                            classIdLabel(student.classId),
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                                fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.primary),
                          ),
                        ),
                        SizedBox(
                          width: nameWidth,
                          child: Padding(
                            padding: const EdgeInsets.only(left: 8, right: 4),
                            child: Text(
                              student.studentName,
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                        SizedBox(
                          width: dayWidth,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 4),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6),
                              decoration: BoxDecoration(
                                color: _statusColor(_getStatus(student, _selectedDay)).withOpacity(0.12),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                    color: _statusColor(_getStatus(student, _selectedDay))
                                        .withOpacity(0.35)),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  isExpanded: true,
                                  value: _getStatus(student, _selectedDay),
                                  isDense: true,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    color: _statusColor(_getStatus(student, _selectedDay)),
                                  ),
                                  items: _statuses.map((s) {
                                    return DropdownMenuItem(
                                      value: s,
                                      child: Text(
                                        s.isEmpty ? '—' : s,
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w800,
                                          color: _statusColor(s),
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                  onChanged: (val) =>
                                      _setStatus(student, _selectedDay, val ?? ''),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _statusColor(String s) {
    switch (s) {
      case 'P':
        return AppColors.success;
      case 'A':
        return AppColors.danger;
      case 'L':
        return AppColors.warning;
      case 'E':
        return AppColors.info;
      default:
        return AppColors.textSecondary;
    }
  }

  // ------------------------------------------------------------------ report

  Widget _pageToggle(bool isDark) {
    Widget seg(int idx, IconData icon, String label) {
      final sel = _pageTab == idx;
      return Expanded(
        child: GestureDetector(
          onTap: () {
            if (_pageTab == idx) return;
            setState(() => _pageTab = idx);
            if (idx == 1) _loadReport();
          },
          child: Container(
            margin: EdgeInsets.only(right: idx == 0 ? 8 : 0),
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              color: sel
                  ? AppColors.primary
                  : (isDark ? const Color(0xFF2C2C2C) : AppColors.surfaceAlt),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 15, color: sel ? Colors.white : AppColors.textSecondary),
                const SizedBox(width: 6),
                Text(label,
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: sel ? Colors.white : AppColors.textSecondary)),
              ],
            ),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: Row(children: [
        seg(0, Icons.grid_view_outlined, tr(context, 'attendance')),
        seg(1, Icons.bar_chart_outlined, tr(context, 'report')),
      ]),
    );
  }

  /// Selected report month as Ethiopian (year, month 1-13), offset back
  /// from the current month.
  (int, int) get _reportEthMonth {
    final now = EthiopianDate.fromGregorian(DateTime.now());
    final total = now.year * 12 + (now.month - 1) + _reportMonthOffset;
    return (total ~/ 12, total % 12 + 1);
  }

  /// Gregorian day 1 of an Ethiopian (year, month). Walks a few days from a
  /// close estimate — the app only ships Gregorian→Ethiopian conversion.
  DateTime _ethMonthStart(int y, int m) {
    final gregYear = y + 7;
    var d = DateTime(gregYear, 9, (gregYear % 4 == 3) ? 12 : 11)
        .add(Duration(days: (m - 1) * 30));
    for (var i = 0; i < 45; i++) {
      final e = EthiopianDate.fromGregorian(d);
      final cmp = e.year != y
          ? e.year.compareTo(y)
          : e.month != m
              ? e.month.compareTo(m)
              : e.day.compareTo(1);
      if (cmp == 0) return d;
      d = d.add(Duration(days: cmp > 0 ? -1 : 1));
    }
    return d;
  }

  int _ethMonthLength(int y, int m) =>
      m == 13 ? ((y % 4 == 3) ? 6 : 5) : 30;

  Future<void> _loadReport() async {
    if (_selectedClass == null) return;
    final cls = _selectedClass!;
    final (ey, em) = _reportEthMonth;
    final start = _ethMonthStart(ey, em);
    final end = start.add(Duration(days: _ethMonthLength(ey, em) - 1));

    setState(() => _reportLoading = true);

    // All Mondays whose week touches the month.
    final weekStarts = <DateTime>[];
    var w = _mondayOf(start);
    while (!w.isAfter(end)) {
      weekStarts.add(w);
      w = w.add(const Duration(days: 7));
    }

    final online = await OfflineService.isOnline();
    final byWeek = <DateTime, List<StudentAttendanceItem>>{};
    await Future.wait(weekStarts.map((ws) async {
      final key =
          'weekly_${cls}_${_ymd(ws)}'.replaceAll(RegExp(r'[^\w-]'), '_');
      if (online) {
        try {
          final res = await ApiService().getWeeklyAttendance(
              className: cls, weekStart: _ymd(ws));
          if (res['exists'] == true && res['data'] is List) {
            // Same key the grid uses — viewing the report also caches the
            // weeks, so the report itself works offline next time.
            await OfflineService.cache(key, {'exists': true, 'data': res['data']});
            byWeek[ws] = _rowsFromPayload(res);
            return;
          }
        } catch (_) {}
      }
      final cached = OfflineService.readCache<Map<String, dynamic>>(key);
      if (cached != null) byWeek[ws] = _rowsFromPayload(cached);
    }));

    final report = _MonthReport();
    final byStudent = <String, _AttStudentReport>{};
    final byDay = <DateTime, _AttDayReport>{};
    for (final ws in weekStarts) {
      final rows = byWeek[ws];
      if (rows == null) continue;
      for (final row in rows) {
        for (var i = 0; i < 7; i++) {
          final date = ws.add(Duration(days: i));
          final e = EthiopianDate.fromGregorian(date);
          if (e.year != ey || e.month != em) continue;
          final st = _getStatus(row, _days[i]);
          if (st.isEmpty) continue;

          final id =
              row.studentId.isNotEmpty ? row.studentId : row.studentName;
          final s = byStudent.putIfAbsent(
              id, () => _AttStudentReport(row.studentName, row.classId));
          final day = byDay.putIfAbsent(date, () => _AttDayReport(date));
          switch (st) {
            case 'P':
              s.p++;
              day.p++;
            case 'A':
              s.a++;
              day.a++;
            case 'L':
              s.l++;
              day.l++;
            case 'E':
              s.e++;
              day.e++;
          }
        }
      }
    }
    report.students.addAll(byStudent.values);
    report.students.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    final days = byDay.values.toList()
      ..sort((a, b) => b.date.compareTo(a.date));
    report.days.addAll(days);
    for (final s in report.students) {
      report.p += s.p;
      report.a += s.a;
      report.l += s.l;
      report.e += s.e;
    }

    if (!mounted || cls != _selectedClass) return;
    setState(() {
      _report = report;
      _reportLoading = false;
    });
  }

  void _shiftReportMonth(int delta) {
    setState(() => _reportMonthOffset += delta);
    _loadReport();
  }

  Widget _buildReportView(bool isDark) {
    if (_reportLoading) return const Center(child: AppLoadingIndicator());
    final r = _report;
    if (r == null || r.students.isEmpty) {
      return Center(
          child: EmptyState(
              icon: Icons.bar_chart_outlined, message: tr(context, 'no_report_yet')));
    }
    final (ey, em) = _reportEthMonth;
    final monthLabel = '${EthiopianDate.monthNames[em - 1]} $ey E.C.';

    List<_AttStudentReport> topWhere(
        int Function(_AttStudentReport) score) {
      final l = [...r.students]..sort((a, b) => score(b).compareTo(score(a)));
      return l.where((s) => score(s) > 0).take(5).toList();
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      children: [
        // Month navigator
        Row(
          children: [
            IconButton(
              icon: const Icon(Icons.chevron_left, size: 20),
              onPressed: () => _shiftReportMonth(-1),
            ),
            Expanded(
              child: GestureDetector(
                onTap: () {
                  if (_reportMonthOffset != 0) _shiftReportMonth(0);
                },
                child: Column(children: [
                  Text(monthLabel,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
                      textAlign: TextAlign.center),
                  if (_reportMonthOffset != 0)
                    Text(tr(context, 'this_month'),
                        style: const TextStyle(fontSize: 10, color: AppColors.primary)),
                ]),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.chevron_right, size: 20),
              onPressed: _reportMonthOffset < 0 ? () => _shiftReportMonth(1) : null,
            ),
          ],
        ),
        const SizedBox(height: 4),

        // Class-wide totals for the month
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _statChip(isDark, tr(context, 'students'), '${r.students.length}', AppColors.primary),
            _statChip(isDark, tr(context, 'present'), '${r.p}', AppColors.success),
            _statChip(isDark, tr(context, 'absent'), '${r.a}', AppColors.danger),
            _statChip(isDark, tr(context, 'late'), '${r.l}', AppColors.warning),
            _statChip(isDark, tr(context, 'leave'), '${r.e}', AppColors.info),
          ],
        ),
        const SizedBox(height: 12),

        _rankCard(isDark, tr(context, 'most_absent'), topWhere((s) => s.a),
            (s) => s.a, AppColors.danger),
        _rankCard(isDark, tr(context, 'most_present'), topWhere((s) => s.p),
            (s) => s.p, AppColors.success),
        _rankCard(isDark, tr(context, 'most_late'), topWhere((s) => s.l),
            (s) => s.l, AppColors.warning),
        _rankCard(isDark, tr(context, 'most_permission'), topWhere((s) => s.e),
            (s) => s.e, AppColors.info),

        // Daily breakdown
        if (r.days.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(tr(context, 'by_date'),
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          ...r.days.map((d) => _dayCard(isDark, d)),
        ],

        // Per-student totals
        const SizedBox(height: 8),
        Text(tr(context, 'students'),
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            color: AppColors.primarySoft,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              const SizedBox(width: 24, child: Text('#', textAlign: TextAlign.center, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.primary))),
              const Expanded(child: Text('Student', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.primary))),
              _headCell(tr(context, 'present'), 34),
              _headCell(tr(context, 'absent'), 34),
              _headCell(tr(context, 'late'), 34),
              _headCell(tr(context, 'leave'), 34),
              _headCell('%', 40),
            ],
          ),
        ),
        const SizedBox(height: 4),
        ...r.students.asMap().entries.map((entry) {
          final i = entry.key;
          final s = entry.value;
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(
              color: i.isEven
                  ? (isDark ? const Color(0xFF161616) : Colors.white)
                  : (isDark ? const Color(0xFF1B1B1B) : const Color(0xFFF7F7F7)),
              border: Border(bottom: BorderSide(color: AppColors.border.withOpacity(0.5))),
            ),
            child: Row(
              children: [
                SizedBox(
                    width: 24,
                    child: Text('${i + 1}',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textSecondary))),
                Expanded(
                  child: Text(s.name,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                ),
                _numCell('${s.p}', AppColors.success, 34),
                _numCell('${s.a}', AppColors.danger, 34),
                _numCell('${s.l}', AppColors.warning, 34),
                _numCell('${s.e}', AppColors.info, 34),
                _numCell('${s.pct.toStringAsFixed(0)}%', AppColors.primary, 40),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _headCell(String label, double w) => SizedBox(
        width: w,
        child: Text(label,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.primary)),
      );

  Widget _numCell(String v, Color c, double w) => SizedBox(
        width: w,
        child: Text(v,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: c)),
      );

  Widget _statChip(bool isDark, String label, String value, Color color) => Container(
        width: 100,
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.25)),
        ),
        child: Column(
          children: [
            Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: color)),
            const SizedBox(height: 2),
            Text(label,
                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textSecondary),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
          ],
        ),
      );

  Widget _rankCard(bool isDark, String title, List<_AttStudentReport> list,
      int Function(_AttStudentReport) score, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      child: AppCard(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.emoji_events_outlined, size: 16, color: color),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(title,
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: color)),
                ),
              ],
            ),
            const SizedBox(height: 6),
            if (list.isEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text('—',
                    style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
              )
            else
              ...list.asMap().entries.map((e) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Text('${e.key + 1}',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.textSecondary)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(e.value.name,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                            color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
                        child: Text('${score(e.value)}',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: color)),
                      ),
                    ],
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }

  Widget _dayCard(bool isDark, _AttDayReport d) {
    Widget pill(String label, int n, Color c) => Container(
          margin: const EdgeInsets.only(left: 6),
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
          decoration: BoxDecoration(
              color: c.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
          child: Text('$label $n',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: c)),
        );

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: AppCard(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(EthiopianDate.short(d.date),
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                  Text(_dayName(d.date),
                      style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
                ],
              ),
            ),
            pill('P', d.p, AppColors.success),
            pill('A', d.a, AppColors.danger),
            pill('L', d.l, AppColors.warning),
            pill('E', d.e, AppColors.info),
          ],
        ),
      ),
    );
  }

  String _dayName(DateTime d) {
    const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return names[(d.weekday + 6) % 7];
  }
}

class _AttStudentReport {
  _AttStudentReport(this.name, this.roll);
  final String name;
  final String roll;
  int p = 0, a = 0, l = 0, e = 0;
  int get marked => p + a + l + e;
  double get pct => marked == 0 ? 0 : (p / marked) * 100;
}

class _AttDayReport {
  _AttDayReport(this.date);
  final DateTime date;
  int p = 0, a = 0, l = 0, e = 0;
}

class _MonthReport {
  final List<_AttStudentReport> students = [];
  final List<_AttDayReport> days = [];
  int p = 0, a = 0, l = 0, e = 0;
}
