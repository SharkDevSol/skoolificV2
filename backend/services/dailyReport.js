// Daily report notifier for the Super Admin app.
// Aggregates the same numbers the Super Admin home shows and e-mails them once
// a day (default 08:00) to the configured recipients.
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { JWT_SECRET } = require('../middleware/jwtValidator');

const PORT = process.env.PORT || 6005;
const BASE = 'http://127.0.0.1:' + PORT + '/api';

function masterPool() {
  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'iqrab1',
    user: process.env.DB_USER || 'iqra',
    password: String(process.env.DB_PASSWORD || ''),
    max: 2,
  });
}

async function ensureSettings(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS super_admin_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      daily_report_enabled BOOLEAN DEFAULT TRUE,
      recipients TEXT,
      send_hour INTEGER DEFAULT 8,
      last_sent_date DATE,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.query(`INSERT INTO super_admin_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);
  const row = (await db.query('SELECT * FROM super_admin_settings WHERE id = 1')).rows[0];
  return row;
}

function superToken() {
  return jwt.sign(
    { id: 1, username: 'daily-report', role: 'super_admin', fullName: 'Daily Report' },
    JWT_SECRET,
    { expiresIn: '10m', issuer: 'school-management-system', audience: 'school-app' }
  );
}

const num = (v) => Number(v || 0);

function dateOnly(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const str = String(v);
  return /^\d{4}-\d{2}-\d{2}/.test(str) ? str.slice(0, 10) : null;
}

function sumBranches(list) {
  let total = 0;
  for (const b of list || []) total += num(b.total ?? b.count ?? b.students ?? b.totalStudents ?? 0);
  return total;
}

async function buildSummary() {
  const token = superToken();
  const headers = { Authorization: 'Bearer ' + token };
  const get = (p) => axios.get(BASE + p, { headers, timeout: 120000 }).then((r) => r.data?.data || r.data).catch(() => null);

  const today = new Date().toISOString().slice(0, 10);
  const [students, attendance, finance, faults, registrations] = await Promise.all([
    get('/super-admin/report/students?branchCode=ALL'),
    get('/super-admin/report/attendance?branchCode=ALL'),
    get('/super-admin/report/finance?branchCode=ALL'),
    get('/super-admin/report/faults?branchCode=ALL'),
    get('/super-admin/report/registrations?branchCode=ALL&from=' + today + '&to=' + today),
  ]);

  return {
    date: today,
    students: num(students?.grandTotal),
    boys: num(students?.grandMale),
    girls: num(students?.grandFemale),
    attendanceRate: num(attendance?.grandRate),
    collected: num(finance?.grandCollected),
    pending: num(finance?.grandPending),
    faults: num(faults?.grandTotal),
    newRegistrations: num(registrations?.grandAddedToday),
    branches: Array.isArray(students?.byBranch) ? students.byBranch.length : 0,
  };
}

function emailHtml(s) {
  const birr = (n) => Number(n || 0).toLocaleString() + ' Birr';
  return `
  <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto">
    <h2 style="color:#1f3b73;margin-bottom:4px">Skoolific — Daily Report</h2>
    <p style="color:#666;margin-top:0">${s.date}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px;border-bottom:1px solid #eee">Total students</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><b>${s.students.toLocaleString()}</b></td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee">Boys / Girls</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${s.boys} / ${s.girls}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee">New registrations today</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><b>${s.newRegistrations}</b></td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee">Attendance rate</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${s.attendanceRate}%</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee">Collected</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${birr(s.collected)}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee">Pending fees</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${birr(s.pending)}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee">Faults</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${s.faults}</td></tr>
    </table>
    <p style="color:#888;font-size:12px;margin-top:16px">Open the Super Admin app for the full reports.</p>
  </div>`;
}

function emailText(s) {
  return [
    'Skoolific — Daily Report ' + s.date,
    'Students: ' + s.students,
    'Boys/Girls: ' + s.boys + '/' + s.girls,
    'New registrations today: ' + s.newRegistrations,
    'Attendance rate: ' + s.attendanceRate + '%',
    'Collected: ' + s.collected + ' Birr',
    'Pending fees: ' + s.pending + ' Birr',
    'Faults: ' + s.faults,
  ].join('\n');
}

async function resolveRecipients(db, settings) {
  if (settings && settings.recipients && String(settings.recipients).trim()) {
    return String(settings.recipients).split(',').map((x) => x.trim()).filter(Boolean);
  }
  try {
    const rows = (await db.query(
      `SELECT email FROM super_admins WHERE is_active = TRUE AND email IS NOT NULL AND TRIM(email) <> ''`
    )).rows;
    if (rows.length) return rows.map((r) => r.email);
  } catch (_) {}
  const smtpUser = String(process.env.SMTP_USER || '');
  if (!/your-email|example\.com|changeme|your_email/i.test(smtpUser)) return [smtpUser].filter(Boolean);
  return [];
}

async function sendSuperAdminPush(db, summary) {
  try {
    const saPath = path.join(__dirname, '../firebase-service-account-staff.json');
    if (!fs.existsSync(saPath)) return { sent: 0, reason: 'no firebase service account' };
    const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    const rows = (await db.query('SELECT fcm_token FROM super_admin_devices WHERE active = TRUE')).rows;
    if (!rows.length) return { sent: 0, reason: 'no registered devices' };

    const now = Math.floor(Date.now() / 1000);
    const assertion = jwt.sign({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }, sa.private_key, { algorithm: 'RS256' });
    const tr = await axios.post('https://oauth2.googleapis.com/token',
      'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + encodeURIComponent(assertion),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const accessToken = tr.data.access_token;

    const body = 'Students ' + summary.students + ' · New ' + summary.newRegistrations +
      ' · Attendance ' + summary.attendanceRate + '% · Pending ' + Number(summary.pending).toLocaleString() + ' Birr';

    let sent = 0;
    for (const row of rows) {
      try {
        await axios.post('https://fcm.googleapis.com/v1/projects/' + sa.project_id + '/messages:send', {
          message: {
            token: row.fcm_token,
            notification: { title: 'Skoolific Daily Report', body },
            data: { type: 'daily_report', date: String(summary.date) },
            android: {
              priority: 'high',
              notification: { channel_id: 'skoolific_alerts', sound: 'default', default_sound: true },
            },
          },
        }, { headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' } });
        sent++;
      } catch (_) {}
    }
    return { sent };
  } catch (e) {
    return { sent: 0, error: e.message };
  }
}

async function sendDailyReport({ force = false } = {}) {
  const db = masterPool();
  try {
    const settings = await ensureSettings(db);
    if (!settings) return { sent: false, reason: 'no settings' };
    const today = new Date().toISOString().slice(0, 10);
    if (!force) {
      if (settings.daily_report_enabled === false) return { sent: false, reason: 'disabled' };
      if (dateOnly(settings.last_sent_date) === today) {
        return { sent: false, reason: 'already sent today' };
      }
    }

    const recipients = await resolveRecipients(db, settings);
    const summary = await buildSummary();

    const smtpUser = String(process.env.SMTP_USER || '');
    const smtpPlaceholder = !smtpUser || /your-email|example\.com|changeme|your_email/i.test(smtpUser);
    const smtpConfigured = !!(process.env.SMTP_HOST && !smtpPlaceholder && process.env.SMTP_PASS);

    let status = (smtpConfigured && recipients.length) ? 'sent' : 'skipped';
    let errorMessage = null;

    if (smtpConfigured && recipients.length) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: recipients.join(','),
          subject: 'Skoolific Daily Report - ' + today,
          text: emailText(summary),
          html: emailHtml(summary),
        });
      } catch (e) {
        status = 'failed';
        errorMessage = e.message;
      }
      await db.query(
        `INSERT INTO notifications_log (user_type, notification_type, channel, title, message, status, error_message, metadata)
         VALUES ('super_admin', 'daily_report', 'email', $1, $2, $3, $4, $5)`,
        ['Skoolific Daily Report - ' + today, emailText(summary), status, errorMessage, JSON.stringify(summary)]
      ).catch(() => {});
    }

    // Push notification to the Super Admin app (works even if email is not set up)
    let push = { sent: 0 };
    try { push = await sendSuperAdminPush(db, summary); } catch (e) { push = { sent: 0, error: e.message }; }
    if (push.sent > 0) {
      await db.query(
        `INSERT INTO notifications_log (user_type, notification_type, channel, title, message, status, metadata)
         VALUES ('super_admin', 'daily_report', 'push', $1, $2, 'sent', $3)`,
        ['Skoolific Daily Report - ' + today, emailText(summary), JSON.stringify(summary)]
      ).catch(() => {});
    }

    if (status === 'sent' || push.sent > 0) {
      await db.query('UPDATE super_admin_settings SET last_sent_date = CURRENT_DATE, updated_at = NOW() WHERE id = 1');
    }

    return { sent: status === 'sent' || push.sent > 0, status, recipients, summary, error: errorMessage, push };
  } catch (e) {
    return { sent: false, reason: e.message };
  } finally {
    await db.end().catch(() => {});
  }
}

async function getSettings() {
  const db = masterPool();
  try {
    const settings = await ensureSettings(db);
    const recipients = await resolveRecipients(db, settings);
    return { ...settings, resolvedRecipients: recipients };
  } finally {
    await db.end().catch(() => {});
  }
}

async function updateSettings(patch = {}) {
  const db = masterPool();
  try {
    await ensureSettings(db);
    const fields = [];
    const values = [];
    if (patch.daily_report_enabled !== undefined) { fields.push('daily_report_enabled = $' + (values.length + 1)); values.push(!!patch.daily_report_enabled); }
    if (patch.recipients !== undefined) { fields.push('recipients = $' + (values.length + 1)); values.push(String(patch.recipients || '').trim() || null); }
    if (patch.send_hour !== undefined) { fields.push('send_hour = $' + (values.length + 1)); values.push(Math.max(0, Math.min(23, parseInt(patch.send_hour) || 8))); }
    if (fields.length) {
      await db.query('UPDATE super_admin_settings SET ' + fields.join(', ') + ', updated_at = NOW() WHERE id = 1', values);
    }
    return await ensureSettings(db);
  } finally {
    await db.end().catch(() => {});
  }
}

let schedulerStarted = false;
function startDailyReportScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  const tick = async () => {
    try {
      const db = masterPool();
      let settings;
      try {
        settings = await ensureSettings(db);
      } finally {
        await db.end().catch(() => {});
      }
      if (!settings || settings.daily_report_enabled === false) return;
      const now = new Date();
      const hour = now.getHours();
      const target = Number(settings.send_hour == null ? 8 : settings.send_hour);
      if (hour !== target) return;
      const today = now.toISOString().slice(0, 10);
      if (dateOnly(settings.last_sent_date) === today) return;
      const res = await sendDailyReport();
      console.log('[daily-report]', res.sent ? 'sent' : 'skipped: ' + (res.reason || res.status));
    } catch (e) {
      console.error('[daily-report] scheduler error:', e.message);
    }
  };
  // check every 10 minutes; the last_sent_date guard prevents duplicates
  setInterval(tick, 10 * 60 * 1000).unref();
  setTimeout(tick, 60 * 1000).unref();
  console.log('[daily-report] scheduler started');
}

module.exports = { buildSummary, getSettings, updateSettings, sendDailyReport, startDailyReportScheduler };
