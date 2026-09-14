import 'dart:async';
import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../core/theme/app_theme.dart';
import '../core/l10n/app_localizations.dart';

/// T4 final: offline banner — shows "You are offline — showing saved data"
/// when the device loses connectivity. Data still displays from the local
/// caches (wards, marks, payments, posts restore offline).
class OfflineBanner extends StatefulWidget {
  const OfflineBanner({super.key});

  @override
  State<OfflineBanner> createState() => _OfflineBannerState();
}

class _OfflineBannerState extends State<OfflineBanner> {
  bool _offline = false;
  StreamSubscription<List<ConnectivityResult>>? _sub;

  @override
  void initState() {
    super.initState();
    _check();
    _sub = Connectivity().onConnectivityChanged.listen((results) {
      final offline = results.isEmpty ||
          results.every((r) => r == ConnectivityResult.none);
      if (mounted && offline != _offline) {
        setState(() => _offline = offline);
      }
    });
  }

  Future<void> _check() async {
    try {
      final results = await Connectivity().checkConnectivity();
      final offline = results.isEmpty ||
          results.every((r) => r == ConnectivityResult.none);
      if (mounted) setState(() => _offline = offline);
    } catch (_) {}
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_offline) return const SizedBox();
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.accent.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.accent.withOpacity(0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.wifi_off, color: AppColors.accent, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              AppLocalizations.tr(context, 'offline_mode'),
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.accent,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
