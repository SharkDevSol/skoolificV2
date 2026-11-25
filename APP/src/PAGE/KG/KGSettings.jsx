import { useEffect, useState } from 'react';
import { FiSettings, FiClock, FiAward, FiPlus, FiTrash2, FiRotateCcw } from 'react-icons/fi';
import Card from '../../COMPONENTS/Card/Card';
import Button from '../../COMPONENTS/Button/Button';
import {
  DEFAULT_GRADE_BANDS,
  fetchKGConfig,
  saveKGConfig,
} from '../../utils/kgApi';

const DEFAULT_TIMES = {
  check_in_start_time: '07:00',
  check_in_end_time: '08:30',
  late_threshold_time: '08:00',
  absent_marking_time: '09:00',
};

const timeInputStyle = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--border-color, #d1d5db)',
  fontFamily: 'inherit',
  fontSize: 14,
  width: '100%',
};

const smallInputStyle = {
  ...timeInputStyle,
  padding: '6px 8px',
  fontSize: 13,
};

const RankChoice = ({ value, current, onSelect, title, hint }) => (
  <button
    type="button"
    onClick={() => onSelect(value)}
    style={{
      flex: '1 1 160px',
      textAlign: 'left',
      padding: '12px 14px',
      borderRadius: 12,
      cursor: 'pointer',
      fontFamily: 'inherit',
      border: current === value ? '2px solid #6366f1' : '1px solid var(--border-color, #d1d5db)',
      background: current === value ? 'rgba(99,102,241,0.12)' : 'var(--bg-secondary, #fff)',
      color: 'var(--text-color, #111827)',
    }}
  >
    <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{hint}</div>
  </button>
);

