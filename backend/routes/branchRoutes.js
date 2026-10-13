// branchRoutes.js - Branch Management API Routes
// Handles branch CRUD operations and branch code validation

const express = require('express');
const router = express.Router();
const dbManager = require('../services/DatabaseConnectionManager');
const { validateBranchCode, generateBranchToken } = require('../middleware/branchAuth');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { getEndpointPath, API_ENDPOINTS } = require('../config/api.config');

/**
 * POST /api/v2/branches/validate
 * Validate branch code
 */
router.post('/validate', async (req, res) => {
  try {
    const { branchCode } = req.body;

    if (!branchCode) {
      return res.status(400).json({ error: 'Branch code is required' });
    }

    // Validate format
    if (!/^[A-Z0-9]{2,5}$/.test(branchCode)) {
      return res.status(400).json({ 
        error: 'Invalid branch code format',
        message: 'Branch code must be 2-5 uppercase letters/numbers'
      });
    }

    // Check if branch exists and is active
    const databaseName = await dbManager.resolveDatabaseName(branchCode);

    res.json({
      valid: true,
      branchCode: branchCode,
      databaseName: databaseName,
      message: 'Branch code is valid'
    });

  } catch (error) {
    res.status(404).json({
      valid: false,
      error: 'Branch not found',
      message: error.message
    });
  }
});

/**
 * POST /api/v2/branches/login
 * Enhanced login with branch code
 */
