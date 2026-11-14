#!/usr/bin/env node
/**
 * Regression check: the Student Attendance page must always list students in
 * numeric Class ID order (1, 2, 3 ... N). If the query is ever changed back
 * to `ORDER BY student_name` (case-sensitive), lowercase names move to the
 * bottom and the Class ID column appears to jump (e.g. 28, 32).
 *
 * Run after every backend deployment:
 *   npm run verify:class-ids
 *
 * Optional environment overrides:
 *   IQRA_BASE=http://127.0.0.1:6005
 *   BILAL_BASE=http://127.0.0.1:5011
 *   BRANCHES=IQRA1,IQRA2,IQRA3,IQRA4,IQRA5,BILAL
 */

const IQRA_BASE = process.env.IQRA_BASE || 'http://127.0.0.1:6005';
const BILAL_BASE = process.env.BILAL_BASE || 'http://127.0.0.1:5011';
const branches = (process.env.BRANCHES || 'IQRA1,IQRA2,IQRA3,IQRA4,IQRA5,BILAL').split(',');

const targets = branches.map((branch) => ({
  branch: branch.trim(),
  base: branch.trim().toUpperCase().startsWith('BILAL') ? BILAL_BASE : IQRA_BASE,
}));

const issues = [];
let totalClasses = 0;
let totalStudents = 0;

async function getJson(url, branch) {
  const res = await fetch(url, { headers: { 'x-branch-code': branch } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

(async () => {
  for (const target of targets) {
    let classes = [];
    try {
      const data = await getJson(`${target.base}/api/academic/student-attendance/classes`, target.branch);
      classes = data.data || [];
    } catch (error) {
      issues.push({ branch: target.branch, class: '*', error: `classes fetch failed: ${error.message}` });
      continue;
    }

    let branchStudents = 0;
    let branchIssues = 0;

    for (const className of classes) {
      totalClasses++;
      try {
        const data = await getJson(
          `${target.base}/api/academic/student-attendance/students?class=${encodeURIComponent(className)}`,
          target.branch
        );
        const rows = data.data || [];
        const ids = rows.map((row) => Number(row.class_id)).filter((id) => Number.isFinite(id));
        branchStudents += ids.length;
        totalStudents += ids.length;

        const duplicates = ids.length - new Set(ids).size;
        const invalid = ids.some((id) => !Number.isInteger(id) || id < 1);
        const sequenceOk = ids.every((id, index) => id === index + 1);
        const nullCount = rows.filter(
          (row) => row.class_id === null || row.class_id === undefined || row.class_id === ''
        ).length;

        if (duplicates || invalid || !sequenceOk || nullCount) {
          branchIssues++;
          issues.push({
            branch: target.branch,
            class: className,
            students: ids.length,
            first: ids.slice(0, 8),
            last: ids.slice(-5),
            duplicates,
            invalid,
            nullCount,
            sequenceOk,
            sample: rows.slice(0, 3).map((row) => `${row.student_name}:${row.class_id}`),
          });
        }
      } catch (error) {
        branchIssues++;
        issues.push({ branch: target.branch, class: className, error: error.message });
      }
    }

    console.log(`${target.branch}: classes=${classes.length} students=${branchStudents} issues=${branchIssues}`);
  }

  console.log('---');
  console.log(`TOTAL classes=${totalClasses} students=${totalStudents} issues=${issues.length}`);

  if (issues.length) {
    console.error(JSON.stringify(issues.slice(0, 30), null, 2));
    process.exit(1);
  }

  console.log('Class ID order is correct in every class.');
  process.exit(0);
})().catch((error) => {
  console.error('Verification crashed:', error);
  process.exit(1);
});
