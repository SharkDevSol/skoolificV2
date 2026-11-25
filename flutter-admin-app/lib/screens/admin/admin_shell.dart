import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../app/app_provider.dart';
import '../../core/config/app_variant.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/theme/app_theme.dart';
import 'dashboard_tab.dart';
import 'students_tab.dart';
import 'marks_tab.dart';
import 'attendance_tab.dart';
import 'more_tab.dart';
import 'admin_settings_screen.dart';
import 'kg_management_screen.dart';

class AdminShell extends StatefulWidget {
  const AdminShell({super.key});
  @override
  State<AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends State<AdminShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final app = Provider.of<AppProvider>(context);
    final theme = Theme.of(context);
    final user = app.user;
    final all = user?.hasFullAdminAccess ?? true;
    bool can(String p) => all || (user?.can(p) ?? false);

    final tabs = <_AdminTab>[
      _AdminTab(tr(context, 'dashboard'), const DashboardTab(), Icons.dashboard_outlined, Icons.dashboard),
      if (can('students'))
        _AdminTab(tr(context, 'students'), const StudentsTab(), Icons.people_outline, Icons.people),
      if (can('mark_list'))
        _AdminTab(tr(context, 'marks'), const MarksTab(), Icons.assignment_outlined, Icons.assignment),
      if (can('attendance'))
        _AdminTab(tr(context, 'students_attendance'), const AttendanceTab(), Icons.fact_check_outlined, Icons.fact_check),
      if (all || can('kg_management'))
        _AdminTab('KG', const KGManagementScreen(), Icons.child_care_outlined, Icons.child_care),
      _AdminTab(tr(context, 'more'), const MoreTab(), Icons.grid_view_outlined, Icons.grid_view),
    ];
    final safeIndex = _index.clamp(0, tabs.length - 1);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.onPrimary,
        elevation: 0,
        titleSpacing: 12,
        title: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Image.asset('assets/images/logo.png', fit: BoxFit.contain),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    AppVariant.appName,
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.onPrimary),
                  ),
                  Text(
                    '${user?.branchCode ?? ''} • ${tabs[safeIndex].label}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.onPrimary.withOpacity(0.75)),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: InkWell(
              borderRadius: BorderRadius.circular(24),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const AdminSettingsScreen()),
              ),
              child: CircleAvatar(
                radius: 18,
                backgroundColor: AppColors.onPrimary.withOpacity(0.18),
                child: Text(
                  (user?.name.isNotEmpty == true ? user!.name[0] : 'A').toUpperCase(),
                  style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.onPrimary),
                ),
              ),
            ),
          ),
        ],
      ),
      body: IndexedStack(index: safeIndex, children: tabs.map((t) => t.page).toList()),
      bottomNavigationBar: NavigationBar(
        selectedIndex: safeIndex,
        onDestinationSelected: (i) => setState(() => _index = i),
        backgroundColor: theme.scaffoldBackgroundColor,
        indicatorColor: AppColors.primary.withOpacity(0.15),
        destinations: tabs.map((t) => NavigationDestination(icon: Icon(t.icon), selectedIcon: Icon(t.selectedIcon), label: t.label)).toList(),
      ),
    );
  }
}

class _AdminTab {
  final String label;
  final Widget page;
  final IconData icon;
  final IconData selectedIcon;
  const _AdminTab(this.label, this.page, this.icon, this.selectedIcon);
}
