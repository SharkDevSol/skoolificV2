import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../app/app_provider.dart';

class NotificationsTab extends StatelessWidget {
  const NotificationsTab({super.key});

  @override
  Widget build(BuildContext context) {
    final app = Provider.of<AppProvider>(context);
    final List<_Note> notes = [];
    
    if (app.wards.isNotEmpty) {
      notes.add(_Note('Welcome', 'Welcome back, ${app.user?.name ?? ''}!', Icons.person));
    }
    if (app.marks.isNotEmpty) {
      notes.add(_Note('Marks Updated', 'You have new marks data for your wards.', Icons.bar_chart_outlined));
    }
    if (app.payments != null && app.payments!.hasUnpaidInvoices) {
      notes.add(_Note('Payment Reminder', 'You have ${app.payments!.unpaidCount} unpaid invoices.', Icons.account_balance_wallet_outlined));
    }

    if (notes.isEmpty) {
      notes.add(const _Note('No Notifications', 'You are all caught up!', Icons.notifications_off));
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: notes
            .map((n) => Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.border),
                    boxShadow: const [softShadow],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.primarySoft,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(n.icon, color: AppColors.primary, size: 20),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(n.title,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700, fontSize: 15)),
                            const SizedBox(height: 3),
                            Text(n.body,
                                style: const TextStyle(
                                  color: AppColors.textSecondary, fontSize: 13)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ))
            .toList(),
      ),
    );
  }
}

class _Note {
  final String title;
  final String body;
  final IconData icon;
  const _Note(this.title, this.body, this.icon);
}
