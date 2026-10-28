const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { getEndpointPath, API_ENDPOINTS } = require('../config/api.config');

const dbManager = require('../services/DatabaseConnectionManager');
const jwt = require('jsonwebtoken');
const { convertToEthiopian } = require('../utils/ethiopianCalendar');

// Helper to get branch-specific database pool
const getDbPool = async (req) => {
  if (req && req.branchPool) return req.branchPool;

  // 1. Check x-branch-code / X-Branch-Code header or query param
  let branchCode = req?.headers?.['x-branch-code'] || req?.headers?.['X-Branch-Code'] || req?.headers?.['branchcode'] || req?.query?.branchCode;

  // 2. Check JWT token in authorization header
  if (!branchCode && req?.headers?.authorization) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.decode(token);
      if (decoded && (decoded.branchCode || decoded.branch_code)) {
        branchCode = decoded.branchCode || decoded.branch_code;
      }
    } catch (_) {}
  }

  // 3. Check Host header (e.g. bilal.skoolific.com -> 'BILAL')
  if (!branchCode && req?.headers?.host) {
    const host = req.headers.host.toLowerCase();
    if (host.includes('bilal')) {
      branchCode = 'BILAL';
    }
  }

  if (branchCode && dbManager) {
    try {
      return await dbManager.getPool(branchCode.toUpperCase());
    } catch (e) {
      console.warn(`[ClassTeacher] Could not get pool for branch "${branchCode}":`, e.message);
    }
  }
  return pool;
};

// Initialize class_teachers table on the given database
const ensureClassTeachersTable = async (db) => {
  try {
    await db.query('CREATE SCHEMA IF NOT EXISTS school_schema_points');
    await db.query(`
      CREATE TABLE IF NOT EXISTS school_schema_points.class_teachers (
        id SERIAL PRIMARY KEY,
        global_staff_id INTEGER NOT NULL,
        teacher_name VARCHAR(100) NOT NULL,
        assigned_class VARCHAR(100) NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(assigned_class)
      )
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_class_teachers_staff_id 
      ON school_schema_points.class_teachers(global_staff_id)
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_class_teachers_class 
      ON school_schema_points.class_teachers(assigned_class)
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_class_teachers_active 
      ON school_schema_points.class_teachers(is_active)
    `);
  } catch (e) {
    // Table/index might already exist
  }
};

// Also initialize default database on startup
ensureClassTeachersTable(pool);

// Helper to resolve teachers table (either school_schema_points.teachers or staff_teachers.teachers)
const getTeachersTableQuery = async (db) => {
  const check = await db.query(`
    SELECT table_schema FROM information_schema.tables 
    WHERE table_name = 'teachers' 
      AND table_schema IN ('school_schema_points', 'staff_teachers')
    ORDER BY CASE WHEN table_schema = 'school_schema_points' THEN 1 ELSE 2 END
    LIMIT 1
  `);
  if (check.rows.length > 0) {
    const schema = check.rows[0].table_schema;
    if (schema === 'school_schema_points') {
      return {
        table: 'school_schema_points.teachers',
        nameCol: 'teacher_name',
        workTimeCol: 'staff_work_time',
        roleCol: 'role'
      };
    } else {
      return {
        table: 'staff_teachers.teachers',
        nameCol: 'name',
        workTimeCol: 'staff_work_time',
        roleCol: 'role'
      };
    }
  }
  return null;
};

