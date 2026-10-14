import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/api_service.dart';
import '../../app/app_provider.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/ward_selector.dart';
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

  @override
  Widget build(BuildContext context) {
    final app = Provider.of<AppProvider>(context);
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
              const WardSelector(),
            const SizedBox(height: 24),
            // Bilal: payments not active yet
            _NotActiveBanner(isDark: isDark),
          ],
        ),
      ),
    );
  }
}

class _NotActiveBanner extends StatelessWidget {
  const _NotActiveBanner({required this.isDark});
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceAlt : AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.account_balance_wallet_outlined, size: 56, color: AppColors.textMuted),
          const SizedBox(height: 16),
          const Text(
            'Payments are not active now',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.text),
          ),
          const SizedBox(height: 8),
          const Text(
            'Please contact the school office for payment information.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}
