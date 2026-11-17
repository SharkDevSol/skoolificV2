import { useState } from 'react';
import axios from 'axios';
import { FiX, FiCalendar } from 'react-icons/fi';

const toLocalInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ResultSettingsModal = ({ test, onClose, onSaved }) => {
  const [when, setWhen] = useState(() => toLocalInput(test?.resultPublishAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!test) return null;

  const save = async () => {
    if (!when) { setError('Choose the date and time when results should be published'); return; }
    setBusy(true);
    setError('');
    try {
      const iso = new Date(when).toISOString();
      await axios.post('/api/ai/set-result-date', {
        schemaName: test.schemaName,
        tableName: test.tableName,
        resultPublishAt: iso,
      });
      if (onSaved) onSaved();
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save the result date');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', width: 'min(520px, 96vw)', boxShadow: '0 20px 50px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}><FiCalendar /> Result publish date</h3>
          <button onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1rem' }}><FiX /></button>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '6px 0 12px' }}>
          {test.subject} · {String(test.className || '').toUpperCase()} · Term {test.termNumber} ·{' '}
          <b>{String(test.componentName || '').replace(/_/g, ' ').toUpperCase()}</b>
        </p>
        <p style={{ fontSize: '0.85rem', color: '#374151', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '9px', padding: '9px 11px' }}>
          Students will see <b>“Result will be published on …”</b> after submitting. The score and answers unlock on the date you set here.
        </p>
        {!test.published && (
          <p style={{ fontSize: '0.82rem', color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '9px', padding: '9px 11px' }}>
            Publish this test to students first. The date can still be prepared now and saved after publishing.
          </p>
        )}
        <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', margin: '12px 0 4px' }}>Publish results on</label>
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '9px', fontSize: '0.95rem' }}
        />
        {when && (
          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '6px' }}>
            Students will see their score on {new Date(when).toLocaleString()}
          </p>
        )}
        {error && (
          <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 10px', fontSize: '0.85rem', marginTop: '10px' }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button onClick={save} disabled={busy} style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 16px', cursor: busy ? 'wait' : 'pointer', fontWeight: 700 }}>
            {busy ? 'Saving…' : 'Save result date'}
          </button>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ResultSettingsModal;
