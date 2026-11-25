const ethiopianCalendar = require('../utils/ethiopianCalendar');

// ---------------------------------------------------------------------------
// Unpaid-student hiding
// A student is "hidden" when:
//   - the rule is enabled for the branch,
//   - they have >= threshold unpaid UNLOCKED months,
//   - they are not a free/scholarship student,
//   - and they have no active reason (exemption).
// Only filtered out of mark list / attendance / parent marks+report card, and
// blocked from the student account. Nothing is deleted.
// ---------------------------------------------------------------------------

// Normalise a branch code. Some callers pass duplicate HTTP headers joined by
// a comma ("IQRA2, IQRA2"); always keep the first clean code so settings and
// hiding checks never look at a different key.
function branchKey(branch) {
  let value = branch;
  if (Array.isArray(value)) value = value[0];
  return String(value || '').split(',')[0].trim().toUpperCase();
}

function currentEthMonth() {  const shifted = new Date(Date.now() + 3 * 3600 * 1000);
  const local = new Date(Date.UTC(
    shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), 12, 0, 0
  ));
  let month = 2, year = 2019;
  try {
    const e = ethiopianCalendar.toEthiopian(local);
    year = e.year;
    month = e.year < 2019 ? 1 : e.month;
  } catch (_) { /* keep defaults */ }
  return { month, year };
}

function studentUuid(schoolId, classId) {
  if (schoolId === null || schoolId === undefined || classId === null || classId === undefined) return null;
  return `00000000-0000-0000-${String(schoolId).padStart(4, '0')}-${String(classId).padStart(12, '0')}`.toLowerCase();
}

async function getSettings(db, branch) {
  const code = branchKey(branch);
  const r = await db.query('SELECT * FROM unpaid_hide_settings WHERE branch_code = $1', [code]);
  if (r.rows.length) return r.rows[0];
  const ins = await db.query(
    `INSERT INTO unpaid_hide_settings (branch_code) VALUES ($1)
     ON CONFLICT (branch_code) DO UPDATE SET updated_at = NOW() RETURNING *`,
    [code]
  );
  return ins.rows[0];
}

async function expireReasons(db, branch) {
  await db.query(
    `UPDATE unpaid_hide_reasons
        SET status = 'expired'
      WHERE branch_code = $1 AND status = 'active'
        AND expires_at IS NOT NULL AND expires_at <= NOW()`,
    [branchKey(branch)]
  );
}

async function activeReasons(db, branch) {
  await expireReasons(db, branch);
  const r = await db.query(
    `SELECT school_id, student_name FROM unpaid_hide_reasons
      WHERE branch_code = $1 AND status = 'active'`,
    [branchKey(branch)]
  );
  const byName = new Set();
  const byId = new Set();
  for (const row of r.rows) {
    byName.add(String(row.student_name || '').trim().toLowerCase());
    if (row.school_id) byId.add(String(row.school_id).trim());
  }
  return { byName, byId };
}

// --- 60 second cache so a mark-list request does not scan invoices every time
const _cache = new Map();

async function computeHidden(db, branch) {
  const code = branchKey(branch);
  const hit = _cache.get(code);
  if (hit && Date.now() - hit.at < 60 * 1000) return hit.data;

  const settings = await getSettings(db, code);
  const { month } = currentEthMonth();
  if (!settings.enabled) {
    const empty = { enabled: false, threshold: 0, month, hiddenNames: new Set(), hiddenIds: new Set() };
    _cache.set(code, { at: Date.now(), data: empty });
    return empty;
  }
  const threshold = parseInt(settings.months_threshold, 10) || 2;

  // unpaid unlocked months per student (same invoice source as the finance page)
  const invRes = await db.query(
    `SELECT "studentId", "netAmount", "paidAmount", metadata FROM school_comms."Invoice"`
  );
  const unpaid = new Map();
  for (const inv of invRes.rows) {
    const m = inv.metadata && inv.metadata.monthNumber ? Number(inv.metadata.monthNumber) : 0;
    if (!m || m > month) continue; // locked / future months are ignored
    const due = Math.max(Number(inv.netAmount || 0) - Number(inv.paidAmount || 0), 0);
    if (due <= 0) continue;
    const key = String(inv.studentId || '').toLowerCase();
    if (!key) continue;
    unpaid.set(key, (unpaid.get(key) || 0) + 1);
  }

  const reasons = await activeReasons(db, code);
  const hiddenNames = new Set();
  const hiddenIds = new Set();

  const tables = (await db.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'classes_schema'`
  )).rows.map(r => r.table_name);

  for (const t of tables) {
    try {
      const cols = (await db.query(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'classes_schema' AND table_name = $1`, [t]
      )).rows.map(r => r.column_name);
      if (!cols.includes('student_name')) continue;

      const freeExpr = cols.includes('is_free') ? 'is_free' : 'false';
      const rows = await db.query(
        `SELECT school_id, class_id, student_name, ${freeExpr} AS is_free FROM classes_schema."${t}"`
      );
      for (const st of rows.rows) {
        if (st.is_free === true) continue; // free students never counted
        const sid = studentUuid(st.school_id, st.class_id);
        if (!sid) continue;
        if ((unpaid.get(sid) || 0) < threshold) continue;
        const nameKey = String(st.student_name || '').trim().toLowerCase();
        if (nameKey && reasons.byName.has(nameKey)) continue;   // exempt
        if (st.school_id && reasons.byId.has(String(st.school_id).trim())) continue;
        if (nameKey) hiddenNames.add(nameKey);
        if (st.school_id) hiddenIds.add(String(st.school_id).trim());
      }
    } catch (_) { /* skip a broken class table */ }
  }

  const data = { enabled: true, threshold, month, hiddenNames, hiddenIds };
  _cache.set(code, { at: Date.now(), data });
  return data;
}

function clearCache(branch) {
  if (branch) _cache.delete(branchKey(branch));
  else _cache.clear();
}

async function isHidden(db, branch, { name, schoolId } = {}) {
  const h = await computeHidden(db, branch);
  if (!h.enabled) return false;
  if (schoolId !== undefined && schoolId !== null && h.hiddenIds.has(String(schoolId).trim())) return true;
  if (name && h.hiddenNames.has(String(name).trim().toLowerCase())) return true;
  return false;
}

module.exports = {
  currentEthMonth,
  studentUuid,
  getSettings,
  computeHidden,
  clearCache,
  isHidden,
  expireReasons,
};
