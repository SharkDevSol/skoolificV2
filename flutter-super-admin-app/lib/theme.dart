import 'package:flutter/material.dart';

/// Colours mirror the web `/super-admin` design (deep red + gold on white).
class AppColors {
  final bool isDark;
  const AppColors(this.isDark);

  static AppColors of(BuildContext c) =>
      AppColors(Theme.of(c).brightness == Brightness.dark);

  Color get primary => const Color(0xFFB21E23);
  Color get primaryDeep => const Color(0xFF8B1A1A);
  Color get gold => const Color(0xFFF7941E);
  Color get goldLight => const Color(0xFFFFB04D);

  Color get scaffold => isDark ? const Color(0xFF0F0A09) : const Color(0xFFF2F3F5);
  Color get bg => isDark ? const Color(0xFF170F0D) : Colors.white;
  Color get card => isDark ? const Color(0xFF241814) : Colors.white;
  Color get text => isDark ? const Color(0xFFF3E9E4) : Colors.black;
  Color get muted => isDark ? const Color(0xFFB3A29A) : const Color(0xFF3A3A3A);
  Color get line => isDark ? const Color(0xFF3A2924) : const Color(0xFFD9D9D9);
  Color get track => isDark ? const Color(0xFF3A2924) : const Color(0xFFE6E6E6);
  Color get input => isDark ? const Color(0xFF30221D) : Colors.white;

  Color get green => const Color(0xFF107C41);
  Color get red => const Color(0xFFB21E23);
  Color get blue => const Color(0xFF2563EB);
  Color get amber => const Color(0xFFB8860B);

  List<Color> get headerGradient => const [
        Color(0xFF8B1A1A),
        Color(0xFFB21E23),
        Color(0xFF8B1A1A),
      ];
}

ThemeData appTheme(bool dark) {
  final c = AppColors(dark);
  final scheme = ColorScheme.fromSeed(
    seedColor: c.primary,
    brightness: dark ? Brightness.dark : Brightness.light,
  ).copyWith(
    primary: c.primary,
    secondary: c.gold,
    surface: c.card,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: dark ? Brightness.dark : Brightness.light,
    colorScheme: scheme,
    scaffoldBackgroundColor: c.scaffold,
    canvasColor: c.card,
    dividerColor: c.line,
    splashFactory: InkSparkle.splashFactory,
    fontFamily: 'Roboto',
    textTheme: Typography.material2021().black.apply(
          bodyColor: c.text,
          displayColor: c.text,
        ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: c.input,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      hintStyle: TextStyle(color: c.muted.withValues(alpha: 0.75), fontSize: 13.5),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: c.line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: c.primary, width: 1.4),
      ),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: dark ? const Color(0xFF33221D) : const Color(0xFF2B2B2B),
      contentTextStyle: const TextStyle(color: Colors.white),
    ),
  );
}
