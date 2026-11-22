/// Build-time variant switch for the two admin apps.
///
/// IQRA Admin keeps the branch-code login (IQRA1–IQRA5).
/// Bilal Admin is built with --dart-define=BILAL=true and only asks for
/// username + password; the branch is fixed to BILAL.
class AppVariant {
  static const bool isBilal = bool.fromEnvironment('BILAL', defaultValue: false);
  static const String appName = isBilal ? 'Bilal Admin' : 'IQRA Admin';
  static const String defaultBranch = isBilal ? 'BILAL' : 'IQRA3';
  static const String adminLabel = isBilal ? 'Bilal Administration' : 'School Administration Console';
  static const List<String> branches = isBilal
      ? ['BILAL']
      : ['IQRA1', 'IQRA2', 'IQRA3', 'IQRA4', 'IQRA5'];
}
