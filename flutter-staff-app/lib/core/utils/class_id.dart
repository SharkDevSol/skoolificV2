/// Class-ID label helper.
///
/// The backend assigns each student a `class_id` that IS their alphabetical
/// rank in the class (Abdallah=1, Ahmed=2, Bilal=3, ...), recomputed on every
/// add/import/transfer/delete so a newly added earlier-name student shifts the
/// others down. We display that number directly — no letter conversion.
String classIdLabel(dynamic value) {
  if (value == null) return '';
  final raw = value.toString().trim();
  if (raw.isEmpty) return '';
  final num = int.tryParse(raw);
  if (num == null || num < 1) return raw;
  return num.toString();
}
