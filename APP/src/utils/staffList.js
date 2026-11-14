// Staff rows can come from overlapping class tables (e.g. staff_teachers.teacher
// and staff_teachers.teachers) or cross-category registrations. Keep one row per staff member,
// preferring the row that has active assignments or the most real values (phone, machine id, gender, ...).
export function dedupeStaff(list, key = 'global_staff_id') {
  const score = (x) => {
    let s = Object.values(x || {}).filter(
      (v) => v !== null && v !== undefined && String(v).trim() !== ''
    ).length;
    if (x?.is_active === true) s += 10;
    if (x?.role === 'Teacher') s += 5;
    return s;
  };

  // 1. Dedupe by global_staff_id or fallback id
  const byId = new Map();
  for (const item of list || []) {
    const k = String(item?.global_staff_id ?? item?.id ?? item?.[key] ?? '');
    if (!k) continue;
    const prev = byId.get(k);
    if (!prev || score(item) > score(prev)) byId.set(k, item);
  }

  // 2. Dedupe by normalized name so duplicate names are never shown twice
  const byName = new Map();
  for (const item of byId.values()) {
    const nameKey = String(item?.name || '').trim().toLowerCase();
    if (!nameKey) {
      byName.set(`no-name-${item?.global_staff_id || Math.random()}`, item);
      continue;
    }
    const prev = byName.get(nameKey);
    if (!prev || score(item) > score(prev)) {
      byName.set(nameKey, item);
    }
  }

  return [...byName.values()];
}
