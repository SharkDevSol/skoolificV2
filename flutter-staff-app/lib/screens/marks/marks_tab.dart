import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/services/api_service.dart';
import '../../core/services/offline_service.dart';
import '../../core/utils/class_id.dart';
import '../../widgets/app_widgets.dart';
import '../../app/app_provider.dart';
import '../../models/models.dart';

class MarksTab extends StatefulWidget {
  const MarksTab({super.key});

  @override
  State<MarksTab> createState() => _MarksTabState();
}

class _MarksTabState extends State<MarksTab> {
  TeacherAssignment? _selectedAssignment;
  int _selectedTerm = 1;
  String? _selectedClass;
  String _selectedComponent = ''; // '' = all components
  bool _loading = false;
  bool _saving = false;
  bool _oneByOne = false;
  int _oneByOneIndex = 0;
  String _searchQuery = '';
  bool _offlineData = false;
  int _pendingSync = 0;

  List<StudentMarkRow> _students = [];
  List<MarkComponentConfig> _components = [];
  bool _formFound = true;

  /// True when offline and this list was never downloaded — shows a friendly
  /// "not cached yet" state instead of the destructive create-form view.
  bool _cacheMiss = false;

  /// Monotonic token so a slow response for a previous selection can never
  /// be applied to (or cached under) the current one.
  int _fetchSeq = 0;

  // Report tab state
  int _pageTab = 0; // 0 = mark list grid, 1 = report
  bool _reportLoading = false;
  final Map<String, _SubjStats> _subjectStats = {};

  /// Admin lock state from form_config (is_locked / locked_by).
  bool _formLocked = false;
  String? _lockedBy;
  int _passThreshold = 50;
  int _termCount = 2;

  /// Snapshot of values as last acknowledged by the server (drives locking).
  final Map<String, Map<String, double>> _saved = {};

  String get _cacheKey => TeacherAssignment.cacheKeyFor(
      subjectName: _selectedAssignment?.subjectName ?? '',
      className: _selectedClass ?? '',
      termNumber: _selectedTerm);

  @override
  void initState() {
    super.initState();
    OfflineService.init();
    _pendingSync = OfflineService.pendingCount;
    final prov = Provider.of<AppProvider>(context, listen: false);
    if (prov.markAssignments.isNotEmpty) {
      _selectedAssignment = prov.markAssignments.first;
      _selectedClass = _selectedAssignment!.className;
      _selectedTerm = _selectedAssignment!.termNumber;
      _fetchMarkList();
    }
    _loadTermCount();
  }

  /// Term options come from the server (`GET /api/mark-list/config` →
  /// term_count) instead of a hardcoded 1..4 list.
  Future<void> _loadTermCount() async {
    final cfg = await ApiService().getMarkConfig();
    if (!mounted || cfg.isEmpty) return;
    final raw = cfg['term_count'];
    final n = raw is int ? raw : int.tryParse(raw?.toString() ?? '') ?? 0;
    if (n > 0) {
      setState(() {
        _termCount = n;
        if (_selectedTerm > _termCount) _selectedTerm = _termCount;
      });
    }
  }

  List<MarkComponentConfig> get _visibleComponents {
    if (_selectedComponent.isEmpty) return _components;
    return _components.where((c) => c.name == _selectedComponent).toList();
  }

  Future<void> _fetchMarkList({bool force = false}) async {
    if (_selectedAssignment == null) return;
    final seq = ++_fetchSeq;
    final key = _cacheKey;
    final subject = _selectedAssignment!.subjectName;
    final cls = _selectedAssignment!.className;
    final term = _selectedTerm;
    setState(() {
      _loading = true;
      _formFound = true;
      _cacheMiss = false;
      _offlineData = false;
    });

    final online = await OfflineService.isOnline();
    if (!mounted || seq != _fetchSeq) return;
    if (!online && !force) {
      _loadFromCache(key);
      if (mounted) setState(() => _loading = false);
      return;
    }

    try {
      final res = await ApiService().getMarkList(
        subjectName: subject,
        className: cls,
        termNumber: term,
      );
      if (!mounted || seq != _fetchSeq) return;
      _applyPayload(res, fromCache: false);
      await OfflineService.cache(key, res);
    } catch (_) {
      if (!mounted || seq != _fetchSeq) return;
      final cached = OfflineService.readCache<Map<String, dynamic>>(key);
      if (cached != null) {
        _applyPayload(cached, fromCache: true);
      } else {
        _cacheMiss = true;
        _formFound = true;
        _students = [];
        _components = [];
      }
    } finally {
      if (mounted && seq == _fetchSeq) setState(() => _loading = false);
    }
  }

  void _loadFromCache([String? key]) {
    final cached =
        OfflineService.readCache<Map<String, dynamic>>(key ?? _cacheKey);
    if (cached != null) {
      _applyPayload(cached, fromCache: true);
    } else {
      _cacheMiss = true;
      _formFound = true;
      _students = [];
      _components = [];
    }
  }

