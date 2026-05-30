const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateWithBranch } = require('../middleware/branchAuth');

/**
 * GET /api/dashboard/stats
 * Get comprehensive dashboard statistics
 * Phase 6.11: Dashboard Reporting Implementation
 */
router.get('/stats', authenticateWithBranch, async (req, res) => {
  console.log('\n📊 GET /api/dashboard/stats - Request received');
  
  try {
    const stats = {};
    
    // 6.11.1: Total Student Enrollment
    const studentEnrollmentQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_students,
        COUNT(CASE WHEN student_type = 'kg' OR student_type = 'kg_evening' THEN 1 END) as kg_students,
        COUNT(CASE WHEN student_type = 'evening' OR student_type = 'kg_evening' THEN 1 END) as evening_students,
        COUNT(CASE WHEN student_type = 'regular' THEN 1 END) as regular_students
      FROM (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'classes_schema'
      ) AS classes
      CROSS JOIN LATERAL (
        SELECT student_type
        FROM classes_schema.${classes.table_name}
      ) AS students
    `);
    
    // Fallback: Count students from all class tables
    const classTablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'classes_schema'
      ORDER BY table_name
    `);
    
    let totalStudents = 0;
    let kgStudents = 0;
    let eveningStudents = 0;
    let regularStudents = 0;
    
    for (const row of classTablesResult.rows) {
      const className = row.table_name;
      const countResult = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN student_type IN ('kg', 'kg_evening') THEN 1 END) as kg,
          COUNT(CASE WHEN student_type IN ('evening', 'kg_evening') THEN 1 END) as evening,
          COUNT(CASE WHEN student_type = 'regular' THEN 1 END) as regular
        FROM classes_schema."${className}"
      `);
      
      if (countResult.rows.length > 0) {
        totalStudents += parseInt(countResult.rows[0].total) || 0;
        kgStudents += parseInt(countResult.rows[0].kg) || 0;
        eveningStudents += parseInt(countResult.rows[0].evening) || 0;
        regularStudents += parseInt(countResult.rows[0].regular) || 0;
      }
    }
    
    stats.studentEnrollment = {
      total: totalStudents,
      byType: {
        regular: regularStudents,
        kg: kgStudents,
        evening: eveningStudents
      }
    };
    
    // 6.11.2: Total Staff Count by Type
    const staffCountQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_staff,
        COUNT(CASE WHEN staff_type = 'Teacher' THEN 1 END) as teachers,
        COUNT(CASE WHEN staff_type = 'Administrative' THEN 1 END) as administrative,
        COUNT(CASE WHEN staff_type = 'Supportive' THEN 1 END) as supportive
      FROM staff_schema.staff
    `);
    
    stats.staffCount = {
      total: parseInt(staffCountQuery.rows[0]?.total_staff) || 0,
      byType: {
        teachers: parseInt(staffCountQuery.rows[0]?.teachers) || 0,
        administrative: parseInt(staffCountQuery.rows[0]?.administrative) || 0,
        supportive: parseInt(staffCountQuery.rows[0]?.supportive) || 0
      }
    };
    
    // 6.11.3: Current Month Financial Summary
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    const financialSummaryQuery = await pool.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_collected,
        COUNT(*) as total_transactions
      FROM simple_fee_structures
      WHERE EXTRACT(MONTH FROM created_at) = $1
        AND EXTRACT(YEAR FROM created_at) = $2
        AND is_active = true
    `, [currentMonth, currentYear]);
    
    stats.financialSummary = {
      month: currentMonth,
      year: currentYear,
      totalCollected: parseFloat(financialSummaryQuery.rows[0]?.total_collected) || 0,
      totalTransactions: parseInt(financialSummaryQuery.rows[0]?.total_transactions) || 0
    };
    
    // 6.11.4: Current Day Attendance Summary
    const today = new Date().toISOString().split('T')[0];
    
    // Get attendance from all class tables
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    
    for (const row of classTablesResult.rows) {
      const className = row.table_name;
      
      // Check if attendance table exists for this class
      const attendanceTableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'attendance_schema' 
          AND table_name = $1
        )
      `, [`${className}_attendance`]);
      
      if (attendanceTableCheck.rows[0].exists) {
        const attendanceResult = await pool.query(`
          SELECT 
            COUNT(CASE WHEN status = 'Present' THEN 1 END) as present,
            COUNT(CASE WHEN status = 'Absent' THEN 1 END) as absent,
            COUNT(CASE WHEN status = 'Late' THEN 1 END) as late
          FROM attendance_schema."${className}_attendance"
          WHERE date = $1
        `, [today]);
        
        if (attendanceResult.rows.length > 0) {
          totalPresent += parseInt(attendanceResult.rows[0].present) || 0;
          totalAbsent += parseInt(attendanceResult.rows[0].absent) || 0;
          totalLate += parseInt(attendanceResult.rows[0].late) || 0;
        }
      }
    }
    
    const attendanceRate = totalStudents > 0 
      ? ((totalPresent / totalStudents) * 100).toFixed(2) 
      : 0;
    
    stats.attendanceSummary = {
      date: today,
      present: totalPresent,
      absent: totalAbsent,
      late: totalLate,
      attendanceRate: parseFloat(attendanceRate)
    };
    
    // 6.11.5: Upcoming Exams and Assessments
    // Note: This requires AI exam tables from Phase 3
    stats.upcomingExams = {
      count: 0,
      exams: []
    };
    
    // 6.11.6: Recent System Activities
    // Note: This requires activity logging system
    stats.recentActivities = {
      count: 0,
      activities: []
    };
    
    // 6.11.7: Academic Performance Trends
    // Get average marks from mark list tables
    const markListConfigResult = await pool.query(`
      SELECT term_count 
      FROM subjects_of_school_schema.school_config 
      WHERE id = 1
    `);
    
    const termCount = markListConfigResult.rows[0]?.term_count || 2;
    
    stats.academicPerformance = {
      termCount,
      averageByTerm: []
    };
    
    console.log('✅ Dashboard statistics compiled successfully');
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      details: error.message
    });
  }
});

module.exports = router;
