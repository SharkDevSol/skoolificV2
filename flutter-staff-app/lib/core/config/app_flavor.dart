/// Compile-time app flavour flags.
///
/// The staff code base is shared, but the two stores carry two separate apps:
///   IQRA Staff  (com.skoolific.staff)      -> built with --dart-define=IQRA_ONLY=true
///   Bilal Staff (com.skoolific.bilalstaff) -> built with the default (false)
///
/// IQRA Staff must not offer the BILAL branch or the bilal server.
const bool kIqraOnly = bool.fromEnvironment('IQRA_ONLY', defaultValue: false);
