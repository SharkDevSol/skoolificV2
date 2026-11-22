const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// The Android admin app stores evaluation form definitions and the filled
// evaluations separately from the older web /api/evaluations module.
// Tables are created lazily per branch database.

const ensuredBranches = new Set();

async function ensureTables() {
  const branch = (pool.getBranchCode && pool.getBranchCode()) || 'default';
  if (ensuredBranches.has(branch)) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS teacher_evaluation_forms (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      fields JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_by VARCHAR(200),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS teacher_evaluation_submissions (
      id SERIAL PRIMARY KEY,
      form_id INTEGER REFERENCES teacher_evaluation_forms(id) ON DELETE SET NULL,
      form_name VARCHAR(200),
      teacher_id VARCHAR(100),
      teacher_name VARCHAR(200) NOT NULL,
      evaluation_date DATE DEFAULT CURRENT_DATE,
      note TEXT,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by VARCHAR(200),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_teacher_eval_submissions_form ON teacher_evaluation_submissions(form_id)'
  );
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_teacher_eval_submissions_teacher ON teacher_evaluation_submissions(teacher_name)'
  );
  ensuredBranches.add(branch);
}

function actor(req) {
  return (
    req.user?.name ||
    req.user?.username ||
    req.body?.createdBy ||
    'Admin'
  );
}

function normaliseDate(value) {
  const s = String(value || '');
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}

// ---------------------------------------------------------------- forms

router.get('/forms', async (req, res) => {
  try {
    await ensureTables();
    const r = await pool.query(
      `SELECT id, name, fields, created_by, created_at, updated_at
         FROM teacher_evaluation_forms
        ORDER BY id DESC`
    );
    res.json({ success: true, data: r.rows });
  } catch (e) {
    console.error('GET /api/teacher-evaluations/forms', e);
    res.status(500).json({ error: 'Failed to load evaluation forms', details: e.message });
  }
});

router.post('/forms', async (req, res) => {
  try {
    await ensureTables();
    const name = String(req.body?.name || '').trim();
    const fields = Array.isArray(req.body?.fields) ? req.body.fields : [];
    if (!name) return res.status(400).json({ error: 'Form name is required' });
    const r = await pool.query(
      `INSERT INTO teacher_evaluation_forms (name, fields, created_by)
       VALUES ($1, $2::jsonb, $3)
       RETURNING id, name, fields, created_by, created_at, updated_at`,
      [name, JSON.stringify(fields), actor(req)]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) {
    console.error('POST /api/teacher-evaluations/forms', e);
    res.status(500).json({ error: 'Failed to create evaluation form', details: e.message });
  }
});

router.put('/forms/:id', async (req, res) => {
  try {
    await ensureTables();
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid form id' });
    const name = String(req.body?.name || '').trim();
    const fields = Array.isArray(req.body?.fields) ? req.body.fields : [];
    if (!name) return res.status(400).json({ error: 'Form name is required' });
    const r = await pool.query(
      `UPDATE teacher_evaluation_forms
          SET name = $1, fields = $2::jsonb, updated_at = NOW()
        WHERE id = $3
        RETURNING id, name, fields, created_by, created_at, updated_at`,
      [name, JSON.stringify(fields), id]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Evaluation form not found' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) {
    console.error('PUT /api/teacher-evaluations/forms/:id', e);
    res.status(500).json({ error: 'Failed to update evaluation form', details: e.message });
  }
});

router.delete('/forms/:id', async (req, res) => {
  try {
    await ensureTables();
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid form id' });
    const r = await pool.query('DELETE FROM teacher_evaluation_forms WHERE id = $1 RETURNING id', [id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Evaluation form not found' });
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/teacher-evaluations/forms/:id', e);
    res.status(500).json({ error: 'Failed to delete evaluation form', details: e.message });
  }
});

// ---------------------------------------------------------- submissions

router.get('/submissions', async (req, res) => {
  try {
    await ensureTables();
    const r = await pool.query(
      `SELECT id, form_id, form_name, teacher_id, teacher_name,
              TO_CHAR(evaluation_date, 'YYYY-MM-DD') AS evaluation_date,
              note, data, created_by, created_at
         FROM teacher_evaluation_submissions
        ORDER BY id DESC`
    );
    res.json({ success: true, data: r.rows });
  } catch (e) {
    console.error('GET /api/teacher-evaluations/submissions', e);
    res.status(500).json({ error: 'Failed to load evaluations', details: e.message });
  }
});

router.post('/submissions', async (req, res) => {
  try {
    await ensureTables();
    const formId = parseInt(req.body?.formId, 10);
    const teacherName = String(req.body?.teacherName || '').trim();
    const teacherId = String(req.body?.teacherId || '');
    const note = String(req.body?.note || '');
    const data = req.body?.data && typeof req.body.data === 'object' ? req.body.data : {};
    const date = normaliseDate(req.body?.date);
    if (!teacherName) return res.status(400).json({ error: 'Teacher is required' });

    let formName = null;
    if (Number.isInteger(formId) && formId > 0) {
      const f = await pool.query('SELECT name FROM teacher_evaluation_forms WHERE id = $1', [formId]);
      if (!f.rowCount) return res.status(404).json({ error: 'Evaluation form not found' });
      formName = f.rows[0].name;
    }

    const r = await pool.query(
      `INSERT INTO teacher_evaluation_submissions
         (form_id, form_name, teacher_id, teacher_name, evaluation_date, note, data, created_by)
       VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), $6, $7::jsonb, $8)
       RETURNING id, form_id, form_name, teacher_id, teacher_name,
                 TO_CHAR(evaluation_date, 'YYYY-MM-DD') AS evaluation_date,
                 note, data, created_by, created_at`,
      [
        Number.isInteger(formId) && formId > 0 ? formId : null,
        formName,
        teacherId,
        teacherName,
        date,
        note,
        JSON.stringify(data),
        actor(req),
      ]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) {
    console.error('POST /api/teacher-evaluations/submissions', e);
    res.status(500).json({ error: 'Failed to save evaluation', details: e.message });
  }
});

module.exports = router;
