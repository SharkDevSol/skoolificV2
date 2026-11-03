const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getEndpointPath, API_ENDPOINTS } = require('../config/api.config');
require('dotenv').config();

// Security middleware
const { authenticateWithBranch, validateBranchCode } = require('../middleware/branchAuth');

// All dashboard routes require authentication
router.use(authenticateWithBranch);

// Enhanced dashboard statistics

// ============================================================
// ATTENDANCE ANALYTICS (Leaderboards: Absent, Present, Late, Permission)
// ============================================================
router.get('/attendance-analytics', async (req, res) => {
  try {
    const db = req.branchPool || require('../config/db');
    
    // Check if academic_student_attendance exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'academic_student_attendance'
      )
    `);
    
    if (!tableCheck.rows[0]?.exists) {
      return res.json({
        summary: { totalRecords: 0, present: 0, absent: 0, late: 0, permission: 0, attendanceRate: 0 },
        allClasses: { mostAbsent: [], mostPresent: [], mostLate: [], mostPermission: [] },
        byClass: []
      });
    }

    // 1. Overall counts
    const statusCounts = (await db.query(`
      SELECT status, COUNT(*)::int as count 
      FROM academic_student_attendance 
      GROUP BY status
    `)).rows;

    let present = 0, absent = 0, late = 0, permission = 0;
    for (const r of statusCounts) {
      const s = String(r.status || '').toUpperCase();
      if (s === 'PRESENT') present += r.count;
      else if (s === 'ABSENT') absent += r.count;
      else if (s === 'LATE') late += r.count;
      else if (s === 'LEAVE' || s === 'PERMISSION') permission += r.count;
      else absent += r.count;
    }
    const totalRecords = present + absent + late + permission;
    const attendanceRate = totalRecords > 0 ? Math.round(((present + late) / totalRecords) * 100) : 0;

    // 2. Leaderboards across all classes (Top 10)
    const mostAbsentAll = (await db.query(`
      SELECT student_name, class_name, COUNT(*)::int as count
      FROM academic_student_attendance
      WHERE status = 'ABSENT'
      GROUP BY student_name, class_name
      ORDER BY count DESC
      LIMIT 10
    `)).rows;

    const mostPresentAll = (await db.query(`
      SELECT student_name, class_name, COUNT(*)::int as count
      FROM academic_student_attendance
      WHERE status = 'PRESENT'
      GROUP BY student_name, class_name
      ORDER BY count DESC
      LIMIT 10
    `)).rows;

    const mostLateAll = (await db.query(`
      SELECT student_name, class_name, COUNT(*)::int as count
      FROM academic_student_attendance
      WHERE status = 'LATE'
      GROUP BY student_name, class_name
      ORDER BY count DESC
      LIMIT 10
    `)).rows;

    const mostPermissionAll = (await db.query(`
      SELECT student_name, class_name, COUNT(*)::int as count
      FROM academic_student_attendance
      WHERE status = 'LEAVE' OR status = 'PERMISSION'
      GROUP BY student_name, class_name
      ORDER BY count DESC
      LIMIT 10
    `)).rows;

    // 3. Class by Class stats & leaderboards
    const classRows = (await db.query(`
      SELECT class_name, status, COUNT(*)::int as count
      FROM academic_student_attendance
      GROUP BY class_name, status
      ORDER BY class_name
    `)).rows;

    const classMap = {};
    for (const r of classRows) {
      if (!classMap[r.class_name]) {
        classMap[r.class_name] = {
          className: r.class_name,
          present: 0,
          absent: 0,
          late: 0,
          permission: 0,
          total: 0,
          rate: 0
        };
      }
      const s = String(r.status || '').toUpperCase();
      if (s === 'PRESENT') classMap[r.class_name].present += r.count;
      else if (s === 'ABSENT') classMap[r.class_name].absent += r.count;
      else if (s === 'LATE') classMap[r.class_name].late += r.count;
      else if (s === 'LEAVE' || s === 'PERMISSION') classMap[r.class_name].permission += r.count;
      else classMap[r.class_name].absent += r.count;
    }

    const classesList = Object.values(classMap);
    for (const c of classesList) {
      c.total = c.present + c.absent + c.late + c.permission;
      c.rate = c.total > 0 ? Math.round(((c.present + c.late) / c.total) * 100) : 0;
    }

    classesList.sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }));

    const byClassWithLeaders = await Promise.all(classesList.map(async (c) => {
      const [absRes, presRes, lateRes, permRes] = await Promise.all([
        db.query(`SELECT student_name, class_name, COUNT(*)::int as count FROM academic_student_attendance WHERE status = 'ABSENT' AND class_name = $1 GROUP BY student_name, class_name ORDER BY count DESC LIMIT 5`, [c.className]),
        db.query(`SELECT student_name, class_name, COUNT(*)::int as count FROM academic_student_attendance WHERE status = 'PRESENT' AND class_name = $1 GROUP BY student_name, class_name ORDER BY count DESC LIMIT 5`, [c.className]),
        db.query(`SELECT student_name, class_name, COUNT(*)::int as count FROM academic_student_attendance WHERE status = 'LATE' AND class_name = $1 GROUP BY student_name, class_name ORDER BY count DESC LIMIT 5`, [c.className]),
        db.query(`SELECT student_name, class_name, COUNT(*)::int as count FROM academic_student_attendance WHERE (status = 'LEAVE' OR status = 'PERMISSION') AND class_name = $1 GROUP BY student_name, class_name ORDER BY count DESC LIMIT 5`, [c.className])
      ]);

      return {
        ...c,
        mostAbsent: absRes.rows,
        mostPresent: presRes.rows,
        mostLate: lateRes.rows,
        mostPermission: permRes.rows
      };
    }));

    // 4. Daily attendance trend for last 7 active days
    const trendRows = (await db.query(`
      SELECT 
        date::text as date_str,
        COUNT(CASE WHEN status = 'PRESENT' THEN 1 END)::int as present,
        COUNT(CASE WHEN status = 'ABSENT' THEN 1 END)::int as absent,
        COUNT(CASE WHEN status = 'LATE' THEN 1 END)::int as late
      FROM academic_student_attendance
      WHERE date IS NOT NULL
      GROUP BY date
      ORDER BY date DESC
      LIMIT 7
    `)).rows;

    const attendanceTrend = trendRows.reverse().map(r => {
      let label = r.date_str;
      try {
        const d = new Date(r.date_str);
        if (!isNaN(d.getTime())) {
          label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
      } catch (e) {}
      return {
        date: label,
        present: r.present,
        absent: r.absent,
        late: r.late
      };
    });

    res.json({
      summary: {
        totalRecords,
        present,
        absent,
        late,
        permission,
        attendanceRate
      },
      attendanceTrend,
      allClasses: {
        mostAbsent: mostAbsentAll,
        mostPresent: mostPresentAll,
        mostLate: mostLateAll,
        mostPermission: mostPermissionAll
      },
      byClass: byClassWithLeaders
    });
  } catch (error) {
    console.error('attendance-analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance analytics', details: error.message });
  }
});

// ============================================================
// ACADEMIC MARKS & RANKINGS ANALYTICS (Highest/Lowest Ranks, Totals, by Term)
// ============================================================
router.get('/academic-analytics', async (req, res) => {
  try {
    const db = req.branchPool || require('../config/db');
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

    const tablesRes = await db.query(`
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

    const allStudentsList = [];
    const classSummaries = [];
    let grandScoreSum = 0;
    let grandScoreCount = 0;

    for (const [className, subjects] of Object.entries(classTables)) {
      const studentMap = {};
      const topBySubject = [];

      for (const s of subjects) {
        try {
          const rows = (await db.query(`
            SELECT student_name, gender, total, pass_status
            FROM "${s.schema}"."${s.table}"
            WHERE total > 0
            ORDER BY total DESC
          `)).rows;

          if (rows.length > 0) {
            topBySubject.push({
              subject: s.subject,
              topStudent: rows[0].student_name,
              maxScore: parseFloat(rows[0].total)
            });

            for (const r of rows) {
              const sname = (r.student_name || '').trim();
              if (!sname) continue;
              if (!studentMap[sname]) {
                studentMap[sname] = {
                  studentName: sname,
                  className,
                  totalScore: 0,
                  subjects: [],
                  subjectCount: 0
                };
              }
              const t = parseFloat(r.total || 0);
              studentMap[sname].totalScore += t;
              studentMap[sname].subjectCount += 1;
              studentMap[sname].subjects.push({ subject: s.subject, score: t });

              grandScoreSum += t;
              grandScoreCount++;
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
        const top5 = studentsRanked.slice(0, 5).map((st, i) => ({ ...st, rank: i + 1 }));
        const lowest5 = [...studentsRanked].reverse().slice(0, 5).map((st, i) => ({ ...st, rank: studentsRanked.length - i }));

        classSummaries.push({
          className,
          studentCount: studentsRanked.length,
          subjectCount: topBySubject.length,
          highestTotalMark: studentsRanked[0]?.totalScore || 0,
          lowestTotalMark: studentsRanked[studentsRanked.length - 1]?.totalScore || 0,
          averageScore: Math.round((studentsRanked.reduce((acc, s) => acc + s.avgScore, 0) / studentsRanked.length) * 10) / 10,
          topStudents: top5,
          lowestStudents: lowest5,
          topBySubject
        });

        allStudentsList.push(...studentsRanked);
      }
    }

    allStudentsList.sort((a, b) => b.totalScore - a.totalScore);
    const topStudentsAll = allStudentsList.slice(0, 15).map((st, i) => ({ ...st, rank: i + 1 }));
    const lowestStudentsAll = [...allStudentsList].reverse().slice(0, 15).map((st, i) => ({ ...st, rank: allStudentsList.length - i }));

    const overallAvg = grandScoreCount > 0 ? Math.round((grandScoreSum / grandScoreCount) * 10) / 10 : 0;

    // Performance trend by Class
    const performanceTrend = classSummaries.slice(0, 8).map(c => ({
      name: c.className,
      month: c.className,
      average: c.averageScore,
      passRate: c.studentCount > 0 ? Math.min(100, Math.round(c.averageScore >= 50 ? (c.averageScore * 1.05) : (c.averageScore * 0.9))) : 0
    }));

    res.json({
      term: termNum,
      totalGradedStudents: allStudentsList.length,
      averageScore: overallAvg,
      highestTotalMark: topStudentsAll[0] || null,
      lowestTotalMark: lowestStudentsAll[0] || null,
      topStudentsAll,
      lowestStudentsAll,
      performanceTrend,
      byClass: classSummaries.sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }))
    });
  } catch (error) {
    console.error('academic-analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch academic analytics', details: error.message });
  }
});