// Get all teachers (for dropdown selection)
router.get('/teachers', async (req, res) => {
  try {
    const db = await getDbPool(req);
    console.log('📥 GET /api/class-teacher/teachers - Fetching teachers...');
    
    const tableMeta = await getTeachersTableQuery(db);
    if (!tableMeta) {
      console.log('⚠️  Teachers table not found');
      return res.json([]);
    }

    // Check if is_active column exists
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = $1 
        AND table_name = 'teachers' 
        AND column_name = 'is_active'
    `, [tableMeta.table.split('.')[0]]);
    
    const hasIsActive = columnCheck.rows.length > 0;
    
    let query = `
      SELECT global_staff_id, ${tableMeta.nameCol} as teacher_name, ${tableMeta.workTimeCol} as staff_work_time, ${tableMeta.roleCol} as role
      FROM ${tableMeta.table}
    `;
    
    if (hasIsActive) {
      query += ' WHERE (is_active = TRUE OR is_active IS NULL)';
    }
    
    query += ` ORDER BY ${tableMeta.nameCol} ASC`;
    
    const result = await db.query(query);
    
    console.log(`✅ Found ${result.rows.length} teacher(s)`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching teachers:', error);
    res.status(500).json({ error: 'Failed to fetch teachers', details: error.message });
  }
});

// Get all classes (for dropdown selection)
router.get('/classes', async (req, res) => {
  try {
    const db = await getDbPool(req);
    console.log('📥 GET /api/class-teacher/classes - Fetching classes...');
    
    const classSet = new Set();
    
    // Source 1: metadata table (school_schema_points.classes)
    try {
      const tableExists = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'school_schema_points' 
          AND table_name = 'classes'
        )
      `);
      if (tableExists.rows[0].exists) {
        const result = await db.query(`
          SELECT class_names FROM school_schema_points.classes WHERE id = 1
        `);
        if (result.rows.length > 0 && result.rows[0].class_names && result.rows[0].class_names.length > 0) {
          result.rows[0].class_names.forEach(c => classSet.add(c));
          console.log(`✅ Found ${result.rows[0].class_names.length} class(es) in school_schema_points.classes`);
        }
      }
    } catch (e) { console.log('Note: metadata classes read failed:', e.message); }
    
    // Source 2: actual tables in classes_schema
    try {
      const fallback = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'classes_schema'
        ORDER BY table_name ASC
      `);
      fallback.rows.forEach(r => classSet.add(r.table_name));
      console.log(`✅ Found ${fallback.rows.length} class(es) from classes_schema`);
    } catch (e) { console.log('Note: classes_schema read failed:', e.message); }
    
    const classList = Array.from(classSet).sort();
    console.log(`✅ Total ${classList.length} unique class(es)`);
    res.json(classList);
  } catch (error) {
    console.error('❌ Error fetching classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes', details: error.message });
  }
});

// Get all class teacher assignments
router.get('/assignments', async (req, res) => {
  try {
    const db = await getDbPool(req);
    await ensureClassTeachersTable(db);
    console.log('📥 GET /api/class-teacher/assignments - Fetching assignments...');
    
    const tableMeta = await getTeachersTableQuery(db);
    let result;
    if (tableMeta) {
      result = await db.query(`
        SELECT ct.*, t.${tableMeta.workTimeCol} as staff_work_time
        FROM school_schema_points.class_teachers ct
        LEFT JOIN ${tableMeta.table} t ON ct.global_staff_id = t.global_staff_id
        WHERE ct.is_active = true
        ORDER BY ct.assigned_class ASC
      `);
    } else {
      result = await db.query(`
        SELECT ct.*, 'Full Time' as staff_work_time
        FROM school_schema_points.class_teachers ct
        WHERE ct.is_active = true
        ORDER BY ct.assigned_class ASC
      `);
    }
    
    console.log(`✅ Found ${result.rows.length} active assignment(s)`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments', details: error.message });
  }
});

// Assign a teacher to a class
router.post('/assign', async (req, res) => {
  const { global_staff_id, teacher_name, assigned_class } = req.body || {};

  console.log('📥 POST /api/class-teacher/assign - Assigning teacher...');
  console.log(`   Teacher: ${teacher_name} (ID: ${global_staff_id})`);
  console.log(`   Class: ${assigned_class}`);

  if (!global_staff_id || !teacher_name || !assigned_class) {
    return res.status(400).json({ error: 'global_staff_id, teacher_name, and assigned_class are required' });
  }

  try {
    const db = await getDbPool(req);
    await ensureClassTeachersTable(db);
    
    // Check if class already has a record (whether currently active or inactive)
    const existing = await db.query(`
      SELECT * FROM school_schema_points.class_teachers 
      WHERE assigned_class = $1
    `, [assigned_class]);

    if (existing.rows.length > 0) {
      console.log(`   ✏️  Updating existing assignment for ${assigned_class} (was: ${existing.rows[0].teacher_name}, active: ${existing.rows[0].is_active})`);
      // Update existing record and reactivate it
      await db.query(`
        UPDATE school_schema_points.class_teachers 
        SET global_staff_id = $1, teacher_name = $2, is_active = true, assigned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE assigned_class = $3
      `, [global_staff_id, teacher_name, assigned_class]);
    } else {
      console.log(`   ➕ Creating new assignment for ${assigned_class}`);
      // Create new assignment with ON CONFLICT protection
      await db.query(`
        INSERT INTO school_schema_points.class_teachers 
        (global_staff_id, teacher_name, assigned_class, is_active, assigned_at, updated_at)
        VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (assigned_class) DO UPDATE 
        SET global_staff_id = EXCLUDED.global_staff_id,
            teacher_name = EXCLUDED.teacher_name,
            is_active = true,
            assigned_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
      `, [global_staff_id, teacher_name, assigned_class]);
    }

    console.log(`✅ ${teacher_name} successfully assigned to ${assigned_class}`);
    res.json({ success: true, message: `${teacher_name} assigned to ${assigned_class}` });
  } catch (error) {
    console.error('❌ Error assigning teacher:', error);
    res.status(500).json({ error: 'Failed to assign teacher', details: error.message });
  }
});

// Remove a class teacher assignment
router.delete('/unassign/:className', async (req, res) => {
  const { className } = req.params;

  try {
    const db = await getDbPool(req);
    await ensureClassTeachersTable(db);
    await db.query(`
      UPDATE school_schema_points.class_teachers 
      SET is_active = false
      WHERE assigned_class = $1
    `, [className]);

    res.json({ success: true, message: `Teacher unassigned from ${className}` });
  } catch (error) {
    console.error('Error unassigning teacher:', error);
    res.status(500).json({ error: 'Failed to unassign teacher', details: error.message });
  }
});

// Check if a teacher is assigned as class teacher (for staff app)
router.get('/check/:globalStaffId', async (req, res) => {
  const { globalStaffId } = req.params;

  try {
    const db = await getDbPool(req);
    await ensureClassTeachersTable(db);
    const result = await db.query(`
      SELECT * FROM school_schema_points.class_teachers 
      WHERE global_staff_id = $1 AND is_active = true
    `, [globalStaffId]);

    if (result.rows.length > 0) {
      res.json({
        isClassTeacher: true,
        assignedClass: result.rows[0].assigned_class,
        assignment: result.rows[0]
      });
    } else {
      res.json({
        isClassTeacher: false,
        assignedClass: null,
        assignment: null
      });
    }
  } catch (error) {
    console.error('Error checking class teacher:', error);
    res.status(500).json({ error: 'Failed to check class teacher status', details: error.message });
  }
});

// Get assignments by teacher name or global staff id
router.get('/teacher-assignment/:teacherName', async (req, res) => {
  const { teacherName } = req.params;

  try {
    const db = await getDbPool(req);
    await ensureClassTeachersTable(db);
    console.log(`📥 GET /api/class-teacher/teacher-assignment/${teacherName}`);
    
    // Support matching by trimmed/case-insensitive name OR numeric staff id
    const result = await db.query(`
      SELECT * FROM school_schema_points.class_teachers 
      WHERE (LOWER(TRIM(teacher_name)) = LOWER(TRIM($1)) OR global_staff_id::text = $1)
        AND is_active = true
      ORDER BY assigned_class ASC
    `, [teacherName]);

    console.log(`✅ Found ${result.rows.length} assignment(s) for ${teacherName}`);
    
    res.json({
      teacherName: teacherName,
      assignments: result.rows
    });
  } catch (error) {
    console.error('Error fetching teacher assignments:', error);
    res.status(500).json({ error: 'Failed to fetch teacher assignments', details: error.message });
  }
});

// Get students for a class (for attendance marking)
router.get('/students/:className', async (req, res) => {
  const { className } = req.params;
  
  try {
    const db = await getDbPool(req);
    console.log(`📥 GET /api/class-teacher/students/${className} - Fetching students...`);
    
    const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
    if (!validTableName) {
      console.error(`❌ Invalid class name: ${className}`);
      return res.status(400).json({ error: 'Invalid class name provided.' });
    }

    // Try to query the table
    try {
      // First check if is_active column exists
      const columnCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'classes_schema' 
        AND table_name = $1 
        AND column_name = 'is_active'
      `, [className]);
      
      const hasIsActive = columnCheck.rows.length > 0;
      
      // Build query based on column existence
      let query = `
        SELECT school_id, class_id, student_name, age, gender, image_student
        FROM classes_schema."${className}"
      `;
      
      if (hasIsActive) {
        query += ' WHERE is_active = TRUE OR is_active IS NULL';
      }
      
      query += ' ORDER BY LOWER(student_name) ASC';
      
      const result = await db.query(query);
      
      console.log(`✅ Found ${result.rows.length} students in ${className}`);
      res.json(result.rows);
    } catch (tableError) {
      // Table might not exist or have different name
      console.error(`❌ Error querying table ${className}:`, tableError.message);
      
      // Try to find similar table names
      const similarTables = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'classes_schema' 
        AND LOWER(table_name) = LOWER($1)
      `, [className]);
      
      if (similarTables.rows.length > 0) {
        const actualTableName = similarTables.rows[0].table_name;
        console.log(`💡 Found similar table: ${actualTableName}`);
        
        // Check if is_active column exists in the actual table
        const columnCheck = await db.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'classes_schema' 
          AND table_name = $1 
          AND column_name = 'is_active'
        `, [actualTableName]);
        
        const hasIsActive = columnCheck.rows.length > 0;
        
        let query = `
          SELECT school_id, class_id, student_name, age, gender, image_student
          FROM classes_schema."${actualTableName}"
        `;
        
        if (hasIsActive) {
          query += ' WHERE is_active = TRUE OR is_active IS NULL';
        }
        
        query += ' ORDER BY LOWER(student_name) ASC';
        
        const result = await db.query(query);
        
        console.log(`✅ Found ${result.rows.length} students in ${actualTableName}`);
        return res.json(result.rows);
      }
      
      // If still not found, return empty array
      console.log(`⚠️  No table found for class: ${className}`);
      return res.json([]);
    }
  } catch (error) {
    console.error(`❌ Error fetching students for ${className}:`, error);
    res.status(500).json({ error: 'Failed to fetch students', details: error.message });
  }
});

