const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;
const { getEndpointPath, API_ENDPOINTS } = require('../config/api.config');
require('dotenv').config();

const { authenticateWithBranch, validateBranchCode } = require('../middleware/branchAuth');
const { sanitizeInputs } = require('../middleware/inputValidation');

router.use(sanitizeInputs);
router.use(authenticateWithBranch);

// Multer setup
const uploadDir = path.join(__dirname, '../uploads');
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try { await fs.mkdir(uploadDir, { recursive: true }); cb(null, uploadDir); }
    catch (e) { cb(e); }
  },
  filename: (req, file, cb) => {
    cb(null, `fault-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|pdf/.test(path.extname(file.originalname).toLowerCase());
    ok ? cb(null, true) : cb(new Error('Only images and PDFs allowed'));
  },
}).single('attachment');

// Initialize staff faults schema
const initStaffFaultsSchema = async () => {
  try {
    await pool.query('CREATE SCHEMA IF NOT EXISTS staff_faults');
    console.log('staff_faults schema ready');
  } catch (e) {
    console.error('staff_faults schema init error:', e);
  }
};
initStaffFaultsSchema();

// Helper: sanitize staff type to schema name
const toSchema = (staffType) =>
  `staff_${staffType.replace(/\s+/g, '_').toLowerCase()}`;

// GET /staff-faults/staff-types  — list all staff types (schemas)
router.get('/staff-types', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT staff_type FROM staff_users ORDER BY staff_type
    `);
    res.json(rows.map(r => r.staff_type));
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch staff types', details: e.message });
  }
});

// GET /staff-faults/departments/:staffType  — list class/department tables for a staff type
router.get('/departments/:staffType', async (req, res) => {
  const schema = toSchema(req.params.staffType);
  try {
    const { rows } = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = $1 AND table_name <> 'staff_counter'
      ORDER BY table_name
    `, [schema]);
    res.json(rows.map(r => r.table_name));
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch departments', details: e.message });
  }
});

// GET /staff-faults/staff/:staffType/:department  — list staff in a department
router.get('/staff/:staffType/:department', async (req, res) => {
  const schema = toSchema(req.params.staffType);
  const dept = req.params.department.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  try {
    const { rows } = await pool.query(`
      SELECT global_staff_id, staff_id, name
      FROM "${schema}"."${dept}"
      WHERE is_active = TRUE OR is_active IS NULL
      ORDER BY LOWER(name)
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch staff', details: e.message });
  }
});

// GET /staff-faults/faults/:staffType/:department  — get faults for a department
router.get('/faults/:staffType/:department', async (req, res) => {
  const dept = req.params.department.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  if (!/^[a-zA-Z0-9_]+$/.test(dept))
    return res.status(400).json({ error: 'Invalid department name' });

  try {
    const exists = await pool.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'staff_faults' AND table_name = $1
    `, [dept]);
    if (exists.rows.length === 0) return res.json([]);

    const { rows } = await pool.query(`
      SELECT id, global_staff_id, staff_name, department, date, type, level,
             description, reported_by, action_taken, attachment
      FROM staff_faults."${dept}"
      ORDER BY date DESC, id DESC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch faults', details: e.message });
  }
});

// POST /staff-faults/add-fault  — report a new staff fault
router.post('/add-fault', upload, async (req, res) => {
  const { staffType, department, staff_name, global_staff_id, fault_type, fault_level, description, reported_by } = req.body;
  const attachment = req.file ? req.file.filename : null;
  const date = new Date().toISOString().split('T')[0];

  if (!staffType || !department || !staff_name || !fault_type || !description || !reported_by)
    return res.status(400).json({ error: 'staffType, department, staff_name, fault_type, description and reported_by are required' });

  const dept = department.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  if (!/^[a-zA-Z0-9_]+$/.test(dept))
    return res.status(400).json({ error: 'Invalid department name' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure faults table exists for this department
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff_faults."${dept}" (
        id SERIAL PRIMARY KEY,
        global_staff_id INTEGER,
        staff_name VARCHAR(150) NOT NULL,
        department VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        type VARCHAR(100) NOT NULL,
        level VARCHAR(50) NOT NULL DEFAULT 'Minor',
        description TEXT NOT NULL,
        reported_by VARCHAR(150) NOT NULL,
        action_taken VARCHAR(255),
        attachment VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const { rows } = await client.query(`
      INSERT INTO staff_faults."${dept}"
        (global_staff_id, staff_name, department, date, type, level, description, reported_by, attachment)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [global_staff_id || null, staff_name, department, date, fault_type, fault_level || 'Minor', description, reported_by, attachment]);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Staff fault reported successfully', faultId: rows[0].id });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Add staff fault error:', e);
    res.status(500).json({ error: 'Failed to add fault', details: e.message });
  } finally {
    client.release();
  }
});

// DELETE /staff-faults/delete-fault/:department/:faultId
router.delete('/delete-fault/:department/:faultId', async (req, res) => {
  const dept = req.params.department.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  const { faultId } = req.params;
  if (!/^[a-zA-Z0-9_]+$/.test(dept))
    return res.status(400).json({ error: 'Invalid department name' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`SELECT attachment FROM staff_faults."${dept}" WHERE id = $1`, [faultId]);
    if (rows.length === 0) throw new Error('Fault not found');

    if (rows[0].attachment) {
      try { await fs.unlink(path.join(uploadDir, rows[0].attachment)); } catch (_) {}
    }

    await client.query(`DELETE FROM staff_faults."${dept}" WHERE id = $1`, [faultId]);
    await client.query('COMMIT');
    res.json({ message: 'Fault deleted successfully' });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to delete fault', details: e.message });
  } finally {
    client.release();
  }
});

// GET /staff-faults/summary  — overall stats for admin dashboard
router.get('/summary', async (req, res) => {
  try {
    const { rows: tables } = await pool.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'staff_faults'
    `);

    let total = 0;
    const byDept = [];

    for (const { table_name } of tables) {
      const { rows } = await pool.query(`SELECT COUNT(*) AS c FROM staff_faults."${table_name}"`);
      const count = parseInt(rows[0].c);
      total += count;
      byDept.push({ department: table_name, count });
    }

    byDept.sort((a, b) => b.count - a.count);
    res.json({ total, byDepartment: byDept });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch summary', details: e.message });
  }
});

module.exports = router;
