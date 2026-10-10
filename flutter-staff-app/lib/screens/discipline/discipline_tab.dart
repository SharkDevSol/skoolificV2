import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/services/api_service.dart';
import '../../core/services/offline_service.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/page_header.dart';
import '../../app/app_provider.dart';
import '../../models/models.dart';

class DisciplineTab extends StatefulWidget {
  const DisciplineTab({super.key});

  @override
  State<DisciplineTab> createState() => _DisciplineTabState();
}

class _DisciplineTabState extends State<DisciplineTab> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  // Form State
  String? _selectedClass;
  String? _selectedStudent;
  String _faultType = 'Late Arrival';
  String _faultLevel = 'Minor';
  DateTime _faultDate = DateTime.now();
  String _reportedBy = '';
  final _descCtrl = TextEditingController();
  bool _submitting = false;

  // Students list for dropdown
  List<Map<String, dynamic>> _students = [];
  bool _loadingStudents = false;

  // History State
  List<FaultRecord> _faultHistory = [];
  bool _loadingHistory = false;

  /// The full 85-type list the web admin uses (FaultsPage.jsx) — grouped so
  /// the picker stays usable on a phone.
  static const Map<String, List<String>> _faultCategories = {
    'Attendance': [
      'Late Arrival', 'Absence Without Notice', 'Truancy',
      'Leaving Class Without Permission', 'Leaving School Without Permission',
      'Skipping Class',
    ],
    'Academic': [
      'Incomplete Homework', 'Late Homework Submission', 'No Homework',
      'Cheating', 'Plagiarism', 'Copying from Others', 'Unprepared for Class',
      'Not Bringing Required Materials', 'Sleeping in Class',
      'Not Participating in Class',
    ],
    'Behavioral': [
      'Disruptive Behavior', 'Talking During Class', 'Making Noise',
      'Disturbing Others', 'Disrespect to Teacher', 'Disrespect to Staff',
      'Disrespect to Students', 'Insubordination', 'Defiance',
      'Arguing with Teacher', 'Refusing to Follow Instructions',
    ],
    'Bullying': [
      'Bullying', 'Verbal Bullying', 'Physical Bullying', 'Cyberbullying',
      'Harassment', 'Intimidation', 'Threatening Others',
    ],
    'Physical': [
      'Fighting', 'Physical Aggression', 'Pushing/Shoving', 'Hitting',
      'Kicking', 'Horseplay',
    ],
    'Language': [
      'Profanity', 'Inappropriate Language', 'Vulgar Gestures', 'Name Calling',
      'Gossiping', 'Spreading Rumors',
    ],
    'Dress Code': [
      'Uniform Violation', 'Improper Uniform', 'Missing Uniform Items',
      'Inappropriate Clothing', 'Dress Code Violation', 'Improper Grooming',
    ],
    'Technology': [
      'Phone Use in Class', 'Unauthorized Device Use',
      'Inappropriate Internet Use', 'Social Media Misuse',
      'Taking Unauthorized Photos/Videos', 'Gaming During Class',
    ],
    'Property': [
      'Vandalism', 'Damaging School Property', 'Graffiti', 'Littering',
      'Theft', 'Stealing', 'Misusing School Property',
    ],
    'Safety': [
      'Running in Hallways', 'Unsafe Behavior', 'Not Following Safety Rules',
      'Reckless Behavior', 'Dangerous Play',
    ],
    'Food': [
      'Eating in Class', 'Food Fight', 'Cafeteria Misconduct',
      'Not Cleaning Up After Eating',
    ],
    'Substance': [
      'Smoking', 'Possession of Prohibited Items', 'Substance Abuse',
    ],
    'Dishonesty': [
      'Lying', 'Forgery', 'Falsifying Documents', 'Providing False Information',
    ],
    'Other': [
      'Public Display of Affection', 'Inappropriate Behavior',
      'Violation of School Rules', 'Other',
    ],
  };

  static const List<String> _faultLevels = ['Minor', 'Major', 'Critical'];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);

    final prov = Provider.of<AppProvider>(context, listen: false);
    _reportedBy = prov.profile?.name.isNotEmpty == true
        ? prov.profile!.name
        : (prov.user?.name ?? prov.user?.username ?? '');
    if (prov.assignedClasses.isNotEmpty) {
      _selectedClass = prov.assignedClasses.first;
    } else if (prov.markAssignments.isNotEmpty) {
      _selectedClass = prov.markAssignments.first.className;
    }
    _loadStudents();
    _loadHistory();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  String get _rosterKey => 'fault_students_${_selectedClass ?? 'none'}';

  /// Shared roster cache — written by Attendance/Marks/Discipline, so the
  /// names are available offline even if the discipline page itself was
  /// never opened online.
  String get _sharedRosterKey => 'class_students_${_selectedClass ?? 'none'}';

  Future<void> _loadStudents() async {
    if (_selectedClass == null) return;
    setState(() => _loadingStudents = true);

    // Cache-first: names show instantly and stay available offline.
    for (final key in [_rosterKey, _sharedRosterKey]) {
      final cached = OfflineService.readCache<List>(key);
      if (cached != null && cached.isNotEmpty) {
        final list =
            cached.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        if (mounted) {
          setState(() {
            _students = list;
            _keepStudentSelection(list);
          });
        }
        break;
      }
    }

    try {
      final list = await ApiService().getFaultStudents(_selectedClass!);
      if (list.isNotEmpty) {
        await OfflineService.cache(_rosterKey, list);
        await OfflineService.cache(_sharedRosterKey, list);
        if (mounted) {
          setState(() {
            _students = list;
            _keepStudentSelection(list);
          });
        }
      }
    } catch (_) {
      // Keep whatever the cache provided.
    } finally {
      if (mounted) setState(() => _loadingStudents = false);
    }
  }

  void _keepStudentSelection(List<Map<String, dynamic>> list) {
    final stillThere = _selectedStudent != null &&
        list.any((s) =>
            (s['student_name']?.toString() ?? s['name']?.toString()) ==
            _selectedStudent);
    if (!stillThere) {
      _selectedStudent = list.isEmpty
          ? null
          : (list.first['student_name']?.toString() ?? list.first['name']?.toString());
    }
  }

  /// All 85 fault types as one dropdown: a disabled section header per
  /// category followed by its types (headers can never be selected).
  List<DropdownMenuItem<String>> _buildFaultTypeItems() {
    final items = <DropdownMenuItem<String>>[];
    _faultCategories.forEach((category, types) {
      items.add(DropdownMenuItem<String>(
        value: '##$category',
        enabled: false,
        child: Text(
          category.toUpperCase(),
          style: const TextStyle(
              fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.textSecondary),
        ),
      ));
      for (final t in types) {
        items.add(DropdownMenuItem<String>(
          value: t,
          child:
              Text(t, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
        ));
      }
    });
    return items;
  }

  Future<void> _loadHistory() async {
    if (_selectedClass == null) return;
    setState(() => _loadingHistory = true);
    try {
      final history = await ApiService().getFaultHistory(_selectedClass!);
      if (mounted) setState(() => _faultHistory = history);
    } catch (_) {}
    finally {
      if (mounted) setState(() => _loadingHistory = false);
    }
  }

  Future<void> _submitFault() async {
    if (_selectedClass == null || _selectedStudent == null || _selectedStudent!.isEmpty) {
      showError(context, 'Please select both class and student');
      return;
    }
    if (_descCtrl.text.trim().isEmpty) {
      showError(context, 'Please provide an incident description');
      return;
    }

    setState(() => _submitting = true);
    try {
      final date =
          '${_faultDate.year.toString().padLeft(4, '0')}-${_faultDate.month.toString().padLeft(2, '0')}-${_faultDate.day.toString().padLeft(2, '0')}';
      final payload = <String, dynamic>{
        'studentName': _selectedStudent!,
        'className': _selectedClass!,
        'faultType': _faultType,
        'faultLevel': _faultLevel,
        'date': date,
        'description': _descCtrl.text.trim(),
        'reportedBy': _reportedBy.trim().isEmpty ? 'Staff' : _reportedBy.trim(),
      };

      var ok = false;
      final online = await OfflineService.isOnline();
      if (online) {
        try {
          ok = await ApiService().addFault(
            studentName: payload['studentName'] as String,
            className: payload['className'] as String,
            faultType: payload['faultType'] as String,
            faultLevel: payload['faultLevel'] as String,
            date: payload['date'] as String,
            description: payload['description'] as String,
            reportedBy: payload['reportedBy'] as String,
            attachmentPath: null,
          );
        } catch (_) {
          ok = false;
        }
        if (ok) await OfflineService.flush();
      }

      if (!ok) {
        // Offline (or server unreachable) — queue it and sync later.
        await OfflineService.enqueue('add_fault', payload);
      }

      if (mounted) {
        if (ok) {
          showSuccess(context, 'Fault record submitted successfully');
        } else {
          showSuccess(context, tr(context, 'saved_offline_pending'));
        }
        _descCtrl.clear();
        if (ok) {
          _loadHistory();
          _tabCtrl.animateTo(1); // Switch to history tab (queued record isn't there yet)
        }
      }
    } catch (e) {
      if (mounted) showError(context, 'Error: $e');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _faultDate,
      firstDate: DateTime(2024),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _faultDate = picked);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final prov = Provider.of<AppProvider>(context);

    final availableClasses = <String>{
      ...prov.markAssignments.map((a) => a.className),
      ...prov.assignedClasses,
    }.toList();

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            PageHeader(
              title: tr(context, 'discipline'),
              icon: Icons.gavel,
            ),

            // Tab Bar
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF2C2C2C) : AppColors.surfaceAlt,
                borderRadius: BorderRadius.circular(24),
              ),
              child: TabBar(
                controller: _tabCtrl,
                indicator: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(24),
                ),
                indicatorSize: TabBarIndicatorSize.tab,
                labelColor: Colors.white,
                unselectedLabelColor: isDark ? Colors.white60 : AppColors.textSecondary,
                labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                dividerColor: Colors.transparent,
                tabs: const [
                  Tab(text: 'Record Fault'),
                  Tab(text: 'Incident History'),
                ],
              ),
            ),

            // Tab Views
            Expanded(
              child: TabBarView(
                controller: _tabCtrl,
                children: [
                  // 1. RECORD FORM
                  SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: AppCard(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Class Selector
                          Text(tr(context, 'class_label'), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF2C2C2C) : AppColors.surfaceAlt,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                isExpanded: true,
                                value: _selectedClass,
                                hint: Text(tr(context, 'class_label')),
                                items: availableClasses.map((c) {
                                  return DropdownMenuItem(
                                    value: c,
                                    child: Text('Class $c', style: const TextStyle(fontWeight: FontWeight.w700)),
                                  );
                                }).toList(),
                                onChanged: (val) {
                                  if (val != null) {
                                    setState(() => _selectedClass = val);
                                    _loadStudents();
                                  }
                                },
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Student Selector
                          Text(tr(context, 'student_name'), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF2C2C2C) : AppColors.surfaceAlt,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: (_loadingStudents && _students.isEmpty)
                                ? const SizedBox(height: 48, child: Center(child: AppLoadingIndicator()))
                                : DropdownButtonHideUnderline(
                                    child: DropdownButton<String>(
                                      isExpanded: true,
                                      value: _selectedStudent,
                                      hint: Text(tr(context, 'student_name')),
                                      items: _students.map((s) {
                                        final sName = s['student_name']?.toString() ?? s['name']?.toString() ?? '';
                                        return DropdownMenuItem(
                                          value: sName,
                                          child: Text(sName, style: const TextStyle(fontWeight: FontWeight.w700)),
                                        );
                                      }).toList(),
                                      onChanged: (val) => setState(() => _selectedStudent = val),
                                    ),
                                  ),
                          ),
                          const SizedBox(height: 16),

                          // Fault Type — one dropdown with ALL 85 types from the
                          // web admin (https://iqra.skoolific.com/faults),
                          // grouped by category with section headers.
                          Text(tr(context, 'fault_type'), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF2C2C2C) : AppColors.surfaceAlt,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                isExpanded: true,
                                value: _faultType,
                                hint: Text(tr(context, 'fault_type'),
                                    style: const TextStyle(fontSize: 13)),
                                items: _buildFaultTypeItems(),
                                onChanged: (val) {
                                  if (val != null && !val.startsWith('##')) {
                                    setState(() => _faultType = val);
                                  }
                                },
                              ),
                            ),
                          ),
                          const SizedBox(height: 18),

                          // Fault level (matches web admin: Minor/Major/Critical)
                          Text(tr(context, 'fault_level'),
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 8),
                          Row(
                            children: _faultLevels.map((lvl) {
                              final isSel = _faultLevel == lvl;
                              final color = lvl == 'Critical'
                                  ? AppColors.danger
                                  : lvl == 'Major'
                                      ? AppColors.warning
                                      : AppColors.info;
                              return Expanded(
                                child: GestureDetector(
                                  onTap: () => setState(() => _faultLevel = lvl),
                                  child: Container(
                                    margin: const EdgeInsets.only(right: 8),
                                    padding: const EdgeInsets.symmetric(vertical: 9),
                                    decoration: BoxDecoration(
                                      color: isSel ? color : color.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    child: Text(
                                      lvl,
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w800,
                                        color: isSel ? Colors.white : color,
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 16),

                          // Date + reporter
                          Row(
                            children: [
                              Expanded(
                                child: GestureDetector(
                                  onTap: _pickDate,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 12, vertical: 12),
                                    decoration: BoxDecoration(
                                      color: isDark
                                          ? const Color(0xFF2C2C2C)
                                          : AppColors.surfaceAlt,
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.calendar_today,
                                            size: 16, color: AppColors.primary),
                                        const SizedBox(width: 8),
                                        Text(
                                          '${_faultDate.year}-${_faultDate.month.toString().padLeft(2, '0')}-${_faultDate.day.toString().padLeft(2, '0')}',
                                          style: const TextStyle(
                                              fontSize: 13, fontWeight: FontWeight.w700),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: TextField(
                                  controller: TextEditingController(text: _reportedBy)
                                    ..selection = TextSelection.collapsed(
                                        offset: _reportedBy.length),
                                  onChanged: (v) => _reportedBy = v,
                                  decoration: InputDecoration(
                                    labelText: tr(context, 'reported_by'),
                                    labelStyle: const TextStyle(fontSize: 12),
                                    isDense: true,
                                    fillColor: isDark
                                        ? const Color(0xFF2C2C2C)
                                        : AppColors.surfaceAlt,
                                    border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(16)),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          // Description
                          Text(tr(context, 'description'), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 6),
                          TextField(
                            controller: _descCtrl,
                            maxLines: 4,
                            decoration: InputDecoration(
                              hintText: 'Enter incident details, actions taken...',
                              fillColor: isDark ? const Color(0xFF2C2C2C) : AppColors.surfaceAlt,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                            ),
                          ),
                          const SizedBox(height: 24),

                          PrimaryButton(
                            label: tr(context, 'submit'),
                            loading: _submitting,
                            onPressed: _submitFault,
                          ),
                        ],
                      ),
                    ),
                  ),

                  // 2. INCIDENT HISTORY
                  _loadingHistory
                      ? const Center(child: AppLoadingIndicator())
                      : _faultHistory.isEmpty
                          ? EmptyState(
                              icon: Icons.history_edu,
                              message: 'No discipline records for this class',
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _faultHistory.length,
                              itemBuilder: (context, idx) {
                                final f = _faultHistory[idx];
                                return Container(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  child: AppCard(
                                    padding: const EdgeInsets.all(16),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Flexible(
                                              child: Text(
                                                f.studentName,
                                                style: const TextStyle(
                                                    fontWeight: FontWeight.w800, fontSize: 15),
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                            Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                StatusPill(
                                                  f.level,
                                                  color: f.level == 'Critical' || f.level == 'High'
                                                      ? AppColors.danger
                                                      : f.level == 'Major' || f.level == 'Medium'
                                                          ? AppColors.warning
                                                          : AppColors.info,
                                                  bg: f.level == 'Critical' || f.level == 'High'
                                                      ? AppColors.dangerSoft
                                                      : f.level == 'Major' || f.level == 'Medium'
                                                          ? AppColors.warningSoft
                                                          : AppColors.infoSoft,
                                                ),
                                                const SizedBox(width: 6),
                                                StatusPill(
                                                  f.faultType,
                                                  color: AppColors.danger,
                                                  bg: AppColors.dangerSoft,
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          f.description,
                                          style: const TextStyle(fontSize: 13, height: 1.4),
                                        ),
                                        const SizedBox(height: 10),
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              'Class: ${f.className}',
                                              style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                                            ),
                                            if (f.date != null)
                                              Text(
                                                f.date!.split('T')[0],
                                                style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                                              ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
