const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// ── KG tables + default developmental areas ────────────────────────────────
// Created lazily per branch so a branch without the KG tables (e.g. Bilal)
// starts working on its first request instead of failing with 500.
const ensuredBranches = new Set();

const KG_AREAS = [
  ['Motor Skills', 'Fine and gross motor skill development', 1],
  ['Social Skills', 'Interaction with peers and adults', 2],
  ['Cognitive Development', 'Thinking, reasoning, and problem-solving', 3],
  ['Language & Communication', 'Verbal and non-verbal communication', 4],
  ['Emotional Development', 'Self-awareness and emotional regulation', 5],
  ['Creative Arts', 'Creativity through art, music, and play', 6],
  ['Numeracy', 'Basic number concepts and counting', 7],
  ['Literacy', 'Pre-reading and pre-writing skills', 8],
];

const KG_CRITERIA = [
  ['Motor Skills', 'Holds pencil/crayon correctly', 1],
  ['Motor Skills', 'Cuts with scissors', 2],
  ['Motor Skills', 'Pastes and glues neatly', 3],
  ['Motor Skills', 'Builds with blocks', 4],
  ['Motor Skills', 'Throws and catches ball', 5],
  ['Motor Skills', 'Balances on one foot', 6],
  ['Social Skills', 'Shares with others', 1],
  ['Social Skills', 'Takes turns', 2],
  ['Social Skills', 'Follows classroom rules', 3],
  ['Social Skills', 'Works cooperatively in groups', 4],
  ['Social Skills', 'Respects personal space', 5],
  ['Cognitive Development', 'Identifies colors', 1],
  ['Cognitive Development', 'Identifies shapes', 2],
  ['Cognitive Development', 'Sorts objects by attributes', 3],
  ['Cognitive Development', 'Completes puzzles', 4],
  ['Cognitive Development', 'Follows 2-3 step instructions', 5],
  ['Cognitive Development', 'Shows curiosity and asks questions', 6],
  ['Language & Communication', 'Expresses needs verbally', 1],
  ['Language & Communication', 'Speaks in complete sentences', 2],
  ['Language & Communication', 'Follows oral directions', 3],
  ['Language & Communication', 'Participates in group discussions', 4],
  ['Language & Communication', 'Tells a simple story', 5],
  ['Emotional Development', 'Separates from caregiver easily', 1],
  ['Emotional Development', 'Shows self-confidence', 2],
  ['Emotional Development', 'Manages emotions appropriately', 3],
  ['Emotional Development', 'Shows empathy for others', 4],
  ['Emotional Development', 'Adapts to new situations', 5],
  ['Creative Arts', 'Enjoys art activities', 1],
  ['Creative Arts', 'Sings songs', 2],
  ['Creative Arts', 'Participates in dramatic play', 3],
  ['Creative Arts', 'Shows rhythm and movement', 4],
  ['Numeracy', 'Counts 1-10', 1],
  ['Numeracy', 'Recognizes numbers 1-10', 2],
  ['Numeracy', 'Matches quantities to numbers', 3],
  ['Numeracy', 'Understands bigger/smaller', 4],
  ['Literacy', 'Recognizes letters', 1],
  ['Literacy', 'Writes own name', 2],
  ['Literacy', 'Shows print awareness', 3],
  ['Literacy', 'Enjoys listening to stories', 4],
];