  void _applyPayload(Map<String, dynamic> res, {required bool fromCache}) {
    _cacheMiss = false;
    final hasForm = res['formId'] != null ||
        res['form_id'] != null ||
        (res['config'] is Map &&
            ((res['config'] as Map)['id'] != null ||
                (res['config'] as Map)['mark_components'] != null)) ||
        (res['markList'] is List && (res['markList'] as List).isNotEmpty) ||
        (res['students'] is List && (res['students'] as List).isNotEmpty);
    if (!hasForm) {
      _formFound = false;
      _students = [];
      _components = [];
      _formLocked = false;
      _lockedBy = null;
      _offlineData = fromCache;
      return;
    }

    // Admin lock + pass threshold straight from form_config.
    final cfg = res['config'] is Map ? Map<String, dynamic>.from(res['config'] as Map) : null;
    _formLocked = cfg?['is_locked'] == true;
    _lockedBy = cfg?['locked_by']?.toString();
    final pt = cfg?['pass_threshold'];
    _passThreshold = pt is num
        ? pt.toInt()
        : int.tryParse(pt?.toString() ?? '') ?? _passThreshold;

    final comps = <MarkComponentConfig>[];
    var compRaw = res['components'];
    if (compRaw is! List || compRaw.isEmpty) {
      // Older payloads kept the components inside config.
      final c = res['config'];
      if (c is Map && c['mark_components'] is List) compRaw = c['mark_components'];
    }
    if (compRaw is List) {
      for (final c in compRaw) {
        comps.add(MarkComponentConfig.fromJson(Map<String, dynamic>.from(c as Map)));
      }
    }
    _components = comps;
    if (_selectedComponent.isNotEmpty && !comps.any((c) => c.name == _selectedComponent)) {
      _selectedComponent = '';
    }

    final rows = <StudentMarkRow>[];
    var studentRaw = res['students'];
    if (studentRaw is! List || studentRaw.isEmpty) studentRaw = res['markList'];
    if (studentRaw is List) {
      for (final s in studentRaw) {
        rows.add(StudentMarkRow.fromServer(Map<String, dynamic>.from(s as Map), comps));
      }
    }
    rows.sort((a, b) {
      final ai = int.tryParse(a.rollNumber ?? '') ?? 0;
      final bi = int.tryParse(b.rollNumber ?? '') ?? 0;
      if (ai != bi) return ai.compareTo(bi);
      return a.studentName.toLowerCase().compareTo(b.studentName.toLowerCase());
    });
    _students = rows;

    _saved.clear();
    for (final r in rows) {
      _saved[r.studentId] = Map<String, double>.from(r.marks);
    }
    _formFound = true;
    _offlineData = fromCache;

    // Shared roster so Discipline can show names offline too.
    if (rows.isNotEmpty && _selectedClass != null) {
      OfflineService.cache(
          'class_students_$_selectedClass',
          rows
              .map((r) => {
                    'student_name': r.studentName,
                    'school_id': r.studentId,
                    'class_id': r.rollNumber,
                  })
              .toList());
    }
  }

  bool _isLocked(StudentMarkRow row, MarkComponentConfig comp) {
    final saved = _saved[row.studentId];
    final v = saved == null ? 0.0 : (saved[comp.name] ?? 0.0);
    return v > 0;
  }

  bool get _hasChanges {
    for (final row in _students) {
      final saved = _saved[row.studentId] ?? const <String, double>{};
      for (final comp in _components) {
        final before = saved[comp.name] ?? 0.0;
        final now = row.marks[comp.name] ?? 0.0;
        if ((before - now).abs() > 0.0001) return true;
      }
    }
    return false;
  }