router.post('/login', async (req, res) => {
  try {
    const branchCode = req.body?.branchCode
      || req.headers['x-branch-code']
      || req.app.locals.defaultBranchCode
      || process.env.DEFAULT_BRANCH_CODE
      || (req.headers.host && req.headers.host.includes('bilal') ? 'BILAL' : null);
    const username = req.body?.username ? String(req.body.username).trim() : '';
    const rawPassword = req.originalBody?.password || req.body?.password;
    const password = rawPassword;
    const userType = req.body?.userType;

    // Validate inputs
    if (!branchCode || !username || !rawPassword) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    const validator = require('validator');
    const unescapedPassword = validator.unescape(String(rawPassword || ''));

    // Validate branch code
    const pool = await dbManager.getPool(branchCode);

    // Authenticate user based on userType
    let user = null;
    let role = null;
    let profile = null;

    if (userType === 'admin' || !userType) {
      // Check admin_users table
      const adminResult = await pool.query(
        'SELECT id, username, password_hash, name, email, role FROM admin_users WHERE LOWER(username) = LOWER($1) OR username = $1',
        [username]
      );

      if (adminResult.rows.length > 0) {
        const admin = adminResult.rows[0];
        const bcrypt = require('bcrypt');
        let isValid = await bcrypt.compare(rawPassword, admin.password_hash).catch(() => false);
        if (!isValid && unescapedPassword !== rawPassword) {
          isValid = await bcrypt.compare(unescapedPassword, admin.password_hash).catch(() => false);
        }

        if (isValid) {
          user = admin;
          role = admin.role;
        }
      }
    }

    if (!user && (userType === 'staff' || userType === 'teacher' || !userType)) {
      // Check staff_users table
      try {
        const staffResult = await pool.query(
          'SELECT id, global_staff_id, username, password_hash, password_plain, staff_type, class_name FROM staff_users WHERE LOWER(username) = LOWER($1) OR username = $1',
          [username]
        );

        if (staffResult.rows.length > 0) {
          const staff = staffResult.rows[0];
          const bcrypt = require('bcrypt');
          let isValid = false;
          if (staff.password_hash) {
            isValid = await bcrypt.compare(rawPassword, staff.password_hash).catch(() => false);
            if (!isValid && unescapedPassword !== rawPassword) {
              isValid = await bcrypt.compare(unescapedPassword, staff.password_hash).catch(() => false);
            }
          }
          if (!isValid && staff.password_plain) {
            isValid = (rawPassword === staff.password_plain || unescapedPassword === staff.password_plain);
          }

          if (isValid) {
            user = staff;
            role = staff.staff_type === 'Teachers' ? 'teacher' : 'staff';

            // Try to fetch profile for this staff
            try {
              const schemaName = `staff_${staff.staff_type.replace(/\s+/g, '_').toLowerCase()}`;

              // 1. Check if table with class_name exists in schema
              const tableCheck = await pool.query(
                `SELECT EXISTS (
                   SELECT FROM information_schema.tables 
                   WHERE table_schema = $1 AND table_name = $2
                 )`,
                [schemaName, staff.class_name]
              );

              if (tableCheck.rows[0]?.exists) {
                const profResult = await pool.query(
                  `SELECT * FROM "${schemaName}"."${staff.class_name}" WHERE global_staff_id = $1 LIMIT 1`,
                  [staff.global_staff_id]
                );
                if (profResult.rows.length > 0) {
                  profile = profResult.rows[0];
                }
              }

              // 2. If not found, check any table in that schema
              if (!profile) {
                const schemaTables = await pool.query(
                  `SELECT table_name FROM information_schema.tables WHERE table_schema = $1`,
                  [schemaName]
                );
                for (const tRow of schemaTables.rows) {
                  const profResult = await pool.query(
                    `SELECT * FROM "${schemaName}"."${tRow.table_name}" WHERE global_staff_id = $1 LIMIT 1`,
                    [staff.global_staff_id]
                  );
                  if (profResult.rows.length > 0) {
                    profile = profResult.rows[0];
                    break;
                  }
                }
              }

              // 3. If teacher, also check school_schema_points.teachers
              if (!profile && (staff.staff_type === 'Teachers' || role === 'teacher')) {
                const teacherCheck = await pool.query(
                  `SELECT EXISTS (
                     SELECT FROM information_schema.tables 
                     WHERE table_schema = 'school_schema_points' AND table_name = 'teachers'
                   )`
                );
                if (teacherCheck.rows[0]?.exists) {
                  const tResult = await pool.query(
                    `SELECT * FROM school_schema_points.teachers WHERE global_staff_id = $1 LIMIT 1`,
                    [staff.global_staff_id]
                  );
                  if (tResult.rows.length > 0) {
                    profile = {
                      ...tResult.rows[0],
                      name: tResult.rows[0].teacher_name
                    };
                  }
                }
              }
            } catch (profErr) {
              console.error('Error fetching staff profile in branch login:', profErr);
            }

            if (!profile) {
              profile = {
                id: staff.id,
                global_staff_id: staff.global_staff_id,
                globalStaffId: staff.global_staff_id,
                username: staff.username,
                name: staff.username,
                staff_type: staff.staff_type,
                staffType: staff.staff_type,
                class_name: staff.class_name,
                className: staff.class_name
              };
            }
          }
        }
      } catch (staffErr) {
        console.error('Error checking staff in branch login:', staffErr);
      }
    }

    if (!user && (userType === 'student' || !userType)) {
      // Check students table
      const tables = (await pool.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = $1',
        ['classes_schema']
      )).rows.map(row => row.table_name);

      for (const table of tables) {
        const result = await pool.query(
          `SELECT * FROM classes_schema."${table}" 
           WHERE (username = $1 OR LOWER(username) = LOWER($1)) 
             AND (password = $2 OR password = $3) 
           LIMIT 1`,
          [username, rawPassword, unescapedPassword]
        );

        if (result.rows.length > 0) {
          user = result.rows[0];
          role = 'student';
          break;
        }
      }
    }

    if (!user && (userType === 'guardian' || !userType)) {
      // Check guardians table
      const tables = (await pool.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = $1',
        ['classes_schema']
      )).rows.map(row => row.table_name);

      for (const table of tables) {
        const result = await pool.query(
          `SELECT * FROM classes_schema."${table}" 
           WHERE (guardian_username = $1 OR LOWER(guardian_username) = LOWER($1)) 
             AND (guardian_password = $2 OR guardian_password = $3) 
           LIMIT 1`,
          [username, rawPassword, unescapedPassword]
        );

        if (result.rows.length > 0) {
          user = result.rows[0];
          role = 'guardian';
          break;
        }
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token with branch context
    const token = generateBranchToken(
      {
        id: user.id || user.global_staff_id,
        global_staff_id: user.global_staff_id || user.id,
        username: username,
        role: role,
        userType: role,
        staffType: user.staff_type || undefined,
        className: user.class_name || undefined
      },
      branchCode,
      '24h'
    );

    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        id: user.id || user.global_staff_id,
        global_staff_id: user.global_staff_id || user.id,
        globalStaffId: user.global_staff_id || user.id,
        username: username,
        name: profile?.name || profile?.teacher_name || user.name || user.student_name || user.guardian_name || username,
        role: role,
        staffType: user.staff_type,
        className: user.class_name,
        branchCode: branchCode,
        phone: user.guardian_phone || user.phone || profile?.phone,
        guardian_name: user.guardian_name,
        guardian_phone: user.guardian_phone
      },
      profile: profile || user
    });

  } catch (error) {
    console.error('Branch login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      message: error.message
    });
  }
});

