import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../app/app_provider.dart';
import '../../core/l10n/app_localizations.dart';
import 'guardians_screen.dart';
import 'staff_list_screen.dart';
import 'admin_settings_screen.dart';
import 'posts_screen.dart';
import 'admin_faults_screen.dart';
import 'admin_communication_screen.dart';
import 'staff_attendance_screen.dart';
import 'hr_leave_screen.dart';
import 'class_teacher_assignment_screen.dart';
import 'subject_teacher_assignment_screen.dart';
import 'add_account_screen.dart';
import 'teacher_evaluation_screen.dart';
import 'register_staff_screen.dart';
import 'subject_setup_screen.dart';
import 'unpaid_reasons_screen.dart';

class MoreTab extends StatelessWidget {
  const MoreTab({super.key});

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AppProvider>(context).user;
    final all = user?.hasFullAdminAccess ?? true;
    bool can(String p) => all || (user?.can(p) ?? false);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _section(context, 'Daily work'),
        if (can('staff_attendance'))
          _tile(context, Icons.fact_check, tr(context, 'staff_attendance'), 'Check-in, check-out, edit times and monthly report', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const StaffAttendanceScreen()));
          }),
        if (can('faults'))
          _tile(context, Icons.report_gmailerrorred, tr(context, 'student_faults'), 'Record faults and search the full history', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminFaultsScreen()));
          }),
        if (can('posts'))
          _tile(context, Icons.dynamic_feed, tr(context, 'posts'), 'Create posts with images and video up to 200 MB', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminPostsScreen()));
          }),
        if (can('communication'))
          _tile(context, Icons.forum, tr(context, 'message'), 'Message parents, see their students and send media', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminCommunicationScreen()));
          }),
        if (can('hr_leave'))
          _tile(context, Icons.event_note, tr(context, 'hr_leave'), 'Approve, reject and grant leave by date range', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const HrLeaveScreen()));
          }),
        if (all || can('students'))
          _tile(context, Icons.visibility_off_outlined, 'Unpaid Reasons', 'Keep unpaid students visible with a reason and expiry', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const UnpaidReasonsScreen()));
          }),
        const SizedBox(height: 18),
        _section(context, 'People'),
        if (can('staff'))
          _tile(context, Icons.person_add_alt_1, 'Register Staff', 'Add staff by type and form with generated login', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const RegisterStaffScreen()));
          }),
        if (can('guardians'))
          _tile(context, Icons.family_restroom, tr(context, 'guardians'), 'All parents with their students and phone numbers', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const GuardiansScreen()));
          }),
        if (can('staff'))
          _tile(context, Icons.badge, tr(context, 'staff'), 'Teachers and staff with contact details and totals', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const StaffListScreen()));
          }),
        const SizedBox(height: 18),
        _section(context, 'Administration'),
        if (can('class_teacher'))
          _tile(context, Icons.assignment_ind, tr(context, 'class_teacher'), 'Assign teachers to classes', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const ClassTeacherAssignmentScreen()));
          }),
        if (can('mark_list'))
          _tile(context, Icons.group_work, tr(context, 'subject_teacher'), 'Assign teachers to subject + class', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const SubjectTeacherAssignmentScreen()));
          }),
        if (can('mark_list'))
          _tile(context, Icons.menu_book_outlined, 'Subject Setup', 'Add subjects and map them to classes', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const SubjectSetupScreen()));
          }),
        _tile(context, Icons.settings, tr(context, 'admin_settings'), 'Password, username, language, dark mode', () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminSettingsScreen()));
        }),
        if (all)
          _tile(context, Icons.admin_panel_settings, tr(context, 'add_account'), 'Grant staff access and manage permissions', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const AddAccountScreen()));
          }),
        if (all || can('teacher_evaluation'))
          _tile(context, Icons.rate_review, tr(context, 'teacher_evaluation'), 'Create forms and record evaluations', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const TeacherEvaluationScreen()));
          }),
      ],
    );
  }

  Widget _section(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 4),
      child: Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
    );
  }

  Widget _tile(BuildContext context, IconData icon, String title, String subtitle, VoidCallback onTap) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(child: Icon(icon)),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
