const fs = require('fs');
let code = fs.readFileSync('backend/routes/dashboardRoutes.js', 'utf8');
code = code.replace(/\r\n/g, '\n');

const newRoutes = `
// ============================================================
// ATTENDANCE ANALYTICS (Leaderboards: Absent, Present, Late, Permission)
// ============================================================
router.get('/attendance-analytics', async (req, res) => {
  try {
    const db = req.branchPool || require('../config/db');
    
    // Check if academic_student_attendance exists
    const tableCheck = await db.query(\`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'academic_student_attendance'
      )
    \`);
    
    if (!tableCheck.rows[0]?.exists) {
      return res.json({
        summary: { totalRecords: 0, present: 0, absent: 0, late: 0, permission: 0, attendanceRate: 0 },
        allClasses: { mostAbsent: [], mostPresent: [], mostLate: [], mostPermission: [] },
        byClass: []
      });
    }

    // 1. Overall counts
    const statusCounts = (await db.query(\`
      SELECT status, COUNT(*)::int as count 
      FROM academic_student_attendance 
      GROUP BY status
    \`)).rows;

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
    const mostAbsentAll = (await db.query(\`
      SELECT student_name, class_name, COUNT(*)::int as count
      FROM academic_student_attendance
      WHERE status = 'ABSENT'
      GROUP BY student_name, class_name
      ORDER BY count DESC
      LIMIT 10
    \`)).rows;

    const mostPresentAll = (await db.query(\`
      SELECT student_name, class_name, COUNT(*)::int as count
      FROM academic_student_attendance
      WHERE status = 'PRESENT'
      GROUP BY student_name, class_name
      ORDER BY count DESC
      LIMIT 10
    \`)).rows;

    const mostLateAll = (await db.query(\`
      SELECT student_name, class_name, COUNT(*)::int as count
      FROM academic_student_attendance
      WHERE status = 'LATE'
      GROUP BY student_name, class_name
      ORDER BY count DESC
      LIMIT 10
    \`)).rows;

    const mostPermissionAll = (await db.query(\`
      SELECT student_name, class_name, COUNT(*)::int as count
      FROM academic_student_attendance
      WHERE status = 'LEAVE' OR status = 'PERMISSION'
      GROUP BY student_name, class_name
      ORDER BY count DESC
      LIMIT 10
    \`)).rows;

    // 3. Class by Class stats & leaderboards
    const classRows = (await db.query(\`
      SELECT class_name, status, COUNT(*)::int as count
      FROM academic_student_attendance
      GROUP BY class_name, status
      ORDER BY class_name
    \`)).rows;

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
        db.query(\`SELECT student_name, class_name, COUNT(*)::int as count FROM academic_student_attendance WHERE status = 'ABSENT' AND class_name = $1 GROUP BY student_name, class_name ORDER BY count DESC LIMIT 5\`, [c.className]),
        db.query(\`SELECT student_name, class_name, COUNT(*)::int as count FROM academic_student_attendance WHERE status = 'PRESENT' AND class_name = $1 GROUP BY student_name, class_name ORDER BY count DESC LIMIT 5\`, [c.className]),
        db.query(\`SELECT student_name, class_name, COUNT(*)::int as count FROM academic_student_attendance WHERE status = 'LATE' AND class_name = $1 GROUP BY student_name, class_name ORDER BY count DESC LIMIT 5\`, [c.className]),
        db.query(\`SELECT student_name, class_name, COUNT(*)::int as count FROM academic_student_attendance WHERE (status = 'LEAVE' OR status = 'PERMISSION') AND class_name = $1 GROUP BY student_name, class_name ORDER BY count DESC LIMIT 5\`, [c.className])
      ]);

      return {
        ...c,
        mostAbsent: absRes.rows,
        mostPresent: presRes.rows,
        mostLate: lateRes.rows,
        mostPermission: permRes.rows
      };
    }));

    res.json({
      summary: {
        totalRecords,
        present,
        absent,
        late,
        permission,
        attendanceRate
      },
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
    const termPattern = \`%_term_\${termNum}\`;

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

    const tablesRes = await db.query(\`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema LIKE 'subject_%_schema' 
        AND table_name LIKE $1
        AND table_name NOT LIKE '%config%'
      ORDER BY table_name, table_schema
    \`, [termPattern]);

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
          const rows = (await db.query(\`
            SELECT student_name, gender, total, pass_status
            FROM "\${s.schema}"."\${s.table}"
            WHERE total > 0
            ORDER BY total DESC
          \`)).rows;

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

    res.json({
      term: termNum,
      totalGradedStudents: allStudentsList.length,
      averageScore: overallAvg,
      highestTotalMark: topStudentsAll[0] || null,
      lowestTotalMark: lowestStudentsAll[0] || null,
      topStudentsAll,
      lowestStudentsAll,
      byClass: classSummaries.sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }))
    });
  } catch (error) {
    console.error('academic-analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch academic analytics', details: error.message });
  }
});
`;

const insertTarget = 'router.get(\'/enhanced-stats\', async (req, res) => {';
if (code.includes(insertTarget)) {
  code = code.replace(insertTarget, newRoutes + '\n' + insertTarget);
  fs.writeFileSync('backend/routes/dashboardRoutes.js', code, 'utf8');
  console.log('Successfully injected attendance-analytics and academic-analytics into dashboardRoutes.js');
} else {
  console.error('Target not found in dashboardRoutes.js');
}
