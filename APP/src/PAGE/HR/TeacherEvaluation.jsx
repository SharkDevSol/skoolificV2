import { useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';

const DEFAULT_BANDS = [
  { label: 'Excellent', min: 90, max: 100 },
  { label: 'Very Good', min: 85, max: 89 },
  { label: 'Good', min: 70, max: 84 },
  { label: 'Needs Improvement', min: 60, max: 69 },
  { label: 'Unsatisfactory', min: 0, max: 59 },
];

const TQ_INDICATORS = [
  'Lesson plan is prepared and followed.',
  'Lesson objectives are clearly communicated to students.',
  'Teacher demonstrates strong subject knowledge and answers questions accurately.',
  'Teaching methods are appropriate, engaging, and suitable for the lesson.',
  'Students actively participate in classroom activities and discussions.',
  "Teacher asks effective questions that assess students' understanding.",
  'Teacher encourages critical thinking, creativity, and problem-solving.',
  'Teaching aids and technology are used effectively to support learning.',
  'Classroom is well managed, organized, and conducive to learning.',
  'Teacher manages lesson time effectively and completes planned activities.',
  'All students are included, encouraged, and supported during the lesson.',
  'Assessment is conducted throughout the lesson by the teacher.',
  'Teacher provides constructive feedback to improve student performance.',
  'Teacher maintains positive, respectful, and professional relationships with students.',
  'Lesson objectives are successfully achieved by the end of the lesson.',
  'The lesson aligns with the curriculum and annual teaching plan.',
  "Teacher checks students' prior knowledge before introducing new content.",
  'Instructions for learning activities are clear and easy to follow.',
  'Teacher promotes collaborative learning through pair or group work.',
  'Teacher summarizes the lesson and assigns appropriate follow-up or homework when necessary.',
];

const card = { background: 'var(--bg-secondary, #fff)', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 14, padding: 18, marginBottom: 16 };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '9px 10px', border: '1px solid var(--border-color, #d1d5db)', borderRadius: 9, fontSize: 14, fontFamily: 'inherit', background: 'var(--bg-color, #fff)', color: 'var(--text-color, #111827)' };
const btn = { background: '#6366f1', color: '#fff', border: 0, borderRadius: 10, padding: '9px 16px', fontWeight: 700, cursor: 'pointer' };
const btnGhost = { ...btn, background: 'transparent', color: '#4f46e5', border: '1px solid #c7d2fe' };
const btnDanger = { ...btn, background: '#fee2e2', color: '#b91c1c' };

const today = () => new Date().toISOString().slice(0, 10);
const emptyData = {};

function labelForPercentage(pct, bands) {
  const value = Number(pct);
  if (!Number.isFinite(value)) return '';
  const sorted = [...(bands || DEFAULT_BANDS)].sort((a, b) => Number(a.min) - Number(b.min));
  for (const band of sorted) {
    if (value >= Number(band.min) && value <= Number(band.max)) return band.label;
  }
  const reached = sorted.filter((b) => value >= Number(b.min));
  return reached.length ? reached[reached.length - 1].label : '';
}

function indicatorsOf(form) {
  const fields = Array.isArray(form?.fields) ? form.fields : [];
  return form?.form_type === 'teaching_quality' ? fields : fields.filter((f) => f?.type === 'indicator');
}

function scoreOf(form, data) {
  const fields = indicatorsOf(form);
  if (!fields.length) return { total: 0, max: 0, percentage: 0 };
  let total = 0;
  let max = 0;
  fields.forEach((f, i) => {
    const key = f.name || f.label || `indicator_${i + 1}`;
    const rm = Number(f.rating_max || form.rating_max || 5);
    const raw = Number(data[key]);
    total += Math.max(0, Math.min(Number.isFinite(raw) ? raw : 0, rm));
    max += rm;
  });
  return { total, max, percentage: max > 0 ? (total / max) * 100 : 0 };
}

const FieldLabel = ({ children }) => <span style={labelStyle}>{children}</span>;

