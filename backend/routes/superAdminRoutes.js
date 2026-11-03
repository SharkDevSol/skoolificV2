const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbManager = require('../services/DatabaseConnectionManager');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { JWT_SECRET } = require('../middleware/jwtValidator');

const DB_NAME = process.env.DB_NAME || 'iqrab1';
const DB_USER = process.env.DB_USER || 'iqra';
const DB_PASSWORD = String(process.env.DB_PASSWORD || '');
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');

function getMasterPool() {
  return new Pool({
    host: DB_HOST, port: DB_PORT, database: DB_NAME,
    user: DB_USER, password: DB_PASSWORD, max: 5
  });
}

async function ensureSuperAdminsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS super_admins (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(150),
      email VARCHAR(150),
      is_active BOOLEAN DEFAULT true,
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// ============================================
// AUTH
// ============================================
router.post('/login', async (req, res) => {
  const pool = getMasterPool();
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    await ensureSuperAdminsTable(pool);

    const result = await pool.query(
      'SELECT * FROM super_admins WHERE username = $1 AND is_active = true',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        role: 'super_admin',
        fullName: admin.full_name || admin.username
      },
      JWT_SECRET,
      { expiresIn: '24h', issuer: 'school-management-system', audience: 'school-app' }
    );

    await pool.query('UPDATE super_admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [admin.id]);

    res.json({
      success: true,
      token,
      user: {
        id: admin.id,
        username: admin.username,
        fullName: admin.full_name || admin.username,
        role: 'super_admin'
      }
    });
  } catch (error) {
    console.error('Super Admin login error:', error);
    res.status(500).json({ error: 'Login failed', message: error.message });
  } finally {
    await pool.end().catch(() => {});
  }
});

router.post('/setup', async (req, res) => {
  // One-time bootstrap: create the first super admin account
  const pool = getMasterPool();
  try {
    const { username, password, fullName } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    await ensureSuperAdminsTable(pool);
    const existing = await pool.query('SELECT id FROM super_admins WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO super_admins (username, password_hash, full_name) VALUES ($1, $2, $3)',
      [username, hash, fullName || username]
    );
    res.json({ success: true, message: 'Super admin created' });
  } catch (error) {
    console.error('Super admin setup error:', error);
    res.status(500).json({ error: 'Setup failed', message: error.message });
  } finally {
    await pool.end().catch(() => {});
  }
});

// ============================================
// HELPERS
// ============================================
// Branches allowed in the Super Admin app (IQRA2, IQRA3, IQRA4, IQRA5)
const ALLOWED_BRANCHES = ['IQRA2', 'IQRA3', 'IQRA4', 'IQRA5'];

async function getSelectedBranches(branchCode) {
  const branches = await dbManager.getAllBranches();
  const allowed = branches.filter(
    (b) => ALLOWED_BRANCHES.includes(String(b.branch_code).toUpperCase())
  );
  if (!branchCode || String(branchCode).toUpperCase() === 'ALL') {
    return allowed;
  }
  const code = String(branchCode).toUpperCase();
  return allowed.filter((b) => String(b.branch_code).toUpperCase() === code);
}

async function getPoolSafe(branch) {
  try {
    return await dbManager.getPool(branch.branch_code);
  } catch (e) {
    return null;
  }
}

