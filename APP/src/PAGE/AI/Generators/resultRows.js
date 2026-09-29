export const pretty = (v) => String(v || '').replace(/_/g, ' ').toUpperCase();
export const norm = (v) => String(v ?? '').trim().toLowerCase();

export const fmtTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

// Which badge an attempt row gets. Returns a key, never a class name
// (styles live in the component so this stays pure/testable).
export const statusKey = (r) => {
  if (!r || !r.attempted || !r.latest) return 'none';
  const a = r.latest;
  if (a.violationEnded) return 'left';
  if (a.status === 'in_progress') return 'progress';
  if (a.requiresManualGrading) return 'manual';
  if (a.status === 'graded') return 'graded';
  return 'submitted';
};

export const STATUS_LABELS = {
  none: 'Not attempted',
  left: 'Left screen',
  progress: 'In progress',
  manual: 'Grading pending',
  graded: 'Graded',
  submitted: 'Submitted'
};

// Class roster + attempts merged into one list:
// - students who never attempted still appear (score '—')
// - several attempts for one student → newest first, count kept
// - attempts for students missing from the roster are appended
export const buildResultRows = (attempts, roster) => {
  const groups = new Map();
  (Array.isArray(attempts) ? attempts : []).forEach(a => {
    const k = norm(a.studentUsername) || norm(a.studentName);
    if (!k) return;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(a);
  });
  groups.forEach(list => list.sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || ''))));

  const out = [];
  const matched = new Set();
  (Array.isArray(roster) ? roster : []).forEach(s => {
    const ku = norm(s.username);
    const kn = norm(s.student_name);
    let atts = null;
    if (ku && groups.has(ku)) { atts = groups.get(ku); matched.add(ku); }
    else if (kn && groups.has(kn)) { atts = groups.get(kn); matched.add(kn); }
    out.push({
      key: ku || kn || `r${s.id}`,
      name: s.student_name || (atts ? atts[0].studentName : '') || '',
      username: s.username || '',
      attempted: !!atts,
      latest: atts ? atts[0] : null,
      attemptCount: atts ? atts.length : 0
    });
  });
  groups.forEach((atts, k) => {
    if (matched.has(k)) return;
    out.push({
      key: k,
      name: atts[0].studentName || '',
      username: atts[0].studentUsername || '',
      attempted: true,
      latest: atts[0],
      attemptCount: atts.length
    });
  });
  out.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return out;
};

export const resultStats = (rows) => {
  const done = rows.filter(r => r.attempted);
  const scored = done.filter(r => r.latest && r.latest.earnedMarks !== null && r.latest.earnedMarks !== undefined);
  const sum = scored.reduce((acc, r) => acc + Number(r.latest.earnedMarks || 0), 0);
  const maxSum = scored.reduce((acc, r) => acc + Number(r.latest.totalMarks || 0), 0);
  const wrong = done.reduce((acc, r) => acc + Number(r.latest?.wrongCount || 0), 0);
  return {
    total: rows.length,
    done: done.length,
    avg: scored.length && maxSum ? `${((sum / maxSum) * 100).toFixed(1)}%` : '—',
    wrong
  };
};