/**
 * GET /api/v2/branches
 * Get all branches (Super Admin only)
 */
router.get('/', authenticateToken, authorizeRoles('super-admin'), async (req, res) => {
  try {
    const branches = await dbManager.getAllBranches();
    res.json(branches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

/**
 * POST /api/v2/branches
 * Create new branch (Super Admin only)
 */
router.post('/', authenticateToken, authorizeRoles('super-admin'), async (req, res) => {
  try {
    const branch = await dbManager.createBranch(req.body);
    res.status(201).json({
      message: 'Branch created successfully',
      branch: branch
    });
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ 
      error: 'Failed to create branch',
      message: error.message
    });
  }
});

/**
 * GET /api/v2/branches/stats
 * Get connection pool statistics
 */
router.get('/stats', authenticateToken, authorizeRoles('super-admin'), (req, res) => {
  const { branchCode } = req.query;
  
  if (!branchCode) {
    return res.status(400).json({ error: 'Branch code is required' });
  }

  const stats = dbManager.getPoolStats(branchCode);
  
  if (!stats) {
    return res.status(404).json({ error: 'No active connection pool for this branch' });
  }

  res.json(stats);
});

/**
 * GET /api/v2/branches/scan
 * Scan for unregistered PostgreSQL databases (Super Admin only)
 */
router.get('/scan', authenticateToken, authorizeRoles('super-admin'), async (req, res) => {
  try {
    const unregistered = await dbManager.scanUnregisteredDatabases();
    res.json({
      total: unregistered.length,
      databases: unregistered
    });
  } catch (error) {
    console.error('Error scanning databases:', error);
    res.status(500).json({
      error: 'Failed to scan databases',
      message: error.message
    });
  }
});

/**
 * POST /api/v2/branches/auto-register
 * Auto-register a database in branch_config with generated branch code (Super Admin only)
 */
router.post('/auto-register', authenticateToken, authorizeRoles('super-admin'), async (req, res) => {
  try {
    const { databaseName, customBranchCode, customBranchName } = req.body;

    if (!databaseName) {
      return res.status(400).json({ error: 'databaseName is required' });
    }

    const result = await dbManager.autoRegisterBranch(databaseName, customBranchCode, customBranchName);

    if (result.alreadyRegistered) {
      return res.json({
        message: 'Database is already registered',
        branch: result.branch
      });
    }

    res.status(201).json({
      message: 'Database registered successfully',
      branch: result.branch,
      branchCode: result.branchCode
    });
  } catch (error) {
    console.error('Error auto-registering database:', error);
    res.status(500).json({
      error: 'Failed to auto-register database',
      message: error.message
    });
  }
});

module.exports = router;
