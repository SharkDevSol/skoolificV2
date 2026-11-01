import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../utils/api';
import styles from './SmsTemplates.module.css';
import {
  MessageSquare,
  Check,
  X,
  Edit2,
  Send,
  AlertTriangle,
  RefreshCw,
  Layers,
  Users,
  Eye,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  Clock,
  Power
} from 'lucide-react';

const TEMPLATE_METADATA = {
  absence_alert: {
    title: 'Daily Absence Alert SMS',
    desc: 'Sent when a student is recorded absent on a school day.',
    variables: ['{guardian_name}', '{student_name}', '{class_name}', '{date}', '{school_name}']
  },
  mark_report: {
    title: 'Term Mark Report SMS (4x / Year)',
    desc: 'Aggregates student subject marks and totals for the selected term to send to guardians.',
    variables: ['{guardian_name}', '{student_name}', '{class_name}', '{term_name}', '{marks_summary}', '{school_name}']
  },
  payment_reminder: {
    title: 'Payment Reminder SMS',
    desc: 'Monthly tuition fee reminder sent to guardians (must be > 100 characters).',
    variables: ['{guardian_name}', '{student_name}', '{month_name}', '{amount_due}', '{school_name}']
  },
  payment_receipt: {
    title: 'Payment Receipt Confirmation SMS',
    desc: 'Sent immediately when a fee payment is recorded in Finance.',
    variables: ['{guardian_name}', '{student_name}', '{months_paid}', '{amount_paid}', '{school_name}']
  },
  guardian_welcome: {
    title: 'Guardian Account Welcome SMS',
    desc: 'Sent with username & password when a guardian account is created.',
    variables: ['{guardian_name}', '{guardian_username}', '{guardian_password}', '{student_name}', '{school_name}']
  },
  student_welcome: {
    title: 'Student Account Welcome SMS',
    desc: 'Sent with credentials for the student learning portal.',
    variables: ['{student_name}', '{student_username}', '{student_password}', '{school_name}']
  },
  staff_welcome: {
    title: 'Staff Account Welcome SMS',
    desc: 'Sent with credentials when a new teacher or staff member is added.',
    variables: ['{staff_name}', '{Branch}', '{branchcode}', '{staff_username}', '{staff_password}']
  }
};

