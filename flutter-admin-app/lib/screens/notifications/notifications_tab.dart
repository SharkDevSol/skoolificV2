import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/services/storage_service.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/page_header.dart';
import '../../app/app_shell.dart';

class NotificationsTab extends StatefulWidget {
  const NotificationsTab({super.key});

  @override
  State<NotificationsTab> createState() => _NotificationsTabState();
}

class _NotificationsTabState extends State<NotificationsTab> {
  List<Map<String, dynamic>> _notifs = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    try {
      final raw = StorageService.getOfflineCache('notifs');
      if (raw != null) {
        final list = jsonDecode(raw) as List;
        setState(() {
          _notifs = list.map((e) => Map<String, dynamic>.from(e)).toList();
        });
      }
    } catch (_) {}
  }

  void _clearAll() async {
    await StorageService.setOfflineCache('notifs', '[]');
    setState(() => _notifs = []);
  }

  void _handleTap(Map<String, dynamic> n) {
    final type = (n['type'] ?? '').toString().toLowerCase();
    Navigator.pop(context); // close notifications page
    switch (type) {
      case 'schedule':
        AppShell.switchTab?.call(1);
        break;
      case 'marks':
      case 'marklist':
        AppShell.switchTab?.call(2);
        break;
      case 'attendance':
        AppShell.switchTab?.call(3);
        break;
      case 'message':
      case 'chat':
        AppShell.openMessages?.call();
        break;
      case 'faults':
      case 'discipline':
        AppShell.openDiscipline?.call();
        break;
      case 'eval_book':
        AppShell.openEvalBook?.call();
        break;
      default:
        AppShell.switchTab?.call(0);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            PageHeader(
              title: tr(context, 'notifications'),
              icon: Icons.notifications_none,
            ),
            if (_notifs.isNotEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton.icon(
                      onPressed: _clearAll,
                      icon: const Icon(Icons.delete_outline, size: 16, color: AppColors.danger),
                      label: const Text('Clear All', style: TextStyle(color: AppColors.danger, fontSize: 12)),
                    ),
                  ],
                ),
              ),
            Expanded(
              child: _notifs.isEmpty
                  ? EmptyState(
                      icon: Icons.notifications_off_outlined,
                      message: 'No notifications received yet',
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      itemCount: _notifs.length,
                      itemBuilder: (context, idx) {
                        final n = _notifs[idx];
                        final title = n['title']?.toString() ?? 'IQRA Staff Alert';
                        final body = n['body']?.toString() ?? '';
                        final time = n['time']?.toString() ?? '';

                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: AppCard(
                            padding: const EdgeInsets.all(14),
                            onTap: () => _handleTap(n),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: const BoxDecoration(
                                    color: AppColors.primarySoft,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.notifications_active, color: AppColors.primary, size: 20),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        title,
                                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                                      ),
                                      const SizedBox(height: 3),
                                      Text(
                                        body,
                                        style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                                      ),
                                      if (time.isNotEmpty) ...[
                                        const SizedBox(height: 6),
                                        Text(
                                          time.contains('T') ? time.split('T')[0] : time,
                                          style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
