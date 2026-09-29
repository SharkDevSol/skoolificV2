import { describe, it, expect } from 'vitest';
import { buildResultRows, statusKey, STATUS_LABELS, resultStats, fmtTime, pretty, norm } from './resultRows';

const attempt = (over = {}) => ({
  id: 1,
  studentName: 'khalid',
  studentUsername: 'khalid_1',
  status: 'submitted',
  earnedMarks: '6.00',
  totalMarks: '12.00',
  percentage: '50.00',
  submittedAt: '2026-09-28T07:12:03.019Z',
  violationEnded: false,
  requiresManualGrading: false,
  questionCount: 9,
  correctCount: 5,
  wrongCount: 4,
  ...over
});

const rosterRow = (over = {}) => ({
  id: 10,
  student_name: 'khalid',
  username: 'khalid_1',
  ...over
});

describe('buildResultRows', () => {
  it('keeps roster students who never attempted, marked as not attempted', () => {
    const rows = buildResultRows([], [rosterRow({ id: 11, student_name: 'amina', username: 'amina_2' })]);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('amina');
    expect(rows[0].attempted).toBe(false);
    expect(rows[0].latest).toBeNull();
    expect(statusKey(rows[0])).toBe('none');
    expect(STATUS_LABELS.none).toBe('Not attempted');
  });

  it('matches an attempt to a roster student by username', () => {
    const rows = buildResultRows([attempt()], [rosterRow()]);
    expect(rows).toHaveLength(1);
    expect(rows[0].attempted).toBe(true);
    expect(rows[0].latest.earnedMarks).toBe('6.00');
    expect(rows[0].attemptCount).toBe(1);
  });

  it('matches by name when the attempt has no username', () => {
    const rows = buildResultRows([attempt({ studentUsername: '' })], [rosterRow({ username: 'someone_else' })]);
    expect(rows).toHaveLength(1);
    expect(rows[0].attempted).toBe(true);
  });

  it('keeps only the newest attempt and counts the rest', () => {
    const older = attempt({ id: 5, submittedAt: '2026-09-27T07:00:00.000Z', earnedMarks: '2.00' });
    const newer = attempt({ id: 6, submittedAt: '2026-09-28T07:00:00.000Z', earnedMarks: '8.00' });
    const rows = buildResultRows([older, newer], [rosterRow()]);
    expect(rows).toHaveLength(1);
    expect(rows[0].attemptCount).toBe(2);
    expect(rows[0].latest.id).toBe(6);
    expect(rows[0].latest.earnedMarks).toBe('8.00');
  });

  it('appends attempt holders missing from the roster and sorts by name', () => {
    const rows = buildResultRows(
      [attempt({ id: 3, studentName: 'zara', studentUsername: 'zara_9' }), attempt({ id: 4, studentName: 'adil', studentUsername: 'adil_7' })],
      []
    );
    expect(rows.map(r => r.name)).toEqual(['adil', 'zara']);
    expect(rows.every(r => r.attempted)).toBe(true);
  });

  it('does not duplicate a roster student who also has an attempt', () => {
    const rows = buildResultRows([attempt()], [rosterRow()]);
    expect(rows).toHaveLength(1);
  });

  it('handles empty input', () => {
    expect(buildResultRows([], [])).toEqual([]);
    expect(buildResultRows(null, undefined)).toEqual([]);
  });
});

describe('statusKey', () => {
  it('flags a student who left the exam screen', () => {
    expect(statusKey({ attempted: true, latest: attempt({ violationEnded: true }) })).toBe('left');
  });
  it('flags an unfinished attempt', () => {
    expect(statusKey({ attempted: true, latest: attempt({ status: 'in_progress' }) })).toBe('progress');
  });
  it('flags manual grading', () => {
    expect(statusKey({ attempted: true, latest: attempt({ requiresManualGrading: true }) })).toBe('manual');
  });
  it('reports graded / submitted', () => {
    expect(statusKey({ attempted: true, latest: attempt({ status: 'graded' }) })).toBe('graded');
    expect(statusKey({ attempted: true, latest: attempt() })).toBe('submitted');
  });
});

describe('resultStats', () => {
  it('counts students, attempts, class average and wrong answers', () => {
    const rows = buildResultRows(
      [attempt({ earnedMarks: '6.00', totalMarks: '12.00', wrongCount: 4 }), attempt({ id: 2, studentUsername: 'b_2', studentName: 'b', earnedMarks: '12.00', totalMarks: '12.00', wrongCount: 0 })],
      [rosterRow(), rosterRow({ id: 12, student_name: 'b', username: 'b_2' })]
    );
    const s = resultStats(rows);
    expect(s.total).toBe(2);
    expect(s.done).toBe(2);
    expect(s.avg).toBe('75.0%');
    expect(s.wrong).toBe(4);
  });

  it('returns — when nobody attempted', () => {
    const s = resultStats(buildResultRows([], [rosterRow()]));
    expect(s.done).toBe(0);
    expect(s.avg).toBe('—');
    expect(s.wrong).toBe(0);
  });
});

describe('format helpers', () => {
  it('pretty prints component names', () => {
    expect(pretty('test_2')).toBe('TEST 2');
    expect(pretty('')).toBe('');
  });
  it('norm trims and lowercases', () => {
    expect(norm(' Khalid ')).toBe('khalid');
    expect(norm(undefined)).toBe('');
  });
  it('fmtTime shows — for empty or invalid values', () => {
    expect(fmtTime('')).toBe('—');
    expect(fmtTime(null)).toBe('—');
    expect(fmtTime('not-a-date')).toBe('—');
    expect(fmtTime('2026-09-28T07:12:03.019Z')).not.toBe('—');
  });
});
