// Teacher evaluation form builder + submissions.
// Supports the generic builder used by the admin app and the structured
// "Teaching Quality Monitoring" form (20 indicators, rating 1-5 + comment).
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateWithBranch } = require('../middleware/branchAuth');

const db = (req) => req.branchPool || pool;

const DEFAULT_GRADE_BANDS = [
  { label: 'Excellent', min: 90, max: 100 },
  { label: 'Very Good', min: 85, max: 89 },
  { label: 'Good', min: 70, max: 84 },
  { label: 'Needs Improvement', min: 60, max: 69 },
  { label: 'Unsatisfactory', min: 0, max: 59 },
];

const TQ_INDICATORS = [
  'Lesson plan is prepared and followed.',
  'Lesson objectives are clearly communicated to students.',
  'Teacher demonstrates strong subject knowledge and answers questions accurately.',
  'Teaching methods are appropriate, engaging, and suitable for the lesson.',
  'Students actively participate in classroom activities and discussions.',
  "Teacher asks effective questions that assess students' understanding.",
  'Teacher encourages critical thinking, creativity, and problem-solving.',
  'Teaching aids and technology are used effectively to support learning.',
  'Classroom is well managed, organized, and conducive to learning.',
  'Teacher manages lesson time effectively and completes planned activities.',
  'All students are included, encouraged, and supported during the lesson.',
  'Assessment is conducted throughout the lesson by the teacher.',
  'Teacher provides constructive feedback to improve student performance.',
  'Teacher maintains positive, respectful, and professional relationships with students.',
  'Lesson objectives are successfully achieved by the end of the lesson.',
  'The lesson aligns with the curriculum and annual teaching plan.',
  "Teacher checks students' prior knowledge before introducing new content.",
  'Instructions for learning activities are clear and easy to follow.',
  'Teacher promotes collaborative learning through pair or group work.',
  'Teacher summarizes the lesson and assigns appropriate follow-up or homework when necessary.',
];

function defaultTeachingFields(ratingMax = 5) {
  return TQ_INDICATORS.map((label, index) => ({
    no: index + 1,
    name: `indicator_${index + 1}`,
    label,
    type: 'indicator',
    rating_max: ratingMax,
    comment: true,
  }));
}

function normalizeRatingMax(value, fallback = 5) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 1 && n <= 20 ? n : fallback;
}

function normalizeBands(input) {
  if (!Array.isArray(input) || input.length === 0 || input.length > 20) return null;
  const bands = [];
  for (const raw of input) {
    const label = String(raw?.label ?? raw?.grade ?? '').trim();
    const min = Number(raw?.min);
    const max = Number(raw?.max);
    if (!label || label.length > 60) return null;
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    if (min < 0 || max > 100 || min > max) return null;
    bands.push({ label, min, max });
  }
  bands.sort((a, b) => b.min - a.min || b.max - a.max);
  return bands;
}

function packBands(value) {
  if (Array.isArray(value) && value.length) return value;
  return DEFAULT_GRADE_BANDS;
}