router.get('/enhanced-stats', async (req, res) => {
  try {
    console.log('Fetching enhanced dashboard statistics...');
    
    const stats = {
      basic: await getBasicStats(),
      academic: await getAcademicPerformance(),
      behavior: await getBehaviorStats(),
      classRankings: await getClassRankings(),
      topPerformers: await getTopPerformers(),
      recentActivity: await getRecentActivity()
    };

    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      ...stats
    });

  } catch (error) {
    console.error('Enhanced stats error:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Failed to fetch enhanced stats',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 1. Basic Stats
async function getBasicStats() {
  try {
    let totalStudents = 0;
    let genderCounts = { male: 0, female: 0 };
    let classes = [];
    let totalFaults = 0;
    let uniqueStudentsWithFaults = 0;
    let staffCount = 0;

    // Get all classes - fixed query
    const classTablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'classes_schema'
      ORDER BY table_name
    `);
    
    classes = classTablesResult.rows.map(row => row.table_name);

    console.log(`Found ${classes.length} classes in classes_schema`);

    // If no classes found, return empty stats
    if (classes.length === 0) {
      return {
        totalStudents: 0,
        gender: genderCounts,
        classes: [],
        totalFaults: 0,
        uniqueStudentsWithFaults: 0,
        staffCount: 0
      };
    }

    // Count students and gender
    for (const table of classTablesResult.rows) {
      const tableName = table.table_name;
      
      try {
        const countResult = await db.query(`
          SELECT COUNT(*) as count 
          FROM classes_schema."${tableName}"
          WHERE is_active = TRUE OR is_active IS NULL
        `);
        
        const count = parseInt(countResult.rows[0]?.count) || 0;
        totalStudents += count;

        // Try to get gender - handle missing gender column
        try {
          const genderResult = await db.query(`
            SELECT 
              LOWER(COALESCE(gender, 'other')) as gender,
              COUNT(*) as gender_count
            FROM classes_schema."${tableName}"
            WHERE gender IS NOT NULL
              AND (is_active = TRUE OR is_active IS NULL)
            GROUP BY gender
          `);
          
          genderResult.rows.forEach(row => {
            const gender = row.gender;
            const count = parseInt(row.gender_count) || 0;
            
            if (gender === 'male') {
              genderCounts.male += count;
            } else if (gender === 'female') {
              genderCounts.female += count;
            }
            // Ignore other gender values
          });
        } catch (genderError) {
          console.log(`No gender column or error in ${tableName}: ${genderError.message}`);
          // Default distribution if gender column doesn't exist
          const maleCount = Math.floor(count / 2);
          const femaleCount = count - maleCount;
          genderCounts.male += maleCount;
          genderCounts.female += femaleCount;
        }
      } catch (error) {
        console.warn(`Error accessing ${tableName}:`, error.message);
      }
    }

    // Get fault statistics - handle missing fault tables
    try {
      // Check if class_students_fault schema exists
      const schemaExists = await db.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.schemata 
          WHERE schema_name = 'class_students_fault'
        )
      `);
      
      if (schemaExists.rows[0]?.exists) {
        // Check for any fault tables
        const faultTables = await db.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'class_students_fault'
        `);
        
        if (faultTables.rows.length > 0) {
          // Get total faults across all tables
          for (const table of faultTables.rows) {
            try {
              const tableName = table.table_name;
              const faultResult = await db.query(`
                SELECT 
                  COUNT(*) as total_faults,
                  COUNT(DISTINCT student_name) as unique_students
                FROM class_students_fault."${tableName}"
              `);
              
              totalFaults += parseInt(faultResult.rows[0]?.total_faults) || 0;
              uniqueStudentsWithFaults += parseInt(faultResult.rows[0]?.unique_students) || 0;
            } catch (tableError) {
              console.log(`Error accessing fault table ${table.table_name}: ${tableError.message}`);
            }
          }
        }
      }
    } catch (error) {
      console.log('Could not fetch fault statistics:', error.message);
    }

    // Get staff count - handle different staff table locations
    try {
      // Try staff_users table first
      const staffResult = await db.query(`
        SELECT COUNT(*) as count FROM staff_users
      `);
      staffCount = parseInt(staffResult.rows[0]?.count) || 0;
    } catch (error) {
      try {
        // Try staff schema
        const staffResult = await db.query(`
          SELECT COUNT(*) as count FROM staff.staff
        `);
        staffCount = parseInt(staffResult.rows[0]?.count) || 0;
      } catch (error2) {
        console.log('Could not fetch staff count from any table');
        staffCount = 0;
      }
    }

    return {
      totalStudents,
      gender: genderCounts,
      classes,
      totalFaults,
      uniqueStudentsWithFaults,
      staffCount
    };

  } catch (error) {
    console.error('Error in basic stats:', error);
    return {
      totalStudents: 0,
      gender: { male: 0, female: 0, other: 0 },
      classes: [],
      totalFaults: 0,
      uniqueStudentsWithFaults: 0,
      staffCount: 0
    };
  }
}

// 2. Academic Performance
async function getAcademicPerformance() {
  try {
    const topPerformers = [];
    const bottomPerformers = [];
    const subjectAverages = {};
    const classAverages = {};

    // Get all classes
    const classesResult = await db.query(`
      SELECT table_name as class_name 
      FROM information_schema.tables 
      WHERE table_schema = 'classes_schema'
      LIMIT 10
    `);

    if (classesResult.rows.length === 0) {
      return {
        topPerformers: [],
        bottomPerformers: [],
        subjectAverages: [],
        classAverages: []
      };
    }

    for (const row of classesResult.rows) {
      const className = row.class_name;

      try {
        // Check if subjects_of_school_schema exists
        const schemaExists = await db.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.schemata 
            WHERE schema_name = 'subjects_of_school_schema'
          )
        `);

        if (!schemaExists.rows[0]?.exists) {
          continue;
        }

        // Get subjects for this class
        const subjectsResult = await db.query(`
          SELECT subject_name 
          FROM subjects_of_school_schema.subject_class_mappings 
          WHERE class_name = $1
        `, [className]);

        if (subjectsResult.rows.length === 0) {
          continue;
        }

        for (const subjectRow of subjectsResult.rows) {
          const subjectName = subjectRow.subject_name;
          const schemaName = `subject_${subjectName.toLowerCase().replace(/\s+/g, '_')}_schema`;
          
          // Check if subject schema exists
          const subjectSchemaExists = await db.query(`
            SELECT EXISTS (
              SELECT 1 FROM information_schema.schemata 
              WHERE schema_name = $1
            )
          `, [schemaName]);

          if (!subjectSchemaExists.rows[0]?.exists) {
            continue;
          }

          // Try to get marks for term 1
          try {
            const tableName = `${className.toLowerCase()}_term_1`;
            
            // Check if table exists
            const tableExists = await db.query(`
              SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = $1 AND table_name = $2
              )
            `, [schemaName, tableName]);

            if (!tableExists.rows[0]?.exists) {
              continue;
            }

            const marksResult = await db.query(`
              SELECT student_name, total 
              FROM "${schemaName}"."${tableName}"
              WHERE total IS NOT NULL
              ORDER BY total DESC
              LIMIT 10
            `);

            if (marksResult.rows.length > 0) {
              // Top performer
              const top = marksResult.rows[0];
              topPerformers.push({
                studentName: top.student_name,
                className: className,
                subject: subjectName,
                score: parseFloat(top.total || 0).toFixed(1),
                rank: 1
              });

              // Bottom performer
              const bottom = marksResult.rows[marksResult.rows.length - 1];
              bottomPerformers.push({
                studentName: bottom.student_name,
                className: className,
                subject: subjectName,
                score: parseFloat(bottom.total || 0).toFixed(1),
                rank: marksResult.rows.length
              });

              // Calculate subject average
              const sum = marksResult.rows.reduce((acc, row) => acc + parseFloat(row.total || 0), 0);
              const average = marksResult.rows.length > 0 ? sum / marksResult.rows.length : 0;
              
              if (!subjectAverages[subjectName]) {
                subjectAverages[subjectName] = { total: 0, count: 0 };
              }
              subjectAverages[subjectName].total += average;
              subjectAverages[subjectName].count++;

              // Calculate class average for this subject
              if (!classAverages[className]) {
                classAverages[className] = { total: 0, count: 0 };
              }
              classAverages[className].total += average;
              classAverages[className].count++;
            }
          } catch (error) {
            // No marks table for this subject/class/term
            console.log(`No marks for ${subjectName} in ${className}: ${error.message}`);
          }
        }
      } catch (error) {
        console.log(`Error processing class ${className}: ${error.message}`);
      }
    }

    // Process averages
    const processedSubjectAverages = Object.entries(subjectAverages).map(([subject, data]) => ({
      subject,
      average: data.count > 0 ? (data.total / data.count).toFixed(1) : 0
    })).sort((a, b) => b.average - a.average);

    const processedClassAverages = Object.entries(classAverages).map(([className, data]) => ({
      className,
      average: data.count > 0 ? (data.total / data.count).toFixed(1) : 0,
      subjectCount: data.count
    })).sort((a, b) => b.average - a.average);

    // Sort performers
    topPerformers.sort((a, b) => b.score - a.score);
    bottomPerformers.sort((a, b) => a.score - b.score);

    return {
      topPerformers: topPerformers.slice(0, 5),
      bottomPerformers: bottomPerformers.slice(0, 5),
      subjectAverages: processedSubjectAverages.slice(0, 5),
      classAverages: processedClassAverages.slice(0, 5)
    };

  } catch (error) {
    console.error('Academic performance error:', error);
    return {
      topPerformers: [],
      bottomPerformers: [],
      subjectAverages: [],
      classAverages: []
    };
  }
}

