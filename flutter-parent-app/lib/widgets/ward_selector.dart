import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/api_service.dart';
import '../../app/app_provider.dart';
import '../../widgets/app_widgets.dart';
import '../../models/models.dart';

/// FIX 2A: safe ward selector — value matched by NAME (not object identity).
/// Object identity breaks when provider rebuilds (e.g. after language/theme
/// change) because Ward instances are re-created, freezing dropdowns.
class WardSelector extends StatelessWidget {
  const WardSelector({super.key});

  @override
  Widget build(BuildContext context) {
    final app = Provider.of<AppProvider>(context);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    if (app.wards.isEmpty) return const SizedBox();

    // resolve selected value by name so it always exists in items list
    Ward? selected;
    for (final w in app.wards) {
      if (w.studentName == app.selectedWard?.studentName) {
        selected = w;
        break;
      }
    }
    selected ??= app.wards.first;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF2C2C2C) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.transparent : AppColors.border),
        boxShadow: isDark ? [] : [softShadow],
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<Ward>(
          value: selected, // always a member of items — no assertion/freeze
          isExpanded: true,
          icon: Icon(Icons.expand_more, color: theme.primaryColor),
          dropdownColor: isDark ? const Color(0xFF2C2C2C) : Colors.white,
          items: app.wards.map((w) => DropdownMenuItem(
                value: w,
                child: Text(w.studentName, style: theme.textTheme.titleMedium),
              )).toList(),
          onChanged: (w) {
            if (w != null) app.selectWard(w);
          },
        ),
      ),
    );
  }
}
