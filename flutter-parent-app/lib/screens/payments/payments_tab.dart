import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/api_service.dart';
import '../../app/app_provider.dart';
import '../../widgets/app_widgets.dart';
import '../../models/models.dart';
import '../../core/l10n/app_localizations.dart';

class PaymentsTab extends StatefulWidget {
  const PaymentsTab({super.key});
  @override
  State<PaymentsTab> createState() => _PaymentsTabState();
}

class _PaymentsTabState extends State<PaymentsTab> {
  GuardianPaymentsResponse? _response;
  bool _loading = true;
  bool _showAllMonths = false; // 3.2: toggle to show all months incl. locked

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  // 3.1: always pull LIVE data (same source as admin dashboard)
  Future<void> _fetch() async {
    final app = Provider.of<AppProvider>(context, listen: false);
    if (app.user == null || app.user!.username.isEmpty) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    // 3.5: instant switch — provider's cached response shows first
    if (_response == null && app.payments != null) {
      if (mounted) {
        setState(() {
          _response = app.payments;
          _loading = false;
        });
      }
    }
    try {
      final fresh = await ApiService().guardianPayments(app.user!.username);
      if (mounted) {
        setState(() {
          _response = fresh;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _loading = false); // keep cached data if fetch fails
      }
    }
  }

  WardPayment? _getWardPayment(Ward? selectedWard) {
    if (_response == null || selectedWard == null) return null;
    try {
      return _response!.wardPayments.firstWhere((wp) => wp.ward.studentName == selectedWard.studentName);
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = Provider.of<AppProvider>(context);
    final wardPayment = _getWardPayment(app.selectedWard);
    final allPayments = wardPayment?.monthlyPayments ?? [];
    // 3.2: by default show paid + unlocked-due months; toggle shows everything
    final payments = _showAllMonths
        ? allPayments
        : allPayments.where((p) => p.isPaid || p.isOverdue || p.status != 'LOCKED').toList();
    final summary = wardPayment?.summary;
    final unpaid = summary?.unpaidInvoices ?? 0;

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return GradientBackground(
      child: RefreshIndicator(
        onRefresh: _fetch,
        child: ListView(
          padding: const EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 100),
          children: [
            SectionTitle(AppLocalizations.tr(context, 'monthly_payments')),
            if (app.wards.isNotEmpty)
              Container(
                margin: const EdgeInsets.only(bottom: 24),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2C2C2C) : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: isDark ? Colors.transparent : AppColors.border),
                  boxShadow: isDark ? [] : [softShadow],
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<Ward>(
                    value: app.selectedWard,
                    isExpanded: true,
                    icon: Icon(Icons.expand_more, color: theme.primaryColor),
                    dropdownColor: isDark ? const Color(0xFF2C2C2C) : Colors.white,
                    items: app.wards.map((w) => DropdownMenuItem(
                      value: w,
                      child: Text(w.studentName, style: theme.textTheme.titleMedium),
                    )).toList(),
                    onChanged: (w) {
                      if (w != null) app.selectWard(w);
                    },
                  ),
                ),
              ),

            if (_loading)
              const SkeletonCard(height: 100)
            else if (unpaid > 0)
              _UnpaidBanner(unpaid: unpaid, balance: summary?.totalBalance ?? 0)
            else if (summary != null && summary.totalInvoices > 0)
              _PaidBanner(totalPaid: summary.totalPaid)
            else if (summary != null)
              // 3.4: no invoices at all — likely fee-exempt (free) ward
              _FreeBanner(),

            // 3.2: toggle between "due months" and "all months"
            if (!_loading && allPayments.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton.icon(
                      onPressed: () => setState(() => _showAllMonths = !_showAllMonths),
                      icon: Icon(
                        _showAllMonths ? Icons.visibility_off : Icons.visibility,
                        size: 16,
                        color: AppColors.primary,
                      ),
                      label: Text(
                        _showAllMonths ? 'Hide locked months' : 'Show all months',
                        style: const TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                    ),
                  ],
                ),
              ),

            if (!_loading && allPayments.isEmpty && (summary == null || summary.totalInvoices == 0))
              EmptyState(
                  icon: Icons.account_balance_wallet_outlined,
                  message: AppLocalizations.tr(context, 'no_payments'))
            else if (!_loading)
              ...payments.map((p) {
                final isPaid = p.isPaid;
                final locked = !isPaid && !p.isOverdue && p.status == 'LOCKED';
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: GestureDetector(
                    onTap: isPaid ? () => _showReceipt(context, p, app.selectedWard!) : null,
                    child: AppCard(
                      padding: const EdgeInsets.all(20),
                      opacity: locked ? 0.55 : 1.0,
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isPaid
                                  ? (isDark ? AppColors.success.withOpacity(0.15) : AppColors.successSoft)
                                  : (isDark ? AppColors.accent.withOpacity(0.15) : AppColors.accentSoft),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Icon(
                              isPaid ? Icons.check_circle : (locked ? Icons.lock_outline : Icons.schedule),
                              color: isPaid ? AppColors.success : AppColors.accent,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(p.month,
                                    style: theme.textTheme.titleMedium?.copyWith(
                                      fontSize: 16,
                                    )),
                                const SizedBox(height: 4),
                                Text(
                                  locked ? '${p.invoiceNumber} • not yet due' : p.invoiceNumber,
                                  style: TextStyle(
                                    color: theme.textTheme.bodyMedium?.color?.withOpacity(0.7),
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              // FIX 3: show the actually PAID amount on the card
                              // (matches the receipt), not just the fee amount
                              Text('${p.paidAmount.toInt()} ETB',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 16,
                                    color: theme.textTheme.bodyLarge?.color,
                                  )),
                              if (p.totalAmount != p.paidAmount)
                                Text('fee: ${p.totalAmount.toInt()} ETB',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: theme.textTheme.bodyMedium?.color?.withOpacity(0.6),
                                    )),
                              const SizedBox(height: 6),
                              StatusPill(
                                locked ? 'LOCKED' : p.status,
                                color: isPaid ? AppColors.success : AppColors.accent,
                                bg: isPaid
                                    ? (isDark ? AppColors.success.withOpacity(0.15) : AppColors.successSoft)
                                    : (isDark ? AppColors.accent.withOpacity(0.15) : AppColors.accentSoft),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }

  void _showReceipt(BuildContext context, MonthlyPayment p, Ward ward) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Theme.of(context).scaffoldBackgroundColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.withOpacity(0.3), borderRadius: BorderRadius.circular(2))),
              const SizedBox(height: 24),
              InteractiveViewer(
                maxScale: 3.0,
                child: FittedBox(
                  fit: BoxFit.contain,
                  child: _ReceiptWidget(p: p, ward: ward),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        );
      },
    );
  }
}

// 3.4: banner for fee-exempt / no-invoice wards
class _FreeBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppColors.info.withOpacity(0.1) : const Color(0xFFE8F1FE),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.info.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark ? AppColors.info.withOpacity(0.2) : Colors.white,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.verified_outlined, color: AppColors.info),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Fee exempt',
                  style: TextStyle(
                    color: isDark ? Colors.lightBlue.shade200 : const Color(0xFF1D4ED8),
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'This ward is exempt from monthly fees. Registration fee is paid.',
                  style: TextStyle(
                    color: isDark ? Colors.lightBlue.shade100.withOpacity(0.7) : const Color(0xFF3B82F6).withOpacity(0.8),
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _UnpaidBanner extends StatelessWidget {
  final int unpaid;
  final double balance;
  const _UnpaidBanner({required this.unpaid, required this.balance});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppColors.danger.withOpacity(0.1) : AppColors.dangerSoft,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.danger.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark ? AppColors.danger.withOpacity(0.2) : Colors.white,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.warning_amber_rounded, color: AppColors.danger),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$unpaid ${AppLocalizations.tr(context, 'unpaid_invoices')}',
                  style: const TextStyle(
                    color: AppColors.danger,
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${AppLocalizations.tr(context, 'total_balance')}: ${balance.toInt()} ETB',
                  style: TextStyle(
                    color: AppColors.danger.withOpacity(0.8),
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PaidBanner extends StatelessWidget {
  final double totalPaid;
  const _PaidBanner({required this.totalPaid});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppColors.success.withOpacity(0.1) : AppColors.successSoft,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.success.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark ? AppColors.success.withOpacity(0.2) : Colors.white,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.check_circle_outline, color: AppColors.success),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  AppLocalizations.tr(context, 'all_paid'),
                  style: const TextStyle(
                    color: AppColors.success,
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${AppLocalizations.tr(context, 'total_paid')}: ${totalPaid.toInt()} ETB',
                  style: TextStyle(
                    color: AppColors.success.withOpacity(0.8),
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ReceiptWidget extends StatelessWidget {
  final MonthlyPayment p;
  final Ward ward;

  const _ReceiptWidget({required this.p, required this.ward});

  @override
  Widget build(BuildContext context) {
    // FIX 3b: human date (dd/mm/yyyy) instead of raw ISO string
    final String date = _formatDate(
      p.payments.isNotEmpty ? (p.payments.first.date ?? '') : '',
    );
    final receiptNo = (p.receiptNumber?.isNotEmpty ?? false) ? p.receiptNumber! : '—';
    final invoiceId = p.invoiceNumber;

    return Container(
      width: 800,
      color: const Color(0xFFF1E6D1),
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Image.asset('assets/images/logo.png', width: 80, height: 80, fit: BoxFit.contain),
              const SizedBox(width: 16),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Text('Dugsiga Barbaarinta Caruurta, Hoose, Dhexe & Sare Ee Iqra', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF5A3A22), fontFamily: 'serif')),
                    Text('Iqra Kindergarten, Primary, Intermediate and Secondary School', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF5A3A22), fontFamily: 'serif')),
                    Text('Jigjiga, Ethiopia', style: TextStyle(fontSize: 12, color: Color(0xFF5A3A22))),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text('Cash Receipt Voucher', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF8B0000), fontFamily: 'serif')),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Text('DATE ', style: TextStyle(fontSize: 12, color: Color(0xFF5A3A22))),
                      Container(
                        padding: const EdgeInsets.only(bottom: 2),
                        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFF5A3A22)))),
                        child: Text(date, style: const TextStyle(fontSize: 14, color: Color(0xFF5A3A22))),
                      ),
                      const SizedBox(width: 16),
                      const Text('NO. ', style: TextStyle(fontSize: 12, color: Color(0xFF5A3A22))),
                      Text(receiptNo, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.red)),
                    ],
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          Center(child: Text('Invoice ID: $invoiceId', style: const TextStyle(fontSize: 12, color: Color(0xFF5A3A22)))),
          const SizedBox(height: 16),
          const Divider(color: Color(0xFFE2C499), thickness: 2),
          const SizedBox(height: 16),

          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 1,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('From', style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Color(0xFF5A3A22))),
                    Text('Guardian Name / ${ward.studentName}', style: const TextStyle(fontSize: 16, color: Colors.black)),
                    const SizedBox(height: 16),
                    const Text('Purpose of Payment', style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Color(0xFF5A3A22))),
                    Text('Monthly Tuition Fee - ${p.month}', style: const TextStyle(fontSize: 16, color: Colors.black)),
                    const SizedBox(height: 4),
                    Text(invoiceId, style: const TextStyle(fontSize: 14, color: Colors.black54)),
                    const SizedBox(height: 16),
                    const Text('Remainder', style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Color(0xFF5A3A22))),
                  ],
                ),
              ),
              Container(width: 1, height: 180, color: const Color(0xFFE2C499), margin: const EdgeInsets.symmetric(horizontal: 24)),
              Expanded(
                flex: 1,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Amount in Words', style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Color(0xFF5A3A22))),
                    const Text('Total Paid Value Only', style: TextStyle(fontSize: 16, color: Colors.black)),
                    const SizedBox(height: 16),
                    const Align(alignment: Alignment.centerRight, child: Text('Payment in Figures', style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Color(0xFF5A3A22)))),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8F0DE),
                        border: Border.all(color: const Color(0xFFD3B68E)),
                      ),
                      child: Text('${p.paidAmount.toStringAsFixed(2)}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black)),
                    ),
                    const SizedBox(height: 24),
                    const Text("Cashier's Name & Sign", style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Color(0xFF5A3A22))),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          const Center(child: Text('Iqra Academy • Jigjiga, Ethiopia • 0705377079', style: TextStyle(fontSize: 10, color: Color(0xFF5A3A22)))),
        ],
      ),
    );
  }

  String _formatDate(String iso) {
    if (iso.isEmpty) return '—';
    try {
      final dt = DateTime.parse(iso);
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return iso;
    }
  }
}