async function hasColumn(pool, schema, table, column) {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND column_name = $3`,
    [schema, table, column]
  );
  return r.rows.length > 0;
}

// ============================================
// REPORTS
// ============================================

// ---- STUDENTS: totals by class and by branch ----
router.get('/report/students', authenticateToken, authorizeRoles('super_admin'), async (req, res) => {
  try {
    const branches = await getSelectedBranches(req.query.branchCode);
    const classTotals = {};

    // One metadata query + one aggregated UNION ALL query per branch, branches in parallel.
    const results = await Promise.all(branches.map(async (b) => {
      const pool = await getPoolSafe(b);
      if (!pool) {
        return { entry: { branchCode: b.branch_code, branchName: b.branch_name, error: 'Database unreachable' }, classes: [] };
      }
      try {
        const meta = (await pool.query(
          `SELECT t.table_name,
                  COALESCE(BOOL_OR(c.column_name = 'is_active'), FALSE) AS has_active,
                  COALESCE(BOOL_OR(c.column_name = 'gender'), FALSE) AS has_gender
           FROM information_schema.tables t
           LEFT JOIN information_schema.columns c
             ON c.table_schema = t.table_schema AND c.table_name = t.table_name
            AND c.column_name IN ('is_active', 'gender')
           WHERE t.table_schema = 'classes_schema'
           GROUP BY t.table_name
           ORDER BY t.table_name`
        )).rows;

        const classes = [];
        let total = 0, male = 0, female = 0;

        if (meta.length > 0) {
          const parts = meta.map((m) => {
            const where = m.has_active ? `WHERE (is_active IS NULL OR is_active = TRUE)` : '';
            const maleExpr = m.has_gender ? `COUNT(*) FILTER (WHERE lower(gender) = 'male')::int` : '0::int';
            const femaleExpr = m.has_gender ? `COUNT(*) FILTER (WHERE lower(gender) = 'female')::int` : '0::int';
            const safeName = String(m.table_name).replace(/'/g, "''");
            return `SELECT '${safeName}' AS class_name, COUNT(*)::int AS students, ${maleExpr} AS male, ${femaleExpr} AS female FROM classes_schema."${m.table_name}" ${where}`;
          });
          const rows = (await pool.query(
            `SELECT class_name, students, male, female FROM (${parts.join(' UNION ALL ')}) agg ORDER BY class_name`
          )).rows;
          for (const r of rows) {
            classes.push({ className: r.class_name, students: r.students, male: r.male, female: r.female });
            total += r.students; male += r.male; female += r.female;
          }
        }

        return {
          entry: { branchCode: b.branch_code, branchName: b.branch_name, total, male, female, classes },
          classes
        };
      } catch (e) {
        return { entry: { branchCode: b.branch_code, branchName: b.branch_name, error: e.message }, classes: [] };
      }
    }));

    const byBranch = results.map(r => r.entry);
    let grandTotal = 0, grandMale = 0, grandFemale = 0;
    for (const r of results) {
      for (const c of r.classes) {
        if (!classTotals[c.className]) classTotals[c.className] = { className: c.className, students: 0, male: 0, female: 0 };
        classTotals[c.className].students += c.students;
        classTotals[c.className].male += c.male;
        classTotals[c.className].female += c.female;
        grandTotal += c.students; grandMale += c.male; grandFemale += c.female;
      }
    }

    res.json({
      success: true,
      data: {
        grandTotal, grandMale, grandFemale,
        byBranch,
        byClass: Object.values(classTotals).sort((a, c) => a.className.localeCompare(c.className))
      }
    });
  } catch (error) {
    console.error('Students report error:', error);
    res.status(500).json({ error: 'Failed to build students report', message: error.message });
  }
});

// ---- ATTENDANCE: by class and status, filterable by viewMode (month, week, date) ----
router.get('/report/attendance', authenticateToken, authorizeRoles('super_admin'), async (req, res) => {
  try {
    const branches = await getSelectedBranches(req.query.branchCode);
    const viewMode = req.query.viewMode || 'month'; // 'month' | 'week' | 'date'
    const year = req.query.year ? parseInt(req.query.year) : 2019;
    const month = req.query.month ? parseInt(req.query.month) : 2; // Default Tikimt (Month 2)
    const week = req.query.week ? parseInt(req.query.week) : null;
    const day = req.query.day ? parseInt(req.query.day) : null;
    const date = req.query.date ? String(req.query.date).trim() : null;

    const filters = [];
    const values = [];

    if (viewMode === 'date') {
      if (date) {
        values.push(date);
        filters.push(`date = $${values.length}`);
      } else {
        if (year) { values.push(year); filters.push(`ethiopian_year = $${values.length}`); }
        if (month) { values.push(month); filters.push(`ethiopian_month = $${values.length}`); }
        if (day) { values.push(day); filters.push(`ethiopian_day = $${values.length}`); }
      }
    } else if (viewMode === 'week') {
      if (year) { values.push(year); filters.push(`ethiopian_year = $${values.length}`); }
      if (month) { values.push(month); filters.push(`ethiopian_month = $${values.length}`); }
      if (week) { values.push(week); filters.push(`week_number = $${values.length}`); }
    } else {
      // Monthly view
      if (year) { values.push(year); filters.push(`ethiopian_year = $${values.length}`); }
      if (month) { values.push(month); filters.push(`ethiopian_month = $${values.length}`); }
    }

    const whereSql = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const results = await Promise.all(branches.map(async (b) => {
      const pool = await getPoolSafe(b);
      if (!pool) {
        return { entry: { branchCode: b.branch_code, branchName: b.branch_name, error: 'Database unreachable' }, p: 0, l: 0, a: 0, perm: 0 };
      }
      try {
        const rows = (await pool.query(
          `SELECT class_name, status, COUNT(*)::int AS c
           FROM academic_student_attendance
           ${whereSql}
           GROUP BY class_name, status ORDER BY class_name`,
          values
        )).rows;

        const classMap = {};
        for (const r of rows) {
          if (!classMap[r.class_name]) {
            classMap[r.class_name] = { className: r.class_name, present: 0, late: 0, absent: 0, permission: 0 };
          }
          const st = String(r.status || '').toUpperCase();
          if (st === 'PRESENT') classMap[r.class_name].present += r.c;
          else if (st === 'LATE') classMap[r.class_name].late += r.c;
          else if (st === 'LEAVE' || st === 'PERMISSION') classMap[r.class_name].permission += r.c;
          else classMap[r.class_name].absent += r.c;
        }

        const classes = Object.values(classMap);
        let p = 0, l = 0, a = 0, perm = 0;
        for (const c of classes) {
          c.total = c.present + c.late + c.absent + c.permission;
          c.rate = c.total > 0 ? Math.round(((c.present + c.late) / c.total) * 100) : 0;
          p += c.present; l += c.late; a += c.absent; perm += c.permission;
        }
        const total = p + l + a + perm;

        // Leaderboards for this branch under this time window
        const leaderWhere = whereSql ? `${whereSql} AND` : 'WHERE';

        const mostAbsent = (await pool.query(
          `SELECT student_id, student_name, class_name, COUNT(*)::int AS count
           FROM academic_student_attendance
           ${leaderWhere} status = 'ABSENT'
           GROUP BY student_id, student_name, class_name
           ORDER BY count DESC
           LIMIT 15`,
          values
        )).rows;

        const mostPresent = (await pool.query(
          `SELECT student_id, student_name, class_name, COUNT(*)::int AS count
           FROM academic_student_attendance
           ${leaderWhere} status = 'PRESENT'
           GROUP BY student_id, student_name, class_name
           ORDER BY count DESC
           LIMIT 15`,
          values
        )).rows;

        const mostLate = (await pool.query(
          `SELECT student_id, student_name, class_name, COUNT(*)::int AS count
           FROM academic_student_attendance
           ${leaderWhere} status = 'LATE'
           GROUP BY student_id, student_name, class_name
           ORDER BY count DESC
           LIMIT 15`,
          values
        )).rows;

        const mostPermission = (await pool.query(
          `SELECT student_id, student_name, class_name, COUNT(*)::int AS count
           FROM academic_student_attendance
           ${leaderWhere} (status = 'LEAVE' OR status = 'PERMISSION')
           GROUP BY student_id, student_name, class_name
           ORDER BY count DESC
           LIMIT 15`,
          values
        )).rows;

        return {
          entry: {
            branchCode: b.branch_code, branchName: b.branch_name,
            present: p, late: l, absent: a, permission: perm, total,
            rate: total > 0 ? Math.round(((p + l) / total) * 100) : 0,
            classes,
            mostAbsent,
            mostPresent,
            mostLate,
            mostPermission
          },
          p, l, a, perm
        };
      } catch (e) {
        return { entry: { branchCode: b.branch_code, branchName: b.branch_name, error: e.message }, p: 0, l: 0, a: 0, perm: 0 };
      }
    }));

    const byBranch = results.map(r => r.entry);
    let grandPresent = 0, grandLate = 0, grandAbsent = 0, grandPermission = 0, grandTotal = 0;
    for (const r of results) {
      grandPresent += r.p; grandLate += r.l; grandAbsent += r.a; grandPermission += r.perm;
      grandTotal += (r.p + r.l + r.a + r.perm);
    }

    res.json({
      success: true,
      filters: { viewMode, year, month, week, day, date },
      data: {
        viewMode,
        year,
        month,
        week,
        day,
        date,
        grandTotal,
        grandPresent,
        grandLate,
        grandAbsent,
        grandPermission,
        grandRate: grandTotal > 0 ? Math.round(((grandPresent + grandLate) / grandTotal) * 100) : 0,
        byBranch
      }
    });
  } catch (error) {
    console.error('Attendance report error:', error);
    res.status(500).json({ error: 'Failed to build attendance report', message: error.message });
  }
});

// ---- MARKS: Big Mark students by class, branch, and subjects ----
router.get('/report/marks', authenticateToken, authorizeRoles('super_admin'), async (req, res) => {
  try {
    const branches = await getSelectedBranches(req.query.branchCode);
    const termNum = req.query.term ? parseInt(req.query.term) : 1;
    const termPattern = `%_term_${termNum}`;

    const SUBJECT_MAP = {
      amharic: 'Amharic',
      arabic: 'Arabic',
      biology: 'Biology',
      career: 'Career',
      chemistry: 'Chemistry',
      citizen: 'Citizenship',
      civics: 'Civics',
      economics: 'Economics',
      english: 'English',
      g_s: 'General Science',
      g_science: 'General Science',
      geography: 'Geography',
      history: 'History',
      mathematics: 'Mathematics',
      moral: 'Moral',
      physics: 'Physics',
      science: 'Science',
      social: 'Social Studies',
      somali: 'Somali',
      soomali: 'Somali',
      terbiya: 'Terbiya'
    };

    const results = await Promise.all(branches.map(async (b) => {
      const pool = await getPoolSafe(b);
      if (!pool) {
        return {
          entry: { branchCode: b.branch_code, branchName: b.branch_name, error: 'Database unreachable', classes: [] },
          gradedStudents: 0,
          subjectsCount: 0,
          avgPct: 0
        };
      }
      try {
        const tablesRes = await pool.query(`
          SELECT table_schema, table_name 
          FROM information_schema.tables 
          WHERE table_schema LIKE 'subject_%_schema' 
            AND table_name LIKE $1
            AND table_name NOT LIKE '%config%'
          ORDER BY table_name, table_schema
        `, [termPattern]);

        const classTables = {};
        for (const row of tablesRes.rows) {
          const parts = row.table_name.split('_term_');
          const className = parts[0].toUpperCase();
          if (!classTables[className]) classTables[className] = [];
          const rawSubj = row.table_schema.toLowerCase().replace('subject_', '').replace('_schema', '');
          const subjName = SUBJECT_MAP[rawSubj] || (rawSubj.charAt(0).toUpperCase() + rawSubj.slice(1));
          classTables[className].push({
            subject: subjName,
            schema: row.table_schema,
            table: row.table_name
          });
        }

        const classSummaries = [];
        let totalBranchGradedStudents = 0;
        let totalBranchSubjects = 0;
        let branchScoreSum = 0;
        let branchScoreCount = 0;

        for (const [className, subjects] of Object.entries(classTables)) {
          const studentMap = {};
          const topBySubject = [];

          for (const s of subjects) {
            try {
              const rows = (await pool.query(`
                SELECT student_name, gender, test_1, test_2, mid, test_3, assignment, exerc_book, final, total, pass_status
                FROM "${s.schema}"."${s.table}"
                WHERE total > 0
                ORDER BY total DESC
              `)).rows;

              if (rows.length > 0) {
                totalBranchSubjects++;
                topBySubject.push({
                  subject: s.subject,
                  maxScore: parseFloat(rows[0].total),
                  topStudents: rows.slice(0, 3).map(r => ({
                    name: r.student_name,
                    total: parseFloat(r.total),
                    test1: parseFloat(r.test_1 || 0),
                    mid: parseFloat(r.mid || 0),
                    final: parseFloat(r.final || 0)
                  }))
                });

                for (const r of rows) {
                  const sname = (r.student_name || '').trim();
                  if (!sname) continue;
                  if (!studentMap[sname]) {
                    studentMap[sname] = {
                      name: sname,
                      gender: r.gender,
                      totalScore: 0,
                      subjects: {},
                      subjectCount: 0
                    };
                  }
                  const t = parseFloat(r.total || 0);
                  studentMap[sname].totalScore += t;
                  studentMap[sname].subjectCount += 1;
                  studentMap[sname].subjects[s.subject] = t;

                  branchScoreSum += t;
                  branchScoreCount++;
                }
              }
            } catch (e) {}
          }

          const studentsRanked = Object.values(studentMap)
            .map(st => ({
              ...st,
              totalScore: Math.round(st.totalScore * 10) / 10,
              avgScore: st.subjectCount > 0 ? Math.round((st.totalScore / st.subjectCount) * 10) / 10 : 0
            }))
            .sort((a, b) => b.totalScore - a.totalScore);

          if (studentsRanked.length > 0) {
            totalBranchGradedStudents += studentsRanked.length;
            classSummaries.push({
              className,
              totalGradedStudents: studentsRanked.length,
              subjectsCount: topBySubject.length,
              topStudents: studentsRanked.slice(0, 10), // Top 10 "Big Mark" students in class
              topBySubject
            });
          }
        }

        const avg = branchScoreCount > 0 ? Math.round((branchScoreSum / branchScoreCount) * 10) / 10 : 0;

        return {
          entry: {
            branchCode: b.branch_code,
            branchName: b.branch_name,
            totalGradedStudents: totalBranchGradedStudents,
            subjectsCount: totalBranchSubjects,
            avgScore: avg,
            classes: classSummaries
          },
          gradedStudents: totalBranchGradedStudents,
          subjectsCount: totalBranchSubjects,
          avgPct: avg
        };
      } catch (e) {
        return {
          entry: { branchCode: b.branch_code, branchName: b.branch_name, error: e.message, classes: [] },
          gradedStudents: 0,
          subjectsCount: 0,
          avgPct: 0
        };
      }
    }));

    const byBranch = results.map(r => r.entry);
    let grandGradedStudents = 0;
    let grandSubjectsCount = 0;
    let avgSum = 0;
    let branchWithScores = 0;

    for (const r of results) {
      grandGradedStudents += r.gradedStudents;
      grandSubjectsCount += r.subjectsCount;
      if (r.avgPct > 0) {
        avgSum += r.avgPct;
        branchWithScores++;
      }
    }

    res.json({
      success: true,
      filters: { term: termNum },
      data: {
        term: termNum,
        grandGradedStudents,
        grandSubjectsCount,
        grandAvgScore: branchWithScores > 0 ? Math.round((avgSum / branchWithScores) * 10) / 10 : 0,
        byBranch
      }
    });
  } catch (error) {
    console.error('Marks report error:', error);
    res.status(500).json({ error: 'Failed to build marks report', message: error.message });
  }
});

// ---- FAULTS: counts by class, filterable by Ethiopian year/month ----
router.get('/report/faults', authenticateToken, authorizeRoles('super_admin'), async (req, res) => {
  try {
    const branches = await getSelectedBranches(req.query.branchCode);
    const year = req.query.year ? parseInt(req.query.year) : null;
    const month = req.query.month ? parseInt(req.query.month) : null;

    const results = await Promise.all(branches.map(async (b) => {
      const pool = await getPoolSafe(b);
      if (!pool) {
        return { entry: { branchCode: b.branch_code, branchName: b.branch_name, error: 'Database unreachable' }, total: 0 };
      }
      try {
        const tables = (await pool.query(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = 'class_students_fault' ORDER BY table_name`
        )).rows.map(r => r.table_name);

        const classes = [];
        let total = 0;
        if (tables.length > 0) {
          const cols = (await pool.query(
            `SELECT table_name, column_name FROM information_schema.columns
             WHERE table_schema = 'class_students_fault' AND column_name IN ('ethiopian_year', 'ethiopian_month')`
          )).rows;
          const colMap = {};
          for (const c of cols) {
            if (!colMap[c.table_name]) colMap[c.table_name] = {};
            colMap[c.table_name][c.column_name] = true;
          }

          // Count per table: unfiltered tables in one aggregated query, filtered ones individually.
          const simpleParts = [];
          for (const t of tables) {
            const hasYear = year && colMap[t]?.ethiopian_year;
            const hasMonth = month && colMap[t]?.ethiopian_month;
            const f = [];
            const v = [];
            if (hasYear) { v.push(year); f.push(`ethiopian_year = $${v.length}`); }
            if (hasMonth) { v.push(month); f.push(`ethiopian_month = $${v.length}`); }
            const tWhere = f.length > 0 ? `WHERE ${f.join(' AND ')}` : '';
            const safeName = String(t).replace(/'/g, "''");
            if (v.length === 0) {
              simpleParts.push(`SELECT '${safeName}' AS class_name, COUNT(*)::int AS faults FROM class_students_fault."${t}" ${tWhere}`);
            } else {
              const cnt = (await pool.query(`SELECT COUNT(*)::int AS c FROM class_students_fault."${t}" ${tWhere}`, v)).rows[0].c;
              classes.push({ className: t, faults: cnt });
              total += cnt;
            }
          }
          if (simpleParts.length > 0) {
            const rows = (await pool.query(
              `SELECT class_name, faults FROM (${simpleParts.join(' UNION ALL ')}) agg ORDER BY class_name`
            )).rows;
            for (const r of rows) { classes.push({ className: r.class_name, faults: r.faults }); total += r.faults; }
          }
          classes.sort((a, c) => a.className.localeCompare(c.className));
        }

        return { entry: { branchCode: b.branch_code, branchName: b.branch_name, total, classes }, total };
      } catch (e) {
        return { entry: { branchCode: b.branch_code, branchName: b.branch_name, error: e.message }, total: 0 };
      }
    }));

    const byBranch = results.map(r => r.entry);
    let grandTotal = 0;
    for (const r of results) grandTotal += r.total;

    res.json({
      success: true,
      filters: { year, month },
      data: { grandTotal, byBranch }
    });
  } catch (error) {
    console.error('Faults report error:', error);
    res.status(500).json({ error: 'Failed to build faults report', message: error.message });
  }
});

