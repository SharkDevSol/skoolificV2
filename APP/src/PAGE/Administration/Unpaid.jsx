import { useEffect, useState } from 'react';
import axios from 'axios';

const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, marginBottom: 16 };
const btn = { background: '#7c3aed', color: '#fff', border: 0, borderRadius: 10, padding: '9px 16px', fontWeight: 700, cursor: 'pointer' };
const input = { width: '100%', padding: '9px 10px', border: '1px solid #d1d5db', borderRadius: 9, fontSize: 14 };

const Unpaid = () => {
  const [tab, setTab] = useState('settings');
  const [settings, setSettings] = useState({ enabled: false, months_threshold: 2 });
  const [reasons, setReasons] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ className: '', picked: {}, reason: '', timer: false, hours: 4, until: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const loadSettings = async () => {
    try { const r = await axios.get('/api/admin-unpaid/settings'); if (r.data?.data) setSettings(r.data.data); } catch (e) { /* ignore */ }
  };
  const loadReasons = async (status) => {
    try {
      const r = await axios.get('/api/admin-unpaid/reasons', { params: status ? { status } : {} });
      setReasons(r.data?.data || []);
    } catch (e) { setReasons([]); }
  };
  const loadClasses = async () => {
    try {
      const r = await axios.get('/api/ai/list-classes');
      const list = r.data?.data || r.data?.classes || r.data || [];
      setClasses((Array.isArray(list) ? list : []).map(c => (typeof c === 'string' ? c : c.className || c.class_name || c.name)).filter(Boolean));
    } catch (e) { setClasses([]); }
  };

  useEffect(() => { loadSettings(); loadReasons(); loadClasses(); }, []);

  const loadStudents = async (className) => {
    setForm(f => ({ ...f, className, picked: {} }));
    try {
      const r = await axios.get('/api/ai/class-students-full', { params: { className } });
      const list = r.data?.data || r.data?.students || r.data || [];
      setStudents((Array.isArray(list) ? list : []).map(s => ({
        name: s.student_name || s.studentName || s.name,
        schoolId: s.school_id || s.schoolId || s.id,
      })).filter(s => s.name));
    } catch (e) { setStudents([]); }
  };

  const saveSettings = async () => {
    setBusy(true); setMsg('');
    try {
      await axios.put('/api/admin-unpaid/settings', {
        enabled: !!settings.enabled,
        monthsThreshold: parseInt(settings.months_threshold, 10) || 2,
      });
      setMsg('Settings saved.');
      loadSettings();
    } catch (e) { setMsg(e.response?.data?.error || 'Could not save settings'); }
    setBusy(false);
  };

  const addReason = async () => {
    const picked = Object.values(form.picked);
    if (!form.className) { setMsg('Select a class'); return; }
    if (!picked.length) { setMsg('Select at least one student'); return; }
    if (!form.reason.trim()) { setMsg('Write the reason'); return; }
    const expiresAt = form.timer
      ? (form.until ? new Date(form.until).toISOString() : new Date(Date.now() + (parseInt(form.hours, 10) || 4) * 3600 * 1000).toISOString())
      : null;
    setBusy(true); setMsg('');
    try {
      const r = await axios.post('/api/admin-unpaid/reasons', {
        students: picked.map(s => ({ studentName: s.name, schoolId: s.schoolId, className: form.className })),
        reason: form.reason.trim(),
        expiresAt,
      });
      setMsg(`Reason added for ${r.data?.added ?? picked.length} student(s).`);
      setForm({ className: '', picked: {}, reason: '', timer: false, hours: 4, until: '' });
      setStudents([]);
      loadReasons();
      setTab('reasons');
    } catch (e) { setMsg(e.response?.data?.error || 'Could not add the reason'); }
    setBusy(false);
  };

  const removeReason = async (id) => {
    if (!window.confirm('Delete this reason? The student will be hidden again if still unpaid.')) return;
    try { await axios.delete(`/api/admin-unpaid/reasons/${id}`); loadReasons(); } catch (e) { setMsg('Could not delete'); }
  };

  const tabBtn = (key, label) => (
    <button onClick={() => { setTab(key); loadReasons(key === 'history' ? 'history' : undefined); }}
      style={{ ...btn, background: tab === key ? '#7c3aed' : '#f3f4f6', color: tab === key ? '#fff' : '#374151', marginRight: 8 }}>
      {label}
    </button>
  );

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 4 }}>Unpaid</h1>
      <p style={{ color: '#6b7280', marginTop: 0 }}>
        Hide students with unpaid unlocked months from the mark list and attendance, and block their student account.
        Free students are never counted. A reason keeps the student visible.
      </p>
      <div style={{ margin: '14px 0' }}>{tabBtn('settings', 'Settings')}{tabBtn('reasons', 'Reasons')}{tabBtn('history', 'History')}</div>
      {msg && <div style={{ ...card, padding: 12, color: '#065f46', background: '#ecfdf5', borderColor: '#a7f3d0' }}>{msg}</div>}

      {tab === 'settings' && (
        <div style={card}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
            <input type="checkbox" checked={!!settings.enabled}
              onChange={e => setSettings(s => ({ ...s, enabled: e.target.checked }))} />
            Hide unpaid students from mark list and attendance
          </label>
          <div style={{ marginTop: 16, maxWidth: 320 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Unpaid unlocked months</div>
            <input type="number" min="1" max="12" style={input} value={settings.months_threshold ?? 2}
              onChange={e => setSettings(s => ({ ...s, months_threshold: e.target.value }))} />
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
              A student with this many unpaid unlocked months (or more) is hidden.
            </div>
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: '#6b7280' }}>
            {settings.updated_by ? `Last changed by ${settings.updated_by} · ${new Date(settings.updated_at).toLocaleString()}` : ''}
          </div>
          <button style={{ ...btn, marginTop: 14 }} disabled={busy} onClick={saveSettings}>Save</button>
        </div>
      )}

      {tab !== 'settings' && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{tab === 'history' ? 'History' : 'Active reasons'}</h3>
            {tab === 'reasons' && <button style={btn} onClick={() => setTab('add')}>+ Reason</button>}
          </div>
          {reasons.length === 0 && <div style={{ color: '#6b7280' }}>No entries.</div>}
          {reasons.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ textAlign: 'left', color: '#6b7280' }}>
                <th style={{ padding: 8 }}>Class</th><th style={{ padding: 8 }}>Student</th>
                <th style={{ padding: 8 }}>Reason</th><th style={{ padding: 8 }}>Added by</th>
                <th style={{ padding: 8 }}>Expires</th><th style={{ padding: 8 }}>Status</th><th />
              </tr></thead>
              <tbody>
                {reasons.map(r => (
                  <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 8 }}>{r.class_name}</td>
                    <td style={{ padding: 8, fontWeight: 600 }}>{r.student_name}</td>
                    <td style={{ padding: 8 }}>{r.reason}</td>
                    <td style={{ padding: 8 }}>{r.created_by || '—'}</td>
                    <td style={{ padding: 8 }}>{r.expires_at ? new Date(r.expires_at).toLocaleString() : 'never'}</td>
                    <td style={{ padding: 8 }}>{r.status}</td>
                    <td style={{ padding: 8 }}>{r.status === 'active' && <button onClick={() => removeReason(r.id)} style={{ ...btn, background: '#fee2e2', color: '#b91c1c', padding: '5px 10px' }}>Delete</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'add' && (
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Add reason</h3>
          <label style={{ fontWeight: 700, fontSize: 13 }}>Class</label>
          <select style={input} value={form.className} onChange={e => loadStudents(e.target.value)}>
            <option value="">Select class</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {students.length > 0 && (
            <div style={{ marginTop: 14, maxHeight: 220, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 10, padding: 8 }}>
              {students.map((s, i) => (
                <label key={`${s.name}-${i}`} style={{ display: 'flex', gap: 8, padding: '5px 4px', fontSize: 13 }}>
                  <input type="checkbox" checked={!!form.picked[i]}
                    onChange={e => setForm(f => {
                      const p = { ...f.picked };
                      if (e.target.checked) p[i] = s; else delete p[i];
                      return { ...f, picked: p };
                    })} />
                  {s.name}
                </label>
              ))}
            </div>
          )}

          <label style={{ display: 'block', fontWeight: 700, fontSize: 13, marginTop: 14 }}>Reason</label>
          <textarea style={{ ...input, minHeight: 70 }} value={form.reason}
            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontWeight: 700, fontSize: 13 }}>
            <input type="checkbox" checked={form.timer} onChange={e => setForm(f => ({ ...f, timer: e.target.checked }))} />
            Timer (leave unchecked = forever)
          </label>
          {form.timer && (
            <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              <input type="number" min="1" style={{ ...input, width: 120 }} value={form.hours}
                onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} placeholder="hours" />
              <input type="datetime-local" style={{ ...input, width: 240 }} value={form.until}
                onChange={e => setForm(f => ({ ...f, until: e.target.value }))} />
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <button style={btn} disabled={busy} onClick={addReason}>Done</button>
            <button style={{ ...btn, background: '#f3f4f6', color: '#374151', marginLeft: 8 }} onClick={() => setTab('reasons')}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Unpaid;
