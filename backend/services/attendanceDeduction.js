// HOOK — attendance → salary deduction calculation.
//
// The detailed rules will be defined by the school later. Keep ALL of that logic
// here so payroll / leave-review code never invents its own rules.
//
// Current behaviour (placeholder until the school defines the rules):
//  - only runs when the "Connect to salary" switch is ON
//  - uses the configured amount for the mark (staff-type row overrides the 'ALL' row)
//  - P / V / PRESENT / LEAVE never deduct
//  - any-time staff: absence deducts only if absent_deducts is ON

function attendanceMarkKey(status) {
  const s = String(status || '').toUpperCase();
  if (!s) return null;
  if (s.includes('WITHOUT CHECK OUT') || s.includes('NO CHECKOUT') || s === '*') return 'NO_CHECKOUT';
  if (s.includes('HALF')) return 'HALF_DAY';
  if (s.includes('ABSENT') || s === 'A') return 'ABSENT';
  if (s.includes('LATE') || s === 'L') return 'LATE';
  return null;
}

function calculateAttendanceDeduction({ mark, amounts, connectToSalary, anytime, absentDeducts }) {
  if (!connectToSalary) return 0;
  const key = attendanceMarkKey(mark);
  if (!key) return 0;
  if (anytime && key === 'ABSENT' && absentDeducts === false) return 0;
  const amt = Number((amounts || {})[key] || 0);
  return Number.isFinite(amt) && amt > 0 ? amt : 0;
}

module.exports = { attendanceMarkKey, calculateAttendanceDeduction };