// ---- FINANCE: monthly payments by class and branch, filterable by Ethiopian month ----
router.get('/report/finance', authenticateToken, authorizeRoles('super_admin'), async (req, res) => {
  try {
    const branches = await getSelectedBranches(req.query.branchCode);
    const filterMonth = req.query.month ? parseInt(req.query.month) : null;

    const ethiopianCalendar = require('../utils/ethiopianCalendar');
    const shifted = new Date(Date.now() + 3 * 3600 * 1000);
    const ethiopiaLocal = new Date(Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
      12, 0, 0
    ));
    let currentEthMonth = 2;
    try {
      const eth = ethiopianCalendar.toEthiopian(ethiopiaLocal);
      currentEthMonth = eth.year < 2019 ? 1 : eth.month;
    } catch (e) {
      currentEthMonth = 2;
    }

    const ETH_MONTH_NAMES = [
      'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
      'Megabit', 'Miazia', 'Ginbot', 'Sene'
    ];

    const todaySchoolLocal = shifted.toISOString().substring(0, 10);

    const feeSchedule = [
      { category: 'Kindergarten (Iqra 2, 3, 5)', classes: 'KG1A, KG1B, KG2A, KG2B', monthlyFee: 2000, oldRegFee: 700, newRegFee: 900, m1Old: 2700, m1New: 2900 },
      { category: 'Kindergarten (Iqra 4)', classes: 'KG1, KG2', monthlyFee: 1600, oldRegFee: 700, newRegFee: 900, m1Old: 2300, m1New: 2500 },
      { category: 'Primary (Iqra 2, 3, 5)', classes: 'Grade 1 to Grade 6', monthlyFee: 1900, oldRegFee: 800, newRegFee: 1000, m1Old: 2700, m1New: 2900 },
      { category: 'Primary (Iqra 4)', classes: 'Grade 1 to Grade 6', monthlyFee: 1500, oldRegFee: 700, newRegFee: 900, m1Old: 2200, m1New: 2400 },
      { category: 'Junior High (Iqra 2, 3, 5)', classes: 'Grade 7 & Grade 8', monthlyFee: 2200, oldRegFee: 1200, newRegFee: 1400, m1Old: 3400, m1New: 3600 },
      { category: 'Junior High (Iqra 4)', classes: 'Grade 7 & Grade 8', monthlyFee: 1900, oldRegFee: 1200, newRegFee: 1400, m1Old: 3100, m1New: 3300 },
      { category: 'High School (Iqra 2, 3)', classes: 'Grade 9 & Grade 10', monthlyFee: 2500, oldRegFee: 1200, newRegFee: 1400, m1Old: 3700, m1New: 3900 },
      { category: 'Preparatory (Iqra 3)', classes: 'Grade 11 & Grade 12', monthlyFee: 3000, oldRegFee: 1500, newRegFee: 1800, m1Old: 4500, m1New: 4800 }
    ];

    let grandStudents = 0, grandOld = 0, grandNew = 0, grandUnassigned = 0;
    let grandFreeStudents = 0, grandPayingStudents = 0, grandUnpaidUnlocked = 0;
    let grandCollected = 0, grandPendingUnlocked = 0, grandPendingAll = 0, grandAdvance = 0;
    let grandCollectedToday = 0;

    const classTotals = {};
    const byBranch = [];

    const results = await Promise.all(branches.map(async (b) => {
      const pool = await getPoolSafe(b);
      if (!pool) {
        return { entry: { branchCode: b.branch_code, branchName: b.branch_name, error: 'Database unreachable' }, classes: [] };
      }

      try {
        // 1. Fee structures
        const fsRes = await pool.query(`
          SELECT fs.id, fs."gradeLevel", fs.name, fs.description,
                 fsi.description as item_desc, fsi."feeCategory", fsi.amount
          FROM school_comms."FeeStructure" fs
          LEFT JOIN school_comms."FeeStructureItem" fsi ON fs.id = fsi."feeStructureId"
          ORDER BY fs."gradeLevel"
        `);
        const feeMap = new Map();
        for (const row of fsRes.rows) {
          const g = row.gradeLevel;
          if (!feeMap.has(g)) {
            let descObj = {};
            try { descObj = JSON.parse(row.description || '{}'); } catch(e){}
            feeMap.set(g, {
              monthlyFee: parseFloat(row.amount || 0),
              oldRegFee: descObj.oldRegistrationFee || null,
              newRegFee: descObj.newRegistrationFee || null
            });
          }
        }

        for (const [grade, fee] of feeMap.entries()) {
          if (!fee.oldRegFee || !fee.newRegFee) {
            if (String(b.branch_code).toUpperCase() === 'IQRA4') {
              if (grade.startsWith('KG') || ['G1','G2','G3','G4','G5','G6'].includes(grade)) {
                fee.oldRegFee = 700; fee.newRegFee = 900;
              } else {
                fee.oldRegFee = 1200; fee.newRegFee = 1400;
              }
            } else {
              if (grade.startsWith('KG')) {
                fee.oldRegFee = 700; fee.newRegFee = 900;
              } else if (['G1','G1A','G1B','G2','G2A','G2B','G3','G3A','G3B','G4','G4A','G4B','G5','G5B','G6'].includes(grade)) {
                fee.oldRegFee = 800; fee.newRegFee = 1000;
              } else if (['G7','G8','G9','G10'].includes(grade)) {
                fee.oldRegFee = 1200; fee.newRegFee = 1400;
              } else if (['G11','G12'].includes(grade)) {
                fee.oldRegFee = 1500; fee.newRegFee = 1800;
              }
            }
          }
        }

        // 2. Class tables
        const classTablesRes = await pool.query(`
          SELECT table_name FROM information_schema.tables WHERE table_schema = 'classes_schema' ORDER BY table_name;
        `);
        const classNames = classTablesRes.rows.map(r => r.table_name);

        // 3. Invoices (with real receipt numbers from PaymentAllocation & Payment)
        const invRes = await pool.query(`
          SELECT i.id, i."invoiceNumber", 
                 COALESCE(i."receiptNumber", p."receiptNumber") as "receiptNumber",
                 i."studentId", i."feeStructureId",
                 i."totalAmount", i."netAmount", i."paidAmount", i.status, i.metadata, i."updatedAt"
          FROM school_comms."Invoice" i
          LEFT JOIN LATERAL (
            SELECT p2."receiptNumber"
            FROM school_comms."PaymentAllocation" pa
            JOIN school_comms."Payment" p2 ON pa."paymentId" = p2.id
            WHERE pa."invoiceId" = i.id AND p2."receiptNumber" IS NOT NULL
            ORDER BY pa."createdAt" DESC
            LIMIT 1
          ) p ON true
        `);

        const studentInvoices = new Map();
        for (const inv of invRes.rows) {
          const sid = String(inv.studentId).toLowerCase();
          if (!studentInvoices.has(sid)) studentInvoices.set(sid, []);
          const m = (inv.metadata && inv.metadata.monthNumber) ? Number(inv.metadata.monthNumber) : 0;
          studentInvoices.get(sid).push({
            ...inv,
            netAmount: parseFloat(inv.netAmount || 0),
            paidAmount: parseFloat(inv.paidAmount || 0),
            monthNumber: m
          });
        }

        // 4. Payments collected today
        let collectedToday = 0;
        try {
          const payRes = await pool.query(`
            SELECT amount, "paymentDate" FROM school_comms."Payment"
            WHERE status = 'COMPLETED' AND "paymentDate" > now() - interval '48 hours'
          `);
          for (const p of payRes.rows) {
            const localDate = new Date(new Date(p.paymentDate).getTime() + 3 * 3600 * 1000)
              .toISOString().substring(0, 10);
            if (localDate === todaySchoolLocal) {
              collectedToday += parseFloat(p.amount || 0);
            }
          }
        } catch (e) {}

        const branchClasses = [];
        const lockedMonthPayments = [];
        const branchUnassigned = [];
        const branchUnpaidStudents = [];

        let bTotalStudents = 0;
        let bTotalOld = 0;
        let bTotalNew = 0;
        let bTotalNull = 0;
        let bTotalFree = 0;
        let bTotalPaying = 0;
        let bUnpaidUnlocked = 0;

        let bExpectedUnlocked = 0;
        let bCollectedUnlocked = 0;
        let bTotalPendingUnlocked = 0;
        let bTotalPendingAll = 0;
        let bTotalAdvance = 0;
        let bM1Expected = 0, bM1Collected = 0;
        let bM2Expected = 0, bM2Collected = 0;

        for (const className of classNames) {
          const colRes = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'classes_schema' AND table_name = $1;
          `, [className]);
          const cols = new Set(colRes.rows.map(r => r.column_name));

          const hasIsActive = cols.has('is_active');
          const hasIsFree = cols.has('is_free');
          const hasOldOrNew = cols.has('old_or_new');

          let selectCols = ['school_id', 'class_id', 'student_name'];
          if (hasIsActive) selectCols.push('is_active');
          if (hasIsFree) selectCols.push('is_free');
          if (hasOldOrNew) selectCols.push('old_or_new');

          const whereClause = hasIsActive ? 'WHERE is_active = TRUE OR is_active IS NULL' : '';
          const stRes = await pool.query(`
            SELECT ${selectCols.join(', ')}
            FROM classes_schema."${className}"
            ${whereClause}
            ORDER BY student_name;
          `);

          const students = stRes.rows;
          if (students.length === 0) continue;

          let cOld = 0, cNew = 0, cNull = 0, cFree = 0;
          let cUnpaidUnlocked = 0;
          let cM1PaidCount = 0, cM2PaidCount = 0;
          let cExpectedUnlocked = 0, cCollectedUnlocked = 0, cTotalPendingUnlocked = 0, cTotalPendingAll = 0;
          let cM1Expected = 0, cM1Collected = 0;
          let cM2Expected = 0, cM2Collected = 0;
          let cAdvance = 0;

          const feeInfo = feeMap.get(className) || { monthlyFee: 0, oldRegFee: 0, newRegFee: 0 };

          for (const st of students) {
            bTotalStudents++;
            const sIdPadded = String(st.school_id).padStart(4, '0');
            const cIdPadded = String(st.class_id).padStart(12, '0');
            const sid = `00000000-0000-0000-${sIdPadded}-${cIdPadded}`.toLowerCase();

            const isFree = st.is_free === true;
            if (isFree) {
              cFree++;
              bTotalFree++;
            } else {
              bTotalPaying++;
            }

            const rawOldNew = (st.old_or_new || '').toString().trim().toLowerCase();
            if (rawOldNew === 'old') {
              cOld++; bTotalOld++;
            } else if (rawOldNew === 'new') {
              cNew++; bTotalNew++;
            } else {
              cNull++; bTotalNull++;
              branchUnassigned.push({
                branch: b.branch_name,
                branchCode: b.branch_code,
                class: className,
                studentName: st.student_name,
                schoolId: st.school_id,
                classId: st.class_id
              });
            }

            const invoices = studentInvoices.get(sid) || [];

            const m1Inv = invoices.find(inv => inv.monthNumber === 1);
            if (m1Inv) {
              cM1Expected += m1Inv.netAmount;
              cM1Collected += m1Inv.paidAmount;
              if (m1Inv.status === 'PAID') cM1PaidCount++;
            }

            const m2Inv = invoices.find(inv => inv.monthNumber === 2);
            if (m2Inv) {
              cM2Expected += m2Inv.netAmount;
              cM2Collected += m2Inv.paidAmount;
              if (m2Inv.status === 'PAID') cM2PaidCount++;
            }

            const studentUnpaidMonths = [];
            let studentTotalDue = 0;

            for (const inv of invoices) {
              if (inv.monthNumber <= currentEthMonth) {
                cExpectedUnlocked += inv.netAmount;
                cCollectedUnlocked += inv.paidAmount;
                const due = Math.max(inv.netAmount - inv.paidAmount, 0);
                if (due > 0) {
                  studentUnpaidMonths.push(ETH_MONTH_NAMES[inv.monthNumber - 1] || `Month ${inv.monthNumber}`);
                  studentTotalDue += due;
                  cTotalPendingUnlocked += due;
                }
              }

              if (inv.status !== 'PAID') {
                cTotalPendingAll += Math.max(inv.netAmount - inv.paidAmount, 0);
              }

              if (inv.monthNumber > currentEthMonth && inv.paidAmount > 0) {
                cAdvance += inv.paidAmount;
                bTotalAdvance += inv.paidAmount;
                const finalReceipt = (inv.receiptNumber && inv.receiptNumber !== 'N/A' && String(inv.receiptNumber).trim())
                  ? String(inv.receiptNumber).trim()
                  : (inv.invoiceNumber && String(inv.invoiceNumber).trim()
                      ? String(inv.invoiceNumber).trim()
                      : `RCP-${String(inv.id).padStart(6, '0')}`);
                lockedMonthPayments.push({
                  branch: b.branch_name,
                  branchCode: b.branch_code,
                  class: className,
                  studentName: st.student_name,
                  monthNumber: inv.monthNumber,
                  monthName: ETH_MONTH_NAMES[inv.monthNumber - 1] || `Month ${inv.monthNumber}`,
                  invoiceNumber: inv.invoiceNumber,
                  receiptNumber: finalReceipt,
                  paidAmount: inv.paidAmount
                });
              }
            }

            if (!isFree && studentUnpaidMonths.length > 0) {
              cUnpaidUnlocked++;
              bUnpaidUnlocked++;
              branchUnpaidStudents.push({
                branch: b.branch_name,
                branchCode: b.branch_code,
                class: className,
                studentName: st.student_name,
                schoolId: st.school_id,
                classId: st.class_id,
                unpaidMonths: studentUnpaidMonths,
                unpaidMonthsCount: studentUnpaidMonths.length,
                totalDue: Math.round(studentTotalDue * 100) / 100
              });
            }
          }

          bExpectedUnlocked += cExpectedUnlocked;
          bCollectedUnlocked += cCollectedUnlocked;
          bTotalPendingUnlocked += cTotalPendingUnlocked;
          bTotalPendingAll += cTotalPendingAll;
          bM1Expected += cM1Expected;
          bM1Collected += cM1Collected;
          bM2Expected += cM2Expected;
          bM2Collected += cM2Collected;

          const cTotalCollected = cCollectedUnlocked + cAdvance;
          const cRate = cExpectedUnlocked > 0 ? Math.round((cCollectedUnlocked / cExpectedUnlocked) * 100) : 0;

          branchClasses.push({
            className,
            totalStudents: students.length,
            oldStudents: cOld,
            newStudents: cNew,
            unassignedStudents: cNull,
            freeStudents: cFree,
            payingStudents: students.length - cFree,
            monthlyFee: feeInfo.monthlyFee || 0,
            oldRegFee: feeInfo.oldRegFee || 0,
            newRegFee: feeInfo.newRegFee || 0,
            m1PaidCount: cM1PaidCount,
            m2PaidCount: cM2PaidCount,
            unpaidUnlockedCount: cUnpaidUnlocked,
            m1Expected: Math.round(cM1Expected * 100) / 100,
            m1Collected: Math.round(cM1Collected * 100) / 100,
            m2Expected: Math.round(cM2Expected * 100) / 100,
            m2Collected: Math.round(cM2Collected * 100) / 100,
            expected: Math.round(cExpectedUnlocked * 100) / 100,
            collected: Math.round(cTotalCollected * 100) / 100,
            collectedUnlocked: Math.round(cCollectedUnlocked * 100) / 100,
            pending: Math.round(cTotalPendingUnlocked * 100) / 100,
            pendingUnlocked: Math.round(cTotalPendingUnlocked * 100) / 100,
            pendingAll: Math.round(cTotalPendingAll * 100) / 100,
            advanceCollected: Math.round(cAdvance * 100) / 100,
            rate: cRate,
            students: students.length
          });
        }

        const bTotalCollected = bCollectedUnlocked + bTotalAdvance;
        const bRate = bExpectedUnlocked > 0 ? Math.round((bCollectedUnlocked / bExpectedUnlocked) * 100) : 0;

        return {
          entry: {
            branchCode: b.branch_code,
            branchName: b.branch_name,
            totalStudents: bTotalStudents,
            oldStudents: bTotalOld,
            newStudents: bTotalNew,
            unassignedStudents: bTotalNull,
            freeStudents: bTotalFree,
            payingStudents: bTotalPaying,
            unpaidUnlocked: bUnpaidUnlocked,
            expected: Math.round(bExpectedUnlocked * 100) / 100,
            collected: Math.round(bTotalCollected * 100) / 100,
            collectedUnlocked: Math.round(bCollectedUnlocked * 100) / 100,
            pending: Math.round(bTotalPendingUnlocked * 100) / 100,
            pendingUnlocked: Math.round(bTotalPendingUnlocked * 100) / 100,
            pendingAll: Math.round(bTotalPendingAll * 100) / 100,
            advanceCollected: Math.round(bTotalAdvance * 100) / 100,
            collectedToday: Math.round(collectedToday * 100) / 100,
            m1Expected: Math.round(bM1Expected * 100) / 100,
            m1Collected: Math.round(bM1Collected * 100) / 100,
            m2Expected: Math.round(bM2Expected * 100) / 100,
            m2Collected: Math.round(bM2Collected * 100) / 100,
            rate: bRate,
            classes: branchClasses,
            lockedMonthPayments,
            unassignedStudents: branchUnassigned,
            unpaidStudents: branchUnpaidStudents
          },
          branchTotals: {
            totalStudents: bTotalStudents,
            oldStudents: bTotalOld,
            newStudents: bTotalNew,
            unassignedStudents: bTotalNull,
            freeStudents: bTotalFree,
            payingStudents: bTotalPaying,
            unpaidUnlocked: bUnpaidUnlocked,
            expected: bExpectedUnlocked,
            collected: bTotalCollected,
            collectedUnlocked: bCollectedUnlocked,
            pendingUnlocked: bTotalPendingUnlocked,
            pendingAll: bTotalPendingAll,
            advanceCollected: bTotalAdvance,
            collectedToday,
            m1Expected: bM1Expected,
            m1Collected: bM1Collected,
            m2Expected: bM2Expected,
            m2Collected: bM2Collected
          }
        };
      } catch (err) {
        console.error(`Error processing branch ${b.branch_code}:`, err);
        return { entry: { branchCode: b.branch_code, branchName: b.branch_name, error: err.message }, classes: [] };
      }
    }));

    let grandExpectedUnlocked = 0;
    let grandCollectedUnlocked = 0;
    let grandM1Expected = 0, grandM1Collected = 0;
    let grandM2Expected = 0, grandM2Collected = 0;
    const allUnassignedStudents = [];
    const allUnpaidStudents = [];

    for (const r of results) {
      if (r.entry) {
        byBranch.push(r.entry);
        if (r.entry.unassignedStudents) {
          allUnassignedStudents.push(...r.entry.unassignedStudents);
        }
        if (r.entry.unpaidStudents) {
          allUnpaidStudents.push(...r.entry.unpaidStudents);
        }
      }
      if (r.branchTotals) {
        grandStudents += r.branchTotals.totalStudents;
        grandOld += r.branchTotals.oldStudents;
        grandNew += r.branchTotals.newStudents;
        grandUnassigned += r.branchTotals.unassignedStudents;
        grandFreeStudents += r.branchTotals.freeStudents;
        grandPayingStudents += r.branchTotals.payingStudents;
        grandUnpaidUnlocked += r.branchTotals.unpaidUnlocked;
        grandCollected += r.branchTotals.collected;
        grandCollectedUnlocked += r.branchTotals.collectedUnlocked;
        grandExpectedUnlocked += r.branchTotals.expected;
        grandPendingUnlocked += r.branchTotals.pendingUnlocked;
        grandPendingAll += r.branchTotals.pendingAll;
        grandAdvance += r.branchTotals.advanceCollected;
        grandCollectedToday += r.branchTotals.collectedToday;
        grandM1Expected += r.branchTotals.m1Expected;
        grandM1Collected += r.branchTotals.m1Collected;
        grandM2Expected += r.branchTotals.m2Expected;
        grandM2Collected += r.branchTotals.m2Collected;
      }
      for (const c of r.entry?.classes || []) {
        if (!classTotals[c.className]) {
          classTotals[c.className] = {
            className: c.className,
            students: 0,
            totalStudents: 0,
            oldStudents: 0,
            newStudents: 0,
            freeStudents: 0,
            payingStudents: 0,
            unpaidUnlocked: 0,
            m1Expected: 0,
            m1Collected: 0,
            m2Expected: 0,
            m2Collected: 0,
            expected: 0,
            collected: 0,
            pending: 0
          };
        }
        classTotals[c.className].students += c.totalStudents;
        classTotals[c.className].totalStudents += c.totalStudents;
        classTotals[c.className].oldStudents += c.oldStudents;
        classTotals[c.className].newStudents += c.newStudents;
        classTotals[c.className].freeStudents += c.freeStudents;
        classTotals[c.className].payingStudents += c.payingStudents;
        classTotals[c.className].unpaidUnlocked += c.unpaidUnlockedCount;
        classTotals[c.className].m1Expected += c.m1Expected || 0;
        classTotals[c.className].m1Collected += c.m1Collected || 0;
        classTotals[c.className].m2Expected += c.m2Expected || 0;
        classTotals[c.className].m2Collected += c.m2Collected || 0;
        classTotals[c.className].expected += c.expected || 0;
        classTotals[c.className].collected += c.collected || 0;
        classTotals[c.className].pending += c.pendingUnlocked || 0;
      }
    }

    const grandRate = grandExpectedUnlocked > 0 ? Math.round((grandCollectedUnlocked / grandExpectedUnlocked) * 100) : 0;

    res.json({
      success: true,
      filters: { month: filterMonth },
      data: {
        academicYear: '2019 E.C. (2026/2027 G.C.)',
        currentEthMonth,
        currentEthMonthName: ETH_MONTH_NAMES[currentEthMonth - 1] || `Month ${currentEthMonth}`,
        grandStudents,
        grandOld,
        grandNew,
        grandUnassigned,
        grandFreeStudents,
        grandPayingStudents,
        grandUnpaidUnlocked,
        grandExpected: Math.round(grandExpectedUnlocked * 100) / 100,
        grandCollected: Math.round(grandCollected * 100) / 100,
        grandCollectedUnlocked: Math.round(grandCollectedUnlocked * 100) / 100,
        grandPending: Math.round(grandPendingUnlocked * 100) / 100,
        grandPendingUnlocked: Math.round(grandPendingUnlocked * 100) / 100,
        grandPendingAll: Math.round(grandPendingAll * 100) / 100,
        grandAdvance: Math.round(grandAdvance * 100) / 100,
        grandCollectedToday: Math.round(grandCollectedToday * 100) / 100,
        grandM1Expected: Math.round(grandM1Expected * 100) / 100,
        grandM1Collected: Math.round(grandM1Collected * 100) / 100,
        grandM2Expected: Math.round(grandM2Expected * 100) / 100,
        grandM2Collected: Math.round(grandM2Collected * 100) / 100,
        grandRate,
        feeSchedule,
        byBranch,
        byClass: Object.values(classTotals).sort((a, c) => a.className.localeCompare(c.className)),
        unassignedStudents: allUnassignedStudents,
        unpaidStudents: allUnpaidStudents
      }
    });
  } catch (error) {
    console.error('Finance report error:', error);
    res.status(500).json({ error: 'Failed to build finance report', message: error.message });
  }
});

// ---- REGISTRATIONS: new vs old students (by registration fee) + students added by date ----
router.get('/report/registrations', authenticateToken, authorizeRoles('super_admin'), async (req, res) => {
  try {
    const branches = await getSelectedBranches(req.query.branchCode);
    const from = req.query.from || null; // YYYY-MM-DD
    const to = req.query.to || null;     // YYYY-MM-DD

    const byBranch = [];
    let grandTotal = 0, grandNew = 0, grandOld = 0, grandUnknown = 0, grandAdded = 0, grandAddedToday = 0;

    // Today (school-local = UTC+3)
    const todaySchoolLocal = new Date(Date.now() + 3 * 3600 * 1000).toISOString().substring(0, 10);

    const results = await Promise.all(branches.map(async (b) => {
      const pool = await getPoolSafe(b);
      if (!pool) {
        return { entry: { branchCode: b.branch_code, branchName: b.branch_name, error: 'Database unreachable' } };
      }
      try {
        const meta = (await pool.query(
          `SELECT t.table_name,
                  COALESCE(BOOL_OR(c.column_name = 'old_or_new'), FALSE) AS has_old_new,
                  COALESCE(BOOL_OR(c.column_name = 'is_active'), FALSE) AS has_active
           FROM information_schema.tables t
           LEFT JOIN information_schema.columns c
             ON c.table_schema = t.table_schema AND c.table_name = t.table_name
            AND c.column_name IN ('old_or_new', 'is_active')
           WHERE t.table_schema = 'classes_schema'
           GROUP BY t.table_name
           ORDER BY t.table_name`
        )).rows;
        const tables = meta.map(r => r.table_name);

        // Fee structures (latest active wins)
        const fsRes = await pool.query(`
          SELECT fs."gradeLevel", fs.description
          FROM school_comms."FeeStructure" fs
          WHERE fs."isActive" = true
          ORDER BY fs.id DESC
        `);
        const fsByClass = {};
        for (const row of fsRes.rows) {
          if (fsByClass[row.gradeLevel]) continue;
          let newRegFee = 0;
          let oldRegFee = 0;
          try {
            let desc = (row.description || '{}')
              .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
            const monthsData = JSON.parse(desc);
            newRegFee = parseFloat(monthsData.newRegistrationFee) || 0;
            oldRegFee = parseFloat(monthsData.oldRegistrationFee) || 0;
          } catch (e) { /* no reg fees */ }
          fsByClass[row.gradeLevel] = { newRegFee, oldRegFee };
        }

        const classes = [];
        const added = [];
        let total = 0, newCount = 0, oldCount = 0, unknownCount = 0, addedToday = 0;

        // Preload students per class, then bulk-fetch month-1 invoices and
        // machine-id registration dates (3 queries total instead of ~3 per student).
        const metaByClass = {};
        for (const m of meta) metaByClass[m.table_name] = m;

        const classRows = [];
        for (const cls of tables) {
          const m = metaByClass[cls] || {};
          const where = m.has_active ? `WHERE (is_active IS NULL OR is_active = TRUE)` : '';
          const students = await pool.query(
            m.has_old_new
              ? `SELECT school_id, class_id, student_name, smachine_id, old_or_new FROM classes_schema."${cls}" ${where}`
              : `SELECT school_id, class_id, student_name, smachine_id, NULL AS old_or_new FROM classes_schema."${cls}" ${where}`
          );
          classRows.push({ cls, rows: students.rows });
        }

        const sidOf = (st) => `00000000-0000-0000-${String(st.school_id).padStart(4, '0')}-${String(st.class_id).padStart(12, '0')}`;

        const invBySid = new Map();
        try {
          const invRows = (await pool.query(
            `SELECT "studentId"::text AS sid, "issueDate", metadata FROM school_comms."Invoice"
             WHERE (metadata->>'monthNumber')::int = 1`
          )).rows;
          for (const r of invRows) {
            if (r.sid && !invBySid.has(r.sid)) invBySid.set(r.sid, r);
          }
        } catch (e) { /* invoices table may be missing */ }

        const smachineIds = new Set();
        for (const cr of classRows) {
          for (const st of cr.rows) {
            if (st.smachine_id) smachineIds.add(String(st.smachine_id));
          }
        }
        const gmiBySm = new Map();
        if (smachineIds.size > 0) {
          try {
            const g = (await pool.query(
              `SELECT smachine_id::text AS sm, created_at FROM school_schema_points.global_machine_ids
               WHERE smachine_id::text = ANY($1::text[])`,
              [[...smachineIds]]
            )).rows;
            for (const r of g) gmiBySm.set(r.sm, r.created_at);
          } catch (e) { /* tracker table may be missing */ }
        }

        for (const cr of classRows) {
          const cls = cr.cls;
          const fs = fsByClass[cls] || { newRegFee: 0, oldRegFee: 0 };
          const clsStats = { className: cls, total: 0, newCount: 0, oldCount: 0, unknownCount: 0 };

          for (const st of cr.rows) {
            const sid = sidOf(st);

            // Month-1 invoice gives the charged registration fee + a fallback date
            const inv = invBySid.get(sid);
            let regFee = 0;
            let invDate = null;
            if (inv) {
              regFee = parseFloat(inv.metadata?.registrationFee || 0);
              invDate = inv.issueDate;
            }

            // Registration date: machine ID tracker first, month-1 invoice date as fallback
            let regDate = invDate;
            if (st.smachine_id) {
              const createdAt = gmiBySm.get(String(st.smachine_id));
              if (createdAt) regDate = createdAt;
            }

            // New vs Old: the student's registration fee type (old_or_new field), fallback to the charged reg fee
            let type = 'unknown';
            const declared = st.old_or_new ? String(st.old_or_new).toLowerCase() : '';
            if (declared === 'old') type = 'old';
            else if (declared === 'new') type = 'new';
            else if (regFee > 0 && fs.oldRegFee > 0 && regFee === fs.oldRegFee) type = 'old';
            else if (regFee > 0 && fs.newRegFee > 0 && regFee === fs.newRegFee) type = 'new';

            clsStats.total++;
            if (type === 'new') { clsStats.newCount++; newCount++; }
            else if (type === 'old') { clsStats.oldCount++; oldCount++; }
            else { clsStats.unknownCount++; unknownCount++; }

            // Added by date (school-local date = UTC + 3h)
            if (regDate) {
              const localDate = new Date(new Date(regDate).getTime() + 3 * 3600 * 1000)
                .toISOString().substring(0, 10);
              if (from && to && localDate >= from && localDate <= to) {
                added.push({
                  studentName: st.student_name,
                  className: cls,
                  branchCode: b.branch_code,
                  branchName: b.branch_name,
                  date: localDate,
                  type,
                  regFee
                });
              }
              if (localDate === todaySchoolLocal) addedToday++;
            }
          }

          classes.push(clsStats);
          total += clsStats.total;
        }

        classes.sort((a, c) => a.className.localeCompare(c.className));
        added.sort((a, z) => (z.date || '').localeCompare(a.date || ''));

        return {
          entry: {
            branchCode: b.branch_code,
            branchName: b.branch_name,
            total, newCount, oldCount, unknownCount,
            addedCount: added.length,
            addedToday,
            classes,
            added
          },
          total, newCount, oldCount, unknownCount, addedCount: added.length, addedToday
        };
      } catch (e) {
        return { entry: { branchCode: b.branch_code, branchName: b.branch_name, error: e.message } };
      }
    }));

    for (const r of results) {
      byBranch.push(r.entry);
      grandTotal += r.total || 0;
      grandNew += r.newCount || 0;
      grandOld += r.oldCount || 0;
      grandUnknown += r.unknownCount || 0;
      grandAdded += r.addedCount || 0;
      grandAddedToday += r.addedToday || 0;
    }

    res.json({
      success: true,
      filters: { from, to },
      data: {
        grandTotal, grandNew, grandOld, grandUnknown, grandAdded, grandAddedToday,
        byBranch
      }
    });
  } catch (error) {
    console.error('Registrations report error:', error);
    res.status(500).json({ error: 'Failed to build registrations report', message: error.message });
  }
});

// ---- BRANCHES list ----
router.get('/branches', authenticateToken, authorizeRoles('super_admin'), async (req, res) => {
  try {
    const branches = (await dbManager.getAllBranches()).filter(
      (b) => ALLOWED_BRANCHES.includes(String(b.branch_code).toUpperCase())
    );
    res.json({ success: true, branches, total: branches.length });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

// ---- ACCOUNT: change username / password ----
router.put('/account', authenticateToken, authorizeRoles('super_admin'), async (req, res) => {
  const pool = getMasterPool();
  try {
    const { currentPassword, newUsername, newPassword } = req.body;
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required' });
    }
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(400).json({ error: 'Account id missing from token' });
    }

    const result = await pool.query('SELECT * FROM super_admins WHERE id = $1', [adminId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    const admin = result.rows[0];

    const isValid = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const updates = [];
    const values = [];
    if (newUsername && String(newUsername).trim() !== admin.username) {
      const dup = await pool.query('SELECT id FROM super_admins WHERE username = $1 AND id <> $2', [String(newUsername).trim(), adminId]);
      if (dup.rows.length > 0) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      updates.push(`username = $${values.length + 1}`);
      values.push(String(newUsername).trim());
    }
    if (newPassword) {
      if (String(newPassword).length < 4) {
        return res.status(400).json({ error: 'New password must be at least 4 characters' });
      }
      const hash = await bcrypt.hash(String(newPassword), 10);
      updates.push(`password_hash = $${values.length + 1}`);
      values.push(hash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nothing to change' });
    }

    values.push(adminId);
    await pool.query(`UPDATE super_admins SET ${updates.join(', ')} WHERE id = $${values.length}`, values);
    res.json({ success: true, message: 'Account updated successfully' });
  } catch (error) {
    console.error('Super admin account update error:', error);
    res.status(500).json({ error: 'Failed to update account', message: error.message });
  } finally {
    await pool.end().catch(() => {});
  }
});

module.exports = router;