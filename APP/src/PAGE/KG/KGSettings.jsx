import { useEffect, useState } from 'react';
import { FiSettings } from 'react-icons/fi';
import Card from '../../COMPONENTS/Card/Card';
import Button from '../../COMPONENTS/Button/Button';
import { fetchKGConfig, saveKGConfig } from '../../utils/kgApi';

export default function KGSettings() {
  const [termCount, setTermCount] = useState(2);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    let alive = true;
    fetchKGConfig()
      .then((cfg) => { if (alive) setTermCount(cfg.term_count); })
      .catch(() => { if (alive) setMessage({ type: 'error', text: 'Could not load KG settings' }); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await saveKGConfig(termCount);
      setMessage({ type: 'success', text: `KG now uses ${termCount} terms.` });
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.error || e.message || 'Could not save KG settings' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <FiSettings size={26} />
        <h1 style={{ margin: 0 }}>KG Settings</h1>
      </div>
      <p style={{ color: 'var(--text-secondary, #6b7280)', marginTop: 4 }}>
        Kindergarten-only settings. Normal classes are not affected.
      </p>

      <Card title="KG Terms" padding="lg">
        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <p style={{ marginTop: 0, fontWeight: 600 }}>How many terms should KG use?</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '16px 0' }}>
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTermCount(n)}
                  disabled={saving}
                  style={{
                    minWidth: 120,
                    padding: '14px 18px',
                    borderRadius: 12,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 15,
                    fontWeight: 700,
                    border: termCount === n ? '2px solid #6366f1' : '1px solid var(--border-color, #d1d5db)',
                    background: termCount === n ? 'rgba(99,102,241,0.12)' : 'var(--bg-secondary, #fff)',
                    color: 'var(--text-color, #111827)',
                  }}
                >
                  {n} Terms
                </button>
              ))}
            </div>
            <p style={{ color: 'var(--text-secondary, #6b7280)', fontSize: 13 }}>
              This controls the Term dropdown on KG Mark List, KG Create Mark List and KG Evaluation only.
            </p>
            {message.text && (
              <div
                style={{
                  margin: '12px 0',
                  padding: '10px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  background: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
                  color: message.type === 'error' ? '#dc2626' : '#16a34a',
                  border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
                }}
              >
                {message.text}
              </div>
            )}
            <Button variant="primary" onClick={save} loading={saving} disabled={saving}>
              Save KG Terms
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