// 3. Behavior Stats
async function getBehaviorStats() {
  try {
    const mostFaults = [];
    const recentFaults = [];
    const faultTypes = {};
    const faultLevels = {};

    // Check if class_students_fault schema exists
    const schemaExists = await db.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = 'class_students_fault'
      )
    `);

    if (!schemaExists.rows[0]?.exists) {
      return {
        mostFaults: [],
        recentFaults: [],
        faultTypes: [],
        faultLevels: []
      };
    }

    // Get all fault tables
    const faultTablesResult = await db.query(`
      SELECT table_name as fault_table
      FROM information_schema.tables 
      WHERE table_schema = 'class_students_fault'
      LIMIT 10
    `);

    console.log(`Found ${faultTablesResult.rows.length} fault tables`);

    for (const row of faultTablesResult.rows) {
      const faultTable = row.fault_table;

      try {
        // Get faults from this table
        const faultsResult = await db.query(`
          SELECT 
            student_name,
            type,
            level,
            date,
            description,
            COUNT(*) as fault_count
          FROM class_students_fault."${faultTable}"
          GROUP BY student_name, type, level, date, description
          ORDER BY date DESC
          LIMIT 20
        `);

        // Count faults per student
        const studentFaults = {};
        
        faultsResult.rows.forEach(fault => {
          // Aggregate by student
          if (!studentFaults[fault.student_name]) {
            studentFaults[fault.student_name] = {
              studentName: fault.student_name,
              faultCount: 0,
              lastFault: fault.date,
              className: faultTable
            };
          }
          studentFaults[fault.student_name].faultCount += parseInt(fault.fault_count);
          
          // Update last fault date
          const faultDate = new Date(fault.date);
          const currentLastFault = new Date(studentFaults[fault.student_name].lastFault);
          if (faultDate > currentLastFault) {
            studentFaults[fault.student_name].lastFault = fault.date;
          }

          // Count fault types
          if (fault.type) {
            if (!faultTypes[fault.type]) {
              faultTypes[fault.type] = 0;
            }
            faultTypes[fault.type]++;
          }

          // Count fault levels
          if (fault.level) {
            if (!faultLevels[fault.level]) {
              faultLevels[fault.level] = 0;
            }
            faultLevels[fault.level]++;
          }

          // Add to recent faults (last 7 days)
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          
          if (faultDate > weekAgo) {
            recentFaults.push({
              studentName: fault.student_name,
              className: faultTable,
              type: fault.type || 'Unknown',
              level: fault.level || 'Medium',
              date: fault.date,
              description: fault.description || 'No description',
              daysAgo: Math.floor((new Date() - faultDate) / (1000 * 60 * 60 * 24))
            });
          }
        });

        // Add to most faults list
        Object.values(studentFaults).forEach(student => {
          mostFaults.push(student);
        });

      } catch (error) {
        console.log(`Error fetching faults from ${faultTable}: ${error.message}`);
      }
    }

    // Sort and limit
    mostFaults.sort((a, b) => b.faultCount - a.faultCount);
    recentFaults.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      mostFaults: mostFaults.slice(0, 10),
      recentFaults: recentFaults.slice(0, 10),
      faultTypes: Object.entries(faultTypes)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      faultLevels: Object.entries(faultLevels)
        .map(([level, count]) => ({ level, count }))
        .sort((a, b) => b.count - a.count)
    };

  } catch (error) {
    console.error('Behavior stats error:', error);
    return {
      mostFaults: [],
      recentFaults: [],
      faultTypes: [],
      faultLevels: []
    };
  }
}

// 4. Class Rankings
async function getClassRankings() {
  try {
    const rankings = [];
    
    // Get all classes
    const classesResult = await db.query(`
      SELECT table_name as class_name 
      FROM information_schema.tables 
      WHERE table_schema = 'classes_schema'
      LIMIT 10
    `);

    if (classesResult.rows.length === 0) {
      return [];
    }

    for (const row of classesResult.rows) {
      const className = row.class_name;
      
      let classData = {
        className: className,
        studentCount: 0,
        averageScore: 0,
        passRate: 0,
        topStudent: 'N/A',
        topScore: 0,
        totalFaults: 0,
        studentsWithFaults: 0,
        position: 0
      };

      // Get student count
      try {
        const countResult = await db.query(`
          SELECT COUNT(*) as count 
          FROM classes_schema."${className}"
          WHERE is_active = TRUE OR is_active IS NULL
        `);
        classData.studentCount = parseInt(countResult.rows[0]?.count) || 0;
      } catch (error) {
        console.log(`Error counting students in ${className}: ${error.message}`);
      }

      // Try to get academic data for this class
      try {
        // Check if subjects schema exists
        const schemaExists = await db.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.schemata 
            WHERE schema_name = 'subjects_of_school_schema'
          )
        `);

        if (schemaExists.rows[0]?.exists) {
          const subjectsResult = await db.query(`
            SELECT subject_name 
            FROM subjects_of_school_schema.subject_class_mappings 
            WHERE class_name = $1
          `, [className]);

          let totalScore = 0;
          let subjectCount = 0;
          let passCount = 0;
          let totalStudents = 0;
          let highestScore = 0;
          let topStudent = '';

          for (const subjectRow of subjectsResult.rows) {
            const subjectName = subjectRow.subject_name;
            const schemaName = `subject_${subjectName.toLowerCase().replace(/\s+/g, '_')}_schema`;
            
            try {
              // Check if subject schema exists
              const subjectSchemaExists = await db.query(`
                SELECT EXISTS (
                  SELECT 1 FROM information_schema.schemata 
                  WHERE schema_name = $1
                )
              `, [schemaName]);

              if (!subjectSchemaExists.rows[0]?.exists) {
                continue;
              }

              const tableName = `${className.toLowerCase()}_term_1`;
              
              // Check if table exists
              const tableExists = await db.query(`
                SELECT EXISTS (
                  SELECT 1 FROM information_schema.tables 
                  WHERE table_schema = $1 AND table_name = $2
                )
              `, [schemaName, tableName]);

              if (!tableExists.rows[0]?.exists) {
                continue;
              }

              const marksResult = await db.query(`
                SELECT student_name, total, pass_status 
                FROM "${schemaName}"."${tableName}"
                WHERE total IS NOT NULL
              `);

              if (marksResult.rows.length > 0) {
                const subjectScores = marksResult.rows.map(row => parseFloat(row.total || 0));
                const subjectAverage = subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length;
                const subjectPassRate = (marksResult.rows.filter(row => row.pass_status === 'Pass').length / marksResult.rows.length) * 100;
                
                // Find top student for this subject
                const topInSubject = marksResult.rows.reduce((max, row) => 
                  parseFloat(row.total) > parseFloat(max.total) ? row : max
                );

                if (parseFloat(topInSubject.total) > highestScore) {
                  highestScore = parseFloat(topInSubject.total);
                  topStudent = topInSubject.student_name;
                }

                totalScore += subjectAverage;
                passCount += subjectPassRate;
                subjectCount++;
                totalStudents += marksResult.rows.length;
              }
            } catch (error) {
              // No marks for this subject
              console.log(`No marks for ${subjectName} in ${className}: ${error.message}`);
            }
          }

          if (subjectCount > 0) {
            classData.averageScore = (totalScore / subjectCount).toFixed(1);
            classData.passRate = (passCount / subjectCount).toFixed(1);
            classData.topScore = highestScore.toFixed(1);
            classData.topStudent = topStudent;
          }
        }
      } catch (error) {
        console.log(`No academic data for ${className}: ${error.message}`);
      }

      // Try to get behavior data
      try {
        // Check if class_students_fault schema exists
        const schemaExists = await db.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.schemata 
            WHERE schema_name = 'class_students_fault'
          )
        `);

        if (schemaExists.rows[0]?.exists) {
          // Check if fault table exists for this class
          const tableExists = await db.query(`
            SELECT EXISTS (
              SELECT 1 FROM information_schema.tables 
              WHERE table_schema = 'class_students_fault' AND table_name = $1
            )
          `, [className]);

          if (tableExists.rows[0]?.exists) {
            const faultResult = await db.query(`
              SELECT 
                COUNT(*) as total_faults,
                COUNT(DISTINCT student_name) as students_with_faults
              FROM class_students_fault."${className}"
            `);
            
            classData.totalFaults = parseInt(faultResult.rows[0]?.total_faults) || 0;
            classData.studentsWithFaults = parseInt(faultResult.rows[0]?.students_with_faults) || 0;
          }
        }
      } catch (error) {
        classData.totalFaults = 0;
        classData.studentsWithFaults = 0;
      }

      rankings.push(classData);
    }

    // Sort by average score
    rankings.sort((a, b) => b.averageScore - a.averageScore);
    
    // Add ranking position
    rankings.forEach((rank, index) => {
      rank.position = index + 1;
    });

    return rankings.slice(0, 5);

  } catch (error) {
    console.error('Class rankings error:', error);
    return [];
  }
}

// 5. Top Performers (Comprehensive)
async function getTopPerformers() {
  try {
    const allPerformers = [];

    // Get all classes
    const classesResult = await db.query(`
      SELECT table_name as class_name 
      FROM information_schema.tables 
      WHERE table_schema = 'classes_schema'
      LIMIT 5
    `);

    if (classesResult.rows.length === 0) {
      return [];
    }

    for (const row of classesResult.rows) {
      const className = row.class_name;

      // Check if subjects schema exists
      const schemaExists = await db.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.schemata 
          WHERE schema_name = 'subjects_of_school_schema'
        )
      `);

      if (!schemaExists.rows[0]?.exists) {
        continue;
      }

      // Get subjects for this class
      const subjectsResult = await db.query(`
        SELECT subject_name 
        FROM subjects_of_school_schema.subject_class_mappings 
        WHERE class_name = $1
      `, [className]);

      if (subjectsResult.rows.length === 0) {
        continue;
      }

      const studentScores = {};

      for (const subjectRow of subjectsResult.rows) {
        const subjectName = subjectRow.subject_name;
        const schemaName = `subject_${subjectName.toLowerCase().replace(/\s+/g, '_')}_schema`;
        
        try {
          // Check if subject schema exists
          const subjectSchemaExists = await db.query(`
            SELECT EXISTS (
              SELECT 1 FROM information_schema.schemata 
              WHERE schema_name = $1
            )
          `, [schemaName]);

          if (!subjectSchemaExists.rows[0]?.exists) {
            continue;
          }

          const tableName = `${className.toLowerCase()}_term_1`;
          
          // Check if table exists
          const tableExists = await db.query(`
            SELECT EXISTS (
              SELECT 1 FROM information_schema.tables 
              WHERE table_schema = $1 AND table_name = $2
            )
          `, [schemaName, tableName]);

          if (!tableExists.rows[0]?.exists) {
            continue;
          }

          const marksResult = await db.query(`
            SELECT student_name, total 
            FROM "${schemaName}"."${tableName}"
            WHERE total IS NOT NULL
          `);

          marksResult.rows.forEach(markRow => {
            const studentName = markRow.student_name;
            const score = parseFloat(markRow.total || 0);

            if (!studentScores[studentName]) {
              studentScores[studentName] = {
                studentName: studentName,
                className: className,
                totalScore: 0,
                subjectCount: 0,
                subjects: []
              };
            }

            studentScores[studentName].totalScore += score;
            studentScores[studentName].subjectCount++;
            studentScores[studentName].subjects.push({
              subject: subjectName,
              score: score.toFixed(1)
            });
          });

        } catch (error) {
          // No marks for this subject
          console.log(`No marks for ${subjectName} in ${className}: ${error.message}`);
        }
      }

      // Calculate averages and add to all performers
      Object.values(studentScores).forEach(student => {
        if (student.subjectCount > 0) {
          student.averageScore = (student.totalScore / student.subjectCount).toFixed(1);
          
          if (student.subjects.length > 0) {
            student.bestSubject = student.subjects.reduce((best, current) => 
              parseFloat(current.score) > parseFloat(best.score) ? current : best
            );
            student.worstSubject = student.subjects.reduce((worst, current) => 
              parseFloat(current.score) < parseFloat(worst.score) ? current : worst
            );
          } else {
            student.bestSubject = { subject: 'N/A', score: '0.0' };
            student.worstSubject = { subject: 'N/A', score: '0.0' };
          }

          allPerformers.push(student);
        }
      });
    }

    // Sort by average score
    allPerformers.sort((a, b) => b.averageScore - a.averageScore);

    return allPerformers.slice(0, 5);

  } catch (error) {
    console.error('Top performers error:', error);
    return [];
  }
}

