const fs = require('fs');

let content = fs.readFileSync('APP/src/PAGE/Dashboard/ModernDashboard.jsx', 'utf8');
content = content.replace(/\r\n/g, '\n');

// 1. Remove assets from initial stats state
content = content.replace(
  `    inventory: { totalItems: 0, lowStock: 0, outOfStock: 0, totalValue: 0 },\n    assets: { totalAssets: 0, inUse: 0, maintenance: 0, totalValue: 0 },\n    guardians: { total: 0, engagement: 0 }`,
  `    inventory: { totalItems: 0, lowStock: 0, outOfStock: 0, totalValue: 0 },\n    guardians: { total: 0, engagement: 0 }`
);

// 2. Add new states for attendance and academic analytics
const stateTarget = `  const [monthlyPayments, setMonthlyPayments] = useState({ summary: null, classes: [] });`;
const newStates = `  const [monthlyPayments, setMonthlyPayments] = useState({ summary: null, classes: [] });

  // Attendance and Marks analytics states
  const [attendanceAnalytics, setAttendanceAnalytics] = useState(null);
  const [dashAttTab, setDashAttTab] = useState('absent'); // 'absent' | 'present' | 'late' | 'permission'
  const [dashAttClass, setDashAttClass] = useState('ALL');

  const isBilal = typeof window !== 'undefined' && String(localStorage.getItem('userBranch') || '').toUpperCase().includes('BILAL');
  const [dashTerm, setDashTerm] = useState('1');
  const [academicAnalytics, setAcademicAnalytics] = useState(null);
  const [dashMarkRankTab, setDashMarkRankTab] = useState('highest'); // 'highest' | 'lowest'
  const [dashMarkClass, setDashMarkClass] = useState('ALL');`;

content = content.replace(stateTarget, newStates);

// 3. Replace assetsRes with attendanceAnalyticsRes and academicAnalyticsRes in Promise.all
const promiseTarget = `        inventoryRes,\n        assetsRes,\n        evaluationsRes,`;
const promiseReplacement = `        inventoryRes,\n        attAnalyticsRes,\n        acadAnalyticsRes,\n        evaluationsRes,`;
content = content.replace(promiseTarget, promiseReplacement);

const apiAssetTarget = `        api.get('/reports/assets/summary').catch((err) => {\n          console.error('Assets report error:', err.response?.status, err.response?.data?.error);\n          return { data: {} };\n        }),`;
const apiAssetReplacement = `        api.get('/dashboard/attendance-analytics').catch((err) => {\n          console.error('Attendance analytics error:', err.response?.status, err.response?.data?.error);\n          return { data: null };\n        }),\n        api.get('/dashboard/academic-analytics', { params: { term: dashTerm } }).catch((err) => {\n          console.error('Academic analytics error:', err.response?.status, err.response?.data?.error);\n          return { data: null };\n        }),`;
content = content.replace(apiAssetTarget, apiAssetReplacement);

// 4. Remove assetsData and handle new analytics in fetchAllData
const dataTarget = `      const inventoryData = inventoryRes.data?.data || inventoryRes.data || {};\n      const assetsData = assetsRes.data?.data || assetsRes.data || {};`;
const dataReplacement = `      const inventoryData = inventoryRes.data?.data || inventoryRes.data || {};\n      if (attAnalyticsRes?.data) setAttendanceAnalytics(attAnalyticsRes.data);\n      if (acadAnalyticsRes?.data) setAcademicAnalytics(acadAnalyticsRes.data);`;
content = content.replace(dataTarget, dataReplacement);

// Remove assets from setStats
content = content.replace(
  `        inventory: {\n          totalItems: inventoryData.totalItems || 0,\n          lowStock: inventoryData.lowStock || 0,\n          outOfStock: inventoryData.outOfStock || 0,\n          totalValue: inventoryData.totalValue || 0\n        },\n        assets: {\n          totalAssets: assetsData.totalAssets || 0,\n          inUse: assetsData.inUse || 0,\n          maintenance: assetsData.maintenance || 0,\n          totalValue: assetsData.totalValue || 0\n        },`,
  `        inventory: {\n          totalItems: inventoryData.totalItems || 0,\n          lowStock: inventoryData.lowStock || 0,\n          outOfStock: inventoryData.outOfStock || 0,\n          totalValue: inventoryData.totalValue || 0\n        },`
);

