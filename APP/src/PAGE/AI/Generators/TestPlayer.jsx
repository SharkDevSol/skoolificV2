import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import styles from './TestPlayer.module.css';

const TYPE_ALIASES = {
  'mcq': 'mcq', 'multiple choice': 'mcq', 'multiplechoice': 'mcq',
  'true false': 'true_false', 'truefalse': 'true_false', 'true or false': 'true_false',
  'matching': 'matching', 'match': 'matching',
  'fill in the blank': 'fill_blank', 'fill in blanks': 'fill_blank', 'fill in blank': 'fill_blank', 'fill blank': 'fill_blank', 'fillblank': 'fill_blank',
  'short answer': 'short_answer', 'shortanswers': 'short_answer', 'shortanswer': 'short_answer',
  'essay': 'essay', 'essay open ended': 'essay', 'open ended': 'essay', 'openended': 'essay',
  'numeric': 'numeric', 'numerical': 'numeric',
  'transformation': 'transformation', 'error correction': 'transformation'
};
const normType = (t) => {
  const s = String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  return TYPE_ALIASES[s] || TYPE_ALIASES[s.replace(/ /g, '')] || String(t || '').toLowerCase();
};

// Remove a stored "A) " / "B. " prefix (display + answer value) without lowercasing
const stripPrefix = (s) => String(s == null ? '' : s).trim().replace(/^(?:[A-Za-z]|[ሀ-፿]{1,2})\s*[).:]\s*/u, '').trim();
const stripLetter = (s) => String(s == null ? '' : s).trim().replace(/^(?:[A-Za-z]|[ሀ-፿]{1,2})\s*[).:]\s*/u, '').trim().toLowerCase();
const sameText = (a, b) => {
  const x = String(a == null ? '' : a).trim().toLowerCase();
  const y = String(b == null ? '' : b).trim().toLowerCase();
  if (!y) return false;
  return x === y || stripLetter(a) === stripLetter(b);
};
const hasValue = (v) => v && (typeof v === 'string' ? v.trim().length > 0 : Object.keys(v).length > 0);

const cmpVal = (v) => String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' ');
// Per-pair ✓/✗ verdict for a matching question (mirrors backend matchingPairsScore)
const matchingVerdicts = (q, studentMap) => {
  const out = {};
  const pairs = Array.isArray(q.correctMatches) ? q.correctMatches : [];
  const given = studentMap && typeof studentMap === 'object' ? studentMap : {};
  const byNorm = {};
  Object.keys(given).forEach(k => { byNorm[cmpVal(k)] = given[k]; });
  pairs.forEach(p => {
    const chosen = given[p.left] !== undefined ? given[p.left] : byNorm[cmpVal(p.left)];
    out[String(p.left)] = chosen !== undefined && chosen !== null && String(chosen).trim() !== '' && cmpVal(chosen) === cmpVal(p.right);
  });
  return out;
};

