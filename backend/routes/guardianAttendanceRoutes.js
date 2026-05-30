const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { generateAttendanceReport } = require('../utils/attendanceReportGenerator');
const { getEndpointPath, API_ENDPOINTS } = require('../config/api.config');

// Get all attendance tables for a class (weekly attendance)
router.get('/tables/:className', async (req, res) => {
  const { className } = req.params;

  if (!/^[a-zA-Z0-9_]+$/.test(className)) {
    return res.status(400).json({ error: 'Invalid class name. Use alphanumeric characters and underscores only.' });
  }

  try {
    const schemaName = `class_${className}_weekly_attendance`;
    
    // Check if schema exists
    const schemaExists = await pool.query(`
      SELECT 1 FROM information_schema.schemata WHERE schema_name = $1
    `, [schemaName]);

    if (schemaExists.rows.length === 0) {
      return res.json([]); // Return empty array instead of error
    }

    // Get all table names from the weekly attendance schema
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
      ORDER BY table_name DESC
    `, [schemaName]);

    const tables = result.rows.map(row => row.table_name);
    res.json(tables);
  } catch (error) {
    console.error('Error fetching attendance tables:', error);
    res.status(500).json({ error: 'Failed to fetch attendance tables', details: error.message });
  }
});

// Get attendance for a specific student by school_id (weekly attendance)
router.get('/student/:className/:tableName/:schoolId', async (req, res) => {
  const { className, tableName, schoolId } = req.params;

  if (!/^[a-zA-Z0-9_]+$/.test(className) || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
    return res.status(400).json({ error: 'Invalid class name or table name.' });
  }

  try {
    const schemaName = `class_${className}_weekly_attendance`;
    
    // Check if schema exists first
    const schemaExists = await pool.query(`
      SELECT 1 FROM information_schema.schemata WHERE schema_name = $1
    `, [schemaName]);

    if (schemaExists.rows.length === 0) {
      console.log(`Schema ${schemaName} does not exist`);
      return res.json([]); // Return empty array instead of error
    }
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = $2
    `, [schemaName, tableName]);

    if (tableExists.rows.length === 0) {
      console.log(`Table ${tableName} does not exist in schema ${schemaName}`);
      return res.json([]); // Return empty array instead of error
    }

    // Check if class table exists in classes_schema
    const classTableExists = await pool.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'classes_schema' AND table_name = $1
    `, [className]);

    if (classTableExists.rows.length === 0) {
      console.log(`Class table ${className} does not exist in classes_schema`);
      return res.json([]); // Return empty array if class table doesn't exist
    }

    // Get attendance records for the student
    // Extract week date from table name (week_YYYY_MM_DD -> YYYY-MM-DD)
    const weekDate = tableName.replace('week_', '').replace(/_/g, '-');
    
    // Try to parse schoolId as integer, fallback to string comparison
    const schoolIdInt = parseInt(schoolId);
    const isNumeric = !isNaN(schoolIdInt);
    
    // school_id in attendance table might be INTEGER or VARCHAR
    // Filter out deactivated students by checking classes_schema
    const result = await pool.query(`
      SELECT a.id, a.school_id, a.class_id, a.student_name,
             a.monday, a.tuesday, a.wednesday, a.thursday, a.friday, a.saturday, a.sunday,
             a.created_at, a.updated_at,
             $2 as week_start,
             $3 as attendance_name
      FROM "${schemaName}"."${tableName}" a
      WHERE (
        ${isNumeric ? 'a.school_id = $1::integer OR' : ''} 
        a.school_id::text = $1::text
      )
        AND EXISTS (
          SELECT 1 FROM classes_schema."${className}" c
          WHERE (c.school_id = a.school_id::text OR c.school_id::text = a.school_id::text)
            AND c.class_id = a.class_id
            AND (c.is_active = TRUE OR c.is_active IS NULL)
        )
      ORDER BY a.student_name ASC
    `, [isNumeric ? schoolIdInt : String(schoolId), weekDate, tableName]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    console.error('Error details:', {
      className: req.params.className,
      tableName: req.params.tableName,
      schoolId: req.params.schoolId,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch attendance', details: error.message });
  }
});

// Get monthly attendance summary for a student
router.get('/monthly-summary/:className/:schoolId/:year/:month', async (req, res) => {
  const { className, schoolId, year, month } = req.params;

  if (!/^[a-zA-Z0-9_]+$/.test(className)) {
    return res.status(400).json({ error: 'Invalid class name.' });
  }

  try {
    const schemaName = `class_${className}_weekly_attendance`;
    
    // Check if schema exists
    const schemaExists = await pool.query(`
      SELECT 1 FROM information_schema.schemata WHERE schema_name = $1
    `, [schemaName]);

    if (schemaExists.rows.length === 0) {
      return res.json({ summary: { present: 0, absent: 0, late: 0, total: 0 }, percentage: 0 });
    }

    // Get all tables for the specified month
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
        AND table_name LIKE 'week_' || $2 || '_' || $3 || '%'
      ORDER BY table_name ASC
    `, [schemaName, year, month.padStart(2, '0')]);

    let totalPresent = 0, totalAbsent = 0, totalLate = 0, totalDays = 0;

    // Try to parse schoolId as integer
    const schoolIdInt = parseInt(schoolId);
    const isNumeric = !isNaN(schoolIdInt);

    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      try {
        const result = await pool.query(`
          SELECT monday, tuesday, wednesday, thursday, friday, saturday, sunday
          FROM "${schemaName}"."${tableName}"
          WHERE (
            ${isNumeric ? 'school_id = $1::integer OR' : ''} 
            school_id::text = $1::text
          )
            AND EXISTS (
              SELECT 1 FROM classes_schema."${className}" c
              WHERE (c.school_id = school_id::text OR c.school_id::text = school_id::text)
                AND (c.is_active = TRUE OR c.is_active IS NULL)
            )
        `, [isNumeric ? schoolIdInt : String(schoolId)]);

        if (result.rows.length > 0) {
          const record = result.rows[0];
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          days.forEach(day => {
            if (record[day]) {
              totalDays++;
              if (record[day] === 'P') totalPresent++;
              else if (record[day] === 'A') totalAbsent++;
              else if (record[day] === 'L') totalLate++;
            }
          });
        }
      } catch (tableErr) {
        console.warn(`Error reading table ${tableName}:`, tableErr.message);
      }
    }

    const percentage = totalDays > 0 ? ((totalPresent / totalDays) * 100).toFixed(1) : 0;

    res.json({
      summary: {
        present: totalPresent,
        absent: totalAbsent,
        late: totalLate,
        total: totalDays
      },
      percentage: parseFloat(percentage)
    });
  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    res.status(500).json({ error: 'Failed to fetch monthly summary', details: error.message });
  }
});

