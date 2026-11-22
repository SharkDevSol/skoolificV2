import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/services/api_service.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/page_header.dart';
import '../../app/app_provider.dart';

class EvalBookTab extends StatefulWidget {
  const EvalBookTab({super.key});

  @override
  State<EvalBookTab> createState() => _EvalBookTabState();
}

class _EvalBookTabState extends State<EvalBookTab> {
  String? _selectedClass;
  DateTime _selectedDate = DateTime.now();
  bool _loading = false;
  bool _saving = false;
  List<Map<String, dynamic>> _students = [];
  final Map<String, Map<String, dynamic>> _evalData = {};

  final List<String> _criteria = ['Homework', 'Quran/Islamic', 'Behavior', 'Participation'];

  @override
  void initState() {
    super.initState();
    final prov = Provider.of<AppProvider>(context, listen: false);
    if (prov.markAssignments.isNotEmpty) {
      _selectedClass = prov.markAssignments.first.className;
    } else if (prov.assignedClasses.isNotEmpty) {
      _selectedClass = prov.assignedClasses.first;
    }
    _loadStudents();
  }

  Future<void> _loadStudents() async {
    if (_selectedClass == null) return;
    setState(() => _loading = true);
    try {
      final list = await ApiService().getClassStudents(_selectedClass!);
      setState(() {
        _students = list;
        for (final s in list) {
          final id = s['student_id']?.toString() ?? s['id']?.toString() ?? '';
          if (!_evalData.containsKey(id)) {
            _evalData[id] = {
              'Homework': 'Good',
              'Quran/Islamic': 'Good',
              'Behavior': 'Good',
              'Participation': 'Good',
            };
          }
        }
      });
    } catch (_) {}
    finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _saveAndSend() async {
    if (_selectedClass == null || _students.isEmpty) return;
    setState(() => _saving = true);
    try {
      final ok = await ApiService().submitDailyEvaluation({
        'class': _selectedClass,
        'date': _selectedDate.toISOString(),
        'entries': _evalData,
      });

      if (mounted) {
        if (ok) {
          showSuccess(context, 'Daily evaluations saved successfully');
        } else {
          showError(context, 'Failed to save evaluations');
        }
      }
    } catch (e) {
      if (mounted) showError(context, 'Error: $e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
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
              title: tr(context, 'eval_book'),
              icon: Icons.menu_book,
            ),

            // Controls
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
              child: Row(
                children: [
                  // Class Dropdown
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
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
                              child: Text('Class $c', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
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
                  ),
                  const SizedBox(width: 12),

                  // Date button
                  GestureDetector(
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _selectedDate,
                        firstDate: DateTime(2025),
                        lastDate: DateTime(2028),
                      );
                      if (picked != null) {
                        setState(() => _selectedDate = picked);
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF2C2C2C) : AppColors.surfaceAlt,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.calendar_today, size: 16, color: AppColors.primary),
                          const SizedBox(width: 8),
                          Text(
                            '${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Students Evaluation List
            Expanded(
              child: _loading
                  ? const Center(child: AppLoadingIndicator())
                  : _students.isEmpty
                      ? EmptyState(
                          icon: Icons.menu_book,
                          message: 'No students found for Class ${_selectedClass ?? ''}',
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _students.length,
                          itemBuilder: (context, idx) {
                            final s = _students[idx];
                            final id = s['student_id']?.toString() ?? s['id']?.toString() ?? '';
                            final name = s['student_name']?.toString() ?? s['name']?.toString() ?? '';
                            final currentScores = _evalData[id] ?? {};

                            return Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              child: AppCard(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        AvatarCircle(name: name, size: 36),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Text(
                                            name,
                                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 12),

                                    // Criteria evaluation rows
                                    ..._criteria.map((c) {
                                      final score = currentScores[c]?.toString() ?? 'Good';
                                      return Padding(
                                        padding: const EdgeInsets.only(bottom: 8),
                                        child: Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(c, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                            Row(
                                              children: ['Excellent', 'Good', 'Needs Imp.'].map((val) {
                                                final isSel = score == val;
                                                return GestureDetector(
                                                  onTap: () {
                                                    setState(() {
                                                      currentScores[c] = val;
                                                    });
                                                  },
                                                  child: Container(
                                                    margin: const EdgeInsets.only(left: 6),
                                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                    decoration: BoxDecoration(
                                                      color: isSel ? AppColors.primary : AppColors.surfaceAlt,
                                                      borderRadius: BorderRadius.circular(8),
                                                    ),
                                                    child: Text(
                                                      val,
                                                      style: TextStyle(
                                                        fontSize: 10,
                                                        fontWeight: FontWeight.w700,
                                                        color: isSel ? Colors.white : AppColors.textSecondary,
                                                      ),
                                                    ),
                                                  ),
                                                );
                                              }).toList(),
                                            ),
                                          ],
                                        ),
                                      );
                                    }),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _students.isNotEmpty
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
              child: PrimaryButton(
                label: 'Save & Submit Evaluations',
                loading: _saving,
                onPressed: _saveAndSend,
              ),
            )
          : null,
    );
  }
}

extension on DateTime {
  String toISOString() => '${year.toString().padLeft(4, '0')}-${month.toString().padLeft(2, '0')}-${day.toString().padLeft(2, '0')}';
}