async function ensureKGTables(req) {
  const branch = (typeof pool.getBranchCode === 'function' && pool.getBranchCode()) || 'default';
  if (ensuredBranches.has(branch)) return;
  const q = req?.branchPool || pool;
  await q.query(`
    CREATE TABLE IF NOT EXISTS kg_evaluation_areas (
      id SERIAL PRIMARY KEY,
      area_name VARCHAR(200) NOT NULL,
      description TEXT,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await q.query(`
    CREATE TABLE IF NOT EXISTS kg_evaluation_criteria (
      id SERIAL PRIMARY KEY,
      area_id INTEGER REFERENCES kg_evaluation_areas(id) ON DELETE CASCADE,
      criteria_name VARCHAR(300) NOT NULL,
      criteria_description TEXT,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await q.query(`
    CREATE TABLE IF NOT EXISTS kg_evaluations (
      id SERIAL PRIMARY KEY,
      class_name VARCHAR(100) NOT NULL,
      term_number INTEGER NOT NULL,
      evaluation_date DATE DEFAULT CURRENT_DATE,
      notes TEXT,
      status VARCHAR(20) DEFAULT 'draft',
      created_by VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await q.query(`
    CREATE TABLE IF NOT EXISTS kg_student_evaluations (
      id SERIAL PRIMARY KEY,
      evaluation_id INTEGER REFERENCES kg_evaluations(id) ON DELETE CASCADE,
      student_name VARCHAR(200) NOT NULL,
      criteria_id INTEGER REFERENCES kg_evaluation_criteria(id) ON DELETE CASCADE,
      score INTEGER DEFAULT 0,
      rating VARCHAR(50),
      observation_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await q.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS kg_student_evaluations_unique
      ON kg_student_evaluations (evaluation_id, student_name, criteria_id)
  `);
  await q.query(`
    CREATE TABLE IF NOT EXISTS kg_developmental_milestones (
      id SERIAL PRIMARY KEY,
      milestone_name VARCHAR(300) NOT NULL,
      milestone_category VARCHAR(100),
      age_range VARCHAR(50),
      milestone_description TEXT,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await q.query(`
    CREATE TABLE IF NOT EXISTS kg_student_milestones (
      id SERIAL PRIMARY KEY,
      student_name VARCHAR(200) NOT NULL,
      class_name VARCHAR(100),
      milestone_id INTEGER REFERENCES kg_developmental_milestones(id) ON DELETE CASCADE,
      achieved BOOLEAN DEFAULT FALSE,
      achieved_date DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const areaCount = await q.query('SELECT COUNT(*)::int AS c FROM kg_evaluation_areas');
  if (areaCount.rows[0].c === 0) {
    for (const [name, description, order] of KG_AREAS) {
      await q.query(
        'INSERT INTO kg_evaluation_areas (area_name, description, display_order) VALUES ($1,$2,$3)',
        [name, description, order]
      );
    }
  }
  const criteriaCount = await q.query('SELECT COUNT(*)::int AS c FROM kg_evaluation_criteria');
  if (criteriaCount.rows[0].c === 0) {
    const areas = await q.query('SELECT id, area_name FROM kg_evaluation_areas');
    const byName = new Map(areas.rows.map((r) => [r.area_name, r.id]));
    for (const [area, name, order] of KG_CRITERIA) {
      const areaId = byName.get(area);
      if (!areaId) continue;
      await q.query(
        'INSERT INTO kg_evaluation_criteria (area_id, criteria_name, display_order) VALUES ($1,$2,$3)',
        [areaId, name, order]
      );
    }
  }
  ensuredBranches.add(branch);
}


// Helper function to get students from a KG class table.
// KG evaluations are only created for KG classes, so every active student in
// the class belongs in the form. The old is_kg/student_type filter wrongly
// returned nothing because KG class tables do not carry those columns.
const getKGStudentsFromClass = async (className) => {
  const safe = String(className || '').replace(/[^a-zA-Z0-9_]/g, '');
  if (!safe) return [];
  try {
    const tbl = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'classes_schema' AND LOWER(table_name) = LOWER($1) LIMIT 1`,
      [safe]
    );
    if (!tbl.rows.length) return [];
    const table = tbl.rows[0].table_name;
    const cols = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'classes_schema' AND table_name = $1`,
      [table]
    );
    const names = new Set(cols.rows.map((r) => r.column_name));
    const active = names.has('is_active') ? 'WHERE (is_active = TRUE OR is_active IS NULL)' : '';
    const result = await pool.query(
      `SELECT student_name, ${names.has('age') ? 'age' : 'NULL'} AS student_age,
              ${names.has('gender') ? 'gender' : 'NULL'} AS student_gender
         FROM classes_schema."${table}" ${active}
        ORDER BY student_name`
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching KG students from class:', error);
    return [];
  }
};

// GET /api/kg-evaluations/areas - Get all KG evaluation areas
router.get('/areas', async (req, res) => {
  try {
    await ensureKGTables(req);
    const result = await pool.query(`
      SELECT * FROM kg_evaluation_areas 
      ORDER BY area_name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching KG evaluation areas:', error);
    res.status(500).json({ error: 'Failed to fetch KG evaluation areas' });
  }
});

// GET /api/kg-evaluations/areas/:id/criteria - Get criteria for a specific area
router.get('/areas/:id/criteria', async (req, res) => {
  try {
    await ensureKGTables(req);
    const { id } = req.params;
    const result = await pool.query(`
      SELECT * FROM kg_evaluation_criteria 
      WHERE area_id = $1 
      ORDER BY display_order, criteria_name
    `, [id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching KG evaluation criteria:', error);
    res.status(500).json({ error: 'Failed to fetch KG evaluation criteria' });
  }
});

// GET /api/kg-evaluations/criteria - Get all KG evaluation criteria
router.get('/criteria', async (req, res) => {
  try {
    await ensureKGTables(req);
    const result = await pool.query(`
      SELECT c.*, a.area_name 
      FROM kg_evaluation_criteria c
      LEFT JOIN kg_evaluation_areas a ON c.area_id = a.id
      ORDER BY a.area_name, c.display_order, c.criteria_name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all KG evaluation criteria:', error);
    res.status(500).json({ error: 'Failed to fetch KG evaluation criteria' });
  }
});

// POST /api/kg-evaluations - Create new KG evaluation
router.post('/', async (req, res) => {
  try {
    await ensureKGTables(req);
    const b = req.body || {};
    const className = String(b.className ?? b.class_name ?? '').trim();
    const termNumber = parseInt(b.termNumber ?? b.term_number ?? b.term, 10);
    const notes = String(b.notes ?? '').trim();
    const createdBy = String(b.createdBy ?? b.created_by ?? req.user?.name ?? req.user?.username ?? 'admin');
    const status = String(b.status || 'draft');
    if (!className || !termNumber) {
      return res.status(400).json({ error: 'class_name and term_number are required' });
    }
    const existing = await pool.query(
      'SELECT * FROM kg_evaluations WHERE LOWER(class_name)=LOWER($1) AND term_number=$2 ORDER BY id DESC LIMIT 1',
      [className, termNumber]
    );
    if (existing.rows.length) {
      return res.status(409).json({
        error: `A KG evaluation already exists for ${className} Term ${termNumber}`,
        data: existing.rows[0]
      });
    }
    const result = await pool.query(
      `INSERT INTO kg_evaluations (class_name, term_number, notes, created_by, status)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [className, termNumber, notes || null, createdBy, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating KG evaluation:', error);
    res.status(500).json({ error: 'Failed to create KG evaluation', details: error.message });
  }
});

// GET /api/kg-evaluations - Get all KG evaluations
router.get('/', async (req, res) => {
  try {
    await ensureKGTables(req);
    const { class_name, term, term_number, status } = req.query;
    const termValue = term_number ?? term;
    
    let query = 'SELECT * FROM kg_evaluations WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (class_name) {
      query += ` AND class_name = $${paramCount}`;
      params.push(class_name);
      paramCount++;
    }
    
    if (termValue) {
      query += ` AND term_number = $${paramCount}`;
      params.push(termValue);
      paramCount++;
    }
    
    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching KG evaluations:', error);
    res.status(500).json({ error: 'Failed to fetch KG evaluations' });
  }
});

// GET /api/kg-evaluations/:id - Get specific KG evaluation
router.get('/:id', async (req, res) => {
  try {
    await ensureKGTables(req);
    const { id } = req.params;
    
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid evaluation ID' });
    }
    
    const result = await pool.query(`
      SELECT * FROM kg_evaluations WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KG evaluation not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching KG evaluation:', error);
    res.status(500).json({ error: 'Failed to fetch KG evaluation' });
  }
});

// GET /api/kg-evaluations/:id/form - Get evaluation form with students and criteria
router.get('/:id/form', async (req, res) => {
  try {
    await ensureKGTables(req);
    const { id } = req.params;
    
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid evaluation ID' });
    }
    
    // Get evaluation details
    const evalResult = await pool.query(`
      SELECT * FROM kg_evaluations WHERE id = $1
    `, [id]);
    
    if (evalResult.rows.length === 0) {
      return res.status(404).json({ error: 'KG evaluation not found' });
    }
    
    const evaluation = evalResult.rows[0];
    
    // Get all criteria grouped by area
    const criteriaResult = await pool.query(`
      SELECT c.*, a.area_name, a.description as area_description
      FROM kg_evaluation_criteria c
      LEFT JOIN kg_evaluation_areas a ON c.area_id = a.id
      ORDER BY a.area_name, c.display_order, c.criteria_name
    `);
    
    // Group criteria by area
    const areaMap = {};
    criteriaResult.rows.forEach(criteria => {
      if (!areaMap[criteria.area_id]) {
        areaMap[criteria.area_id] = {
          id: criteria.area_id,
          area_name: criteria.area_name,
          description: criteria.area_description,
          criteria: []
        };
      }
      areaMap[criteria.area_id].criteria.push({
        id: criteria.id,
        criteria_name: criteria.criteria_name,
        criteria_description: criteria.criteria_description,
        evaluation_type: criteria.evaluation_type,
        max_points: criteria.max_points
      });
    });
    
    const areas = Object.values(areaMap);
    
    // Get KG students from the class
    const students = await getKGStudentsFromClass(evaluation.class_name);
    
    // Get existing responses for these students
    const responsesResult = await pool.query(`
      SELECT student_name, criteria_id, score, rating, observation_notes
      FROM kg_student_evaluations
      WHERE evaluation_id = $1 AND student_name = ANY($2::text[])
    `, [id, students.map(s => s.student_name)]);
    
    // Map responses to students
    const studentsWithScores = students.map(student => {
      const studentResponses = responsesResult.rows.filter(r => r.student_name === student.student_name);
      const scores = {};
      studentResponses.forEach(response => {
        scores[response.criteria_id] = {
          score: response.score,
          rating: response.rating,
          notes: response.observation_notes
        };
      });
      return { ...student, scores };
    });
    
    res.json({
      evaluation,
      areas,
      students: studentsWithScores,
      // Flat list used by the admin app's score editor.
      existingScores: responsesResult.rows,
    });
  } catch (error) {
    console.error('Error fetching KG evaluation form:', error);
    res.status(500).json({ error: 'Failed to fetch KG evaluation form', details: error.message });
  }
});

// POST /api/kg-evaluations/:id/responses - Save student evaluation responses
router.post('/:id/responses', async (req, res) => {
  try {
    await ensureKGTables(req);
    const { id } = req.params;
    const { responses } = req.body || {};
    if (!Array.isArray(responses)) {
      return res.status(400).json({ error: 'responses must be an array' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const evalCheck = await client.query('SELECT class_name FROM kg_evaluations WHERE id = $1', [id]);
      if (evalCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'KG evaluation not found' });
      }

      // Accept both shapes:
      //  - flat:   { student_name, criteria_id, score, rating, notes }
      //  - nested: { student_name, scores: { [criteria_id]: { score, rating, notes } } }
      const rows = [];
      for (const sr of responses) {
        const name = String(sr?.student_name ?? sr?.studentName ?? '').trim();
        if (!name) continue;
        if (sr.scores && typeof sr.scores === 'object') {
          for (const [cid, sd] of Object.entries(sr.scores)) {
            rows.push({ name, cid, score: sd?.score, rating: sd?.rating, notes: sd?.notes ?? sd?.observation_notes });
          }
        } else if (sr.criteria_id != null) {
          rows.push({ name, cid: sr.criteria_id, score: sr.score, rating: sr.rating, notes: sr.observation_notes ?? sr.notes });
        }
      }

      let saved = 0;
      for (const row of rows) {
        const criteriaId = parseInt(row.cid, 10);
        const score = parseInt(row.score, 10);
        if (!criteriaId || Number.isNaN(score)) continue;
        const safeScore = Math.max(0, Math.min(5, score));
        const rating = row.rating != null ? String(row.rating) : null;
        const notes = row.notes != null ? String(row.notes) : '';
        const upd = await client.query(
          `UPDATE kg_student_evaluations
              SET score = $1, rating = $2, observation_notes = $3
            WHERE evaluation_id = $4 AND student_name = $5 AND criteria_id = $6`,
          [safeScore, rating, notes, id, row.name, criteriaId]
        );
        if (!upd.rowCount) {
          await client.query(
            `INSERT INTO kg_student_evaluations
               (evaluation_id, student_name, criteria_id, score, rating, observation_notes)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [id, row.name, criteriaId, safeScore, rating, notes]
          );
        }
        saved++;
      }

      await client.query(
        `UPDATE kg_evaluations
            SET status = 'completed', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [id]
      );

      await client.query('COMMIT');
      res.json({ message: 'KG evaluation responses saved successfully', saved });
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error saving KG evaluation responses:', error);
    res.status(500).json({ error: 'Failed to save KG evaluation responses', details: error.message });
  }
});

// PUT /api/kg-evaluations/:id - Update KG evaluation
router.put('/:id', async (req, res) => {
  try {
    await ensureKGTables(req);
    const { id } = req.params;
    const b = req.body || {};
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid evaluation ID' });
    }
    const className = b.className ?? b.class_name ?? null;
    const termNumber = b.termNumber ?? b.term_number ?? b.term ?? null;
    const notes = b.notes ?? null;
    const status = b.status ?? null;
    const evaluationDate = b.evaluation_date ?? null;
    const result = await pool.query(`
      UPDATE kg_evaluations
      SET
        class_name = COALESCE($1, class_name),
        term_number = COALESCE($2, term_number),
        notes = COALESCE($3, notes),
        status = COALESCE($4, status),
        evaluation_date = COALESCE($5, evaluation_date),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [className, termNumber ? parseInt(termNumber, 10) : null, notes, status, evaluationDate, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KG evaluation not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating KG evaluation:', error);
    res.status(500).json({ error: 'Failed to update KG evaluation', details: error.message });
  }
});

// DELETE /api/kg-evaluations/:id - Delete KG evaluation
router.delete('/:id', async (req, res) => {
  try {
    await ensureKGTables(req);
    const { id } = req.params;
    
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid evaluation ID' });
    }
    
    const result = await pool.query(`
      DELETE FROM kg_evaluations WHERE id = $1 RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KG evaluation not found' });
    }
    
    res.json({ message: 'KG evaluation deleted successfully' });
  } catch (error) {
    console.error('Error deleting KG evaluation:', error);
    res.status(500).json({ error: 'Failed to delete KG evaluation' });
  }
});

// GET /api/kg-evaluations/milestones - Get all developmental milestones
router.get('/milestones/all', async (req, res) => {
  try {
    await ensureKGTables(req);
    const { category, age_range } = req.query;
    
    let query = 'SELECT * FROM kg_developmental_milestones WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (category) {
      query += ` AND milestone_category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }
    
    if (age_range) {
      query += ` AND age_range = $${paramCount}`;
      params.push(age_range);
      paramCount++;
    }
    
    query += ' ORDER BY milestone_category, display_order, milestone_name';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching developmental milestones:', error);
    res.status(500).json({ error: 'Failed to fetch developmental milestones' });
  }
});

// GET /api/kg-evaluations/milestones/student/:studentName - Get student milestone progress
router.get('/milestones/student/:studentName', async (req, res) => {
  try {
    await ensureKGTables(req);
    const { studentName } = req.params;
    const { class_name } = req.query;
    
    if (!class_name) {
      return res.status(400).json({ error: 'class_name query parameter is required' });
    }
    
    const result = await pool.query(`
      SELECT sm.*, m.milestone_name, m.milestone_description, 
             m.milestone_category, m.age_range
      FROM kg_student_milestones sm
      LEFT JOIN kg_developmental_milestones m ON sm.milestone_id = m.id
      WHERE sm.student_name = $1 AND sm.class_name = $2
      ORDER BY m.milestone_category, m.display_order
    `, [studentName, class_name]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching student milestones:', error);
    res.status(500).json({ error: 'Failed to fetch student milestones' });
  }
});

// POST /api/kg-evaluations/milestones/student - Update student milestone progress
router.post('/milestones/student', async (req, res) => {
  try {
    await ensureKGTables(req);
    const b = req.body || {};
    const studentName = String(b.student_name ?? b.studentName ?? '').trim();
    const className = String(b.class_name ?? b.className ?? '').trim();
    const milestoneId = parseInt(b.milestone_id ?? b.milestoneId, 10);
    const rawStatus = b.achievement_status ?? b.status;
    const achieved = b.achieved === true || ['achieved', 'yes', 'true', 'completed'].includes(String(rawStatus || '').toLowerCase());
    const achievedDate = b.achieved_date ?? b.achievement_date ?? null;
    const notes = b.notes ?? b.teacher_notes ?? '';
    if (!studentName || !className || !milestoneId) {
      return res.status(400).json({ error: 'student_name, class_name and milestone_id are required' });
    }
    const upd = await pool.query(
      `UPDATE kg_student_milestones
          SET achieved=$1, achieved_date=$2, notes=$3
        WHERE student_name=$4 AND class_name=$5 AND milestone_id=$6
        RETURNING *`,
      [achieved, achievedDate, notes, studentName, className, milestoneId]
    );
    let row = upd.rows[0];
    if (!row) {
      const ins = await pool.query(
        `INSERT INTO kg_student_milestones (student_name, class_name, milestone_id, achieved, achieved_date, notes)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [studentName, className, milestoneId, achieved, achievedDate, notes]
      );
      row = ins.rows[0];
    }
    res.json(row);
  } catch (error) {
    console.error('Error updating student milestone:', error);
    res.status(500).json({ error: 'Failed to update student milestone', details: error.message });
  }
});

// GET /api/kg-evaluations/student/:studentName/report - Get comprehensive student report
router.get('/student/:studentName/report', async (req, res) => {
  try {
    await ensureKGTables(req);
    const { studentName } = req.params;
    const { class_name, term } = req.query;
    
    if (!class_name) {
      return res.status(400).json({ error: 'class_name query parameter is required' });
    }
    
    // Get student evaluations
    const evaluationsResult = await pool.query(`
      SELECT e.*, se.criteria_id, se.score, se.rating, se.observation_notes,
             c.criteria_name, c.criteria_description, a.area_name
      FROM kg_evaluations e
      LEFT JOIN kg_student_evaluations se ON e.id = se.evaluation_id
      LEFT JOIN kg_evaluation_criteria c ON se.criteria_id = c.id
      LEFT JOIN kg_evaluation_areas a ON c.area_id = a.id
      WHERE se.student_name = $1 AND e.class_name = $2
      ${term ? 'AND e.term_number = $3' : ''}
      ORDER BY e.evaluation_date DESC, a.area_name, c.display_order
    `, term ? [studentName, class_name, term] : [studentName, class_name]);
    
    // Get student milestones
    const milestonesResult = await pool.query(`
      SELECT sm.*, m.milestone_name, m.milestone_description, 
             m.milestone_category, m.age_range
      FROM kg_student_milestones sm
      LEFT JOIN kg_developmental_milestones m ON sm.milestone_id = m.id
      WHERE sm.student_name = $1 AND sm.class_name = $2
      ORDER BY m.milestone_category, m.display_order
    `, [studentName, class_name]);
    
    res.json({
      student_name: studentName,
      class_name,
      term: term || 'All Terms',
      evaluations: evaluationsResult.rows,
      milestones: milestonesResult.rows
    });
  } catch (error) {
    console.error('Error fetching student report:', error);
    res.status(500).json({ error: 'Failed to fetch student report', details: error.message });
  }
});

module.exports = router;
