import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/services/api_service.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/page_header.dart';
import '../../app/app_provider.dart';
import '../../models/models.dart';

class EvaluationsTab extends StatefulWidget {
  const EvaluationsTab({super.key});

  @override
  State<EvaluationsTab> createState() => _EvaluationsTabState();
}

class _EvaluationsTabState extends State<EvaluationsTab> {
  bool _loading = false;
  List<StaffEvaluation> _evaluations = [];

  @override
  void initState() {
    super.initState();
    _fetchEvaluations();
  }

  Future<void> _fetchEvaluations() async {
    final prov = Provider.of<AppProvider>(context, listen: false);
    final id = prov.profile?.globalStaffId ?? prov.user?.globalStaffId ?? prov.user?.id ?? 0;
    if (id == 0) return;

    setState(() => _loading = true);
    try {
      final list = await ApiService().getStaffEvaluations(id);
      if (mounted) setState(() => _evaluations = list);
    } catch (_) {}
    finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            PageHeader(
              title: tr(context, 'evaluations'),
              icon: Icons.star_border_purple500_outlined,
            ),

            Expanded(
              child: _loading
                  ? const Center(child: AppLoadingIndicator())
                  : _evaluations.isEmpty
                      ? EmptyState(
                          icon: Icons.assignment_turned_in_outlined,
                          message: 'No administrative performance evaluations found yet.',
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _evaluations.length,
                          itemBuilder: (context, idx) {
                            final ev = _evaluations[idx];
                            return Container(
                              margin: const EdgeInsets.only(bottom: 14),
                              child: AppCard(
                                padding: const EdgeInsets.all(18),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          ev.evaluator ?? 'Administrator Review',
                                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                                        ),
                                        StatusPill(
                                          'Score: ${ev.score.toStringAsFixed(1)}%',
                                          color: ev.score >= 75 ? AppColors.success : AppColors.warning,
                                          bg: ev.score >= 75 ? AppColors.successSoft : AppColors.warningSoft,
                                        ),
                                      ],
                                    ),
                                    if (ev.date != null) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        ev.date!.split('T')[0],
                                        style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                                      ),
                                    ],
                                    const SizedBox(height: 12),

                                    if (ev.comments != null && ev.comments!.isNotEmpty) ...[
                                      Text(
                                        ev.comments!,
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: isDark ? Colors.white70 : AppColors.text,
                                          height: 1.4,
                                        ),
                                      ),
                                      const SizedBox(height: 10),
                                    ],

                                    if (ev.strengths != null && ev.strengths!.isNotEmpty) ...[
                                      Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Icon(Icons.check_circle_outline, color: AppColors.success, size: 16),
                                          const SizedBox(width: 6),
                                          Expanded(
                                            child: Text(
                                              'Strengths: ${ev.strengths}',
                                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.success),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                    ],

                                    if (ev.improvements != null && ev.improvements!.isNotEmpty) ...[
                                      Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Icon(Icons.lightbulb_outline, color: AppColors.warning, size: 16),
                                          const SizedBox(width: 6),
                                          Expanded(
                                            child: Text(
                                              'Recommendations: ${ev.improvements}',
                                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.warning),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
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
