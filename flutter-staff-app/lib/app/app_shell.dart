import 'package:flutter/material.dart';
import 'package:flutter_floating_bottom_bar/flutter_floating_bottom_bar.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/theme/app_theme.dart';
import '../core/l10n/app_localizations.dart';
import '../core/services/update_service.dart';
import '../core/services/offline_service.dart';
import '../widgets/offline_banner.dart';
import 'app_provider.dart';
import '../screens/posts/posts_tab.dart';
import '../screens/schedule/schedule_tab.dart';
import '../screens/marks/marks_tab.dart';
import '../screens/attendance/attendance_tab.dart';
import '../screens/profile/profile_tab.dart';
import '../screens/messages/messages_tab.dart';
import '../screens/discipline/discipline_tab.dart';
import '../screens/eval_book/eval_book_tab.dart';
import '../screens/evaluations/evaluations_tab.dart';
import '../screens/settings/settings_tab.dart';
import '../screens/notifications/notifications_tab.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  static void Function(int tabIndex)? switchTab;
  static void Function()? openUpdateDialog;
  static void Function()? openMessages;
  static void Function()? openDiscipline;
  static void Function()? openEvalBook;
  static void Function()? openProfile;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  int _currentIndex = 0;
  bool _isFabExpanded = false;
  late TabController _tabController;
  bool _updateAvailable = false;
  Map<String, dynamic>? _pendingUpdate;
  bool _refreshing = false;
  int _refreshTick = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _tabController = TabController(length: 4, vsync: this);

    AppShell.switchTab = (i) {
      if (i >= 0 && i < 4) {
        _tabController.animateTo(i);
        if (mounted) setState(() => _currentIndex = i);
      }
    };

    AppShell.openUpdateDialog = () {
      if (mounted) _checkForUpdate();
    };

    AppShell.openMessages = () {
      if (mounted) Navigator.push(context, MaterialPageRoute(builder: (_) => const MessagesTab()));
    };

    AppShell.openDiscipline = () {
      if (mounted) Navigator.push(context, MaterialPageRoute(builder: (_) => const DisciplineTab()));
    };

    AppShell.openEvalBook = () {
      if (mounted) Navigator.push(context, MaterialPageRoute(builder: (_) => const EvalBookTab()));
    };

    AppShell.openProfile = () {
      if (mounted) Navigator.push(context, MaterialPageRoute(builder: (_) => const Scaffold(body: SafeArea(child: ProfileTab()))));
    };

    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() => _currentIndex = _tabController.index);
      }
    });

    _silentUpdateCheck();
  }

  Future<void> _silentUpdateCheck() async {
    final update = await UpdateService.checkForUpdate();
    if (mounted) {
      setState(() {
        _pendingUpdate = update;
        _updateAvailable = update != null;
      });
    }
  }

  /// Header refresh: re-fetch provider data (profile/assignments/posts) and
  /// remount the tabs so their initState fetches run again.
  Future<void> _handleRefresh() async {
    if (_refreshing) return;
    setState(() {
      _refreshing = true;
      _refreshTick++;
    });
    try {
      await Provider.of<AppProvider>(context, listen: false).silentRefresh();
      await _silentUpdateCheck();
    } catch (_) {}
    if (!mounted) return;
    setState(() => _refreshing = false);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(tr(context, 'refreshed')),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      Provider.of<AppProvider>(context, listen: false).silentRefresh();
      OfflineService.flush();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    AppShell.switchTab = null;
    AppShell.openUpdateDialog = null;
    AppShell.openMessages = null;
    AppShell.openDiscipline = null;
    AppShell.openEvalBook = null;
    AppShell.openProfile = null;
    _tabController.dispose();
    super.dispose();
  }

  void _showExpandableMenu(BuildContext context) {
    setState(() => _isFabExpanded = true);
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _ExpandableMenu(
        onClose: () => Navigator.pop(ctx),
      ),
    ).then((_) {
      if (mounted) setState(() => _isFabExpanded = false);
    });
  }

  Future<void> _checkForUpdate() async {
    final update = await UpdateService.checkForUpdate();
    if (!mounted) return;
    if (update == null) {
      setState(() => _updateAvailable = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(tr(context, 'you_are_up_to_date')),
          duration: const Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }
    final url = update['url']?.toString() ?? '';
    final notes = update['notes']?.toString() ?? '';
    final version = update['version']?.toString() ?? '';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('${tr(context, 'update_available')} — v$version'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (notes.isNotEmpty) ...[
              Text(notes, style: const TextStyle(fontSize: 13)),
              const SizedBox(height: 12),
            ],
            Text(tr(context, 'update_tap_note'), style: const TextStyle(fontSize: 13, color: Colors.grey)),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              UpdateService.markVersionSeen(version);
              setState(() => _updateAvailable = false);
            },
            child: Text(tr(context, 'later')),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              UpdateService.markVersionSeen(version);
              setState(() => _updateAvailable = false);
              if (url.isNotEmpty) {
                launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
              }
            },
            child: Text(tr(context, 'download')),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final prov = Provider.of<AppProvider>(context);

    // Tab 1: Schedule for teachers, Profile for non-teachers
    final Widget tab1 = prov.isTeacher ? const ScheduleTab() : const ProfileTab();
    final String label1 = prov.isTeacher ? tr(context, 'schedule') : tr(context, 'profile');
    final IconData icon1 = prov.isTeacher ? Icons.calendar_month : Icons.person_outline;

    // Tab 2: Marks for teachers, Messages for non-teachers
    final Widget tab2 = prov.isTeacher ? const MarksTab() : const MessagesTab();
    final String label2 = prov.isTeacher ? tr(context, 'marks') : tr(context, 'messages');
    final IconData icon2 = prov.isTeacher ? Icons.assignment : Icons.chat_bubble_outline;

    // Tab 3: Attendance for class teachers, Profile/Reviews for others
    final Widget tab3 = prov.isClassTeacher ? const AttendanceTab() : const ProfileTab();
    final String label3 = prov.isClassTeacher ? tr(context, 'attendance') : tr(context, 'profile');
    final IconData icon3 = prov.isClassTeacher ? Icons.how_to_reg : Icons.badge_outlined;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            // Floating Top Header
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AppColors.primary, AppColors.primaryDark],
                ),
                borderRadius: BorderRadius.circular(50),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withOpacity(isDark ? 0.5 : 0.35),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Image.asset('assets/images/logo.png', width: 32, height: 32),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Row(
                      children: [
                        Text(
                          tr(context, 'app_title'),
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 8),
                        if (prov.user != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              prov.user!.branchCode,
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

                  // Refresh
                  GestureDetector(
                    onTap: _handleRefresh,
                    child: CircleAvatar(
                      radius: 16,
                      backgroundColor: AppColors.primaryLight,
                      child: _refreshing
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppColors.primary,
                              ),
                            )
                          : const Icon(Icons.refresh, size: 20, color: AppColors.primary),
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Notifications Bell
                  GestureDetector(
                    onTap: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsTab()));
                    },
                    child: const CircleAvatar(
                      radius: 16,
                      backgroundColor: AppColors.primaryLight,
                      child: Icon(Icons.notifications_none, size: 20, color: AppColors.primary),
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Settings / Profile avatar
                  GestureDetector(
                    onTap: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsTab()));
                    },
                    child: const CircleAvatar(
                      radius: 16,
                      backgroundColor: AppColors.primaryLight,
                      child: Icon(Icons.settings_outlined, size: 20, color: AppColors.primary),
                    ),
                  ),
                ],
              ),
            ),

            // Offline Banner
            const OfflineBanner(),

            // Update Available Banner (FIX 10)
            if (_updateAvailable && _pendingUpdate != null)
              GestureDetector(
                onTap: _checkForUpdate,
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.warningSoft,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.warning.withOpacity(0.5)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.system_update_alt,
                          size: 16, color: AppColors.warning),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '${tr(context, 'update_available')} — v${_pendingUpdate!['version']}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: AppColors.warning,
                          ),
                        ),
                      ),
                      Text(
                        tr(context, 'download'),
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // Floating Bottom Bar Layout
            Expanded(
              child: BottomBar(
                layout: BottomBarLayout.adaptive(
                  maxWidth: 500,
                  offset: 24.0,
                  borderRadius: BorderRadius.circular(50),
                  respectSafeArea: true,
                ),
                motion: const BottomBarMotion.cupertino(),
                scrollBehavior: const BottomBarScrollBehavior(
                  hideOnScroll: true,
                  showAtStart: true,
                  deltaThreshold: 10.0,
                ),
                body: TabBarView(
                  key: ValueKey(_refreshTick),
                  controller: _tabController,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    const PostsTab(),
                    tab1,
                    tab2,
                    tab3,
                  ],
                ),
                child: Container(
                  height: 65,
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: isDark
                          ? [const Color(0xFF3A1613), const Color(0xFF1E0D0B)]
                          : [AppColors.primary, AppColors.primaryDark],
                    ),
                    borderRadius: BorderRadius.circular(50),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(isDark ? 0.55 : 0.4),
                        blurRadius: 18,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildNavItem(Icons.article, tr(context, 'posts'), 0, isDark),
                      _buildNavItem(icon1, label1, 1, isDark),
                      _buildNavItem(icon2, label2, 2, isDark),
                      _buildNavItem(icon3, label3, 3, isDark),
                      // Expandable + FAB
                      GestureDetector(
                        onTap: () => _showExpandableMenu(context),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          decoration: BoxDecoration(
                            color: _isFabExpanded ? AppColors.accent : AppColors.primary,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: (_isFabExpanded ? AppColors.accent : AppColors.primary).withOpacity(0.4),
                                blurRadius: 8,
                                offset: const Offset(0, 4),
                              )
                            ],
                          ),
                          child: AnimatedRotation(
                            turns: _isFabExpanded ? 0.125 : 0,
                            duration: const Duration(milliseconds: 200),
                            child: const Icon(Icons.add, color: Colors.white, size: 24),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, int index, bool isDark) {
    final isSelected = _currentIndex == index;
    final color = isSelected ? Colors.white : Colors.white60;

    return GestureDetector(
      onTap: () => _tabController.animateTo(index),
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 56,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 24, color: color),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                color: color,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              ),
              maxLines: 1,
              overflow: TextOverflow.clip,
            ),
          ],
        ),
      ),
    );
  }
}