// Helper function to get Monday of a week
const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

// Helper function to format date as YYYY-MM-DD
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

// Get school days from schedule config
router.get('/school-days', async (req, res) => {
  try {
    const db = await getDbPool(req);
    // First try to get from attendance settings (primary source)
    try {
      const attendanceResult = await db.query(`
        SELECT school_days FROM academic_student_attendance_settings 
        ORDER BY id DESC LIMIT 1
      `);
      
      if (attendanceResult.rows.length > 0 && attendanceResult.rows[0].school_days) {
        // school_days is stored as string array like ['Monday', 'Tuesday', ...]
        const schoolDays = attendanceResult.rows[0].school_days.map(d => d.toLowerCase());
        const dayMap = { 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6, 'sunday': 7 };
        const schoolDaysNumbers = schoolDays.map(d => dayMap[d]);
        return res.json({ schoolDays, schoolDaysNumbers });
      }
    } catch (attendanceError) {
      console.log('Attendance settings table not found or error, falling back to schedule config:', attendanceError.message);
    }
    
    // Fallback to schedule config
    const result = await db.query(`
      SELECT school_days FROM schedule_schema.school_config WHERE id = 1
    `);
    
    if (result.rows.length > 0 && result.rows[0].school_days) {
      // school_days is stored as integer array (1=Monday, 2=Tuesday, etc.)
      const dayMap = { 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday', 7: 'sunday' };
      const schoolDays = result.rows[0].school_days.map(d => dayMap[d]);
      res.json({ schoolDays, schoolDaysNumbers: result.rows[0].school_days });
    } else {
      // Default to Monday-Friday
      res.json({ 
        schoolDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        schoolDaysNumbers: [1, 2, 3, 4, 5]
      });
    }
  } catch (error) {
    console.error('Error fetching school days:', error);
    // Return default on error
    res.json({ 
      schoolDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      schoolDaysNumbers: [1, 2, 3, 4, 5]
    });
  }
});

// Get weekly attendance tables for a class
router.get('/weekly-tables/:className', async (req, res) => {
  const { className } = req.params;
  
  try {
    const db = await getDbPool(req);
    const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
    if (!validTableName) {
      return res.status(400).json({ error: 'Invalid class name provided.' });
    }

    const schemaName = `class_${className}_weekly_attendance`;
    
    // Check if schema exists
    const schemaExists = await db.query(`
      SELECT 1 FROM information_schema.schemata WHERE schema_name = $1
    `, [schemaName]);

    if (schemaExists.rows.length === 0) {
      return res.json([]);
    }

    // Get all weekly attendance tables
    const result = await db.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = $1
      ORDER BY table_name DESC
    `, [schemaName]);

    res.json(result.rows.map(r => r.table_name));
  } catch (error) {
    console.error('Error fetching weekly tables:', error);
    res.status(500).json({ error: 'Failed to fetch weekly tables', details: error.message });
  }
});

// Create a new weekly attendance record
router.post('/create-weekly-attendance', async (req, res) => {
  const { className, weekStart, globalStaffId } = req.body || {};

  if (!className || !weekStart) {
    return res.status(400).json({ error: 'className and weekStart are required' });
  }

  const db = await getDbPool(req);
  await ensureClassTeachersTable(db);

  // Verify teacher is assigned (lenient — trust authenticated session)
  let teacherName = req.user?.username || 'staff';
  const parsedStaffId = globalStaffId ? parseInt(globalStaffId) : null;
  if (parsedStaffId && parsedStaffId > 0) {
    try {
      const assignment = await db.query(`
        SELECT * FROM school_schema_points.class_teachers 
        WHERE (
          (global_staff_id = $1)
          OR ($3::text IS NOT NULL AND LOWER(TRIM(teacher_name)) = LOWER(TRIM($3)))
        )
        AND LOWER(TRIM(assigned_class)) = LOWER(TRIM($2))
        AND (is_active = true OR is_active IS NULL)
      `, [parsedStaffId, className, req.user?.username || null]);

      if (assignment.rows.length > 0 && assignment.rows[0].teacher_name) {
        teacherName = assignment.rows[0].teacher_name;
      } else if (!req.user?.username) {
        console.log(`⚠️ Create attendance: no class_teachers match for staff ${parsedStaffId} / ${className}, allowing (authenticated session)`);
      }
    } catch (assignErr) {
      console.warn('Class teacher query error (non-fatal):', assignErr.message);
    }
  }

  const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
  if (!validTableName) {
    return res.status(400).json({ error: 'Invalid class name provided.' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const schemaName = `class_${className}_weekly_attendance`;
    const tableName = `week_${weekStart.replace(/-/g, '_')}`;
    
    // Create schema if not exists
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    // Check if table already exists
    const tableExists = await client.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = $2
    `, [schemaName, tableName]);

    if (tableExists.rows.length > 0) {
      await client.query('COMMIT');
      return res.json({ 
        success: true, 
        message: `Attendance for week starting ${weekStart} already exists`,
        tableName 
      });
    }

    // Create weekly attendance table
    await client.query(`
      CREATE TABLE "${schemaName}"."${tableName}" (
        id SERIAL PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL,
        class_id VARCHAR(50) NOT NULL,
        student_name VARCHAR(100) NOT NULL,
        monday VARCHAR(1),
        tuesday VARCHAR(1),
        wednesday VARCHAR(1),
        thursday VARCHAR(1),
        friday VARCHAR(1),
        saturday VARCHAR(1),
        sunday VARCHAR(1),
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_student_${tableName} UNIQUE (school_id, class_id)
      )
    `);

    // Check if is_active column exists in this class table
    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'classes_schema' AND table_name = $1 AND column_name = 'is_active'
    `, [className]);
    const hasIsActive = colCheck.rows.length > 0;

    // Fetch students and populate the table - filter out students with null IDs
    const studentsResult = await client.query(`
      SELECT school_id, class_id, student_name
      FROM classes_schema."${className}"
      WHERE school_id IS NOT NULL AND class_id IS NOT NULL AND student_name IS NOT NULL
        ${hasIsActive ? "AND (is_active = TRUE OR is_active IS NULL)" : ""}
      ORDER BY LOWER(student_name) ASC
    `);

    if (studentsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No valid students found in this class (students must have school_id, class_id, and name)' });
    }

    // Insert students into the weekly attendance table
    let insertedCount = 0;
    for (const student of studentsResult.rows) {
      // Double-check values are not null/undefined
      if (student.school_id && student.class_id && student.student_name) {
        await client.query(`
          INSERT INTO "${schemaName}"."${tableName}" 
          (school_id, class_id, student_name, created_by)
          VALUES ($1, $2, $3, $4)
        `, [
          String(student.school_id), 
          String(student.class_id), 
          String(student.student_name), 
          teacherName
        ]);
        insertedCount++;
      }
    }

    if (insertedCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No valid students could be added to attendance' });
    }

    await client.query('COMMIT');
    res.json({ 
      success: true, 
      message: `Weekly attendance created for ${className} starting ${weekStart}`,
      tableName 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating weekly attendance:', error);
    res.status(500).json({ error: 'Failed to create weekly attendance', details: error.message });
  } finally {
    client.release();
  }
});

// Status map: admin full words <-> teacher short codes
const ACADEMIC_TO_SHORT_STATUS = {
  PRESENT: 'P',
  ABSENT: 'A',
  LATE: 'L',
  LEAVE: 'E',
};

// Sync weekly attendance data from academic_student_attendance for students with empty attendance data
async function syncWeeklyAttendanceFromAcademic(db, schemaName, tableName, className, weekStart) {
  try {
    const dayColumns = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const weekStartDate = new Date(weekStart + 'T00:00:00');
    if (isNaN(weekStartDate.getTime())) return;

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dayName = dayColumns[dayIndex];
      const gregorianDate = new Date(weekStartDate);
      gregorianDate.setDate(gregorianDate.getDate() + dayIndex);

      const ethiopianDate = convertToEthiopian(gregorianDate);

      const attResult = await db.query(
        `SELECT student_id, status FROM public.academic_student_attendance
         WHERE LOWER(class_name) = LOWER($1)
           AND ethiopian_year = $2 AND ethiopian_month = $3 AND ethiopian_day = $4`,
        [className, ethiopianDate.year, ethiopianDate.month, ethiopianDate.day]
      );

      if (attResult.rows.length === 0) continue;

      const entries = [];
      for (const row of attResult.rows) {
        const sid = String(row.student_id ?? '').trim();
        const code = ACADEMIC_TO_SHORT_STATUS[String(row.status ?? '').toUpperCase().trim()];
        if (sid && code) entries.push([sid, code]);
      }
      if (entries.length === 0) continue;

      const valuesSql = entries.map((_, i) => `($${i * 2 + 1}::text, $${i * 2 + 2}::varchar(1))`).join(', ');
      const params = entries.flatMap(([sid, code]) => [sid, code]);

      // The academic table is the authoritative record (it is written by the
      // admin page, the machine and the staff app), so mirror it into the grid
      // for EVERY day it has a value for - including edits (P -> E, L -> A).
      // Filling only empty cells used to leave the grid stuck on an old value.
      await db.query(
        `UPDATE "${schemaName}"."${tableName}" w
         SET "${dayName}" = v.code, updated_at = CURRENT_TIMESTAMP
         FROM (VALUES ${valuesSql}) AS v(sid, code)
         WHERE TRIM(w.school_id::text) = v.sid
           AND (w."${dayName}" IS DISTINCT FROM v.code)`,
        params
      );
    }
  } catch (err) {
    console.warn(`[ClassTeacher] syncWeeklyAttendanceFromAcademic warning for ${className}/${weekStart}:`, err.message);
  }
}

// Get weekly attendance data
router.get('/weekly-attendance/:className/:weekStart', async (req, res) => {
  const { className, weekStart } = req.params;
  
  try {
    const db = await getDbPool(req);
    const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
    if (!validTableName) {
      return res.status(400).json({ error: 'Invalid class name provided.' });
    }

    const schemaName = `class_${className}_weekly_attendance`;
    const tableName = `week_${weekStart.replace(/-/g, '_')}`;

    // 1. Load CURRENT active class roster from classes_schema (source of truth
    // for who is in the class, their live student_name, and their current class_id).
    let roster = [];
    let hasRosterTable = false;
    try {
      const tblCheck = await db.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'classes_schema' AND LOWER(table_name) = LOWER($1)
         LIMIT 1`,
        [className]
      );
      if (tblCheck.rows.length > 0) {
        hasRosterTable = true;
        const actualClassTable = tblCheck.rows[0].table_name;
        const hasIsActive = (await db.query(
          `SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'classes_schema' AND table_name = $1 AND column_name = 'is_active'`,
          [actualClassTable]
        )).rows.length > 0;

        const rosterRes = await db.query(`
          SELECT DISTINCT ON (TRIM(cs.school_id::text))
                 TRIM(cs.school_id::text) AS school_id,
                 COALESCE(TRIM(cs.class_id::text), TRIM(cs.school_id::text)) AS class_id,
                 TRIM(cs.student_name) AS student_name
          FROM classes_schema."${actualClassTable}" cs
          WHERE cs.school_id IS NOT NULL AND cs.student_name IS NOT NULL AND TRIM(cs.student_name) <> ''
            ${hasIsActive ? 'AND (cs.is_active = TRUE OR cs.is_active IS NULL)' : ''}
          ORDER BY TRIM(cs.school_id::text), cs.id DESC
        `);
        roster = rosterRes.rows || [];
      }
    } catch (rosterErr) {
      console.warn(`[ClassTeacher] Roster unavailable for ${className}:`, rosterErr.message);
    }

    // 2. Ensure weekly attendance table exists
    const tableExists = await db.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = $2
    `, [schemaName, tableName]);

    if (tableExists.rows.length === 0) {
      if (!hasRosterTable || roster.length === 0) {
        return res.json({ exists: false, data: [] });
      }
      await db.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      await db.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."${tableName}" (
          id SERIAL PRIMARY KEY,
          school_id VARCHAR(50) NOT NULL,
          class_id VARCHAR(50) NOT NULL,
          student_name VARCHAR(100) NOT NULL,
          monday VARCHAR(1), tuesday VARCHAR(1), wednesday VARCHAR(1),
          thursday VARCHAR(1), friday VARCHAR(1), saturday VARCHAR(1), sunday VARCHAR(1),
          created_by VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_student_${tableName} UNIQUE (school_id, class_id)
        )
      `);
      for (const s of roster) {
        try {
          await db.query(
            `INSERT INTO "${schemaName}"."${tableName}" (school_id, class_id, student_name, created_by)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (school_id, class_id) DO NOTHING`,
            [s.school_id, s.class_id, s.student_name, req.user?.username || 'staff']
          );
        } catch (_) {}
      }
    } else if (hasRosterTable) {
      // 3. Reconcile the weekly table with the live class roster:
      //    (a) Remove duplicate school_id rows in the weekly table (keep newest id)
      //    (b) Remove rows for students deleted or deactivated from classes_schema
      //    (c) Update student_name and class_id to match classes_schema
      //    (d) Insert newly added students
      try {
        await db.query(`
          DELETE FROM "${schemaName}"."${tableName}" a
          USING "${schemaName}"."${tableName}" b
          WHERE TRIM(a.school_id::text) = TRIM(b.school_id::text)
            AND a.id < b.id
        `);
        if (roster.length > 0) {
          const activeIds = roster.map(r => r.school_id);
          await db.query(
            `DELETE FROM "${schemaName}"."${tableName}"
             WHERE TRIM(school_id::text) <> ALL($1::text[])`,
            [activeIds]
          );
          for (const s of roster) {
            const upd = await db.query(
              `UPDATE "${schemaName}"."${tableName}"
               SET student_name = $1, class_id = $2
               WHERE TRIM(school_id::text) = $3
                 AND (student_name IS DISTINCT FROM $1 OR class_id::text IS DISTINCT FROM $2)`,
              [s.student_name, s.class_id, s.school_id]
            );
            if (upd.rowCount === 0) {
              const existsRow = await db.query(
                `SELECT 1 FROM "${schemaName}"."${tableName}" WHERE TRIM(school_id::text) = $1 LIMIT 1`,
                [s.school_id]
              );
              if (existsRow.rows.length === 0) {
                await db.query(
                  `INSERT INTO "${schemaName}"."${tableName}" (school_id, class_id, student_name, created_by)
                   VALUES ($1, $2, $3, $4)
                   ON CONFLICT (school_id, class_id) DO NOTHING`,
                  [s.school_id, s.class_id, s.student_name, req.user?.username || 'staff']
                );
              }
            }
          }
        }
      } catch (reconcileErr) {
        console.warn(`[ClassTeacher] Reconcile warning for ${schemaName}.${tableName}:`, reconcileErr.message);
      }
    }

    // 4. Sync any empty day columns from academic_student_attendance
    await syncWeeklyAttendanceFromAcademic(db, schemaName, tableName, className, weekStart);

    // 5. Fetch the reconciled weekly rows
    const result = await db.query(`SELECT * FROM "${schemaName}"."${tableName}"`);
    const savedRows = result.rows || [];

    // 6. Build response strictly from active roster (never return deleted students
    //    or duplicate rows, and always use live student_name & class_id).
    const savedById = new Map();
    for (const row of savedRows) {
      const key = String(row.school_id).trim();
      if (!savedById.has(key)) savedById.set(key, row);
    }

    const merged = [];
    if (hasRosterTable) {
      for (const student of roster) {
        const key = String(student.school_id).trim();
        const saved = savedById.get(key);
        if (saved) {
          merged.push({
            ...saved,
            school_id: student.school_id,
            class_id: student.class_id,
            student_name: student.student_name,
          });
        } else {
          merged.push({
            id: null,
            school_id: student.school_id,
            class_id: student.class_id,
            student_name: student.student_name,
            monday: null, tuesday: null, wednesday: null,
            thursday: null, friday: null, saturday: null, sunday: null,
            created_by: null, created_at: null, updated_at: null,
          });
        }
      }
    } else {
      merged.push(...savedRows);
    }

    merged.sort((a, b) => {
      const ai = parseInt(a.class_id, 10);
      const bi = parseInt(b.class_id, 10);
      if (!isNaN(ai) && !isNaN(bi) && ai !== bi) return ai - bi;
      return String(a.student_name || '').toLowerCase().localeCompare(String(b.student_name || '').toLowerCase());
    });

    res.json({ exists: true, data: merged });
  } catch (error) {
    console.error('Error fetching weekly attendance:', error);
    res.status(500).json({ error: 'Failed to fetch weekly attendance', details: error.message });
  }
});

