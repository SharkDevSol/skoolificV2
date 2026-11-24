const express = require('express');
const pool = require('../config/db');
const { authenticateWithBranch } = require('../middleware/branchAuth');

const router = express.Router();

const db = (req) => req.branchPool || pool;

// One KG term setting per branch database. Normal (non-KG) classes keep using
// subjects_of_school_schema.school_config.term_count.
async function ensureSettings(req) {
  const q = db(req);
  await q.query(`
    CREATE TABLE IF NOT EXISTS kg_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      term_count INTEGER NOT NULL DEFAULT 2,
      updated_by VARCHAR(200),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await q.query(`INSERT INTO kg_settings (id, term_count) VALUES (1, 2) ON CONFLICT (id) DO NOTHING`);
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
    const r = await db(req).query('SELECT term_count FROM kg_settings WHERE id = 1');
    res.json({ term_count: parseInt(r.rows[0]?.term_count, 10) || 2 });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load KG settings', details: e.message });
  }
});

router.put('/config', authenticateWithBranch, async (req, res) => {
  try {
    await ensureSettings(req);
    const termCount = parseInt(req.body?.termCount ?? req.body?.term_count, 10);
    if (![2, 3, 4].includes(termCount)) {
      return res.status(400).json({ error: 'KG term count must be 2, 3 or 4' });
    }
    const actor = req.user?.name || req.user?.username || 'admin';
    await db(req).query(
      `UPDATE kg_settings SET term_count = $1, updated_by = $2, updated_at = NOW() WHERE id = 1`,
      [termCount, String(actor)]
    );
    res.json({ success: true, term_count: termCount });
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
