// Admin push alerts: pending HR leave every 2 hours, daily dashboard/fault
// report after 12:00, and a notification when new student faults are recorded.
const fs = require('fs');
const path = require('path');
const DatabaseConnectionManager = require('./DatabaseConnectionManager');
const pushService = require('./PushNotificationService');

const IS_BILAL = String(process.env.DB_NAME || '').toLowerCase().includes('school_management10');
const BRANCHES = IS_BILAL ? ['BILAL'] : ['IQRA1', 'IQRA2', 'IQRA3', 'IQRA4', 'IQRA5'];
const RECIPIENT_USERNAMES = String(process.env.ADMIN_ALERT_USERNAMES || 'admin,bilal_admin,khalid')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

let started = false;
let lastDailyDate = null;
let lastFaultCount = null;

function manager() {
  try {
    return DatabaseConnectionManager.getInstance ? DatabaseConnectionManager.getInstance() : DatabaseConnectionManager;
  } catch (_) {
    return null;
  }
}

async function poolFor(branch) {
  try {
    const m = manager();
    if (m && typeof m.getPool === 'function') {
      const p = await m.getPool(branch);
      if (p) return p;
    }
  } catch (_) {}
  return require('../config/db');
}

function ethiopianToday() {
  try {
    const { getCurrentEthiopianDate } = require('../utils/ethiopianCalendar');
    const d = getCurrentEthiopianDate();
    return { year: Number(d.year), month: Number(d.month), day: Number(d.day) };
  } catch (_) {
    return { year: 0, month: 0, day: 0 };
  }
}

async function countStudents(db) {
  try {
    const tables = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='classes_schema' AND table_name NOT LIKE 'pg_%'`
    );
    let total = 0;
    for (const t of tables.rows) {
      try {
        const cols = await db.query(
          `SELECT column_name FROM information_schema.columns WHERE table_schema='classes_schema' AND table_name=$1`,
          [t.table_name]
        );
        const hasActive = cols.rows.some((c) => c.column_name === 'is_active');
        const r = await db.query(
          `SELECT COUNT(*)::int AS c FROM classes_schema."${t.table_name}" ${hasActive ? 'WHERE is_active = TRUE OR is_active IS NULL' : ''}`
        );
        total += Number(r.rows[0]?.c) || 0;
      } catch (_) {}
    }
    return total;
  } catch (_) { return 0; }
}

async function countStaff(db) {
  try {
    const r = await db.query(`SELECT COUNT(*)::int AS c FROM staff_users`);
    return Number(r.rows[0]?.c) || 0;
  } catch (_) {
    try {
      const r = await db.query(`SELECT COUNT(*)::int AS c FROM staff_schema.staff`);
      return Number(r.rows[0]?.c) || 0;
    } catch (_) { return 0; }
  }
}

async function countTodayAttendance(db, today) {
  try {
    const r = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE UPPER(status)='PRESENT')::int AS present,
         COUNT(*) FILTER (WHERE UPPER(status)='ABSENT')::int AS absent,
         COUNT(*) FILTER (WHERE UPPER(status)='LATE')::int AS late,
         COUNT(*)::int AS total
       FROM academic_student_attendance
       WHERE ethiopian_year=$1 AND ethiopian_month=$2 AND ethiopian_day=$3`,
      [today.year, today.month, today.day]
    );
    const row = r.rows[0] || {};
    return {
      present: Number(row.present) || 0,
      absent: Number(row.absent) || 0,
      late: Number(row.late) || 0,
      total: Number(row.total) || 0,
    };
  } catch (_) {
    return { present: 0, absent: 0, late: 0, total: 0 };
  }
}

async function countPendingLeave(db, today) {
  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS c
         FROM hr_attendance_permissions p
         JOIN hr_ethiopian_attendance a ON a.id = p.attendance_id
        WHERE COALESCE(p.permission_status,'PENDING') = 'PENDING'
          AND a.ethiopian_year = $1 AND a.ethiopian_month = $2`,
      [today.year, today.month]
    );
    return Number(r.rows[0]?.c) || 0;
  } catch (_) { return 0; }
}

async function countTodayFaults(db) {
  try {
    const tables = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='class_students_fault'`
    );
    let total = 0;
    for (const t of tables.rows) {
      try {
        const r = await db.query(
          `SELECT COUNT(*)::int AS c FROM class_students_fault."${t.table_name}" WHERE date = CURRENT_DATE`
        );
        total += Number(r.rows[0]?.c) || 0;
      } catch (_) {}
    }
    return total;
  } catch (_) { return 0; }
}

