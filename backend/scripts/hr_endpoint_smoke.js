#!/usr/bin/env node
/**
 * HR / payroll endpoint smoke test (read-only by default).
 *
 * Usage:
 *   BASE_URL=https://iqra.skoolific.com BRANCH=IQRA1 node scripts/hr_endpoint_smoke.js
 *   TOKEN=<jwt> BASE_URL=... node scripts/hr_endpoint_smoke.js
 *
 * If TOKEN is not given, it signs one with JWT_SECRET from backend/.env.
 * Add --write to also create + delete a tip and a credit.
 */
const fs = require('fs');
const path = require('path');

const BASE = (process.env.BASE_URL || 'https://iqra.skoolific.com').replace(/\/$/, '');
const BRANCH = process.env.BRANCH || 'IQRA1';
const WRITE = process.argv.includes('--write');

function readSecret() {
  if (process.env.TOKEN) return null;
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  try {
    const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    const m = env.match(/^JWT_SECRET=(.*)$/m);
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
  } catch (_) {
    return null;
  }
}

function buildToken() {
  if (process.env.TOKEN) return process.env.TOKEN;
  const secret = readSecret();
  if (!secret) throw new Error('No TOKEN and no JWT_SECRET found');
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: 1, username: 'smoke', role: 'admin', branchCode: BRANCH, branch: BRANCH },
    secret,
    { expiresIn: '30m', issuer: 'school-management-system', audience: 'school-app' }
  );
}

const TOKEN = buildToken();
const H = { Authorization: 'Bearer ' + TOKEN, 'X-Branch-Code': BRANCH, 'Content-Type': 'application/json' };

async function call(method, endpoint, body) {
  const res = await fetch(BASE + endpoint, {
    method,
    headers: H,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let info = '';
  try {
    const j = JSON.parse(text);
    if (Array.isArray(j.data)) info = 'items=' + j.data.length;
    else if (j.data && Array.isArray(j.data.payroll)) info = 'staff=' + j.data.payroll.length;
    else if (j.data && Array.isArray(j.data.rows)) info = 'rows=' + j.data.rows.length;
    else if (j.data && typeof j.data === 'object') info = Object.keys(j.data).slice(0, 6).join(',');
    else if (j.error) info = String(j.error).slice(0, 60);
  } catch (_) {
    info = text.slice(0, 60).replace(/\s+/g, ' ');
  }
  console.log(String(res.status).padEnd(4) + method.padEnd(5) + endpoint.padEnd(62) + info);
  return { status: res.status, json: (() => { try { return JSON.parse(text); } catch (_) { return null; } })() };
}

(async () => {
  const now = new Date();
  const ethYear = parseInt(process.env.ETH_YEAR || '2019');
  const ethMonth = parseInt(process.env.ETH_MONTH || '2');

  console.log('Base: ' + BASE + '  Branch: ' + BRANCH + '  ' + (WRITE ? '(write mode)' : '(read only)'));
  console.log('--- Phase 1 ---');
  await call('GET', '/api/hr/stats');
  await call('GET', '/api/hr/dashboard/summary');
  await call('GET', '/api/reports/hr/summary');
  await call('GET', '/api/hr/attendance/summary');
  await call('GET', '/api/finance/payroll');
  const staff = await call('GET', '/api/staff');
  console.log('     password leak check: ' + (JSON.stringify(staff.json || {}).includes('password') ? 'FOUND (bad)' : 'none'));

  console.log('--- settings ---');
  await call('GET', '/api/hr/attendance/time-settings');
  await call('GET', '/api/hr/attendance/staff-specific-times');
  await call('GET', '/api/hr/attendance/deduction-settings');
  await call('GET', '/api/hr/attendance/ethiopian-month?ethMonth=' + ethMonth + '&ethYear=' + ethYear);
  await call('GET', '/api/hr/leave/attendance-issues?ethMonth=' + ethMonth + '&ethYear=' + ethYear);

  console.log('--- salary / tips / credit ---');
  await call('GET', '/api/hr/salary/all-salaries');
  await call('GET', '/api/hr/tips?ethMonth=' + ethMonth + '&ethYear=' + ethYear);
  await call('GET', '/api/hr/tips/types');
  await call('GET', '/api/hr/credits');
  await call('GET', '/api/hr/debt-plans');

  console.log('--- payroll / reports ---');
  await call('POST', '/api/hr/payroll/generate', { ethMonth, ethYear });
  await call('GET', '/api/hr/payroll/history');
  await call('GET', '/api/hr/reports/payroll-detail?ethMonth=' + ethMonth + '&ethYear=' + ethYear);
  await call('GET', '/api/hr/reports/tips-credits?ethMonth=' + ethMonth + '&ethYear=' + ethYear);
  await call('GET', '/api/hr/reports/stopped-staff');

  if (WRITE) {
    console.log('--- write: tip + credit ---');
    const tip = await call('POST', '/api/hr/tips', { tipType: 'Other', amount: 10, reason: 'smoke test', ethMonth, ethYear });
    if (tip.json && tip.json.data && tip.json.data.id) await call('DELETE', '/api/hr/tips/' + tip.json.data.id);
    const credit = await call('POST', '/api/hr/credits', { staffId: 'SMOKE-1', staffName: 'Smoke Test', amount: 10, reason: 'smoke', ethMonth, ethYear });
    if (credit.json && credit.json.data && credit.json.data.id) await call('DELETE', '/api/hr/credits/' + credit.json.data.id);
  }

  console.log('Done.');
})().catch((e) => {
  console.error('Smoke test failed:', e.message);
  process.exit(1);
});
