import 'package:flutter/material.dart';
import 'package:flutter_floating_bottom_bar/flutter_floating_bottom_bar.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import 'app_provider.dart';
import '../../screens/marks/marks_tab.dart';
import '../../screens/payments/payments_tab.dart';
import '../../screens/posts/posts_tab.dart';
import '../../screens/attendance/attendance_tab.dart';
import '../../screens/settings/settings_tab.dart';
import '../../screens/discipline/discipline_tab.dart';
import '../../screens/messages/messages_tab.dart';
// Placeholders for missing tabs
class MessagesTab extends StatelessWidget { const MessagesTab({super.key}); @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Messages'))); }
class EvalBookTab extends StatelessWidget { const EvalBookTab({super.key}); @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Eval Book'))); }
class NotificationsTab extends StatelessWidget { const NotificationsTab({super.key}); @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Notifications'))); }

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> with SingleTickerProviderStateMixin {
  int _currentIndex = 0;
  bool _isFabExpanded = false;
  late TabController _tabController;
  bool _hasNotified = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() => _currentIndex = _tabController.index);
      }
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkAndNotify();
    });
  }

  void _checkAndNotify() {
    final app = Provider.of<AppProvider>(context, listen: false);
    app.addListener(() {
      if (app.wards.isNotEmpty && !_hasNotified) {
        _hasNotified = true;
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.notifications_active, color: Colors.white),
                  const SizedBox(width: 12),
                  const Expanded(child: Text("You have new data for Attendance, Marks, and Payments!")),
                ],
              ),
              backgroundColor: const Color(0xFF7B2D26),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              duration: const Duration(seconds: 4),
            ),
          );
        }
      }
    });
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
                      _buildNavItem(Icons.article, 'Posts', 0, isDark),   // 4.2: Posts first
                      _buildNavItem(Icons.assignment, 'Marks', 1, isDark),
                      _buildNavItem(Icons.account_balance_wallet, 'Pay', 2, isDark),
                      _buildNavItem(Icons.calendar_month, 'Attend', 3, isDark),
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
              const Text('More Options', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
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
              _MenuTile('Eval Book', Icons.menu_book_outlined, Colors.teal, () => _nav(context, const EvalBookTab())),
              _MenuTile('Discipline', Icons.gavel_outlined, Colors.deepPurple, () => _nav(context, const DisciplineTab())),
              
              _MenuTile('Notifications', Icons.notifications_active_outlined, Colors.redAccent, () => _nav(context, const NotificationsTab())),

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






