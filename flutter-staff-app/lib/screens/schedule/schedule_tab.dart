import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/services/api_service.dart';
import '../../widgets/app_widgets.dart';
import '../../app/app_provider.dart';
import '../../models/models.dart';

class ScheduleTab extends StatefulWidget {
  const ScheduleTab({super.key});

  @override
  State<ScheduleTab> createState() => _ScheduleTabState();
}

class _ScheduleTabState extends State<ScheduleTab> {
  final List<String> _days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  late String _selectedDay;
  bool _loading = false;
  List<ScheduleSlot> _schedule = [];

  @override
  void initState() {
    super.initState();
    // Default to current weekday
    final now = DateTime.now();
    final dayIndex = (now.weekday - 1).clamp(0, 5);
    _selectedDay = _days[dayIndex];
    _fetchSchedule();
  }

  Future<void> _fetchSchedule() async {
    final prov = Provider.of<AppProvider>(context, listen: false);
    final teacherName = prov.profile?.name.isNotEmpty == true ? prov.profile!.name : (prov.user?.name ?? '');
    if (teacherName.isEmpty) return;

    setState(() => _loading = true);
    try {
      final slots = await ApiService().getTeacherSchedule(teacherName);
      if (mounted) setState(() => _schedule = slots);
    } catch (_) {}
    finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final filtered = _schedule.where((s) => s.day.toLowerCase() == _selectedDay).toList();
    filtered.sort((a, b) => a.period.compareTo(b.period));

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _fetchSchedule,
        child: Column(
          children: [
            // Days of the week selector
            Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: _days.map((d) {
                    final isSelected = _selectedDay == d;
                    final capitalized = d[0].toUpperCase() + d.substring(1);
                    return GestureDetector(
                      onTap: () => setState(() => _selectedDay = d),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        margin: const EdgeInsets.only(right: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppColors.primary
                              : (isDark ? const Color(0xFF2C2C2C) : AppColors.primarySoft),
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: isSelected
                              ? [
                                  BoxShadow(
                                    color: AppColors.primary.withOpacity(0.3),
                                    blurRadius: 8,
                                    offset: const Offset(0, 3),
                                  )
                                ]
                              : [],
                        ),
                        child: Text(
                          capitalized,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: isSelected
                                ? Colors.white
                                : (isDark ? Colors.white70 : AppColors.primary),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),

            // Schedule period cards
            Expanded(
              child: _loading
                  ? const Center(child: AppLoadingIndicator())
                  : filtered.isEmpty
                      ? EmptyState(
                          icon: Icons.calendar_today_outlined,
                          message: tr(context, 'no_schedule'),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: filtered.length,
                          itemBuilder: (context, idx) {
                            final slot = filtered[idx];
                            return Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              child: AppCard(
                                padding: const EdgeInsets.all(16),
                                child: Row(
                                  children: [
                                    // Period circle
                                    Container(
                                      width: 48,
                                      height: 48,
                                      decoration: BoxDecoration(
                                        color: AppColors.primaryLight,
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          const Text(
                                            'P',
                                            style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.w800,
                                              color: AppColors.primary,
                                            ),
                                          ),
                                          Text(
                                            '${slot.period}',
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w900,
                                              color: AppColors.primary,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    // Details
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            slot.subject,
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Row(
                                            children: [
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: AppColors.accent.withOpacity(0.12),
                                                  borderRadius: BorderRadius.circular(6),
                                                ),
                                                child: Text(
                                                  'Class: ${slot.className}',
                                                  style: const TextStyle(
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.w700,
                                                    color: AppColors.accent,
                                                  ),
                                                ),
                                              ),
                                              if (slot.room != null && slot.room!.isNotEmpty) ...[
                                                const SizedBox(width: 8),
                                                Text(
                                                  'Room: ${slot.room}',
                                                  style: const TextStyle(
                                                    fontSize: 12,
                                                    color: AppColors.textSecondary,
                                                  ),
                                                ),
                                              ],
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                    if (slot.time != null && slot.time!.isNotEmpty)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: isDark ? const Color(0xFF2C2C2C) : AppColors.surfaceAlt,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          slot.time!,
                                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                                        ),
                                      ),
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
    );
  }
}
