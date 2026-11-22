/// T5: shared Ethiopian calendar helpers — ONE source of truth for the
/// Ethiopian date used by the Attendance tab, Student Details and Profile.
///
/// Conversion validated against timeanddate.com's Enkutatash table
/// (2003-2036): Meskerem 1 falls on Sep 11, or Sep 12 when the Gregorian
/// year is divisible by 4 leaving remainder 3 (2023, 2027, 2031, 2035...).
/// Ethiopian leap years (6-day Pagume) are those with year % 4 == 3.
class EthiopianDate {
  static const List<String> monthNames = [
    'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
    'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume',
  ];

  /// Gregorian → Ethiopian (year, month 1-13, day).
  static EthDate fromGregorian(DateTime g) {
    final date = DateTime(g.year, g.month, g.day);
    final ny = _newYear(g.year);
    if (!date.isBefore(ny)) {
      final diff = date.difference(ny).inDays;
      return _fromDiff(g.year - 7, diff);
    }
    final nyPrev = _newYear(g.year - 1);
    final diff = date.difference(nyPrev).inDays;
    return _fromDiff(g.year - 8, diff);
  }

  /// Meskerem 1 of the given Gregorian year.
  static DateTime _newYear(int gregYear) =>
      DateTime(gregYear, 9, gregYear % 4 == 3 ? 12 : 11);

  static EthDate _fromDiff(int ethYear, int diff) {
    final month = diff ~/ 30 + 1; // 1..13 (diff <= 365)
    final day = diff - (month - 1) * 30 + 1;
    return EthDate(ethYear, month, day);
  }

  /// Short label like "Meskerem 18" for a Gregorian date.
  static String short(DateTime g) {
    final e = fromGregorian(g);
    return '${monthNames[e.month - 1]} ${e.day}';
  }

  /// Current Ethiopian year. New year starts Sep 11.
  static int get year => fromGregorian(DateTime.now()).year;

  /// Current Ethiopian month (1-13).
  static int get month => fromGregorian(DateTime.now()).month;
}

/// Plain value object: Ethiopian calendar date.
class EthDate {
  const EthDate(this.year, this.month, this.day);

  final int year;
  final int month; // 1..13
  final int day;

  String get monthName => EthiopianDate.monthNames[month - 1];

  /// "Meskerem 22, 2019"
  String get label => '$monthName $day, $year';
}
