import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiClock, FiLock, FiPlay, FiSend, FiAlertTriangle } from 'react-icons/fi';
import { getBranchCode } from '../../utils/branchCode';
import styles from './StudentExamPlayer.module.css';

const normType = (t) => {
  const s = String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  if (s === 'mcq' || s === 'multiple choice' || s === 'multiplechoice') return 'mcq';
  if (s === 'true false' || s === 'truefalse' || s === 'true or false') return 'true_false';
  if (s === 'matching' || s === 'match') return 'matching';
  if (s.startsWith('fill')) return 'fill_blank';
  if (s.replace(/ /g, '') === 'shortanswer') return 'short_answer';
  if (s.startsWith('essay') || s === 'open ended' || s === 'openended') return 'essay';
  if (s === 'numeric' || s === 'numerical') return 'numeric';
  return s.replace(/ /g, '_');
};

const fmtTime = (v) => {
  if (!v) return '';
  try { return new Date(v).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return String(v); }
};

const FS_SUPPORTED =
  typeof document !== 'undefined' &&
  !!document.documentElement &&
  typeof document.documentElement.requestFullscreen === 'function';

const isCoarseDevice = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

const StudentExamPlayer = () => {
  const { username, publishedId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [step, setStep] = useState('gate'); // gate | ready | exam | done | error
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [starting, setStarting] = useState(false);

  const [test, setTest] = useState(null);     // start-exam payload
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);

  const [timeLeft, setTimeLeft] = useState(null); // seconds
  const [violations, setViolations] = useState(0);
  const [warning, setWarning] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [doneResult, setDoneResult] = useState(null);
  const [fsBlocked, setFsBlocked] = useState(false); // fullscreen was left and could not be restored silently
  const [immersive, setImmersive] = useState(false); // phone mode: exam pinned to the screen (no real fullscreen API)
  const [fsActive, setFsActive] = useState(false);   // currently in real fullscreen
  const [blackout, setBlackout] = useState(false);   // full-screen warning shown after leaving the exam
  const [blackoutReason, setBlackoutReason] = useState('');
  const [flagged, setFlagged] = useState({});        // "mark for review" per question

  const violationsRef = useRef(0);
  const fsActiveRef = useRef(false);
  const fsRequiredRef = useRef(false); // fullscreen was granted at the start of this exam
  const lastViolationRef = useRef(0);
  const stepRef = useRef('gate');
  const submittingRef = useRef(false);
  const lastViolatedRef = useRef(false);
  const flagViolationRef = useRef(() => {});

  useEffect(() => { stepRef.current = step; }, [step]);

  // ── student identity ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`/api/students/profile/${username}`, {
          headers: { 'x-branch-code': (getBranchCode() || '').toUpperCase() }
        });
        setStudent(res.data.student);
      } catch {
        setError('Could not load your profile. Open your profile first, then come back.');
        setStep('error');
      }
    })();
  }, [username]);

  // ── gate: exchange the password for the scrambled questions ──────
  const start = async (e) => {
    e.preventDefault();
    if (!student || starting) return;
    if (!/^\d{4,6}$/.test(password)) { setPwdError('Enter the 5-digit test password'); return; }
    setStarting(true);
    setPwdError('');
    try {
      const res = await axios.post('/api/ai/start-exam', {
        publishedId: parseInt(publishedId, 10) || publishedId,
        password,
        studentUsername: student.username || username,
        schoolId: student.school_id,
        studentName: student.student_name,
        className: student.class
      });
      const d = res.data.data;
      setTest(d);
      setQuestions(d.questions || []);
      setStep('ready');
    } catch (err) {
      const data = err.response?.data || {};
      if (err.response?.status === 409) {
        setPwdError(`You already completed this test. ${data.resultAvailableAt ? `Result after ${fmtTime(data.resultAvailableAt)}.` : ''}`);
      } else {
        setPwdError(data.error || 'Could not start the test');
      }
    } finally {
      setStarting(false);
    }
  };

  // ── timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'exam' || timeLeft === null) return;
    if (timeLeft <= 0) { doSubmit(false, 'Time is up — your answers were submitted automatically.'); return; }
    const t = setTimeout(() => setTimeLeft((s) => (s ?? 1) - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, timeLeft]);

  // ── fullscreen / tab-switch lock (2 violations → 0 marks) ────────
  const flagViolation = (reason) => {
    if (stepRef.current !== 'exam') return;
    const now = Date.now();
    if (now - lastViolationRef.current < 2000) return; // debounce the same action
    lastViolationRef.current = now;
    violationsRef.current += 1;
    const n = violationsRef.current;
    setViolations(n);
    if (n >= 2) {
      setWarning('');
      setBlackout(false); // second violation ends the test right away
      doSubmit(true, reason);
    } else {
      setWarning(`${reason}. This is warning 1 of 2 — leaving again ends the test and scores 0.`);
      setBlackoutReason(reason);
      setBlackout(true); // cover the whole exam until the student comes back
    }
  };
  flagViolationRef.current = flagViolation;

  const dismissBlackout = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    setBlackout(false);
  };

  const toggleFlag = (qId) => setFlagged((f) => ({ ...f, [qId]: !f[qId] }));
  const flaggedCount = Object.keys(flagged).filter((k) => flagged[k]).length;

  // ── keep the exam in fullscreen: restore it automatically whenever the
  //    student minimises / leaves fullscreen (needs a tap if the browser refuses) ──
  const enterFullscreen = async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      const on = !!document.fullscreenElement;
      if (on) {
        fsActiveRef.current = true;
        fsRequiredRef.current = true;
        setFsActive(true);
        setFsBlocked(false);
      } else {
        setFsActive(false);
        if (isCoarseDevice()) setImmersive(true); // phone: pin the exam to the screen instead
      }
      return on;
    } catch {
      setFsActive(false);
      if (isCoarseDevice()) setImmersive(true);
      return false;
    }
  };

  const tryRestoreFullscreen = async () => {
    if (!fsRequiredRef.current) {
      // No real fullscreen on this device (iPhone / phone browser):
      // just keep the exam pinned full-screen — never block it.
      if (!FS_SUPPORTED) setImmersive(true);
      return;
    }
    if (submittingRef.current || stepRef.current !== 'exam') return;
    if (document.fullscreenElement) { setFsBlocked(false); return; }
    const ok = await enterFullscreen();
    setFsBlocked(!ok);
  };

  useEffect(() => {
    if (step !== 'exam') return;

    const onFsChange = () => {
      const inFs = !!document.fullscreenElement;
      fsActiveRef.current = inFs;
      setFsActive(inFs);
      if (inFs) { fsRequiredRef.current = true; setFsBlocked(false); return; }
      if (submittingRef.current || stepRef.current !== 'exam') return;
      flagViolationRef.current('You left fullscreen mode');
      // go straight back into fullscreen so the student can continue
      setTimeout(() => { tryRestoreFullscreen(); }, 150);
    };
    const onVis = () => {
      if (document.hidden) flagViolationRef.current('You left the exam screen');
      else setTimeout(() => { tryRestoreFullscreen(); }, 150);
    };
    const onBlur = () => { if (!document.hidden) flagViolationRef.current('You switched away from the exam window'); };
    const onFocus = () => { setTimeout(() => { tryRestoreFullscreen(); }, 150); };

    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // block closing/refreshing mid-exam
  useEffect(() => {
    if (step !== 'exam') return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [step]);

  // mobile lock: while the exam is pinned to the screen, stop the page behind it scrolling
  useEffect(() => {
    if (!immersive) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [immersive]);

  const begin = async () => {
    if (!test) return;
    let active = false;
    try {
      if (FS_SUPPORTED && document.fullscreenEnabled !== false) {
        await document.documentElement.requestFullscreen();
        active = !!document.fullscreenElement;
      }
    } catch {
      active = false; // browser refused fullscreen — fall back to mobile lock
    }
    fsActiveRef.current = active;
    fsRequiredRef.current = active;
    setFsActive(active);
    setFsBlocked(false);
    // Phone (or browser without fullscreen): pin the exam to the screen so it
    // behaves like fullscreen even though the API is missing.
    setImmersive(!active);
    violationsRef.current = 0;
    lastViolationRef.current = 0;
    setViolations(0);
    setWarning('');
    const tl = parseInt(test.timeLimit, 10) || 0;
    setTimeLeft(tl > 0 ? tl * 60 : null);
    setStep('exam');
  };

  const setAnswer = (qId, value) => setAnswers((a) => ({ ...a, [qId]: value }));

  const doSubmit = async (violated, message) => {
    if (!test || submittingRef.current) return;
    submittingRef.current = true;
    lastViolatedRef.current = !!violated;
    setSubmitting(true);
    setSubmitError('');
    setWarning('');
    setImmersive(false);
    setFsBlocked(false);
    try {
      if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
    } catch { /* ignore */ }
    try {
      const res = await axios.post('/api/ai/submit-exam', {
        schemaName: test.schemaName,
        tableName: test.tableName,
        subjectName: test.subject,
        className: test.className,
        termNumber: test.termNumber,
        componentName: test.componentName,
        totalMarks: test.totalMarks,
        studentId: student?.id || '',
        studentName: student?.student_name || '',
        studentUsername: student?.username || username,
        answers,
        publishedId: test.publishedId,
        violated: !!violated
      });
      setDoneResult({ ...(res.data || {}), localMessage: message || '' });
      setStep('done');
      setFsBlocked(false);
      fsRequiredRef.current = false;
      try { if (document.fullscreenElement) await document.exitFullscreen(); } catch { /* ignore */ }
      fsActiveRef.current = false;
    } catch (err) {
      submittingRef.current = false;
      setSubmitting(false);
      setSubmitError('Could not submit: ' + (err.response?.data?.error || err.message) + ' — press Retry.');
    }
  };

  const confirmSubmit = () => {
    const unanswered = questions.length - Object.keys(answers).filter((k) => {
      const v = answers[k];
      return v && (typeof v === 'string' ? v.trim().length > 0 : Object.keys(v).length > 0);
    }).length;
    if (unanswered > 0 && !confirm(`You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`)) return;
    doSubmit(false);
  };

  // ── screens ──────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div className={styles.container}>
        <div className={styles.errorBox}>{error}</div>
        <button className={styles.backBtn} onClick={() => navigate(`/app/student/${username}/exams`)}>← Back to tests</button>
      </div>
    );
  }

  if (step === 'done') {
    const r = doneResult || {};
    return (
      <div className={styles.container}>
        <div className={`${styles.doneCard} ${r.violationEnded ? styles.doneBad : ''}`}>
          <div className={styles.doneIcon}>{r.violationEnded ? <FiAlertTriangle /> : <FiSend />}</div>
          <h1>{r.violationEnded ? 'Test ended' : 'Submitted'}</h1>
          <p className={styles.doneMsg}>{r.message || r.localMessage || 'Your answers were submitted.'}</p>
          {(r.obtainedMarks !== undefined && r.obtainedMarks !== null) && (
            <div className={styles.doneScore}>
              <span className={styles.doneScoreBig}>{r.obtainedMarks} / {r.totalMarks}</span>
              {r.percentage !== undefined && r.percentage !== null && (
                <span className={styles.doneScorePct}>{r.percentage}%</span>
              )}
            </div>
          )}
          {r.resultAvailableAt && r.detailsHidden && (
            <p className={styles.doneTime}><FiClock /> Full breakdown after {fmtTime(r.resultAvailableAt)}</p>
          )}
          <div className={styles.doneNotes}>
            {r.practice && <span>🏃 Practice test — no marks written to your mark list.</span>}
            {!r.practice && !r.violationEnded && <span>{r.markSaved ? '✅ Marks saved to your mark list.' : 'Marks will be added to your mark list.'}</span>}
            {r.violationEnded && <span>⚠️ Score for this test: 0 (fullscreen lock was broken twice).</span>}
          </div>
          <button className={styles.backBtn} onClick={() => navigate(`/app/student/${username}/exams`)}>← Back to my tests</button>
        </div>
      </div>
    );
  }

  if (step === 'ready' && test) {
    return (
      <div className={styles.container}>
        <div className={styles.readyCard}>
          <div className={styles.badges}>
            <span className={styles.subjectBadge}>{test.subject}</span>
            <span className={styles.classBadge}>{String(test.className || '').toUpperCase()}</span>
            {test.practice && <span className={styles.practiceBadge}>Practice</span>}
          </div>
          <h1>{String(test.componentName || '').replace(/_/g, ' ').toUpperCase()}</h1>
          <p className={styles.meta}>Term {test.termNumber} · {test.questionCount} questions · {test.totalMarks} marks{test.timeLimit ? ` · ${test.timeLimit} minutes` : ' · no time limit'}</p>
          <ul className={styles.rules}>
            <li>🔒 The exam runs in fullscreen — leaving fullscreen or switching apps is a warning.</li>
            <li>⚠️ Two warnings end the test and the score is <b>0</b>.</li>
            <li>⏳ You see your score right after you submit — the full breakdown appears in the <b>Results</b> tab about 30 minutes later.</li>
            {test.practice ? <li>🏃 Practice test — your marks are not saved.</li> : <li>📝 Your score is saved to your mark list.</li>}
          </ul>
          <button className={styles.beginBtn} onClick={begin}><FiPlay /> Start fullscreen exam</button>
          <button className={styles.linkBtn} onClick={() => setStep('gate')}>← Back</button>
        </div>
      </div>
    );
  }

  if (step === 'gate') {
    return (
      <div className={styles.container}>
        <form className={styles.gateCard} onSubmit={start}>
          <div className={styles.lockIcon}><FiLock /></div>
          <h1>Enter test password</h1>
          <p className={styles.meta}>Your teacher gives you a 5-digit password to open this test.</p>
          <input
            className={styles.pwdInput}
            value={password}
            onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            inputMode="numeric"
            autoFocus
            placeholder="•••••"
          />
          {pwdError && <div className={styles.pwdError}>{pwdError}</div>}
          <button type="submit" className={styles.beginBtn} disabled={starting || !student}>
            {starting ? 'Checking…' : 'Unlock test'}
          </button>
          <button type="button" className={styles.linkBtn} onClick={() => navigate(`/app/student/${username}/exams`)}>← Cancel</button>
        </form>
      </div>
    );
  }

  // ── exam ─────────────────────────────────────────────────────────
  const idx = Math.min(current, Math.max(0, questions.length - 1));
  const q = questions[idx];
  const type = q ? normType(q.type) : '';
  const mm = timeLeft !== null ? String(Math.floor(Math.max(0, timeLeft) / 60)).padStart(2, '0') : null;
  const ss = timeLeft !== null ? String(Math.max(0, timeLeft) % 60).padStart(2, '0') : null;
  const answeredCount = Object.keys(answers).filter((k) => {
    const v = answers[k];
    return v && (typeof v === 'string' ? v.trim().length > 0 : Object.keys(v).length > 0);
  }).length;

  const renderAnswerArea = () => {
    if (!q) return null;

    if (type === 'mcq') {
      return (
        <div className={styles.options}>
          {(q.options || []).map((opt, j) => (
            <label key={j} className={`${styles.option} ${answers[q.id] === opt ? styles.optionOn : ''}`}>
              <input
                type="radio"
                name={`q${q.id}`}
                value={opt}
                checked={answers[q.id] === opt}
                onChange={() => setAnswer(q.id, opt)}
              />
              <strong className={styles.optLetter}>{String.fromCharCode(65 + j)}.</strong>
              <span>{opt}</span>
            </label>
          ))}
        </div>
      );
    }

    if (type === 'true_false') {
      return (
        <div className={styles.trueFalse}>
          {['True', 'False'].map((opt) => (
            <label key={opt} className={`${styles.tfOption} ${answers[q.id] === opt ? styles.optionOn : ''}`}>
              <input type="radio" name={`q${q.id}`} value={opt} checked={answers[q.id] === opt} onChange={() => setAnswer(q.id, opt)} />
              {opt}
            </label>
          ))}
        </div>
      );
    }

    if (type === 'matching' && q.leftColumn && q.rightColumn) {
      const studentMap = answers[q.id] || {};
      return (
        <div className={styles.matching}>
          {q.leftColumn.map((left) => (
            <div key={left} className={styles.matchRow}>
              <span className={styles.matchLeft}>{left}</span>
              <span className={styles.matchArrow}>→</span>
              <select
                value={studentMap[left] || ''}
                onChange={(e) => setAnswer(q.id, { ...(answers[q.id] || {}), [left]: e.target.value })}
              >
                <option value="">Select…</option>
                {q.rightColumn.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          ))}
        </div>
      );
    }

    if (type === 'essay') {
      return (
        <textarea
          className={styles.textArea}
          rows={6}
          value={answers[q.id] || ''}
          onChange={(e) => setAnswer(q.id, e.target.value)}
          placeholder="Write your answer…"
        />
      );
    }

    return (
      <input
        type="text"
        className={styles.textInput}
        value={answers[q.id] || ''}
        onChange={(e) => setAnswer(q.id, e.target.value)}
        placeholder="Type your answer…"
      />
    );
  };

  return (
    <div className={`${styles.container} ${immersive ? styles.immersive : ''}`}>
      <div className={styles.examHeader}>
        <div>
          <h1>{test.subject} — {String(test.className || '').toUpperCase()}</h1>
          <p>
            Term {test.termNumber} · {String(test.componentName || '').replace(/_/g, ' ').toUpperCase()} ·
            {' '}{questions.length} questions{test.practice ? ' · practice' : ''} · {answeredCount}/{questions.length} answered
            {flaggedCount > 0 ? ` · ${flaggedCount} marked for review` : ''}
          </p>
        </div>
        <div className={styles.headerRight}>
          {timeLeft !== null && (
            <span className={`${styles.timer} ${timeLeft <= 60 ? styles.timerLow : ''}`}>⏱ {mm}:{ss}</span>
          )}
          <span
            className={`${styles.lockPill} ${!fsActive ? styles.lockPillTap : ''}`}
            title={fsActive ? 'Fullscreen is locked' : 'Tap to lock the exam to the screen'}
            onClick={fsActive ? undefined : () => { enterFullscreen(); }}
          >
            {fsActive ? '🔒 fullscreen' : '📱 locked'}
          </span>
        </div>
      </div>

      {violations > 0 && violations < 2 && (
        <div className={styles.warningBanner}>⚠️ Warning {violations}/2 — do not leave the exam screen.</div>
      )}
      {warning && <div className={styles.warningBanner}>{warning}</div>}
      {submitError && (
        <div className={styles.errorBanner}>
          {submitError}{' '}
          <button className={styles.retryBtn} onClick={() => doSubmit(lastViolatedRef.current)}>Retry submit</button>
        </div>
      )}

      <div className={styles.navBar}>
        <button className={styles.navArrow} onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={idx === 0}>←</button>
        <div className={styles.navGrid}>
          {questions.map((qq, i) => {
            const v = answers[qq.id];
            const isAns = v && (typeof v === 'string' ? v.trim().length > 0 : Object.keys(v).length > 0);
            const isFlag = !!flagged[qq.id];
            return (
              <button
                key={qq.id}
                className={`${styles.navBtn} ${i === idx ? styles.navBtnActive : ''} ${isAns ? styles.navBtnAnswered : ''} ${isFlag ? styles.navBtnFlagged : ''}`}
                onClick={() => setCurrent(i)}
                title={`Question ${i + 1}${isFlag ? ' (marked for review)' : ''}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <button className={styles.navArrow} onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))} disabled={idx >= questions.length - 1}>→</button>
      </div>

      {q && (
        <div className={styles.questionCard}>
        <div className={styles.qHeader}>
          <span className={styles.qNum}>{idx + 1}</span>
          <span className={styles.qType}>{type.replace(/_/g, ' ')}</span>
          <span className={styles.qMarks}>{q.marks} mark{q.marks > 1 ? 's' : ''}</span>
          <button
            type="button"
            className={`${styles.flagBtn} ${flagged[q.id] ? styles.flagBtnOn : ''}`}
            onClick={() => toggleFlag(q.id)}
            title="Mark this question to come back to it"
          >
            {flagged[q.id] ? '🔖 Marked' : '🔖 Mark for review'}
          </button>
        </div>
          <p className={styles.qText}>{q.question}</p>
          {renderAnswerArea()}
        </div>
      )}

      <div className={styles.footer}>
        <button className={styles.navArrow} onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={idx === 0}>← Previous</button>
        {idx >= questions.length - 1 ? (
          <button className={styles.submitBtn} onClick={confirmSubmit} disabled={submitting}>
            <FiSend /> {submitting ? 'Submitting…' : `Submit test (${answeredCount}/${questions.length})`}
          </button>
        ) : (
          <button className={styles.nextBtn} onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}>Next →</button>
        )}
      </div>

      {fsBlocked && !submitting && (
        <div className={styles.fsOverlay}>
          <div className={styles.fsBox}>
            <FiLock />
            <h2>Back to fullscreen</h2>
            <p>Your exam left fullscreen. Press the button to return and keep writing.</p>
            <button className={styles.fsBtn} onClick={() => { tryRestoreFullscreen(); }}>
              <FiLock /> Return to fullscreen
            </button>
          </div>
        </div>
      )}

      {blackout && !submitting && (
        <div className={styles.blackout} role="alertdialog" aria-live="assertive">
          <div className={styles.blackoutBox}>
            <FiAlertTriangle />
            <h2>You left the exam screen</h2>
            <p className={styles.blackoutReason}>{blackoutReason}</p>
            <p className={styles.blackoutRule}>
              Warning <strong>1 of 2</strong> — if you open another tab, minimise the window,
              or leave the exam again, the test will <strong>end immediately</strong> and
              you will get <strong>0 marks</strong>.
            </p>
            <button className={styles.blackoutBtn} onClick={dismissBlackout}>
              ✅ I'm back — continue exam
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentExamPlayer;
