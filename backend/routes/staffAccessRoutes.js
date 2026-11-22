const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { authenticateWithBranch } = require('../middleware/branchAuth');

const db = (req) => req.branchPool || pool;

async function ensure(req) {
  const q = db(req);
  await q.query(`CREATE TABLE IF NOT EXISTS staff_app_access (
    global_staff_id INTEGER PRIMARY KEY,
    is_active BOOLEAN DEFAULT TRUE,
    permissions JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

router.get('/', authenticateWithBranch, async (req, res) => {
  try {
    await ensure(req);
    const r = await db(req).query(`
      SELECT su.id, su.global_staff_id, su.username, su.password_plain, su.staff_type, su.class_name,
             COALESCE(a.is_active, TRUE) AS is_active,
             COALESCE(a.permissions, '[]'::jsonb) AS permissions,
             a.updated_at
      FROM staff_users su
      JOIN staff_app_access a ON a.global_staff_id = su.global_staff_id
      WHERE COALESCE(a.is_active, TRUE) = TRUE
        AND jsonb_array_length(COALESCE(a.permissions, '[]'::jsonb)) > 0
      ORDER BY su.staff_type, su.username`);
    res.json({ success: true, data: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/credentials', authenticateWithBranch, async (req, res) => {
  try {
    const r = await db(req).query(`
      SELECT id, global_staff_id, username, password_plain, staff_type, class_name
      FROM staff_users
      ORDER BY staff_type, username`);
    res.json({ success: true, data: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:globalStaffId', authenticateWithBranch, async (req, res) => {
  try {
    await ensure(req);
    const sid = parseInt(req.params.globalStaffId, 10);
    if (!sid) return res.status(400).json({ error: 'globalStaffId is required' });
    const { is_active, permissions, username, password } = req.body;
    await db(req).query(
      `INSERT INTO staff_app_access (global_staff_id, is_active, permissions, updated_at)
       VALUES ($1,$2,$3,NOW())
       ON CONFLICT (global_staff_id) DO UPDATE SET
         is_active = EXCLUDED.is_active,
         permissions = EXCLUDED.permissions,
         updated_at = NOW()`,
      [sid, is_active !== false, JSON.stringify(Array.isArray(permissions) ? permissions : [])]
    );
    if (username && String(username).trim()) {
      const check = await db(req).query('SELECT id FROM staff_users WHERE username=$1 AND global_staff_id<>$2', [String(username).trim(), sid]);
      if (check.rows.length) return res.status(409).json({ error: 'Username already exists' });
      await db(req).query('UPDATE staff_users SET username=$1 WHERE global_staff_id=$2', [String(username).trim(), sid]);
    }
    if (password && String(password).length >= 6) {
      const hash = await bcrypt.hash(String(password), 10);
      await db(req).query('UPDATE staff_users SET password_hash=$1, password_plain=$2 WHERE global_staff_id=$3', [hash, String(password), sid]);
    }
    res.json({ success: true, message: 'Staff access updated' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:globalStaffId', authenticateWithBranch, async (req, res) => {
  try {
    await ensure(req);
    const sid = parseInt(req.params.globalStaffId, 10);
    if (!sid) return res.status(400).json({ error: 'globalStaffId is required' });
    await db(req).query('DELETE FROM staff_app_access WHERE global_staff_id = $1', [sid]);
    res.json({ success: true, message: 'Staff access removed' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
