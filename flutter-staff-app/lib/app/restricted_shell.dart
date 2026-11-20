import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../app/app_provider.dart';
import '../core/theme/app_theme.dart';
import '../screens/attendance/attendance_tab.dart';
import '../screens/marks/marks_tab.dart';
import '../screens/posts/posts_tab.dart';
import '../screens/discipline/discipline_tab.dart';
import '../screens/profile/profile_tab.dart';

/// Staff app shell used when the admin has assigned explicit permissions.
/// Only the permitted modules are shown; Profile is always available.
class RestrictedStaffShell extends StatefulWidget {
  const RestrictedStaffShell({super.key});
  @override
  State<RestrictedStaffShell> createState() => _RestrictedStaffShellState();
}

class _RestrictedStaffShellState extends State<RestrictedStaffShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AppProvider>(context).user;
    final perms = user?.permissions ?? const <String>[];
    bool can(String p) => perms.contains(p);

    final tabs = <_RestrictedTab>[];
    if (can('attendance')) tabs.add(_RestrictedTab('Attendance', const AttendanceTab()));
    if (can('mark_list') || can('marks')) tabs.add(_RestrictedTab('Marks', const MarksTab()));
    if (can('faults')) tabs.add(_RestrictedTab('Faults', const DisciplineTab()));
    if (can('posts')) tabs.add(_RestrictedTab('Posts', const PostsTab()));
    tabs.add(_RestrictedTab('Profile', const ProfileTab()));
    final safe = _index.clamp(0, tabs.length - 1);

    return Scaffold(
      appBar: AppBar(title: Text(tabs[safe].label)),
      body: IndexedStack(index: safe, children: tabs.map((t) => t.page).toList()),
      bottomNavigationBar: NavigationBar(
        selectedIndex: safe,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: tabs.map((t) => NavigationDestination(
          icon: Icon(t.label == 'Attendance' ? Icons.fact_check_outlined : t.label == 'Marks' ? Icons.assignment_outlined : t.label == 'Faults' ? Icons.report_gmailerrorred : t.label == 'Posts' ? Icons.dynamic_feed : Icons.person),
          label: t.label,
        )).toList(),
      ),
    );
  }
}

class _RestrictedTab {
  final String label;
  final Widget page;
  const _RestrictedTab(this.label, this.page);
}
