const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// Helper function to get KG students from a class
const getKGStudentsFromClass = async (className) => {
  const client = await pool.connect();
  try {
    // Query KG students from classes_schema
    const result = await client.query(`
      SELECT student_name, age as student_age, gender as student_gender 
      FROM classes_schema."${className}" 
      WHERE is_kg = TRUE OR student_type LIKE 'kg%'
      ORDER BY student_name
    `);
    return result.rows;
  } catch (error) {
    console.error('Error fetching KG students from class:', error);
    return [];
  } finally {
    client.release();
  }
};

// GET /api/kg-evaluations/areas - Get all KG evaluation areas
router.get('/areas', async (req, res) => {
  try {
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { 
      evaluation_name, 
      class_name, 
      term, 
      academic_year, 
      teacher_id, 
      teacher_name,
      evaluation_date,
      status 
    } = req.body;
    
    if (!evaluation_name || !class_name || !term) {
      return res.status(400).json({ error: 'Missing required fields: evaluation_name, class_name, term' });
    }
    
    const result = await client.query(`
      INSERT INTO kg_evaluations (
        evaluation_name, class_name, term, academic_year, 
        teacher_id, teacher_name, evaluation_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *
    `, [
      evaluation_name, 
      class_name, 
      term, 
      academic_year || null, 
      teacher_id || null, 
      teacher_name || null,
      evaluation_date || new Date(),
      status || 'draft'
    ]);
    
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating KG evaluation:', error);
    res.status(500).json({ error: 'Failed to create KG evaluation', details: error.message });
  } finally {
    client.release();
  }
});

// GET /api/kg-evaluations - Get all KG evaluations
router.get('/', async (req, res) => {
  try {
    const { class_name, term, status } = req.query;
    
    let query = 'SELECT * FROM kg_evaluations WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (class_name) {
      query += ` AND class_name = $${paramCount}`;
      params.push(class_name);
      paramCount++;
    }
    
    if (term) {
      query += ` AND term = $${paramCount}`;
      params.push(term);
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
      students: studentsWithScores
    });
  } catch (error) {
    console.error('Error fetching KG evaluation form:', error);
    res.status(500).json({ error: 'Failed to fetch KG evaluation form', details: error.message });
  }
});

// POST /api/kg-evaluations/:id/responses - Save student evaluation responses
router.post('/:id/responses', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { responses } = req.body;
    
    if (!Array.isArray(responses)) {
      return res.status(400).json({ error: 'responses must be an array' });
    }
    
    // Verify evaluation exists
    const evalCheck = await client.query('SELECT class_name FROM kg_evaluations WHERE id = $1', [id]);
    if (evalCheck.rows.length === 0) {
      return res.status(404).json({ error: 'KG evaluation not found' });
    }
    
    const evaluationClassName = evalCheck.rows[0].class_name;
    
    // Process each student's responses
    for (const studentResponse of responses) {
      const { student_name, student_age, student_gender, scores } = studentResponse;
      
      if (!student_name || !scores) {
        console.warn('Skipping invalid student response:', { student_name, hasScores: !!scores });
        continue;
      }
      
      // Save each criteria score
      for (const [criteria_id, scoreData] of Object.entries(scores)) {
        if (scoreData.score === undefined || scoreData.score === null) {
          continue;
        }
        
        await client.query(`
          INSERT INTO kg_student_evaluations (
            evaluation_id, student_name, student_age, student_gender, 
            criteria_id, score, rating, observation_notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (evaluation_id, student_name, criteria_id) 
          DO UPDATE SET 
            score = $6, 
            rating = $7, 
            observation_notes = $8,
            updated_at = CURRENT_TIMESTAMP
        `, [
          id, 
          student_name, 
          student_age || null, 
          student_gender || null,
          criteria_id,
          scoreData.score,
          scoreData.rating || null,
          scoreData.notes || ''
        ]);
      }
    }
    
    // Update evaluation status to 'completed' if it was 'draft'
    await client.query(`
      UPDATE kg_evaluations 
      SET status = 'completed', updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 AND status = 'draft'
    `, [id]);
    
    await client.query('COMMIT');
    res.json({ message: 'KG evaluation responses saved successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving KG evaluation responses:', error);
    res.status(500).json({ error: 'Failed to save KG evaluation responses', details: error.message });
  } finally {
    client.release();
  }
});

// PUT /api/kg-evaluations/:id - Update KG evaluation
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { evaluation_name, term, academic_year, status, evaluation_date } = req.body;
    
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid evaluation ID' });
    }
    
    const result = await pool.query(`
      UPDATE kg_evaluations 
      SET 
        evaluation_name = COALESCE($1, evaluation_name),
        term = COALESCE($2, term),
        academic_year = COALESCE($3, academic_year),
        status = COALESCE($4, status),
        evaluation_date = COALESCE($5, evaluation_date),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [evaluation_name, term, academic_year, status, evaluation_date, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KG evaluation not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating KG evaluation:', error);
    res.status(500).json({ error: 'Failed to update KG evaluation' });
  }
});

// DELETE /api/kg-evaluations/:id - Delete KG evaluation
router.delete('/:id', async (req, res) => {
  try {
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { student_name, class_name, milestone_id, achievement_status, achievement_date, teacher_notes } = req.body;
    
    if (!student_name || !class_name || !milestone_id || !achievement_status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await client.query(`
      INSERT INTO kg_student_milestones (
        student_name, class_name, milestone_id, achievement_status, 
        achievement_date, teacher_notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (student_name, class_name, milestone_id)
      DO UPDATE SET
        achievement_status = $4,
        achievement_date = $5,
        teacher_notes = $6,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [student_name, class_name, milestone_id, achievement_status, achievement_date || null, teacher_notes || '']);
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating student milestone:', error);
    res.status(500).json({ error: 'Failed to update student milestone', details: error.message });
  } finally {
    client.release();
  }
});

// GET /api/kg-evaluations/student/:studentName/report - Get comprehensive student report
router.get('/student/:studentName/report', async (req, res) => {
  try {
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
      ${term ? 'AND e.term = $3' : ''}
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