  Future<void> _saveMarks() async {
    if (_students.isEmpty) return;
    if (_formLocked) {
      if (mounted) {
        showError(
            context,
            '${tr(context, 'locked')}${_lockedBy != null && _lockedBy!.isNotEmpty ? ': $_lockedBy' : ''}');
      }
      return;
    }
    if (!_hasChanges) {
      if (mounted) showSuccess(context, tr(context, 'no_changes'));
      return;
    }
    setState(() => _saving = true);

    final rows = <Map<String, dynamic>>[];
    for (final row in _students) {
      final saved = _saved[row.studentId] ?? const <String, double>{};
      var changed = false;
      for (final comp in _components) {
        if (((saved[comp.name] ?? 0.0) - (row.marks[comp.name] ?? 0.0)).abs() > 0.0001) {
          changed = true;
          break;
        }
      }
      if (changed) rows.add(row.toSaveRow(components: _components));
    }

    final payload = {
      'subjectName': _selectedAssignment!.subjectName,
      'className': _selectedAssignment!.className,
      'termNumber': _selectedTerm,
      'rows': rows,
    };

    final online = await OfflineService.isOnline();
    if (!online) {
      await OfflineService.enqueue('save_marks', payload);
      _snapshotCurrent();
      _updateCachedPayload();
      if (mounted) {
        setState(() => _pendingSync = OfflineService.pendingCount);
        showSuccess(context, tr(context, 'saved_offline_pending'));
      }
      setState(() => _saving = false);
      return;
    }

    try {
      final ok = await ApiService().updateMarks(
        subjectName: _selectedAssignment!.subjectName,
        className: _selectedAssignment!.className,
        termNumber: _selectedTerm,
        rows: rows,
      );
      if (ok) {
        _snapshotCurrent();
        _updateCachedPayload();
        await OfflineService.flush();
        if (mounted) {
          setState(() => _pendingSync = OfflineService.pendingCount);
          showSuccess(context, tr(context, 'marks_saved'));
        }
        await _fetchMarkList(force: true);
      } else if (mounted) {
        final api = ApiService();
        if (api.lastStatusCode == 403) {
          // Admin locked the list while we were editing — refresh the lock
          // state and show the server's reason.
          showError(context, api.lastError ?? tr(context, 'locked'));
          await _fetchMarkList(force: true);
        } else {
          showError(context, api.lastError ?? tr(context, 'save_failed'));
        }
      }
    } catch (e) {
      // Network broke mid-save → keep the work offline.
      await OfflineService.enqueue('save_marks', payload);
      _snapshotCurrent();
      _updateCachedPayload();
      if (mounted) {
        setState(() => _pendingSync = OfflineService.pendingCount);
        showError(context, tr(context, 'saved_offline_pending'));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _snapshotCurrent() {
    for (final row in _students) {
      _saved[row.studentId] = Map<String, double>.from(row.marks);
    }
  }

  /// Refresh the offline payload after edits so reopening this list offline
  /// shows the saved values (mirrors what Attendance does on persist).
  void _updateCachedPayload() {
    if (!_formFound || _students.isEmpty) return;
    final key = _cacheKey;
    final cached = OfflineService.readCache<Map<String, dynamic>>(key);
    if (cached == null) return; // never downloaded — nothing to refresh
    final rows = _students.map(_rowJson).toList();
    cached['students'] = rows;
    cached['markList'] = rows;
    OfflineService.cache(key, cached);
  }

  Map<String, dynamic> _rowJson(StudentMarkRow r) {
    final json = <String, dynamic>{
      'id': r.studentId,
      'student_id': r.studentId,
      'student_name': r.studentName,
      'class_id': r.rollNumber,
      'total': r.total,
      'pass_status': r.passStatus,
    };
    for (final c in _components) {
      final v = r.marks[c.name] ?? 0.0;
      json[c.componentKey] = v;
      json[c.name] = v;
    }
    return json;
  }

  void _recomputeTotal(StudentMarkRow row) {
    double total = 0.0;
    for (final v in row.marks.values) {
      total += v;
    }
    row.total = total;
    row.passStatus = total >= _passThreshold.toDouble() ? 'Pass' : 'Fail';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final prov = Provider.of<AppProvider>(context);

    if (!prov.isTeacher && prov.markAssignments.isEmpty) {
      return Center(
        child: EmptyState(
          icon: Icons.assignment_outlined,
          message: tr(context, 'no_assignments'),
        ),
      );
    }

    // Assignments may arrive after this tab first built (e.g. slow refresh).
    if (_selectedAssignment == null && prov.markAssignments.isNotEmpty) {
      final first = prov.markAssignments.first;
      _selectedAssignment = first;
      _selectedClass = first.className;
      _selectedTerm = first.termNumber;
      Future.microtask(_fetchMarkList);
    }

    final filteredStudents = _students.where((s) {
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      return s.studentName.toLowerCase().contains(q) ||
          classIdLabel(s.rollNumber).toLowerCase().contains(q) ||
          (s.rollNumber ?? '').contains(q);
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
                        : _cacheMiss
                            ? EmptyState(
                                icon: Icons.cloud_off,
                                message: tr(context, 'not_cached_offline'),
                              )
                            : !_formFound
                                ? _buildCreateFormView()
                                : filteredStudents.isEmpty
                                    ? EmptyState(
                                        icon: Icons.person_search,
                                        message: 'No students found in mark list',
                                      )
                                    : _oneByOne
                                        ? _buildOneByOneView(filteredStudents)
                                        : _buildTableView(filteredStudents),
              ),
              // Room for the floating save bar (bottom:104 + ~70px tall
              // ≈ 174) + nav — sized so the bar never covers the last rows.
              const SizedBox(height: 190),
            ],
          ),
          if (_formFound && _students.isNotEmpty && _pageTab == 0)
            Positioned(
              left: 16,
              right: 16,
              bottom: 104, // clears the floating nav (65px) + offset
              child: Container(
                padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: isDark ? const Color(0xFF2C2C2C) : AppColors.border),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(isDark ? 0.5 : 0.15),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    if (_formLocked)
                      Padding(
                        padding: const EdgeInsets.only(right: 10),
                        child: StatusPill(
                          _lockedBy != null && _lockedBy!.isNotEmpty
                              ? '🔒 $_lockedBy'
                              : tr(context, 'locked'),
                          color: AppColors.danger,
                          bg: AppColors.dangerSoft,
                        ),
                      ),
                    if (!_formLocked && (_pendingSync > 0 || _offlineData))
                      Padding(
                        padding: const EdgeInsets.only(right: 10),
                        child: StatusPill(
                          _pendingSync > 0 ? '↻ $_pendingSync' : tr(context, 'offline_mode'),
                          color: AppColors.accent,
                          bg: AppColors.accent.withOpacity(0.15),
                        ),
                      ),
                    Expanded(
                      child: PrimaryButton(
                        label: _formLocked ? tr(context, 'locked') : tr(context, 'save_marks'),
                        loading: _saving,
                        onPressed: _formLocked ? null : _saveMarks,
                      ),
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
    final classes = prov.markAssignments.map((a) => a.className).toSet().toList()..sort();
    final subjects = prov.markAssignments
        .where((a) => a.className == (_selectedClass ?? a.className))
        .toList();
    // A provider refresh replaces assignment instances (identity equality),
    // which would blank the dropdown value — re-match by formId.
    if (_selectedAssignment != null &&
        !subjects.any((a) => identical(a, _selectedAssignment))) {
      final prevFormId = _selectedAssignment!.formId;
      final it = subjects.where((a) => a.formId == prevFormId);
      final match = it.isEmpty ? null : it.first;
      _selectedAssignment = match ??
          (subjects.isNotEmpty ? subjects.first : null);
      if (_selectedAssignment != null) {
        _selectedTerm = _selectedAssignment!.termNumber;
      }
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
      child: Column(
        children: [
          Row(
            children: [
              // Class picker
              Expanded(
                flex: 2,
                child: _pill(
                  isDark,
                  DropdownButton<String>(
                    isExpanded: true,
                    value: _selectedClass,
                    hint: Text(tr(context, 'class_label'), style: const TextStyle(fontSize: 13)),
                    items: classes
                        .map((c) => DropdownMenuItem(
                              value: c,
                              child: Text(c,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                            ))
                        .toList(),
                    onChanged: (val) {
                      if (val == null) return;
                      final first = prov.markAssignments.firstWhere(
                        (a) => a.className == val,
                        orElse: () => prov.markAssignments.first,
                      );
                      setState(() {
                        _selectedClass = val;
                        _selectedAssignment = first;
                        _selectedTerm = first.termNumber;
                        _selectedComponent = '';
                      });
                      _fetchMarkList();
                      if (_pageTab == 1) _loadMarksReport();
                    },
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Subject picker
              Expanded(
                flex: 3,
                child: _pill(
                  isDark,
                  DropdownButton<TeacherAssignment>(
                    isExpanded: true,
                    value: _selectedAssignment,
                    hint: Text(tr(context, 'subject'), style: const TextStyle(fontSize: 13)),
                    items: subjects.map((a) {
                      return DropdownMenuItem(
                        value: a,
                        child: Text(
                          '${a.subjectName} • Term ${a.termNumber}',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                          overflow: TextOverflow.ellipsis,
                        ),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val == null) return;
                      setState(() {
                        _selectedAssignment = val;
                        _selectedClass = val.className;
                        _selectedTerm = val.termNumber;
                        _selectedComponent = '';
                      });
                      _fetchMarkList();
                      if (_pageTab == 1) _loadMarksReport();
                    },
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Term picker (options from server term_count)
              Expanded(
                flex: 2,
                child: _pill(
                  isDark,
                  DropdownButton<int>(
                    isExpanded: true,
                    value: _selectedTerm <= _termCount ? _selectedTerm : _termCount,
                    items: List<int>.generate(_termCount, (i) => i + 1).map((t) {
                      return DropdownMenuItem(
                        value: t,
                        child: Text('$t', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val == null) return;
                      setState(() => _selectedTerm = val);
                      _fetchMarkList();
                      if (_pageTab == 1) _loadMarksReport();
                    },
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              // Component picker (one or all)
              Expanded(
                child: _pill(
                  isDark,
                  DropdownButton<String>(
                    isExpanded: true,
                    value: _selectedComponent.isEmpty ? null : _selectedComponent,
                    hint: Text(tr(context, 'all_components'), style: const TextStyle(fontSize: 13)),
                    items: [
                      DropdownMenuItem<String>(
                        value: '',
                        child: Text(tr(context, 'all_components'),
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                      ),
                      ..._components.map((c) => DropdownMenuItem<String>(
                            value: c.name,
                            child: Text('${c.name} (${c.percentage}%)',
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                          )),
                    ],
                    onChanged: (val) => setState(() => _selectedComponent = val ?? ''),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Search
              Expanded(
                flex: 2,
                child: SizedBox(
                  height: 38,
                  child: TextField(
                    decoration: InputDecoration(
                      hintText: 'Search student...',
                      prefixIcon: const Icon(Icons.search, size: 18),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
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
                onTap: () => setState(() => _oneByOne = !_oneByOne),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: _oneByOne
                        ? AppColors.accent
                        : (isDark ? const Color(0xFF2C2C2C) : AppColors.primarySoft),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _oneByOne ? Icons.view_carousel : Icons.table_chart_outlined,
                        size: 16,
                        color: _oneByOne ? Colors.white : AppColors.primary,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _oneByOne ? tr(context, 'one_by_one') : tr(context, 'table_view'),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: _oneByOne ? Colors.white : AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _pill(bool isDark, Widget child) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF2C2C2C) : AppColors.surfaceAlt,
          borderRadius: BorderRadius.circular(16),
        ),
        child: child,
      );

  // ----------------------------------------------------------------- report

  Widget _pageToggle(bool isDark) {
    Widget seg(int idx, IconData icon, String label) {
      final sel = _pageTab == idx;
      return Expanded(
        child: GestureDetector(
          onTap: () {
            if (_pageTab == idx) return;
            setState(() => _pageTab = idx);
            if (idx == 1) _loadMarksReport();
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
        seg(0, Icons.table_chart_outlined, tr(context, 'marks')),
        seg(1, Icons.bar_chart_outlined, tr(context, 'report')),
      ]),
    );
  }

  /// Build the report for every subject of the selected class — payloads
  /// come from the offline cache (prefetched on refresh) or the network, so
  /// the report works offline after the first online sync.
  Future<void> _loadMarksReport() async {
    final prov = Provider.of<AppProvider>(context, listen: false);
    final cls = _selectedClass;
    if (cls == null) return;
    final assignments = prov.markAssignments.where((a) => a.className == cls).toList();
    setState(() {
      _reportLoading = true;
      _subjectStats.clear();
    });
    if (assignments.isEmpty) {
      setState(() => _reportLoading = false);
      return;
    }

    final online = await OfflineService.isOnline();
    final curKey = _cacheKey;
    final map = <String, _SubjStats>{};
    await Future.wait(assignments.map((a) async {
      final key = a.offlineCacheKey;
      if (key == curKey && _students.isNotEmpty) {
        map[key] = _statsFromLocal(a.subjectName, a.termNumber);
        return;
      }
      var payload = OfflineService.readCache<Map<String, dynamic>>(key);
      if (payload == null && online) {
        try {
          payload = await ApiService().getMarkList(
            subjectName: a.subjectName,
            className: a.className,
            termNumber: a.termNumber,
          );
          await OfflineService.cache(key, payload);
        } catch (_) {
          payload = null;
        }
      }
      map[key] = payload != null
          ? _statsFromPayload(a.subjectName, a.termNumber, payload)
          : _SubjStats(subject: a.subjectName, term: a.termNumber, available: false);
    }));

    if (!mounted) return;
    setState(() {
      _subjectStats
        ..clear()
        ..addAll(map);
      _reportLoading = false;
    });
  }

  _SubjStats _statsFromPayload(String subject, int term, Map<String, dynamic> res) {
    var compRaw = res['components'];
    if (compRaw is! List || compRaw.isEmpty) {
      final c = res['config'];
      if (c is Map && c['mark_components'] is List) compRaw = c['mark_components'];
    }
    final comps = <MarkComponentConfig>[];
    if (compRaw is List) {
      for (final c in compRaw) {
        comps.add(MarkComponentConfig.fromJson(Map<String, dynamic>.from(c as Map)));
      }
    }

    int threshold = _passThreshold;
    final cfg = res['config'];
    if (cfg is Map) {
      final pt = cfg['pass_threshold'];
      threshold = pt is num
          ? pt.toInt()
          : int.tryParse(pt?.toString() ?? '') ?? threshold;
    }

    var raw = res['students'];
    if (raw is! List || raw.isEmpty) raw = res['markList'];
    final totals = <MapEntry<String, double>>[];
    if (raw is List) {
      for (final s in raw) {
        final m = Map<String, dynamic>.from(s as Map);
        final name = m['student_name']?.toString() ?? '';
        final parsed = double.tryParse(m['total']?.toString() ?? '');
        double total;
        if (parsed != null) {
          total = parsed;
        } else {
          var sum = 0.0;
          for (final c in comps) {
            final v = m[c.componentKey] ?? m[c.name];
            sum += double.tryParse(v?.toString() ?? '') ?? 0;
          }
          total = sum;
        }
        totals.add(MapEntry(name, total));
      }
    }
    return _SubjStats.from(
      subject: subject,
      term: term,
      totals: totals,
      threshold: threshold,
    );
  }

  _SubjStats _statsFromLocal(String subject, int term) {
    final totals = _students
        .map((r) => MapEntry(r.studentName, r.total))
        .toList();
    return _SubjStats.from(
      subject: subject,
      term: term,
      totals: totals,
      threshold: _passThreshold,
    );
  }

  Widget _buildReportView(bool isDark) {
    if (_reportLoading) return const Center(child: AppLoadingIndicator());
    if (_subjectStats.isEmpty) {
      return Center(
        child: EmptyState(
          icon: Icons.bar_chart_outlined,
          message: tr(context, 'no_report_yet'),
        ),
      );
    }

    // Selected subject first, then the rest of the class by average.
    final curKey = _cacheKey;
    final cur = _subjectStats[curKey];
    final all = _subjectStats.values.toList()
      ..sort((a, b) {
        if (a.available != b.available) return a.available ? -1 : 1;
        return b.avg.compareTo(a.avg);
      });

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      children: [
        if (cur != null && cur.available) ...[
          Text(
            '${cur.subject} • Term ${cur.term}',
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _statChip(tr(context, 'average'),
                  cur.avg.toStringAsFixed(1), AppColors.primary),
              _statChip(tr(context, 'highest'),
                  '${cur.high.toStringAsFixed(0)}  ${cur.highName}', AppColors.success),
              _statChip(tr(context, 'lowest'),
                  '${cur.low.toStringAsFixed(0)}  ${cur.lowName}', AppColors.danger),
              _statChip(tr(context, 'pass_rate'),
                  '${cur.passPct.toStringAsFixed(0)}%', AppColors.info),
            ],
          ),
          const SizedBox(height: 12),

          // Grade distribution
          Text(tr(context, 'grade_distribution'),
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          ..._gradeRows(cur),
          const SizedBox(height: 12),

          // Top / bottom students of this subject
          Row(
            children: [
              Expanded(child: _rankList(tr(context, 'top_students'), cur.ranked.take(5).toList(), AppColors.success, isDark)),
              const SizedBox(width: 10),
              Expanded(
                child: _rankList(
                    tr(context, 'low_students'),
                    cur.ranked.reversed.take(5).toList(),
                    AppColors.danger,
                    isDark),
              ),
            ],
          ),
          const SizedBox(height: 14),
        ],

        // Whole class by subject
        Text(tr(context, 'by_subject'),
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        Text(
          '${tr(context, 'class_label')}: $_selectedClass  •  ${tr(context, 'average')}',
          style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 8),
        ...all.map((s) => _subjectRow(s, isDark)),
      ],
    );
  }

  List<Widget> _gradeRows(_SubjStats s) {
    const grades = ['A (90-100)', 'B (80-89)', 'C (70-79)', 'D (60-69)', 'F (0-59)'];
    const colors = [
      AppColors.success,
      AppColors.info,
      AppColors.warning,
      AppColors.accent,
      AppColors.danger,
    ];
    final max = [for (final g in grades) s.grades[g] ?? 0].fold<int>(0, (m, v) => v > m ? v : m);
    return [
      for (var i = 0; i < grades.length; i++)
        Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(
            children: [
              SizedBox(
                  width: 76,
                  child: Text(grades[i].split(' ').first,
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800))),
              Expanded(
                child: Container(
                  height: 10,
                  decoration: BoxDecoration(
                    color: colors[i].withOpacity(0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: FractionallySizedBox(
                    alignment: Alignment.centerLeft,
                    widthFactor: max == 0 ? 0 : (s.grades[grades[i]] ?? 0) / max,
                    child: Container(
                      decoration: BoxDecoration(
                          color: colors[i], borderRadius: BorderRadius.circular(6)),
                    ),
                  ),
                ),
              ),
              SizedBox(
                  width: 34,
                  child: Text('${s.grades[grades[i]] ?? 0}',
                      textAlign: TextAlign.right,
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: colors[i]))),
            ],
          ),
        ),
    ];
  }

  Widget _rankList(String title, List<MapEntry<String, double>> items, Color color, bool isDark) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: color)),
          const SizedBox(height: 6),
          if (items.isEmpty)
            const Text('—', style: TextStyle(color: AppColors.textMuted))
          else
            ...items.asMap().entries.map((e) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  children: [
                    Text('${e.key + 1}',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.textSecondary)),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(e.value.key,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis),
                    ),
                    Text(e.value.value.toStringAsFixed(0),
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: color)),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _subjectRow(_SubjStats s, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF161616) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border.withOpacity(0.7)),
      ),
      child: !s.available
          ? Row(
              children: [
                Expanded(
                  child: Text('${s.subject} • Term ${s.term}',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                ),
                const Text('—', style: TextStyle(color: AppColors.textMuted)),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    SizedBox(
                      width: 120,
                      child: Text('${s.subject} • T${s.term}',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis),
                    ),
                    Expanded(
                      child: Container(
                        height: 10,
                        margin: const EdgeInsets.symmetric(horizontal: 8),
                        decoration: BoxDecoration(
                          color: AppColors.primarySoft,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: FractionallySizedBox(
                          alignment: Alignment.centerLeft,
                          widthFactor: (s.avg / 100).clamp(0.0, 1.0),
                          child: Container(
                            decoration: BoxDecoration(
                                color: AppColors.primary, borderRadius: BorderRadius.circular(6)),
                          ),
                        ),
                      ),
                    ),
                    SizedBox(
                      width: 40,
                      child: Text(s.avg.toStringAsFixed(0),
                          textAlign: TextAlign.right,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: AppColors.primary)),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '${tr(context, 'highest')}: ${s.high.toStringAsFixed(0)} (${s.highName})  •  '
                  '${tr(context, 'lowest')}: ${s.low.toStringAsFixed(0)} (${s.lowName})  •  '
                  '${tr(context, 'pass_rate')}: ${s.passPct.toStringAsFixed(0)}%',
                  style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
    );
  }

  Widget _statChip(String label, String value, Color color) => Container(
        width: 104,
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.25)),
        ),
        child: Column(
          children: [
            Text(value,
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: color),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
            const SizedBox(height: 2),
            Text(label,
                style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textSecondary),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
          ],
        ),
      );

  // ------------------------------------------------------------------ table

  Widget _buildTableView(List<StudentMarkRow> students) {
    final comps = _visibleComponents;
    // Student name column: wide enough for the longest full name + its
    // numeric rank badge, so full names aren't cut off. Capped so the table
    // still scrolls horizontally on narrow screens.
    final nameWidth = (220.0 + (students.fold<int>(0, (m, s) => s.studentName.length > m ? s.studentName.length : m)) * 1.2)
        .clamp(180.0, 300.0)
        .toDouble();
    final cellWidth = 92.0;
    final tableWidth = nameWidth + comps.length * cellWidth;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const ClampingScrollPhysics(),
      child: SizedBox(
        width: tableWidth,
        child: Column(
          children: [
            // Header row
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8),
              color: AppColors.primarySoft,
              child: Row(
                children: [
                  SizedBox(
                    width: nameWidth,
                    child: Padding(
                      padding: const EdgeInsets.only(left: 14),
                      child: Text(
                        tr(context, 'student'),
                        style: const TextStyle(
                            fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.primary),
                      ),
                    ),
                  ),
                  ...comps.map((c) => SizedBox(
                        width: cellWidth,
                        child: Column(
                          children: [
                            Text(
                              c.name,
                              style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.primary),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              '${c.percentage}%',
                              style: const TextStyle(
                                  fontSize: 9, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      )),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.only(bottom: 8),
                itemCount: students.length,
                itemBuilder: (context, idx) {
                  final student = students[idx];
                  return Container(
                    decoration: BoxDecoration(
                      color: idx.isEven
                          ? (Theme.of(context).brightness == Brightness.dark
                              ? const Color(0xFF161616)
                              : Colors.white)
                          : (Theme.of(context).brightness == Brightness.dark
                              ? const Color(0xFF1B1B1B)
                              : const Color(0xFFFAFAFA)),
                      border: Border(bottom: BorderSide(color: AppColors.border.withOpacity(0.6))),
                    ),
                    child: Row(
                      children: [
                        SizedBox(
                          width: nameWidth,
                          child: Padding(
                            padding: const EdgeInsets.only(left: 14, right: 6),
                            child: Row(
                              children: [
                                Container(
                                  width: 26,
                                  height: 26,
                                  alignment: Alignment.center,
                                  decoration: const BoxDecoration(
                                    color: AppColors.primarySoft,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Text(
                                    classIdLabel(student.rollNumber),
                                    style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.primary),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    student.studentName,
                                    style: const TextStyle(
                                        fontSize: 13, fontWeight: FontWeight.w700),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        ...comps.map((c) {
                          final locked = _isLocked(student, c);
                          final val = student.marks[c.name] ?? 0.0;
                          return SizedBox(
                            width: cellWidth,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
                              child: SizedBox(
                                height: 34,
                                child: TextFormField(
                                  key: ValueKey('${student.studentId}_${c.name}'),
                                  initialValue: val > 0 ? _fmt(val) : '',
                                  enabled: !locked && !_formLocked,
                                  keyboardType:
                                      const TextInputType.numberWithOptions(decimal: true),
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: locked ? AppColors.textSecondary : null,
                                  ),
                                  decoration: InputDecoration(
                                    hintText: locked ? '' : '0',
                                    suffixIcon: locked
                                        ? const Icon(Icons.lock, size: 12)
                                        : null,
                                    suffixIconConstraints:
                                        const BoxConstraints(maxHeight: 24, maxWidth: 20),
                                    isDense: true,
                                    contentPadding: const EdgeInsets.symmetric(vertical: 8),
                                    border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(10)),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(10),
                                      borderSide: BorderSide(
                                        color: locked
                                            ? AppColors.success.withOpacity(0.5)
                                            : AppColors.border,
                                      ),
                                    ),
                                    filled: locked,
                                    fillColor: locked
                                        ? AppColors.successSoft.withOpacity(0.5)
                                        : null,
                                  ),
                                  onChanged: (txt) {
                                    final parsed = double.tryParse(txt);
                                    student.marks[c.name] = parsed ?? 0.0;
                                    _recomputeTotal(student);
                                    setState(() {});
                                  },
                                ),
                              ),
                            ),
                          );
                        }),
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

  static String _fmt(double v) {
    if (v == v.roundToDouble()) return v.toInt().toString();
    return v.toStringAsFixed(2).replaceFirst(RegExp(r'\.?0+$'), '');
  }

  // ----------------------------------------------------------- one-by-one

  Widget _buildOneByOneView(List<StudentMarkRow> students) {
    if (_oneByOneIndex >= students.length) _oneByOneIndex = 0;
    final student = students[_oneByOneIndex];
    final comps = _visibleComponents;

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.primarySoft,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Student ${_oneByOneIndex + 1} of ${students.length}',
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.primary),
                ),
                StatusPill(
                  '${student.total.toStringAsFixed(1)}% (${student.passStatus})',
                  color: student.passStatus == 'Pass' ? AppColors.success : AppColors.danger,
                  bg: student.passStatus == 'Pass' ? AppColors.successSoft : AppColors.dangerSoft,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: AppCard(
              padding: const EdgeInsets.all(20),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        AvatarCircle(name: student.studentName, size: 50),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                student.studentName,
                                style: const TextStyle(
                                    fontSize: 18, fontWeight: FontWeight.w800),
                              ),
                              Text(
                                '${tr(context, 'student_number')}: ${classIdLabel(student.rollNumber)}',
                                style: const TextStyle(
                                    color: AppColors.textSecondary, fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 28),
                    ...comps.map((comp) {
                      final locked = _isLocked(student, comp);
                      final currentVal = student.marks[comp.name] ?? 0.0;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: Row(
                          children: [
                            Expanded(
                              flex: 2,
                              child: Text(
                                comp.name,
                                style: const TextStyle(
                                    fontSize: 14, fontWeight: FontWeight.w700),
                              ),
                            ),
                            Container(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.surfaceAlt,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                locked
                                    ? tr(context, 'locked')
                                    : 'Max: ${comp.percentage}%',
                                style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: locked ? AppColors.success : AppColors.textSecondary),
                              ),
                            ),
                            const SizedBox(width: 12),
                            SizedBox(
                              width: 75,
                              child: TextFormField(
                                key: ValueKey('${student.studentId}_${comp.name}_oo'),
                                initialValue: currentVal > 0 ? _fmt(currentVal) : '',
                                enabled: !locked && !_formLocked,
                                keyboardType:
                                    const TextInputType.numberWithOptions(decimal: true),
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                    fontSize: 15, fontWeight: FontWeight.w800),
                                decoration: InputDecoration(
                                  hintText: '0',
                                  prefixIcon: locked
                                      ? const Icon(Icons.lock, size: 14)
                                      : null,
                                  contentPadding: const EdgeInsets.symmetric(vertical: 8),
                                  border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12)),
                                ),
                                onChanged: (val) {
                                  final parsed = double.tryParse(val) ?? 0.0;
                                  student.marks[comp.name] = parsed;
                                  _recomputeTotal(student);
                                  setState(() {});
                                },
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _oneByOneIndex > 0
                      ? () => setState(() => _oneByOneIndex--)
                      : null,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                  ),
                  child: Text(tr(context, 'previous')),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _oneByOneIndex < students.length - 1
                      ? () => setState(() => _oneByOneIndex++)
                      : null,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                  ),
                  child: Text(tr(context, 'next')),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ------------------------------------------------------------ create form

  Widget _buildCreateFormView() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: AppCard(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.note_add_outlined, size: 48, color: AppColors.primary),
              const SizedBox(height: 12),
              const Text(
                'Initialize Mark List',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 6),
              Text(
                'No mark components configured for ${_selectedAssignment?.subjectName} (${_selectedAssignment?.className}) Term $_selectedTerm yet.',
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
              const SizedBox(height: 20),
              PrimaryButton(
                label: 'Create Standard Components (100%)',
                onPressed: () async {
                  setState(() => _loading = true);
                  final defaultComponents = [
                    MarkComponentConfig(name: 'practical_1', percentage: 5),
                    MarkComponentConfig(name: 'test_1', percentage: 10),
                    MarkComponentConfig(name: 'practical_2', percentage: 5),
                    MarkComponentConfig(name: 'test_2', percentage: 10),
                    MarkComponentConfig(name: 'mid', percentage: 25),
                    MarkComponentConfig(name: 'book', percentage: 5),
                    MarkComponentConfig(name: 'final', percentage: 40),
                  ];
                  final ok = await ApiService().createMarkForms(
                    subjectName: _selectedAssignment!.subjectName,
                    className: _selectedAssignment!.className,
                    termNumber: _selectedTerm,
                    components: defaultComponents,
                  );
                  if (ok) {
                    await _fetchMarkList(force: true);
                  } else {
                    if (mounted) showError(context, 'Failed to create mark list');
                    setState(() => _loading = false);
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Aggregated mark-list stats for one subject form (used by the Report tab).
class _SubjStats {
  _SubjStats({
    required this.subject,
    required this.term,
    this.available = false,
  });

  _SubjStats.from({
    required this.subject,
    required this.term,
    required List<MapEntry<String, double>> totals,
    required int threshold,
  }) : available = totals.isNotEmpty {
    if (totals.isEmpty) return;
    total = totals.length;
    var sum = 0.0;
    ranked = [...totals]..sort((a, b) => b.value.compareTo(a.value));
    for (final t in totals) {
      sum += t.value;
      final g = t.value >= 90
          ? 'A (90-100)'
          : t.value >= 80
              ? 'B (80-89)'
              : t.value >= 70
                  ? 'C (70-79)'
                  : t.value >= 60
                      ? 'D (60-69)'
                      : 'F (0-59)';
      grades[g] = (grades[g] ?? 0) + 1;
      if (t.value >= threshold) passCount++;
    }
    avg = sum / totals.length;
    passPct = (passCount / totals.length) * 100;
    highName = ranked.first.key;
    high = ranked.first.value;
    lowName = ranked.last.key;
    low = ranked.last.value;
  }

  final String subject;
  final int term;
  final bool available;
  int total = 0;
  int passCount = 0;
  double avg = 0;
  double high = 0;
  double low = 0;
  String highName = '';
  String lowName = '';
  double passPct = 0;
  Map<String, int> grades = {'A (90-100)': 0, 'B (80-89)': 0, 'C (70-79)': 0, 'D (60-69)': 0, 'F (0-59)': 0};
  List<MapEntry<String, double>> ranked = [];
}
