import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/utils/ethiopian_date.dart';
import '../../widgets/app_widgets.dart';
import '../../app/app_provider.dart';

class ProfileTab extends StatelessWidget {
  const ProfileTab({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final prov = Provider.of<AppProvider>(context);
    final user = prov.user;
    final profile = prov.profile;

    if (user == null) {
      return const Center(child: AppLoadingIndicator());
    }

    final name = profile?.name.isNotEmpty == true ? profile!.name : user.name;
    final role = profile?.role?.isNotEmpty == true ? profile!.role! : user.staffType;
    final branch = user.branchCode;
    final phone = profile?.phone ?? '';
    final employeeId = profile?.machineId ?? profile?.staffId?.toString() ?? 'ID-${user.id}';
    final enrollment = profile?.enrollmentType ?? 'Permanent';
    final workTime = profile?.workTime ?? 'Full Time';

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () => prov.refreshData(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Ethiopian date header banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2C2C2C) : AppColors.primarySoft,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark ? Colors.white10 : AppColors.primary.withOpacity(0.15),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.event, color: AppColors.primary, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'Ethiopian Date: Year ${EthiopianDate.year}, Month ${EthiopianDate.month}',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white70 : AppColors.primary,
                      ),
                    ),
                    const Spacer(),
                    StatusPill(
                      branch.toUpperCase(),
                      color: Colors.white,
                      bg: AppColors.primary,
                    ),
                  ],
                ),
              ),

              // Digital Staff ID Card
              Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Color(0xFF7B2D26),
                      Color(0xFF5A1E18),
                      Color(0xFF3B120E),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withOpacity(0.35),
                      blurRadius: 18,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Stack(
                  children: [
                    // Watermark pattern or decoration
                    Positioned(
                      right: -20,
                      bottom: -20,
                      child: Opacity(
                        opacity: 0.12,
                        child: Image.asset(
                          'assets/images/logo.png',
                          width: 160,
                          height: 160,
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(22),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Header: School logo + Badge
                          Row(
                            children: [
                              Image.asset('assets/images/logo.png', width: 36, height: 36),
                              const SizedBox(width: 10),
                              const Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'IQRA ACADEMY',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 15,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 0.8,
                                      ),
                                    ),
                                    Text(
                                      'OFFICIAL STAFF ID',
                                      style: TextStyle(
                                        color: Colors.white70,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w600,
                                        letterSpacing: 1.2,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  branch,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),

                          // Profile Picture & Name
                          Row(
                            children: [
                              Container(
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 2.5),
                                ),
                                child: AvatarCircle(
                                  name: name,
                                  imageUrl: profile?.imageStaff,
                                  size: 64,
                                  bg: Colors.white.withOpacity(0.2),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      name,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 18,
                                        fontWeight: FontWeight.w800,
                                      ),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 4),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: AppColors.accent,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        role,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),

                          // ID Card details grid
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.25),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceAround,
                              children: [
                                _idCardStat('EMPLOYEE ID', employeeId),
                                Container(width: 1, height: 28, color: Colors.white24),
                                _idCardStat('TYPE', enrollment),
                                Container(width: 1, height: 28, color: Colors.white24),
                                _idCardStat('WORK TIME', workTime),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Role summary & class teacher status
              if (prov.isClassTeacher) ...[
                AppCard(
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.success.withOpacity(0.12),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.verified, color: AppColors.success, size: 26),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Class Teacher',
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Assigned Class: ${prov.assignedClasses.join(', ')}',
                              style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Contact & Details
              SectionTitle(tr(context, 'profile')),
              AppCard(
                child: Column(
                  children: [
                    _infoRow(Icons.person_outline, tr(context, 'username'), user.username),
                    const Divider(height: 20),
                    _infoRow(Icons.badge_outlined, tr(context, 'employee_id'), employeeId),
                    const Divider(height: 20),
                    _infoRow(Icons.phone_outlined, tr(context, 'contact_phone'), phone.isNotEmpty ? phone : 'N/A'),
                    const Divider(height: 20),
                    _infoRow(Icons.apartment_outlined, tr(context, 'branch_code'), branch),
                    const Divider(height: 20),
                    _infoRow(Icons.category_outlined, tr(context, 'department'), user.staffType),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Teaching Assignments
              if (prov.isTeacher && prov.markAssignments.isNotEmpty) ...[
                SectionTitle(tr(context, 'my_subjects')),
                ...prov.markAssignments.map((a) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: AppCard(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: const BoxDecoration(
                              color: AppColors.primarySoft,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.book_outlined, color: AppColors.primary, size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  a.subjectName,
                                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                                ),
                                Text(
                                  'Class: ${a.className} • Term ${a.termNumber}',
                                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
                const SizedBox(height: 20),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _idCardStat(String title, String val) {
    return Column(
      children: [
        Text(
          title,
          style: const TextStyle(color: Colors.white60, fontSize: 9, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 2),
        Text(
          val,
          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
        ),
      ],
    );
  }

  Widget _infoRow(IconData icon, String title, String val) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.primary),
        const SizedBox(width: 12),
        Text(title, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
        const Spacer(),
        Text(val, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
      ],
    );
  }
}