const Tabs = ({ tab, setTab }) => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
    {[['evaluate', 'Evaluate'], ['forms', 'Forms'], ['history', 'History'], ['settings', 'Grade Settings']].map(([key, label]) => (
      <button
        key={key}
        type="button"
        onClick={() => setTab(key)}
        style={{ ...btn, background: tab === key ? '#6366f1' : 'transparent', color: tab === key ? '#fff' : '#4b5563', border: tab === key ? '1px solid #6366f1' : '1px solid #d1d5db' }}
      >
        {label}
      </button>
    ))}
  </div>
);

const TeacherEvaluation = () => {
  const [tab, setTab] = useState('evaluate');
  const [forms, setForms] = useState([]);
  const [teacherOptions, setTeacherOptions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [bands, setBands] = useState(DEFAULT_BANDS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const [selectedFormId, setSelectedFormId] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [subjectClass, setSubjectClass] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [data, setData] = useState(emptyData);

  const [editingForm, setEditingForm] = useState(null);
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('');

  const loadAll = async () => {
    setLoading(true);
    setMsg('');
    try {
      const [formsRes, optionsRes, settingsRes, subsRes] = await Promise.all([
        api.get('/teacher-evaluations/forms'),
        api.get('/teacher-evaluations/teacher-options'),
        api.get('/teacher-evaluations/settings'),
        api.get('/teacher-evaluations/submissions'),
      ]);
      const list = formsRes.data?.data || [];
      setForms(list);
      setTeacherOptions(optionsRes.data?.data || []);
      setBands(settingsRes.data?.data?.grade_bands || DEFAULT_BANDS);
      setSubmissions(subsRes.data?.data || []);
      const firstTq = list.find((f) => f.form_type === 'teaching_quality') || list[0];
      setSelectedFormId((prev) => prev || (firstTq ? String(firstTq.id) : ''));
    } catch (e) {
      setMsg(e.response?.data?.error || 'Could not load teacher evaluation data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const selectedForm = useMemo(
    () => forms.find((f) => String(f.id) === String(selectedFormId)) || null,
    [forms, selectedFormId]
  );

  const currentTeacher = useMemo(
    () => teacherOptions.find((t) => t.teacherName === teacherName) || null,
    [teacherOptions, teacherName]
  );

  const indicators = useMemo(() => indicatorsOf(selectedForm), [selectedForm]);
  const liveScore = useMemo(() => scoreOf(selectedForm, data), [selectedForm, data]);
  const liveLabel = labelForPercentage(liveScore.percentage, bands);

  const resetEvaluation = () => {
    setData({});
    setNote('');
    setDate(today());
  };

  const onFormChange = (value) => {
    setSelectedFormId(value);
    resetEvaluation();
  };

  const onTeacherChange = (value) => {
    setTeacherName(value);
    const t = teacherOptions.find((x) => x.teacherName === value);
    setSubjectClass(t?.subjects?.[0]?.subjectClass || '');
  };

  const setFieldValue = (key, value) => setData((prev) => ({ ...prev, [key]: value }));

  const saveEvaluation = async () => {
    if (!selectedForm) return setMsg('Select a form.');
    if (!teacherName) return setMsg('Select a teacher.');
    if (selectedForm.form_type === 'teaching_quality' && !subjectClass) return setMsg('Select the subject/class.');
    setBusy(true);
    setMsg('');
    try {
      const chosen = currentTeacher?.subjects?.find((s) => s.subjectClass === subjectClass);
      const res = await api.post('/teacher-evaluations/submissions', {
        formId: selectedForm.id,
        teacherId: teacherName,
        teacherName,
        subject: chosen?.subject || '',
        subjectClass,
        date,
        note: note.trim(),
        data,
      });
      setMsg(`Saved. Score: ${res.data?.data?.total_score ?? liveScore.total}/${res.data?.data?.max_score ?? liveScore.max} (${res.data?.data?.rating_label || liveLabel}).`);
      resetEvaluation();
      await loadAll();
      setTab('history');
    } catch (e) {
      setMsg(e.response?.data?.error || 'Could not save the evaluation.');
    } finally {
      setBusy(false);
    }
  };

  const startEditForm = (form) => {
    const fields = Array.isArray(form.fields) ? form.fields : [];
    setEditingForm({
      id: form.id,
      name: form.name,
      formType: form.form_type || 'custom',
      ratingMax: form.rating_max || 5,
      fields: fields.map((f, i) => ({ ...f, name: f.name || `indicator_${i + 1}`, label: f.label || '' })),
    });
  };

  const startNewTeachingForm = () => {
    setEditingForm({
      id: null,
      name: 'Teaching Quality Monitoring',
      formType: 'teaching_quality',
      ratingMax: 5,
      fields: TQ_INDICATORS.map((label, i) => ({
        no: i + 1,
        name: `indicator_${i + 1}`,
        label,
        type: 'indicator',
        rating_max: 5,
        comment: true,
      })),
    });
  };

  const updateField = (index, patch) => {
    setEditingForm((prev) => {
      if (!prev) return prev;
      const fields = prev.fields.map((f, i) => (i === index ? { ...f, ...patch } : f));
      return { ...prev, fields };
    });
  };

  const removeField = (index) => {
    setEditingForm((prev) => {
      if (!prev) return prev;
      return { ...prev, fields: prev.fields.filter((_, i) => i !== index) };
    });
  };

  const addField = () => {
    setEditingForm((prev) => {
      if (!prev) return prev;
      const nextNo = prev.fields.length + 1;
      return {
        ...prev,
        fields: [
          ...prev.fields,
          {
            no: nextNo,
            name: `indicator_${Date.now()}`,
            label: 'New indicator',
            type: 'indicator',
            rating_max: prev.ratingMax || 5,
            comment: true,
          },
        ],
      };
    });
  };

  const resetIndicators = () => {
    setEditingForm((prev) => prev && {
      ...prev,
      fields: TQ_INDICATORS.map((label, i) => ({
        no: i + 1,
        name: `indicator_${i + 1}`,
        label,
        type: 'indicator',
        rating_max: prev.ratingMax || 5,
        comment: true,
      })),
    });
  };

  const saveForm = async () => {
    if (!editingForm) return;
    if (!editingForm.name.trim()) return setMsg('Write the form name.');
    if (!editingForm.fields.length) return setMsg('Add at least one indicator.');
    setBusy(true);
    setMsg('');
    try {
      const payload = {
        name: editingForm.name.trim(),
        fields: editingForm.fields.map((f, i) => ({
          ...f,
          no: i + 1,
          label: String(f.label || '').trim(),
          type: editingForm.formType === 'teaching_quality' ? 'indicator' : (f.type || 'text'),
          rating_max: Number(f.rating_max || editingForm.ratingMax || 5),
          comment: editingForm.formType === 'teaching_quality' ? true : f.comment,
        })),
        formType: editingForm.formType,
        ratingMax: Number(editingForm.ratingMax) || 5,
        settings: { comments: true },
      };
      if (editingForm.id) await api.put(`/teacher-evaluations/forms/${editingForm.id}`, payload);
      else await api.post('/teacher-evaluations/forms', payload);
      setEditingForm(null);
      await loadAll();
      setMsg('Form saved.');
    } catch (e) {
      setMsg(e.response?.data?.error || 'Could not save the form.');
    } finally {
      setBusy(false);
    }
  };

  const deleteForm = async (form) => {
    if (!window.confirm(`Delete form "${form.name}"? Its saved evaluations will also be removed.`)) return;
    try {
      await api.delete(`/teacher-evaluations/forms/${form.id}`);
      await loadAll();
      setMsg('Form deleted.');
    } catch (e) {
      setMsg(e.response?.data?.error || 'Could not delete the form.');
    }
  };

  const saveBands = async () => {
    for (const b of bands) {
      if (!String(b.label || '').trim()) return setMsg('Every band needs a label.');
      const min = Number(b.min); const max = Number(b.max);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max > 100 || min > max) {
        return setMsg('Grade bands must be between 0 and 100 with min <= max.');
      }
    }
    setBusy(true); setMsg('');
    try {
      const res = await api.put('/teacher-evaluations/settings', { gradeBands: bands });
      setBands(res.data?.data?.grade_bands || bands);
      setMsg('Grade settings saved.');
    } catch (e) {
      setMsg(e.response?.data?.error || 'Could not save grade settings.');
    } finally { setBusy(false); }
  };

  const renderRating = (field, index) => {
    const key = field.name || `indicator_${index + 1}`;
    const max = Number(field.rating_max || selectedForm?.rating_max || 5);
    const value = Number(data[key] || 0);
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setFieldValue(key, n)}
            style={{
              width: 36, height: 34, borderRadius: 8, cursor: 'pointer', fontWeight: 700,
              border: value === n ? '2px solid #6366f1' : '1px solid #d1d5db',
              background: value === n ? '#eef2ff' : 'transparent',
              color: value >= n ? '#4338ca' : '#6b7280',
            }}
          >
            {n}
          </button>
        ))}
        <span style={{ alignSelf: 'center', fontSize: 12, color: '#6b7280' }}>{field.rating_scale === 'letter' ? '' : `/ ${max}`}</span>
      </div>
    );
  };

  const renderGenericField = (field, index) => {
    const key = field.name || `field_${index + 1}`;
    const value = data[key] ?? '';
    const type = field.type || 'text';
    if (type === 'indicator' || type === 'rating') {
      return (
        <div key={key} style={{ ...card, padding: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{index + 1}. {field.label}</div>
          {renderRating(field, index)}
          {(field.comment !== false) && (
            <input
              style={{ ...inputStyle, marginTop: 8 }}
              placeholder="Comment (optional)"
              value={data[`${key}__comment`] || ''}
              onChange={(e) => setFieldValue(`${key}__comment`, e.target.value)}
            />
          )}
        </div>
      );
    }
    if (type === 'textarea') {
      return (
        <div key={key} style={{ marginBottom: 12 }}>
          <FieldLabel>{field.label}</FieldLabel>
          <textarea style={{ ...inputStyle, minHeight: 70 }} value={value} onChange={(e) => setFieldValue(key, e.target.value)} />
        </div>
      );
    }
    if (type === 'checkbox') {
      return (
        <label key={key} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <input type="checkbox" checked={value === true} onChange={(e) => setFieldValue(key, e.target.checked)} />
          {field.label}
        </label>
      );
    }
    if (type === 'dropdown') {
      return (
        <div key={key} style={{ marginBottom: 12 }}>
          <FieldLabel>{field.label}</FieldLabel>
          <select style={inputStyle} value={value} onChange={(e) => setFieldValue(key, e.target.value)}>
            <option value="">Select...</option>
            {(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );
    }
    if (type === 'multi_select') {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div key={key} style={{ marginBottom: 12 }}>
          <FieldLabel>{field.label}</FieldLabel>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(field.options || []).map((o) => (
              <label key={o} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={selected.includes(o)}
                  onChange={(e) => {
                    const next = e.target.checked ? [...selected, o] : selected.filter((x) => x !== o);
                    setFieldValue(key, next);
                  }}
                />
                {o}
              </label>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div key={key} style={{ marginBottom: 12 }}>
        <FieldLabel>{field.label}</FieldLabel>
        <input
          type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
          style={inputStyle}
          value={value}
          onChange={(e) => setFieldValue(key, e.target.value)}
        />
      </div>
    );
  };

  const formFields = Array.isArray(selectedForm?.fields) ? selectedForm.fields : [];
  const isIndicatorForm = indicators.length > 0;

  const filteredSubmissions = submissions.filter((s) => {
    if (!historyFilter) return true;
    const needle = historyFilter.toLowerCase();
    return [s.teacher_name, s.subject, s.subject_class, s.form_name, s.rating_label].some((v) => String(v || '').toLowerCase().includes(needle));
  });

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 4 }}>Teacher Evaluation</h1>
      <p style={{ color: '#6b7280', marginTop: 0 }}>
        Teaching Quality Monitoring and evaluation forms. Evaluations saved here are shared with the admin app.
      </p>
      <Tabs tab={tab} setTab={setTab} />
      {msg && <div style={{ ...card, padding: 12, background: '#eef2ff', borderColor: '#c7d2fe', color: '#3730a3' }}>{msg}</div>}

      {loading ? <p>Loading...</p> : (
        <>
          {tab === 'evaluate' && (
            <div style={card}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <label>
                  <FieldLabel>Form</FieldLabel>
                  <select style={inputStyle} value={selectedFormId} onChange={(e) => onFormChange(e.target.value)}>
                    {forms.map((f) => <option key={f.id} value={f.id}>{f.name}{f.form_type === 'teaching_quality' ? ' (Teaching Quality)' : ''}</option>)}
                  </select>
                </label>
                <label>
                  <FieldLabel>Teacher</FieldLabel>
                  <select style={inputStyle} value={teacherName} onChange={(e) => onTeacherChange(e.target.value)}>
                    <option value="">Select teacher...</option>
                    {teacherOptions.map((t) => <option key={t.teacherName} value={t.teacherName}>{t.teacherName}</option>)}
                  </select>
                </label>
                <label>
                  <FieldLabel>Subject / Class (from Create Mark List)</FieldLabel>
                  <select style={inputStyle} value={subjectClass} onChange={(e) => setSubjectClass(e.target.value)} disabled={!currentTeacher}>
                    <option value="">Select subject...</option>
                    {(currentTeacher?.subjects || []).map((s) => <option key={s.subjectClass} value={s.subjectClass}>{s.subject} — {s.className || s.subjectClass}</option>)}
                  </select>
                </label>
                <label>
                  <FieldLabel>Date</FieldLabel>
                  <input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
                </label>
              </div>

              <div style={{ margin: '16px 0', fontSize: 12, color: '#6b7280' }}>
                Rating scale: <strong>5 Excellent · 4 Very Good · 3 Good · 2 Needs Improvement · 1 Unsatisfactory.</strong> A comment can be added under each indicator.
              </div>

              {isIndicatorForm && (
                <div style={{ ...card, background: '#f8fafc', marginBottom: 12, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                  <span><strong>Score:</strong> {liveScore.total.toFixed(0)} / {liveScore.max}</span>
                  <span><strong>Percent:</strong> {liveScore.percentage.toFixed(1)}%</span>
                  <span><strong>Rating:</strong> {liveLabel || '-'}</span>
                </div>
              )}

              <div>
                {formFields.map((f, i) => renderGenericField(f, i))}
              </div>

              <label style={{ display: 'block', marginTop: 8 }}>
                <FieldLabel>General note (optional)</FieldLabel>
                <textarea style={{ ...inputStyle, minHeight: 70 }} value={note} onChange={(e) => setNote(e.target.value)} />
              </label>

              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <button type="button" style={btn} disabled={busy} onClick={saveEvaluation}>Save Evaluation</button>
                <button type="button" style={btnGhost} disabled={busy} onClick={resetEvaluation}>Clear</button>
              </div>
            </div>
          )}

          {tab === 'forms' && (
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                <button type="button" style={btn} onClick={startNewTeachingForm}>+ Teaching Quality Form</button>
                <button type="button" style={btnGhost} onClick={loadAll}>Refresh</button>
              </div>
              {forms.map((f) => (
                <div key={f.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{f.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {f.form_type === 'teaching_quality' ? 'Teaching Quality' : 'Custom form'} · {Array.isArray(f.fields) ? f.fields.length : 0} items · rating 1–{f.rating_max || 5}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" style={btnGhost} onClick={() => { setSelectedFormId(String(f.id)); setTab('evaluate'); }}>Use</button>
                    <button type="button" style={btnGhost} onClick={() => startEditForm(f)}>Edit</button>
                    <button type="button" style={btnDanger} onClick={() => deleteForm(f)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'history' && (
            <div style={card}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                <input style={{ ...inputStyle, maxWidth: 320 }} placeholder="Search teacher, subject, rating..." value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)} />
                <button type="button" style={btnGhost} onClick={loadAll}>Refresh</button>
              </div>
              {filteredSubmissions.length === 0 ? <p style={{ color: '#6b7280' }}>No evaluations saved yet.</p> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: '#6b7280' }}>
                        <th style={{ padding: 8 }}>Date</th>
                        <th style={{ padding: 8 }}>Teacher</th>
                        <th style={{ padding: 8 }}>Subject</th>
                        <th style={{ padding: 8 }}>Form</th>
                        <th style={{ padding: 8 }}>Score</th>
                        <th style={{ padding: 8 }}>%</th>
                        <th style={{ padding: 8 }}>Rating</th>
                        <th style={{ padding: 8 }}>By</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubmissions.map((s) => (
                        <tr key={s.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: 8 }}>{s.evaluation_date || '-'}</td>
                          <td style={{ padding: 8, fontWeight: 600 }}>{s.teacher_name}</td>
                          <td style={{ padding: 8 }}>{s.subject_class || s.subject || '-'}</td>
                          <td style={{ padding: 8 }}>{s.form_name || '-'}</td>
                          <td style={{ padding: 8 }}>{s.total_score !== null && s.total_score !== undefined ? `${Number(s.total_score).toFixed(0)} / ${Number(s.max_score).toFixed(0)}` : '-'}</td>
                          <td style={{ padding: 8 }}>{s.percentage !== null && s.percentage !== undefined ? `${Number(s.percentage).toFixed(1)}%` : '-'}</td>
                          <td style={{ padding: 8 }}>{s.rating_label || '-'}</td>
                          <td style={{ padding: 8 }}>{s.created_by || '-'}</td>
                          <td style={{ padding: 8 }}><button type="button" style={btnGhost} onClick={() => setViewingSubmission(s)}>View</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'settings' && (
            <div style={card}>
              <h3 style={{ marginTop: 0 }}>Grade bands</h3>
              <p style={{ color: '#6b7280', fontSize: 13 }}>The score percentage is matched to these ranges. They apply to the web app and the admin app.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 620 }}>
                {bands.map((b, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 40px', gap: 8, alignItems: 'center' }}>
                    <input style={inputStyle} value={b.label} onChange={(e) => setBands((prev) => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
                    <input style={inputStyle} type="number" min="0" max="100" value={b.min} onChange={(e) => setBands((prev) => prev.map((x, j) => j === i ? { ...x, min: Number(e.target.value) } : x))} />
                    <input style={inputStyle} type="number" min="0" max="100" value={b.max} onChange={(e) => setBands((prev) => prev.map((x, j) => j === i ? { ...x, max: Number(e.target.value) } : x))} />
                    <button type="button" style={btnDanger} onClick={() => setBands((prev) => prev.filter((_, j) => j !== i))}>×</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button type="button" style={btnGhost} onClick={() => setBands((prev) => [...prev, { label: 'New band', min: 0, max: 0 }])}>+ Add band</button>
                <button type="button" style={btn} disabled={busy} onClick={saveBands}>Save Grade Settings</button>
                <button type="button" style={btnGhost} onClick={() => setBands(DEFAULT_BANDS.map((b) => ({ ...b })))}>Reset default</button>
              </div>
            </div>
          )}
        </>
      )}

      {editingForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ ...card, width: 'min(760px, 100%)', maxHeight: '90vh', overflowY: 'auto', margin: 0 }}>
            <h3 style={{ marginTop: 0 }}>{editingForm.id ? 'Edit form' : 'New form'}</h3>
            <label><FieldLabel>Form name</FieldLabel>
              <input style={inputStyle} value={editingForm.name} onChange={(e) => setEditingForm((p) => ({ ...p, name: e.target.value }))} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
              <label><FieldLabel>Form type</FieldLabel>
                <select style={inputStyle} value={editingForm.formType} onChange={(e) => setEditingForm((p) => ({ ...p, formType: e.target.value }))}>
                  <option value="teaching_quality">Teaching Quality (rating + comment)</option>
                  <option value="custom">Custom (appears from admin app)</option>
                </select>
              </label>
              <label><FieldLabel>Rating scale (1–N)</FieldLabel>
                <input style={inputStyle} type="number" min="1" max="20" value={editingForm.ratingMax} onChange={(e) => setEditingForm((p) => ({ ...p, ratingMax: Number(e.target.value) }))} />
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
              <strong>Indicators</strong>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" style={btnGhost} onClick={addField}>+ Add indicator</button>
                {editingForm.formType === 'teaching_quality' && (
                  <button type="button" style={btnGhost} onClick={resetIndicators}>Reset 20 standard</button>
                )}
              </div>
            </div>
            {editingForm.fields.map((f, i) => (
              <div key={f.name || i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ width: 26, textAlign: 'right', fontSize: 12, color: '#6b7280' }}>{i + 1}.</span>
                <input style={{ ...inputStyle, flex: 1 }} value={f.label || ''} onChange={(e) => updateField(i, { label: e.target.value })} />
                <input style={{ ...inputStyle, width: 70 }} type="number" min="1" max="20" value={f.rating_max || editingForm.ratingMax || 5} onChange={(e) => updateField(i, { rating_max: Number(e.target.value) })} title="Rating max for this indicator" />
                <button type="button" style={btnDanger} onClick={() => removeField(i)}>×</button>
              </div>
            ))}
            <p style={{ fontSize: 12, color: '#6b7280' }}>Each indicator is scored 1–rating max with an optional comment. Total = sum of ratings; percentage = total ÷ maximum × 100.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" style={btnGhost} onClick={() => setEditingForm(null)}>Cancel</button>
              <button type="button" style={btn} disabled={busy} onClick={saveForm}>Save form</button>
            </div>
          </div>
        </div>
      )}

      {viewingSubmission && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ ...card, width: 'min(700px, 100%)', maxHeight: '90vh', overflowY: 'auto', margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <h3 style={{ margin: 0 }}>{viewingSubmission.teacher_name}</h3>
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  {viewingSubmission.subject_class || viewingSubmission.subject || ''} · {viewingSubmission.evaluation_date || ''} · {viewingSubmission.form_name || ''}
                </div>
              </div>
              <button type="button" style={btnGhost} onClick={() => setViewingSubmission(null)}>Close</button>
            </div>
            <div style={{ margin: '12px 0', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span><strong>Score:</strong> {viewingSubmission.total_score !== null && viewingSubmission.total_score !== undefined ? `${Number(viewingSubmission.total_score).toFixed(0)} / ${Number(viewingSubmission.max_score).toFixed(0)}` : '-'}</span>
              <span><strong>Percent:</strong> {viewingSubmission.percentage !== null && viewingSubmission.percentage !== undefined ? `${Number(viewingSubmission.percentage).toFixed(1)}%` : '-'}</span>
              <span><strong>Rating:</strong> {viewingSubmission.rating_label || '-'}</span>
            </div>
            {(() => {
              const form = forms.find((f) => String(f.id) === String(viewingSubmission.form_id));
              const fields = Array.isArray(form?.fields) ? form.fields : [];
              const values = viewingSubmission.data || {};
              const rows = fields.length ? fields : Object.keys(values).filter((k) => !k.endsWith('__comment')).map((k) => ({ name: k, label: k }));
              return rows.map((f, i) => {
                const key = f.name || f.label || `row_${i}`;
                const value = values[key];
                const comment = values[`${key}__comment`];
                return (
                  <div key={key} style={{ borderTop: '1px solid #f1f5f9', padding: '8px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontWeight: 600 }}>{i + 1}. {f.label}</span>
                      <span style={{ fontWeight: 700 }}>{value !== undefined && value !== '' ? (value === true ? 'Yes' : value === false ? 'No' : Array.isArray(value) ? value.join(', ') : String(value)) : '-'}</span>
                    </div>
                    {comment && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Comment: {comment}</div>}
                  </div>
                );
              });
            })()}
            {viewingSubmission.note && <p style={{ fontSize: 13 }}><strong>Note:</strong> {viewingSubmission.note}</p>}
            <div style={{ fontSize: 12, color: '#6b7280' }}>Saved by {viewingSubmission.created_by || '-'} · {new Date(viewingSubmission.created_at).toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherEvaluation;