class _ExpandableMenu extends StatelessWidget {
  final VoidCallback onClose;
  const _ExpandableMenu({required this.onClose});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(32),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 20,
            offset: const Offset(0, 10),
          )
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                tr(context, 'more_options'),
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              IconButton(icon: const Icon(Icons.close), onPressed: onClose),
            ],
          ),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            children: [
              _MenuTile(tr(context, 'messages'), Icons.chat_bubble_outline, AppColors.info, () => _nav(context, const MessagesTab())),
              _MenuTile(tr(context, 'eval_book'), Icons.menu_book_outlined, Colors.teal, () => _nav(context, const EvalBookTab())),
              _MenuTile(tr(context, 'discipline'), Icons.gavel_outlined, Colors.deepPurple, () => _nav(context, const DisciplineTab())),
              _MenuTile(tr(context, 'profile'), Icons.badge_outlined, Colors.orange, () => _nav(context, const Scaffold(body: SafeArea(child: ProfileTab())))),
              _MenuTile(tr(context, 'evaluations'), Icons.star_border, Colors.pink, () => _nav(context, const EvaluationsTab())),
              _MenuTile(tr(context, 'settings'), Icons.settings_outlined, Colors.blueGrey, () => _nav(context, const SettingsTab())),
            ],
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  void _nav(BuildContext context, Widget page) {
    onClose();
    Navigator.push(context, MaterialPageRoute(builder: (_) => page));
  }
}

class _MenuTile extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _MenuTile(this.label, this.icon, this.color, this.onTap);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? color.withOpacity(0.2) : color.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