export default function KGSettings() {
  const [termCount, setTermCount] = useState(2);
  const [times, setTimes] = useState({ ...DEFAULT_TIMES });
  const [gradeBands, setGradeBands] = useState(DEFAULT_GRADE_BANDS.map(b => ({ ...b })));
  const [rankDisplay, setRankDisplay] = useState('grade');
  const [passMark, setPassMark] = useState(50);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    let alive = true;
    fetchKGConfig()
      .then((cfg) => {
        if (!alive) return;
        setTermCount(cfg.term_count);
        setTimes({
          check_in_start_time: cfg.check_in_start_time,
          check_in_end_time: cfg.check_in_end_time,
          late_threshold_time: cfg.late_threshold_time,
          absent_marking_time: cfg.absent_marking_time,
        });
        setGradeBands((cfg.grade_bands || DEFAULT_GRADE_BANDS).map(b => ({ ...b })));
        setRankDisplay(cfg.rank_display || 'grade');
        setPassMark(Number.isFinite(Number(cfg.pass_mark)) ? Number(cfg.pass_mark) : 50);
      })
      .catch(() => { if (alive) setMessage({ type: 'error', text: 'Could not load KG settings' }); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const updateBand = (index, field, value) => {
    setGradeBands(prev => prev.map((band, i) => (
      i === index
        ? { ...band, [field]: field === 'grade' ? value : (value === '' ? '' : Number(value)) }
        : band
    )));
  };

  const addBand = () => {
    setGradeBands(prev => [...prev, { grade: '', min: 0, max: 0 }]);
  };

  const removeBand = (index) => {
    setGradeBands(prev => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    setMessage({ type: '', text: '' });

    // Basic client-side validation before sending
    const passMarkNumber = Number(passMark);
    if (!Number.isFinite(passMarkNumber) || passMarkNumber < 0 || passMarkNumber > 100) {
      setMessage({ type: 'error', text: 'Pass mark must be a number between 0 and 100.' });
      return;
    }
    for (const band of gradeBands) {
      if (!String(band.grade || '').trim()) {
        setMessage({ type: 'error', text: 'Every grade band needs a letter (A, B, C…).' });
        return;
      }
      const min = Number(band.min);
      const max = Number(band.max);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max > 100 || min > max) {
        setMessage({ type: 'error', text: 'Grade ranges must be between 0 and 100, with min ≤ max.' });
        return;
      }
    }

    setSaving(true);
    try {
      await saveKGConfig({
        termCount,
        ...times,
        passMark,
        gradeBands,
        rankDisplay,
      });
      setMessage({ type: 'success', text: 'KG settings saved.' });
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.error || e.message || 'Could not save KG settings' });
    } finally {
      setSaving(false);
    }
  };

  const resetBands = () => {
    setGradeBands(DEFAULT_GRADE_BANDS.map(b => ({ ...b })));
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <FiSettings size={26} />
        <h1 style={{ margin: 0 }}>KG Settings</h1>
      </div>
      <p style={{ color: 'var(--text-secondary, #6b7280)', marginTop: 4 }}>
        Kindergarten-only settings. Normal classes are not affected.
      </p>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card title="KG Terms" padding="lg">
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
          </Card>

          <Card title="Attendance Time" padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <FiClock />
              <span style={{ fontWeight: 600 }}>KG attendance times</span>
            </div>
            <p style={{ color: 'var(--text-secondary, #6b7280)', fontSize: 13, marginTop: 0 }}>
              Used by KG attendance and by KG machine check-ins. A KG student checking in after
              <strong> late after </strong>
              is marked <strong>LATE</strong> instead of PRESENT.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 14,
              marginTop: 12,
            }}>
              {[
                ['check_in_start_time', 'Check-in opens'],
                ['check_in_end_time', 'Check-in closes'],
                ['late_threshold_time', 'Late after'],
                ['absent_marking_time', 'Absent after'],
              ].map(([field, label]) => (
                <label key={field} style={{ display: 'block' }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    {label}
                  </span>
                  <input
                    type="time"
                    value={times[field]}
                    onChange={(e) => setTimes(prev => ({ ...prev, [field]: e.target.value }))}
                    style={timeInputStyle}
                  />
                </label>
              ))}
            </div>
          </Card>

          <Card title="Pass / Fail Point" padding="lg">
            <p style={{ marginTop: 0, fontWeight: 600 }}>Minimum mark to pass</p>
            <p style={{ color: 'var(--text-secondary, #6b7280)', fontSize: 13, marginTop: 0 }}>
              A KG student with a subject total below this point is marked <strong>Fail</strong>;
              at or above it is <strong>Pass</strong>. This updates KG mark lists and report cards.
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginTop: 10 }}>
              <label style={{ display: 'block', maxWidth: 220 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  Pass mark (%)
                </span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={passMark}
                  onChange={(e) => setPassMark(e.target.value)}
                  style={timeInputStyle}
                />
              </label>
              <div style={{ display: 'flex', gap: 8, paddingBottom: 6 }}>
                <span style={{
                  background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                  borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 700,
                }}>
                  Pass ≥ {Number(passMark) || 0}%
                </span>
                <span style={{
                  background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                  borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 700,
                }}>
                  Fail &lt; {Number(passMark) || 0}%
                </span>
              </div>
            </div>
          </Card>

          <Card title="Mark List & Report Card" padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <FiAward />
              <span style={{ fontWeight: 600 }}>What should the KG Rank row show?</span>
            </div>
            <p style={{ color: 'var(--text-secondary, #6b7280)', fontSize: 13, marginTop: 0 }}>
              Applies to the KG Mark List and the KG report card.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '12px 0 20px' }}>
              <RankChoice
                value="grade"
                current={rankDisplay}
                onSelect={setRankDisplay}
                title="Grade only"
                hint="A, B, C instead of 1, 2, 3"
              />
              <RankChoice
                value="both"
                current={rankDisplay}
                onSelect={setRankDisplay}
                title="Both"
                hint="1 (A), 2 (B)…"
              />
              <RankChoice
                value="rank"
                current={rankDisplay}
                onSelect={setRankDisplay}
                title="Rank only"
                hint="Keep 1, 2, 3 positions"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Grade scale</div>
                <div style={{ color: 'var(--text-secondary, #6b7280)', fontSize: 13 }}>
                  Set the letters and mark ranges used for KG.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" onClick={resetBands} disabled={saving}>
                  <FiRotateCcw /> Reset
                </Button>
                <Button variant="secondary" onClick={addBand} disabled={saving}>
                  <FiPlus /> Add band
                </Button>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '90px 1fr 1fr 40px',
                gap: 8,
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-secondary, #6b7280)',
              }}>
                <span>Grade</span>
                <span>From</span>
                <span>To</span>
                <span />
              </div>
              {gradeBands.map((band, index) => (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 40px', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={band.grade}
                    maxLength={12}
                    onChange={(e) => updateBand(index, 'grade', e.target.value)}
                    style={smallInputStyle}
                    aria-label={`Grade letter ${index + 1}`}
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={band.min}
                    onChange={(e) => updateBand(index, 'min', e.target.value)}
                    style={smallInputStyle}
                    aria-label={`Minimum mark ${index + 1}`}
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={band.max}
                    onChange={(e) => updateBand(index, 'max', e.target.value)}
                    style={smallInputStyle}
                    aria-label={`Maximum mark ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeBand(index)}
                    disabled={saving || gradeBands.length <= 1}
                    title="Remove band"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: gradeBands.length <= 1 ? 'not-allowed' : 'pointer',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 6,
                      opacity: gradeBands.length <= 1 ? 0.35 : 1,
                    }}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}
            </div>
            <p style={{ color: 'var(--text-secondary, #6b7280)', fontSize: 12, marginTop: 10 }}>
              Example: A 95–100 · B 85–94 · C 0–84. A mark outside every range shows “-”.
            </p>
          </Card>

          {message.text && (
            <div
              style={{
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

          <div>
            <Button variant="primary" onClick={save} loading={saving} disabled={saving}>
              Save KG Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
