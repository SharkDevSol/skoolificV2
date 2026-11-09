const fs = require('fs');

let content = fs.readFileSync('APP/src/PAGE/SuperAdmin/SuperAdmin.jsx', 'utf8');
content = content.replace(/\r\n/g, '\n');

// 1. Add marksRankView state
const stateTarget = `  const [marksClassFilter, setMarksClassFilter] = useState('ALL');
  const [marksSearch, setMarksSearch] = useState('');`;
const stateReplacement = `  const [marksClassFilter, setMarksClassFilter] = useState('ALL');
  const [marksSearch, setMarksSearch] = useState('');
  const [marksRankView, setMarksRankView] = useState('highest'); // 'highest' | 'lowest'`;

content = content.replace(stateTarget, stateReplacement);

// 2. Update term options in MarksTab (2 terms for Iqra, 4 for Bilal)
const termSelectTarget = `            <label>{t('term')}
              <select value={mkTerm} onChange={(e) => setMkTerm(e.target.value)}>
                <option value="1">Term 1</option>
                <option value="2">Term 2</option>
                <option value="3">Term 3</option>
              </select>
            </label>`;

const termSelectReplacement = `            <label>{t('term')}
              <select value={mkTerm} onChange={(e) => setMkTerm(e.target.value)}>
                <option value="1">Term 1</option>
                <option value="2">Term 2</option>
                {String(branch || '').toUpperCase().includes('BILAL') && <option value="3">Term 3</option>}
                {String(branch || '').toUpperCase().includes('BILAL') && <option value="4">Term 4</option>}
              </select>
            </label>`;

content = content.replace(termSelectTarget, termSelectReplacement);

// 3. Update class view in MarksTab to show High & Low Marks, and toggle between Top and Lowest Ranked students
const classCardTarget = `                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                        🏫 Class {c.className}
                      </span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className={\`\${styles.badgePill} \${styles.badgeOld}\`}>{c.studentCount} Students</span>
                        <span className={\`\${styles.badgePill} \${styles.badgeNew}\`}>{c.subjectCount} Subjects</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#107c41' }}>Class Avg: {c.classAvgScore}</span>
                      </div>
                    </div>

                    {/* Big Mark Students Table */}
                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                      🏆 Overall Top Scorers ("Big Mark" Students)
                    </div>
                    {c.bigMarkStudents && c.bigMarkStudents.length > 0 ? (
                      <div className={styles.tableScroll}>
                        <table className={styles.tableDetailed}>
                          <thead>
                            <tr>
                              <th style={{ width: 40 }}>Rank</th>
                              <th>Student Name</th>
                              <th>Total Score</th>
                              <th>Average</th>
                              <th>Subject Scores Breakdown</th>
                            </tr>
                          </thead>
                          <tbody>
                            {c.bigMarkStudents.map((st) => (`;

const classCardReplacement = `                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                        🏫 Class {c.className}
                      </span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className={\`\${styles.badgePill} \${styles.badgeOld}\`}>{c.studentCount || c.totalGradedStudents} Students</span>
                        <span className={\`\${styles.badgePill} \${styles.badgeNew}\`}>{c.subjectCount || c.subjectsCount} Subjects</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#107c41' }}>Class Avg: {c.classAvgScore || c.avgScore}</span>
                        {c.highestTotalMark !== undefined && (
                          <span className={\`\${styles.badgePill} \${styles.badgeNew}\`} style={{ background: '#dcfce7', color: '#15803d' }}>
                            🏆 High Mark: {c.highestTotalMark} pts
                          </span>
                        )}
                        {c.lowestTotalMark !== undefined && (
                          <span className={\`\${styles.badgePill} \${styles.badgeRed}\`} style={{ background: '#fee2e2', color: '#991b1b' }}>
                            🔻 Low Mark: {c.lowestTotalMark} pts
                          </span>
                        )}
                      </div>
                    </div>

                    {/* High vs Low Rank Toggle */}
                    <div className={styles.pillTabRow} style={{ margin: '8px 0 10px 0' }}>
                      <button
                        type="button"
                        className={\`\${styles.pillTabBtn} \${marksRankView === 'highest' ? styles.pillTabBtnActive : ''}\`}
                        onClick={() => setMarksRankView('highest')}
                      >
                        🏆 Highest Rank ("Big Mark" Students)
                      </button>
                      <button
                        type="button"
                        className={\`\${styles.pillTabBtn} \${marksRankView === 'lowest' ? styles.pillTabBtnActive : ''}\`}
                        onClick={() => setMarksRankView('lowest')}
                      >
                        🔻 Lowest Rank ("Lowest Mark" Students)
                      </button>
                    </div>

                    {(() => {
                      const displayStudents = marksRankView === 'highest'
                        ? (c.bigMarkStudents || c.topStudents || [])
                        : (c.lowestStudents || []);

                      return displayStudents && displayStudents.length > 0 ? (
                        <div className={styles.tableScroll}>
                          <table className={styles.tableDetailed}>
                            <thead>
                              <tr>
                                <th style={{ width: 40 }}>Rank</th>
                                <th>Student Name</th>
                                <th>Total Score</th>
                                <th>Average</th>
                                <th>Subject Scores Breakdown</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayStudents.map((st) => (`;

content = content.replace(classCardTarget, classCardReplacement);

// Close the function invocation in JSX
const closeTarget = `                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', padding: '6px 0' }}>
                        No ranked students for this class.
                      </div>
                    )}`;

const closeReplacement = `                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', padding: '6px 0' }}>
                        No ranked students found for this view.
                      </div>
                    );
                    })()}`;

content = content.replace(closeTarget, closeReplacement);

fs.writeFileSync('APP/src/PAGE/SuperAdmin/SuperAdmin.jsx', content, 'utf8');
console.log('Successfully updated SuperAdmin.jsx');
