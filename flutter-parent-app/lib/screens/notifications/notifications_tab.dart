import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/app_widgets.dart';
import '../../core/services/storage_service.dart';
import '../../models/models.dart';
import '../../app/app_shell.dart';
import '../../core/l10n/app_localizations.dart';

// T8: notifications page — tap a notification opens the right page (marks,
// attendance, payments...), reading it marks it read (bold unread style).
class NotificationsTab extends StatefulWidget {
  const NotificationsTab({super.key});
  @override
  State<NotificationsTab> createState() => _NotificationsTabState();
}

class _NotificationsTabState extends State<NotificationsTab> {
  List<NotificationItem> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final raw = StorageService.getOfflineCache('notifs');
      if (raw != null) {
        final list = jsonDecode(raw) as List;
        _items = list.map((n) => NotificationItem.fromJson(n)).toList();
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _save() async {
    try {
      await StorageService.setOfflineCache(
          'notifs', jsonEncode(_items.map((n) => n.toJson()).toList()));
    } catch (_) {}
  }

  Future<void> _clearAll() async {
    await StorageService.setOfflineCache('notifs', jsonEncode([]));
    setState(() => _items = []);
  }

  // T8: mark one notification read
  Future<void> _markRead(int index) async {
    final n = _items[index];
    if (n.read) return;
    setState(() {
      _items[index] = NotificationItem(
        id: n.id, title: n.title, body: n.body, time: n.time, read: true,
      );
    });
    await _save();
  }

  // T8: navigate to the page matching the notification type —
  // pops back to the shell and switches to the right tab
  void _openTarget(String type) {
    // dismiss the notifications page first
    Navigator.of(context).pop();
    switch (type.toLowerCase()) {
      case 'marks':
        AppShell.switchTab?.call(1);
        break;
      case 'attendance':
        AppShell.switchTab?.call(3);
        break;
      case 'payment':
      case 'payments':
        AppShell.switchTab?.call(2);
        break;
      // messages/discipline open as pushed pages from the + menu —
      // switching the shell tab doesn't reach them, so just go home tab
      default:
        AppShell.switchTab?.call(0);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text(AppLocalizations.tr(context, 'notifications')),
        actions: [
          if (_items.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_sweep_outlined),
              onPressed: _clearAll,
            ),
        ],
      ),
      body: GradientBackground(
        child: _loading
            ? const Center(child: AppLoadingIndicator())
            : _items.isEmpty
                ? EmptyState(
                    icon: Icons.notifications_off_outlined,
                    message: AppLocalizations.tr(context, 'no_notifications'))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _items.length,
                    itemBuilder: (ctx, i) {
                      final n = _items[i];
                      final type = (n.type ?? '').toString();
                      return GestureDetector(
                        onTap: () async {
                          await _markRead(i);
                          if (type.isNotEmpty) _openTarget(type);
                        },
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            // unread = highlighted; read = dimmed (T8)
                            color: n.read
                                ? (isDark ? const Color(0xFF1E1E1E) : Colors.white)
                                : AppColors.primary.withOpacity(isDark ? 0.15 : 0.08),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: n.read
                                  ? (isDark ? const Color(0xFF2C2C2C) : AppColors.border)
                                  : AppColors.primary.withOpacity(0.5),
                            ),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withOpacity(n.read ? 0.1 : 0.2),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(_iconForType(type),
                                    color: AppColors.primary, size: 18),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(n.title,
                                        style: theme.textTheme.titleMedium?.copyWith(
                                          fontSize: 15,
                                          fontWeight: n.read ? FontWeight.w600 : FontWeight.w800,
                                        )),
                                    const SizedBox(height: 4),
                                    Text(n.body,
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: isDark ? Colors.white70 : AppColors.textSecondary,
                                          height: 1.4,
                                        )),
                                    if (n.time != null) ...[
                                      const SizedBox(height: 6),
                                      Text(
                                        _shortTime(n.time!),
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: isDark ? Colors.white38 : AppColors.textMuted,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              if (!n.read)
                                Container(
                                  width: 8,
                                  height: 8,
                                  margin: const EdgeInsets.only(top: 4),
                                  decoration: const BoxDecoration(
                                    color: AppColors.primary,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }

  IconData _iconForType(String type) {
    switch (type.toLowerCase()) {
      case 'marks':
        return Icons.assignment_outlined;
      case 'attendance':
        return Icons.calendar_today_outlined;
      case 'payment':
      case 'payments':
        return Icons.account_balance_wallet_outlined;
      case 'message':
      case 'messages':
        return Icons.chat_bubble_outline;
      case 'faults':
      case 'discipline':
        return Icons.gavel_outlined;
      default:
        return Icons.notifications_active;
    }
  }

  String _shortTime(String t) {
    try {
      final dt = DateTime.parse(t);
      final now = DateTime.now();
      final diff = now.difference(dt);
      if (diff.inMinutes < 1) return 'just now';
      if (diff.inHours < 1) return '${diff.inMinutes}m ago';
      if (diff.inDays < 1) return '${diff.inHours}h ago';
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return t;
    }
  }
}