// 5. Add useEffect to re-fetch academicAnalytics when dashTerm changes
const effectTarget = `  useEffect(() => {\n    fetchAllData();\n  }, [fetchAllData]);`;
const effectReplacement = `  useEffect(() => {\n    fetchAllData();\n  }, [fetchAllData]);\n\n  useEffect(() => {\n    const fetchTermData = async () => {\n      try {\n        const res = await api.get('/dashboard/academic-analytics', { params: { term: dashTerm } });\n        if (res.data) setAcademicAnalytics(res.data);\n      } catch (e) {}\n    };\n    fetchTermData();\n  }, [dashTerm]);`;
content = content.replace(effectTarget, effectReplacement);

// 6. Remove Assets StatCard from statGrid
const statCardAsset = `        <StatCard\n          icon={Wrench}\n          title="Assets"\n          value={stats.assets.totalAssets}\n          subtitle={\`\${stats.assets.inUse} In Use • \${stats.assets.maintenance} Maintenance\`}\n          color="#A855F7"\n          onClick={() => navigate('/assets')}\n        />`;
content = content.replace(statCardAsset, '');

// 7. Inject Attendance Analytics Section and Academic Marks Section into chartsGrid
const insertSection = `
        {/* ============================================================ */}
        {/* ATTENDANCE ANALYTICS: Most Absent, Present, Late, Permission */}
        {/* ============================================================ */}
        <motion.div
          className={styles.chartCard}
          style={{ gridColumn: '1 / -1' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className={styles.chartHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3><Activity size={20} /> Attendance Leaderboards & Student Analytics</h3>
              {attendanceAnalytics?.summary && (
                <span className={styles.reportSub}>
                  Total Records: <b>{attendanceAnalytics.summary.totalRecords}</b> · Attendance Rate: <b style={{ color: '#10B981' }}>{attendanceAnalytics.summary.attendanceRate}%</b> · Present: {attendanceAnalytics.summary.present} · Absent: {attendanceAnalytics.summary.absent} · Late: {attendanceAnalytics.summary.late} · Permission: {attendanceAnalytics.summary.permission}
                </span>
              )}
            </div>

            {/* Class Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Class:</label>
              <select
                value={dashAttClass}
                onChange={(e) => setDashAttClass(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: 'var(--card-bg, #fff)', color: 'inherit' }}
              >
                <option value="ALL">All Classes (School-Wide)</option>
                {(attendanceAnalytics?.byClass || []).map(c => (
                  <option key={c.className} value={c.className}>{c.className}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Leaderboard Category Switcher */}
          <div className={styles.pillBtnRow}>
            <button
              type="button"
              className={\`\${styles.pillBtn} \${dashAttTab === 'absent' ? styles.pillBtnActive : ''}\`}
              onClick={() => setDashAttTab('absent')}
            >
              🔴 Most Absent
            </button>
            <button
              type="button"
              className={\`\${styles.pillBtn} \${dashAttTab === 'present' ? styles.pillBtnActive : ''}\`}
              onClick={() => setDashAttTab('present')}
            >
              🟢 Most Present
            </button>
            <button
              type="button"
              className={\`\${styles.pillBtn} \${dashAttTab === 'late' ? styles.pillBtnActive : ''}\`}
              onClick={() => setDashAttTab('late')}
            >
              🟡 Most Late
            </button>
            <button
              type="button"
              className={\`\${styles.pillBtn} \${dashAttTab === 'permission' ? styles.pillBtnActive : ''}\`}
              onClick={() => setDashAttTab('permission')}
            >
              🔵 Permission / Leave
            </button>
          </div>

          {/* Leaderboard Table */}
          {(() => {
            let list = [];
            if (dashAttClass === 'ALL') {
              const all = attendanceAnalytics?.allClasses || {};
              list = dashAttTab === 'absent' ? all.mostAbsent :
                     dashAttTab === 'present' ? all.mostPresent :
                     dashAttTab === 'late' ? all.mostLate : all.mostPermission;
            } else {
              const cls = (attendanceAnalytics?.byClass || []).find(c => c.className === dashAttClass);
              list = cls ? (
                dashAttTab === 'absent' ? cls.mostAbsent :
                dashAttTab === 'present' ? cls.mostPresent :
                dashAttTab === 'late' ? cls.mostLate : cls.mostPermission
              ) : [];
            }
            list = list || [];

            return list.length > 0 ? (
              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Rank</th>
                      <th>Student Name</th>
                      <th>Class</th>
                      <th>
                        {dashAttTab === 'absent' && 'Days Absent'}
                        {dashAttTab === 'present' && 'Days Present'}
                        {dashAttTab === 'late' && 'Times Late'}
                        {dashAttTab === 'permission' && 'Leaves / Permissions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((st, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700, color: '#64748b' }}>#{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{st.student_name}</td>
                        <td><span className={styles.badge}>{st.class_name}</span></td>
                        <td>
                          <b style={{
                            color: dashAttTab === 'absent' ? '#EF4444' :
                                   dashAttTab === 'present' ? '#10B981' :
                                   dashAttTab === 'late' ? '#F59E0B' : '#3B82F6',
                            fontSize: 14
                          }}>
                            {st.count} {dashAttTab === 'late' ? 'times' : 'days'}
                          </b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.emptyMessage} style={{ margin: '14px 0' }}>
                No attendance records found for this category in the selected class.
              </p>
            );
          })()}
        </motion.div>

        {/* ============================================================ */}
        {/* ACADEMIC MARKS & RANKINGS (Highest/Lowest Marks, Totals)     */}
        {/* ============================================================ */}
        <motion.div
          className={styles.chartCard}
          style={{ gridColumn: '1 / -1' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className={styles.chartHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3><Award size={20} /> Academic Performance & Mark Rankings</h3>
              <span className={styles.reportSub}>
                Term {dashTerm} · {academicAnalytics?.totalGradedStudents || 0} Graded Students · Average Score: <b>{academicAnalytics?.averageScore || 0}%</b>
              </span>
            </div>

            {/* Term & Class Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Term:</label>
                <select
                  value={dashTerm}
                  onChange={(e) => setDashTerm(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: 'var(--card-bg, #fff)', color: 'inherit' }}
                >
                  <option value="1">Term 1</option>
                  <option value="2">Term 2</option>
                  {isBilal && <option value="3">Term 3</option>}
                  {isBilal && <option value="4">Term 4</option>}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Class:</label>
                <select
                  value={dashMarkClass}
                  onChange={(e) => setDashMarkClass(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: 'var(--card-bg, #fff)', color: 'inherit' }}
                >
                  <option value="ALL">All Classes (School-Wide)</option>
                  {(academicAnalytics?.byClass || []).map(c => (
                    <option key={c.className} value={c.className}>{c.className}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Stat Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, margin: '12px 0' }}>
            <div style={{ padding: '12px 14px', background: '#ecfdf5', borderRadius: 10, border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>🏆 Highest Total Mark Point</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#065f46', margin: '4px 0' }}>
                {academicAnalytics?.highestTotalMark ? \`\${academicAnalytics.highestTotalMark.totalScore} pts\` : '—'}
              </div>
              <div style={{ fontSize: 12, color: '#047857', fontWeight: 600 }}>
                {academicAnalytics?.highestTotalMark ? \`\${academicAnalytics.highestTotalMark.studentName} (\${academicAnalytics.highestTotalMark.className})\` : 'No data'}
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>🔻 Lowest Total Mark Point</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#991b1b', margin: '4px 0' }}>
                {academicAnalytics?.lowestTotalMark ? \`\${academicAnalytics.lowestTotalMark.totalScore} pts\` : '—'}
              </div>
              <div style={{ fontSize: 12, color: '#b91c1c', fontWeight: 600 }}>
                {academicAnalytics?.lowestTotalMark ? \`\${academicAnalytics.lowestTotalMark.studentName} (\${academicAnalytics.lowestTotalMark.className})\` : 'No data'}
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>📊 Graded Students</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1e40af', margin: '4px 0' }}>
                {academicAnalytics?.totalGradedStudents || 0}
              </div>
              <div style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600 }}>Term {dashTerm} Active Graded</div>
            </div>

            <div style={{ padding: '12px 14px', background: '#fefce8', borderRadius: 10, border: '1px solid #fef08a' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#a16207', textTransform: 'uppercase' }}>🎯 School Average Score</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#854d0e', margin: '4px 0' }}>
                {academicAnalytics?.averageScore || 0}%
              </div>
              <div style={{ fontSize: 12, color: '#a16207', fontWeight: 600 }}>Across All Subjects</div>
            </div>
          </div>

          {/* High vs Low Rank Toggle */}
          <div className={styles.pillBtnRow}>
            <button
              type="button"
              className={\`\${styles.pillBtn} \${dashMarkRankTab === 'highest' ? styles.pillBtnActive : ''}\`}
              onClick={() => setDashMarkRankTab('highest')}
            >
              🏆 Highest Rank ("Big Mark" Students)
            </button>
            <button
              type="button"
              className={\`\${styles.pillBtn} \${dashMarkRankTab === 'lowest' ? styles.pillBtnActive : ''}\`}
              onClick={() => setDashMarkRankTab('lowest')}
            >
              🔻 Lowest Rank ("Lowest Mark" Students)
            </button>
          </div>

          {/* Rankings Table */}
          {(() => {
            let list = [];
            if (dashMarkClass === 'ALL') {
              list = dashMarkRankTab === 'highest'
                ? (academicAnalytics?.topStudentsAll || [])
                : (academicAnalytics?.lowestStudentsAll || []);
            } else {
              const cls = (academicAnalytics?.byClass || []).find(c => c.className === dashMarkClass);
              list = cls ? (
                dashMarkRankTab === 'highest' ? (cls.topStudents || []) : (cls.lowestStudents || [])
              ) : [];
            }

            return list.length > 0 ? (
              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Rank</th>
                      <th>Student Name</th>
                      <th>Class</th>
                      <th>Total Marks</th>
                      <th>Average</th>
                      <th>Subject Marks Breakdown</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((st, idx) => (
                      <tr key={idx}>
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            fontWeight: 700,
                            fontSize: 12,
                            background: st.rank === 1 ? '#FFD700' : st.rank === 2 ? '#C0C0C0' : st.rank === 3 ? '#CD7F32' : 'rgba(0,0,0,0.06)',
                            color: st.rank <= 3 ? '#000' : 'inherit'
                          }}>
                            {st.rank}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{st.studentName}</td>
                        <td><span className={styles.badge}>{st.className}</span></td>
                        <td>
                          <b style={{ color: dashMarkRankTab === 'highest' ? '#10B981' : '#EF4444', fontSize: 14 }}>
                            {st.totalScore} pts
                          </b>
                        </td>
                        <td><b>{st.avgScore}%</b></td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 500 }}>
                            {(st.subjects || []).map((sub, sIdx) => (
                              <span
                                key={sIdx}
                                className={\`\${styles.subjectPill} \${sub.score >= 90 ? styles.subjectPillHigh : ''}\`}
                                title={\`\${sub.subject}: \${sub.score}\`}
                              >
                                <b>{sub.subject}:</b> {sub.score}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.emptyMessage} style={{ margin: '14px 0' }}>
                No graded mark sheets recorded for this term.
              </p>
            );
          })()}
        </motion.div>
`;

const chartGridTarget = '      {/* Charts Grid */}\n      <div className={styles.chartsGrid}>';
content = content.replace(chartGridTarget, chartGridTarget + '\n' + insertSection);

fs.writeFileSync('APP/src/PAGE/Dashboard/ModernDashboard.jsx', content, 'utf8');
console.log('Successfully updated ModernDashboard.jsx');
