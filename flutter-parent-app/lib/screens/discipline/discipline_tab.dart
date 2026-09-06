import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/api_service.dart';
import '../../app/app_provider.dart';
import '../../widgets/app_widgets.dart';
import '../../models/models.dart';
import '../../core/l10n/app_localizations.dart';

// 7.1: Discipline — connected to backend Faults data, styled to match the app
class DisciplineTab extends StatefulWidget {
  const DisciplineTab({super.key});
  @override
  State<DisciplineTab> createState() => _DisciplineTabState();
}

class _DisciplineTabState extends State<DisciplineTab> {
  List<FaultRecord> _faults = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  // load faults for the selected ward's class, filtered to that ward
  Future<void> _fetch() async {
    final app = Provider.of<AppProvider>(context, listen: false);
    final ward = app.selectedWard;
    if (ward == null || (ward.className ?? '').isEmpty) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    if (mounted) setState(() => _loading = true);
    try {
      var faults = await ApiService().classFaults(ward.className!);
      // keep only this ward's records (case-insensitive)
      faults = faults
          .where((f) => f.studentName.toLowerCase() == ward.studentName.toLowerCase())
          .toList();
      if (mounted) {
        setState(() {
          _faults = faults;
          _error = null;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = Provider.of<AppProvider>(context);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return GradientBackground(
      child: Column(
        children: [
          // FIX 7: proper header inside SafeArea (no status-bar overlap)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.primary.withOpacity(0.2) : AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.gavel_outlined, color: AppColors.primary, size: 20),
                ),
                const SizedBox(width: 12),
                Text(
                  AppLocalizations.tr(context, 'discipline'),
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : AppColors.primaryDark,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _fetch,
              child: ListView(
                padding: const EdgeInsets.only(left: 16, right: 16, top: 8, bottom: 100),
                children: [
                  // Ward selector
                  if (app.wards.isNotEmpty)
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
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

                  if (_loading)
                    const Column(children: [
                      SkeletonCard(height: 120),
                      SizedBox(height: 12),
                      SkeletonCard(height: 120),
                    ])
                  else if (_error != null)
                    EmptyState(icon: Icons.error_outline, message: _error!)
                  else if (_faults.isEmpty)
                    EmptyState(
                        icon: Icons.gavel_outlined,
                        message: AppLocalizations.tr(context, 'no_discipline'))
                  else
                    ..._faults.map((f) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: AppCard(
                            padding: const EdgeInsets.all(20),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: isDark ? AppColors.danger.withOpacity(0.15) : AppColors.dangerSoft,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Icon(Icons.gavel_outlined,
                                          color: AppColors.danger, size: 20),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Text(
                                        f.type,
                                        style: theme.textTheme.titleMedium?.copyWith(fontSize: 16),
                                      ),
                                    ),
                                    StatusPill(
                                      f.level,
                                      color: AppColors.danger,
                                      bg: isDark ? AppColors.danger.withOpacity(0.15) : AppColors.dangerSoft,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  f.description,
                                  style: TextStyle(
                                    color: isDark ? Colors.white70 : AppColors.textSecondary,
                                    fontSize: 14,
                                    height: 1.5,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Icon(Icons.person_outline,
                                        size: 14, color: isDark ? Colors.white38 : AppColors.textMuted),
                                    const SizedBox(width: 4),
                                    Expanded(
                                      child: Text(
                                        'Reported by: ${f.reportedBy}',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: isDark ? Colors.white38 : AppColors.textMuted,
                                        ),
                                      ),
                                    ),
                                    if (f.date != null) ...[
                                      Icon(Icons.calendar_today_outlined,
                                          size: 14, color: isDark ? Colors.white38 : AppColors.textMuted),
                                      const SizedBox(width: 4),
                                      Text(
                                        _shortDate(f.date!),
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: isDark ? Colors.white38 : AppColors.textMuted,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                if (f.actionTaken?.isNotEmpty ?? false) ...[
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      Icon(Icons.task_alt,
                                          size: 14, color: AppColors.success),
                                      const SizedBox(width: 4),
                                      Expanded(
                                        child: Text(
                                          'Action: ${f.actionTaken}',
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: isDark ? Colors.white54 : AppColors.success,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ],
                            ),
                          ),
                        )),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _shortDate(String d) {
    try {
      final dt = DateTime.parse(d);
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return d.length > 10 ? d.substring(0, 10) : d;
    }
  }
}
