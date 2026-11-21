const express = require('express');
const router = express.Router();
const { expireReasons } = require('../services/unpaidHide');

function branchOf(req) {
  return String(req.headers['x-branch-code'] || req.query.branchCode || req.body.branchCode || '').toUpperCase();
}

function actorOf(req) {
  return String(req.user?.name || req.user?.username || req.body?.actor || 'admin');
}

// ---- settings -------------------------------------------------------------
router.get('/settings', async (req, res) => {
  try {
    const db = req.branchPool || req.app.locals.pool;
    const code = branchOf(req);
    if (!code) return res.status(400).json({ error: 'branch required' });
    await db.query(
      `INSERT INTO unpaid_hide_settings (branch_code) VALUES ($1)
       ON CONFLICT (branch_code) DO NOTHING`, [code]
    );
    const r = await db.query('SELECT * FROM unpaid_hide_settings WHERE branch_code = $1', [code]);
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/settings', async (req, res) => {
  try {
    const db = req.branchPool || req.app.locals.pool;
    const code = branchOf(req);
    const enabled = req.body.enabled === true;
    const months = Math.max(1, Math.min(12, parseInt(req.body.monthsThreshold ?? req.body.months_threshold, 10) || 2));
    await db.query(
      `INSERT INTO unpaid_hide_settings (branch_code, enabled, months_threshold, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (branch_code) DO UPDATE
         SET enabled = EXCLUDED.enabled, months_threshold = EXCLUDED.months_threshold,
             updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [code, enabled, months, actorOf(req)]
    );
    await db.query(
      `INSERT INTO unpaid_hide_audit (branch_code, action, detail, actor) VALUES ($1,$2,$3,$4)`,
      [code, 'settings', `enabled=${enabled} months=${months}`, actorOf(req)]
    );
    res.json({ success: true, data: { enabled, monthsThreshold: months } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---- reasons --------------------------------------------------------------
router.get('/reasons', async (req, res) => {
  try {
    const db = req.branchPool || req.app.locals.pool;
    const code = branchOf(req);
    const status = req.query.status === 'history' ? 'all' : 'active';
    await expireReasons(db, code);
    const where = status === 'active' ? "AND status = 'active'" : '';
    const r = await db.query(
      `SELECT id, class_name, school_id, student_name, reason, created_by, created_at, expires_at, status
         FROM unpaid_hide_reasons WHERE branch_code = $1 ${where}
        ORDER BY status = 'active' DESC, created_at DESC`,
      [code]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/reasons', async (req, res) => {
  try {
    const db = req.branchPool || req.app.locals.pool;
    const code = branchOf(req);
    const students = Array.isArray(req.body.students) ? req.body.students : [];
    const reason = String(req.body.reason || '').trim();
    const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
    if (!students.length) return res.status(400).json({ error: 'Select at least one student' });
    if (!reason) return res.status(400).json({ error: 'Reason is required' });

    let added = 0;
    for (const st of students) {
      const name = String(st.studentName || st.student_name || st.name || '').trim();
      if (!name) continue;
      await db.query(
        `INSERT INTO unpaid_hide_reasons
           (branch_code, class_name, school_id, student_name, reason, created_by, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [code, String(st.className || st.class || ''), st.schoolId ? String(st.schoolId) : null,
         name, reason, actorOf(req), expiresAt]
      );
      added++;
    }
    await db.query(
      `INSERT INTO unpaid_hide_audit (branch_code, action, detail, actor) VALUES ($1,$2,$3,$4)`,
      [code, 'reason_add', `${added} student(s), expires=${expiresAt ? expiresAt.toISOString() : 'never'}`, actorOf(req)]
    );
    res.json({ success: true, added, expiresAt });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/reasons/:id', async (req, res) => {
  try {
    const db = req.branchPool || req.app.locals.pool;
    const code = branchOf(req);
    const r = await db.query(
      `DELETE FROM unpaid_hide_reasons WHERE id = $1 AND branch_code = $2 RETURNING student_name`,
      [parseInt(req.params.id, 10), code]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Reason not found' });
    await db.query(
      `INSERT INTO unpaid_hide_audit (branch_code, action, detail, actor) VALUES ($1,$2,$3,$4)`,
      [code, 'reason_delete', r.rows[0].student_name, actorOf(req)]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
