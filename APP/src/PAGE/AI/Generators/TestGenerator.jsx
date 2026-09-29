import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiEdit3, FiLoader, FiSave, FiPlay, FiRefreshCw, FiUpload, FiList, FiCheck, FiTrash2, FiPlus, FiX, FiSend } from 'react-icons/fi';
import styles from './TestGenerator.module.css';
import PublishModal from './PublishModal';

const COMPONENTS = ['Monthly Exam', 'Mid-Term Exam', 'Final Exam', 'Quiz', 'Class Work', 'Homework', 'Test'];
const SUBJECTS = ['Mathematics', 'English', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Civics', 'ICT', 'Amharic', 'Arabic', 'Oromo', 'Business', 'Economics', 'General Science'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const QUESTION_TYPES = [
  { type: 'mcq', label: 'Multiple Choice' },
  { type: 'true_false', label: 'True/False' },
  { type: 'matching', label: 'Matching' },
  { type: 'fill_blank', label: 'Fill in the Blank' },
  { type: 'short_answer', label: 'Short Answer' },
];
const typeLabel = (t) => (QUESTION_TYPES.find(x => x.type === t) || { label: t }).label;

const emptyDraft = (type) => ({
  type: type || 'mcq',
  question: '',
  marks: 1,
  explanation: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  textAnswer: '',
  boolAnswer: true,
  pairs: [{ left: '', right: '' }],
});

const toDraft = (q) => {
  const type = q.type || 'mcq';
  let correctIndex = 0;
  if (type === 'mcq' && Array.isArray(q.options)) {
    const idx = q.options.findIndex(o => String(o).trim() === String(q.answer || '').trim());
    correctIndex = idx >= 0 ? idx : 0;
  }
  const pairs = Array.isArray(q.correctMatches) && q.correctMatches.length
    ? q.correctMatches.map(m => ({ left: String(m.left ?? ''), right: String(m.right ?? '') }))
    : (Array.isArray(q.leftColumn) ? q.leftColumn.map((l, i) => ({ left: String(l), right: String((q.rightColumn || [])[i] ?? '') })) : [{ left: '', right: '' }]);
  return {
    type,
    question: q.question || '',
    marks: q.marks || 1,
    explanation: q.explanation || '',
    options: type === 'mcq' ? [...(q.options || [])] : [],
    correctIndex,
    textAnswer: (type === 'fill_blank' || type === 'short_answer') ? String(q.answer || '') : '',
    boolAnswer: !String(q.answer || '').toLowerCase().startsWith('f'),
    pairs: pairs.length ? pairs : [{ left: '', right: '' }],
  };
};

const fromDraft = (d, base = {}) => {
  const q = { ...base, type: d.type, question: d.question.trim(), marks: Math.max(1, parseInt(d.marks) || 1), explanation: d.explanation.trim() };
  delete q.options; delete q.leftColumn; delete q.rightColumn; delete q.correctMatches;
  if (d.type === 'mcq') {
    q.options = d.options.map(o => o.trim()).filter(Boolean);
    q.answer = q.options[d.correctIndex] ?? '';
  } else if (d.type === 'true_false') {
    q.answer = d.boolAnswer ? 'True' : 'False';
  } else if (d.type === 'matching') {
    const pr = d.pairs.map(p => ({ left: p.left.trim(), right: p.right.trim() })).filter(p => p.left && p.right);
    q.leftColumn = pr.map(p => p.left);
    q.rightColumn = pr.map(p => p.right);
    q.correctMatches = pr;
    delete q.answer;
  } else {
    q.answer = d.textAnswer.trim();
  }
  return q;
};

const draftError = (d) => {
  if (d.question.trim().length < 5) return 'Question text is required (at least 5 characters)';
  if (d.type === 'mcq') {
    const opts = d.options.map(o => o.trim()).filter(Boolean);
    if (opts.length < 2) return 'MCQ needs at least 2 options';
    if (!opts[d.correctIndex]) return 'Select which option is the correct answer';
  }
  if (d.type === 'matching' && !d.pairs.filter(p => p.left.trim() && p.right.trim()).length) return 'Matching needs at least one pair';
  if ((d.type === 'fill_blank' || d.type === 'short_answer') && !d.textAnswer.trim()) return 'The answer is required';
  return '';
};

