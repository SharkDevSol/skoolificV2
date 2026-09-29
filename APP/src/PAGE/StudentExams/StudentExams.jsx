import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiPlay, FiClock, FiRefreshCw, FiCheckCircle, FiClipboard, FiX } from 'react-icons/fi';
import { getBranchCode } from '../../utils/branchCode';
import styles from './StudentExams.module.css';

const fmtTime = (v) => {
  if (!v) return '';
  try {
    const d = new Date(v);
    return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  } catch { return String(v); }
};

const normAns = (s) => String(s ?? '').replace(/^[a-d][).:]\s*/i, '').trim().toLowerCase();
const letterOf = (s) => {
  const m = /^([a-d])(?:[).:]|$)/i.exec(String(s ?? '').trim());
  return m ? m[1].toUpperCase() : '';
};

const StudentExams = () => {
  const { username } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState('');

  const [tab, setTab] = useState('tests');
  const [tests, setTests] = useState([]);
  const [results, setResults] = useState([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);

  const [detail, setDetail] = useState(null);      // result row being inspected
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setError('');
    try {
      const res = await axios.get(`/api/students/profile/${username}`, {
        headers: { 'x-branch-code': (getBranchCode() || '').toUpperCase() }
      });
      setStudent(res.data.student);
    } catch {
      setError('Could not load your profile. Go back and open your profile again.');
    } finally {
      setProfileLoading(false);
    }
  }, [username]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const loadTests = useCallback(async (s) => {
    if (!s) return;
    setLoadingTests(true);
    try {
      const res = await axios.get('/api/ai/student-tests', {
        params: {
          className: s.class,
          studentName: s.student_name,
          studentUsername: s.username || username,
          schoolId: s.school_id
        }
      });
      setTests(res.data.data || []);
    } catch {
      setTests([]);
    } finally {
      setLoadingTests(false);
    }
  }, [username]);

  const loadResults = useCallback(async (s) => {
    if (!s) return;
    setLoadingResults(true);
    try {
      const res = await axios.get('/api/ai/student-results', {
        params: {
          className: s.class,
          studentName: s.student_name,
          studentUsername: s.username || username
        }
      });
      setResults(res.data.data || []);
    } catch {
      setResults([]);
    } finally {
      setLoadingResults(false);
    }
  }, [username]);

  useEffect(() => {
    if (!student) return;
    loadTests(student);
    loadResults(student);
  }, [student, loadTests, loadResults]);

  const refresh = () => {
    loadTests(student);
    loadResults(student);
  };

  const openDetail = async (r) => {
    if (!r || r.pending) return;
    setDetail(r);
    setDetailData(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const res = await axios.get(`/api/ai/student-result/${r.id}`, {
        params: {
          studentUsername: student?.username || username,
          studentName: student?.student_name
        }
      });
      setDetailData(res.data.data || null);
    } catch (e) {
      setDetailError(e.response?.data?.error || 'Could not load this result.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setDetailData(null);
    setDetailError('');
  };

  if (profileLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading your tests…</div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBox}>{error || 'Student not found.'}</div>
        <button className={styles.backBtn} onClick={() => navigate(`/app/student/${username}`)}>← Back to profile</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.iconBtn} onClick={() => navigate(`/app/student/${username}`)} aria-label="Back">
          <FiArrowLeft />
        </button>
        <div className={styles.headerText}>
          <h1>My Exams</h1>
          <p>{student.student_name} · {student.class}</p>
        </div>
        <button className={styles.refreshBtn} onClick={refresh}><FiRefreshCw /> Refresh</button>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'tests' ? styles.tabActive : ''}`} onClick={() => setTab('tests')}>
          <FiClipboard /> Tests
        </button>
        <button className={`${styles.tab} ${tab === 'results' ? styles.tabActive : ''}`} onClick={() => setTab('results')}>
          <FiCheckCircle /> Results
        </button>
      </div>

      {tab === 'tests' && (
        <div>
          {loadingTests ? (
            <div className={styles.loading}>Loading tests…</div>
          ) : tests.length === 0 ? (
            <div className={styles.empty}>
              <p>No tests have been published to you yet.</p>
              <p className={styles.sub}>When your teacher publishes a test, it appears here.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {tests.map((t) => (
                <div key={t.publishedId} className={styles.card}>
                  <div className={styles.badges}>
                    <span className={styles.subjectBadge}>{t.subject}</span>
                    <span className={styles.classBadge}>{t.className}</span>
                    {t.practice && <span className={styles.practiceBadge}>Practice</span>}
                    {t.completed && <span className={styles.doneBadge}>Completed</span>}
                  </div>
                  <h3>{String(t.componentName || '').replace(/_/g, ' ').toUpperCase()}</h3>
                  <p className={styles.meta}>
                    Term {t.termNumber}
                    {t.totalMarks ? ` · ${t.totalMarks} marks` : ''}
                    {t.timeLimit ? ` · ${t.timeLimit} min` : ''}
                  </p>

                  {t.completed ? (
                    <div className={styles.completedBox}>
                      {t.violationEnded && <span className={styles.violationNote}>⚠️ Ended early — score 0</span>}
                      {t.earnedMarks != null && (
                        <div className={styles.scoreBox}>
                          <span className={styles.scoreBig}>{t.earnedMarks} / {t.totalMarks}</span>
                          {t.percentage != null && <span className={styles.scorePct}>{t.percentage}%</span>}
                        </div>
                      )}
                      {t.resultPending ? (
                        <span className={styles.pendingNote}>
                          <FiClock /> Full breakdown after {fmtTime(t.resultAvailableAt)}
                        </span>
                      ) : (
                        <button className={styles.resultBtn} onClick={() => setTab('results')}>
                          View result →
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      className={styles.startBtn}
                      onClick={() => navigate(`/app/student/${username}/exams/${t.publishedId}`)}
                    >
                      <FiPlay /> Start Test
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'results' && (
        <div>
          {loadingResults ? (
            <div className={styles.loading}>Loading results…</div>
          ) : results.length === 0 ? (
            <div className={styles.empty}>
              <p>No results yet.</p>
              <p className={styles.sub}>Your score appears here the moment you submit. The full breakdown (every question) appears after your teacher&apos;s delay — usually 30 minutes.</p>
            </div>
          ) : (
            <div className={styles.resultList}>
              {results.map((r) => {
                const pending = !!r.pending;
                const max = r.published_total_marks || r.total_marks || 0;
                return (
                  <div key={r.id} className={`${styles.resultCard} ${r.violation_ended ? styles.resultBad : ''}`}>
                    <div className={styles.resultTop}>
                      <span className={styles.subjectBadge}>{r.subject_name}</span>
                      <span className={styles.classBadge}>{String(r.class_name || '').toUpperCase()}</span>
                      {r.practice && <span className={styles.practiceBadge}>Practice</span>}
                    </div>
                    <h3>{String(r.component_name || '').replace(/_/g, ' ').toUpperCase()} · Term {r.term_number}</h3>
                    <p className={styles.meta}>Submitted {fmtTime(r.submitted_at)}</p>

                    {r.violation_ended && (
                      <div className={styles.violationBox}>
                        ⚠️ This test was ended because you left the exam screen twice. Score: 0.
                      </div>
                    )}

                    <div className={styles.scoreBox}>
                      <span className={styles.scoreBig}>{r.earnedMarks ?? 0} / {max}</span>
                      <span className={styles.scorePct}>{r.percentage != null ? `${r.percentage}%` : ''}</span>
                      {r.practice && <span className={styles.practiceNote}>practice — not saved to marks</span>}
                    </div>

                    {pending ? (
                      <div className={styles.pendingBox}>
                        <FiClock /> Score shown now · full breakdown after {fmtTime(r.result_available_at)}
                      </div>
                    ) : (
                      <button className={styles.answersBtn} onClick={() => openDetail(r)}>
                        📝 View every question, your answer & the correct answer
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {detail && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) closeDetail(); }}>
          <div className={styles.modalCard}>
            <div className={styles.modalHead}>
              <div>
                <div className={styles.resultTop}>
                  <span className={styles.subjectBadge}>{detail.subject_name}</span>
                  <span className={styles.classBadge}>{String(detail.class_name || '').toUpperCase()}</span>
                  {detail.practice && <span className={styles.practiceBadge}>Practice</span>}
                </div>
                <h2>{String(detail.component_name || '').replace(/_/g, ' ').toUpperCase()} · Term {detail.term_number}</h2>
                {detailData && (
                  <p className={styles.meta}>
                    Score {detailData.earned_marks ?? 0} / {detailData.total_marks ?? detailData.max_marks ?? '—'}
                    {' · '}submitted {fmtTime(detail.submitted_at)}
                    {detailData.pending ? ' · breakdown locked' : ''}
                  </p>
                )}
              </div>
              <button className={styles.closeBtn} onClick={closeDetail} aria-label="Close"><FiX /></button>
            </div>

            {detailLoading ? (
              <div className={styles.loading}>Loading your answers…</div>
            ) : detailError ? (
              <div className={styles.errorBox}>{detailError}</div>
            ) : detailData && detailData.pending ? (
              <div className={styles.modalBody}>
                <div className={styles.pendingBox}>
                  <FiClock /> Your score is shown above. The full breakdown (every question,
                  your answer and the correct answer) unlocks after {fmtTime(detailData.resultAvailableAt)}.
                </div>
              </div>
            ) : detailData && Array.isArray(detailData.results) && detailData.results.length > 0 ? (
              <div className={styles.modalBody}>
                {detailData.results.map((q, i) => {
                  const isMatch = q.type === 'matching';
                  const sNorm = normAns(q.studentAnswer);
                  const cNorm = normAns(q.correctAnswer);
                  const sLetter = letterOf(q.studentAnswer);
                  const cLetter = letterOf(q.correctAnswer);
                  const studentText = q.studentAnswerText
                    || (q.studentAnswer && typeof q.studentAnswer === 'object' && Object.keys(q.studentAnswer).length ? JSON.stringify(q.studentAnswer) : '');
                  return (
                    <div key={q.questionId ?? i} className={`${styles.qCard} ${q.isCorrect ? styles.qOk : styles.qBad}`}>
                      <div className={styles.qHead}>
                        <span className={styles.qNum}>Q{i + 1}</span>
                        <span className={q.isCorrect ? styles.qMarkOk : styles.qMarkBad}>
                          {q.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                        </span>
                        <span className={styles.qScore}>{q.earnedMarks ?? 0} / {q.maxMarks ?? q.marks ?? 1} mark{(q.maxMarks ?? 1) > 1 ? 's' : ''}</span>
                      </div>

                      {q.question && <p className={styles.qText}>{q.question}</p>}

                      {Array.isArray(q.options) && q.options.length > 0 && (
                        <ul className={styles.optList}>
                          {q.options.map((o, j) => {
                            const letter = String.fromCharCode(65 + j);
                            const isCorrectOpt = cLetter ? cLetter === letter : !!cNorm && normAns(o) === cNorm;
                            const isStudentOpt = sLetter ? sLetter === letter : !!sNorm && normAns(o) === sNorm;
                            return (
                              <li key={j} className={`${styles.optItem} ${isCorrectOpt ? styles.optCorrect : ''} ${isStudentOpt ? styles.optStudent : ''}`}>
                                <b>{letter}.</b> {o}
                                {isStudentOpt && <span className={styles.optTag}>your answer</span>}
                                {isCorrectOpt && <span className={styles.optTagCorrect}>correct</span>}
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {isMatch && Array.isArray(q.correctMatches) && q.correctMatches.length > 0 && (
                        <div className={styles.matchBox}>
                          {q.correctMatches.map((p, k) => {
                            const givenObj = (q.studentAnswer && typeof q.studentAnswer === 'object') ? q.studentAnswer : {};
                            let given = givenObj[p.left];
                            if (given === undefined) {
                              const key = Object.keys(givenObj).find((kk) => normAns(kk) === normAns(p.left));
                              given = key !== undefined ? givenObj[key] : '';
                            }
                            const ok = !!String(given ?? '').trim() && normAns(given) === normAns(p.right);
                            return (
                              <div key={k} className={`${styles.matchRow} ${ok ? styles.matchOk : styles.matchBad}`}>
                                <span className={styles.matchLeft}>{p.left}</span>
                                <span className={styles.matchArrow}>→</span>
                                <span className={styles.matchGiven}>{given ? String(given) : 'not answered'}</span>
                                {!ok && <span className={styles.matchCorrect}>correct: {p.right}</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {!isMatch && (
                        <div className={styles.ansBox}>
                          <div className={styles.ansRow}>
                            <span>Your answer:</span>
                            <b className={q.isCorrect ? styles.ansOk : styles.ansBad}>{studentText || '— not answered —'}</b>
                          </div>
                          <div className={styles.ansRow}>
                            <span>Correct answer:</span>
                            <b className={styles.ansGood}>{q.correctAnswerText || '—'}</b>
                          </div>
                        </div>
                      )}

                      {q.requiresManualGrading && (
                        <div className={styles.expBox}>⏳ Waiting for your teacher to grade this question.</div>
                      )}
                      {q.explanation && (
                        <div className={styles.expBox}><b>Explanation:</b> {q.explanation}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.empty}><p>No question details were stored for this attempt.</p></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentExams;
