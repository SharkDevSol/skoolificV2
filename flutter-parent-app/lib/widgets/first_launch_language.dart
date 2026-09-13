import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/storage_service.dart';
import '../../app/app_provider.dart';

/// T8: one-time language picker on first launch.
/// Shows when no language has been chosen yet (first install / cleared data).
/// Remembers the choice so it never asks again (changeable later in Settings).
class FirstLaunchLanguageDialog extends StatelessWidget {
  const FirstLaunchLanguageDialog({super.key});

  /// Returns true if the dialog should be shown (no saved choice yet).
  static bool shouldShow() => !StorageService.hasChosenLanguage;

  /// Marks the language as chosen (call after user picks).
  static Future<void> markChosen() async {
    await StorageService.setLanguageChosen();
  }

  static const List<Map<String, String>> _langs = [
    {'code': 'en', 'label': 'English', 'native': 'English'},
    {'code': 'so', 'label': 'Somali', 'native': 'Soomaali'},
    {'code': 'am', 'label': 'Amharic', 'native': 'አማርኛ'},
    {'code': 'ar', 'label': 'Arabic', 'native': 'العربية'},
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1F1F1F) : Colors.white,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: const BoxDecoration(
                color: AppColors.primaryLight,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.translate, color: AppColors.primary, size: 28),
            ),
            const SizedBox(height: 14),
            Text(
              'Choose your language',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: isDark ? Colors.white : AppColors.primaryDark,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Fadlan dooro luqadda • ቋንቋ ምረጥ • اختر اللغة',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 18),
            ..._langs.map((l) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        // save + mark chosen + apply instantly (no restart)
                        await StorageService.setLocale(l['code']!);
                        await markChosen();
                        if (context.mounted) {
                          final app = Provider.of<AppProvider>(context, listen: false);
                          app.setLocale(Locale(l['code']!));
                          Navigator.of(context).pop();
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      icon: const Icon(Icons.language, size: 18),
                      label: Text(
                        '${l['native']} (${l['label']})',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                )),
          ],
        ),
      ),
    );
  }
}