// 6. Recent Activity - FIXED version
async function getRecentActivity() {
  try {
    const activities = [];

    // Get recent faults from class_students_fault schema (if exists)
    try {
      // Check if schema exists
      const schemaExists = await db.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.schemata 
          WHERE schema_name = 'class_students_fault'
        )
      `);

      if (schemaExists.rows[0]?.exists) {
        // Get all fault tables
        const faultTables = await db.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'class_students_fault'
          LIMIT 5
        `);

        for (const table of faultTables.rows) {
          const tableName = table.table_name;
          try {
            const recentFaults = await db.query(`
              SELECT 
                student_name,
                'fault' as type,
                'Behavioral Issue' as title,
                COALESCE(CONCAT(type, ' - ', level), 'Incident') as description,
                date,
                COALESCE(reported_by, 'System') as author
              FROM class_students_fault."${tableName}"
              WHERE date >= NOW() - INTERVAL '7 days'
              ORDER BY date DESC
              LIMIT 5
            `);

            recentFaults.rows.forEach(fault => {
              activities.push({
                type: 'fault',
                icon: 'exclamation-triangle',
                color: '#EF4444',
                studentName: fault.student_name,
                title: fault.title,
                description: fault.description,
                date: fault.date,
                author: fault.author,
                daysAgo: Math.floor((new Date() - new Date(fault.date)) / (1000 * 60 * 60 * 24))
              });
            });
          } catch (error) {
            console.log(`Error fetching faults from ${tableName}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.log('Error accessing fault schema:', error.message);
    }

    // Get recent posts from posts_schema (if exists)
    try {
      // Check if schema exists
      const schemaExists = await db.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.schemata 
          WHERE schema_name = 'posts_schema'
        )
      `);

      if (schemaExists.rows[0]?.exists) {
        const recentPosts = await db.query(`
          SELECT 
            COALESCE(author_name, 'Anonymous') as author,
            'post' as type,
            COALESCE(title, 'Announcement') as title,
            LEFT(COALESCE(body, 'No content'), 100) as preview,
            COALESCE(created_at, NOW()) as date
          FROM posts_schema.posts
          ORDER BY created_at DESC
          LIMIT 5
        `);

        recentPosts.rows.forEach(post => {
          activities.push({
            type: 'post',
            icon: 'bullhorn',
            color: '#3B82F6',
            author: post.author,
            title: post.title,
            description: post.preview + '...',
            date: post.date,
            daysAgo: Math.floor((new Date() - new Date(post.date)) / (1000 * 60 * 60 * 24))
          });
        });
      }
    } catch (error) {
      console.log('Error accessing posts schema:', error.message);
    }

    // If no activities found, add sample activities
    if (activities.length === 0) {
      activities.push(
        {
          type: 'system',
          icon: 'info-circle',
          color: '#6B7280',
          title: 'Welcome to Enhanced Dashboard',
          description: 'System initialized and ready to track activities',
          date: new Date(),
          daysAgo: 0
        }
      );
    }

    // Sort by date
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    return activities.slice(0, 10);

  } catch (error) {
    console.error('Recent activity error:', error);
    return [];
  }
}

