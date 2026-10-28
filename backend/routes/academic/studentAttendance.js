const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { getEthiopianDayOfWeek, getCurrentEthiopianDate } = require('../../utils/ethiopianCalendar');
const { syncWeeklyGrid } = require('../../services/weeklyAttendanceSync');
const { getEndpointPath, API_ENDPOINTS } = require('../../config/api.config');

let branchAuth = null;
try {
  branchAuth = require('../../middleware/branchAuth');
} catch (err) {}

const branchMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && branchAuth && branchAuth.authenticateWithBranch) {
    return branchAuth.authenticateWithBranch(req, res, next);
  }
  if (branchAuth && branchAuth.validateBranchCode) {
    return branchAuth.validateBranchCode(req, res, next);
  }
  next();
};

router.use(branchMiddleware);

const getDb = (req) => req.branchPool || pool;

// Helper function to calculate week number from day
const getWeekNumber = (day) => {
  return Math.ceil(day / 7);
};

// Attendance status -> short code used by the weekly attendance grid
const statusToShortCode = {
  PRESENT: 'P',
  ABSENT: 'A',
  LATE: 'L',
  LEAVE: 'E',
};

// Get all students from all class tables
const getAllStudents = async (db, className = null, studentType = null) => {
  try {
    // Get all class tables
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'classes_schema'
      ORDER BY table_name
    `);

    let allStudents = [];

    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      
      // Skip if className filter is provided and doesn't match
      if (className && tableName !== className) {
        continue;
      }

      // Check if is_active column exists
      const columnCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'classes_schema' 
          AND table_name = $1 
          AND column_name IN ('is_active', 'student_type', 'is_kg', 'is_evening_class')
      `, [tableName]);
      
      const hasIsActive = columnCheck.rows.some(row => row.column_name === 'is_active');
      const hasStudentType = columnCheck.rows.some(row => row.column_name === 'student_type');
      const hasIsKg = columnCheck.rows.some(row => row.column_name === 'is_kg');
      const hasIsEvening = columnCheck.rows.some(row => row.column_name === 'is_evening_class');

      let whereClause = hasIsActive ? 'WHERE (is_active = TRUE OR is_active IS NULL)' : 'WHERE 1=1';

      // Apply student type filter if provided
      if (studentType && studentType !== 'all') {
        if (hasStudentType) {
          whereClause += ` AND student_type = '${studentType}'`;
        } else if (hasIsKg && hasIsEvening) {
          // Fallback to individual columns
          if (studentType === 'kg') {
            whereClause += ` AND is_kg = TRUE AND is_evening_class = FALSE`;
          } else if (studentType === 'evening') {
            whereClause += ` AND is_evening_class = TRUE AND is_kg = FALSE`;
          } else if (studentType === 'kg_evening') {
            whereClause += ` AND is_kg = TRUE AND is_evening_class = TRUE`;
          } else if (studentType === 'regular') {
            whereClause += ` AND (is_kg = FALSE OR is_kg IS NULL) AND (is_evening_class = FALSE OR is_evening_class IS NULL)`;
          }
        }
      }

      // Build SELECT clause with optional columns
      let selectClause = `
        CAST(school_id AS VARCHAR) as student_id,
        CAST(class_id AS VARCHAR) as class_id,
        student_name,
        smachine_id,
        age,
        gender
      `;

      if (hasStudentType) {
        selectClause += `, student_type`;
      }
      if (hasIsKg) {
        selectClause += `, is_kg`;
      }
      if (hasIsEvening) {
        selectClause += `, is_evening_class`;
      }

      // Get students with all their details
      const studentsResult = await db.query(`
        SELECT 
          ${selectClause},
          '${tableName}' as class_name
        FROM classes_schema."${tableName}"
        ${whereClause}
        ORDER BY student_name
      `);

      allStudents = allStudents.concat(studentsResult.rows);
    }

    return allStudents;
  } catch (error) {
    console.error('Error getting students:', error);
    throw error;
  }
};

