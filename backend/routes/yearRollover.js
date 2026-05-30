/**
 * Year Rollover Routes
 * API endpoints for academic year rollover functionality
 */

const express = require('express');
const router = express.Router();
const YearRolloverService = require('../services/YearRolloverService');
const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'skoolific',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
};

/**
 * GET /api/year-rollover/status
 * Get current year status and data counts
 */
router.get('/status', async (req, res) => {
  const service = new YearRolloverService(dbConfig);
  
  try {
    // Get current academic year
    const current = await service.getCurrentAcademicYear();
    
    // Count records
    const studentCount = await service.pool.query('SELECT COUNT(*) FROM students');
    const attendanceCount = await service.pool.query('SELECT COUNT(*) FROM student_attendance');
    const marksCount = await service.pool.query('SELECT COUNT(*) FROM student_marks');
    const paymentsCount = await service.pool.query('SELECT COUNT(*) FROM payments');
    
    // Count archived years
    const archivedCount = await service.pool.query('SELECT COUNT(*) FROM archived_academic_years');
    
    res.json({
      success: true,
      currentYear: {
        academicYear: current.academicYear,
        ethiopianYear: current.ethiopianYear
      },
      currentData: {
        students: parseInt(studentCount.rows[0].count),
        attendance: parseInt(attendanceCount.rows[0].count),
        marks: parseInt(marksCount.rows[0].count),
        payments: parseInt(paymentsCount.rows[0].count)
      },
      archivedYears: parseInt(archivedCount.rows[0].count)
    });
    
  } catch (error) {
    console.error('Error getting year rollover status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    await service.close();
  }
});

/**
 * GET /api/year-rollover/archives
 * List all archived academic years
 */
router.get('/archives', async (req, res) => {
  const service = new YearRolloverService(dbConfig);
  
  try {
    const archives = await service.pool.query(`
      SELECT 
        id,
        academic_year,
        ethiopian_year,
        archive_date,
        total_students,
        total_staff
      FROM archived_academic_years
      ORDER BY ethiopian_year DESC
    `);
    
    res.json({
      success: true,
      archives: archives.rows
    });
    
  } catch (error) {
    console.error('Error listing archives:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    await service.close();
  }
});

/**
 * GET /api/year-rollover/archives/:id
 * Get detailed information for a specific archive
 */
router.get('/archives/:id', async (req, res) => {
  const service = new YearRolloverService(dbConfig);
  const archiveId = parseInt(req.params.id);
  
  try {
    // Get archive details
    const archive = await service.pool.query(`
      SELECT * FROM archived_academic_years WHERE id = $1
    `, [archiveId]);
    
    if (archive.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Archive not found'
      });
    }
    
    // Count archived records
    const archivedStudents = await service.pool.query(
      'SELECT COUNT(*) FROM archived_students WHERE archive_year_id = $1',
      [archiveId]
    );
    const archivedAttendance = await service.pool.query(
      'SELECT COUNT(*) FROM archived_attendance WHERE archive_year_id = $1',
      [archiveId]
    );
    const archivedMarks = await service.pool.query(
      'SELECT COUNT(*) FROM archived_marks WHERE archive_year_id = $1',
      [archiveId]
    );
    const archivedPayments = await service.pool.query(
      'SELECT COUNT(*) FROM archived_payments WHERE archive_year_id = $1',
      [archiveId]
    );
    
    res.json({
      success: true,
      archive: archive.rows[0],
      archivedRecords: {
        students: parseInt(archivedStudents.rows[0].count),
        attendance: parseInt(archivedAttendance.rows[0].count),
        marks: parseInt(archivedMarks.rows[0].count),
        payments: parseInt(archivedPayments.rows[0].count)
      }
    });
    
  } catch (error) {
    console.error('Error getting archive details:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    await service.close();
  }
});

/**
 * GET /api/year-rollover/archives/:id/export
 * Export archive data to Excel
 */
router.get('/archives/:id/export', async (req, res) => {
  const service = new YearRolloverService(dbConfig);
  const archiveId = parseInt(req.params.id);
  
  try {
    // Get archive details
    const archive = await service.pool.query(`
      SELECT * FROM archived_academic_years WHERE id = $1
    `, [archiveId]);
    
    if (archive.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Archive not found'
      });
    }
    
    // Get all archived data
    const students = await service.pool.query(
      'SELECT * FROM archived_students WHERE archive_year_id = $1',
      [archiveId]
    );
    const attendance = await service.pool.query(
      'SELECT * FROM archived_attendance WHERE archive_year_id = $1',
      [archiveId]
    );
    const marks = await service.pool.query(
      'SELECT * FROM archived_marks WHERE archive_year_id = $1',
      [archiveId]
    );
    const payments = await service.pool.query(
      'SELECT * FROM archived_payments WHERE archive_year_id = $1',
      [archiveId]
    );
    
    res.json({
      success: true,
      archive: archive.rows[0],
      data: {
        students: students.rows,
        attendance: attendance.rows,
        marks: marks.rows,
        payments: payments.rows
      }
    });
    
  } catch (error) {
    console.error('Error exporting archive:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    await service.close();
  }
});

/**
 * POST /api/year-rollover/execute
 * Execute year rollover
 */
router.post('/execute', async (req, res) => {
  const service = new YearRolloverService(dbConfig);
  const { archivedBy } = req.body;
  
  try {
    // Validate archivedBy
    if (!archivedBy) {
      return res.status(400).json({
        success: false,
        error: 'archivedBy (staff ID) is required'
      });
    }
    
    // Execute year rollover
    const result = await service.runYearRollover(archivedBy);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Year rollover completed successfully',
        data: {
          archiveYearId: result.archiveYearId,
          oldYear: result.oldYear,
          newYear: result.newYear,
          duration: result.duration,
          stats: service.stats,
          errors: service.errors
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        stats: service.stats,
        errors: service.errors
      });
    }
    
  } catch (error) {
    console.error('Error executing year rollover:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    await service.close();
  }
});

module.exports = router;
