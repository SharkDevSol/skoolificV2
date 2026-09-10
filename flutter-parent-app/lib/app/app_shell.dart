import 'package:flutter/material.dart';
import '../core/l10n/app_localizations.dart';
import 'package:flutter_floating_bottom_bar/flutter_floating_bottom_bar.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/theme/app_theme.dart';
import '../core/services/update_service.dart';
import 'app_provider.dart';
import '../../screens/marks/marks_tab.dart';
import '../../screens/payments/payments_tab.dart';
import '../../screens/posts/posts_tab.dart';
import '../../screens/attendance/attendance_tab.dart';
import '../../screens/settings/settings_tab.dart';
import '../../screens/discipline/discipline_tab.dart';
import '../../screens/messages/messages_tab.dart';
import '../../screens/notifications/notifications_tab.dart';
// FIX 5: NotificationsTab now lives in its own file (real page, not a placeholder)
import '../../screens/eval_book/eval_book_tab.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> with SingleTickerProviderStateMixin {
  int _currentIndex = 0;
  bool _isFabExpanded = false;
  late TabController _tabController;
  // FIX 11: update availability — drives the red badge on the update button
  bool _updateAvailable = false;
  Map<String, dynamic>? _pendingUpdate;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() => _currentIndex = _tabController.index);
      }
    });
    // FIX 11: check silently on start — badge shows only if a NEWER version
    // the user hasn't taken yet is available
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

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showExpandableMenu(BuildContext context) {
    setState(() => _isFabExpanded = true);
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _ExpandableMenu(
        onClose: () {
          Navigator.pop(ctx);
        },
      ),
    ).then((_) {
      if (mounted) setState(() => _isFabExpanded = false);
    });
  }

  // FIX 10/11: check server for update; if newer, offer download
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
        title: Text(tr(context, 'update_available') + ' — v$version'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (notes.isNotEmpty) ...[
              Text(notes, style: const TextStyle(fontSize: 13)),
              const SizedBox(height: 12),
            ],
            Text(
              tr(context, 'update_tap_note'),
              style: const TextStyle(fontSize: 13, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              // FIX 11: "Later" also hides the badge for THIS version
              UpdateService.markVersionSeen(version);
              setState(() => _updateAvailable = false);
            },
            child: Text(tr(context, 'later')),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              // FIX 11: remember this version is handled -> badge hides until
              // the server publishes an even newer one
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

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            // 10.4: Floating Top Header — gradient + glow
            AnimatedContainer(
              duration: const Duration(milliseconds: 300),
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
                    spreadRadius: isDark ? 0 : 1,
                  ),
                ],
              ),
              child: Row(
                children: [
                  Image.asset('assets/images/logo.png', width: 32, height: 32),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'IQRA Parent',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                  ),

                  const SizedBox(width: 8),
                  // FIX 10/11: update button — badge (red dot) shows ONLY when a
                  // newer version the user hasn't taken is live on the server
                  GestureDetector(
                    onTap: _checkForUpdate,
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        const CircleAvatar(
                          radius: 16,
                          backgroundColor: AppColors.primaryLight,
                          child: Icon(Icons.system_update, size: 20, color: AppColors.primary),
                        ),
                        if (_updateAvailable)
                          Positioned(
                            right: -2,
                            top: -2,
                            child: Container(
                              padding: const EdgeInsets.all(3),
                              decoration: const BoxDecoration(
                                color: Colors.red,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.circle,
                                  size: 5, color: Colors.white),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  // 6.1: notification bell next to profile icon, always visible
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
                  GestureDetector(
                    onTap: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsTab()));
                    },
                    child: const CircleAvatar(
                      radius: 16,
                      backgroundColor: AppColors.primaryLight,
                      child: Icon(Icons.person, size: 20, color: AppColors.primary),
                    ),
                  ),
                ],
              ),
            ),
            // Main Content
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
                  controller: _tabController,
                  physics: const NeverScrollableScrollPhysics(), // disable swipe
                  children: const [
                    PostsTab(),   // 4.2: Posts is the first screen shown
                    MarksTab(),
                    PaymentsTab(),
                    AttendanceTab(),
                  ],
                ),
                child: Container(
                  height: 65,
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  decoration: BoxDecoration(
                    // 10.4: gradient floating nav with glow
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
                      _buildNavItem(Icons.article, tr(context, 'posts'), 0, isDark),   // 4.2: Posts first
                      _buildNavItem(Icons.assignment, tr(context, 'marks'), 1, isDark),
                      _buildNavItem(Icons.account_balance_wallet, tr(context, 'pay'), 2, isDark),
                      _buildNavItem(Icons.calendar_month, tr(context, 'attend'), 3, isDark),
                      // 5th Item: Expandable FAB
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
                            turns: _isFabExpanded ? 0.125 : 0, // 45 degrees
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
              Text(tr(context, 'more_options'), style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
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
              _MenuTile('Messages', Icons.chat_bubble_outline, AppColors.info, () => _nav(context, const MessagesTab())),
              _MenuTile(tr(context, 'eval_book'), Icons.menu_book_outlined, Colors.teal, () => _nav(context, const EvalBookTab())),
              _MenuTile('Discipline', Icons.gavel_outlined, Colors.deepPurple, () => _nav(context, const DisciplineTab())),
              // FIX 5: Notifications REMOVED from menu — it lives in the header bell now
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






