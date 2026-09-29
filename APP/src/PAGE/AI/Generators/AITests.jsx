import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiList, FiPlay, FiRefreshCw, FiSend, FiTrash2, FiPrinter } from 'react-icons/fi';
import styles from './AITests.module.css';
import PublishModal from './PublishModal';
import PrintTestModal from './PrintTestModal';
import StudentResults from './StudentResults';

const AITests = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [target, setTarget] = useState(null); // test being published
  const [printing, setPrinting] = useState(null); // test being printed/downloaded
  const [deleting, setDeleting] = useState(null); // test pending delete confirmation
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [tab, setTab] = useState('tests'); // 'tests' | 'results'

  const fetchTests = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/ai/list-tests');
      if (res.data.success) {
        setTests(res.data.data);
        setTarget((prev) => {
          if (!prev) return null;
          const fresh = res.data.data.find((t) => t.id === prev.id);
          return fresh || null;
        });
      } else {
        setError(res.data.error || 'Failed to load tests');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTests(); }, []);

  const playTest = (t) => {
    const params = new URLSearchParams({
      subject: t.subject,
      class: t.className,
      term: t.termNumber,
      component: t.componentName
    });
    navigate(`/ai-test-player?${params.toString()}`);
  };

  const confirmDelete = async () => {
    const t = deleting;
    if (!t || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await axios.post('/api/ai/delete-test', { schemaName: t.schemaName, tableName: t.tableName });
      setDeleting(null);
      await fetchTests();
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete the test');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}><FiList /></div>
        <div>
          <h1>{tab === 'results' ? 'Student Results' : 'Saved AI Tests'}</h1>
          <p>
            {tab === 'results'
              ? 'Every attempt the moment a student submits — no waiting for the result delay'
              : 'Play a test, or Publish it to your students (password + student selection)'}
          </p>
        </div>
        {tab === 'tests' && <button className={styles.refreshBtn} onClick={fetchTests}><FiRefreshCw /> Refresh</button>}
      </div>

      <div className={styles.tabs} role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'tests'}
          className={`${styles.tab} ${tab === 'tests' ? styles.tabActive : ''}`}
          onClick={() => setTab('tests')}
        >
          Saved Tests
        </button>
        <button
          role="tab"
          aria-selected={tab === 'results'}
          className={`${styles.tab} ${tab === 'results' ? styles.tabActive : ''}`}
          onClick={() => setTab('results')}
        >
          Student Results
        </button>
      </div>

      {tab === 'results' ? (
        <StudentResults />
      ) : (
      <>
      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.placeholder}>Loading tests...</div>
      ) : tests.length === 0 ? (
        <div className={styles.placeholder}>
          <p>No tests saved yet.</p>
          <p className={styles.sub}>Go to Test Generator to create your first test.</p>
          <button className={styles.generateBtn} onClick={() => navigate('/ai-test-generator')}>+ Create Test</button>
        </div>
      ) : (
        <div className={styles.testGrid}>
          {tests.map(t => (
            <div key={t.id} className={styles.testCard}>
              <div className={styles.testHeader}>
                <span className={styles.subjectBadge}>{t.subject}</span>
                <span className={styles.classBadge}>{String(t.className || '').toUpperCase()}</span>
                {t.practice && <span className={styles.practiceBadge}>Practice</span>}
                {t.published && <span className={styles.publishedBadge}>Published</span>}
              </div>
              <h3>{String(t.componentName || '').replace(/_/g, ' ').toUpperCase()}</h3>
              <p className={styles.meta}>Term {t.termNumber} · {t.questionCount} questions</p>
              {t.published && (
                <p className={styles.meta} style={{ color: '#7c3aed', fontWeight: 600 }}>
                  🔑 Password <span style={{ letterSpacing: '2px' }}>{t.password || '—'}</span>
                  {' · '}{t.allStudents ? 'All students' : `${t.allowedCount ?? 0} student(s)`}
                  {t.practice ? ' · practice' : ''}
                </p>
              )}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className={styles.playBtn} onClick={() => playTest(t)}><FiPlay /> Play Test</button>
                <button
                  className={styles.printBtn}
                  onClick={() => setPrinting(t)}
                  title="Print or download this test as a Word file"
                >
                  <FiPrinter /> Print / Download
                </button>
                <button className={styles.publishBtn} onClick={() => setTarget(t)}>
                  <FiSend /> {t.published ? 'Publish / Unpublish' : 'Publish'}
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => { setDeleteError(''); setDeleting(t); }}
                  title="Delete this test"
                >
                  <FiTrash2 /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      )}

      {deleting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', width: 'min(520px, 94vw)', boxShadow: '0 20px 50px rgba(0,0,0,.3)' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '18px' }}>Delete this test?</h3>
            <p style={{ margin: '0 0 6px', fontWeight: 700 }}>
              {deleting.subject} · {String(deleting.className || '').toUpperCase()} ·{' '}
              {String(deleting.componentName || '').replace(/_/g, ' ').toUpperCase()} · Term {deleting.termNumber}
            </p>
            <p style={{ margin: '0 0 4px', fontSize: '0.86rem', color: '#6b7280' }}>
              {deleting.questionCount} question(s) will be removed permanently.
            </p>
            <p style={{ margin: '0 0 14px', fontSize: '0.86rem', color: (deleting.attemptCount || deleting.published) ? '#b91c1c' : '#6b7280', fontWeight: (deleting.attemptCount || deleting.published) ? 700 : 400 }}>
              {deleting.attemptCount || 0} student attempt(s) will also be deleted.
              {deleting.published ? ' The published copy will be removed too.' : ''}
              <br />
              Marks already saved in the mark list stay unchanged.
            </p>
            {deleteError && (
              <p style={{ margin: '0 0 12px', fontSize: '0.86rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 10px' }}>
                {deleteError}
              </p>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleting(null)}
                style={{ background: '#e5e7eb', border: 'none', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteBusy}
                style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 16px', cursor: deleteBusy ? 'wait' : 'pointer', fontWeight: 700, opacity: deleteBusy ? 0.7 : 1 }}
              >
                {deleteBusy ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {target && (
        <PublishModal test={target} onClose={() => { setTarget(null); fetchTests(); }} onChanged={fetchTests} />
      )}

      {printing && (
        <PrintTestModal test={printing} onClose={() => setPrinting(null)} />
      )}
    </div>
  );
};

export default AITests;