// Edit / add one question (works for every supported type)
const QuestionEditor = ({ initial, isNew, onSave, onCancel }) => {
  const [d, setD] = useState(() => (initial ? toDraft(initial) : emptyDraft('mcq')));
  const [err, setErr] = useState('');
  const set = (patch) => setD(prev => ({ ...prev, ...patch }));
  const setOption = (i, v) => setD(prev => { const o = [...prev.options]; o[i] = v; return { ...prev, options: o }; });
  const setPair = (i, k, v) => setD(prev => { const p = [...prev.pairs]; p[i] = { ...p[i], [k]: v }; return { ...prev, pairs: p }; });

  const submit = () => {
    const e = draftError(d);
    if (e) { setErr(e); return; }
    onSave(fromDraft(d, isNew ? {} : initial));
  };

  const inp = { width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', marginBottom: '6px', background: '#fff' };

  return (
    <div style={{ border: '1px solid #c4b5fd', background: '#faf9ff', borderRadius: '10px', padding: '14px', margin: '8px 0' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
        <strong>{isNew ? 'Add question' : 'Edit question'}</strong>
        <select value={d.type} onChange={e => set({ ...emptyDraft(e.target.value), question: d.question, marks: d.marks, explanation: d.explanation })} style={{ ...inp, width: 'auto', marginBottom: 0 }}>
          {QUESTION_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
        </select>
        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>type: {typeLabel(d.type)}</span>
      </div>

      <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Question *</label>
      <textarea style={{ ...inp, minHeight: '60px' }} value={d.question} onChange={e => set({ question: e.target.value })} placeholder="Write the question…" />

      <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Marks</label>
      <input type="number" min="1" style={{ ...inp, width: '110px' }} value={d.marks} onChange={e => set({ marks: e.target.value })} />

      {d.type === 'mcq' && (
        <div style={{ marginTop: '6px' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Options — click the radio of the CORRECT answer *</label>
          {d.options.map((o, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
              <input type="radio" name="draftCorrect" checked={d.correctIndex === i} onChange={() => set({ correctIndex: i })} title="Mark as correct" />
              <span style={{ fontWeight: 700, width: '18px' }}>{String.fromCharCode(65 + i)}</span>
              <input style={{ ...inp, marginBottom: 0 }} value={o} onChange={e => setOption(i, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
              <button type="button" onClick={() => setD(prev => ({ ...prev, options: prev.options.filter((_, j) => j !== i), correctIndex: prev.correctIndex > i ? prev.correctIndex - 1 : (prev.correctIndex === i ? 0 : prev.correctIndex) }))} style={{ border: 'none', background: '#fee2e2', color: '#dc2626', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer' }}><FiX /></button>
            </div>
          ))}
          <button type="button" onClick={() => set({ options: [...d.options, ''] })} style={{ border: '1px dashed #93c5fd', background: '#eff6ff', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontSize: '0.82rem' }}>+ Add option</button>
        </div>
      )}

      {d.type === 'true_false' && (
        <div style={{ marginTop: '6px' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Correct answer *</label>
          <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
            <label style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><input type="radio" checked={d.boolAnswer === true} onChange={() => set({ boolAnswer: true })} /> True</label>
            <label style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><input type="radio" checked={d.boolAnswer === false} onChange={() => set({ boolAnswer: false })} /> False</label>
          </div>
        </div>
      )}

      {(d.type === 'fill_blank' || d.type === 'short_answer') && (
        <div style={{ marginTop: '6px' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Correct answer *</label>
          <input style={inp} value={d.textAnswer} onChange={e => set({ textAnswer: e.target.value })} placeholder="The expected answer" />
        </div>
      )}

      {d.type === 'matching' && (
        <div style={{ marginTop: '6px' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Pairs — left item and its correct match *</label>
          {d.pairs.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
              <input style={{ ...inp, marginBottom: 0 }} value={p.left} onChange={e => setPair(i, 'left', e.target.value)} placeholder={`Left ${i + 1}`} />
              <span style={{ alignSelf: 'center' }}>→</span>
              <input style={{ ...inp, marginBottom: 0 }} value={p.right} onChange={e => setPair(i, 'right', e.target.value)} placeholder={`Right ${i + 1}`} />
              <button type="button" onClick={() => setD(prev => ({ ...prev, pairs: prev.pairs.filter((_, j) => j !== i) }))} style={{ border: 'none', background: '#fee2e2', color: '#dc2626', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer' }}><FiX /></button>
            </div>
          ))}
          <button type="button" onClick={() => set({ pairs: [...d.pairs, { left: '', right: '' }] })} style={{ border: '1px dashed #93c5fd', background: '#eff6ff', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontSize: '0.82rem' }}>+ Add pair</button>
        </div>
      )}

      <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginTop: '8px' }}>Explanation (optional)</label>
      <textarea style={{ ...inp, minHeight: '44px' }} value={d.explanation} onChange={e => set({ explanation: e.target.value })} placeholder="Why is this the correct answer?" />

      {err && <div style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '6px' }}>⚠️ {err}</div>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" onClick={submit} style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>{isNew ? 'Add question' : 'Save changes'}</button>
        <button type="button" onClick={onCancel} style={{ background: '#e5e7eb', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
};

const withStats = (questions) => {
  const stats = { total: questions.length };
  questions.forEach(q => { stats[q.type] = (stats[q.type] || 0) + 1; });
  return { stats, totalMarks: questions.reduce((s, q) => s + (parseInt(q.marks) || 0), 0) };
};

const TestGenerator = () => {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [markComponents, setMarkComponents] = useState({});
  const [selectedClasses, setSelectedClasses] = useState([]);   // multi-class generation
  const [markByClass, setMarkByClass] = useState({});            // { class: { component: marks } }
  const [componentByClass, setComponentByClass] = useState({});  // { class: component } when component sets differ
  const [componentMarkValue, setComponentMarkValue] = useState(null);
  const [bonusTypes, setBonusTypes] = useState([]);
  const [termOptions, setTermOptions] = useState([1, 2]);
  const [material, setMaterial] = useState(null); // uploaded source material (text) — separate from teacherNotes
  const [materialName, setMaterialName] = useState('');
  const [form, setForm] = useState({
    subjectName: '', className: '', termNumber: 1, componentName: '',
    difficulty: ['Medium'], language: 'English', topic: '', timeLimit: 40, teacherNotes: '', practice: false
  });
const [testPassword, setTestPassword] = useState(() => String(Math.floor(10000 + Math.random() * 90000)));
const newTestPassword = () => setTestPassword(String(Math.floor(10000 + Math.random() * 90000)));
const [publishTarget, setPublishTarget] = useState(null); // test row passed to the publish dialog
const [savedInfo, setSavedInfo] = useState(null); // { schemaName, tableName } from save-test
  const [questionTypes, setQuestionTypes] = useState(
    QUESTION_TYPES.map(qt => ({ ...qt, count: 0, marksPerQuestion: 1 }))
  );
  const [generated, setGenerated] = useState(null);
  const [mode, setMode] = useState('ai'); // 'ai' = AI writes the test, 'manual' = teacher writes every question
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dupCheck, setDupCheck] = useState(null); // { exists, exact, existing, suggestedCopy, mode }
  const [saveComponent, setSaveComponent] = useState(null); // copy name ("final A") when saving a duplicate
  const [dupChoice, setDupChoice] = useState(null); // 'copy' | 'overwrite' — remembered for this component
  const [editingIndex, setEditingIndex] = useState(-1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    axios.get('/api/ai/list-classes')
      .then(r => {
        if (r.data.success) {
          setClasses(r.data.data.classes || []);
          if (r.data.data.subjects?.length) setSubjects(r.data.data.subjects);
        }
      })
      .catch(e => console.error('Error fetching classes:', e));
    // Mark-list system: subjects + subject-class mappings
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
    // Term count from school config (Task 1 page storage)
    axios.get('/api/ai/school-config')
      .then(r => {
        const terms = r.data?.data?.number_of_terms || r.data?.number_of_terms || r.data?.data?.terms;
        const n = parseInt(terms);
        if (n >= 1) setTermOptions(Array.from({ length: n }, (_, i) => i + 1));
      })
      .catch(() => {});
  }, []);

  // Mark-list: components (with marks) for EVERY selected class (multi-class generation)
  useEffect(() => {
    const list = selectedClasses;
    if (!form.subjectName || list.length === 0 || !form.termNumber) {
      setMarkByClass({});
      setMarkComponents({});
      return;
    }
    let alive = true;
    Promise.all(list.map(c =>
      axios.get(`/api/mark-list/mark-list/${encodeURIComponent(form.subjectName)}/${encodeURIComponent(c)}/${form.termNumber}`)
        .then(r => {
          const config = r.data.config || r.data;
          const comps = config.mark_components || [];
          const map = {};
          comps.forEach(x => { if (x && x.name) map[x.name] = x.percentage; });
          return [c, map];
        })
        .catch(() => [c, null])
    )).then(pairs => {
      if (!alive) return;
      const by = {};
      pairs.forEach(([c, map]) => { if (map) by[c] = map; });
      setMarkByClass(by);
      setMarkComponents(by[list[0]] || {});
      setComponentByClass(prev => {
        const next = {};
        list.forEach(c => { next[c] = prev[c] || ''; });
        return next;
      });
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.subjectName, form.termNumber, selectedClasses.join(',')]);

  // Total marks auto-set from the selected component
  useEffect(() => {
    if (form.componentName && markComponents[form.componentName] != null) {
      setComponentMarkValue(markComponents[form.componentName]);
    } else {
      setComponentMarkValue(null);
    }
  }, [form.componentName, markComponents]);

  // Subjects available for the CURRENT class selection.
  // Several classes → only the subjects they all share.
  const subjectsFor = (list) => {
    if (!list || list.length === 0) return subjects;
    if (list.length === 1) {
      const fromMappings = mappings.filter(m => m.class_name === list[0]).map(m => m.subject_name);
      return [...new Set(fromMappings.length > 0 ? fromMappings : subjects)];
    }
    const perClass = list
      .map(c => [...new Set(mappings.filter(m => m.class_name === c).map(m => m.subject_name))])
      .filter(arr => arr.length > 0);
    if (perClass.length === 0) return subjects;
    const inter = perClass.reduce((acc, arr) => acc.filter(x => arr.includes(x)));
    return [...new Set(inter)];
  };

  const getAvailableSubjects = () => subjectsFor(selectedClasses);

  // Toggle a class in/out of the selection (multi-class generation)
  const toggleClass = (className) => {
    const next = selectedClasses.includes(className)
      ? selectedClasses.filter(c => c !== className)
      : [...selectedClasses, className];
    setSelectedClasses(next);
    const first = next[0] || '';
    const available = new Set(subjectsFor(next));
    setForm(f => ({
      ...f,
      className: first,
      subjectName: f.subjectName && (available.size === 0 || available.has(f.subjectName)) ? f.subjectName : '',
      componentName: '',
    }));
    if (next.length === 0) { setMarkComponents({}); setMarkByClass({}); }
    setComponentByClass({});
    setDupChoice(null);
    setSaveComponent(null);
  };

  // ── multi-class helpers ──────────────────────────────────────────
  // true when every selected class offers exactly the same components
  const componentSetsIdentical = () => {
    if (selectedClasses.length < 2) return true;
    const withData = selectedClasses.filter(c => markByClass[c]);
    if (withData.length === 0) return true; // mark lists not loaded yet
    if (withData.length !== selectedClasses.length) return false;
    const keys = withData.map(c => Object.keys(markByClass[c]).sort().join('|'));
    return keys.every(k => k === keys[0]);
  };

  // the component a given class will use
  const componentFor = (cls) => {
    if (selectedClasses.length > 1 && !componentSetsIdentical()) return componentByClass[cls] || '';
    return form.componentName || '';
  };

  // the marks of the component per class — must match across classes
  const markConflicts = () => {
    if (selectedClasses.length < 2) return null;
    const rows = selectedClasses.map(c => {
      const comp = componentFor(c);
      const marks = markByClass[c] && comp ? markByClass[c][comp] : null;
      return { cls: c, comp, marks };
    });
    const known = rows.filter(r => r.comp && r.marks != null);
    if (known.length < 2) return null;
    const vals = new Set(known.map(r => r.marks));
    return vals.size > 1 ? known : null;
  };

  const componentMarks = componentMarkValue || 0;
  const distTotal = questionTypes.reduce((s, q) => s + q.count * q.marksPerQuestion, 0);
  const bonusTotal = bonusTypes.reduce((s, b) => s + b.count * b.marksPerQuestion, 0);
  const effectiveTotal = distTotal > 0 ? distTotal : componentMarks;

  const setField = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setError('');
    if (['subjectName', 'className', 'termNumber', 'componentName'].includes(k)) {
      setDupChoice(null);
      setSaveComponent(null);
    }
  };

  const toggleDifficulty = (d) => {
    setForm(f => {
      const has = f.difficulty.includes(d);
      return { ...f, difficulty: has ? f.difficulty.filter(x => x !== d) : [...f.difficulty, d] };
    });
  };

  const setQt = (type, field, val) => {
    setQuestionTypes(qs => qs.map(q => q.type === type ? { ...q, [field]: Math.max(0, parseInt(val) || 0) } : q));
  };

  const setBonus = (index, field, val) => {
    setBonusTypes(bs => bs.map((b, i) => i === index ? { ...b, [field]: field === 'type' ? val : Math.max(0, parseInt(val) || 0) } : b));
  };

  const addBonusType = () => setBonusTypes(bs => [...bs, { type: 'mcq', label: 'Multiple Choice', count: 1, marksPerQuestion: 1 }]);
  const removeBonusType = (index) => setBonusTypes(bs => bs.filter((_, i) => i !== index));

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await axios.post('/api/ai/ocr', fd);
      const txt = r.data?.data?.text || r.data?.text || '';
      if (r.data.success && txt) {
        setMaterial(txt); // stored as SOURCE MATERIAL, separate from Teacher Notes
        setMaterialName(file.name);
        alert('✅ Book/material attached (' + txt.length + ' characters). Now write in About Exam WHERE to generate from — e.g. "generate from unit 2"');
      } else if (r.data?.data?.scanned) {
        alert('❌ This PDF is scanned images (no text layer). Please upload a text-based PDF, or type the instructions in the About Exam box.');
      } else {
        alert('❌ Could not extract text from this file' + (r.data?.data?.error ? ': ' + r.data.data.error : '') + '. Try a different format (PDF, DOCX, XLSX, TXT).');
      }
    } catch (err) {
      alert('❌ Upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const generate = async () => {
    const componentMissing = selectedClasses.length > 1
      ? selectedClasses.some(c => !componentFor(c))
      : !form.componentName;
    if (!form.subjectName || !form.className || componentMissing) {
      setError(selectedClasses.length > 1 ? 'Pick a component for every selected class' : 'Please select Subject, Class, and Component'); return;
    }
    const activeTypes = questionTypes.filter(q => q.count > 0);
    if (activeTypes.length === 0 && effectiveTotal === 0) {
      setError('Select a Component from the mark list, or set at least one question type with a count above 0'); return;
    }
    if (bonusTotal > 5) {
      setError('Bonus marks cannot exceed 5'); return;
    }
    if (!String(form.teacherNotes || '').trim()) {
      setError('About Exam is required — describe what the test should cover'); return;
    }
    // Several classes: every class must end up with the same total marks
    if (selectedClasses.length > 1) {
      if (markConflicts()) {
        setError('The components picked for each class must have the same total marks — fix the Component field above');
        return;
      }
      if (selectedClasses.some(c => !componentFor(c))) {
        setError('Pick a component for every selected class');
        return;
      }
      await runGenerate(componentFor(form.className) || form.componentName);
      return;
    }
    setError('');
    // Does a test already exist for this subject/class/term/component?
    try {
      const r = await axios.get('/api/ai/check-test-exists', {
        params: { subjectName: form.subjectName, className: form.className, termNumber: form.termNumber, componentName: form.componentName }
      });
      const d = r.data?.data;
      if (d && d.exists) {
        if (dupChoice === 'copy' && saveComponent) { await runGenerate(saveComponent); return; }
        if (dupChoice === 'overwrite') { await runGenerate(form.componentName); return; }
        setDupCheck({ ...d, mode: 'copy' });
        return;
      }
    } catch { /* check unavailable — generate normally */ }
    await runGenerate(form.componentName);
  };

  const runGenerate = async (componentForSave) => {
    const activeTypes = questionTypes.filter(q => q.count > 0);
    setLoading(true); setError(''); setGenerated(null); setSaved(false);
    setEditingIndex(-1); setAdding(false);
    setSaveComponent(componentForSave && componentForSave !== form.componentName ? componentForSave : null);
    try {
      const payload = {
        ...form,
        componentName: componentFor(form.className) || form.componentName,
        materialText: material || null,
        totalMarks: effectiveTotal || distTotal,
        difficulty: form.difficulty.length ? form.difficulty.map(d => d.toLowerCase()).join(', ') : 'medium',
        questionTypes: activeTypes.map(q => ({ type: q.type, count: q.count, marksPerQuestion: q.marksPerQuestion })),
        bonusQuestions: bonusTotal > 0 ? bonusTypes.map(b => ({ type: b.type, count: b.count, marksPerQuestion: b.marksPerQuestion })) : null,
      };
      delete payload.topic;
      const res = await axios.post('/api/ai/generate-test', payload);
      if (res.data.success) setGenerated(res.data);
      else setError(res.data.error || 'Generation failed');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to generate test');
    } finally {
      setLoading(false);
    }
  };

  const activeComponent = () => saveComponent || form.componentName;

  // Switch between AI generation and manual writing
  const switchMode = (m) => {
    if (m === mode) return;
    setMode(m);
    setError('');
    setSaved(false);
    setSaveComponent(null);
    setEditingIndex(-1);
    setAdding(false);
    if (m === 'manual') {
      // empty test → the existing "Add Question" editor + Save flow work as-is
      setGenerated({ success: true, questions: [], totalMarks: 0, manual: true });
    } else {
      setGenerated(null);
    }
  };

  const saveTest = async () => {
    if (!generated) return;
    const componentMissing = selectedClasses.length > 1
      ? selectedClasses.some(c => !componentFor(c))
      : !form.componentName;
    if (!form.subjectName || !form.className || !form.termNumber || componentMissing) {
      alert(selectedClasses.length > 1
        ? '⚠️ Pick a component for every selected class in Step 1 first.'
        : '⚠️ Fill in Subject, Class, Term and Component in Step 1 first.');
      return null;
    }
    if (!generated.questions || generated.questions.length === 0) {
      alert('⚠️ Add at least one question before saving.');
      return null;
    }
    if (markConflicts()) {
      alert('⚠️ The components picked for each class must have the same total marks.');
      return null;
    }
    if (selectedClasses.some(c => !componentFor(c))) {
      alert('⚠️ Pick a component for every selected class.');
      return null;
    }
    setSaving(true);
    try {
      // several classes → warn before overwriting any test that already exists
      if (selectedClasses.length > 1) {
        const existing = [];
        for (const cls of selectedClasses) {
          try {
            const r = await axios.get('/api/ai/check-test-exists', {
              params: { subjectName: form.subjectName, className: cls, termNumber: form.termNumber, componentName: componentFor(cls) }
            });
            if (r.data?.data?.exists) existing.push(String(cls).toUpperCase());
            } catch { /* ignore */ }
        }
        if (existing.length > 0) {
          const ok = window.confirm(
            `⚠️ A test already exists for: ${existing.join(', ')}.\n\nSaving will OVERWRITE it with the new questions.\nContinue?`
          );
          if (!ok) { setSaving(false); return null; }
        }
      }

      const classesToSave = selectedClasses.length > 0 ? selectedClasses : [form.className];
      const results = [];
      for (const cls of classesToSave) {
        const comp = componentFor(cls) || activeComponent();
        const res = await axios.post('/api/ai/save-test', {
          subjectName: form.subjectName,
          className: cls,
          termNumber: form.termNumber,
          componentName: comp,
          questions: generated.questions,
          timeLimit: form.timeLimit,
          language: form.language,
          password: testPassword,
          practice: !!form.practice,
          isPublished: false
        });
        results.push(res.data?.data || null);
      }
      const info = results.find(Boolean) || null;
      setSavedInfo(info);
      setSaved(true);
      alert(
        '✅ Test saved' +
        (classesToSave.length > 1
          ? ` for ${classesToSave.length} classes: ${classesToSave.map(c => String(c).toUpperCase()).join(', ')}`
          : ' successfully!') +
        (saveComponent ? ` (as copy: ${saveComponent})` : '')
      );
      return info || {};
    } catch (err) {
      alert('❌ Failed to save test: ' + (err.response?.data?.error || err.message));
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Save (if needed) then open the shared publish dialog for this test
  const openPublish = async () => {
    if (!generated) return;
    let info = savedInfo;
    if (!saved) {
      info = await saveTest();
      if (!info) return;
    }
    const schemaName = info.schemaName || `test_${String(form.subjectName).toLowerCase().replace(/[\s\-.]+/g, '_')}_schema`;
    const tableName = info.tableName || `${String(form.className).toLowerCase().replace(/[\s\-.]+/g, '_')}_term${form.termNumber}_${String(activeComponent()).toLowerCase().replace(/[\s\-.]+/g, '_')}`;
    let row = null;
    try {
      const res = await axios.get('/api/ai/list-tests');
      row = (res.data.data || []).find((t) => t.schemaName === schemaName && t.tableName === tableName) || null;
    } catch {
      row = null;
    }
    setPublishTarget({
      ...(row || {
        schemaName, tableName,
        subject: form.subjectName, className: form.className,
        termNumber: form.termNumber, componentName: activeComponent(),
        questionCount: generated.questions.length, password: testPassword,
        practice: !!form.practice, published: false, allStudents: true
      }),
      password: testPassword || row?.password,
      practice: !!form.practice
    });
  };

  const playTest = () => {
    if (!saved && !confirm('The test is not saved yet. Play without saving?')) return;
    const params = new URLSearchParams({
      subject: form.subjectName, class: form.className,
      term: form.termNumber, component: activeComponent()
    });
    navigate(`/ai-test-player?${params.toString()}`);
  };

  const applyQuestions = (questions) => {
    setGenerated(g => ({ ...g, questions, ...withStats(questions), warnings: undefined }));
    setSaved(false); // edited after saving → needs saving again
    setEditingIndex(-1);
    setAdding(false);
  };
  const deleteQuestion = (i) => {
    if (!confirm(`Delete question ${i + 1}?`)) return;
    applyQuestions(generated.questions.filter((_, j) => j !== i));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}><FiEdit3 /></div>
        <div style={{ flex: 1 }}>
          <h1>AI Test Generator</h1>
          <p>Generate exams using AI. Configure the settings and click Generate.</p>
        </div>
        <button className={styles.savedTestsBtn} onClick={() => navigate('/ai-tests')}>
          <FiList /> Saved Tests
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', margin: '0 0 14px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.4px' }}>MODE</span>
        <button
          type="button"
          onClick={() => switchMode('ai')}
          style={{
            border: mode === 'ai' ? '2px solid #7c3aed' : '1.5px solid #d1d5db',
            background: mode === 'ai' ? '#ede9fe' : '#fff',
            color: mode === 'ai' ? '#5b21b6' : '#4b5563',
            borderRadius: '999px', padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: '0.86rem'
          }}
        >
          ✨ AI generate
        </button>
        <button
          type="button"
          onClick={() => switchMode('manual')}
          style={{
            border: mode === 'manual' ? '2px solid #7c3aed' : '1.5px solid #d1d5db',
            background: mode === 'manual' ? '#ede9fe' : '#fff',
            color: mode === 'manual' ? '#5b21b6' : '#4b5563',
            borderRadius: '999px', padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: '0.86rem'
          }}
        >
          ✍️ Manual — write it myself
        </button>
        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
          {mode === 'ai' ? 'AI writes the questions from your settings.' : 'You add every question yourself, one by one.'}
        </span>
      </div>

      <h2 className={styles.stepHeader}>Step 1: Test Configuration</h2>

      <div className={styles.mainGrid}>
        <div className={styles.formCard}>
          <div className={styles.formGrid}>
            <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
              <label>Class <span className={styles.req}>*</span> — pick one or more</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {classes.map(c => {
                  const on = selectedClasses.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleClass(c)}
                      style={{
                        border: on ? '2px solid #7c3aed' : '1.5px solid #d1d5db',
                        background: on ? '#ede9fe' : '#fff',
                        color: on ? '#5b21b6' : '#374151',
                        borderRadius: '8px',
                        padding: '7px 14px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.86rem'
                      }}
                    >
                      {String(c).toUpperCase()}
                    </button>
                  );
                })}
                {classes.length === 0 && (
                  <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>No classes found</span>
                )}
              </div>
              {selectedClasses.length > 1 && (
                <small style={{ color: '#7c3aed', fontSize: '0.8rem', display: 'block', marginTop: '6px', fontWeight: 600 }}>
                  {selectedClasses.length} classes selected — after you generate, {selectedClasses.length} separate
                  tests are saved (one per class), each with the same questions.
                </small>
              )}
            </div>
            <div className={styles.field}>
              <label>Subject <span className={styles.req}>*</span></label>
              <select value={form.subjectName} onChange={e => { setField('subjectName', e.target.value); setField('componentName', ''); setMarkComponents({}); setMarkByClass({}); setComponentByClass({}); }}
                disabled={selectedClasses.length === 0}>
                <option value="">{selectedClasses.length ? 'Select Subject' : 'Select Class first'}</option>
                {getAvailableSubjects().map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {selectedClasses.length > 0 && (
                <small style={{ color: selectedClasses.length > 1 ? '#7c3aed' : '#6b7280', fontSize: '0.8rem', display: 'block', marginTop: '4px', fontWeight: selectedClasses.length > 1 ? 600 : 400 }}>
                  {selectedClasses.length > 1
                    ? `Only subjects taught in ALL of: ${selectedClasses.map(c => String(c).toUpperCase()).join(', ')}`
                    : `Only subjects of ${form.className}`}
                </small>
              )}
            </div>
            <div className={styles.field}>
              <label>Term</label>
              <select value={form.termNumber} onChange={e => { setField('termNumber', parseInt(e.target.value)); setMarkComponents({}); }}>
                {termOptions.map(t => <option key={t} value={t}>Term {t}</option>)}
              </select>
            </div>
            {(selectedClasses.length < 2 || componentSetsIdentical()) ? (
            <div className={styles.field}>
              <label>Component <span className={styles.req}>*</span></label>
              <select value={form.componentName} onChange={e => { setField('componentName', e.target.value); setComponentByClass({}); }}>
                <option value="">Select Component</option>
                {Object.keys(markComponents).length > 0
                  ? Object.keys(markComponents).map(c => (
                      <option key={c} value={c}>{c.replace(/_/g, ' ').toUpperCase()} ({markComponents[c]} marks)</option>
                    ))
                  : COMPONENTS.map(c => <option key={c} value={c}>{c}</option>)
                }
              </select>
              {selectedClasses.length > 1 && componentSetsIdentical() && Object.keys(markComponents).length > 0 && (
                <small style={{ color: '#7c3aed', fontSize: '0.8rem', display: 'block', marginTop: '4px', fontWeight: 600 }}>
                  All {selectedClasses.length} classes use the same components — one list for all of them
                </small>
              )}
              {Object.keys(markComponents).length === 0 && form.subjectName && selectedClasses.length > 0 && (
                <small style={{ color: '#9ca3af', fontSize: '0.8rem', display: 'block', marginTop: '4px' }}>
                  No mark list found for this subject/class/term — showing default components
                </small>
              )}
            </div>
            ) : (
              selectedClasses.map(c => (
                <div className={styles.field} key={c}>
                  <label>Component for {String(c).toUpperCase()} <span className={styles.req}>*</span></label>
                  <select
                    value={componentByClass[c] || ''}
                    onChange={e => {
                      const v = e.target.value;
                      setComponentByClass(prev => ({ ...prev, [c]: v }));
                      if (c === form.className) setField('componentName', v);
                    }}
                  >
                    <option value="">Select Component</option>
                    {(Object.keys(markByClass[c] || {}).length > 0 ? Object.keys(markByClass[c]) : COMPONENTS).map(x => (
                      <option key={x} value={x}>
                        {x.replace(/_/g, ' ').toUpperCase()}
                        {((markByClass[c] || {})[x] != null) ? ` (${markByClass[c][x]} marks)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))
            )}
            {markConflicts() && (
              <div style={{ gridColumn: '1 / -1', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 10px', fontSize: '0.85rem', fontWeight: 600 }}>
                ⚠️ Different total marks:{' '}
                {markConflicts().map(r => `${String(r.cls).toUpperCase()} ${String(r.comp).replace(/_/g, ' ')} = ${r.marks} marks`).join('   ·   ')}
                {' '}— choose components with the same total marks for every class.
              </div>
            )}
            <div className={styles.field}>
              <label>Total Marks</label>
              <input
                type="number"
                value={componentMarkValue != null ? componentMarkValue : distTotal}
                readOnly={componentMarkValue != null}
                className={componentMarkValue != null ? styles.readonly : ''}
                title={componentMarkValue != null ? `Set from mark list (${form.componentName})` : 'Sum of your question distribution'}
              />
              {componentMarkValue != null && (
                <small style={{ color: '#6b7280', fontSize: '0.8rem', display: 'block', marginTop: '4px' }}>
                  Set from mark list{bonusTotal > 0 ? ` + ${bonusTotal} bonus = ${componentMarkValue + bonusTotal} total` : ''} — distribute below: e.g. {componentMarkValue} questions × 1 mark, or 5 × 2 marks, any mix you want
                </small>
              )}
            </div>
            <div className={styles.field}>
              <label>Difficulty (select one or more)</label>
              <div className={styles.diffRow}>
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    type="button"
                    className={form.difficulty.includes(d) ? `${styles.diffCheck} ${styles.diffChecked}` : styles.diffCheck}
                    onClick={() => toggleDifficulty(d)}
                  >
                    {form.difficulty.includes(d) && <FiCheck />} {d}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label>Language</label>
              <select value={form.language} onChange={e => setField('language', e.target.value)}>
                {['English', 'Arabic', 'Somali', 'Amharic', 'Oromo'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Time Limit (minutes, 0 = no limit)</label>
              <input type="number" min="0" value={form.timeLimit} onChange={e => setField('timeLimit', Math.max(0, parseInt(e.target.value) || 0))} />
            </div>
            <div className={styles.field}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!form.practice}
                  onChange={e => setField('practice', e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#7c3aed' }}
                />
                Practice test
              </label>
              <small style={{ color: '#6b7280', fontSize: '0.78rem', display: 'block', marginTop: '2px' }}>
                ☑ Practice = student marks are <b>NOT</b> saved to the mark list.
              </small>
            </div>
          </div>

          <div className={styles.field}>
            <label>About Exam <span className={styles.req}>*</span></label>
            <textarea
              className={styles.textarea}
              rows={4}
              value={form.teacherNotes}
              onChange={e => setField('teacherNotes', e.target.value)}
              placeholder="Describe the exam — what it should cover, which unit/chapter/topic, and anything specific you want. Write in ANY language (Somali, Amharic, Arabic, English…). The test will be written in the Language you selected above, not the language you write here."
            />
            {!String(form.teacherNotes || '').trim() && (
              <small style={{ color: '#b45309', fontSize: '0.78rem', display: 'block', marginTop: '4px' }}>
                Required — e.g. "Unit 2, include questions from the first two topics"
              </small>
            )}
          </div>

          {mode === 'ai' && (
            <>
          <button className={styles.uploadBtn} onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <><FiLoader className={styles.spin} /> Extracting...</> : <><FiUpload /> Upload Book / Notes</>}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" style={{ display: 'none' }} onChange={handleUpload} />
          {material && (
            <div style={{ marginTop: '8px', padding: '10px 12px', background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 600 }}>
                📚 Attached: {materialName} ({(material.length / 1000).toFixed(0)}k chars)
              </span>
              <button type="button" onClick={() => { setMaterial(null); setMaterialName(''); }} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1rem', fontWeight: 700 }}>✕</button>
            </div>
          )}
            </>
          )}

          {error && (
            <div className={styles.error} role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} aria-label="Dismiss error" style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', lineHeight: 1 }}>✕</button>
            </div>
          )}
        </div>

        {mode === 'ai' && (
        <div className={styles.formCard}>
          <h2 className={styles.stepHeader}>Step 2: Question Distribution</h2>
          <div className={styles.distTable}>
            <div className={`${styles.distRow} ${styles.distHead}`}>
              <span>Question Type</span>
              <span>Count</span>
              <span>Marks each</span>
            </div>
            {questionTypes.map(qt => (
              <div key={qt.type} className={styles.distRow}>
                <span>
                  {qt.label}
                  {qt.type === 'matching' && qt.count > 0 && (
                    <small style={{ display: 'block', color: '#7c3aed', fontSize: '0.72rem' }}>
                      → 1 question with {qt.count} pair{qt.count > 1 ? 's' : ''} ({qt.count * qt.marksPerQuestion} marks, graded per pair)
                    </small>
                  )}
                </span>
                <input type="number" min="0" value={qt.count} onChange={e => setQt(qt.type, 'count', e.target.value)} />
                <input type="number" min="1" value={qt.marksPerQuestion} onChange={e => setQt(qt.type, 'marksPerQuestion', e.target.value)} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#6b7280' }}>
            💡 Matching is ONE question: the count = how many pairs it contains, and each correct pair earns its share of the marks.
          </div>
          <div className={styles.totalMarks}>
            Total marks: <strong>{componentMarkValue != null ? componentMarkValue : distTotal}</strong>
            {componentMarkValue != null && distTotal > 0 && distTotal !== componentMarkValue && (
              <span style={{ color: '#dc2626', marginLeft: '8px', fontSize: '0.85rem' }}>
                (your distribution: {distTotal} — component is {componentMarkValue})
              </span>
            )}
            {bonusTotal > 0 && (
              <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: '#b45309' }}>
                🎁 +{bonusTotal} bonus = <strong>{(componentMarkValue != null ? componentMarkValue : distTotal) + bonusTotal} total</strong>
              </span>
            )}
          </div>

          <div style={{ marginTop: '1rem', padding: '12px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fde68a' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>🎁 Bonus Questions (optional — max 5 bonus marks)</div>
            {bonusTypes.length === 0 && (
              <div style={{ fontSize: '0.85rem', color: '#92400e', marginBottom: '6px' }}>
                Add extra bonus marks on top of the test marks — e.g. test 10 marks + 5 bonus = 15 marks total
              </div>
            )}
            {bonusTypes.map((b, i) => (
              <div key={i} className={styles.distRow} style={{ marginBottom: '6px' }}>
                <select value={b.type} onChange={e => setBonus(i, 'type', e.target.value)} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                  {QUESTION_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
                </select>
                <input type="number" min="1" value={b.count} onChange={e => setBonus(i, 'count', e.target.value)} style={{ width: '70px', padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db' }} placeholder="Count" />
                <input type="number" min="1" value={b.marksPerQuestion} onChange={e => setBonus(i, 'marksPerQuestion', e.target.value)} style={{ width: '70px', padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db' }} placeholder="Marks" />
                <span style={{ fontSize: '0.85rem', color: '#6b7280', minWidth: '50px' }}>= {b.count * b.marksPerQuestion}m</span>
                <button type="button" onClick={() => removeBonusType(i)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>✕</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button type="button" onClick={addBonusType} style={{ background: '#fef3c7', border: '1px dashed #f59e0b', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
                + Add Bonus Question Type
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: bonusTotal > 5 ? 700 : 400, color: bonusTotal > 5 ? '#dc2626' : '#6b7280' }}>
                Bonus total: {bonusTotal} / 5 marks{bonusTotal > 5 ? ' — EXCEEDS LIMIT!' : ''}
              </span>
            </div>
          </div>

          <button className={styles.generateBtn} onClick={generate} disabled={loading || bonusTotal > 5}>
            {loading ? <><FiLoader className={styles.spin} /> Generating...</> : '⚡ Generate Test'}
          </button>
          {bonusTotal > 5 && (
            <div style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '6px', textAlign: 'center' }}>
              Bonus exceeds 5 marks — reduce it to generate
            </div>
          )}
        </div>
        )}

        {mode === 'manual' && (
          <div className={styles.formCard}>
            <h2 className={styles.stepHeader}>Step 2: Write your questions</h2>
            <p style={{ fontSize: '0.9rem', color: '#4b5563', margin: 0, lineHeight: 1.6 }}>
              Scroll down to the test preview and press <b>+ Add Question</b> to write each question yourself —
              pick the type (MCQ, true/false, matching, fill in, short answer, essay…), set the marks, and
              repeat until the test is complete. Then press <b>Save Test</b>.
            </p>
          </div>
        )}
      </div>

      <div className={styles.resultCard}>
        {loading && (
          <div className={styles.placeholder}>
            <FiLoader className={styles.spin} />
            <p>Generating your test with AI...</p>
            <p className={styles.sub}>This may take 30-60 seconds</p>
          </div>
        )}
        {!loading && !generated && (
          <div className={styles.placeholder}>
            <FiEdit3 />
            <p>{mode === 'manual' ? 'Fill in Step 1 above, then press + Add Question below' : 'Fill in the settings and click Generate Test'}</p>
          </div>
        )}
        {!loading && generated && (
          <div className={styles.resultContent}>
            <div className={styles.resultHeader}>
              <div style={{ flex: 1 }}>
                <h3>
                  Test preview — {generated.questions.length} questions · {generated.totalMarks ?? generated.questions.reduce((s, q) => s + (q.marks || 0), 0)} marks
                </h3>
                {saveComponent && (
                  <small style={{ color: '#7c3aed', fontWeight: 700, fontSize: '0.82rem' }}>
                    💾 Will be saved as a copy: "{saveComponent}" (the existing test stays untouched)
                  </small>
                )}
                <small style={{ display: 'block', color: '#6b7280', fontSize: '0.8rem' }}>
                  Review and edit the questions below BEFORE saving.
                </small>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                  <span style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '3px 9px', fontSize: '0.82rem', fontWeight: 700, color: '#92400e' }}>
                    🔑 Test password: <span style={{ letterSpacing: '3px' }}>{testPassword}</span>
                  </span>
                  <button
                    type="button"
                    onClick={newTestPassword}
                    title="Generate a new password"
                    style={{ border: '1px solid #d1d5db', background: '#fff', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.78rem' }}
                  >
                    ↻ New password
                  </button>
                  {form.practice && (
                    <span style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '3px 9px', fontSize: '0.8rem', fontWeight: 700, color: '#166534' }}>
                      🏃 Practice — marks not saved
                    </span>
                  )}
                </div>
                <small style={{ display: 'block', color: '#6b7280', fontSize: '0.78rem', marginTop: '4px' }}>
                  Click <b>Publish</b> to pick the password, practice mode and which students get it — or do it later from <b>Saved Tests</b>. Tell students the password yourself — it is never sent to them.
                </small>
              </div>
              <div className={styles.resultActions}>
                <button onClick={saveTest} disabled={saving || saved} className={styles.saveBtn}><FiSave /> {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Test'}</button>
                <button onClick={openPublish} disabled={saving} className={styles.publishBtn}><FiSend /> {saved ? 'Publish to students' : 'Save & Publish'}</button>
                <button onClick={playTest} className={styles.playBtn}><FiPlay /> Play</button>
                {mode === 'ai' && (
                  <button onClick={() => runGenerate(activeComponent())} className={styles.regenBtn}><FiRefreshCw /> Regenerate</button>
                )}
              </div>
            </div>
            {generated.stats && (
              <div className={styles.statsBar}>
                {Object.entries(generated.stats).filter(([k]) => k !== 'total').map(([k, v]) => (
                  <span key={k} className={styles.statPill}>{k}: {v}</span>
                ))}
              </div>
            )}
            {generated.warnings && generated.warnings.length > 0 && (
              <div style={{ margin: '10px 0', padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', color: '#92400e', fontSize: '0.88rem' }}>
                {generated.warnings.map((w, i) => <div key={i} style={{ marginBottom: i < generated.warnings.length - 1 ? '4px' : 0 }}>⚠️ {w}</div>)}
              </div>
            )}
            <div style={{ margin: '10px 0', display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => { setAdding(v => !v); setEditingIndex(-1); }}
                style={{ background: '#eff6ff', border: '1px dashed #3b82f6', color: '#1d4ed8', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '0.86rem' }}
              >
                <FiPlus /> {adding ? 'Close' : 'Add Question'}
              </button>
              <span style={{ fontSize: '0.8rem', color: '#6b7280', alignSelf: 'center' }}>
                Use ✏️ to edit a question and 🗑 to delete it.
              </span>
            </div>
            {adding && (
              <QuestionEditor
                isNew
                initial={null}
                onSave={(q) => applyQuestions([...generated.questions, q])}
                onCancel={() => setAdding(false)}
              />
            )}
            <div className={styles.questionList}>
              {generated.questions.map((q, i) => (
                <div key={i} className={styles.questionCard}>
                  <div className={styles.qHeader}>
                    <span className={styles.qNum}>{i + 1}</span>
                    <span className={styles.qType}>{q.type}</span>
                    <span className={styles.qMarks}>{q.marks} mark{q.marks > 1 ? 's' : ''}</span>
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        title="Edit question"
                        onClick={() => { setEditingIndex(editingIndex === i ? -1 : i); setAdding(false); }}
                        style={{ border: '1px solid #c4b5fd', background: editingIndex === i ? '#ede9fe' : '#f5f3ff', color: '#6d28d9', borderRadius: '6px', padding: '5px 9px', cursor: 'pointer' }}
                      >
                        <FiEdit3 />
                      </button>
                      <button
                        type="button"
                        title="Delete question"
                        onClick={() => deleteQuestion(i)}
                        style={{ border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', borderRadius: '6px', padding: '5px 9px', cursor: 'pointer' }}
                      >
                        <FiTrash2 />
                      </button>
                    </span>
                  </div>
                  {editingIndex === i ? (
                    <QuestionEditor
                      initial={q}
                      onSave={(nq) => applyQuestions(generated.questions.map((x, j) => j === i ? nq : x))}
                      onCancel={() => setEditingIndex(-1)}
                    />
                  ) : (
                    <>
                      <p className={styles.qText}>{q.question}</p>
                      {q.type === 'matching' ? (
                        <div className={styles.qOptions}>
                          {(q.correctMatches || []).map((m, j) => (
                            <div key={j} className={styles.qOption}>{j + 1}. {m.left} → {m.right}</div>
                          ))}
                        </div>
                      ) : q.options && q.options.length > 0 ? (
                        <div className={styles.qOptions}>
                          {q.options.map((o, j) => (
                            <div
                              key={j}
                              className={styles.qOption}
                              style={String(o).trim() === String(q.answer || '').trim() ? { background: '#dcfce7', borderColor: '#86efac' } : undefined}
                            >
                              <strong>{String.fromCharCode(65 + j)}.</strong> {o}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div className={styles.qAnswer}>
                        <strong>Answer:</strong>{' '}
                        {q.type === 'matching'
                          ? `${(q.correctMatches || []).length} pair${(q.correctMatches || []).length > 1 ? 's' : ''} (graded per pair)`
                          : q.answer}
                      </div>
                      {q.explanation && <div className={styles.qExplanation}><strong>Explanation:</strong> {q.explanation}</div>}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {dupCheck && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', width: 'min(540px, 94vw)', boxShadow: '0 20px 50px rgba(0,0,0,.3)' }}>
            <h3 style={{ marginTop: 0 }}>⚠️ A test already exists here</h3>
            <p style={{ fontSize: '0.9rem', color: '#374151' }}>
              {form.subjectName} · {form.className} · Term {form.termNumber} · <strong>{form.componentName}</strong> already has a saved test
              {dupCheck.exact ? ` (${dupCheck.exact.questionCount} questions)` : ''}.
            </p>
            {dupCheck.existing?.length > 0 && (
              <ul style={{ fontSize: '0.83rem', color: '#6b7280', maxHeight: '110px', overflow: 'auto', paddingLeft: '18px', margin: '6px 0' }}>
                {dupCheck.existing.map(e => <li key={e.tableName}>{String(e.componentName).replace(/_/g, ' ')} — {e.questionCount} questions</li>)}
              </ul>
            )}
            <p style={{ fontSize: '0.88rem', fontWeight: 600 }}>What do you want to do?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => { const c = dupCheck.suggestedCopy || `${form.componentName} A`; setDupChoice('copy'); setDupCheck(null); runGenerate(c); }}
                style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 14px', cursor: 'pointer', fontWeight: 700, textAlign: 'left' }}
              >
                📄 Save as a copy — "{dupCheck.suggestedCopy || `${form.componentName} A`}" (keeps the existing test)
              </button>
              <button
                type="button"
                onClick={() => { setDupChoice('overwrite'); setDupCheck(null); runGenerate(form.componentName); }}
                style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '10px', padding: '11px 14px', cursor: 'pointer', fontWeight: 700, textAlign: 'left' }}
              >
                🗑 Overwrite — if you save, the existing test will be removed
              </button>
              <button
                type="button"
                onClick={() => setDupCheck(null)}
                style={{ background: '#f3f4f6', border: 'none', borderRadius: '10px', padding: '10px 14px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {publishTarget && (
        <PublishModal
          test={publishTarget}
          onClose={() => setPublishTarget(null)}
          onChanged={() => setSaved(true)}
        />
      )}
    </div>
  );
};

export default TestGenerator;
