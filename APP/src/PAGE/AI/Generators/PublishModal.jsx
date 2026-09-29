import { useState, useEffect } from 'react';
import axios from 'axios';
import { FiX } from 'react-icons/fi';

const randPassword = () => String(Math.floor(10000 + Math.random() * 90000));

// Shared publish dialog: 5-digit password + practice flag + student selection (all / some)
const PublishModal = ({ test, onClose, onChanged }) => {
  const [password, setPassword] = useState('');
  const [practice, setPractice] = useState(false);
  const [mode, setMode] = useState('all');
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [selected, setSelected] = useState({});
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // publish success payload
  const [unpublished, setUnpublished] = useState(false);

  useEffect(() => {
    if (!test) return;
    setPassword(test.password && /^\d{4,6}$/.test(String(test.password)) ? String(test.password) : randPassword());
    setPractice(!!test.practice);
    setMode(test.allStudents === false ? 'select' : 'all');
    setSelected({});
    setSearch('');
    setError('');
    setDone(null);
    setUnpublished(false);
    setRoster([]);
    setRosterLoading(true);
    axios.get('/api/ai/class-students-full', { params: { className: test.className } })
      .then((res) => setRoster(res.data.data || []))
      .catch((e) => setError(e.response?.data?.error || 'Could not load the class students'))
      .finally(() => setRosterLoading(false));
  }, [test]);

  if (!test) return null;

  const filtered = roster.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return String(s.student_name || '').toLowerCase().includes(q) || String(s.username || '').toLowerCase().includes(q);
  });

  const toggleStudent = (s) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[s.username]) delete next[s.username];
      else next[s.username] = { username: s.username, schoolId: s.school_id, name: s.student_name };
      return next;
    });
  };

  const toggleAll = () => {
    if (Object.keys(selected).length === filtered.length) setSelected({});
    else {
      const next = {};
      filtered.forEach((s) => { next[s.username] = { username: s.username, schoolId: s.school_id, name: s.student_name }; });
      setSelected(next);
    }
  };

  const doPublish = async () => {
    if (!/^\d{5}$/.test(password)) { setError('The test password must be exactly 5 digits'); return; }
    if (mode === 'select' && Object.keys(selected).length === 0) { setError('Select at least one student, or choose "All students"'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await axios.post('/api/ai/publish-test', {
        schemaName: test.schemaName,
        tableName: test.tableName,
        subjectName: test.subject,
        className: test.className,
        termNumber: test.termNumber,
        componentName: test.componentName,
        totalMarks: 0,
        timeLimit: 0,
        password,
        practice,
        allStudents: mode === 'all',
        students: mode === 'select' ? Object.values(selected) : [],
        publishedBy: 'Teacher'
      });
      setDone({ ...(res.data.data || {}), practice, password });
      if (onChanged) onChanged();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to publish');
    } finally {
      setBusy(false);
    }
  };

  const doUnpublish = async () => {
    setBusy(true);
    setError('');
    try {
      await axios.post('/api/ai/unpublish-test', { schemaName: test.schemaName, tableName: test.tableName });
      setUnpublished(true);
      if (onChanged) onChanged();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to unpublish');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', width: 'min(620px, 96vw)', maxHeight: '92vh', overflow: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,.3)' }}>
        {done ? (
          <>
            <h3 style={{ marginTop: 0 }}>✅ Published to students</h3>
            <p style={{ fontSize: '0.9rem', color: '#374151' }}>
              {test.subject} · {String(test.className || '').toUpperCase()} · Term {test.termNumber} ·{' '}
              <b>{String(test.componentName || '').replace(/_/g, ' ').toUpperCase()}</b>
              {' — '}{done.allStudents ? 'all students' : `${done.students} student(s)`} can now see it in their account.
            </p>
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '10px', padding: '14px', textAlign: 'center', margin: '12px 0' }}>
              <div style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: 600 }}>TEST PASSWORD (tell your students yourself — it is never sent to them)</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '8px', color: '#111827' }}>{done.password}</div>
            </div>
            {practice && (
              <p style={{ fontSize: '0.85rem', color: '#166534', background: '#dcfce7', borderRadius: '8px', padding: '8px 10px' }}>
                🏃 Practice test — marks will NOT be written to the mark list.
              </p>
            )}
            <button onClick={onClose} style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 18px', cursor: 'pointer', fontWeight: 700 }}>Done</button>
          </>
        ) : unpublished ? (
          <>
            <h3 style={{ marginTop: 0 }}>🗑 Unpublished</h3>
            <p style={{ fontSize: '0.9rem', color: '#374151' }}>
              {String(test.componentName || '').replace(/_/g, ' ').toUpperCase()} is no longer visible to students.
            </p>
            <button onClick={onClose} style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 18px', cursor: 'pointer', fontWeight: 700 }}>Done</button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>📤 Publish — {String(test.componentName || '').replace(/_/g, ' ').toUpperCase()}</h3>
              <button onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1rem' }}><FiX /></button>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '6px 0 12px' }}>
              {test.subject} · {String(test.className || '').toUpperCase()} · Term {test.termNumber}
              {test.questionCount ? ` · ${test.questionCount} questions` : ''}
            </p>

            <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Test password (5 digits)</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 5))}
                maxLength={5}
                style={{ width: '140px', fontSize: '1.3rem', letterSpacing: '6px', textAlign: 'center', padding: '8px', border: '1px solid #d1d5db', borderRadius: '8px' }}
              />
              <button
                type="button"
                onClick={() => setPassword(randPassword())}
                style={{ border: '1px solid #d1d5db', background: '#fff', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer' }}
              >
                ↻ New
              </button>
            </div>

            <label style={{ display: 'flex', gap: '9px', alignItems: 'flex-start', fontSize: '0.88rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={practice}
                onChange={(e) => setPractice(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#7c3aed', marginTop: '1px' }}
              />
              <span>
                <b>Practice test</b><br />
                <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>Student marks are NOT saved to the mark list.</span>
              </span>
            </label>

            <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Who can take this test?</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.9rem' }}>
                <input type="radio" checked={mode === 'all'} onChange={() => setMode('all')} />
                All students of {String(test.className || '').toUpperCase()}
              </label>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.9rem' }}>
                <input type="radio" checked={mode === 'select'} onChange={() => setMode('select')} />
                Only the students I select
              </label>
            </div>

            {mode === 'select' && (
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '10px', background: '#f9fafb' }}>
                {rosterLoading ? (
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Loading students…</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name or username…"
                        style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                      />
                      <button
                        type="button"
                        onClick={toggleAll}
                        style={{ border: '1px solid #d1d5db', background: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        {Object.keys(selected).length === filtered.length && filtered.length > 0 ? 'Clear all' : 'Select all'}
                      </button>
                    </div>
                    <div style={{ maxHeight: '240px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {filtered.length === 0 && <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>No students found.</div>}
                      {filtered.map((s) => (
                        <label
                          key={s.username || s.id}
                          style={{ display: 'flex', gap: '8px', alignItems: 'center', background: selected[s.username] ? '#ede9fe' : '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '7px 9px', fontSize: '0.87rem', cursor: 'pointer' }}
                        >
                          <input type="checkbox" checked={!!selected[s.username]} onChange={() => toggleStudent(s)} />
                          <span style={{ flex: 1, fontWeight: 600 }}>{s.student_name}</span>
                          <span style={{ color: '#6b7280', fontSize: '0.78rem' }}>{s.username}</span>
                        </label>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '6px' }}>
                      {Object.keys(selected).length} of {filtered.length} selected
                    </div>
                  </>
                )}
              </div>
            )}

            {error && (
              <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 10px', fontSize: '0.85rem', margin: '10px 0' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
              <button
                onClick={doPublish}
                disabled={busy}
                style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 18px', cursor: busy ? 'wait' : 'pointer', fontWeight: 700 }}
              >
                {busy ? 'Working…' : test.published ? '📤 Re-publish to students' : '📤 Publish to students'}
              </button>
              <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '10px', padding: '11px 16px', cursor: 'pointer' }}>Cancel</button>
              {test.published && (
                <button
                  onClick={doUnpublish}
                  disabled={busy}
                  style={{ marginLeft: 'auto', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '10px', padding: '11px 16px', cursor: busy ? 'wait' : 'pointer', fontWeight: 700 }}
                >
                  🗑 Unpublish
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PublishModal;