const SmsTemplates = () => {
  // Tabs: 'templates' | 'markReports'
  const [activeTab, setActiveTab] = useState('templates');

  // Templates state
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [togglingKey, setTogglingKey] = useState(null);
  const [alert, setAlert] = useState(null);
  const textareaRef = useRef(null);

  // Term Mark Reports state
  const [terms, setTerms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [selectedClass, setSelectedClass] = useState('all');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [forceResend, setForceResend] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  // Sending modal & progress state
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendingMarks, setSendingMarks] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendResultSummary, setSendResultSummary] = useState(null);

  useEffect(() => {
    fetchTemplates();
    fetchTermsAndClasses();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const res = await api.get('/sms/templates');
      if (res.data.success) {
        setTemplates(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching SMS templates:', err);
      showAlert('error', 'Failed to fetch SMS templates.');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const fetchTermsAndClasses = async () => {
    try {
      const [termsRes, classesRes] = await Promise.all([
        api.get('/sms/mark-report/terms').catch(() => ({ data: { success: false } })),
        api.get('/sms/mark-report/classes').catch(() => ({ data: { success: false } }))
      ]);

      if (termsRes.data?.success) {
        setTerms(termsRes.data.data);
        if (termsRes.data.data.length > 0) {
          setSelectedTerm(termsRes.data.data[0].termNumber);
        }
      }
      if (classesRes.data?.success) {
        setClasses(classesRes.data.data);
      }
    } catch (e) {
      console.warn('Error fetching terms/classes:', e.message);
    }
  };

  const showAlert = (type, text) => {
    setAlert({ type, text });
    setTimeout(() => {
      setAlert(null);
    }, 6000);
  };

  // Toggle switch handler
  const handleToggleActive = async (tmpl) => {
    const nextState = !tmpl.is_active;
    const key = tmpl.template_key;
    setTogglingKey(key);

    // Optimistic UI update
    setTemplates(prev =>
      prev.map(t => (t.template_key === key ? { ...t, is_active: nextState } : t))
    );

    try {
      const res = await api.put(`/sms/templates/${key}/toggle`, { is_active: nextState });
      if (res.data.success) {
        const title = TEMPLATE_METADATA[key]?.title || key;
        showAlert(
          'success',
          `✅ ${title} is now ${nextState ? 'ACTIVE (Will send SMS)' : 'INACTIVE (SMS paused & credits saved)'}`
        );
      }
    } catch (error) {
      console.error('Error toggling SMS template:', error);
      // Revert on error
      setTemplates(prev =>
        prev.map(t => (t.template_key === key ? { ...t, is_active: !nextState } : t))
      );
      showAlert('error', `Failed to update status for ${key}`);
    } finally {
      setTogglingKey(null);
    }
  };

  const handleEdit = (tmpl) => {
    setEditing(tmpl);
    setEditText(tmpl.template_text);
  };

  const handleInsertVariable = (varName) => {
    if (!editing) return;
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart || 0;
      const end = el.selectionEnd || 0;
      const updated = editText.substring(0, start) + varName + editText.substring(end);
      setEditText(updated);
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + varName.length;
        el.focus();
      }, 50);
    } else {
      setEditText(prev => prev + ' ' + varName);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editing || !editText.trim()) return;
    if (editing.template_key === 'payment_reminder' && editText.trim().length <= 100) {
      showAlert('error', '⚠️ Payment reminder template must be more than 100 characters in length.');
      return;
    }

    setSavingTemplate(true);
    try {
      const res = await api.put(`/sms/templates/${editing.template_key}`, {
        template_text: editText.trim()
      });
      if (res.data.success) {
        showAlert('success', `✅ Template updated successfully.`);
        setEditing(null);
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error saving template:', error);
      showAlert('error', 'Failed to save template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Fetch mark report preview
  const loadMarkReportPreview = async () => {
    setLoadingPreview(true);
    setPreviewData(null);
    setSelectedStudents({});
    setSendResultSummary(null);

    try {
      const res = await api.get('/sms/mark-report/preview', {
        params: {
          termNumber: selectedTerm,
          className: selectedClass
        }
      });

      if (res.data.success) {
        const data = res.data.data;
        setPreviewData(data);

        // Preselect all eligible students (has valid phone and not already sent unless forced)
        const initialSelected = {};
        (data.students || []).forEach(st => {
          if (st.hasPhone && (!st.alreadySent || forceResend)) {
            initialSelected[`${st.className}:::${st.studentName}`] = true;
          }
        });
        setSelectedStudents(initialSelected);
      }
    } catch (err) {
      console.error('Error fetching mark report preview:', err);
      showAlert('error', 'Failed to aggregate student marks.');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Filtered students in Tab 2
  const filteredStudents = useMemo(() => {
    if (!previewData?.students) return [];
    return previewData.students.filter(st => {
      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = st.studentName.toLowerCase().includes(q);
        const matchesPhone = String(st.guardianPhone || '').includes(q);
        const matchesGuardian = st.guardianName.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesGuardian) return false;
      }
      // Status filter
      if (statusFilter === 'ready') return st.hasPhone && !st.alreadySent;
      if (statusFilter === 'alreadySent') return st.alreadySent;
      if (statusFilter === 'missingPhone') return !st.hasPhone;
      if (statusFilter === 'hasMarks') return st.hasMarks;
      return true;
    });
  }, [previewData, searchQuery, statusFilter]);

  const toggleSelectAll = () => {
    const allFilteredKeys = filteredStudents
      .filter(st => st.hasPhone && (!st.alreadySent || forceResend))
      .map(st => `${st.className}:::${st.studentName}`);

    const allSelected = allFilteredKeys.every(k => selectedStudents[k]);
    const updated = { ...selectedStudents };

    allFilteredKeys.forEach(k => {
      if (allSelected) {
        delete updated[k];
      } else {
        updated[k] = true;
      }
    });

    setSelectedStudents(updated);
  };

  const handleStudentCheck = (key) => {
    setSelectedStudents(prev => {
      const updated = { ...prev };
      if (updated[key]) {
        delete updated[key];
      } else {
        updated[key] = true;
      }
      return updated;
    });
  };

  // Dispatch mark reports
  const handleSendConfirmed = async () => {
    if (!previewData?.students) return;

    const studentsToSend = previewData.students.filter(st => {
      const key = `${st.className}:::${st.studentName}`;
      return selectedStudents[key] && st.hasPhone;
    });

    if (studentsToSend.length === 0) {
      showAlert('warning', 'No students selected for sending.');
      setShowSendModal(false);
      return;
    }

    setSendingMarks(true);
    setSendProgress(20);

    try {
      const res = await api.post('/sms/mark-report/send', {
        termNumber: selectedTerm,
        students: studentsToSend,
        force: forceResend
      });

      setSendProgress(100);

      if (res.data.success) {
        const stats = res.data.data;
        setSendResultSummary(stats);
        showAlert(
          'success',
          `🎉 Dispatched! Sent: ${stats.sent}, Skipped: ${stats.skipped}, Failed: ${stats.failed}.`
        );
        setShowSendModal(false);
        // Refresh preview to reflect updated deduplication status
        loadMarkReportPreview();
      }
    } catch (err) {
      console.error('Error sending mark reports:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to dispatch mark reports.';
      showAlert('error', msg);
    } finally {
      setSendingMarks(false);
      setShowSendModal(false);
    }
  };

  const selectedCount = Object.keys(selectedStudents).length;
  const estimatedCredits = useMemo(() => {
    if (!previewData?.students) return 0;
    return previewData.students
      .filter(st => selectedStudents[`${st.className}:::${st.studentName}`])
      .reduce((sum, st) => sum + (st.segments || 1), 0);
  }, [previewData, selectedStudents]);

  const markReportTemplate = templates.find(t => t.template_key === 'mark_report');
  const isMarkReportActive = markReportTemplate?.is_active !== false;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitleRow}>
          <div>
            <h1>SMS Notification Center</h1>
            <p>Configure automated SMS triggers, control active notification switches, and dispatch Term Mark Reports.</p>
          </div>
          <div className={styles.editActions}>
            <button
              onClick={() => {
                fetchTemplates();
                if (previewData) loadMarkReportPreview();
              }}
              className={styles.btnSecondary}
            >
              <RefreshCw size={15} /> Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsBar}>
        <button
          className={`${styles.tabButton} ${activeTab === 'templates' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <Power size={17} /> SMS Types & Active Switches
          <span className={styles.tabBadge}>
            {templates.filter(t => t.is_active).length}/{templates.length} Active
          </span>
        </button>

        <button
          className={`${styles.tabButton} ${activeTab === 'markReports' ? styles.tabButtonActive : ''}`}
          onClick={() => {
            setActiveTab('markReports');
            if (!previewData && !loadingPreview) loadMarkReportPreview();
          }}
        >
          <Layers size={17} /> Term Mark Reports (4x / Year)
          {isMarkReportActive ? (
            <span className={`${styles.statusBadge} ${styles.statusReady}`}>ON</span>
          ) : (
            <span className={`${styles.statusBadge} ${styles.statusDanger}`}>OFF</span>
          )}
        </button>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div
          className={`${styles.alertMessage} ${
            alert.type === 'success'
              ? styles.alertSuccess
              : alert.type === 'warning'
              ? styles.alertWarning
              : styles.alertError
          }`}
        >
          <span>{alert.text}</span>
          <button
            onClick={() => setAlert(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* TAB 1: SMS TEMPLATES & TOGGLES */}
      {activeTab === 'templates' && (
        <div>
          {loadingTemplates ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <RefreshCw size={24} className="spin" /> Loading SMS templates...
            </div>
          ) : (
            <div className={styles.templateList}>
              {templates.map(tmpl => {
                const meta = TEMPLATE_METADATA[tmpl.template_key] || {
                  title: tmpl.template_key,
                  desc: 'Custom template',
                  variables: []
                };
                const isEditingThis = editing?.id === tmpl.id;
                const charCount = isEditingThis ? editText.length : (tmpl.template_text?.length || 0);
                const segments = Math.max(1, Math.ceil(charCount / 159));

                return (
                  <div
                    key={tmpl.id}
                    className={`${styles.templateCard} ${
                      !tmpl.is_active ? styles.templateCardInactive : ''
                    }`}
                  >
                    <div className={styles.templateHeader}>
                      <div className={styles.templateHeaderLeft}>
                        <div>
                          <h3 className={styles.templateTitle}>{meta.title}</h3>
                          <span className={styles.templateKeyBadge}>{tmpl.template_key}</span>
                        </div>
                      </div>

                      {/* Interactive Toggle Switch */}
                      <div className={styles.switchWrapper}>
                        <span
                          className={`${styles.switchLabel} ${
                            tmpl.is_active ? styles.switchLabelActive : styles.switchLabelInactive
                          }`}
                        >
                          {tmpl.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <label className={styles.toggleSwitch}>
                          <input
                            type="checkbox"
                            checked={Boolean(tmpl.is_active)}
                            disabled={togglingKey === tmpl.template_key}
                            onChange={() => handleToggleActive(tmpl)}
                          />
                          <span className={styles.toggleSlider}></span>
                        </label>
                      </div>
                    </div>

                    <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#64748b' }}>
                      {meta.desc}
                    </p>

                    {/* Available Variables (clickable to insert) */}
                    <div className={styles.variablesBox}>
                      <strong>Available Variables (Click to insert):</strong>
                      <div className={styles.variablePills}>
                        {meta.variables.map(v => (
                          <span
                            key={v}
                            className={styles.varPill}
                            onClick={() => handleInsertVariable(v)}
                            title="Click to insert at cursor position"
                          >
                            + {v}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Counters */}
                    <div className={styles.charCountRow}>
                      <span>
                        Characters: <strong>{charCount}</strong>
                      </span>
                      <span className={styles.segmentBadge}>
                        {segments} SMS Credit{segments > 1 ? 's' : ''} per parent
                      </span>
                      {tmpl.template_key === 'payment_reminder' && (
                        <span
                          className={charCount > 100 ? styles.validLength : styles.invalidLength}
                        >
                          {charCount > 100 ? '✓ Valid length' : '⚠️ Must be > 100 characters'}
                        </span>
                      )}
                    </div>

                    {/* Edit or Display Area */}
                    {isEditingThis ? (
                      <div className={styles.editArea}>
                        <textarea
                          ref={textareaRef}
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          rows={6}
                          className={styles.editTextarea}
                        />
                        <div className={styles.editActions}>
                          <button
                            onClick={handleSaveTemplate}
                            disabled={savingTemplate}
                            className={styles.btnSuccess}
                          >
                            <Check size={16} /> {savingTemplate ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className={styles.btnSecondary}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className={styles.templateText}>{tmpl.template_text}</div>
                        <div className={styles.editActions}>
                          <button
                            onClick={() => handleEdit(tmpl)}
                            className={styles.btnPrimary}
                          >
                            <Edit2 size={15} /> Edit Template
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TERM MARK REPORTS */}
      {activeTab === 'markReports' && (
        <div>
          {/* Warning banner if Mark Report is turned OFF */}
          {!isMarkReportActive && (
            <div className={`${styles.alertMessage} ${styles.alertWarning}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} />
                <span>
                  <strong>Mark Report SMS is currently INACTIVE.</strong> Automated and manual sends are paused to preserve your SMS credits.
                </span>
              </div>
              <button
                className={styles.quickActionBtn}
                onClick={() => {
                  if (markReportTemplate) handleToggleActive(markReportTemplate);
                }}
              >
                Turn ON Mark Reports
              </button>
            </div>
          )}

          {/* Latest Dispatch Summary */}
          {sendResultSummary && (
            <div className={`${styles.alertMessage} ${styles.alertSuccess}`}>
              <span>
                <strong>Latest Dispatch Summary:</strong> Total: {sendResultSummary.total} • Sent: {sendResultSummary.sent} • Skipped: {sendResultSummary.skipped} • Failed: {sendResultSummary.failed}
              </span>
              <button
                onClick={() => setSendResultSummary(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Controls Bar */}
          <div className={styles.controlsCard}>
            <div className={styles.selectorsRow}>
              {/* Term Selector */}
              <div className={styles.selectGroup}>
                <label>Academic Term (Ethiopian Calendar):</label>
                <select
                  value={selectedTerm}
                  onChange={e => setSelectedTerm(Number(e.target.value))}
                  className={styles.selectInput}
                >
                  {terms && terms.length > 0 ? (
                    terms.map(t => (
                      <option key={t.termNumber} value={t.termNumber}>
                        {t.name} — {t.period}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value={1}>Term 1 — Meskerem to Hidar (Mid-Semester 1)</option>
                      <option value={2}>Term 2 — Tahsas to Tir (End of Semester 1)</option>
                      <option value={3}>Term 3 — Yakatit to Miazia (Mid-Semester 2)</option>
                      <option value={4}>Term 4 — Ginbot to Sene (End of Semester 2)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Class Selector */}
              <div className={styles.selectGroup}>
                <label>Filter by Class:</label>
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className={styles.selectInput}
                >
                  <option value="all">All Classes (Whole School)</option>
                  {classes.map(c => (
                    <option key={c} value={c}>
                      Class {c}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ alignSelf: 'flex-end' }}>
                <button
                  onClick={loadMarkReportPreview}
                  disabled={loadingPreview}
                  className={styles.btnPrimary}
                  style={{ height: '42px' }}
                >
                  <RefreshCw size={16} className={loadingPreview ? 'spin' : ''} />
                  {loadingPreview ? 'Aggregating Marks...' : 'Load Mark Reports'}
                </button>
              </div>
            </div>

            {/* Resend Override Option */}
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={forceResend}
                onChange={e => setForceResend(e.target.checked)}
              />
              <span>Allow resending to students who already received a report for Term {selectedTerm}</span>
            </label>
          </div>

          {/* Summary Stats Grid */}
          {previewData && (
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{previewData.stats.totalStudents}</div>
                <div className={styles.statLabel}>Total Students</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue} style={{ color: '#16a34a' }}>
                  {previewData.stats.totalWithPhone}
                </div>
                <div className={styles.statLabel}>Valid Guardian Phones</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue} style={{ color: '#2563eb' }}>
                  {previewData.stats.totalWithMarks}
                </div>
                <div className={styles.statLabel}>Students with Marks</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue} style={{ color: '#7c3aed' }}>
                  {previewData.stats.alreadySentCount}
                </div>
                <div className={styles.statLabel}>Already Sent for Term {selectedTerm}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue} style={{ color: '#d97706' }}>
                  {estimatedCredits}
                </div>
                <div className={styles.statLabel}>Estimated SMS Credits</div>
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          {previewData && (
            <div className={styles.tableControls}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search by student name or phone..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className={styles.selectInput}
                  style={{ padding: '8px 12px' }}
                >
                  <option value="all">All Students</option>
                  <option value="ready">Ready to Send</option>
                  <option value="alreadySent">Already Sent</option>
                  <option value="missingPhone">Missing Phone</option>
                  <option value="hasMarks">Has Marks</option>
                </select>
              </div>

              <div className={styles.filterGroup}>
                <button onClick={toggleSelectAll} className={styles.btnSecondary}>
                  Toggle Select All
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          {loadingPreview ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <RefreshCw size={28} className="spin" style={{ color: '#2563eb', marginBottom: '12px' }} />
              <p style={{ color: '#64748b' }}>Pulling subject mark tables and rendering templates...</p>
            </div>
          ) : previewData ? (
            <div className={styles.tableWrapper}>
              <table className={styles.studentTable}>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={
                          filteredStudents.length > 0 &&
                          filteredStudents
                            .filter(st => st.hasPhone && (!st.alreadySent || forceResend))
                            .every(st => selectedStudents[`${st.className}:::${st.studentName}`])
                        }
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>Student & Class</th>
                    <th>Guardian & Phone</th>
                    <th>Marks Summary</th>
                    <th>Status</th>
                    <th>Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                        No students found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(st => {
                      const key = `${st.className}:::${st.studentName}`;
                      const isSelected = Boolean(selectedStudents[key]);
                      const isExpanded = expandedRow === key;

                      return (
                        <React.Fragment key={key}>
                          <tr>
                            <td>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={!st.hasPhone || (st.alreadySent && !forceResend)}
                                onChange={() => handleStudentCheck(key)}
                              />
                            </td>
                            <td>
                              <span className={styles.studentNameCol}>{st.studentName}</span>
                              <span className={styles.classBadge}>{st.className}</span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 500 }}>{st.guardianName}</div>
                              <div style={{ fontSize: '12px', color: st.hasPhone ? '#16a34a' : '#dc2626' }}>
                                {st.guardianPhone || 'Missing Phone'}
                              </div>
                            </td>
                            <td>
                              <span className={styles.marksSummaryText}>
                                {st.marksSummary}
                              </span>
                            </td>
                            <td>
                              {st.alreadySent ? (
                                <span className={`${styles.statusBadge} ${styles.statusSent}`}>
                                  ✓ Sent
                                </span>
                              ) : !st.hasPhone ? (
                                <span className={`${styles.statusBadge} ${styles.statusDanger}`}>
                                  No Phone
                                </span>
                              ) : !st.hasMarks ? (
                                <span className={`${styles.statusBadge} ${styles.statusWarning}`}>
                                  No Marks
                                </span>
                              ) : (
                                <span className={`${styles.statusBadge} ${styles.statusReady}`}>
                                  Ready
                                </span>
                              )}
                            </td>
                            <td>
                              <button
                                onClick={() => setExpandedRow(isExpanded ? null : key)}
                                className={styles.btnSecondary}
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <Eye size={14} />}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Rendered Message Preview */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} style={{ background: '#f8fafc', padding: '14px 20px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                  SMS Message to Guardian ({st.charCount} chars • {st.segments} Credit{st.segments > 1 ? 's' : ''}):
                                </div>
                                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 14px', fontFamily: 'monospace', fontSize: '13px', color: '#1e293b' }}>
                                  {st.renderedMessage}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : null}

          {/* Sticky Bottom Action Bar */}
          {previewData && selectedCount > 0 && (
            <div className={styles.bottomActionBar}>
              <div className={styles.bottomBarLeft}>
                <CheckCircle2 size={20} color="#22c55e" />
                <span>
                  <strong>{selectedCount}</strong> Student{selectedCount > 1 ? 's' : ''} selected
                </span>
                <span>•</span>
                <span>
                  Estimated Cost: <strong>{estimatedCredits} SMS Credits</strong>
                </span>
              </div>
              <div>
                <button
                  onClick={() => setShowSendModal(true)}
                  disabled={sendingMarks}
                  className={styles.btnSuccess}
                  style={{ padding: '10px 22px', fontSize: '14px' }}
                >
                  <Send size={16} /> Send Mark Reports
                </button>
              </div>
            </div>
          )}

          {/* Confirmation Modal */}
          {showSendModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContent}>
                <h3 className={styles.modalTitle}>Confirm Mark Report SMS Dispatch</h3>
                <div className={styles.modalBody}>
                  <p>
                    You are about to dispatch <strong>Term {selectedTerm}</strong> mark reports to:
                  </p>
                  <ul>
                    <li>
                      Recipients: <strong>{selectedCount} guardians</strong>
                    </li>
                    <li>
                      Class scope: <strong>{selectedClass === 'all' ? 'All Classes' : selectedClass}</strong>
                    </li>
                    <li>
                      Estimated Total SMS Credits: <strong>{estimatedCredits}</strong>
                    </li>
                    <li>
                      Deduplication: Prevents double-sending to the same parent for Term {selectedTerm}.
                    </li>
                  </ul>

                  {!isMarkReportActive && (
                    <p style={{ color: '#dc2626', fontWeight: 600 }}>
                      ⚠️ Warning: The Mark Report toggle is currently OFF. Toggling it ON or confirming will dispatch via override.
                    </p>
                  )}

                  {sendingMarks && (
                    <div>
                      <p>Sending messages... Please wait.</p>
                      <div className={styles.progressBarContainer}>
                        <div
                          className={styles.progressBarFill}
                          style={{ width: `${sendProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.modalActions}>
                  <button
                    onClick={() => setShowSendModal(false)}
                    disabled={sendingMarks}
                    className={styles.btnSecondary}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendConfirmed}
                    disabled={sendingMarks}
                    className={styles.btnSuccess}
                  >
                    {sendingMarks ? 'Sending...' : 'Confirm & Send Now'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmsTemplates;
