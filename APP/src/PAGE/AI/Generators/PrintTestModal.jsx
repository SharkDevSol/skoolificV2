import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FiDownload, FiX, FiPrinter } from 'react-icons/fi';

import { buildDocHtml, perPageFor } from './printTestDoc';

const PrintTestModal = ({ test, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [schoolName, setSchoolName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [componentMarks, setComponentMarks] = useState(null);
  const [timeLimit, setTimeLimit] = useState(0);
  const [studentCount, setStudentCount] = useState(null);
  const [mode, setMode] = useState('one');      // one | n | class
  const [nCopies, setNCopies] = useState(3);
  const [perPageChoice, setPerPageChoice] = useState('auto');
  const [busy, setBusy] = useState(false);
  const [doneMsg, setDoneMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tRes, mlRes, stRes, adminRes, setRes] = await Promise.all([
        axios.get('/api/ai/get-test', {
          params: {
            subject: test.subject,
            className: test.className,
            termNumber: test.termNumber,
            componentName: test.componentName
          }
        }),
        axios.get(`/api/mark-list/mark-list/${encodeURIComponent(test.subject)}/${encodeURIComponent(test.className)}/${test.termNumber}`)
          .catch(() => null),
        axios.get('/api/ai/class-students-full', { params: { className: test.className } })
          .catch(() => null),
        axios.get('/api/admin/branding').catch(() => null),
        axios.get('/api/settings/branding').catch(() => null)
      ]);

      setQuestions(tRes.data?.data?.questions || []);
      setTimeLimit(parseInt(tRes.data?.data?.timeLimit, 10) || 0);

      const cfg = mlRes?.data?.config || mlRes?.data || null;
      const comps = cfg && Array.isArray(cfg.mark_components) ? cfg.mark_components : [];
      const comp = comps.find((c) => c && c.name === test.componentName);
      setComponentMarks(comp && comp.percentage != null ? comp.percentage : null);

      setStudentCount(Array.isArray(stRes?.data?.data) ? stRes.data.data.length : 0);

      const b = adminRes?.data || {};
      const s = setRes?.data || {};
      setSchoolName(s.schoolNameEnglish || b.website_name || '');
      const file = b.school_logo || b.website_icon || '';
      setLogoUrl(file ? `${window.location.origin}/uploads/branding/${file}` : '');

      if (!tRes.data?.data?.questions?.length) setError('This test has no questions to print.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load the test for printing');
    } finally {
      setLoading(false);
    }
  }, [test]);

  useEffect(() => { load(); }, [load]);

  const copiesAvailable = mode === 'one' ? 1 : (mode === 'n' ? Math.max(2, Math.min(100, parseInt(nCopies, 10) || 2)) : Math.max(1, studentCount || 1));
  // auto = flow mode: no forced page breaks inside a copy, Word fills each page
  const perPage = perPageChoice === 'auto' ? 0 : parseInt(perPageChoice, 10);
  const estPerPage = perPage > 0 ? perPage : perPageFor(questions);
  const pagesPerCopy = Math.max(1, Math.ceil(questions.length / estPerPage));
  const totalPages = pagesPerCopy * copiesAvailable;

  const download = async () => {
    if (!questions.length || busy) return;
    setBusy(true);
    setDoneMsg('');
    setError('');
    try {
      const { html, copiesCount } = buildDocHtml({
        test, questions, schoolName, logoUrl, componentMarks, timeLimit, perPage, copiesAvailable
      });
      const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${test.subject}_${test.className}_term${test.termNumber}_${test.componentName}_${copiesCount}_copies.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setDoneMsg(`Downloaded: ${copiesCount} copy/copies, about ${totalPages} page(s)${perPage > 0 ? ` (${perPage} questions per page)` : ' (pages filled to the bottom — no empty space)'}. Open the .doc file and print it from Word or LibreOffice (File → Print) — the answers are never printed.`);
    } catch (err) {
      setError('Failed to build the file: ' + (err.message || 'unknown error'));
    } finally {
      setBusy(false);
    }
  };

  const fieldBox = {
    border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px 14px', margin: '0 0 12px',
    background: '#f9fafb'
  };
  const radioRow = { display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', fontSize: '0.9rem' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', width: 'min(620px, 96vw)', maxHeight: '92vh', overflow: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiPrinter /> Print / Download test
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#6b7280' }}>
              {test.subject} · {String(test.className || '').toUpperCase()} ·{' '}
              {String(test.componentName || '').replace(/_/g, ' ').toUpperCase()} · Term {test.termNumber}
              {componentMarks != null ? ` · ${componentMarks} marks` : ''}
            </p>
          </div>
          <button onClick={onClose} title="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6b7280', padding: '2px 6px' }}>
            <FiX />
          </button>
        </div>

        {error && (
          <p style={{ margin: '12px 0', fontSize: '0.86rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 10px' }}>
            {error}
          </p>
        )}

        {loading ? (
          <p style={{ margin: '18px 0', color: '#6b7280' }}>Loading questions…</p>
        ) : (
          <>
            <div style={fieldBox}>
              <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '0.86rem' }}>How many copies?</p>
              <label style={radioRow}>
                <input type="radio" name="copies" checked={mode === 'one'} onChange={() => setMode('one')} />
                1 copy ({questions.length} question{questions.length === 1 ? '' : 's'}, {pagesPerCopy} page{pagesPerCopy === 1 ? '' : 's'})
              </label>
              <label style={radioRow}>
                <input type="radio" name="copies" checked={mode === 'n'} onChange={() => setMode('n')} />
                N copies
                <input
                  type="number" min="2" max="100" value={nCopies} disabled={mode !== 'n'}
                  onChange={(e) => setNCopies(e.target.value)}
                  style={{ width: '70px', padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
                <span style={{ color: '#6b7280', fontSize: '0.82rem' }}>(each copy has its own shuffled order)</span>
              </label>
              <label style={radioRow}>
                <input type="radio" name="copies" checked={mode === 'class'} onChange={() => setMode('class')} />
                For the whole class — {studentCount == null ? '…' : `${studentCount} student${studentCount === 1 ? '' : 's'}`} (copies are numbered, no names)
              </label>
              {mode === 'class' && studentCount === 0 && (
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#b91c1c' }}>
                  No active students found in this class — use “N copies” instead.
                </p>
              )}
            </div>

            <div style={fieldBox}>
              <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '0.86rem' }}>How the page is filled</p>
              <label style={radioRow}>
                <input type="radio" name="perpage" checked={perPageChoice === 'auto'} onChange={() => setPerPageChoice('auto')} />
                <span><strong>Fill the page</strong> (recommended) — questions flow to the very bottom, no empty space left</span>
              </label>
              <label style={radioRow}>
                <input type="radio" name="perpage" checked={perPageChoice === '15'} onChange={() => setPerPageChoice('15')} />
                Fixed: 15 questions per page (text-heavy papers)
              </label>
              <label style={radioRow}>
                <input type="radio" name="perpage" checked={perPageChoice === '20'} onChange={() => setPerPageChoice('20')} />
                Fixed: 20 questions per page
              </label>
              <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
                Margins are already slim (0.9 cm top/bottom, 1.1 cm sides) so the whole sheet is used.
              </p>
            </div>

            <p style={{ margin: '0 0 12px', fontSize: '0.84rem', color: '#6b7280' }}>
              A4 paper · header with the school logo + “Exam of {test.subject} {String(test.className || '').toUpperCase()} {String(test.componentName || '').replace(/_/g, ' ').toUpperCase()} from {componentMarks != null ? componentMarks : '—'} marks Term {test.termNumber}”
              · {copiesAvailable} cop{copiesAvailable === 1 ? 'y' : 'ies'} ≈ {totalPages} page{totalPages === 1 ? '' : 's'}.
            </p>

            {doneMsg && (
              <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#166534', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 10px' }}>
                ✅ {doneMsg}
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{ background: '#e5e7eb', border: 'none', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer', fontWeight: 600 }}
              >
                Close
              </button>
              <button
                onClick={download}
                disabled={busy || !questions.length}
                style={{
                  background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px',
                  padding: '10px 18px', cursor: busy ? 'wait' : 'pointer', fontWeight: 700,
                  opacity: busy || !questions.length ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <FiDownload /> {busy ? 'Building file…' : 'Download .doc'}
              </button>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: '0.8rem', color: '#9ca3af' }}>
              The file downloads to your computer — print it afterwards from Word/LibreOffice (the school PC).
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default PrintTestModal;