function labelForPercentage(percentage, bands) {
  if (!Number.isFinite(Number(percentage))) return null;
  const pct = Number(percentage);
  const sorted = [...packBands(bands)].sort((a, b) => Number(b.min) - Number(a.min));
  for (const band of sorted) {
    const min = Number(band.min);
    const max = Number(band.max);
    if (pct >= min && pct <= max) return band.label;
  }
  // Ranges may have gaps (e.g. 85-89 then 90-100). Pick the band whose
  // minimum was reached most recently.
  const reached = sorted.filter(b => pct >= Number(b.min));
  return reached.length ? reached[reached.length - 1].label : null;
}

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
  // New columns (safe for existing installations)
  for (const col of [
    `form_type VARCHAR(40) NOT NULL DEFAULT 'custom'`,
    `rating_max INTEGER NOT NULL DEFAULT 5`,
    `settings JSONB NOT NULL DEFAULT '{}'::jsonb`,
  ]) {
    await q.query(`ALTER TABLE teacher_evaluation_forms ADD COLUMN IF NOT EXISTS ${col}`);
  }
  for (const col of [
    `subject VARCHAR(200)`,
    `subject_class VARCHAR(200)`,
    `total_score NUMERIC(10,2)`,
    `max_score NUMERIC(10,2)`,
    `percentage NUMERIC(6,2)`,
    `rating_label VARCHAR(120)`,
  ]) {
    await q.query(`ALTER TABLE teacher_evaluation_submissions ADD COLUMN IF NOT EXISTS ${col}`);
  }
  await q.query(`
    CREATE TABLE IF NOT EXISTS teacher_evaluation_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      grade_bands JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_by VARCHAR(200),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await q.query(`INSERT INTO teacher_evaluation_settings (id, grade_bands) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING`,
    [JSON.stringify(DEFAULT_GRADE_BANDS)]);
  await q.query(`UPDATE teacher_evaluation_settings SET grade_bands = $1::jsonb WHERE id = 1 AND (grade_bands IS NULL OR grade_bands = '[]'::jsonb)`,
    [JSON.stringify(DEFAULT_GRADE_BANDS)]);
}

async function ensureDefaultTeachingForm(req) {
  const q = db(req);
  const existing = await q.query(
    `SELECT id FROM teacher_evaluation_forms WHERE form_type = 'teaching_quality' ORDER BY id LIMIT 1`
  );
  if (existing.rows.length > 0) return existing.rows[0];
  const r = await q.query(
    `INSERT INTO teacher_evaluation_forms (name, fields, created_by, form_type, rating_max, settings)
     VALUES ($1, $2, $3, 'teaching_quality', 5, $4) RETURNING id`,
    [
      'Teaching Quality Monitoring',
      JSON.stringify(defaultTeachingFields(5)),
      'system',
      JSON.stringify({ comments: true }),
    ]
  );
  return r.rows[0];
}

async function getBands(req) {
  const r = await db(req).query('SELECT grade_bands FROM teacher_evaluation_settings WHERE id = 1');
  return packBands(r.rows[0]?.grade_bands);
}

function computeScore(form, data) {
  const fields = Array.isArray(form?.fields) ? form.fields : [];
  const indicators = form?.form_type === 'teaching_quality'
    ? fields
    : fields.filter(f => f?.type === 'indicator');
  if (!indicators.length) {
    return { total: null, max: null, percentage: null };
  }
  let total = 0;
  let max = 0;
  for (let i = 0; i < indicators.length; i++) {
    const f = indicators[i];
    const key = f.name || f.label || `indicator_${i + 1}`;
    const ratingMax = normalizeRatingMax(f.rating_max ?? form.rating_max, 5);
    const raw = Number(data?.[key]);
    total += Math.max(0, Math.min(Number.isFinite(raw) ? raw : 0, ratingMax));
    max += ratingMax;
  }
  return {
    total: Math.round(total * 100) / 100,
    max,
    percentage: max > 0 ? Math.round((total / max) * 10000) / 100 : 0,
  };
}

router.get('/forms', authenticateWithBranch, async (req, res) => {
  try {
    await ensureTables(req);
    await ensureDefaultTeachingForm(req);
    const r = await db(req).query('SELECT * FROM teacher_evaluation_forms ORDER BY created_at DESC');
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/forms', authenticateWithBranch, async (req, res) => {
  try {
    await ensureTables(req);
    const { name, fields, formType, ratingMax, settings } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const type = String(formType || 'custom');
    const rmax = normalizeRatingMax(ratingMax, 5);
    let formFields = Array.isArray(fields) ? fields : [];
    if (type === 'teaching_quality' && formFields.length === 0) {
      formFields = defaultTeachingFields(rmax);
    }
    const r = await db(req).query(
      `INSERT INTO teacher_evaluation_forms (name, fields, created_by, form_type, rating_max, settings)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, JSON.stringify(formFields), req.user?.username || 'admin', type, rmax, JSON.stringify(settings || {})]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/forms/:id', authenticateWithBranch, async (req, res) => {
  try {
    await ensureTables(req);
    const { name, fields, formType, ratingMax, settings } = req.body;
    const current = await db(req).query('SELECT * FROM teacher_evaluation_forms WHERE id=$1', [req.params.id]);
    if (!current.rows.length) return res.status(404).json({ error: 'Form not found' });
    const existing = current.rows[0];
    const r = await db(req).query(
      `UPDATE teacher_evaluation_forms
          SET name=$1, fields=$2, form_type=$3, rating_max=$4, settings=$5, updated_at=NOW()
        WHERE id=$6 RETURNING *`,
      [
        name ?? existing.name,
        JSON.stringify(Array.isArray(fields) ? fields : existing.fields),
        formType ?? existing.form_type ?? 'custom',
        normalizeRatingMax(ratingMax ?? existing.rating_max, 5),
        JSON.stringify(settings ?? existing.settings ?? {}),
        req.params.id,
      ]
    );
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

// Teachers and the subjects/classes assigned to them in Create Mark List.
router.get('/teacher-options', authenticateWithBranch, async (req, res) => {
  try {
    await ensureTables(req);
    const r = await db(req).query(
      `SELECT teacher_name, subject_class
         FROM subjects_of_school_schema.teachers_subjects
        WHERE teacher_name IS NOT NULL AND TRIM(teacher_name) <> ''
        ORDER BY teacher_name, subject_class`
    );
    const byTeacher = new Map();
    for (const row of r.rows) {
      const name = String(row.teacher_name).trim();
      const raw = String(row.subject_class || '').trim();
      if (!name) continue;
      const parts = raw.split(/\s+Class\s+/i);
      const subject = parts[0]?.trim() || raw;
      const className = parts[1]?.trim() || '';
      if (!byTeacher.has(name)) byTeacher.set(name, { teacherName: name, subjects: [] });
      const entry = byTeacher.get(name);
      if (raw && !entry.subjects.some(s => s.subjectClass === raw)) {
        entry.subjects.push({ subject, className, subjectClass: raw });
      }
    }
    res.json({ success: true, data: [...byTeacher.values()] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/settings', authenticateWithBranch, async (req, res) => {
  try {
    await ensureTables(req);
    res.json({ success: true, data: { grade_bands: await getBands(req) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/settings', authenticateWithBranch, async (req, res) => {
  try {
    await ensureTables(req);
    const bands = normalizeBands(req.body?.gradeBands ?? req.body?.grade_bands);
    if (!bands) {
      return res.status(400).json({ error: 'Grade bands need a label and 0-100 min/max with min <= max.' });
    }
    await db(req).query(
      `UPDATE teacher_evaluation_settings SET grade_bands=$1::jsonb, updated_by=$2, updated_at=NOW() WHERE id=1`,
      [JSON.stringify(bands), req.user?.username || 'admin']
    );
    res.json({ success: true, data: { grade_bands: bands } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/submissions', authenticateWithBranch, async (req, res) => {
  try {
    await ensureTables(req);
    const { formId, teacherId } = req.query;
    let sql = `SELECT s.*, f.name AS form_name, f.form_type
               FROM teacher_evaluation_submissions s
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
    const {
      formId, teacherId, teacherName, subject, subjectClass,
      date, note, data,
    } = req.body;
    if (!formId || !teacherName) return res.status(400).json({ error: 'formId and teacherName are required' });

    const formRes = await db(req).query('SELECT * FROM teacher_evaluation_forms WHERE id=$1', [formId]);
    if (!formRes.rows.length) return res.status(404).json({ error: 'Form not found' });
    const form = formRes.rows[0];

    const score = computeScore(form, data || {});
    const bands = await getBands(req);
    const ratingLabel = score.percentage !== null
      ? labelForPercentage(score.percentage, bands)
      : null;

    const r = await db(req).query(
      `INSERT INTO teacher_evaluation_submissions
        (form_id, teacher_id, teacher_name, evaluation_date, note, data, created_by,
         subject, subject_class, total_score, max_score, percentage, rating_label)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        formId, teacherId || null, teacherName, date || null, note || null,
        JSON.stringify(data || {}), req.user?.username || 'admin',
        subject || null, subjectClass || null,
        score.total, score.max, score.percentage, ratingLabel,
      ]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
