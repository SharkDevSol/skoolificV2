// Teacher evaluation form builder + submissions.
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateWithBranch } = require('../middleware/branchAuth');

const db = (req) => req.branchPool || pool;

async function ensureTables(req) {
  const q = db(req);
  await q.query(`
    CREATE TABLE IF NOT EXISTS teacher_evaluation_forms (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      fields JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_by VARCHAR(200),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await q.query(`
    CREATE TABLE IF NOT EXISTS teacher_evaluation_submissions (
      id SERIAL PRIMARY KEY,
      form_id INTEGER REFERENCES teacher_evaluation_forms(id) ON DELETE CASCADE,
      teacher_id VARCHAR(100),
      teacher_name VARCHAR(200),
      evaluation_date VARCHAR(50),
      note TEXT,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by VARCHAR(200),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

router.get('/forms', authenticateWithBranch, async (req, res) => {
  try {
    await ensureTables(req);
    const r = await db(req).query('SELECT * FROM teacher_evaluation_forms ORDER BY created_at DESC');
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/forms', authenticateWithBranch, async (req, res) => {
  try {
    await ensureTables(req);
    const { name, fields } = req.body;
    if (!name || !Array.isArray(fields)) return res.status(400).json({ error: 'name and fields are required' });
    const r = await db(req).query(
      `INSERT INTO teacher_evaluation_forms (name, fields, created_by) VALUES ($1,$2,$3) RETURNING *`,
      [name, JSON.stringify(fields), req.user?.username || 'admin']
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/forms/:id', authenticateWithBranch, async (req, res) => {
  try {
    await ensureTables(req);
    const { name, fields } = req.body;
    const r = await db(req).query(
      `UPDATE teacher_evaluation_forms SET name=$1, fields=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
      [name, JSON.stringify(fields || []), req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Form not found' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/forms/:id', authenticateWithBranch, async (req, res) => {
  try {
    await ensureTables(req);
    await db(req).query('DELETE FROM teacher_evaluation_forms WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/submissions', authenticateWithBranch, async (req, res) => {
  try {
    await ensureTables(req);
    const { formId, teacherId } = req.query;
    let sql = `SELECT s.*, f.name AS form_name FROM teacher_evaluation_submissions s
               LEFT JOIN teacher_evaluation_forms f ON f.id = s.form_id WHERE 1=1`;
    const params = [];
    if (formId) { params.push(formId); sql += ` AND s.form_id = $${params.length}`; }
    if (teacherId) { params.push(teacherId); sql += ` AND s.teacher_id = $${params.length}`; }
    sql += ' ORDER BY s.created_at DESC';
    const r = await db(req).query(sql, params);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/submissions', authenticateWithBranch, async (req, res) => {
  try {
    await ensureTables(req);
    const { formId, teacherId, teacherName, date, note, data } = req.body;
    if (!formId || !teacherName) return res.status(400).json({ error: 'formId and teacherName are required' });
    const r = await db(req).query(
      `INSERT INTO teacher_evaluation_submissions
        (form_id, teacher_id, teacher_name, evaluation_date, note, data, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [formId, teacherId || null, teacherName, date || null, note || null, JSON.stringify(data || {}), req.user?.username || 'admin']
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
