// Staff rows can come from overlapping class tables (e.g. staff_teachers.teacher
// and staff_teachers.teachers). Keep one row per global staff id, preferring the
// row that has the most real values (phone, machine id, gender, ...).
export function dedupeStaff(list, key = 'id') {
  const score = (x) =>
    Object.values(x || {}).filter(
      (v) => v !== null && v !== undefined && String(v).trim() !== ''
    ).length;
  const byId = new Map();
  for (const item of list || []) {
    const k = String(item?.[key] ?? '');
    if (!k) continue;
    const prev = byId.get(k);
    if (!prev || score(item) > score(prev)) byId.set(k, item);
  }
  return [...byId.values()];
}
