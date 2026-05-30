const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { getCurrentEthiopianDate } = require('../utils/ethiopianCalendar');
const { getEndpointPath, API_ENDPOINTS } = require('../config/api.config');

// Get wards for a guardian
router.get('/wards/:guardianId', async (req, res) => {
  const { guardianId } = req.params;

  try {
    // Get all classes
    const classesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'classes_schema'
      ORDER BY table_name
    `);

    const wards = [];

    // Search for students with this guardian_id in all class tables
    for (const row of classesResult.rows) {
      const className = row.table_name;
      
      try {
        const studentsResult = await pool.query(`
          SELECT school_id, student_name, class_id, guardian_id
          FROM classes_schema."${className}"
          WHERE guardian_id = $1
        `, [guardianId]);

        studentsResult.rows.forEach(student => {
          wards.push({
            school_id: student.school_id,
            student_name: student.student_name,
            class_name: className,
            class_id: student.class_id,
            guardian_id: student.guardian_id
          });
        });
      } catch (err) {
        console.warn(`Error querying class ${className}:`, err.message);
      }
    }

    res.json({ success: true, wards });
  } catch (error) {
    console.error('Error fetching wards:', error);
    res.status(500).json({ error: 'Failed to fetch wards', details: error.message });
  }
});

// Get attendance for a specific student (Ethiopian calendar based)
router.get('/student-attendance/:className/:schoolId', async (req, res) => {
  const { className, schoolId } = req.params;
  const { year, month } = req.query;

  try {
    const currentDate = getCurrentEthiopianDate();
    const targetYear = year ? parseInt(year) : currentDate.year;
    const targetMonth = month ? parseInt(month) : currentDate.month;

    // Get attendance records for the student for the specified month
    const result = await pool.query(`
      SELECT 
        ethiopian_year,
        ethiopian_month,
        ethiopian_day,
        day_of_week,
        week_number,
        status,
        check_in_time,
        notes,
        shift_number,
        created_at
      FROM academic_student_attendance
      WHERE student_id = $1
        AND class_name = $2
        AND ethiopian_year = $3
        AND ethiopian_month = $4
      ORDER BY ethiopian_day ASC
    `, [String(schoolId), className, targetYear, targetMonth]);

    res.json({
      success: true,
      year: targetYear,
      month: targetMonth,
      attendance: result.rows
    });
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance', details: error.message });
  }
});

// Get monthly summary for a student
router.get('/monthly-summary/:className/:schoolId', async (req, res) => {
  const { className, schoolId } = req.params;
  const { year, month } = req.query;

  try {
    const currentDate = getCurrentEthiopianDate();
    const targetYear = year ? parseInt(year) : currentDate.year;
    const targetMonth = month ? parseInt(month) : currentDate.month;

    const result = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM academic_student_attendance
      WHERE student_id = $1
        AND class_name = $2
        AND ethiopian_year = $3
        AND ethiopian_month = $4
      GROUP BY status
    `, [String(schoolId), className, targetYear, targetMonth]);

    const summary = {
      present: 0,
      absent: 0,
      late: 0,
      leave: 0,
      total: 0
    };

    result.rows.forEach(row => {
      const count = parseInt(row.count);
      summary.total += count;
      
      if (row.status === 'PRESENT') summary.present = count;
      else if (row.status === 'ABSENT') summary.absent = count;
      else if (row.status === 'LATE') summary.late = count;
      else if (row.status === 'LEAVE') summary.leave = count;
    });

    const percentage = summary.total > 0 
      ? ((summary.present / summary.total) * 100).toFixed(1) 
      : 0;

    res.json({
      success: true,
      year: targetYear,
      month: targetMonth,
      summary,
      percentage: parseFloat(percentage)
    });
  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary', details: error.message });
  }
});

// Get attendance trends (last 6 months)
router.get('/trends/:className/:schoolId', async (req, res) => {
  const { className, schoolId } = req.params;

  try {
    const currentDate = getCurrentEthiopianDate();
    const trends = [];

    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      let targetMonth = currentDate.month - i;
      let targetYear = currentDate.year;

      // Handle year boundary
      while (targetMonth <= 0) {
        targetMonth += 13;
        targetYear -= 1;
      }

      const result = await pool.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM academic_student_attendance
        WHERE student_id = $1
          AND class_name = $2
          AND ethiopian_year = $3
          AND ethiopian_month = $4
        GROUP BY status
      `, [String(schoolId), className, targetYear, targetMonth]);

      let present = 0, absent = 0, late = 0, leave = 0, total = 0;

      result.rows.forEach(row => {
        const count = parseInt(row.count);
        total += count;
        
        if (row.status === 'PRESENT') present = count;
        else if (row.status === 'ABSENT') absent = count;
        else if (row.status === 'LATE') late = count;
        else if (row.status === 'LEAVE') leave = count;
      });

      const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

      trends.push({
        year: targetYear,
        month: targetMonth,
        present,
        absent,
        late,
        leave,
        total,
        percentage: parseFloat(percentage)
      });
    }

    res.json({ success: true, trends });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends', details: error.message });
  }
});

module.exports = router;