// Get attendance trends for a student (last 6 months)
router.get('/trends/:className/:schoolId', async (req, res) => {
  const { className, schoolId } = req.params;

  if (!/^[a-zA-Z0-9_]+$/.test(className)) {
    return res.status(400).json({ error: 'Invalid class name.' });
  }

  try {
    const schemaName = `class_${className}_weekly_attendance`;
    
    const schemaExists = await pool.query(`
      SELECT 1 FROM information_schema.schemata WHERE schema_name = $1
    `, [schemaName]);

    if (schemaExists.rows.length === 0) {
      return res.json([]);
    }

    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
      ORDER BY table_name DESC
      LIMIT 26
    `, [schemaName]);

    const trends = [];

    // Try to parse schoolId as integer
    const schoolIdInt = parseInt(schoolId);
    const isNumeric = !isNaN(schoolIdInt);

    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      const weekDate = tableName.replace('week_', '').replace(/_/g, '-');
      
      try {
        const result = await pool.query(`
          SELECT monday, tuesday, wednesday, thursday, friday, saturday, sunday
          FROM "${schemaName}"."${tableName}"
          WHERE (
            ${isNumeric ? 'school_id = $1::integer OR' : ''} 
            school_id::text = $1::text
          )
            AND EXISTS (
              SELECT 1 FROM classes_schema."${className}" c
              WHERE (c.school_id = school_id::text OR c.school_id::text = school_id::text)
                AND (c.is_active = TRUE OR c.is_active IS NULL)
            )
        `, [isNumeric ? schoolIdInt : String(schoolId)]);

        if (result.rows.length > 0) {
          const record = result.rows[0];
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          let present = 0, absent = 0, late = 0, total = 0;
          
          days.forEach(day => {
            if (record[day]) {
              total++;
              if (record[day] === 'P') present++;
              else if (record[day] === 'A') absent++;
              else if (record[day] === 'L') late++;
            }
          });

          trends.push({
            week: weekDate,
            present,
            absent,
            late,
            total,
            percentage: total > 0 ? ((present / total) * 100).toFixed(1) : 0
          });
        }
      } catch (tableErr) {
        console.warn(`Error reading table ${tableName}:`, tableErr.message);
      }
    }

    res.json(trends.reverse());
  } catch (error) {
    console.error('Error fetching attendance trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends', details: error.message });
  }
});

// Download attendance report (JSON format for now, can be converted to PDF on frontend)
router.get('/report/:className/:schoolId/:year/:month', async (req, res) => {
  const { className, schoolId, year, month } = req.params;

  if (!/^[a-zA-Z0-9_]+$/.test(className)) {
    return res.status(400).json({ error: 'Invalid class name.' });
  }

  try {
    const reportData = await generateAttendanceReport(className, schoolId, year, month);
    
    // Set headers for download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_report_${schoolId}_${year}_${month}.json"`);
    
    res.json(reportData);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report', details: error.message });
  }
});

