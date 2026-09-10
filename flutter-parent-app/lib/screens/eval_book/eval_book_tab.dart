import 'package:flutter/material.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/page_header.dart';

class EvalBookTab extends StatelessWidget {
  const EvalBookTab({super.key});

  @override
  Widget build(BuildContext context) {
    // FIX 7: same floating header style as the app shell
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            PageHeader(title: tr(context, 'eval_book'), icon: Icons.menu_book_outlined),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: AppCard(
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.lock_outline,
                          size: 48,
                          color: AppColors.textMuted,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'COMING SOON',
                          style: TextStyle(
                            fontSize: 14,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
