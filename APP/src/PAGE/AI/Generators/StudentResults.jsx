import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { FiRefreshCw, FiChevronRight, FiX, FiAlertTriangle, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import styles from './StudentResults.module.css';
import { buildResultRows, resultStats, statusKey, STATUS_LABELS, fmtTime, pretty } from './resultRows';

const DEFAULT_COMPONENTS = ['practical_1', 'test_1', 'practical_2', 'test_2', 'mid', 'book', 'final'];

const BADGE_CLASS = {
  none: styles.badgeMuted,
  left: styles.badgeBad,
  progress: styles.badgeWarn,
  manual: styles.badgeWarn,
  graded: styles.badgeOk,
  submitted: styles.badgeOk
};

const statusOf = (r) => {
  const key = statusKey(r);
  return { cls: BADGE_CLASS[key], text: STATUS_LABELS[key] };
};

const StudentResults = () => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [termOptions, setTermOptions] = useState([1, 2, 3, 4]);
  const [form, setForm] = useState({ className: '', subjectName: '', termNumber: '', componentName: '' });
  const [componentOptions, setComponentOptions] = useState([]);
  const [data, setData] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    axios.get('/api/ai/list-classes')
      .then(r => {
        if (r.data.success) {
          setClasses(r.data.data.classes || []);
          if (r.data.data.subjects?.length) setSubjects(r.data.data.subjects);
        }
      })
      .catch(() => {});
    axios.get('/api/mark-list/subjects')
      .then(r => {
        if (Array.isArray(r.data) && r.data.length) {
          setSubjects(r.data.map(s => (typeof s === 'string' ? s : s.subject_name)).filter(Boolean));
        }
      })
      .catch(() => {});
    axios.get('/api/mark-list/subjects-classes')
      .then(r => { if (Array.isArray(r.data)) setMappings(r.data); })
      .catch(() => {});
    axios.get('/api/ai/school-config')
      .then(r => {
        const terms = r.data?.data?.number_of_terms || r.data?.number_of_terms || r.data?.data?.terms;
        const n = parseInt(terms, 10);
        if (n >= 1) setTermOptions(Array.from({ length: n }, (_, i) => i + 1));
      })
      .catch(() => {});
  }, []);

  // Subjects taught in the selected class
  const availableSubjects = useMemo(() => {
    if (!form.className) return subjects;
    const fromMappings = [...new Set(mappings.filter(m => m.class_name === form.className).map(m => m.subject_name))];
    return fromMappings.length ? fromMappings : subjects;
  }, [form.className, mappings, subjects]);

  // Component choices: mark-list components + components of saved tests
  const pickClass = form.className;
  const pickSubject = form.subjectName;
  const pickTerm = form.termNumber;
  useEffect(() => {
    if (!pickClass || !pickSubject || !pickTerm) {
      setComponentOptions([]);
      return;
    }
    let alive = true;
    (async () => {
      const comps = [];
      try {
        const r = await axios.get(`/api/mark-list/mark-list/${encodeURIComponent(pickSubject)}/${encodeURIComponent(pickClass)}/${pickTerm}`);
        const config = r.data.config || r.data;
        (config.mark_components || []).forEach(c => { if (c && c.name && !comps.includes(c.name)) comps.push(c.name); });
      } catch { /* mark list may not exist yet */ }
      try {
        const r = await axios.get('/api/ai/list-tests');
        const list = Array.isArray(r.data.data) ? r.data.data : [];
        list
          .filter(t => t.subject === pickSubject && String(t.className) === String(pickClass) && String(t.termNumber) === String(pickTerm))
          .forEach(t => { if (t.componentName && !comps.includes(t.componentName)) comps.push(t.componentName); });
      } catch { /* ignore */ }
      if (!alive) return;
      const merged = comps.length ? comps : DEFAULT_COMPONENTS;
      setComponentOptions(merged);
      setForm(f => ({
        ...f,
        componentName: f.componentName && merged.includes(f.componentName) ? f.componentName : (merged[0] || '')
      }));
    })();
    return () => { alive = false; };
  }, [pickClass, pickSubject, pickTerm]);

  // Attempts + class roster for the chosen test
  const filterClass = form.className;
  const filterSubject = form.subjectName;
  const filterTerm = form.termNumber;
  const filterComponent = form.componentName;
  useEffect(() => {
    if (!filterClass || !filterSubject || !filterTerm || !filterComponent) {
      setData(null);
      setRoster([]);
      setError('');
      return;
    }
    let alive = true;
    setLoading(true);
    setError('');
    Promise.all([
      axios.get('/api/ai/test-results', { params: { subject: filterSubject, className: filterClass, termNumber: filterTerm, componentName: filterComponent } }),
      axios.get('/api/ai/class-students-full', { params: { className: filterClass } }).catch(() => ({ data: { data: [] } }))
    ]).then(([resA, resB]) => {
      if (!alive) return;
      if (!resA.data.success) {
        setData(null);
        setError(resA.data.error || 'Failed to load results');
        return;
      }
      setData(resA.data.data);
      setRoster(Array.isArray(resB.data.data) ? resB.data.data : []);
    }).catch(err => {
      if (!alive) return;
      setData(null);
      setError(err.response?.data?.error || 'Failed to load results');
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [filterClass, filterSubject, filterTerm, filterComponent, reloadKey]);

  useEffect(() => {
    if (!selected) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  // Roster + attempts merged into one list (students who did not attempt included)
  const rows = useMemo(
    () => buildResultRows(data ? data.attempts : [], roster),
    [data, roster]
  );

  const stats = useMemo(() => resultStats(rows), [rows]);

  const openDetail = async (att) => {
    if (!att || !att.id) return;
    setSelected(att);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const r = await axios.get(`/api/ai/student-result/${att.id}`, { params: { view: 'teacher' } });
      if (r.data.success) setDetail(r.data.data);
      else setDetailError(r.data.error || 'Failed to load result');
    } catch (e) {
      setDetailError(e.response?.data?.error || 'Failed to load result');
    } finally {
      setDetailLoading(false);
    }
  };

  const setField = (key) => (e) => {
    const value = e.target.value;
    setForm(f => {
      const next = { ...f, [key]: value };
      if (key === 'className') {
        next.subjectName = '';
        next.componentName = '';
      }
      if (key === 'subjectName') next.componentName = '';
      if (key === 'termNumber') next.componentName = '';
      return next;
    });
  };

  const allSelected = form.className && form.subjectName && form.termNumber && form.componentName;

  return (
    <div className={styles.wrap}>
      <div className={styles.filters}>
        <div className={styles.field}>
          <label>Class</label>
          <select value={form.className} onChange={setField('className')}>
            <option value="">— select class —</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Subject</label>
          <select value={form.subjectName} onChange={setField('subjectName')} disabled={!form.className}>
            <option value="">— select subject —</option>
            {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Term</label>
          <select value={form.termNumber} onChange={setField('termNumber')} disabled={!form.subjectName}>
            <option value="">— select term —</option>
            {termOptions.map(t => <option key={t} value={t}>Term {t}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Component</label>
          <select value={form.componentName} onChange={setField('componentName')} disabled={!form.termNumber || componentOptions.length === 0}>
            <option value="">— select component —</option>
            {componentOptions.map(c => <option key={c} value={c}>{pretty(c)}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <button
            className={styles.refreshBtn}
            onClick={() => setReloadKey(k => k + 1)}
            disabled={!allSelected || loading}
          >
            <FiRefreshCw /> Refresh
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {!allSelected && !loading && (
        <p className={styles.hint}>Select a class, subject, term and component to see every student&apos;s result.</p>
      )}

      {loading && <p className={styles.hint}>Loading results…</p>}

      {data && !data.testExists && !loading && (
        <p className={styles.hint}>No test saved for these filters yet — nothing has been attempted.</p>
      )}

      {data && data.testExists && !loading && (
        <>
          <div className={styles.summary}>
            <span className={styles.stat}>Students <b>{stats.total}</b></span>
            <span className={styles.stat}>Attempted <b>{stats.done}</b></span>
            <span className={styles.stat}>Class average <b>{stats.avg}</b></span>
            <span className={styles.stat}>Wrong answers <b>{stats.wrong}</b></span>
            {data.published && <span className={styles.stat}>Published <b>{fmtTime(data.published.publishedAt)}</b></span>}
            <span className={styles.stat}>Student wait time <b>{data.published?.resultDelayMinutes ?? 0} min</b></span>
          </div>

          {rows.length === 0 ? (
            <p className={styles.hint}>No students found for this class.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>%</th>
                  <th>Correct / Wrong</th>
                  <th>Submitted</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const st = statusOf(r);
                  const a = r.latest;
                  const pct = a && a.percentage !== null && a.percentage !== undefined
                    ? `${Number(a.percentage).toFixed(0)}%` : '—';
                  return (
                    <tr
                      key={r.key}
                      className={`${styles.row} ${r.attempted ? styles.rowClickable : ''}`}
                      onClick={() => { if (r.attempted) openDetail(a); }}
                      title={r.attempted ? `Open ${r.name}'s result` : 'No attempt yet'}
                    >
                      <td className={styles.num}>{i + 1}</td>
                      <td>
                        <div className={styles.stuName}>{r.name || '—'}</div>
                        {r.username && <div className={styles.stuSub}>{r.username}</div>}
                        {r.attemptCount > 1 && <div className={styles.stuSub}>{r.attemptCount} attempts</div>}
                      </td>
                      <td><span className={st.cls}>{st.text}</span></td>
                      <td className={styles.mono}>
                        {a ? `${a.earnedMarks ?? '—'} / ${a.totalMarks ?? '—'}` : '—'}
                      </td>
                      <td className={styles.mono}>{a ? pct : '—'}</td>
                      <td className={styles.mono}>
                        {a ? <>{a.correctCount} ✓ / {a.wrongCount} ✗</> : '—'}
                      </td>
                      <td className={styles.mono}>{a ? fmtTime(a.submittedAt) : '—'}</td>
                      <td>{r.attempted && <FiChevronRight className={styles.chev} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}

      {selected && (
        <div className={styles.overlay} onClick={() => setSelected(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div>
                <h3>{selected.studentName || selected.name}</h3>
                <p className={styles.modalSub}>
                  {pretty(form.componentName)} · {form.subjectName} · {String(form.className).toUpperCase()} · Term {form.termNumber}
                </p>
              </div>
              <button className={styles.closeBtn} onClick={() => setSelected(null)} aria-label="Close"><FiX /></button>
            </div>

            <div className={styles.scoreBar}>
              <span className={styles.scoreBig}>
                {detail ? `${detail.earned_marks ?? detail.earnedMarks ?? '—'} / ${detail.total_marks ?? detail.totalMarks ?? '—'}` : '…'}
              </span>
              <span className={styles.scorePct}>
                {detail && detail.percentage !== null && detail.percentage !== undefined
                  ? `${Number(detail.percentage).toFixed(0)}%`
                  : ''}
              </span>
              {detail && (
                <span className={styles.scoreMeta}>
                  <FiCheckCircle className={styles.okIcon} /> {detail.results.filter(q => q.isCorrect).length} correct
                </span>
              )}
              {detail && (
                <span className={styles.scoreMeta}>
                  <FiXCircle className={styles.badIcon} /> {detail.results.filter(q => !q.isCorrect).length} wrong
                </span>
              )}
              <span className={styles.immediate}>Teacher view · shown immediately</span>
            </div>

            <p className={styles.resultMeta}>
              Submitted {fmtTime(selected.submittedAt)} · Status {statusOf({ attempted: true, latest: selected }).text}
              {selected.violationEnded ? ' · left the exam screen' : ''}
            </p>

            {detailError && <div className={styles.error}>{detailError}</div>}

            <div className={styles.qList}>
              {detailLoading && <p className={styles.hint}>Loading questions…</p>}
              {!detailLoading && detail && detail.results.length === 0 && (
                <p className={styles.hint}>No graded questions stored for this attempt.</p>
              )}
              {!detailLoading && detail && detail.results.map((q, i) => (
                <div key={q.questionId ?? i} className={`${styles.qCard} ${q.isCorrect ? styles.qOk : styles.qBad}`}>
                  <div className={styles.qTop}>
                    <span className={styles.qBadge}>{q.isCorrect ? <FiCheckCircle /> : <FiXCircle />} Question {i + 1}</span>
                    <span className={styles.qType}>{pretty(q.type)}</span>
                    {q.requiresManualGrading && <span className={styles.qManual}>manual grading</span>}
                    <span className={styles.qMarks}>{q.earnedMarks ?? 0} / {q.maxMarks ?? q.marks ?? 1}</span>
                  </div>
                  <p className={styles.qText}>{q.question || q.explanation || '(no question text)'}</p>
                  {Array.isArray(q.leftColumn) && q.leftColumn.length > 0 && (
                    <div className={styles.cols}>
                      <div>
                        <p className={styles.colHead}>Left column</p>
                        <ul>{q.leftColumn.map((l, li) => <li key={li}>{l}</li>)}</ul>
                      </div>
                      <div>
                        <p className={styles.colHead}>Right column</p>
                        <ul>{(q.rightColumn || []).map((rr, ri) => <li key={ri}>{rr}</li>)}</ul>
                      </div>
                    </div>
                  )}
                  <p className={styles.qLine}>
                    Student answered: <b>{q.studentAnswerText || (q.type === 'matching' ? '(matching)' : '—')}</b>
                  </p>
                  {!q.isCorrect && (
                    <p className={styles.qLine}>
                      Correct answer: <b>{q.correctAnswerText || '—'}</b>
                    </p>
                  )}
                  {q.explanation && <p className={styles.qExp}>{q.explanation}</p>}
                </div>
              ))}
            </div>

            <div className={styles.modalFoot}>
              <button className={styles.closeFoot} onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <p className={styles.note}>
        <FiAlertTriangle /> Scores appear here the moment a student submits — the student&apos;s own
        result delay (e.g. 30 minutes) only applies to their screen, never to this teacher view.
      </p>
    </div>
  );
};

export default StudentResults;
