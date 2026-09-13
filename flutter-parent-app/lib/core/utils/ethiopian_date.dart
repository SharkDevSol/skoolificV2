/// T5: shared Ethiopian calendar helpers — ONE source of truth for the
/// "current Ethiopian month" used by both the Attendance tab and the
/// Student Details screen (they disagreed: 6% vs 0% for the same period).
class EthiopianDate {
  /// Current Ethiopian year. New year starts Sep 11.
  static int get year {
    final g = DateTime.now();
    final afterNewYear = g.month > 9 || (g.month == 9 && g.day >= 11);
    return afterNewYear ? g.year - 7 : g.year - 8;
  }

  /// Current Ethiopian month (1-13). Days 1-10 of a Gregorian month belong to
  /// the PREVIOUS Ethiopian month (e.g. Sep 1-10 = Pagume 13).
  static int get month {
    final g = DateTime.now();
    const startMap = {
      9: 1, 10: 2, 11: 3, 12: 4, 1: 5, 2: 6, 3: 7, 4: 8, 5: 9, 6: 10, 7: 11, 8: 12
    };
    final m = startMap[g.month]!;
    if (g.day >= 11) return m;
    final prev = m - 1;
    return prev < 1 ? 13 : prev;
  }
}
