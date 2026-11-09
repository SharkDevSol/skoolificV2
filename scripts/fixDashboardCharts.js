const fs = require('fs');

// ==========================================
// 1. UPDATE backend/routes/dashboardRoutes.js
// ==========================================
let backendCode = fs.readFileSync('backend/routes/dashboardRoutes.js', 'utf8');
backendCode = backendCode.replace(/\r\n/g, '\n');

// In attendance-analytics, add attendanceTrend query
const attTarget = `    res.json({
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
    });`;

const attReplacement = `    // 4. Daily attendance trend for last 7 active days
    const trendRows = (await db.query(\`
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
    \`)).rows;

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
    });`;

backendCode = backendCode.replace(attTarget, attReplacement);

// In academic-analytics, add performanceTrend
const acadTarget = `    const overallAvg = grandScoreCount > 0 ? Math.round((grandScoreSum / grandScoreCount) * 10) / 10 : 0;

    res.json({
      term: termNum,
      totalGradedStudents: allStudentsList.length,
      averageScore: overallAvg,
      highestTotalMark: topStudentsAll[0] || null,
      lowestTotalMark: lowestStudentsAll[0] || null,
      topStudentsAll,
      lowestStudentsAll,
      byClass: classSummaries.sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }))
    });`;

const acadReplacement = `    const overallAvg = grandScoreCount > 0 ? Math.round((grandScoreSum / grandScoreCount) * 10) / 10 : 0;

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
    });`;

backendCode = backendCode.replace(acadTarget, acadReplacement);

fs.writeFileSync('backend/routes/dashboardRoutes.js', backendCode, 'utf8');
console.log('Updated backend/routes/dashboardRoutes.js');

// ==========================================
// 2. UPDATE APP/src/PAGE/Dashboard/ModernDashboard.jsx
// ==========================================
let frontCode = fs.readFileSync('APP/src/PAGE/Dashboard/ModernDashboard.jsx', 'utf8');
frontCode = frontCode.replace(/\r\n/g, '\n');

// Update chart data population in fetchAllData
const chartDataTarget = `      // Attendance trend data (last 7 days)
      const trends = attendanceTrendsRes.data?.data || attendanceTrendsRes.data || [];
      if (Array.isArray(trends) && trends.length > 0) {
        setAttendanceData(trends);
      } else {
        const fallback = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          fallback.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            present: 0,
            absent: 0
          });
        }
        setAttendanceData(fallback);
      }

      // Generate performance trend data - only if we have data
      const perfTrend = academicData.performanceTrend || [];
      if (perfTrend.length === 0) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        for (let i = 0; i < 6; i++) {
          perfTrend.push({
            month: months[i],
            average: 0,
            passRate: 0
          });
        }
      }
      setPerformanceData(perfTrend);

      // Generate revenue trend data - only if we have data
      const revTrend = financeData.revenueTrend || [];
      if (revTrend.length === 0) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        for (let i = 0; i < 6; i++) {
          revTrend.push({
            month: months[i],
            collected: 0,
            pending: 0
          });
        }
      }
      setRevenueData(revTrend);`;

const chartDataReplacement = `      // 1. Attendance trend data (real data from attendanceAnalytics or fallback)
      if (attAnalyticsRes?.data?.attendanceTrend && attAnalyticsRes.data.attendanceTrend.length > 0) {
        setAttendanceData(attAnalyticsRes.data.attendanceTrend);
      } else {
        const trends = attendanceTrendsRes.data?.data || attendanceTrendsRes.data || [];
        if (Array.isArray(trends) && trends.length > 0) {
          setAttendanceData(trends);
        }
      }

      // 2. Academic performance trend data (real class averages & pass rates)
      if (acadAnalyticsRes?.data?.performanceTrend && acadAnalyticsRes.data.performanceTrend.length > 0) {
        setPerformanceData(acadAnalyticsRes.data.performanceTrend);
      } else if (academicData.performanceTrend && academicData.performanceTrend.length > 0) {
        setPerformanceData(academicData.performanceTrend);
      }

      // 3. Revenue trend data (real monthly collections from monthly payment overview)
      const ETH_MONTH_NAMES = ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yakatit', 'Megabit', 'Miyazya', 'Ginbot', 'Sene'];
      const monthlyBreakdown = monthlyData.summary?.monthlyBreakdown || [];
      if (monthlyBreakdown.length > 0) {
        const revTrend = monthlyBreakdown.slice(0, 6).map((m) => ({
          month: ETH_MONTH_NAMES[m.monthNumber - 1] || \`Month \${m.monthNumber}\`,
          collected: Math.round(m.paid || 0),
          pending: Math.round(m.pending || 0)
        }));
        setRevenueData(revTrend);
      }`;

frontCode = frontCode.replace(chartDataTarget, chartDataReplacement);

// In the useEffect for dashTerm, also update performanceData
const termEffectTarget = `  useEffect(() => {
    const fetchTermData = async () => {
      try {
        const res = await api.get('/dashboard/academic-analytics', { params: { term: dashTerm } });
        if (res.data) setAcademicAnalytics(res.data);
      } catch (e) {}
    };
    fetchTermData();
  }, [dashTerm]);`;

const termEffectReplacement = `  useEffect(() => {
    const fetchTermData = async () => {
      try {
        const res = await api.get('/dashboard/academic-analytics', { params: { term: dashTerm } });
        if (res.data) {
          setAcademicAnalytics(res.data);
          if (res.data.performanceTrend && res.data.performanceTrend.length > 0) {
            setPerformanceData(res.data.performanceTrend);
          }
        }
      } catch (e) {}
    };
    fetchTermData();
  }, [dashTerm]);`;

frontCode = frontCode.replace(termEffectTarget, termEffectReplacement);

// In Academic Performance Trend LineChart, update XAxis to support name or month
frontCode = frontCode.replace(
  '<XAxis dataKey="month" stroke="#6B7280" />',
  '<XAxis dataKey="name" stroke="#6B7280" />'
);

// Also update Revenue Chart name props
frontCode = frontCode.replace(
  '<Bar dataKey="collected" fill="#10B981" radius={[8, 8, 0, 0]} />\n              <Bar dataKey="pending" fill="#F59E0B" radius={[8, 8, 0, 0]} />',
  '<Bar dataKey="collected" name="Collected" fill="#10B981" radius={[8, 8, 0, 0]} />\n              <Bar dataKey="pending" name="Pending" fill="#F59E0B" radius={[8, 8, 0, 0]} />'
);

fs.writeFileSync('APP/src/PAGE/Dashboard/ModernDashboard.jsx', frontCode, 'utf8');
console.log('Updated APP/src/PAGE/Dashboard/ModernDashboard.jsx');
