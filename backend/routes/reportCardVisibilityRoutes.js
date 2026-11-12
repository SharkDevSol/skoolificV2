// routes/reportCardVisibilityRoutes.js
// Per-student / per-term report card visibility.
//
// Default behaviour is unchanged: every active student sees all terms.
// The school can hide a student's report card or restrict which terms are
// shown. The student app reads GET /:className/:schoolId; the admin report
// card page reads/writes GET/PUT /:className.
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateWithBranch, validateBranchCode } = require('../middleware/branchAuth');

const db = (req) => req.branchPool || pool;

async function ensureTable(poolLike) {
  await poolLike.query(`
    CREATE TABLE IF NOT EXISTS public.report_card_visibility (
      id SERIAL PRIMARY KEY,
      class_name VARCHAR(100) NOT NULL,
      school_id VARCHAR(50) NOT NULL,
      is_visible BOOLEAN NOT NULL DEFAULT TRUE,
      visible_terms INTEGER[],
      updated_by VARCHAR(100),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT report_card_visibility_unique UNIQUE (class_name, school_id)
    )
  `);
}

function normaliseTerms(value) {
  if (!Array.isArray(value)) return null;
  const terms = value
    .map((v) => parseInt(v, 10))
    .filter((v) => Number.isFinite(v) && v > 0);
  return terms.length > 0 ? Array.from(new Set(terms)).sort((a, b) => a - b) : null;
}

// GET /api/report-card-visibility/:className — all settings for one class
router.get('/:className', validateBranchCode, async (req, res) => {
  try {
    const query = db(req);
    await ensureTable(query);
    const result = await query.query(
      `SELECT school_id, is_visible, visible_terms, updated_at
         FROM public.report_card_visibility
        WHERE LOWER(class_name) = LOWER($1)
        ORDER BY school_id`,
      [req.params.className]
    );
    res.json({
      success: true,
      settings: result.rows.map((r) => ({
        schoolId: String(r.school_id),
        visible: r.is_visible !== false,
        terms: r.visible_terms && r.visible_terms.length ? r.visible_terms : null,
        updatedAt: r.updated_at,
      })),
    });
  } catch (error) {
    console.error('Report-card visibility read error:', error);
    res.status(500).json({ success: false, error: 'Failed to load report card visibility' });
  }
});

// PUT /api/report-card-visibility/:className — bulk save
router.put('/:className', authenticateWithBranch, async (req, res) => {
  const settings = Array.isArray(req.body && req.body.settings) ? req.body.settings : null;
  if (!settings) {
    return res.status(400).json({ success: false, error: 'settings array is required' });
  }
  const className = String(req.params.className || '').trim();
  if (!className) {
    return res.status(400).json({ success: false, error: 'className is required' });
  }

  const query = db(req);
  const client = await query.connect();
  try {
    await ensureTable(client);
    await client.query('BEGIN');
    const updatedBy = req.user?.username || req.user?.name || 'admin';
    for (const item of settings) {
      const schoolId = String(item.schoolId ?? item.school_id ?? '').trim();
      if (!schoolId) continue;
      const visible = item.visible !== false;
      const terms = normaliseTerms(item.terms ?? item.visibleTerms);
      await client.query(
        `INSERT INTO public.report_card_visibility
           (class_name, school_id, is_visible, visible_terms, updated_by, updated_at)
         VALUES (LOWER($1), $2, $3, $4::int[], $5, CURRENT_TIMESTAMP)
         ON CONFLICT (class_name, school_id)
         DO UPDATE SET
           is_visible = EXCLUDED.is_visible,
           visible_terms = EXCLUDED.visible_terms,
           updated_by = EXCLUDED.updated_by,
           updated_at = CURRENT_TIMESTAMP`,
        [className, schoolId, visible, terms, updatedBy]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Report card visibility saved' });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Report-card visibility save error:', error);
    res.status(500).json({ success: false, error: 'Failed to save report card visibility' });
  } finally {
    client.release();
  }
});

// GET /api/report-card-visibility/:className/:schoolId — one student
router.get('/:className/:schoolId', validateBranchCode, async (req, res) => {
  try {
    const query = db(req);
    await ensureTable(query);
    const result = await query.query(
      `SELECT is_visible, visible_terms
         FROM public.report_card_visibility
        WHERE LOWER(class_name) = LOWER($1) AND school_id::text = $2
        LIMIT 1`,
      [req.params.className, String(req.params.schoolId)]
    );
    if (result.rows.length === 0) {
      return res.json({ success: true, visible: true, terms: null });
    }
    const row = result.rows[0];
    res.json({
      success: true,
      visible: row.is_visible !== false,
      terms: row.visible_terms && row.visible_terms.length ? row.visible_terms : null,
    });
  } catch (error) {
    console.error('Report-card visibility read error:', error);
    res.status(500).json({ success: false, error: 'Failed to load report card visibility' });
  }
});

module.exports = router;
