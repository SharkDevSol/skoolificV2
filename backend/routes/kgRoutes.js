const express = require('express');
const pool = require('../config/db');
const { authenticateWithBranch } = require('../middleware/branchAuth');

const router = express.Router();

const db = (req) => req.branchPool || pool;

// Default KG grading scheme (matches the school's KG report card request)
const DEFAULT_GRADE_BANDS = [
  { grade: 'A', min: 95, max: 100 },
  { grade: 'B', min: 85, max: 94 },
  { grade: 'C', min: 0, max: 84 },
];

const TIME_COLUMNS = [
  'check_in_start_time',
  'check_in_end_time',
  'late_threshold_time',
  'absent_marking_time',
];

const RANK_DISPLAY_MODES = ['grade', 'rank', 'both'];

function hhmm(value) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  const m = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const sec = Number(m[3] || 0);
  if (h > 23 || min > 59 || sec > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function toStoreTime(value) {
  const t = hhmm(value);
  return t ? `${t}:00` : null;
}

function normalizeGradeBands(input) {
  if (!Array.isArray(input) || input.length === 0 || input.length > 20) return null;
  const bands = [];
  for (const raw of input) {
    const grade = String(raw?.grade ?? raw?.letter ?? '').trim();
    const min = Number(raw?.min);
    const max = Number(raw?.max);
    if (!grade || grade.length > 12) return null;
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    if (min < 0 || max > 100 || min > max) return null;
    bands.push({ grade, min, max });
  }
  // Highest mark first so lookup can stop at the first match
  bands.sort((a, b) => b.min - a.min || b.max - a.max);
  return bands;
}

function packConfig(row) {
  const source = row || {};
  const bands = Array.isArray(source.grade_bands) && source.grade_bands.length
    ? source.grade_bands
    : DEFAULT_GRADE_BANDS;
  return {
    term_count: parseInt(source.term_count, 10) || 2,
    check_in_start_time: hhmm(source.check_in_start_time) || '07:00',
    check_in_end_time: hhmm(source.check_in_end_time) || '08:30',
    late_threshold_time: hhmm(source.late_threshold_time) || '08:00',
    absent_marking_time: hhmm(source.absent_marking_time) || '09:00',
    pass_mark: Number.isFinite(Number(source.pass_mark)) ? Number(source.pass_mark) : 50,
    grade_bands: bands,
    rank_display: RANK_DISPLAY_MODES.includes(source.rank_display) ? source.rank_display : 'grade',
  };
}

async function readSettings(req) {
  const r = await db(req).query('SELECT * FROM kg_settings WHERE id = 1');
  return packConfig(r.rows[0]);
}

/**
 * When the KG pass/fail point changes, keep every KG mark-list form and every
 * stored Pass/Fail status in sync, so the Mark List and Report Card agree.
 */
async function syncPassMark(req, passMark) {
  const q = db(req);
  let updatedForms = 0;
  let updatedTables = 0;
  let updatedRows = 0;
  try {
    const schemas = await q.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'subject\\_%\\_schema'`
    );
    for (const s of schemas.rows) {
      let classes;
      try {
        classes = await q.query(
          `SELECT DISTINCT class_name FROM "${s.schema_name}".form_config WHERE class_name ILIKE 'KG%'`
        );
      } catch { continue; }

      for (const row of classes.rows) {
        const cls = String(row.class_name || '');
        if (!cls) continue;

        try {
          const f = await q.query(
            `UPDATE "${s.schema_name}".form_config SET pass_threshold = $1 WHERE class_name = $2`,
            [passMark, cls]
          );
          updatedForms += f.rowCount || 0;
        } catch { /* form_config may not have the column in very old schemas */ }

        let tables;
        try {
          tables = await q.query(
            `SELECT table_name FROM information_schema.tables
              WHERE table_schema = $1 AND table_name LIKE $2`,
            [s.schema_name, `${cls.toLowerCase()}_term_%`]
          );
        } catch { continue; }

        for (const t of tables.rows) {
          try {
            const r = await q.query(
              `UPDATE "${s.schema_name}"."${t.table_name}"
                  SET pass_status = CASE WHEN COALESCE(total, 0) >= $1 THEN 'Pass' ELSE 'Fail' END`,
              [passMark]
            );
            updatedTables++;
            updatedRows += r.rowCount || 0;
          } catch { /* skip tables without pass_status */ }
        }
      }
    }
  } catch (e) {
    console.warn('[KG Settings] Pass-mark sync failed (non-blocking):', e.message);
  }
  console.log(`[KG Settings] Pass mark ${passMark}% synced: forms=${updatedForms} tables=${updatedTables} rows=${updatedRows}`);
}

// One KG settings row per branch database.
async function ensureSettings(req) {
  const q = db(req);
  await q.query(`
    CREATE TABLE IF NOT EXISTS kg_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      term_count INTEGER NOT NULL DEFAULT 2,
      check_in_start_time TIME DEFAULT '07:00:00',
      check_in_end_time TIME DEFAULT '08:30:00',
      late_threshold_time TIME DEFAULT '08:00:00',
      absent_marking_time TIME DEFAULT '09:00:00',
      pass_mark NUMERIC(5,2) NOT NULL DEFAULT 50,
      grade_bands JSONB,
      rank_display VARCHAR(10) NOT NULL DEFAULT 'grade',
      updated_by VARCHAR(200),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // Upgrade older kg_settings tables that only had term_count
  for (const col of [
    `check_in_start_time TIME DEFAULT '07:00:00'`,
    `check_in_end_time TIME DEFAULT '08:30:00'`,
    `late_threshold_time TIME DEFAULT '08:00:00'`,
    `absent_marking_time TIME DEFAULT '09:00:00'`,
    `pass_mark NUMERIC(5,2) NOT NULL DEFAULT 50`,
    `grade_bands JSONB`,
    `rank_display VARCHAR(10) NOT NULL DEFAULT 'grade'`,
  ]) {
    await q.query(`ALTER TABLE kg_settings ADD COLUMN IF NOT EXISTS ${col}`);
  }
  await q.query(`INSERT INTO kg_settings (id, term_count) VALUES (1, 2) ON CONFLICT (id) DO NOTHING`);
  await q.query(
    `UPDATE kg_settings SET grade_bands = $1::jsonb WHERE id = 1 AND (grade_bands IS NULL OR grade_bands = '[]'::jsonb)`,
    [JSON.stringify(DEFAULT_GRADE_BANDS)]
  );
}

function kgClassNames(classNames, classConfigs) {
  const out = [];
  if (classConfigs && typeof classConfigs === 'object') {
    for (const [name, cfg] of Object.entries(classConfigs)) {
      if (cfg && cfg.isKG === true) out.push(name);
    }
  }
  if (!out.length) {
    for (const name of Array.isArray(classNames) ? classNames : []) {
      if (/^KG/i.test(String(name))) out.push(String(name));
    }
  }
  return [...new Set(out)].sort((a, b) => a.localeCompare(b));
}

router.get('/config', authenticateWithBranch, async (req, res) => {
  try {
    await ensureSettings(req);
    res.json(await readSettings(req));
  } catch (e) {
    res.status(500).json({ error: 'Failed to load KG settings', details: e.message });
  }
});

router.put('/config', authenticateWithBranch, async (req, res) => {
  try {
    await ensureSettings(req);

    const updates = [];
    const values = [];
    const push = (sql, value) => {
      values.push(value);
      updates.push(sql.replace('$?', `$${values.length}`));
    };

    const rawTermCount = req.body?.termCount ?? req.body?.term_count;
    if (rawTermCount !== undefined && rawTermCount !== null && rawTermCount !== '') {
      const termCount = parseInt(rawTermCount, 10);
      if (![2, 3, 4].includes(termCount)) {
        return res.status(400).json({ error: 'KG term count must be 2, 3 or 4' });
      }
      push('term_count = $?', termCount);
    }

    // Time settings (accepts either flat body fields or body.attendance)
    const attendance = req.body?.attendance && typeof req.body.attendance === 'object' ? req.body.attendance : req.body || {};
    for (const field of TIME_COLUMNS) {
      if (attendance[field] === undefined) continue;
      const stored = toStoreTime(attendance[field]);
      if (!stored) {
        return res.status(400).json({ error: `Invalid time for ${field}. Use HH:MM (24-hour).` });
      }
      push(`${field} = $?::time`, stored);
    }

    const rawBands = req.body?.gradeBands ?? req.body?.grade_bands;
    if (rawBands !== undefined) {
      const bands = normalizeGradeBands(rawBands);
      if (!bands) {
        return res.status(400).json({
          error: 'Invalid grade bands. Each band needs a grade letter and 0–100 min/max with min ≤ max.',
        });
      }
      push('grade_bands = $?::jsonb', JSON.stringify(bands));
    }

    let newPassMark = null;
    const rawPassMark = req.body?.passMark ?? req.body?.pass_mark;
    if (rawPassMark !== undefined && rawPassMark !== null && rawPassMark !== '') {
      const passMark = Number(rawPassMark);
      if (!Number.isFinite(passMark) || passMark < 0 || passMark > 100) {
        return res.status(400).json({ error: 'Pass mark must be a number between 0 and 100.' });
      }
      newPassMark = Math.round(passMark * 100) / 100;
      push('pass_mark = $?', newPassMark);
    }

    const rawRankDisplay = req.body?.rankDisplay ?? req.body?.rank_display;
    if (rawRankDisplay !== undefined) {
      const mode = String(rawRankDisplay).toLowerCase();
      if (!RANK_DISPLAY_MODES.includes(mode)) {
        return res.status(400).json({ error: 'rank_display must be grade, rank or both' });
      }
      push('rank_display = $?', mode);
    }

    if (!updates.length) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const actor = req.user?.name || req.user?.username || 'admin';
    values.push(String(actor));
    updates.push(`updated_by = $${values.length}`);
    updates.push('updated_at = NOW()');

    await db(req).query(`UPDATE kg_settings SET ${updates.join(', ')} WHERE id = 1`, values);

    // Keep mark-list form thresholds and stored Pass/Fail statuses aligned
    if (newPassMark !== null) {
      await syncPassMark(req, newPassMark);
    }

    res.json({ success: true, ...(await readSettings(req)) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save KG settings', details: e.message });
  }
});

router.get('/classes', authenticateWithBranch, async (req, res) => {
  try {
    await ensureSettings(req);
    const q = db(req);
    const [cfg, settings] = await Promise.all([
      q.query('SELECT class_names, class_configs FROM school_schema_points.classes WHERE id = 1'),
      q.query('SELECT term_count FROM kg_settings WHERE id = 1'),
    ]);
    const row = cfg.rows[0] || {};
    const classes = kgClassNames(row.class_names, row.class_configs);
    res.json({
      classes,
      term_count: parseInt(settings.rows[0]?.term_count, 10) || 2,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load KG classes', details: e.message });
  }
});

module.exports = router;
