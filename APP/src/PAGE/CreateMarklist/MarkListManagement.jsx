// PAGE/CreateMarklist/MarkListManagement.jsx
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { getBranchCode } from '../../utils/branchCode';
import SubjectMappingSetup from './SubjectMappingSetup';
import './CreateMarklist/MarkListFrontend.css';

const API_BASE_URL = (typeof window !== 'undefined' && window.location.origin ? window.location.origin + '/api' : (import.meta.env.VITE_API_URL || '/api'));

export const getHeaders = (extra = {}) => {
  const branchCode = getBranchCode();
  const token = (branchCode ? localStorage.getItem(`branch_${branchCode}_authToken`) : null) || localStorage.getItem('authToken');
  const h = { ...extra };
  if (branchCode) h['x-branch-code'] = branchCode;
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
};

const DEFAULT_MARK_COMPONENTS = [
  { name: 'practical_1', percentage: 5 },
  { name: 'test_1', percentage: 10 },
  { name: 'practical_2', percentage: 5 },
  { name: 'test_2', percentage: 10 },
  { name: 'mid', percentage: 25 },
  { name: 'book', percentage: 5 },
  { name: 'final', percentage: 40 }
];

const MarkListForm = () => {
  const { t } = useApp();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjectClassMappings, setSubjectClassMappings] = useState([]);
  const [config, setConfig] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [markComponents, setMarkComponents] = useState(() => {
    try {
      const saved = localStorage.getItem('skoolific_custom_mark_components');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_MARK_COMPONENTS;
  });
  const [markList, setMarkList] = useState([]);
  const [formConfig, setFormConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [viewMode, setViewMode] = useState('create');
  const [formExists, setFormExists] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const headers = getHeaders();
      const [classesRes, mappingsRes, configRes] = await Promise.all([
        fetch(`${API_BASE_URL}/mark-list/classes`, { headers }),
        fetch(`${API_BASE_URL}/mark-list/subjects-classes`, { headers }),
        fetch(`${API_BASE_URL}/schedule/config`, { headers })
      ]);

      const [classesData, mappingsData, configData] = await Promise.all([
        classesRes.json(),
        mappingsRes.json(),
        configRes.json()
      ]);

      const uniqueSubjects = [...new Map(
        mappingsData.map(m => [m.subject_name, { id: m.subject_name, subject_name: m.subject_name }])
      ).values()];

      setSubjects(uniqueSubjects);
      setClasses(classesData);
      setSubjectClassMappings(mappingsData);
      setConfig({ term_count: configData.terms || 2 });
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setMessage('Error loading data: ' + error.message);
    }
  };

  const getAvailableClasses = () => {
    if (!selectedSubject) return [];
    return subjectClassMappings
      .filter(mapping => mapping.subject_name === selectedSubject)
      .map(mapping => mapping.class_name);
  };

  useEffect(() => {
    if (!selectedSubject || !selectedClass || !selectedTerm) return;
    const loadConfig = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/mark-list/mark-list/${encodeURIComponent(selectedSubject)}/${encodeURIComponent(selectedClass)}/${selectedTerm}`,
          { headers: getHeaders() }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.config && data.config.mark_components) {
            setMarkComponents(data.config.mark_components);
          }
          setMarkList(data.markList);
          setFormConfig(data.config);
          setViewMode('view');
          setFormExists(true);
        } else {
          setFormExists(false);
          setMarkComponents(prev => {
            if (Array.isArray(prev) && prev.length > 0) return prev;
            try {
              const saved = localStorage.getItem('skoolific_custom_mark_components');
              if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
              }
            } catch {}
            return DEFAULT_MARK_COMPONENTS;
          });
          setMarkList([]);
          setFormConfig(null);
          setViewMode('create');
        }
      } catch (error) {
        console.error('Error loading config:', error);
      }
    };
    loadConfig();
  }, [selectedSubject, selectedClass, selectedTerm]);

  const handleComponentChange = (index, field, value) => {
    const newComponents = [...markComponents];
    newComponents[index] = {
      ...newComponents[index],
      [field]: field === 'percentage' ? parseInt(value) || 0 : value
    };
    setMarkComponents(newComponents);
    try {
      localStorage.setItem('skoolific_custom_mark_components', JSON.stringify(newComponents));
    } catch {}
  };

  const addComponent = () => {
    const updated = [...markComponents, { name: '', percentage: 0 }];
    setMarkComponents(updated);
    try {
      localStorage.setItem('skoolific_custom_mark_components', JSON.stringify(updated));
    } catch {}
  };

  const removeComponent = (index) => {
    if (markComponents.length > 1) {
      const updated = markComponents.filter((_, i) => i !== index);
      setMarkComponents(updated);
      try {
        localStorage.setItem('skoolific_custom_mark_components', JSON.stringify(updated));
      } catch {}
    }
  };

  const resetToDefaultComponents = () => {
    setMarkComponents(DEFAULT_MARK_COMPONENTS);
    try {
      localStorage.removeItem('skoolific_custom_mark_components');
    } catch {}
  };

  const getTotalPercentage = () => {
    return markComponents.reduce((sum, component) => sum + (component.percentage || 0), 0);
  };

  const handleCreateForm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!selectedSubject || !selectedClass) {
      setMessage('Please select both subject and class');
      setLoading(false);
      return;
    }

    if (getTotalPercentage() !== 100) {
      setMessage('Mark components must total exactly 100%');
      setLoading(false);
      return;
    }

    if (markComponents.some(comp => !comp.name.trim())) {
      setMessage('Please fill in all component names');
      setLoading(false);
      return;
    }

    try {
      const checkRes = await fetch(`${API_BASE_URL}/mark-list/mark-list/${encodeURIComponent(selectedSubject)}/${encodeURIComponent(selectedClass)}/${selectedTerm}`, {
        headers: getHeaders()
      });
      if (checkRes.ok) {
        setMessage(`Mark list already exists for ${selectedSubject} - ${selectedClass} - Term ${selectedTerm}. Delete it first if you want to recreate.`);
        setFormExists(true);
        setLoading(false);
        return;
      }
    } catch {}

    try {
      const response = await fetch(`${API_BASE_URL}/mark-list/create-mark-forms`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          subjectName: selectedSubject,
          className: selectedClass,
          termNumber: selectedTerm,
          markComponents: markComponents
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`Mark list form created successfully! ${result.studentsCount} students added.`);
        try {
          localStorage.setItem('skoolific_custom_mark_components', JSON.stringify(markComponents));
        } catch {}
        setViewMode('view');
        setFormExists(true);
        await loadMarkList();
      } else if (response.status === 409) {
        setMessage(result.error || 'This mark list already exists. Delete it first if you want to recreate.');
        setFormExists(true);
      } else {
        setMessage(result.error || 'Failed to create mark form');
      }
    } catch (error) {
      setMessage('Error creating mark form: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMarkForm = async () => {
    if (!selectedSubject || !selectedClass || !selectedTerm) return;
    if (!window.confirm(`Delete mark list for ${selectedSubject} / ${selectedClass} / Term ${selectedTerm}?`)) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/mark-list/delete-mark-form/${encodeURIComponent(selectedSubject)}/${encodeURIComponent(selectedClass)}/${selectedTerm}`,
        {
          method: 'DELETE',
          headers: getHeaders()
        }
      );
      const result = await response.json();
      if (response.ok) {
        setMessage('Mark list deleted successfully');
        setFormExists(false);
        setViewMode('create');
        setMarkList([]);
        setFormConfig(null);
      } else {
        setMessage(result.error || 'Failed to delete mark list');
      }
    } catch (error) {
      setMessage('Error deleting mark list: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMarkList = async () => {
    if (!selectedSubject || !selectedClass || !selectedTerm) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/mark-list/mark-list/${encodeURIComponent(selectedSubject)}/${encodeURIComponent(selectedClass)}/${selectedTerm}`,
        { headers: getHeaders() }
      );

      if (response.ok) {
        const data = await response.json();
        setMarkList(data.markList);
        setFormConfig(data.config);
        setViewMode('view');
        setFormExists(true);
      } else {
        const errData = await response.json().catch(() => ({}));
        setMessage(errData.error || 'Mark list not found for this combination');
        setMarkList([]);
        setFormConfig(null);
      }
    } catch (error) {
      setMessage('Error loading mark list: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (studentId, componentKey, value) => {
    const newMarkList = markList.map(student => {
      if (student.id === studentId) {
        return {
          ...student,
          [componentKey]: parseFloat(value) || 0
        };
      }
      return student;
    });
    setMarkList(newMarkList);
  };

  const saveMarks = async (studentId) => {
    const student = markList.find(s => s.id === studentId);
    if (!student) return;

    setLoading(true);
    try {
      const marks = {};
      if (formConfig && formConfig.mark_components) {
        formConfig.mark_components.forEach(component => {
          const componentKey = component.name.toLowerCase().replace(/\s+/g, '_');
          marks[componentKey] = student[componentKey] || 0;
        });
      }

      const response = await fetch(`${API_BASE_URL}/mark-list/update-marks`, {
        method: 'PUT',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          subjectName: selectedSubject,
          className: selectedClass,
          termNumber: selectedTerm,
          studentId: studentId,
          marks: marks
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const updatedMarkList = markList.map(s => {
          if (s.id === studentId) {
            return {
              ...s,
              total: result.total,
              pass_status: result.passStatus
            };
          }
          return s;
        });
        setMarkList(updatedMarkList);
        setMessage(`Marks saved for ${student.student_name}`);
      } else {
        setMessage(result.error || 'Failed to save marks');
      }
    } catch (error) {
      setMessage('Error saving marks: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mlf-container">
      <div className="mlf-card">
        <div className="mlf-card-header">
          <h2>Mark List Management</h2>
          {subjects.length === 0 && (
            <div className="mlf-alert mlf-alert-warning">
              <span>No subjects found. Please set up subjects first.</span>
              <button onClick={() => navigate('/Subject-Mapping-Setup')} className="mlf-btn mlf-btn-sm mlf-btn-warning">
                Setup Subjects
              </button>
            </div>
          )}
        </div>

        <div className="mlf-tabs">
          <button className={`mlf-tab ${viewMode === 'create' ? 'active' : ''}`} onClick={() => setViewMode('create')}>
            Create Form
          </button>
          <button className={`mlf-tab ${viewMode === 'view' ? 'active' : ''}`} onClick={() => setViewMode('view')}>
            View / Edit Marks
          </button>
        </div>

        <div className="mlf-selects">
          <div className="mlf-select-group">
            <label>Subject</label>
            <select value={selectedSubject} onChange={(e) => { setSelectedSubject(e.target.value); setSelectedClass(''); }}>
              <option value="">Select Subject</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.subject_name}>{subject.subject_name}</option>
              ))}
            </select>
          </div>
          <div className="mlf-select-group">
            <label>Class</label>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} disabled={!selectedSubject}>
              <option value="">Select Class</option>
              {getAvailableClasses().map(className => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
          </div>
          <div className="mlf-select-group">
            <label>Term</label>
            <select value={selectedTerm} onChange={(e) => setSelectedTerm(parseInt(e.target.value))}>
              {Array.from({ length: config?.term_count || 2 }, (_, i) => (
                <option key={i + 1} value={i + 1}>Term {i + 1}</option>
              ))}
            </select>
          </div>
          {viewMode === 'view' && (
            <button onClick={loadMarkList} disabled={!selectedSubject || !selectedClass || loading} className="mlf-btn mlf-btn-primary">
              Load Mark List
            </button>
          )}
        </div>

        {viewMode === 'create' && (
          <div className="mlf-section">
            <div className="mlf-section-header">
              <h3>Mark Components Configuration</h3>
              <button onClick={resetToDefaultComponents} className="mlf-btn mlf-btn-ghost">Reset to Default</button>
            </div>
            <div className="mlf-components">
              {markComponents.map((component, index) => (
                <div key={index} className="mlf-component-row">
                  <input type="text" placeholder="Component name" value={component.name} onChange={(e) => handleComponentChange(index, 'name', e.target.value)} />
                  <input type="number" placeholder="Percentage" value={component.percentage} onChange={(e) => handleComponentChange(index, 'percentage', e.target.value)} min="0" max="100" />
                  <span className="mlf-percent">%</span>
                  {markComponents.length > 1 && (
                    <button type="button" onClick={() => removeComponent(index)} className="mlf-btn mlf-btn-danger mlf-btn-icon">×</button>
                  )}
                </div>
              ))}
            </div>
            <div className="mlf-component-actions">
              <button type="button" onClick={addComponent} className="mlf-btn mlf-btn-secondary">Add Component</button>
              <div className={`mlf-total ${getTotalPercentage() === 100 ? 'valid' : 'invalid'}`}>
                Total: {getTotalPercentage()}%
              </div>
            </div>
            <div className="mlf-actions">
              <button onClick={handleCreateForm} disabled={loading || !selectedSubject || !selectedClass || getTotalPercentage() !== 100} className="mlf-btn mlf-btn-primary">
                {loading ? 'Creating...' : 'Create Mark List Form'}
              </button>
              {formExists && (
                <button onClick={handleDeleteMarkForm} disabled={loading} className="mlf-btn mlf-btn-danger">Delete Mark List</button>
              )}
            </div>
          </div>
        )}

        {viewMode === 'view' && markList.length > 0 && (
          <div className="mlf-section">
            <h3>{selectedSubject} - {selectedClass} - Term {selectedTerm}</h3>
            <div className="mlf-table-wrap">
              <table className="mlf-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Age</th>
                    <th>Gender</th>
                    {formConfig && formConfig.mark_components && formConfig.mark_components.map(component => (
                      <th key={component.name}>{component.name} ({component.percentage}%)</th>
                    ))}
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {markList.map(student => (
                    <tr key={student.id}>
                      <td className="mlf-student">{student.student_name}</td>
                      <td>{student.age}</td>
                      <td>{student.gender}</td>
                      {formConfig && formConfig.mark_components && formConfig.mark_components.map(component => {
                        const componentKey = component.name.toLowerCase().replace(/\s+/g, '_');
                        return (
                          <td key={component.name}>
                            <input type="number" value={student[componentKey] || 0} onChange={(e) => handleMarkChange(student.id, componentKey, e.target.value)} min="0" max={component.percentage} className="mlf-mark-input" />
                          </td>
                        );
                      })}
                      <td className="mlf-total-cell">{student.total || 0}</td>
                      <td className={`mlf-status ${student.pass_status?.toLowerCase()}`}>{student.pass_status || 'Fail'}</td>
                      <td>
                        <button onClick={() => saveMarks(student.id)} className="mlf-btn mlf-btn-primary mlf-btn-sm" disabled={loading}>Save</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {message && (
          <div className={`mlf-alert ${message.includes('successfully') || message.includes('saved') ? 'mlf-alert-success' : 'mlf-alert-error'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

const TeacherAssignment = () => {
  const [teachers, setTeachers] = useState([]);
  const [subjectClassCombinations, setSubjectClassCombinations] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [existingAssignments, setExistingAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = getHeaders();
      const [teachersResponse, combinationsResponse, assignmentsResponse, autoConnectResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/mark-list/teachers`, { headers }),
        fetch(`${API_BASE_URL}/mark-list/subject-class-combinations`, { headers }),
        fetch(`${API_BASE_URL}/mark-list/teacher-assignments`, { headers }),
        fetch(`${API_BASE_URL}/mark-list/auto-connect-teachers`, { headers })
      ]);

      const [teachersData, combinationsData, assignmentsData, autoConnectData] = await Promise.all([
        teachersResponse.ok ? teachersResponse.json() : [],
        combinationsResponse.ok ? combinationsResponse.json() : [],
        assignmentsResponse.ok ? assignmentsResponse.json() : [],
        autoConnectResponse.ok ? autoConnectResponse.json() : []
      ]);

      const uniqueTeachersMap = new Map();
      (Array.isArray(teachersData) ? teachersData : []).forEach(t => {
        if (!t || !t.name) return;
        const normName = t.name.trim().toLowerCase();
        if (!uniqueTeachersMap.has(normName)) {
          uniqueTeachersMap.set(normName, { ...t, name: t.name.trim() });
        }
      });
      const uniqueTeachers = Array.from(uniqueTeachersMap.values());
      setTeachers(uniqueTeachers);

      const comboMap = new Map();
      (Array.isArray(combinationsData) ? combinationsData : []).forEach(c => {
        if (!c || !c.subject_class) return;
        const normSubClass = c.subject_class.trim().toLowerCase();
        comboMap.set(normSubClass, {
          subject_name: c.subject_name || c.subject_class.split(' Class ')[0] || c.subject_class,
          class_name: c.class_name || c.subject_class.split(' Class ')[1] || '',
          subject_class: c.subject_class.trim()
        });
      });

      const existingList = Array.isArray(assignmentsData) ? assignmentsData : [];
      existingList.forEach(a => {
        if (!a || !a.subject_class) return;
        const normSubClass = a.subject_class.trim().toLowerCase();
        if (!comboMap.has(normSubClass)) {
          const match = a.subject_class.match(/^(.+)\s+Class\s+(.+)$/i);
          comboMap.set(normSubClass, {
            subject_name: match ? match[1].trim() : a.subject_class.trim(),
            class_name: match ? match[2].trim() : '',
            subject_class: a.subject_class.trim()
          });
        }
      });

      const autoList = Array.isArray(autoConnectData) ? autoConnectData : [];
      autoList.forEach(a => {
        if (!a || !a.subject_class) return;
        const normSubClass = a.subject_class.trim().toLowerCase();
        if (!comboMap.has(normSubClass)) {
          const match = a.subject_class.match(/^(.+)\s+Class\s+(.+)$/i);
          comboMap.set(normSubClass, {
            subject_name: match ? match[1].trim() : a.subject_class.trim(),
            class_name: match ? match[2].trim() : '',
            subject_class: a.subject_class.trim()
          });
        }
      });

      const allCombinations = Array.from(comboMap.values());
      setSubjectClassCombinations(allCombinations);
      setExistingAssignments(existingList);

      const assignmentState = {};
      existingList.forEach(assignment => {
        if (!assignment.teacher_name || !assignment.subject_class) return;
        const key = `${assignment.teacher_name.trim().toLowerCase()}|||${assignment.subject_class.trim().toLowerCase()}`;
        assignmentState[key] = { checked: true, teacherName: assignment.teacher_name.trim(), subjectClass: assignment.subject_class.trim() };
      });

      autoList.forEach(conn => {
        if (!conn.teacher_name || !conn.subject_class) return;
        const key = `${conn.teacher_name.trim().toLowerCase()}|||${conn.subject_class.trim().toLowerCase()}`;
        if (!assignmentState[key]) {
          assignmentState[key] = { checked: 'auto', teacherName: conn.teacher_name.trim(), subjectClass: conn.subject_class.trim() };
        }
      });

      setAssignments(assignmentState);
      setMessage(`Loaded ${existingList.length} saved assignment(s) across ${uniqueTeachers.length} teacher(s)`);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage('Error loading data: ' + error.message);
    }
  };

  const handleAssignmentChange = (teacherName, subjectClass, isChecked) => {
    const key = `${teacherName.trim().toLowerCase()}|||${subjectClass.trim().toLowerCase()}`;
    setAssignments(prev => ({ ...prev, [key]: { checked: isChecked, teacherName: teacherName.trim(), subjectClass: subjectClass.trim() } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const assignmentsArray = [];
      Object.values(assignments).forEach(item => {
        if (item && (item.checked === true || item.checked === 'auto')) {
          if (item.teacherName && item.subjectClass) {
            assignmentsArray.push({ teacherName: item.teacherName, subjectClass: item.subjectClass });
          }
        }
      });

      const response = await fetch(`${API_BASE_URL}/mark-list/assign-teachers`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ assignments: assignmentsArray, managedTeachers: teachers.map(t => t.name) }),
      });

      const result = await response.json();
      if (response.ok) {
        setMessage('Teacher assignments saved successfully!');
        await fetchData();
      } else {
        setMessage(result.error || 'Failed to save assignments');
      }
    } catch (error) {
      setMessage('Error saving assignments: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (teachers.length === 0 || subjectClassCombinations.length === 0) {
    return (
      <div className="mlf-empty">
        <h3>No Data Available</h3>
        <p>{teachers.length === 0 ? 'No teachers found.' : 'No subject-class combinations found.'}</p>
      </div>
    );
  }

  return (
    <div className="mlf-card">
      <div className="mlf-card-header">
        <h2>Teacher-Subject Assignment</h2>
        <p>Assign teachers to subject-class combinations. Green = auto-connected from schedule.</p>
      </div>
      <form onSubmit={handleSubmit} className="mlf-assign-grid">
        <table className="mlf-table mlf-assign-table">
          <thead>
            <tr>
              <th>Teachers</th>
              {subjectClassCombinations.map(combo => (
                <th key={`${combo.subject_name}-${combo.class_name}`}>{combo.subject_name} <span className="mlf-class-tag">Class {combo.class_name}</span></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teachers.map(teacher => (
              <tr key={teacher.name}>
                <td className="mlf-teacher">{teacher.name}</td>
                {subjectClassCombinations.map(combo => {
                  const key = `${teacher.name.trim().toLowerCase()}|||${combo.subject_class.trim().toLowerCase()}`;
                  const state = assignments[key];
                  const isChecked = state?.checked === true || state?.checked === 'auto';
                  return (
                    <td key={`${combo.subject_name}-${combo.class_name}`} className="mlf-check-cell">
                      <label className="mlf-check">
                        <input type="checkbox" checked={isChecked} onChange={(e) => handleAssignmentChange(teacher.name, combo.subject_class, e.target.checked)} />
                        <span className={`mlf-checkmark ${state?.checked === 'auto' ? 'auto' : ''}`}>✓</span>
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {message && <div className={`mlf-alert ${message.includes('successfully') ? 'mlf-alert-success' : 'mlf-alert-error'}`}>{message}</div>}
        <button type="submit" disabled={loading} className="mlf-btn mlf-btn-primary">{loading ? 'Saving...' : 'Save Teacher Assignments'}</button>
      </form>
    </div>
  );
};

const MarkListManagement = () => {
  const [activeTab, setActiveTab] = useState('subjects');
  const tabs = [
    { id: 'subjects', label: 'Subject Setup', component: SubjectMappingSetup },
    { id: 'forms', label: 'Mark List Forms', component: MarkListForm },
    { id: 'teachers', label: 'Teacher Assignment', component: TeacherAssignment }
  ];
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="mlf-container">
      <div className="mlf-header">
        <h1>Mark List Management System</h1>
        <p>Manage subjects, mark list forms, and teacher assignments</p>
      </div>
      <div className="mlf-tabs">
        {tabs.map(tab => (
          <button key={tab.id} className={`mlf-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mlf-content">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
};

export default MarkListManagement;