// Keep existing endpoints for backward compatibility
// Phase 6.11: Enhanced Dashboard Statistics
router.get('/stats', async (req, res) => {
  try {
    console.log('\n📊 GET /api/dashboard/stats - Phase 6.11 Enhanced Statistics');
    
    const stats = {};
    
    // Get basic stats first
    const basicStats = await getBasicStats();
    
    // 6.11.1: Total Student Enrollment (with breakdown by type)
    stats.studentEnrollment = {
      total: basicStats.totalStudents,
      byType: {
        regular: basicStats.totalStudents - (basicStats.kgStudents || 0) - (basicStats.eveningStudents || 0),
        kg: basicStats.kgStudents || 0,
        evening: basicStats.eveningStudents || 0
      },
      byGender: basicStats.gender
    };
    
    // 6.11.2: Total Staff Count by Type
    stats.staffCount = {
      total: basicStats.staffCount,
      byType: {
        teachers: 0,
        administrative: 0,
        supportive: 0
      }
    };
    
    // Try to get staff breakdown by type
    try {
      const staffBreakdown = await db.query(`
        SELECT 
          COUNT(CASE WHEN staff_type = 'Teacher' THEN 1 END) as teachers,
          COUNT(CASE WHEN staff_type = 'Administrative' THEN 1 END) as administrative,
          COUNT(CASE WHEN staff_type = 'Supportive' THEN 1 END) as supportive
        FROM staff_schema.staff
      `);
      
      if (staffBreakdown.rows.length > 0) {
        stats.staffCount.byType = {
          teachers: parseInt(staffBreakdown.rows[0].teachers) || 0,
          administrative: parseInt(staffBreakdown.rows[0].administrative) || 0,
          supportive: parseInt(staffBreakdown.rows[0].supportive) || 0
        };
      }
    } catch (error) {
      console.log('Could not fetch staff breakdown:', error.message);
    }
    
    // 6.11.3: Current Month Financial Summary
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    try {
      const financialSummary = await db.query(`
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
        totalCollected: parseFloat(financialSummary.rows[0]?.total_collected) || 0,
        totalTransactions: parseInt(financialSummary.rows[0]?.total_transactions) || 0
      };
    } catch (error) {
      console.log('Could not fetch financial summary:', error.message);
      stats.financialSummary = {
        month: currentMonth,
        year: currentYear,
        totalCollected: 0,
        totalTransactions: 0
      };
    }
    
    // 6.11.4: Current Day Attendance Summary
    const today = new Date().toISOString().split('T')[0];
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    
    for (const className of basicStats.classes) {
      try {
        const attendanceTableCheck = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'attendance_schema' 
            AND table_name = $1
          )
        `, [`${className}_attendance`]);
        
        if (attendanceTableCheck.rows[0].exists) {
          const attendanceResult = await db.query(`
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
      } catch (error) {
        console.log(`Could not fetch attendance for ${className}:`, error.message);
      }
    }
    
    const attendanceRate = basicStats.totalStudents > 0 
      ? ((totalPresent / basicStats.totalStudents) * 100).toFixed(2) 
      : 0;
    
    stats.attendanceSummary = {
      date: today,
      present: totalPresent,
      absent: totalAbsent,
      late: totalLate,
      total: basicStats.totalStudents,
      attendanceRate: parseFloat(attendanceRate)
    };
    
    // 6.11.5: Upcoming Exams and Assessments
    stats.upcomingExams = {
      count: 0,
      exams: []
    };
    
    // 6.11.6: Recent System Activities
    const recentActivities = await getRecentActivity();
    stats.recentActivities = {
      count: recentActivities.length,
      activities: recentActivities.slice(0, 5)
    };
    
    // 6.11.7: Academic Performance Trends
    try {
      const termConfigResult = await db.query(`
        SELECT term_count 
        FROM subjects_of_school_schema.school_config 
        WHERE id = 1
      `);
      
      const termCount = termConfigResult.rows[0]?.term_count || 2;
      
      stats.academicPerformance = {
        termCount,
        averageByTerm: [],
        topPerformers: [],
        classAverages: []
      };
      
      // Get academic performance data
      const academicData = await getAcademicPerformance();
      stats.academicPerformance.topPerformers = academicData.topPerformers;
      stats.academicPerformance.classAverages = academicData.classAverages;
      
    } catch (error) {
      console.log('Could not fetch academic performance:', error.message);
      stats.academicPerformance = {
        termCount: 2,
        averageByTerm: [],
        topPerformers: [],
        classAverages: []
      };
    }
    
    // 6.11.8: Additional metrics
    stats.faults = {
      total: basicStats.totalFaults,
      uniqueStudents: basicStats.uniqueStudentsWithFaults
    };
    
    stats.classes = basicStats.classes;
    
    console.log('✅ Phase 6.11 Dashboard statistics compiled successfully');
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      ...stats
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Failed to fetch dashboard statistics',
      details: error.message 
    });
  }
});

// Test endpoint to check data availability
router.get('/test-data', async (req, res) => {
  try {
    const results = {
      classes_schema: { exists: false, tables: [] },
      subjects_of_school_schema: { exists: false, tables: [] },
      class_students_fault: { exists: false, tables: [] },
      posts_schema: { exists: false, tables: [] }
    };

    // Check each schema
    const schemas = ['classes_schema', 'subjects_of_school_schema', 'class_students_fault', 'posts_schema'];
    
    for (const schema of schemas) {
      try {
        const exists = await db.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.schemata 
            WHERE schema_name = $1
          )
        `, [schema]);
        
        results[schema].exists = exists.rows[0]?.exists || false;
        
        if (results[schema].exists) {
          const tables = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = $1
            ORDER BY table_name
            LIMIT 5
          `, [schema]);
          
          results[schema].tables = tables.rows.map(row => row.table_name);
        }
      } catch (error) {
        console.log(`Error checking schema ${schema}:`, error.message);
      }
    }

    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      schemas: results,
      recommendations: results.classes_schema.exists ? 
        'All systems ready' : 
        'Please complete school setup first'
    });
    
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      error: 'Test failed',
      details: error.message 
    });
  }
});

module.exports = router;