// GET /api/academic/student-attendance/weekly
// Get weekly attendance for a specific week, year, and optional class
router.get('/weekly', async (req, res) => {
  try {
    const { week, year, month, class: className } = req.query;

    if (!week || !year || !month) {
      return res.status(400).json({ error: 'Week, year, and month are required' });
    }

    const weekNum = parseInt(week);
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    // Check if ethiopian_year column exists
    const columnCheck = await getDb(req).query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'academic_student_attendance' 
        AND column_name IN ('ethiopian_year', 'ethiopian_month', 'week_number')
    `);
    
    const existingColumns = columnCheck.rows.map(r => r.column_name);
    const hasEthiopianColumns = existingColumns.includes('ethiopian_year');

    // Build query based on available columns
    let query, params;
    
    if (hasEthiopianColumns) {
      // Use Ethiopian calendar columns
      query = `
        SELECT * FROM academic_student_attendance
        WHERE ethiopian_year = $1 
          AND ethiopian_month = $2 
          AND week_number = $3
      `;
      params = [yearNum, monthNum, weekNum];
    } else {
      // Fallback: use date-based query
      // This is a temporary solution - ideally add the columns
      query = `
        SELECT * FROM academic_student_attendance
        WHERE date >= CURRENT_DATE - INTERVAL '7 days'
      `;
      params = [];
    }

    if (className) {
      query += ` AND class_name = $${params.length + 1}`;
      params.push(className);
    }

    query += ` ORDER BY student_name, ethiopian_day`;

    const result = await getDb(req).query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching weekly attendance:', error);
    res.status(500).json({ error: 'Failed to fetch weekly attendance' });
  }
});

// GET /api/academic/student-attendance/monthly — all attendance records for a month
router.get('/monthly', async (req, res) => {
  try {
    const { year, month, class: className } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    let query = `
      SELECT * FROM academic_student_attendance
      WHERE ethiopian_year = $1 AND ethiopian_month = $2
    `;
    const params = [yearNum, monthNum];

    if (className) {
      query += ` AND class_name = $${params.length + 1}`;
      params.push(className);
    }

    query += ` ORDER BY student_name, ethiopian_day`;

    const result = await getDb(req).query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching monthly attendance:', error);
    res.status(500).json({ error: 'Failed to fetch monthly attendance' });
  }
});

// POST /api/academic/student-attendance/check-in
// Create a check-in record for a student
router.post('/check-in', async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      className,
      smachineId,
      ethYear,
      ethMonth,
      ethDay,
      checkInTime,
      status = 'PRESENT',
      notes = null
    } = req.body;

    if (!studentId || !studentName || !className || !ethYear || !ethMonth || !ethDay || !checkInTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const weekNumber = getWeekNumber(ethDay);
    const dayOfWeek = getEthiopianDayOfWeek(ethYear, ethMonth, ethDay);

    // Get shift assignment for this class
    let shiftNumber = 1;
    const shiftResult = await getDb(req).query(
      'SELECT shift_number FROM academic_class_shift_assignment WHERE class_name = $1',
      [className]
    );
    
    if (shiftResult.rows.length > 0) {
      shiftNumber = shiftResult.rows[0].shift_number;
    }

    // Get shift-specific time settings and auto-calculate status
    const settingsResult = await getDb(req).query(
      'SELECT shift1_late_threshold, shift2_late_threshold FROM academic_student_attendance_settings ORDER BY id DESC LIMIT 1'
    );

    let calculatedStatus = status;
    
    if (settingsResult.rows.length > 0) {
      const lateThreshold = shiftNumber === 2 
        ? settingsResult.rows[0].shift2_late_threshold 
        : settingsResult.rows[0].shift1_late_threshold;
      
      const checkInTimeOnly = checkInTime.substring(0, 5); // HH:MM
      const lateThresholdOnly = lateThreshold.substring(0, 5); // HH:MM
      
      if (checkInTimeOnly > lateThresholdOnly) {
        calculatedStatus = 'LATE';
      } else {
        calculatedStatus = 'PRESENT';
      }
    }

    // Insert or update attendance record
    const result = await getDb(req).query(`
      INSERT INTO academic_student_attendance (
        student_id, student_name, class_name, smachine_id,
        ethiopian_year, ethiopian_month, ethiopian_day,
        day_of_week, week_number, check_in_time, status, notes, shift_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (student_id, class_name, ethiopian_year, ethiopian_month, ethiopian_day)
      DO UPDATE SET
        check_in_time = EXCLUDED.check_in_time,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        shift_number = EXCLUDED.shift_number,
        updated_at = NOW()
      RETURNING *
    `, [
      studentId, studentName, className, smachineId,
      ethYear, ethMonth, ethDay,
      dayOfWeek, weekNumber, checkInTime, calculatedStatus, notes, shiftNumber
    ]);

    // Mirror the check-in into the class teacher's weekly grid (staff app).
    await syncWeeklyGrid(getDb(req), {
      className, studentId, ethYear, ethMonth, ethDay, status: calculatedStatus,
    });

    // Notify the guardian when the admin marks the student ABSENT or LATE
    // (only when the status actually changed, to avoid notification spam).
    try {
      const newStatus = String(calculatedStatus || '').toUpperCase();
      const prevStatus = String(existingRecord.rows[0] && existingRecord.rows[0].status || '').toUpperCase();
      if ((newStatus === 'ABSENT' || newStatus === 'LATE') && newStatus !== prevStatus) {
        const st = await getDb(req).query(
          'SELECT student_name, guardian_username FROM classes_schema."' + className + '" WHERE school_id::text = $1 LIMIT 1',
          [String(studentId)]
        );
        const row = st.rows[0];
        if (row && row.guardian_username) {
          const { notifyGuardianPush } = require('../../services/guardianPush');
          notifyGuardianPush(
            row.guardian_username,
            newStatus === 'ABSENT' ? 'Attendance Alert: Absent' : 'Attendance Alert: Late',
            newStatus === 'ABSENT'
              ? 'Attention: ' + row.student_name + ' was marked ABSENT.'
              : 'Notice: ' + row.student_name + ' arrived LATE.',
            {
              type: 'attendance',
              status: newStatus === 'ABSENT' ? 'absent' : 'late',
              studentName: row.student_name,
              student_name: row.student_name,
              studentId: String(studentId),
              school_id: String(studentId),
              className: className,
              date: ethYear + '-' + ethMonth + '-' + ethDay,
            }
          ).catch((e) => console.warn('admin attendance push error:', e.message));
        }
      }
    } catch (_) {}

    res.json({
      success: true,
      message: 'Check-in recorded successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error recording check-in:', error);
    res.status(500).json({ error: 'Failed to record check-in' });
  }
});

// GET /api/academic/student-attendance/summary
// Get weekly summary statistics
router.get('/summary', async (req, res) => {
  try {
    const { week, year, month, class: className } = req.query;

    if (!week || !year || !month) {
      return res.status(400).json({ error: 'Week, year, and month are required' });
    }

    const weekNum = parseInt(week);
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    let query = `
      SELECT 
        status,
        COUNT(*) as count
      FROM academic_student_attendance
      WHERE ethiopian_year = $1 
        AND ethiopian_month = $2 
        AND week_number = $3
    `;
    
    const params = [yearNum, monthNum, weekNum];

    if (className) {
      query += ` AND class_name = $4`;
      params.push(className);
    }

    query += ` GROUP BY status`;

    const result = await getDb(req).query(query, params);

    // Format the response
    const summary = {
      present: 0,
      absent: 0,
      leave: 0,
      total: 0
    };

    result.rows.forEach(row => {
      const status = row.status.toLowerCase();
      const count = parseInt(row.count);
      
      if (status === 'present') summary.present = count;
      else if (status === 'absent') summary.absent = count;
      else if (status === 'leave') summary.leave = count;
      
      summary.total += count;
    });

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// GET /api/academic/student-attendance/students
// Get all students for a specific class or all classes
router.get('/students', async (req, res) => {
  try {
    const { class: className, studentType } = req.query;

    const students = await getAllStudents(getDb(req), className, studentType);

    res.json({
      success: true,
      data: students
    });

  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// GET /api/academic/student-attendance/classes
// Get all available classes
router.get('/classes', async (req, res) => {
  try {
    const result = await getDb(req).query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'classes_schema'
      ORDER BY table_name
    `);

    const classes = result.rows.map(row => row.table_name);

    res.json({
      success: true,
      data: classes
    });

  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// GET /api/academic/student-attendance/current-date
// Get current Ethiopian date
router.get('/current-date', async (req, res) => {
  try {
    const currentDate = getCurrentEthiopianDate();
    
    res.json({
      success: true,
      data: {
        year: currentDate.year,
        month: currentDate.month,
        day: currentDate.day,
        weekNumber: getWeekNumber(currentDate.day)
      }
    });

  } catch (error) {
    console.error('Error getting current date:', error);
    res.status(500).json({ error: 'Failed to get current date' });
  }
});

// GET /api/academic/student-attendance/day-of-week
// Get day of week for a specific Ethiopian date
router.get('/day-of-week', async (req, res) => {
  try {
    const { year, month, day } = req.query;
    
    if (!year || !month || !day) {
      return res.status(400).json({ error: 'Year, month, and day are required' });
    }

    const dayOfWeek = getEthiopianDayOfWeek(
      parseInt(year),
      parseInt(month),
      parseInt(day)
    );

    res.json({
      success: true,
      data: {
        year: parseInt(year),
        month: parseInt(month),
        day: parseInt(day),
        dayOfWeek
      }
    });

  } catch (error) {
    console.error('Error getting day of week:', error);
    res.status(500).json({ error: 'Failed to get day of week' });
  }
});

// GET /api/academic/student-attendance/generate-weeks
// Generate all school weeks for a year (OPTIMIZED - runs on backend)
router.get('/generate-weeks', async (req, res) => {
  try {
    const { year, schoolDays } = req.query;
    
    if (!year) {
      return res.status(400).json({ error: 'Year is required' });
    }

    const yearNum = parseInt(year);
    const daysArray = schoolDays ? schoolDays.split(',') : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    console.log(`Generating school weeks for year ${yearNum} with school days:`, daysArray);
    
    const weeks = [];
    let currentMonth = 1;
    let currentDay = 1;
    let weekNumber = 1;
    let daysChecked = 0;
    const maxDays = 365;

    while (daysChecked < maxDays && weekNumber <= 52) {
      // Get day of week for current date
      const dayOfWeek = getEthiopianDayOfWeek(yearNum, currentMonth, currentDay);

      if (dayOfWeek === 'Monday') {
        // Found a Monday! Build a school week from here
        const weekDays = [];
        let tempMonth = currentMonth;
        let tempDay = currentDay;
        let schoolDaysCollected = 0;
        let daysScanned = 0;

        while (schoolDaysCollected < daysArray.length && daysScanned < 14) {
          const dow = getEthiopianDayOfWeek(yearNum, tempMonth, tempDay);
          
          if (daysArray.includes(dow)) {
            weekDays.push({
              year: yearNum,
              month: tempMonth,
              day: tempDay,
              dayOfWeek: dow
            });
            schoolDaysCollected++;
          }

          // Move to next day
          tempDay++;
          daysScanned++;
          const daysInMonth = tempMonth === 13 ? 5 : 30;
          if (tempDay > daysInMonth) {
            tempDay = 1;
            tempMonth++;
            if (tempMonth > 13) {
              break; // Stop at year boundary
            }
          }
        }

        if (weekDays.length > 0) {
          const firstDay = weekDays[0];
          const lastDay = weekDays[weekDays.length - 1];
          
          weeks.push({
            id: `week-${weekNumber}`,
            weekNumber,
            label: `${firstDay.day}/${firstDay.month} - ${lastDay.day}/${lastDay.month}`,
            days: weekDays
          });
          
          weekNumber++;
        }

        // Jump ahead by approximately 7 days to find next Monday
        currentDay += 7;
      } else {
        currentDay++;
      }

      // Handle month/year transitions
      const daysInMonth = currentMonth === 13 ? 5 : 30;
      if (currentDay > daysInMonth) {
        currentDay -= daysInMonth;
        currentMonth++;
        if (currentMonth > 13) {
          break; // Stop at year boundary
        }
      }

      daysChecked++;
    }

    console.log(`Generated ${weeks.length} school weeks for year ${yearNum}`);

    res.json({
      success: true,
      data: {
        year: yearNum,
        weeks,
        totalWeeks: weeks.length
      }
    });

  } catch (error) {
    console.error('Error generating weeks:', error);
    res.status(500).json({ error: 'Failed to generate weeks' });
  }
});

// POST /api/academic/student-attendance/mark-absent
// Manually trigger auto-absent marker
router.post('/mark-absent', async (req, res) => {
  try {
    const { markAbsentStudents } = require('../../services/studentAttendanceAutoMarker');
    
    const result = await markAbsentStudents();
    
    res.json(result);

  } catch (error) {
    console.error('Error running auto-marker:', error);
    res.status(500).json({ error: 'Failed to run auto-marker' });
  }
});

// GET /api/academic/student-attendance/settings
// Get attendance time settings
router.get('/settings', async (req, res) => {
  try {
    let result = await getDb(req).query('SELECT * FROM academic_student_attendance_settings ORDER BY id DESC LIMIT 1');
    
    if (result.rows.length === 0) {
      // Auto-insert default settings if table is empty
      await getDb(req).query(`
        INSERT INTO academic_student_attendance_settings (
          check_in_start_time, check_in_end_time, late_threshold_time, absent_marking_time,
          shift1_check_in_start, shift1_check_in_end, shift1_late_threshold, shift1_absent_marking,
          shift2_check_in_start, shift2_check_in_end, shift2_late_threshold, shift2_absent_marking,
          school_days, auto_absent_enabled
        ) VALUES (
          '07:00:00', '08:30:00', '08:00:00', '09:00:00',
          '07:00:00', '08:30:00', '08:00:00', '09:00:00',
          '12:00:00', '13:30:00', '13:00:00', '14:00:00',
          ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], true
        )
      `);
      result = await getDb(req).query('SELECT * FROM academic_student_attendance_settings ORDER BY id DESC LIMIT 1');
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/academic/student-attendance/settings
// Update attendance time settings
router.put('/settings', async (req, res) => {
  try {
    const {
      check_in_start_time,
      check_in_end_time,
      late_threshold_time,
      absent_marking_time,
      shift1_check_in_start,
      shift1_check_in_end,
      shift1_late_threshold,
      shift1_absent_marking,
      shift2_check_in_start,
      shift2_check_in_end,
      shift2_late_threshold,
      shift2_absent_marking,
      school_days,
      auto_absent_enabled
    } = req.body;

    const DAY_MAP = {
      monday: 1, mon: 1, '1': 1,
      tuesday: 2, tue: 2, '2': 2,
      wednesday: 3, wed: 3, '3': 3,
      thursday: 4, thu: 4, '4': 4,
      friday: 5, fri: 5, '5': 5,
      saturday: 6, sat: 6, '6': 6,
      sunday: 7, sun: 7, '7': 7
    };
    const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    let normalizedDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    let numericDayIndices = [1, 2, 3, 4, 5];

    if (Array.isArray(school_days) && school_days.length > 0) {
      numericDayIndices = Array.from(new Set(
        school_days.map(d => {
          if (typeof d === 'number') return (d >= 1 && d <= 7) ? d : null;
          if (typeof d === 'string') return DAY_MAP[d.trim().toLowerCase()] || null;
          return null;
        }).filter(Boolean)
      )).sort((a, b) => a - b);
      normalizedDayNames = numericDayIndices.map(d => DAY_NAMES[d]).filter(Boolean);
    }

    let result = await getDb(req).query(`
      UPDATE academic_student_attendance_settings
      SET 
        check_in_start_time = COALESCE($1, check_in_start_time),
        check_in_end_time = COALESCE($2, check_in_end_time),
        late_threshold_time = COALESCE($3, late_threshold_time),
        absent_marking_time = COALESCE($4, absent_marking_time),
        shift1_check_in_start = COALESCE($5, shift1_check_in_start),
        shift1_check_in_end = COALESCE($6, shift1_check_in_end),
        shift1_late_threshold = COALESCE($7, shift1_late_threshold),
        shift1_absent_marking = COALESCE($8, shift1_absent_marking),
        shift2_check_in_start = COALESCE($9, shift2_check_in_start),
        shift2_check_in_end = COALESCE($10, shift2_check_in_end),
        shift2_late_threshold = COALESCE($11, shift2_late_threshold),
        shift2_absent_marking = COALESCE($12, shift2_absent_marking),
        school_days = $13,
        auto_absent_enabled = COALESCE($14, auto_absent_enabled),
        updated_at = NOW()
      WHERE id = (SELECT id FROM academic_student_attendance_settings ORDER BY id DESC LIMIT 1)
      RETURNING *
    `, [
      check_in_start_time,
      check_in_end_time,
      late_threshold_time,
      absent_marking_time,
      shift1_check_in_start,
      shift1_check_in_end,
      shift1_late_threshold,
      shift1_absent_marking,
      shift2_check_in_start,
      shift2_check_in_end,
      shift2_late_threshold,
      shift2_absent_marking,
      normalizedDayNames,
      auto_absent_enabled
    ]);

    if (result.rows.length === 0) {
      result = await getDb(req).query(`
        INSERT INTO academic_student_attendance_settings (
          check_in_start_time, check_in_end_time, late_threshold_time, absent_marking_time,
          shift1_check_in_start, shift1_check_in_end, shift1_late_threshold, shift1_absent_marking,
          shift2_check_in_start, shift2_check_in_end, shift2_late_threshold, shift2_absent_marking,
          school_days, auto_absent_enabled
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) RETURNING *
      `, [
        check_in_start_time || '07:00:00',
        check_in_end_time || '08:30:00',
        late_threshold_time || '08:00:00',
        absent_marking_time || '09:00:00',
        shift1_check_in_start || '07:00:00',
        shift1_check_in_end || '08:30:00',
        shift1_late_threshold || '08:00:00',
        shift1_absent_marking || '09:00:00',
        shift2_check_in_start || '12:00:00',
        shift2_check_in_end || '13:30:00',
        shift2_late_threshold || '13:00:00',
        shift2_absent_marking || '14:00:00',
        normalizedDayNames,
        auto_absent_enabled !== undefined ? auto_absent_enabled : true
      ]);
    }

    // Sync numeric school_days to schedule_schema.school_config
    if (numericDayIndices && numericDayIndices.length > 0) {
      try {
        await getDb(req).query(`
          UPDATE schedule_schema.school_config
          SET school_days = $1, teaching_days_per_week = $2, updated_at = CURRENT_TIMESTAMP
          WHERE id = 1
        `, [numericDayIndices, numericDayIndices.length]);
      } catch (syncErr) {
        console.warn('Could not sync school_days to schedule_schema.school_config:', syncErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// PUT /api/academic/student-attendance/update
// Update attendance record manually
router.put('/update', async (req, res) => {
  try {
    const {
      studentId,
      className,
      ethYear,
      ethMonth,
      ethDay,
      status,
      checkInTime,
      notes
    } = req.body;

    if (!studentId || !className || !ethYear || !ethMonth || !ethDay || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get shift assignment for this class
    let shiftNumber = 1;
    const shiftResult = await getDb(req).query(
      'SELECT shift_number FROM academic_class_shift_assignment WHERE class_name = $1',
      [className]
    );
    
    if (shiftResult.rows.length > 0) {
      shiftNumber = shiftResult.rows[0].shift_number;
    }

    // Get shift-specific time settings
    const settingsResult = await getDb(req).query(
      'SELECT shift1_late_threshold, shift2_late_threshold FROM academic_student_attendance_settings ORDER BY id DESC LIMIT 1'
    );

    // Auto-calculate correct status based on check-in time and shift
    let calculatedStatus = status;
    
    if ((status === 'PRESENT' || status === 'LATE') && checkInTime && settingsResult.rows.length > 0) {
      const lateThreshold = shiftNumber === 2 
        ? settingsResult.rows[0].shift2_late_threshold 
        : settingsResult.rows[0].shift1_late_threshold;
      
      const checkInTimeOnly = checkInTime.substring(0, 5); // HH:MM
      const lateThresholdOnly = lateThreshold.substring(0, 5); // HH:MM
      
      if (checkInTimeOnly > lateThresholdOnly) {
        calculatedStatus = 'LATE';
        console.log(`Auto-corrected status to LATE: check-in ${checkInTimeOnly} > threshold ${lateThresholdOnly} (Shift ${shiftNumber})`);
      } else {
        calculatedStatus = 'PRESENT';
        console.log(`Status confirmed as PRESENT: check-in ${checkInTimeOnly} <= threshold ${lateThresholdOnly} (Shift ${shiftNumber})`);
      }
    }

    // Check if record exists
    const existingRecord = await getDb(req).query(`
      SELECT * FROM academic_student_attendance
      WHERE student_id = $1 
        AND class_name = $2 
        AND ethiopian_year = $3 
        AND ethiopian_month = $4 
        AND ethiopian_day = $5
    `, [studentId, className, ethYear, ethMonth, ethDay]);

    let result;

    if (existingRecord.rows.length > 0) {
      // Update existing record
      result = await getDb(req).query(`
        UPDATE academic_student_attendance
        SET 
          status = $1,
          check_in_time = $2,
          notes = $3,
          shift_number = $4,
          updated_at = NOW()
        WHERE student_id = $5 
          AND class_name = $6 
          AND ethiopian_year = $7 
          AND ethiopian_month = $8 
          AND ethiopian_day = $9
        RETURNING *
      `, [calculatedStatus, checkInTime, notes, shiftNumber, studentId, className, ethYear, ethMonth, ethDay]);
    } else {
      // Create new record
      const weekNumber = getWeekNumber(ethDay);
      const dayOfWeek = getEthiopianDayOfWeek(ethYear, ethMonth, ethDay);

      // Get student details
      const studentResult = await getDb(req).query(`
        SELECT student_name, smachine_id
        FROM classes_schema."${className}"
        WHERE CAST(school_id AS VARCHAR) = $1
          AND (is_active = TRUE OR is_active IS NULL)
      `, [studentId]);

      if (studentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const student = studentResult.rows[0];

      result = await getDb(req).query(`
        INSERT INTO academic_student_attendance (
          student_id, student_name, class_name, smachine_id,
          ethiopian_year, ethiopian_month, ethiopian_day,
          day_of_week, week_number, check_in_time, status, notes, shift_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        studentId, student.student_name, className, student.smachine_id,
        ethYear, ethMonth, ethDay,
        dayOfWeek, weekNumber, checkInTime, calculatedStatus, notes, shiftNumber
      ]);
    }

    // Mirror the mark into the class teacher's weekly grid so the staff app
    // shows the same attendance as this page.
    await syncWeeklyGrid(getDb(req), {
      className, studentId, ethYear, ethMonth, ethDay, status: calculatedStatus,
    });

    res.json({
      success: true,
      message: 'Attendance updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

// GET /api/academic/student-attendance/class-shifts
// Get class shift assignments
router.get('/class-shifts', async (req, res) => {
  try {
    await getDb(req).query(`
      ALTER TABLE academic_class_shift_assignment ADD COLUMN IF NOT EXISTS is_kg BOOLEAN DEFAULT false;
      ALTER TABLE academic_class_shift_assignment ADD COLUMN IF NOT EXISTS is_evening BOOLEAN DEFAULT false;
    `);

    const result = await getDb(req).query(`
      SELECT class_name, shift_number, is_kg, is_evening, created_at, updated_at
      FROM academic_class_shift_assignment
      ORDER BY class_name
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching class shift assignments:', error);
    res.status(500).json({ error: 'Failed to fetch class shift assignments' });
  }
});

// PUT /api/academic/student-attendance/class-shifts
// Update class shift assignments
router.put('/class-shifts', async (req, res) => {
  try {
    const { assignments } = req.body;

    if (!assignments || typeof assignments !== 'object') {
      return res.status(400).json({ error: 'Invalid assignments data' });
    }

    // Update each class assignment
    const promises = Object.entries(assignments).map(([className, shiftNumber]) => {
      return getDb(req).query(`
        INSERT INTO academic_class_shift_assignment (class_name, shift_number, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (class_name) 
        DO UPDATE SET shift_number = $2, updated_at = NOW()
      `, [className, shiftNumber]);
    });

    await Promise.all(promises);

    res.json({
      success: true,
      message: 'Class shift assignments updated successfully'
    });

  } catch (error) {
    console.error('Error updating class shift assignments:', error);
    res.status(500).json({ error: 'Failed to update class shift assignments' });
  }
});

// PUT /api/academic/student-attendance/class-configs
// Save class configs (shift, isKG, isEvening) from Attendance Time Settings
router.put('/class-configs', async (req, res) => {
  try {
    const { classConfigs } = req.body;

    if (!classConfigs || typeof classConfigs !== 'object') {
      return res.status(400).json({ error: 'Invalid classConfigs data' });
    }

    const db = getDb(req);

    // Ensure table has is_kg / is_evening columns
    await db.query(`
      ALTER TABLE academic_class_shift_assignment ADD COLUMN IF NOT EXISTS is_kg BOOLEAN DEFAULT false;
      ALTER TABLE academic_class_shift_assignment ADD COLUMN IF NOT EXISTS is_evening BOOLEAN DEFAULT false;
    `);

    const promises = Object.entries(classConfigs).map(([className, cfg]) => {
      const shift = cfg.shift || cfg.shift_number || 1;
      const isKG = cfg.isKG || false;
      const isEvening = cfg.isEvening || false;
      return db.query(`
        INSERT INTO academic_class_shift_assignment (class_name, shift_number, is_kg, is_evening, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (class_name)
        DO UPDATE SET shift_number = $2, is_kg = $3, is_evening = $4, updated_at = NOW()
      `, [className, shift, isKG, isEvening]);
    });

    await Promise.all(promises);

    res.json({
      success: true,
      message: 'Class configs updated successfully'
    });

  } catch (error) {
    console.error('Error updating class configs:', error);
    res.status(500).json({ error: 'Failed to update class configs' });
  }
});

module.exports = router;