async function collect() {
  const today = ethiopianToday();
  let students = 0, staff = 0, pending = 0, faults = 0;
  let present = 0, absent = 0, late = 0, records = 0;
  for (const branch of BRANCHES) {
    const db = await poolFor(branch);
    students += await countStudents(db);
    staff += await countStaff(db);
    pending += await countPendingLeave(db, today);
    faults += await countTodayFaults(db);
    const att = await countTodayAttendance(db, today);
    present += att.present; absent += att.absent; late += att.late; records += att.total;
  }
  return { today, students, staff, pending, faults, present, absent, late, records };
}

async function adminRecipients() {
  try {
    const db = require('../config/db');
    const r = await db.query(
      `SELECT DISTINCT user_id FROM user_devices
        WHERE user_type='staff' AND is_active=TRUE
          AND LOWER(user_id) = ANY($1::text[])`,
      [RECIPIENT_USERNAMES]
    );
    return r.rows.map((x) => String(x.user_id));
  } catch (_) { return []; }
}

async function sendAdmins(title, body, data) {
  try {
    const users = await adminRecipients();
    for (const user of users) {
      try {
        await pushService.sendToUser(user, 'staff', { title, body, data: data || {} });
      } catch (_) {}
    }
    if (users.length) console.log(`[AdminAlerts] sent "${title}" to ${users.length} admin device(s)`);
  } catch (e) {
    console.warn('[AdminAlerts] push failed:', e.message);
  }
}

function atNoonOrLater() {
  const h = new Date().getHours();
  return h >= 12;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function twoHourCheck() {
  try {
    const c = await collect();
    if (lastFaultCount === null) lastFaultCount = c.faults;
    const newFaults = Math.max(c.faults - lastFaultCount, 0);
    lastFaultCount = c.faults;

    if (c.pending > 0) {
      await sendAdmins(
        'Pending HR approval',
        `${c.pending} attendance permission request(s) are waiting for approval.`,
        { type: 'hr_leave', pending: String(c.pending) }
      );
    }
    if (newFaults > 0) {
      await sendAdmins(
        'New student fault',
        `${newFaults} new fault(s) were recorded today. Open the app to review them.`,
        { type: 'fault', count: String(newFaults) }
      );
    }
  } catch (e) {
    console.warn('[AdminAlerts] 2h check failed:', e.message);
  }
}

async function dailyCheck() {
  try {
    if (!atNoonOrLater()) return;
    const key = todayKey();
    if (lastDailyDate === key) return;
    lastDailyDate = key;
    const c = await collect();
    const rate = c.records > 0 ? Math.round(((c.present + c.late) / c.records) * 100) : 0;
    await sendAdmins(
      'Daily school report',
      `Students ${c.students} · Staff ${c.staff} · Attendance ${rate}% · Pending leave ${c.pending} · Faults today ${c.faults}`,
      {
        type: 'daily_report',
        students: String(c.students),
        staff: String(c.staff),
        attendance: String(rate),
        pending: String(c.pending),
        faults: String(c.faults),
      }
    );
  } catch (e) {
    console.warn('[AdminAlerts] daily check failed:', e.message);
  }
}

function start() {
  if (started) return;
  started = true;
  pushService.initialize().catch((e) => console.warn('[AdminAlerts] push init failed:', e.message));
  // Warm the "new faults" baseline, then run the 2-hour loop.
  setTimeout(twoHourCheck, 60 * 1000);
  setInterval(twoHourCheck, 2 * 60 * 60 * 1000);
  setInterval(dailyCheck, 10 * 60 * 1000);
  console.log('[AdminAlerts] scheduler started for', BRANCHES.join(', '));
}

module.exports = { start, twoHourCheck, dailyCheck, collect };
