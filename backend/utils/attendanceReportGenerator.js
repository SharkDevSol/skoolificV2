const pool = require('../config/db');

/**
 * Generate attendance report data for a student
 * @param {string} className - Class name
 * @param {string} schoolId - Student school ID
 * @param {string} year - Year (YYYY)
 * @param {string} month - Month (MM)
 * @returns {Object} Report data
 */
async function generateAttendanceReport(className, schoolId, year, month) {
  try {
    const schemaName = `class_${className.replace(/\s+/g, '_')}_weekly_attendance`;
    
    // Check if schema exists
    const schemaExists = await pool.query(`
      SELECT 1 FROM information_schema.schemata WHERE schema_name = $1
    `, [schemaName]);

    if (schemaExists.rows.length === 0) {
      throw new Error('Attendance schema not found');
    }

    // Get student info
    const studentInfo = await pool.query(`
      SELECT student_name, class, school_id, class_id, guardian_name, guardian_phone
      FROM classes_schema."${className.replace(/\s+/g, '_')}"
      WHERE school_id = $1::text AND (is_active = TRUE OR is_active IS NULL)
      LIMIT 1
    `, [String(schoolId)]);

    if (studentInfo.rows.length === 0) {
      throw new Error('Student not found');
    }

    const student = studentInfo.rows[0];

    // Get all tables for the specified month
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
        AND table_name LIKE 'week_' || $2 || '_' || $3 || '%'
      ORDER BY table_name ASC
    `, [schemaName, year, month.padStart(2, '0')]);

    const weeklyData = [];
    let totalPresent = 0, totalAbsent = 0, totalLate = 0, totalDays = 0;

    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      const weekDate = tableName.replace('week_', '').replace(/_/g, '-');
      
      const result = await pool.query(`
        SELECT monday, tuesday, wednesday, thursday, friday, saturday, sunday
        FROM "${schemaName}"."${tableName}"
        WHERE school_id = $1::text
      `, [String(schoolId)]);

      if (result.rows.length > 0) {
        const record = result.rows[0];
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        let weekPresent = 0, weekAbsent = 0, weekLate = 0, weekTotal = 0;
        
        const dayDetails = {};
        days.forEach(day => {
          if (record[day]) {
            weekTotal++;
            totalDays++;
            dayDetails[day] = record[day];
            if (record[day] === 'P') {
              weekPresent++;
              totalPresent++;
            } else if (record[day] === 'A') {
              weekAbsent++;
              totalAbsent++;
            } else if (record[day] === 'L') {
              weekLate++;
              totalLate++;
            }
          }
        });

        weeklyData.push({
          week: weekDate,
          days: dayDetails,
          summary: {
            present: weekPresent,
            absent: weekAbsent,
            late: weekLate,
            total: weekTotal
          }
        });
      }
    }

    const attendancePercentage = totalDays > 0 ? ((totalPresent / totalDays) * 100).toFixed(1) : 0;

    return {
      student: {
        name: student.student_name,
        schoolId: student.school_id,
        classId: student.class_id,
        class: student.class,
        guardianName: student.guardian_name,
        guardianPhone: student.guardian_phone
      },
      period: {
        year,
        month,
        monthName: new Date(year, month - 1).toLocaleString('default', { month: 'long' })
      },
      summary: {
        present: totalPresent,
        absent: totalAbsent,
        late: totalLate,
        total: totalDays,
        percentage: parseFloat(attendancePercentage)
      },
      weeklyData,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating attendance report:', error);
    throw error;
  }
}

module.exports = { generateAttendanceReport };