// Get all attendance for all wards of a guardian
router.get('/guardian-attendance/:guardianUsername', async (req, res) => {
  const { guardianUsername } = req.params;
  const { year, month } = req.query;
  
  try {
    // Get all class tables
    const tablesResult = await pool.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = $1', 
      ['classes_schema']
    );
    
    const classes = tablesResult.rows.map(row => row.table_name);
    const wards = [];
    
    // Find all wards for this guardian
    for (const className of classes) {
      try {
        const columnsCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'classes_schema' 
            AND table_name = $1 
            AND column_name = 'is_active'
        `, [className]);
        
        const hasIsActive = columnsCheck.rows.length > 0;
        const whereClause = hasIsActive 
          ? `WHERE guardian_username = $1 AND (is_active = TRUE OR is_active IS NULL)`
          : `WHERE guardian_username = $1`;
        
        const result = await pool.query(`
          SELECT 
            student_name,
            school_id,
            class_id,
            class
          FROM classes_schema."${className}"
          ${whereClause}
        `, [guardianUsername]);
        
        wards.push(...result.rows.map(row => ({
          ...row,
          class: row.class || className
        })));
      } catch (err) {
        console.warn(`Error fetching from ${className}:`, err.message);
      }
    }
    
    if (wards.length === 0) {
      return res.json({
        success: true,
        data: {
          wards: [],
          attendance: [],
          stats: { total: 0, present: 0, absent: 0, late: 0, percentage: 0 }
        }
      });
    }
    
    // Fetch attendance for each ward
    const attendanceData = [];
    
    for (const ward of wards) {
      try {
        let query = `
          SELECT 
            student_id,
            student_name,
            class_name,
            date,
            status,
            check_in_time,
            ethiopian_year,
            ethiopian_month,
            ethiopian_day,
            day_of_week,
            shift_number,
            notes,
            created_at
          FROM academic_student_attendance
          WHERE student_id = $1
        `;
        
        const params = [String(ward.school_id)];
        
        if (year && month) {
          query += ` AND ethiopian_year = $2 AND ethiopian_month = $3`;
          params.push(parseInt(year), parseInt(month));
        }
        
        query += ` ORDER BY ethiopian_year DESC, ethiopian_month DESC, ethiopian_day DESC LIMIT 100`;
        
        const result = await pool.query(query, params);
        
        attendanceData.push(...result.rows.map(row => ({
          ...row,
          ward: ward.student_name,
          class: ward.class
        })));
      } catch (error) {
        console.warn(`Error fetching attendance for ${ward.student_name}:`, error.message);
      }
    }
    
    // Calculate statistics
    const stats = {
      total: attendanceData.length,
      present: attendanceData.filter(a => a.status === 'PRESENT').length,
      absent: attendanceData.filter(a => a.status === 'ABSENT').length,
      late: attendanceData.filter(a => a.status === 'LATE').length
    };
    
    stats.percentage = stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : 0;
    
    res.json({
      success: true,
      data: {
        wards: wards,
        attendance: attendanceData,
        stats: stats
      }
    });
  } catch (error) {
    console.error('Error fetching guardian attendance:', error);
    res.status(500).json({ error: 'Failed to fetch guardian attendance', details: error.message });
  }
});

module.exports = router;