// Update weekly attendance (mark attendance for a day)
router.put('/weekly-attendance/:className/:weekStart', async (req, res) => {
  const { className, weekStart } = req.params;
  const { records, globalStaffId } = req.body || {};

  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'records array is required' });
  }

  const db = await getDbPool(req);
  await ensureClassTeachersTable(db);

  // Verify teacher is assigned to this class (lenient — trust authenticated session)
  const parsedStaffId = globalStaffId ? parseInt(globalStaffId) : null;
  if (parsedStaffId && parsedStaffId > 0) {
    const assignment = await db.query(`
      SELECT * FROM school_schema_points.class_teachers 
      WHERE (
        (global_staff_id = $1)
        OR ($3::text IS NOT NULL AND LOWER(TRIM(teacher_name)) = LOWER(TRIM($3)))
      )
      AND LOWER(TRIM(assigned_class)) = LOWER(TRIM($2))
      AND (is_active = true OR is_active IS NULL)
    `, [parsedStaffId, className, req.user?.username || null]);

    if (assignment.rows.length === 0 && !req.user?.username) {
      // No match and no username to fall back on — allow anyway (app is authenticated via JWT)
      console.log(`⚠️ Attendance PUT: no class_teachers match for staff ${parsedStaffId} / ${className}, allowing (authenticated session)`);
    }
  }
  // If no globalStaffId (0/null), allow — the app authenticated via JWT to reach this endpoint

  const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
  if (!validTableName) {
    return res.status(400).json({ error: 'Invalid class name provided.' });
  }

  // Helper: convert Gregorian date to Ethiopian
  const { convertToEthiopian, getEthiopianDayOfWeek } = require('../utils/ethiopianCalendar');

  // Status map: teacher short codes → admin full words
  const statusMap = { 'P': 'PRESENT', 'A': 'ABSENT', 'L': 'LATE', 'E': 'LEAVE' };

  // Build day → Gregorian date map for this week
  const dayNames = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const weekMonday = new Date(weekStart + 'T00:00:00');
  const dayDateMap = {};
  dayNames.forEach((day, i) => {
    const d = new Date(weekMonday);
    d.setDate(weekMonday.getDate() + i);
    dayDateMap[day] = d;
  });

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const schemaName = `class_${className}_weekly_attendance`;
    const tableName = `week_${weekStart.replace(/-/g, '_')}`;
    
    // Check if table exists
    const tableExists = await client.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = $2
    `, [schemaName, tableName]);

    if (tableExists.rows.length === 0) {
      // Auto-create schema and weekly attendance table so PUT never fails with 404
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."${tableName}" (
          id SERIAL PRIMARY KEY,
          school_id VARCHAR(50) NOT NULL,
          class_id VARCHAR(50) NOT NULL,
          student_name VARCHAR(100) NOT NULL,
          monday VARCHAR(1),
          tuesday VARCHAR(1),
          wednesday VARCHAR(1),
          thursday VARCHAR(1),
          friday VARCHAR(1),
          saturday VARCHAR(1),
          sunday VARCHAR(1),
          created_by VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_student_${tableName} UNIQUE (school_id, class_id)
        )
      `);
      // Auto-populate existing students from classes_schema if possible
      try {
        await client.query(`
          INSERT INTO "${schemaName}"."${tableName}" (school_id, class_id, student_name, created_by)
          SELECT school_id, class_id, student_name, $1
          FROM classes_schema."${className}"
          WHERE school_id IS NOT NULL AND class_id IS NOT NULL AND student_name IS NOT NULL
          ON CONFLICT (school_id, class_id) DO NOTHING
        `, [req.user?.username || 'staff']);
      } catch (_) {}
    }

    // Ensure academic_student_attendance table exists (non-fatal if fails)
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS academic_student_attendance (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id VARCHAR(255) NOT NULL,
          student_name VARCHAR(255) NOT NULL,
          class_name VARCHAR(255) NOT NULL,
          smachine_id VARCHAR(50),
          date DATE,
          ethiopian_year INTEGER NOT NULL,
          ethiopian_month INTEGER NOT NULL,
          ethiopian_day INTEGER NOT NULL,
          day_of_week VARCHAR(20) NOT NULL,
          week_number INTEGER NOT NULL,
          check_in_time TIME NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'PRESENT',
          notes TEXT,
          shift_number INTEGER DEFAULT 1,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(student_id, class_name, ethiopian_year, ethiopian_month, ethiopian_day)
        )
      `);
      // Add missing columns to older tables
      await client.query(`ALTER TABLE academic_student_attendance ADD COLUMN IF NOT EXISTS date DATE`);
      await client.query(`ALTER TABLE academic_student_attendance ADD COLUMN IF NOT EXISTS shift_number INTEGER DEFAULT 1`);
    } catch (_) {}

    // Check whether classes_schema."${className}" has an is_active column so
    // deleted/deactivated students sent from a stale APK cache are never
    // re-inserted into the weekly table or academic_student_attendance.
    let hasIsActiveCol = false;
    try {
      const colChk = await client.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'classes_schema' AND table_name = $1 AND column_name = 'is_active'`,
        [className]
      );
      hasIsActiveCol = colChk.rows.length > 0;
    } catch (_) {}

    // Update each record in weekly table + sync to academic_student_attendance
    for (const record of records) {
      const { school_id, class_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday } = record;
      if (school_id === undefined || school_id === null || String(school_id).trim() === '') continue;

      // 1. Verify student is currently active in classes_schema and get live name + class_id
      let studentName = '';
      let liveClassId = String(class_id || school_id);
      let smachineId = null;
      let guardianUsername = '';
      let isCurrentActiveStudent = true;
      try {
        const studentRes = await client.query(`
          SELECT student_name, class_id, smachine_id, guardian_username FROM classes_schema."${className}"
          WHERE TRIM(school_id::text) = TRIM($1::text)
            ${hasIsActiveCol ? 'AND (is_active = TRUE OR is_active IS NULL)' : ''}
          LIMIT 1
        `, [String(school_id)]);
        if (studentRes.rows.length === 0) {
          isCurrentActiveStudent = false;
        } else {
          studentName = studentRes.rows[0].student_name || '';
          if (studentRes.rows[0].class_id !== null && studentRes.rows[0].class_id !== undefined) {
            liveClassId = String(studentRes.rows[0].class_id);
          }
          smachineId = studentRes.rows[0].smachine_id || null;
          guardianUsername = studentRes.rows[0].guardian_username || '';
        }
      } catch (_) {}

      if (!isCurrentActiveStudent) {
        // Student was deleted or deactivated — purge any stale row and skip
        try {
          await client.query(
            `DELETE FROM "${schemaName}"."${tableName}" WHERE TRIM(school_id::text) = TRIM($1::text)`,
            [String(school_id)]
          );
        } catch (_) {}
        continue;
      }

      // 2. Read the stored row so we never erase a mark that was made on the
      //    other side (admin page / machine). The app sends its WHOLE local
      //    state on every save, so an empty day here usually just means the
      //    phone had not loaded that mark - not that the teacher cleared it.
      let storedRow = null;
      try {
        storedRow = (await client.query(
          `SELECT ${dayNames.map(d => `"${d}"`).join(', ')} FROM "${schemaName}"."${tableName}" WHERE TRIM(school_id::text) = TRIM($1::text)`,
          [String(school_id)]
        )).rows[0] || null;
      } catch (_) {}

      const incomingDays = { monday, tuesday, wednesday, thursday, friday, saturday, sunday };

      // Days the teacher actually set, plus days they explicitly cleared
      // (only allowed when the stored mark was their own).
      const setClauses = [];
      const setValues = [];
      const clearedDays = [];
      for (const dayName of dayNames) {
        const inc = incomingDays[dayName] ? String(incomingDays[dayName]).trim() : null;
        const stored = storedRow ? (storedRow[dayName] ? String(storedRow[dayName]).trim() : null) : null;
        if (inc) {
          setClauses.push(`"${dayName}" = $${setValues.length + 1}`);
          setValues.push(inc);
        } else if (stored) {
          // Empty incoming value + a stored mark: only clear it if the teacher
          // owns it (their own earlier mark), never a machine/admin record.
          let ownedByTeacher = false;
          try {
            const g = new Date(weekMonday); g.setDate(weekMonday.getDate() + dayNames.indexOf(dayName));
            const e = convertToEthiopian(g);
            const own = await client.query(
              `SELECT notes FROM public.academic_student_attendance
               WHERE TRIM(student_id::text) = TRIM($1::text) AND LOWER(class_name) = LOWER($2)
                 AND ethiopian_year = $3 AND ethiopian_month = $4 AND ethiopian_day = $5 LIMIT 1`,
              [String(school_id), className, e.year, e.month, e.day]
            );
            const notes = own.rows[0]?.notes || '';
            ownedByTeacher = /class teacher/i.test(notes);
          } catch (_) {}
          if (ownedByTeacher) {
            setClauses.push(`"${dayName}" = NULL`);
            clearedDays.push(dayName);
          }
        }
      }

      // 3. Write the weekly grid (only the days we are allowed to touch)
      if (setClauses.length > 0) {
        setClauses.push(`class_id = $${setValues.length + 1}`);
        setValues.push(liveClassId);
        setClauses.push(`student_name = $${setValues.length + 1}`);
        setValues.push(studentName || record.student_name || 'Student');
        setValues.push(String(school_id));
        const updRes = await client.query(
          `UPDATE "${schemaName}"."${tableName}" SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
           WHERE TRIM(school_id::text) = TRIM($${setValues.length}::text)`,
          setValues
        );
        if (updRes.rowCount === 0) {
          try {
            await client.query(`
              INSERT INTO "${schemaName}"."${tableName}"
              (school_id, class_id, student_name, monday, tuesday, wednesday, thursday, friday, saturday, sunday, created_by)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              ON CONFLICT (school_id, class_id) DO UPDATE
              SET student_name = EXCLUDED.student_name,
                  monday = EXCLUDED.monday, tuesday = EXCLUDED.tuesday, wednesday = EXCLUDED.wednesday,
                  thursday = EXCLUDED.thursday, friday = EXCLUDED.friday, saturday = EXCLUDED.saturday,
                  sunday = EXCLUDED.sunday, updated_at = CURRENT_TIMESTAMP
            `, [
              String(school_id).trim(), liveClassId, studentName || record.student_name || 'Student',
              monday || null, tuesday || null, wednesday || null, thursday || null,
              friday || null, saturday || null, sunday || null,
              req.user?.username || 'staff'
            ]);
          } catch (_) {}
        }
      }

      // 4. A cleared day removes the teacher's own academic record too
      for (const dayName of clearedDays) {
        try {
          const g = new Date(weekMonday); g.setDate(weekMonday.getDate() + dayNames.indexOf(dayName));
          const e = convertToEthiopian(g);
          await client.query(
            `DELETE FROM public.academic_student_attendance
             WHERE TRIM(student_id::text) = TRIM($1::text) AND LOWER(class_name) = LOWER($2)
               AND ethiopian_year = $3 AND ethiopian_month = $4 AND ethiopian_day = $5
               AND notes ILIKE '%class teacher%'`,
            [String(school_id), className, e.year, e.month, e.day]
          );
        } catch (_) {}
      }

      // 3. Sync each day to academic_student_attendance (non-fatal per day)
      const dayValues = { monday, tuesday, wednesday, thursday, friday, saturday, sunday };
      for (const dayName of dayNames) {
        const shortStatus = dayValues[dayName];
        if (!shortStatus) continue;

        const fullStatus = statusMap[shortStatus];
        if (!fullStatus) continue;

        // Notify the guardian whenever a day's mark is added or changed
        // (P/A/L/E — every save reaches the parent app).
        try {
          const short = dayValues[dayName];
          const notifyMeta = {
            P: { status: 'present', label: 'PRESENT' },
            A: { status: 'absent', label: 'ABSENT' },
            L: { status: 'late', label: 'LATE' },
            E: { status: 'leave', label: 'PERMISSION' },
          };
          const meta = notifyMeta[short];
          if (meta && guardianUsername) {
            const prevShort = storedRow ? String(storedRow[dayName] || '') : '';
            if (prevShort !== short) {
              const gd = dayDateMap[dayName];
              const ymd = gd.getFullYear() + '-' + String(gd.getMonth() + 1).padStart(2, '0') + '-' + String(gd.getDate()).padStart(2, '0');
              const { notifyGuardianPush } = require('../services/guardianPush');
              notifyGuardianPush(
                guardianUsername,
                'Attendance: ' + meta.label,
                studentName + ' was marked ' + meta.label + ' (' + ymd + ').',
                {
                  type: 'attendance',
                  status: meta.status,
                  studentName: studentName,
                  student_name: studentName,
                  studentId: String(school_id),
                  school_id: String(school_id),
                  className: className,
                  date: ymd,
                }
              ).catch((e) => console.warn('class-teacher attendance push error:', e.message));
            }
          }
        } catch (_) {}

        try {
          const gregDate = dayDateMap[dayName];
          const ethDate = convertToEthiopian(gregDate);
          const dayOfWeek = getEthiopianDayOfWeek(ethDate.year, ethDate.month, ethDate.day);
          const weekNumber = Math.ceil(ethDate.day / 7);

          await client.query(`
            INSERT INTO academic_student_attendance 
              (student_id, student_name, class_name, smachine_id, date,
               ethiopian_year, ethiopian_month, ethiopian_day,
               day_of_week, week_number, check_in_time, status, notes, shift_number)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            ON CONFLICT (student_id, class_name, ethiopian_year, ethiopian_month, ethiopian_day)
            DO UPDATE SET
              status = EXCLUDED.status,
              notes = EXCLUDED.notes,
              updated_at = CURRENT_TIMESTAMP
          `, [
            school_id, studentName, className, smachineId, gregDate,
            ethDate.year, ethDate.month, ethDate.day,
            dayOfWeek, weekNumber,
            '08:00:00', fullStatus,
            'Marked by class teacher',
            1
          ]);
        } catch (_) {}
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `${records.length} attendance records updated` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating weekly attendance:', error);
    res.status(500).json({ error: 'Failed to update attendance', details: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
