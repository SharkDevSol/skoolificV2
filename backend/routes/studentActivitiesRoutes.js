// Student Activities Routes - For Report Card
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { getEndpointPath, API_ENDPOINTS } = require('../config/api.config');

// Get activities for a specific student in a class
router.get('/activities/:className/:studentName', async (req, res) => {
  try {
    const { className, studentName } = req.params;

    // Query to get student activities from the database
    // This assumes you have a student_activities table
    const query = `
      SELECT 
        term_number,
        personal_hygiene,
        learning_materials_care,
        time_management,
        work_independently,
        obeys_rules,
        overall_responsibility,
        social_relation
      FROM student_activities
      WHERE class_name = $1 AND student_name = $2
      ORDER BY term_number
    `;

    const result = await pool.query(query, [className, studentName]);

    res.json({
      success: true,
      activities: result.rows
    });
  } catch (error) {
    console.error('Error fetching student activities:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student activities',
      error: error.message,
      activities: []
    });
  }
});

// Get all activities for a class (for print all functionality)
router.get('/activities/:className/all', async (req, res) => {
  try {
    const { className } = req.params;

    const query = `
      SELECT 
        student_name,
        term_number,
        personal_hygiene,
        learning_materials_care,
        time_management,
        work_independently,
        obeys_rules,
        overall_responsibility,
        social_relation
      FROM student_activities
      WHERE class_name = $1
      ORDER BY student_name, term_number
    `;

    const result = await pool.query(query, [className]);

    res.json({
      success: true,
      activities: result.rows
    });
  } catch (error) {
    console.error('Error fetching all activities:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching all activities',
      error: error.message,
      activities: []
    });
  }
});

// Create or update student activities
router.post('/activities', async (req, res) => {
  try {
    const {
      className,
      studentName,
      termNumber,
      personalHygiene,
      learningMaterialsCare,
      timeManagement,
      workIndependently,
      obeysRules,
      overallResponsibility,
      socialRelation
    } = req.body;

    // Check if record exists
    const checkQuery = `
      SELECT id FROM student_activities
      WHERE class_name = $1 AND student_name = $2 AND term_number = $3
    `;
    const checkResult = await pool.query(checkQuery, [className, studentName, termNumber]);

    let query;
    let values;

    if (checkResult.rows.length > 0) {
      // Update existing record
      query = `
        UPDATE student_activities
        SET 
          personal_hygiene = $1,
          learning_materials_care = $2,
          time_management = $3,
          work_independently = $4,
          obeys_rules = $5,
          overall_responsibility = $6,
          social_relation = $7,
          updated_at = CURRENT_TIMESTAMP
        WHERE class_name = $8 AND student_name = $9 AND term_number = $10
        RETURNING *
      `;
      values = [
        personalHygiene,
        learningMaterialsCare,
        timeManagement,
        workIndependently,
        obeysRules,
        overallResponsibility,
        socialRelation,
        className,
        studentName,
        termNumber
      ];
    } else {
      // Insert new record
      query = `
        INSERT INTO student_activities (
          class_name,
          student_name,
          term_number,
          personal_hygiene,
          learning_materials_care,
          time_management,
          work_independently,
          obeys_rules,
          overall_responsibility,
          social_relation
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      values = [
        className,
        studentName,
        termNumber,
        personalHygiene,
        learningMaterialsCare,
        timeManagement,
        workIndependently,
        obeysRules,
        overallResponsibility,
        socialRelation
      ];
    }

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Student activities saved successfully',
      activity: result.rows[0]
    });
  } catch (error) {
    console.error('Error saving student activities:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving student activities',
      error: error.message
    });
  }
});

module.exports = router;
