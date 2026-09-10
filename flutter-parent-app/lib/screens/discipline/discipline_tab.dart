import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/api_service.dart';
import '../../app/app_provider.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/page_header.dart';
import '../../models/models.dart';
import '../../core/l10n/app_localizations.dart';

// 6: Discipline — redesigned: header, cleaner cards, tap opens detail popup
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

  Color _levelColor(String level) {
    switch (level.toLowerCase()) {
      case 'major':
        return AppColors.danger;
      case 'moderate':
        return AppColors.accent;
      default:
        return const Color(0xFF7A8B99);
    }
  }

  IconData _levelIcon(String level) {
    switch (level.toLowerCase()) {
      case 'major':
        return Icons.warning_amber_rounded;
      case 'moderate':
        return Icons.error_outline;
      default:
        return Icons.info_outline;
    }
  }

  void _showDetail(FaultRecord f) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final color = _levelColor(f.level);
    final border = isDark ? const Color(0xFF2C2C2C) : AppColors.border;
    final card = isDark ? const Color(0xFF1F1F1F) : Colors.white;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.35,
        maxChildSize: 0.9,
        builder: (ctx, scrollCtrl) => Container(
          decoration: BoxDecoration(
            color: card,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: ListView(
            controller: scrollCtrl,
            padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
            children: [
              // grab handle
              Container(
                width: 44,
                height: 5,
                margin: const EdgeInsets.only(top: 4, bottom: 18),
                decoration: BoxDecoration(
                  color: Colors.grey.shade400,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              // top row: icon + level
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: color.withOpacity(isDark ? 0.2 : 0.12),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Icon(_levelIcon(f.level), color: color, size: 28),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          f.type,
                          style: theme.textTheme.titleLarge
                              ?.copyWith(fontWeight: FontWeight.w800, fontSize: 20),
                        ),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(
                            color: color.withOpacity(isDark ? 0.2 : 0.12),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            f.level,
                            style: TextStyle(
                              color: color,
                              fontWeight: FontWeight.w700,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 22),
              _detailTile(theme, border, isDark,
                  icon: Icons.person_outline,
                  label: tr(ctx, 'student'),
                  value: f.studentName),
              _detailTile(theme, border, isDark,
                  icon: Icons.gavel_outlined,
                  label: tr(ctx, 'discipline'),
                  value: f.type),
              _detailTile(theme, border, isDark,
                  icon: Icons.description_outlined,
                  label: tr(ctx, 'description'),
                  value: f.description),
              _detailTile(theme, border, isDark,
                  icon: Icons.person_outline,
                  label: tr(ctx, 'reported_by'),
                  value: f.reportedBy),
              _detailTile(theme, border, isDark,
                  icon: Icons.calendar_today_outlined,
                  label: tr(ctx, 'payment_date'),
                  value: _shortDate(f.date)),
              if (f.actionTaken?.isNotEmpty ?? false)
                _detailTile(theme, border, isDark,
                    icon: Icons.task_alt,
                    label: tr(ctx, 'action'),
                    value: f.actionTaken!),
              const SizedBox(height: 12),
              // action banner
              if (f.actionTaken?.isNotEmpty ?? false)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.success.withOpacity(isDark ? 0.12 : 0.08),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle, color: AppColors.success, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          f.actionTaken!,
                          style: TextStyle(
                            color: isDark ? Colors.white70 : AppColors.success,
                            fontSize: 13,
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _detailTile(ThemeData theme, Color border, bool isDark,
      {required IconData icon, required String label, required String value}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF2C2C2C) : Colors.grey.shade50,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: border.withOpacity(0.6)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppColors.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? Colors.white38 : AppColors.textMuted,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  value.isEmpty ? '—' : value,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontSize: 14,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _shortDate(String? d) {
    if (d == null || d.isEmpty) return '—';
    try {
      final dt = DateTime.parse(d);
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return d.length > 10 ? d.substring(0, 10) : d;
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = Provider.of<AppProvider>(context);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            // FIX 6: proper app header on the discipline page
            PageHeader(
              title: tr(context, 'discipline'),
              icon: Icons.gavel_outlined,
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: _fetch,
                child: ListView(
                  padding: const EdgeInsets.only(left: 16, right: 16, top: 8, bottom: 24),
                  children: [
                    if (app.wards.length > 1)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: _wardChip(theme, isDark),
                      ),

                    if (_loading)
                      const Column(children: [
                        SkeletonCard(height: 100),
                        SizedBox(height: 12),
                        SkeletonCard(height: 100),
                      ])
                    else if (_error != null)
                      EmptyState(icon: Icons.error_outline, message: _error!)
                    else if (_faults.isEmpty)
                      EmptyState(
                          icon: Icons.gavel_outlined,
                          message: tr(context, 'no_discipline'))
                    else ...[
                      // summary line
                      Padding(
                        padding: const EdgeInsets.only(left: 4, bottom: 12),
                        child: Text(
                          '${_faults.length} ${tr(context, 'discipline')}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: isDark ? Colors.white38 : AppColors.textMuted,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      ..._faults.map((f) {
                        final color = _levelColor(f.level);
                        return GestureDetector(
                          onTap: () => _showDetail(f),
                          child: AppCard(
                            padding: const EdgeInsets.all(18),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: color.withOpacity(isDark ? 0.2 : 0.1),
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                      child: Icon(_levelIcon(f.level),
                                          color: color, size: 20),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Text(
                                        f.type,
                                        style: theme.textTheme.titleMedium
                                            ?.copyWith(fontWeight: FontWeight.w700),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: color.withOpacity(isDark ? 0.2 : 0.1),
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: Text(
                                        f.level,
                                        style: TextStyle(
                                          color: color,
                                          fontWeight: FontWeight.w700,
                                          fontSize: 11,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                if (f.description.isNotEmpty) ...[
                                  const SizedBox(height: 12),
                                  Text(
                                    f.description,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color:
                                          isDark ? Colors.white60 : AppColors.textSecondary,
                                      fontSize: 13,
                                      height: 1.4,
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Icon(Icons.person_outline,
                                        size: 13,
                                        color: isDark ? Colors.white38 : AppColors.textMuted),
                                    const SizedBox(width: 4),
                                    Text(
                                      f.reportedBy,
                                      style: TextStyle(
                                        fontSize: 11,
                                        color:
                                            isDark ? Colors.white38 : AppColors.textMuted,
                                      ),
                                    ),
                                    const Spacer(),
                                    Icon(Icons.calendar_today_outlined,
                                        size: 13,
                                        color: isDark ? Colors.white38 : AppColors.textMuted),
                                    const SizedBox(width: 4),
                                    Text(
                                      _shortDate(f.date),
                                      style: TextStyle(
                                        fontSize: 11,
                                        color:
                                            isDark ? Colors.white38 : AppColors.textMuted,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _wardChip(ThemeData theme, bool isDark) {
    final app = Provider.of<AppProvider>(context);
    final ward = app.selectedWard;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF2C2C2C) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.transparent : AppColors.border),
      ),
      child: Row(
        children: [
          AvatarCircle(name: ward?.studentName ?? '?', size: 30),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              ward?.studentName ?? '',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Text(
            ward?.className ?? '',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.white38 : AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}
