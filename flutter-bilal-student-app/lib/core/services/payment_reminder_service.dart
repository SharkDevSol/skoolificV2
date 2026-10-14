import 'dart:convert';
import 'package:flutter/material.dart';
import '../../models/models.dart';
import '../../app/app_provider.dart';
import '../../app/app_shell.dart';
import 'storage_service.dart';
import 'api_service.dart';

class PaymentReminderService {
  static const int _threeDaysMs = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

  /// Checks if guardian has unpaid months and sends a reminder notification every 3 days.
  static Future<void> checkAndRemind(BuildContext? context, AppProvider provider) async {
    try {
      final user = provider.user;
      if (user == null || user.username.isEmpty) return;

      // 1. Get payments data
      GuardianPaymentsResponse? payments = provider.payments;
      if (payments == null) {
        try {
          payments = await ApiService().guardianPayments(user.username);
        } catch (_) {
          return;
        }
      }

      if (payments == null || payments.wardPayments.isEmpty) return;

      // 2. Collect unpaid months across all wards
      final List<String> unpaidMonths = [];
      String studentName = '';

      for (final wp in payments.wardPayments) {
        for (final m in wp.monthlyPayments) {
          final isUnpaid = !m.isPaid && m.status.toUpperCase() != 'PAID';
          if (isUnpaid && m.month.isNotEmpty) {
            if (!unpaidMonths.contains(m.month)) {
              unpaidMonths.add(m.month);
            }
            if (studentName.isEmpty && wp.ward.studentName.isNotEmpty) {
              studentName = wp.ward.studentName;
            }
          }
        }
      }

      if (unpaidMonths.isEmpty) return;

      // 3. Check if 3 days have passed since the last reminder
      final lastMsStr = StorageService.getOfflineCache('last_payment_reminder_ms');
      final now = DateTime.now().millisecondsSinceEpoch;
      if (lastMsStr != null) {
        final lastMs = int.tryParse(lastMsStr) ?? 0;
        if (now - lastMs < _threeDaysMs) {
          // Less than 3 days, skip
          return;
        }
      }

      // 4. Update the reminder timestamp
      await StorageService.setOfflineCache('last_payment_reminder_ms', now.toString());

      // 5. Generate localized notification title & message
      final lang = (StorageService.locale ?? 'so').toLowerCase().trim();
      final monthsListStr = unpaidMonths.take(3).join(', ') + (unpaidMonths.length > 3 ? '...' : '');

      String title;
      String body;

      switch (lang) {
        case 'so':
          title = 'Xusuusin: Lacagta Bisha ee aan la bixin';
          body = studentName.isNotEmpty
              ? 'Waxaa jira bilaha ($monthsListStr) oo aan wali la bixin ardayga $studentName. Fadlan bixi lacagta dugsiga.'
              : 'Waxaa jira bilaha ($monthsListStr) oo aan wali la bixin. Fadlan bixi lacagta dugsiga.';
          break;
        case 'am':
          title = 'የክፍያ ማሳሰቢያ፡ ያልተከፈለ ወር';
          body = studentName.isNotEmpty
              ? 'ለተማሪ $studentName ያልተከፈሉ ወራት ($monthsListStr) አሉ። እባክዎ ክፍያውን ያጠናቅቁ።'
              : 'ያልተከፈሉ ወራት ($monthsListStr) አሉ። እባክዎ ክፍያውን ያጠናቅቁ።';
          break;
        case 'ar':
          title = 'تذكير بالدفع: رسوم غير مدفوعة';
          body = studentName.isNotEmpty
              ? 'توجد رسوم غير مدفوعة للأشهر ($monthsListStr) للطالب $studentName. يرجى سداد المبلغ المستحق.'
              : 'توجد رسوم غير مدفوعة للأشهر ($monthsListStr). يرجى سداد المبلغ المستحق.';
          break;
        case 'en':
        default:
          title = 'Payment Reminder: Unpaid Month(s)';
          body = studentName.isNotEmpty
              ? 'Unpaid fee detected for $studentName for month(s): $monthsListStr. Please settle the school fee.'
              : 'You have unpaid school fees for month(s): $monthsListStr. Please settle the payment.';
          break;
      }

      // 6. Save to local notifications list
      final notifsRaw = StorageService.getOfflineCache('notifs');
      final List notifs = notifsRaw != null ? jsonDecode(notifsRaw) as List : [];
      notifs.insert(0, {
        'id': 'pay_rem_$now',
        'title': title,
        'body': body,
        'time': DateTime.now().toIso8601String(),
        'read': false,
        'type': 'payment',
      });
      if (notifs.length > 20) notifs.removeRange(20, notifs.length);
      await StorageService.setOfflineCache('notifs', jsonEncode(notifs));

      // 7. Show in-app banner if context is mounted
      if (context != null && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFFE53935),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            duration: const Duration(seconds: 5),
            content: Row(
              children: [
                const Icon(Icons.payment, color: Colors.white, size: 22),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13)),
                      const SizedBox(height: 2),
                      Text(body, style: const TextStyle(color: Colors.white, fontSize: 11), maxLines: 2, overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
              ],
            ),
            action: SnackBarAction(
              label: lang == 'so' ? 'Arag' : (lang == 'am' ? 'ይመልከቱ' : (lang == 'ar' ? 'عرض' : 'View')),
              textColor: Colors.amber,
              onPressed: () {
                AppShell.switchTab?.call(2); // Go to payments tab
              },
            ),
          ),
        );
      }
    } catch (e) {
      debugPrint('Payment reminder check error: $e');
    }
  }
}