const TestPlayer = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subject = searchParams.get('subject');
  const className = searchParams.get('class');
  const term = searchParams.get('term');
  const component = searchParams.get('component');

  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null); // seconds, null = no limit

  useEffect(() => {
    if (!subject || !className || !term || !component) {
      navigate('/ai-tests');
      return;
    }
    const fetchTest = async () => {
      try {
        const res = await axios.get('/api/ai/get-test', {
          params: { subject, className, termNumber: term, componentName: component }
        });
        if (res.data.success) {
          setTest(res.data.data);
          const tl = parseInt(res.data.data.timeLimit) || 0;
          if (tl > 0) setTimeLeft(tl * 60);
        } else {
          navigate('/ai-tests');
        }
      } catch (err) {
        console.error('Error fetching test:', err);
        navigate('/ai-tests');
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [subject, className, term, component, navigate]);

  const setAnswer = (qId, value) => {
    setAnswers(a => ({ ...a, [qId]: value }));
  };

  const toggleFlag = (qId) => setFlagged(f => ({ ...f, [qId]: !f[qId] }));

  const submitTest = async (skipConfirm) => {
    if (!test || submitted) return;
    const unanswered = test.questions.length - answeredCount;
    if (!skipConfirm && unanswered > 0 && !confirm(`You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`)) return;
    setSubmitted(true);
    try {
      const res = await axios.post('/api/ai/submit-exam', {
        schemaName: `test_${subject.toLowerCase().replace(/[\s\-\.]+/g, '_')}_schema`,
        tableName: `${className.toLowerCase()}_term${term}_${component.toLowerCase().replace(/[\s\-\.]+/g, '_')}`,
        subjectName: subject,
        className,
        termNumber: parseInt(term),
        componentName: component,
        totalMarks: test.totalMarks,
        studentId: '',
        studentName: '',
        answers
      });
      setResult(res.data);
    } catch (err) {
      console.error('Submit error:', err);
      alert('Failed to submit: ' + (err.response?.data?.error || err.message));
      setSubmitted(false);
    }
  };

  // Countdown timer (only when the test has a time limit)
  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) { submitTest(true); return; }
    const t = setTimeout(() => setTimeLeft(s => (s ?? 1) - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, submitted]);

  if (loading) return <div className={styles.container}><p className={styles.center}>Loading test...</p></div>;
  if (!test) return <div className={styles.container}><p className={styles.center}>Test not found</p></div>;

  const questions = test.questions || [];
  const answeredCount = Object.keys(answers).filter(k => hasValue(answers[k])).length;
  const flaggedCount = Object.keys(flagged).filter(k => flagged[k]).length;
  const resultById = {};
  (result?.results || []).forEach(r => { resultById[String(r.questionId)] = r; });

  const idx = Math.min(current, questions.length - 1);
  const q = questions[idx];
  const type = normType(q.type);
  const answered = answers[q.id];
  const resRow = submitted ? resultById[String(q.id)] : null;
  const isCorrect = resRow ? !!resRow.isCorrect : false;
  const isWrong = resRow ? !resRow.isCorrect && !!answered : false;

  const jump = (i) => setCurrent(Math.max(0, Math.min(questions.length - 1, i)));

  const mm = timeLeft !== null ? String(Math.floor(Math.max(0, timeLeft) / 60)).padStart(2, '0') : null;
  const ss = timeLeft !== null ? String(Math.max(0, timeLeft) % 60).padStart(2, '0') : null;

  const scoreLabel = () => {
    if (!resRow) return null;
    if (type === 'matching' && resRow.totalPairs != null) {
      const p = `${resRow.correctPairs ?? 0}/${resRow.totalPairs} pairs`;
      if (isCorrect) return `✓ All pairs correct (+${resRow.marks})`;
      if (resRow.marks > 0) return `◐ ${p} (+${resRow.marks} of ${resRow.maxMarks})`;
      return `✗ ${p} (0 / ${resRow.maxMarks})`;
    }
    if (isCorrect) return `✓ Correct (+${resRow.marks})`;
    return `✗ Incorrect (0 / ${resRow.maxMarks})`;
  };

  const renderAnswerArea = () => {
    const correctVal = resRow ? (resRow.correctAnswer || q.answer || '') : '';

    if (type === 'mcq') {
      const opts = (q.options || []).map(stripPrefix).filter(Boolean);
      const correctOpt = opts.find(o => sameText(o, correctVal)) || correctVal || '';
      return (
        <>
          <div className={styles.options}>
            {opts.map((opt, j) => (
              <label key={j} className={`${styles.option} ${resRow && sameText(opt, correctVal) ? styles.optionCorrect : ''} ${resRow && answers[q.id] === opt && !sameText(opt, correctVal) ? styles.optionWrong : ''}`}>
                <input
                  type="radio"
                  name={`q${q.id}`}
                  value={opt}
                  checked={answers[q.id] === opt}
                  onChange={() => setAnswer(q.id, opt)}
                  disabled={submitted}
                />
                <strong className={styles.optLetter}>{String.fromCharCode(65 + j)}.</strong>
                <span>{opt}</span>
              </label>
            ))}
          </div>
          {submitted && (
            <div className={styles.correctAnswer}><strong>Correct answer:</strong> {correctOpt || '—'}</div>
          )}
        </>
      );
    }

    if (type === 'true_false') {
      return (
        <>
          <div className={styles.trueFalse}>
            {['True', 'False'].map(opt => (
              <label key={opt} className={`${styles.tfOption} ${resRow && sameText(opt, correctVal) ? styles.optionCorrect : ''} ${resRow && answers[q.id] === opt && !sameText(opt, correctVal) ? styles.optionWrong : ''}`}>
                <input
                  type="radio"
                  name={`q${q.id}`}
                  value={opt}
                  checked={answers[q.id] === opt}
                  onChange={() => setAnswer(q.id, opt)}
                  disabled={submitted}
                />
                {opt}
              </label>
            ))}
          </div>
          {submitted && (
            <div className={styles.correctAnswer}><strong>Correct answer:</strong> {correctVal || '—'}</div>
          )}
        </>
      );
    }

    if (type === 'matching' && q.leftColumn && q.rightColumn) {
      const pairs = (q.correctMatches || []).length;
      const correctMap = {};
      (q.correctMatches || []).forEach(m => { correctMap[String(m.left)] = m.right; });
      if (!Object.keys(correctMap).length) {
        q.leftColumn.forEach((l, i) => { correctMap[String(l)] = q.rightColumn[i]; });
      }
      const studentMap = answers[q.id] || {};
      const perPair = resRow ? matchingVerdicts(q, studentMap, resRow) : null;
      return (
        <>
          <div className={styles.matching}>
            {q.leftColumn.map(left => {
              const stu = studentMap[left] || '';
              const hasPick = submitted && !!String(stu).trim();
              const isOk = hasPick && perPair && perPair[String(left)] === true;
              const isBad = hasPick && perPair && perPair[String(left)] === false;
              return (
                <div key={left} className={`${styles.matchRow} ${isOk ? styles.matchRowOk : ''} ${isBad ? styles.matchRowBad : ''}`}>
                  <span className={styles.matchLeft}>{left}</span>
                  <span className={styles.matchArrow}>→</span>
                  <select
                    value={stu}
                    onChange={e => setAnswer(q.id, { ...(answers[q.id] || {}), [left]: e.target.value })}
                    disabled={submitted}
                  >
                    <option value="">Select…</option>
                    {q.rightColumn.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {submitted && (
                    <span className={`${styles.pairMark} ${isOk ? styles.pairOk : ''} ${isBad ? styles.pairBad : ''}`}>
                      {isOk ? '✓' : isBad ? '✗' : '—'}
                    </span>
                  )}
                  {isBad && correctMap[String(left)] != null && (
                    <span className={styles.matchCorrectNote}>correct: {String(correctMap[String(left)])}</span>
                  )}
                </div>
              );
            })}
          </div>
          {pairs > 0 && (
            <div className={styles.matchHint}>
              {q.marks} marks total — {pairs} pair{pairs > 1 ? 's' : ''}, each correct pair earns {(q.marks / pairs).toFixed(2).replace(/\.00$/, '')} mark{q.marks / pairs !== 1 ? 's' : ''}
              {perPair && resRow ? ` · ${resRow.correctPairs ?? 0}/${resRow.totalPairs ?? pairs} correct` : ''}
            </div>
          )}
          {submitted && (
            <div className={styles.correctAnswer}>
              <strong>All correct pairs:</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                {q.leftColumn.map(left => (
                  <li key={left}>{left} → {correctMap[String(left)] ?? '—'}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      );
    }

    if (type === 'essay') {
      return (
        <textarea
          className={styles.textArea}
          value={answers[q.id] || ''}
          onChange={e => setAnswer(q.id, e.target.value)}
          placeholder="Write your answer..."
          rows={5}
          disabled={submitted}
        />
      );
    }

    // fill_blank + any other text-answer type (including unknown/legacy type names)
    return (
      <input
        type="text"
        className={styles.textInput}
        value={answers[q.id] || ''}
        onChange={e => setAnswer(q.id, e.target.value)}
        placeholder={type === 'fill_blank' ? 'Type the missing word/number…' : 'Type your answer...'}
        disabled={submitted}
      />
    );
  };

  const lastQuestion = idx >= questions.length - 1;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>{test.subject} — {test.className}</h1>
          <p>
            Term {test.termNumber} · {test.componentName} · {questions.length} questions · {test.totalMarks} marks · {answeredCount}/{questions.length} answered
            {flaggedCount > 0 ? ` · ${flaggedCount} marked for review` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {timeLeft !== null && (
            <span className={`${styles.timer} ${timeLeft <= 60 ? styles.timerLow : ''}`} title="Time remaining">
              ⏱ {mm}:{ss}
            </span>
          )}
          <button className={styles.backBtn} onClick={() => navigate('/ai-tests')}>← Back</button>
        </div>
      </div>

      {submitted && result && (
        <div className={styles.resultBanner}>
          <h2>Auto-graded Score: {result.obtainedMarks} / {result.totalMarks} ({result.percentage}%)</h2>
          <p>
            {result.message || 'Answers have been recorded.'}
            {result.bonusMarks > 0 ? ` Bonus: +${result.bonusMarks} marks.` : ''}
            {result.manualGradingCount > 0 ? ` ${result.manualGradingCount} question(s) will be graded by your teacher.` : ''}
          </p>
        </div>
      )}

      <div className={styles.navBar}>
        <button className={styles.navArrow} onClick={() => jump(idx - 1)} disabled={idx === 0}>← Previous</button>
        <div className={styles.navGrid}>
          {questions.map((qq, i) => {
            const ans = answers[qq.id];
            const isAns = hasValue(ans);
            const row = submitted ? resultById[String(qq.id)] : null;
            const isFlag = !!flagged[qq.id];
            let cls = styles.navBtn;
            if (i === idx) cls += ` ${styles.navBtnActive}`;
            if (isAns) cls += ` ${styles.navBtnAnswered}`;
            if (isFlag) cls += ` ${styles.navBtnFlagged}`;
            if (row) cls += row.isCorrect ? ` ${styles.navBtnCorrect}` : ` ${styles.navBtnWrong}`;
            return (
              <button
                key={qq.id}
                className={cls}
                onClick={() => jump(i)}
                title={`Question ${i + 1}${isFlag ? ' (marked for review)' : ''}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <button className={styles.navArrow} onClick={() => jump(idx + 1)} disabled={idx >= questions.length - 1}>Next →</button>
      </div>

      <div className={styles.questionCard}>
        <div className={styles.qHeader}>
          <span className={styles.qNum}>{idx + 1}</span>
          <span className={styles.qType}>{type.replace(/_/g, ' ')}</span>
          <span className={styles.qMarks}>{q.marks} mark{q.marks > 1 ? 's' : ''}</span>
          {submitted && resRow && (
            <span className={isCorrect ? styles.correct : (resRow.marks > 0 ? styles.partial : styles.incorrect)}>
              {scoreLabel()}
            </span>
          )}
          {submitted && resRow?.requiresManualGrading && <span className={styles.pending}>⏳ Teacher grades this</span>}
          {!submitted && (
            <button
              type="button"
              className={`${styles.flagBtn} ${flagged[q.id] ? styles.flagBtnOn : ''}`}
              onClick={() => toggleFlag(q.id)}
              title="Mark this question to come back to it"
            >
              {flagged[q.id] ? '🔖 Marked' : '🔖 Mark for review'}
            </button>
          )}
        </div>
        <p className={styles.qText}>{q.question}</p>

        {renderAnswerArea()}

        {submitted && resRow && !isCorrect && resRow.correctAnswer && type !== 'mcq' && type !== 'matching' && (
          <div className={styles.correctAnswer}><strong>Correct answer:</strong> {String(resRow.correctAnswer)}</div>
        )}
        {submitted && (q.explanation || resRow?.explanation) && (
          <div className={styles.explanation}>
            <strong>Explanation:</strong> {q.explanation || resRow.explanation}
          </div>
        )}
      </div>

      <div className={styles.pager}>
        <button className={styles.navArrow} onClick={() => jump(idx - 1)} disabled={idx === 0}>← Previous</button>
        <span className={styles.pagerInfo}>
          Question {idx + 1} of {questions.length}
          {flagged[q.id] ? ' · marked for review' : ''}
        </span>
        <button className={styles.navArrow} onClick={() => jump(idx + 1)} disabled={idx >= questions.length - 1}>Next →</button>
      </div>

      {!submitted && !lastQuestion && (
        <div className={styles.submitArea}>
          <span className={styles.submitHint}>
            Answer all questions, then go to the last question to submit.
          </span>
        </div>
      )}

      {!submitted && lastQuestion && (
        <div className={styles.submitArea}>
          <button className={styles.submitBtn} onClick={() => submitTest()} disabled={answeredCount === 0}>
            Submit Test ({answeredCount} / {questions.length} answered)
          </button>
        </div>
      )}
    </div>
  );
};

export default TestPlayer;
