import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/app_widgets.dart';
import '../../core/services/storage_service.dart';
import '../../models/models.dart';

// FIX 5/6: real notifications page — shows pushes received (stored locally)
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

  Future<void> _clearAll() async {
    await StorageService.setOfflineCache('notifs', jsonEncode([]));
    setState(() => _items = []);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
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
                    message: 'No notifications yet.\nNew marks, payments, faults and messages will appear here.')
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _items.length,
                    itemBuilder: (ctx, i) {
                      final n = _items[i];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: isDark ? const Color(0xFF2C2C2C) : AppColors.border),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withOpacity(0.1),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.notifications_active,
                                  color: AppColors.primary, size: 18),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(n.title,
                                      style: theme.textTheme.titleMedium?.copyWith(fontSize: 15)),
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
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
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
