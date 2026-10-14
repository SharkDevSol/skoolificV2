// PAGE/CreateMarklist/SubjectMappingSetup.jsx
import React, { useState, useEffect } from 'react';
import styles from './CreateMarklist/CreateMarklist.module.css';
import { getHeaders } from './MarkListManagement';

const API_BASE_URL = (typeof window !== 'undefined' && window.location.origin ? window.location.origin + '/api' : (import.meta.env.VITE_API_URL || '/api'));

const BASIC_SUBJECTS = [
  'Mathematics', 'English', 'Physics', 'Chemistry', 'Biology',
  'History', 'Geography', 'Amharic', 'Arabic', 'Science',
  'Civics', 'Sport', 'Moral', 'Career', 'Citizenship'
];

const SubjectConfiguration = ({ onSubjectsConfigured }) => {
  const [subjects, setSubjects] = useState([]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/mark-list/subjects`, { headers: getHeaders() });
      const data = await res.json();
      setSubjects(data);
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  const handleAdd = async () => {
    if (!newSubjectName.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/mark-list/add-subject`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ subject_name: newSubjectName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewSubjectName('');
        setMessage('Subject added!');
        fetchSubjects();
        if (onSubjectsConfigured) onSubjectsConfigured();
      } else {
        setMessage(data.error || 'Failed to add subject');
      }
    } catch (err) {
      setMessage('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id) => {
    if (!editingName.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/mark-list/update-subject/${id}`, {
        method: 'PUT',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ subject_name: editingName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditingId(null);
        setEditingName('');
        setMessage('Subject updated!');
        fetchSubjects();
      } else {
        setMessage(data.error || 'Failed to update');
      }
    } catch (err) {
      setMessage('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/mark-list/delete-subject/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Subject deleted!');
        fetchSubjects();
      } else {
        setMessage(data.error || 'Failed to delete');
      }
    } catch (err) {
      setMessage('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.content}>
      <div className={styles.stepHeader}>
        <div className={styles.stepIcon}>📚</div>
        <h2>Subject Configuration</h2>
        <p>Add, edit, or remove subjects. Existing subjects are preserved.</p>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.5rem', display: 'block' }}>Quick Add Basic Subjects</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {BASIC_SUBJECTS.map(name => {
            const exists = subjects.some(s => s.subject_name.trim().toLowerCase() === name.toLowerCase());
            return (
              <button
                key={name}
                type="button"
                disabled={exists || loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await fetch(`${API_BASE_URL}/mark-list/add-subject`, {
                      method: 'POST',
                      headers: getHeaders({ 'Content-Type': 'application/json' }),
                      body: JSON.stringify({ subject_name: name }),
                    });
                    if (res.ok) {
                      setMessage(`${name} added!`);
                      fetchSubjects();
                      if (onSubjectsConfigured) onSubjectsConfigured();
                    }
                  } catch {}
                  setLoading(false);
                }}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '999px',
                  border: exists ? '1px solid #e5e7eb' : '1px solid #3b82f6',
                  background: exists ? '#f9fafb' : '#eff6ff',
                  color: exists ? '#9ca3af' : '#1d4ed8',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: exists ? 'default' : 'pointer',
                  opacity: exists ? 0.5 : 1,
                }}
              >
                {exists ? '✓ ' : '+ '}{name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Add new subject */}
      <div className={styles.inputGroup}>
        <label>Add New Subject</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Enter subject name"
            className={styles.modernInput}
            style={{ flex: 1 }}
          />
          <button
            onClick={handleAdd}
            disabled={loading || !newSubjectName.trim()}
            className={styles.primaryButton}
            style={{ whiteSpace: 'nowrap' }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Existing subjects list */}
      {subjects.length > 0 && (
        <div className={styles.inputGroup}>
          <label>Current Subjects ({subjects.length})</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {subjects.map((s) => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: '#f8f9fa', borderRadius: '8px', padding: '0.5rem 0.75rem'
              }}>
                {editingId === s.id ? (
                  <>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEdit(s.id)}
                      className={styles.modernInput}
                      style={{ flex: 1, padding: '0.4rem 0.6rem' }}
                      autoFocus
                    />
                    <button onClick={() => handleEdit(s.id)} disabled={loading}
                      style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      Save
                    </button>
                    <button onClick={() => { setEditingId(null); setEditingName(''); }}
                      style={{ background: '#e5e7eb', color: '#333', border: 'none', borderRadius: '6px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontWeight: 500 }}>{s.subject_name}</span>
                    <button onClick={() => { setEditingId(s.id); setEditingName(s.subject_name); }}
                      style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(s.id, s.subject_name)} disabled={loading}
                      style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {message && (
        <div className={`${styles.message} ${message.includes('!') ? styles.success : styles.error}`}>
          {message}
        </div>
      )}

      {/* V2 Enhancement: Separate navigation button */}
      {subjects.length > 0 && (
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '2px solid #e5e7eb' }}>
          <div className={styles.buttonGroup}>
            <button 
              onClick={() => onSubjectsConfigured && onSubjectsConfigured()} 
              className={styles.primaryButton}
              style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: '600' }}
            >
              Next: Class Mapping →
            </button>
          </div>
          <p style={{ textAlign: 'center', marginTop: '0.75rem', color: '#6b7280', fontSize: '0.9rem' }}>
            You have {subjects.length} subject{subjects.length !== 1 ? 's' : ''} configured. Click above to proceed to class mapping.
          </p>
        </div>
      )}
    </div>
  );
};

const ClassSubjectMapping = ({ onMappingCompleted }) => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [mappings, setMappings] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [existingMappings, setExistingMappings] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = getHeaders();
      const [classesRes, subjectsRes, mappingsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/mark-list/classes`, { headers }),
        fetch(`${API_BASE_URL}/mark-list/subjects`, { headers }),
        fetch(`${API_BASE_URL}/mark-list/subjects-classes`, { headers })
      ]);
      const [classesData, subjectsData, mappingsData] = await Promise.all([
        classesRes.ok ? classesRes.json() : [],
        subjectsRes.ok ? subjectsRes.json() : [],
        mappingsRes.ok ? mappingsRes.json() : []
      ]);
      setClasses(Array.isArray(classesData) ? classesData : []);
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      const validMappings = Array.isArray(mappingsData) ? mappingsData : [];
      setExistingMappings(validMappings);
      const mappingState = {};
      validMappings.forEach(m => { mappingState[`${m.class_name}-${m.subject_name}`] = true; });
      setMappings(mappingState);
    } catch (err) {
      setMessage('Error loading data: ' + err.message);
    }
  };

  const handleMappingChange = (className, subjectName, isChecked) => {
    setMappings(prev => ({ ...prev, [`${className}-${subjectName}`]: isChecked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const mappingsArray = Object.entries(mappings)
        .filter(([, v]) => v)
        .map(([key]) => {
          const idx = key.indexOf('-');
          return { className: key.substring(0, idx), subjectName: key.substring(idx + 1) };
        });
      const res = await fetch(`${API_BASE_URL}/mark-list/map-subjects-classes`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ mappings: mappingsArray }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Mappings saved!');
        fetchData();
        if (onMappingCompleted) onMappingCompleted();
      } else {
        setMessage(data.error || 'Failed to save');
      }
    } catch (err) {
      setMessage('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (classes.length === 0 || subjects.length === 0) {
    return (
      <div className={styles.content}>
        <div className={styles.emptyState}>
          <h3>No Data Available</h3>
          <p>{classes.length === 0 ? 'No classes found.' : 'No subjects found. Please add subjects first.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.content}>
      <div className={styles.stepHeader}>
        <div className={styles.stepIcon}>🔄</div>
        <h2>Class-Subject Mapping</h2>
        <p>Select which subjects are taught in each class</p>
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {classes.map(className => {
            const classSubjects = Object.entries(mappings)
              .filter(([key, checked]) => checked && key.startsWith(`${className}-`))
              .map(([key]) => key.substring(className.length + 1));
            const availableSubjects = subjects.filter(s => !classSubjects.includes(s.subject_name));
            return (
              <div key={className} style={{ background: '#fff', borderRadius: '12px', padding: '1rem', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {className}
                  <span style={{ background: '#eef2ff', color: '#4338ca', borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.75rem', fontWeight: 600 }}>
                    {classSubjects.length} subject{classSubjects.length !== 1 ? 's' : ''}
                  </span>
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem', minHeight: '2rem' }}>
                  {classSubjects.map(subj => (
                    <span key={subj} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#eef2ff', color: '#4338ca', borderRadius: '999px', padding: '0.3rem 0.75rem', fontSize: '0.85rem', fontWeight: 500 }}>
                      {subj}
                      <button type="button" onClick={() => handleMappingChange(className, subj, false)} style={{ background: 'none', border: 'none', color: '#4338ca', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0 }}>×</button>
                    </span>
                  ))}
                  {classSubjects.length === 0 && <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No subjects assigned</span>}
                </div>
                {availableSubjects.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => { if (e.target.value) handleMappingChange(className, e.target.value, true); }}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem' }}
                  >
                    <option value="">+ Add subject...</option>
                    {availableSubjects.map(s => <option key={s.id} value={s.subject_name}>{s.subject_name}</option>)}
                  </select>
                )}
              </div>
            );
          })}
        </div>
        {message && (
          <div className={`${styles.message} ${message.includes('!') ? styles.success : styles.error}`}>{message}</div>
        )}
        <div className={styles.buttonGroup}>
          <button type="submit" disabled={loading} className={styles.primaryButton}>
            {loading ? 'Saving...' : 'Save Mappings'}
          </button>
        </div>
      </form>
    </div>
  );
};

const SubjectMappingSetup = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [subjectsConfigured, setSubjectsConfigured] = useState(false);
  const [mappingCompleted, setMappingCompleted] = useState(false);

  const steps = [
    { number: 1, title: 'Subject Setup', completed: subjectsConfigured },
    { number: 2, title: 'Class Mapping', completed: mappingCompleted }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Subject & Class Setup</h1>
        <p>Configure subjects and map them to classes</p>
        <div className={styles.progressSteps}>
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <button
                className={`${styles.stepIndicator} ${step.completed ? styles.completed : currentStep === step.number ? styles.active : ''}`}
                onClick={() => setCurrentStep(step.number)}
              >
                <span className={styles.stepIconInner}>{step.completed ? '✓' : step.number}</span>
              </button>
              {index < steps.length - 1 && <div className={styles.stepConnector}></div>}
            </React.Fragment>
          ))}
        </div>
      </div>
      {currentStep === 1 && (
        <SubjectConfiguration onSubjectsConfigured={() => { setSubjectsConfigured(true); setCurrentStep(2); }} />
      )}
      {currentStep === 2 && (
        <ClassSubjectMapping onMappingCompleted={() => { setMappingCompleted(true); if (onComplete) onComplete(); }} />
      )}
    </div>
  );
};

export default SubjectMappingSetup;
